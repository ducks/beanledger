<script lang="ts">
  import './workspace-actions.css';
  import { onMount } from 'svelte';
  import type { RoastGroup, Product, Order, BatchOverride } from '$lib/types';
  import { calcGroup, formatPackageSize, formatWeight, parseWeight, toUnits, unitLabel } from '$lib/calc';
  import { units } from '$lib/stores/units';
  import CsvImport from './CsvImport.svelte';
  import ImportHistory from './ImportHistory.svelte';
  import PickList from './PickList.svelte';
  import Reports from './Reports.svelte';
  import Catalog from './Catalog.svelte';
  import Settings from './Settings.svelte';
  import LeftoverConfirmModal from './LeftoverConfirmModal.svelte';
  import Packaging from './Packaging.svelte';

  interface Props {
    initialDate?: string;
  }

  let { initialDate = new Date().toISOString().slice(0, 10) }: Props = $props();

  let groups = $state<RoastGroup[]>([]);
  let products = $state<Product[]>([]);
  let orders = $state<Order[]>([]);
  let leftovers = $state<Record<string, number>>({});
  let batchOverrides = $state<Record<string, number>>({});
  let search = $state('');
  let qty = $state(1);
  let dropOpen = $state(false);
  let productionDate = $state(initialDate);
  let sortBy = $state<'type' | 'label' | 'batch_type' | 'needed'>('type');
  let importHistory: any;
  let dayStatus = $state<'active' | 'scheduled' | 'completed' | null>(null);

  // Modal states
  let showPickList = $state(false);
  let showReports = $state(false);
  let showCatalog = $state(false);
  let showSettings = $state(false);
  let showPackaging = $state(false);
  let showLeftoverConfirm = $state(false);
  let showManualAddModal = $state(false);
  let selectedProduct = $state<Product | null>(null);
  let expandedGroups = $state<Set<string>>(new Set());

  onMount(async () => {
    await loadData();
    await loadBatchOverrides();
    await loadProductionDayStatus();
  });

  async function loadData() {
    const [groupsRes, productsRes, ordersRes, leftoversRes] = await Promise.all([
      fetch('/api/groups'),
      fetch('/api/products'),
      fetch(`/api/orders?date=${productionDate}`),
      fetch(`/api/leftovers?date=${productionDate}`)
    ]);

    groups = await groupsRes.json();
    products = await productsRes.json();
    orders = await ordersRes.json();
    const leftoversData = await leftoversRes.json();

    // Ensure leftoversData is an array before reducing
    if (Array.isArray(leftoversData)) {
      leftovers = leftoversData.reduce((acc, l) => ({ ...acc, [l.group_id]: l.lbs }), {});
    } else {
      leftovers = {};
    }

    // Also refresh import history
    importHistory?.refresh();
  }

  async function loadProductionDayStatus() {
    try {
      const res = await fetch('/api/production-days');
      const data = await res.json();
      const currentDay = data.days?.find((d: any) => d.production_date === productionDate);
      dayStatus = currentDay?.status || null;
    } catch (err) {
      console.error('Failed to load production day status:', err);
      dayStatus = null;
    }
  }

  async function markAsActive() {
    try {
      const res = await fetch(`/api/production-days/${productionDate}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' })
      });

      if (res.ok) {
        await loadProductionDayStatus();
      } else {
        const data = await res.json();
        if (res.status === 409) {
          alert(`Cannot mark as active: ${data.error}`);
        } else {
          alert(data.error || 'Failed to mark day as active');
        }
      }
    } catch (err) {
      console.error('Failed to mark day as active:', err);
      alert('Network error while updating roast day');
    }
  }

  function finishRoastDay() {
    showLeftoverConfirm = true;
  }

  async function confirmFinishRoastDay() {
    showLeftoverConfirm = false;

    try {
      // Completing the day makes the server commit packaging usage and
      // record the day's snapshot from database state.
      const res = await fetch(`/api/production-days/${productionDate}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });

      if (res.ok) {
        await loadProductionDayStatus();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to finish roast day');
      }
    } catch (err) {
      console.error('Failed to finish roast day:', err);
      alert('Network error while finishing roast day');
    }
  }

  async function loadBatchOverrides() {
    const res = await fetch('/api/batch-overrides');
    const overrides: BatchOverride[] = await res.json();
    batchOverrides = overrides.reduce((acc, o) => ({ ...acc, [o.batch_type]: o.weight_lbs }), {});
  }

  const activeProducts = $derived(
    products.filter((p) => p.active && groups.some((g) => g.id === p.group_id && g.active))
  );

  const suggestions = $derived(
    search.trim()
      ? activeProducts.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 14)
      : []
  );

  const plan = $derived(
    groups.map((g) => ({
      ...g,
      calc: calcGroup(g, orders, products, leftovers[g.id] ?? 0, batchOverrides)
    })).sort((a, b) => {
      switch (sortBy) {
        case 'type':
          return a.type.localeCompare(b.type) || a.label.localeCompare(b.label);
        case 'label':
          return a.label.localeCompare(b.label);
        case 'batch_type':
          return a.batch_type.localeCompare(b.batch_type) || a.label.localeCompare(b.label);
        case 'needed':
          return b.calc.needed - a.calc.needed;
        default:
          return 0;
      }
    })
  );

  const roastNeeded = $derived(plan.filter((g) => g.calc.needed > 0));

  const ordersByGroup = $derived(
    groups.reduce((acc, group) => {
      const groupOrders = orders
        .map(order => {
          const product = products.find(p => p.id === order.product_id);
          return product && product.group_id === group.id ? { order, product } : null;
        })
        .filter(Boolean) as Array<{ order: Order; product: Product }>;
      acc[group.id] = groupOrders;
      return acc;
    }, {} as Record<string, Array<{ order: Order; product: Product }>>)
  );

  function toggleGroup(groupId: string) {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    expandedGroups = newExpanded;
  }

  async function deleteOrder(orderId: string) {
    if (!confirm('Remove this order?')) return;

    try {
      const res = await fetch(`/api/orders?id=${orderId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to delete order');
        return;
      }

      await loadData();
    } catch (err) {
      console.error('Delete order error:', err);
      alert('Failed to delete order');
    }
  }

  async function addOrder(product: Product) {
    const existing = orders.find((o) => o.product_id === product.id && !o.bundle_line_id);

    if (existing) {
      existing.qty += qty;
      await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(existing)
      });
    } else {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id, qty, production_date: productionDate })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to add order');
        return;
      }
      orders = [...orders, await res.json()];
    }

    search = '';
    dropOpen = false;
  }

  async function updateLeftover(groupId: string, value: number) {
    leftovers[groupId] = value;
    await fetch('/api/leftovers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId, lbs: value })
    });
  }

  function formatProductionDate(dateStr: string) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

</script>

<div class="planner">
  <header class="header">
    <a href="/" class="title">
      <h1><img class="wordmark light-wordmark" src="/images/ledger/wordmark-primary.svg" alt="BeanLedger" /><img class="wordmark dark-wordmark" src="/images/ledger/wordmark-on-dark.svg" alt="BeanLedger" /></h1>
      <p>Coffee roaster production planner</p>
    </a>
    <div class="header-actions">
      <div class="workspace-actions" role="group" aria-label="Workspace tools">
      <button class="action-button" class:open={showPickList} aria-haspopup="dialog"
        disabled={orders.length === 0}
        onclick={() => showPickList = true}
      >
        Pick List
      </button>
      <button class="action-button" class:open={showReports} aria-haspopup="dialog" onclick={() => showReports = true}>
        Reports
      </button>
      <button class="action-button" class:open={showCatalog} aria-haspopup="dialog" onclick={() => showCatalog = true}>
        Catalog
      </button>
      <button class="action-button" class:open={showSettings} aria-haspopup="dialog" onclick={() => showSettings = true}>
        Settings
      </button>
      <button class="action-button" class:open={showPackaging} aria-haspopup="dialog" onclick={() => showPackaging = true}>
        Packaging
      </button>
      </div>
      <div class="day-actions">
      {#if dayStatus === 'scheduled'}
        <button class="active-button" onclick={markAsActive}>
          🟢 Mark as Active
        </button>
      {/if}
      {#if dayStatus === 'active' || dayStatus === 'scheduled'}
        <button class="finish-button" onclick={finishRoastDay}>
          ✓ Finish Roast Day
        </button>
      {/if}
      <div class="date-display">
        <span class="date-text">{formatProductionDate(productionDate)}</span>
        {#if dayStatus}
          <span class="status-badge status-{dayStatus}">
            {#if dayStatus === 'active'}🟢{:else if dayStatus === 'scheduled'}📅{:else}✅{/if}
            {dayStatus.charAt(0).toUpperCase() + dayStatus.slice(1)}
          </span>
        {/if}
      </div>
      </div>
    </div>
  </header>

  <CsvImport productionDate={productionDate} onImportComplete={loadData} />
  <ImportHistory bind:this={importHistory} productionDate={productionDate} onDelete={loadData} />

  <div class="search-and-sort">
    <button class="add-manual-btn" onclick={() => (showManualAddModal = true)}>
      + Add Manual Product
    </button>
    <div class="sort-control">
      <select bind:value={sortBy}>
        <option value="type">Sort: Type</option>
        <option value="label">Sort: Name</option>
        <option value="batch_type">Sort: Batch Type</option>
        <option value="needed">Sort: Amount Needed</option>
      </select>
    </div>
  </div>

  <div class="ledger-scroll" role="region" aria-label="Roast plan" tabindex="0">
    <!-- Explicit roles preserve table semantics when mobile CSS changes display. -->
    <table class="ledger" role="table">
      <caption>Roast requirements · {unitLabel($units)}</caption>
      <thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col">Coffee</th><th role="columnheader" scope="col">Total</th><th role="columnheader" scope="col">Leftover</th><th role="columnheader" scope="col">Needed</th><th role="columnheader" scope="col">Pred. leftover</th><th role="columnheader" scope="col">Batches</th></tr></thead>
      {#each plan as group (group.id)}
        {@const calc = group.calc}
        {@const entries = ordersByGroup[group.id] ?? []}
        <tbody role="rowgroup">
          <tr role="row" class:idle={calc.totalLbs === 0}>
            <th role="rowheader" scope="row">
              {#if entries.length}
                <button class="group-toggle" aria-expanded={expandedGroups.has(group.id)} aria-controls="details-{group.id}" onclick={() => toggleGroup(group.id)}>
                  <span aria-hidden="true">{expandedGroups.has(group.id) ? '▾' : '▸'}</span> {group.label}
                  <small>{entries.length} order{entries.length === 1 ? '' : 's'}</small>
                </button>
              {:else}{group.label}<small>No orders</small>{/if}
            </th>
            <td role="cell"><span class="mobile-label" aria-hidden="true">Total</span>{formatWeight(calc.totalLbs, $units)}</td>
            <td role="cell"><span class="mobile-label" aria-hidden="true">Leftover</span><input aria-label="{group.label} leftover ({unitLabel($units)})" type="number" step="0.01" class="leftover-input"
              value={toUnits(leftovers[group.id] ?? 0, $units).toFixed(2)}
              onchange={(e) => { const lbs = parseWeight(e.currentTarget.value, $units); updateLeftover(group.id, isFinite(lbs) ? lbs : 0); }}
              onwheel={(e) => e.currentTarget.blur()} /></td>
            <td role="cell" class="needed"><span class="mobile-label" aria-hidden="true">Needed</span>{calc.needed > 0 ? formatWeight(calc.needed, $units) : '—'}
              {#if calc.needed > 0 && calc.roastLossPct > 0}<small>green ({calc.roastLossPct}% loss)</small>{/if}
            </td>
            <td role="cell" class="predicted"><span class="mobile-label" aria-hidden="true">Pred. leftover</span>{calc.needed > 0 ? formatWeight(calc.predictedLeftover, $units) : calc.totalLbs > 0 ? formatWeight((leftovers[group.id] ?? 0) - calc.totalLbs, $units) : '—'}
              {#if calc.needed <= 0 && calc.totalLbs > 0}<small>From stock</small>{/if}
            </td>
            <td role="cell" class="batch-count"><span class="mobile-label" aria-hidden="true">Batches</span>{calc.batchesUp}</td>
          </tr>
        </tbody>
        <tbody role="rowgroup" id="details-{group.id}" hidden={!expandedGroups.has(group.id)}>
          {#each entries as { order, product } (order.id)}
            <tr role="row" class="order-row">
              <th role="rowheader" scope="row">{product.name} <small>×{order.qty}{!order.import_batch_id?.trim() ? ' · Manual' : ''}</small></th>
              <td role="cell"><span class="mobile-label" aria-hidden="true">Order total</span>{formatWeight(product.lbs * order.qty, $units)}</td>
              <td role="cell" colspan="4"><button class="remove-order" onclick={() => deleteOrder(order.id)} aria-label="Remove {product.name} from production day">Remove</button></td>
            </tr>
          {/each}
        </tbody>
      {/each}
      <tfoot role="rowgroup"><tr role="row"><th role="rowheader" scope="row">Totals</th><td role="cell"><span class="mobile-label" aria-hidden="true">Total</span>{formatWeight(plan.reduce((sum, g) => sum + g.calc.totalLbs, 0), $units)}</td><td role="cell"></td><td role="cell"><span class="mobile-label" aria-hidden="true">Needed</span>{formatWeight(plan.reduce((sum, g) => sum + g.calc.needed, 0), $units)}</td><td role="cell"></td><td role="cell"><span class="mobile-label" aria-hidden="true">Batches</span>{plan.reduce((sum, g) => sum + g.calc.batchesUp, 0)}</td></tr></tfoot>
    </table>
  </div>
</div>

{#if showPickList}
  <PickList
    {orders}
    {products}
    {groups}
    {productionDate}
    units={$units}
    batchesNeeded={roastNeeded}
    onClose={() => { showPickList = false; loadData(); }}
  />
{/if}

{#if showReports}
  <Reports
    {orders}
    {products}
    {groups}
    {leftovers}
    {batchOverrides}
    {productionDate}
    units={$units}
    onClose={() => (showReports = false)}
  />
{/if}

{#if showCatalog}
  <Catalog
    onClose={() => (showCatalog = false)}
    onUpdate={loadData}
  />
{/if}

{#if showSettings}
  <Settings
    onClose={() => (showSettings = false)}
    onBatchOverridesChange={loadBatchOverrides}
  />
{/if}

{#if showPackaging}
  <Packaging {productionDate} onClose={() => (showPackaging = false)} />
{/if}

{#if showLeftoverConfirm}
  <LeftoverConfirmModal
    groups={plan}
    {leftovers}
    units={$units}
    onConfirm={confirmFinishRoastDay}
    onCancel={() => (showLeftoverConfirm = false)}
    onUpdateLeftover={updateLeftover}
  />
{/if}

{#if showManualAddModal}
  <div class="modal-backdrop" onclick={(e) => { if (e.target === e.currentTarget) showManualAddModal = false; }}>
    <div class="modal manual-add-modal">
      <div class="modal-header">
        <div class="modal-title">Add Manual Product</div>
        <button class="close-button" onclick={() => (showManualAddModal = false)}>×</button>
      </div>
      <div class="modal-body">
        <div class="manual-add-form">
          <label>
            <span class="label-text">Quantity</span>
            <input
              type="number"
              bind:value={qty}
              min="1"
              placeholder="1"
            />
          </label>
          <label>
            <span class="label-text">Product</span>
            <input
              type="text"
              placeholder="Search products..."
              bind:value={search}
              onfocus={() => (dropOpen = true)}
              oninput={() => { dropOpen = true; selectedProduct = null; }}
            />
            {#if dropOpen && suggestions.length > 0}
              <div class="dropdown">
                {#each suggestions as product}
                  <button
                    class="dropdown-item"
                    class:selected={selectedProduct?.id === product.id}
                    onclick={() => { selectedProduct = product; search = product.name; dropOpen = false; }}
                  >
                    {product.name}
                    <span class="meta">{formatPackageSize(product.lbs, $units)}</span>
                  </button>
                {/each}
              </div>
            {/if}
            {#if dropOpen && search && suggestions.length === 0}
              <div class="dropdown">
                <div class="dropdown-empty">No products found</div>
              </div>
            {/if}
          </label>
          <button
            class="add-product-btn"
            disabled={!selectedProduct}
            onclick={() => {
              if (selectedProduct) {
                addOrder(selectedProduct);
                showManualAddModal = false;
                search = '';
                selectedProduct = null;
                dropOpen = false;
              }
            }}
          >
            Add Product
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .planner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px var(--page-gutter);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
  }

  .title {
    text-decoration: none;
    cursor: pointer;
  }

  .title:hover h1 {
    opacity: 0.8;
  }

  .title h1 {
    font-size: 32px;
    font-weight: 700;
    color: var(--accent);
    margin: 0 0 4px 0;
    transition: opacity 0.2s;
  }

  .title p {
    margin: 0;
    color: var(--text-muted);
    font-size: 14px;
  }

  .header-actions {
    display: flex;
    gap: 8px;
    align-items: flex-end;
  }





  .date-display {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
  }

  .date-text {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }

  .active-button,
  .finish-button {
    padding: 5px 14px;
    background: var(--muted-green);
    border: 1px solid var(--muted-green);
    border-radius: 5px;
    color: var(--bg);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-family);
    white-space: nowrap;
  }

  .active-button:hover,
  .finish-button:hover {
    background: var(--muted-green-hover);
    border-color: var(--muted-green-hover);
  }

  .status-badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    margin-top: 4px;
  }

  .status-active {
    background: var(--success-bg);
    color: var(--success-text);
  }

  .status-scheduled {
    background: var(--info-bg);
    color: var(--info-text);
  }

  .status-completed {
    background: var(--neutral-bg);
    color: var(--neutral-text);
  }

  .search-and-sort {
    display: flex;
    gap: 16px;
    align-items: center;
    margin-bottom: 24px;
  }

  .add-manual-btn {
    padding: 10px 16px;
    background: var(--accent);
    color: var(--bg);
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-family: var(--font-family);
    cursor: pointer;
    font-weight: 600;
    transition: background 0.15s;
  }

  .add-manual-btn:hover {
    background: var(--accent-hover);
  }

  .search-bar {
    position: relative;
    flex: 1;
  }

  .sort-control {
    min-width: 200px;
  }

  .manual-add-modal {
    width: 500px;
  }

  .manual-add-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .manual-add-form label {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .label-text {
    font-size: 11px;
    color: var(--text-muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .manual-add-form input[type="number"],
  .manual-add-form input[type="text"] {
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: 4px;
    font-size: 14px;
    font-family: var(--font-family);
    background: var(--bg);
  }

  .manual-add-form input[type="number"] {
    width: 120px;
  }

  .manual-add-form label {
    position: relative;
  }

  .manual-add-form .dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    margin-top: 4px;
    max-height: 300px;
    overflow-y: auto;
    z-index: 1001;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .manual-add-form .dropdown-item {
    width: 100%;
    padding: 10px 12px;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
    font-size: 13px;
    font-family: var(--font-family);
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-subtle);
  }

  .manual-add-form .dropdown-item:hover {
    background: var(--bg-sunken);
  }

  .manual-add-form .dropdown-item.selected {
    background: var(--accent);
    color: var(--bg);
  }

  .manual-add-form .dropdown-item.selected .meta {
    color: var(--bg);
  }

  .manual-add-form .dropdown-item .meta {
    font-size: 11px;
    color: var(--text-muted);
  }

  .manual-add-form .dropdown-empty {
    padding: 10px 12px;
    font-size: 13px;
    color: var(--text-muted);
    text-align: center;
  }

  .add-product-btn {
    padding: 10px 16px;
    background: var(--accent);
    color: var(--bg);
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-family: var(--font-family);
    cursor: pointer;
    font-weight: 600;
    transition: background 0.15s;
  }

  .add-product-btn:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .add-product-btn:disabled {
    background: var(--border);
    cursor: not-allowed;
    opacity: 0.6;
  }

  .sort-control select {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-raised);
    color: var(--text);
    font-family: var(--font-family);
    font-size: 14px;
    cursor: pointer;
  }

  .search-bar input {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-raised);
    color: var(--text);
    font-family: var(--font-family);
    font-size: 14px;
  }

  .dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--bg-raised);
    border: 1px solid var(--border);
    border-top: none;
    border-radius: 0 0 4px 4px;
    max-height: 300px;
    overflow-y: auto;
    z-index: 10;
  }

  .dropdown-item {
    display: flex;
    justify-content: space-between;
    width: 100%;
    padding: 8px 14px;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
    font-family: var(--font-family);
    font-size: 12px;
    color: var(--text);
    border-bottom: 1px solid var(--border-subtle);
  }

  .dropdown-item:hover {
    background: var(--bg-sunken);
  }

  .meta {
    color: var(--text-muted);
  }

  /* Modal styles */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.78);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: var(--bg-raised);
    border: 1px solid var(--border);
    border-radius: 8px;
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
  }

  .manual-add-modal {
    max-height: 90vh;
  }

  .manual-add-modal .modal-body {
    max-height: 70vh;
    overflow-y: auto;
  }

  .modal-header {
    padding: 14px 20px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .modal-title {
    font-size: 15px;
    color: var(--accent);
    font-weight: 700;
  }

  .modal-body {
    padding: 20px;
    overflow-y: auto;
  }

  .close-button {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 20px;
    cursor: pointer;
    line-height: 1;
  }

  .close-button:hover {
    color: var(--text);
  }

  /* Products section */
  .header { flex-wrap: wrap; gap: 1.5rem; padding: 1rem 0 1.5rem; border-bottom: 1px solid var(--border); }
  .header-actions { flex-wrap: wrap; align-items: center; }
  .wordmark { width: 270px; max-width: 100%; height: auto; display: block; }
  .dark-wordmark { display: none; }
  :global([data-theme="dark"]) .light-wordmark { display: none; }
  :global([data-theme="dark"]) .dark-wordmark { display: block; }
  .title p { font-size: 11px; margin-top: 10px; }
  .planner :global(.drop-zone), .planner :global(.import-item) { border-radius: 0; }
  .planner :global(.format-warning) { color: var(--text-muted); border-color: var(--border); border-radius: 0; }
  .planner :global(.import-item) { background: transparent; border: 0; border-bottom: 1px solid var(--border); }
  .planner :global(.delete-button) { background: transparent; color: var(--danger); }
  .ledger-scroll { overflow-x: auto; margin-bottom: 2rem; }
  .ledger { width: 100%; min-width: 790px; border-collapse: collapse; font-size: 12px; border-top: 3px solid var(--text); border-bottom: 4px double var(--text); background: var(--bg-raised); font-variant-numeric: tabular-nums; }
  .ledger caption { text-align: left; color: var(--text-muted); padding: 0 0 10px; }
  .ledger th, .ledger td { padding: 16px 14px; text-align: right; border-bottom: 1px solid var(--border); vertical-align: middle; }
  .ledger th:first-child { text-align: left; width: 30%; border-right: 4px double var(--danger); }
  .ledger thead th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; background: var(--bg); }
  .ledger small { display: block; font-size: 10px; font-weight: normal; color: var(--text-muted); margin-top: 5px; }
  .group-toggle { width: 100%; background: none; border: 0; padding: 0; color: inherit; text-align: left; font: inherit; font-weight: 700; cursor: pointer; }
  .group-toggle:hover { color: var(--accent); }
  .leftover-input { width: 76px; padding: 7px; border: 1px solid var(--border); background: var(--bg); color: var(--text); text-align: right; }
  .needed { color: var(--danger); font-weight: 700; }
  .predicted { color: var(--accent); }
  .batch-count { font-size: 20px; font-weight: 700; }
  .idle { color: var(--text-muted); }
  .order-row { background: var(--bg); }
  .order-row th { font-weight: normal; padding-left: 30px; }
  .remove-order { background: transparent; color: var(--danger); border: 1px solid var(--danger); padding: 5px 8px; cursor: pointer; }
  .ledger tfoot { font-weight: 700; }
  .planner :global(.csv-import), .planner :global(.import-history) { border-radius: 0; border-top: 3px solid var(--text); }
  .planner :global(.csv-import h3), .planner :global(.import-history h3) { text-transform: uppercase; letter-spacing: 0.07em; font-size: 14px; }
  .planner :global(button), .planner :global(input), .planner :global(select), .planner :global(textarea) { border-radius: 0; }
  @media (max-width: 600px) { .planner { padding: 16px; } .date-display { align-items: flex-start; } }

  .mobile-label { display: none; }
  @media (max-width: 800px) {
    .ledger-scroll { overflow: visible; }
    .ledger { display: block; min-width: 0; border-top: 0; background: transparent; }
    .ledger caption { display: block; }
    .ledger thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
    .ledger tbody:not([hidden]), .ledger tfoot { display: block; }
    .ledger tr { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); background: var(--bg-raised); }
    .ledger th, .ledger td { min-width: 0; padding: 12px 16px; text-align: left; overflow-wrap: anywhere; }
    .ledger th:first-child { grid-column: 1 / -1; width: auto; border-right: 0; border-left: 4px double var(--danger); border-top: 3px solid var(--text); padding: 16px; }
    .ledger tbody + tbody:not([id]) { margin-top: 20px; }
    .ledger .mobile-label { display: block; color: var(--text-muted); font-size: 10px; font-weight: 400; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 8px; }
    .ledger .batch-count { grid-column: 1 / -1; font-size: 18px; }
    .group-toggle { min-height: 44px; font-size: 14px; }
    .leftover-input { width: 100%; max-width: 110px; min-height: 44px; text-align: left; font-size: 16px; }
    .ledger .order-row { background: var(--bg); }
    .ledger .order-row th:first-child { border-top: 0; border-left: 0; font-size: 13px; }
    .remove-order { min-height: 44px; padding: 8px 12px; }
    .ledger .order-row td:last-child { display: flex; align-items: center; justify-content: flex-end; }
    .ledger tfoot { margin-top: 24px; }
    .ledger tfoot td:empty { display: none; }
  }

  /* Align the text tabs just above the header rule, as in the brand reference. */
  @media (min-width: 1000px) {
    .header { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: end; gap: 24px; padding-bottom: 0; }
    .header-actions { display: contents; }
    .header :global(.workspace-actions) { justify-content: center; margin-bottom: -1px; }
    .title { padding-bottom: 14px; }
    .day-actions { display: flex; flex-direction: column-reverse; align-items: flex-end; gap: 8px; padding-bottom: 14px; }
  }
  @media (max-width: 999px) {
    .day-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
  }
</style>
