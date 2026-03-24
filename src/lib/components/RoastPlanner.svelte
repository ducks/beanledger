<script lang="ts">
  import { onMount } from 'svelte';
  import type { RoastGroup, Product, Order, BatchOverride } from '$lib/types';
  import { calcGroup, formatWeight } from '$lib/calc';
  import CsvImport from './CsvImport.svelte';
  import ImportHistory from './ImportHistory.svelte';
  import PickList from './PickList.svelte';
  import Reports from './Reports.svelte';
  import Catalog from './Catalog.svelte';
  import Settings from './Settings.svelte';
  import LeftoverConfirmModal from './LeftoverConfirmModal.svelte';

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
  let units = $state<'lbs' | 'kg'>('lbs');
  let productionDate = $state(initialDate);
  let previousDate = $state(productionDate);
  let sortBy = $state<'type' | 'label' | 'batch_type' | 'needed'>('type');
  let importHistory: any;
  let dayStatus = $state<'active' | 'scheduled' | 'completed' | null>(null);

  // Modal states
  let showPickList = $state(false);
  let showReports = $state(false);
  let showCatalog = $state(false);
  let showSettings = $state(false);
  let showLeftoverConfirm = $state(false);

  onMount(async () => {
    await loadData();
    await loadBatchOverrides();
    await loadProductionDayStatus();
    previousDate = productionDate;
  });

  async function loadData() {
    console.log('[FRONTEND] loadData called for date:', productionDate);
    const [groupsRes, productsRes, ordersRes, leftoversRes] = await Promise.all([
      fetch('/api/groups'),
      fetch('/api/products'),
      fetch(`/api/orders?date=${productionDate}`),
      fetch(`/api/leftovers?date=${productionDate}`)
    ]);

    console.log('[FRONTEND] Leftovers response status:', leftoversRes.status);
    groups = await groupsRes.json();
    products = await productsRes.json();
    orders = await ordersRes.json();
    const leftoversData = await leftoversRes.json();

    console.log('[FRONTEND] Leftovers data received:', leftoversData);
    // Ensure leftoversData is an array before reducing
    if (Array.isArray(leftoversData)) {
      leftovers = leftoversData.reduce((acc, l) => ({ ...acc, [l.group_id]: l.lbs }), {});
    } else {
      leftovers = {};
    }

    console.log('[FRONTEND] Processed leftovers object:', leftovers);
    // Also refresh import history
    importHistory?.refresh();
  }

  async function handleProductionDateChange(newDate: string) {
    const oldDate = previousDate;

    // Don't do anything if date hasn't actually changed
    if (oldDate === newDate) {
      return;
    }

    // Save snapshot of current date before switching (if there are orders)
    if (orders.length > 0 && oldDate) {
      await saveSnapshot(oldDate);
    }

    // Update tracking variable
    previousDate = newDate;

    // Try to load snapshot for new date
    const snapshot = await loadSnapshot(newDate);

    if (snapshot) {
      // Restore from snapshot
      await restoreFromSnapshot(snapshot);
    } else {
      // No snapshot - load fresh data for this date
      await loadData();
    }

    // Load production day status
    await loadProductionDayStatus();
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
      // Save snapshot with complete data before marking as complete
      await saveSnapshot(productionDate);

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

  async function saveSnapshot(date: string) {
    try {
      // Convert orders to product names + quantities
      const orderData = orders.map(o => {
        const product = products.find(p => p.id === o.product_id);
        return product ? { product_name: product.name, qty: o.qty } : null;
      }).filter(Boolean);

      // Calculate predicted leftovers and merge with manual adjustments
      const finalLeftovers: Record<string, number> = {};
      for (const groupWithCalc of plan) {
        // Use manually entered value if exists, otherwise use predicted
        const manualValue = leftovers[groupWithCalc.id];
        const predictedValue = groupWithCalc.calc.predictedLeftover;

        // If there's a manual value (even if 0), use it; otherwise use predicted
        if (manualValue !== undefined) {
          finalLeftovers[groupWithCalc.id] = manualValue;
        } else if (predictedValue > 0) {
          finalLeftovers[groupWithCalc.id] = predictedValue;
        }
      }

      await fetch('/api/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          production_date: date,
          orders: orderData,
          leftovers: finalLeftovers,
          groups,
          products,
          batchOverrides
        })
      });
    } catch (err) {
      console.error('Failed to save snapshot:', err);
    }
  }

  async function loadSnapshot(date: string) {
    try {
      const res = await fetch(`/api/snapshots?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        return data?.summary ? data : null;
      }
      return null;
    } catch (err) {
      console.error('Failed to load snapshot:', err);
      return null;
    }
  }

  async function restoreFromSnapshot(snapshot: any) {
    try {
      // Load products and groups (current catalog)
      const [groupsRes, productsRes] = await Promise.all([
        fetch('/api/groups'),
        fetch('/api/products')
      ]);

      groups = await groupsRes.json();
      products = await productsRes.json();

      // Restore orders from snapshot
      const restoredOrders: Order[] = [];
      for (const orderData of snapshot.summary.orders || []) {
        const product = products.find(p => p.name === orderData.product_name);
        if (product) {
          restoredOrders.push({
            id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            product_id: product.id,
            qty: orderData.qty,
            production_date: productionDate
          });
        }
      }
      orders = restoredOrders;

      // Restore leftovers from snapshot
      leftovers = snapshot.summary.leftovers || {};
    } catch (err) {
      console.error('Failed to restore from snapshot:', err);
      await loadData();
    }
  }

  async function loadBatchOverrides() {
    const res = await fetch('/api/batch-overrides');
    const overrides: BatchOverride[] = await res.json();
    batchOverrides = overrides.reduce((acc, o) => ({ ...acc, [o.batch_type]: o.weight_lbs }), {});
  }

  const activeProducts = $derived(
    products.filter((p) => groups.find((g) => g.id === p.group_id))
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

  async function addOrder(product: Product) {
    const existing = orders.find((o) => o.product_id === product.id);

    if (existing) {
      existing.qty += qty;
      await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(existing)
      });
    } else {
      const newOrder = {
        id: Date.now() + Math.random() + '',
        product_id: product.id,
        qty,
        production_date: productionDate
      };
      orders = [...orders, newOrder];
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
      });
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
      <h1>BeanLedger</h1>
      <p>Coffee roaster production planner</p>
    </a>
    <div class="header-actions">
      <button
        class="action-button"
        disabled={orders.length === 0}
        onclick={() => showPickList = true}
      >
        ☰ Pick List
      </button>
      <button class="action-button" onclick={() => showReports = true}>
        ▦ Reports
      </button>
      <button class="action-button" onclick={() => showCatalog = true}>
        ⚙ Catalog
      </button>
      <button class="action-button" onclick={() => showSettings = true}>
        ⚙ Settings
      </button>
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
  </header>

  <CsvImport productionDate={productionDate} onImportComplete={loadData} />
  <ImportHistory bind:this={importHistory} productionDate={productionDate} onDelete={loadData} />

  <div class="search-and-sort">
    <div class="search-bar">
      <input
        type="text"
        placeholder="Search products..."
        bind:value={search}
        onfocus={() => (dropOpen = true)}
      />
      {#if dropOpen && suggestions.length > 0}
        <div class="dropdown">
        {#each suggestions as product}
          <button class="dropdown-item" onclick={() => addOrder(product)}>
            {product.name}
            <span class="meta">{product.lbs} lb</span>
          </button>
        {/each}
      </div>
    {/if}
    </div>
    <div class="sort-control">
      <select bind:value={sortBy}>
        <option value="type">Sort: Type</option>
        <option value="label">Sort: Name</option>
        <option value="batch_type">Sort: Batch Type</option>
        <option value="needed">Sort: Amount Needed</option>
      </select>
    </div>
  </div>

  <div class="groups">
    {#each plan as group}
      {@const calc = group.calc}
      {@const needsRoast = calc.needed > 0}
      <div class="group-card">
        <div class="group-header">
          <span class="label">{group.label}</span>
        </div>

        <div class="stats">
          <div class="stat">
            <div class="stat-label">Total</div>
            <div class="stat-value">{formatWeight(calc.totalLbs, units)}</div>
          </div>

          <div class="stat">
            <div class="stat-label">Leftover</div>
            <input
              type="number"
              step="0.01"
              class="leftover-input"
              value={leftovers[group.id] ?? 0}
              onchange={(e) => updateLeftover(group.id, parseFloat(e.currentTarget.value) || 0)}
              onwheel={(e) => e.currentTarget.blur()}
            />
            <span class="unit">lb</span>
          </div>

          <div class="stat">
            <div class="stat-label">Needed</div>
            <div class="stat-value accent">{needsRoast ? formatWeight(calc.needed, units) : '—'}</div>
            {#if needsRoast && calc.roastLossPct > 0}
              <div class="stat-note">green ({calc.roastLossPct}% loss)</div>
            {/if}
          </div>
        </div>

        {#if needsRoast}
          <div class="batches">
            <div class="batch-info">
              <div class="batch-label">Predicted Leftover</div>
              <div class="batch-precise">{formatWeight(calc.predictedLeftover, units)}</div>
            </div>
            <div class="batch-rounded">
              <div class="batch-label">Batches</div>
              <div class="batch-up">{calc.batchesUp}</div>
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

{#if showPickList}
  <PickList
    {orders}
    {products}
    {groups}
    {productionDate}
    {units}
    batchesNeeded={roastNeeded}
    onClose={() => (showPickList = false)}
  />
{/if}

{#if showReports}
  <Reports
    {orders}
    {products}
    {groups}
    {leftovers}
    {units}
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
    {units}
    onClose={() => (showSettings = false)}
    onUnitsChange={(newUnits) => (units = newUnits)}
    onBatchOverridesChange={loadBatchOverrides}
  />
{/if}

{#if showLeftoverConfirm}
  <LeftoverConfirmModal
    groups={plan}
    {leftovers}
    {units}
    onConfirm={confirmFinishRoastDay}
    onCancel={() => (showLeftoverConfirm = false)}
    onUpdateLeftover={updateLeftover}
  />
{/if}

<style>
  .planner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
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
    color: #b29244;
    margin: 0 0 4px 0;
    transition: opacity 0.2s;
  }

  .title p {
    margin: 0;
    color: #6b7360;
    font-size: 14px;
  }

  .header-actions {
    display: flex;
    gap: 8px;
    align-items: flex-end;
  }

  .action-button {
    padding: 5px 14px;
    background: #231f20;
    border: 1px solid #231f20;
    border-radius: 5px;
    color: #f6f4eb;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-family);
    white-space: nowrap;
  }

  .action-button:hover:not(:disabled) {
    background: #3a3536;
    border-color: #3a3536;
  }

  .action-button:disabled {
    background: none;
    border-color: #c8c4a8;
    color: #6b7360;
    cursor: not-allowed;
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
    color: #231f20;
  }

  .active-button,
  .finish-button {
    padding: 5px 14px;
    background: #6b7360;
    border: 1px solid #6b7360;
    border-radius: 5px;
    color: #f6f4eb;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-family);
    white-space: nowrap;
  }

  .active-button:hover,
  .finish-button:hover {
    background: #5a6250;
    border-color: #5a6250;
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
    background: #d4edda;
    color: #155724;
  }

  .status-scheduled {
    background: #d1ecf1;
    color: #0c5460;
  }

  .status-completed {
    background: #e2e3e5;
    color: #383d41;
  }

  .search-and-sort {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    margin-bottom: 24px;
  }

  .search-bar {
    position: relative;
    flex: 1;
  }

  .sort-control {
    min-width: 200px;
  }

  .sort-control select {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid #c8c4a8;
    border-radius: 4px;
    background: #eae8d8;
    color: #231f20;
    font-family: var(--font-family);
    font-size: 14px;
    cursor: pointer;
  }

  .search-bar input {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid #c8c4a8;
    border-radius: 4px;
    background: #eae8d8;
    color: #231f20;
    font-family: var(--font-family);
    font-size: 14px;
  }

  .dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: #eae8d8;
    border: 1px solid #c8c4a8;
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
    color: #231f20;
    border-bottom: 1px solid #d8d4bc;
  }

  .dropdown-item:hover {
    background: #ddd9c4;
  }

  .meta {
    color: #6b7360;
  }

  .groups {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }

  .group-card {
    background: #eae8d8;
    border: 1px solid #c8c4a8;
    border-radius: 8px;
    padding: 16px;
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }

  .label {
    font-size: 14px;
    font-weight: 700;
    color: #231f20;
  }

  .stats {
    display: flex;
    gap: 16px;
    margin-bottom: 12px;
  }

  .stat {
    flex: 1;
  }

  .stat-label {
    font-size: 9px;
    color: #6b7360;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 4px;
  }

  .stat-value {
    font-size: 13px;
    font-weight: 700;
    color: #231f20;
  }

  .stat-value.accent {
    color: #b75742;
  }

  .stat input {
    width: 62px;
    padding: 3px 6px;
    background: #ddd9c4;
    border: 1px solid #c8c4a8;
    border-radius: 4px;
    color: #b29244;
    font-family: var(--font-family);
    font-size: 12px;
  }

  .leftover-input::-webkit-inner-spin-button,
  .leftover-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .leftover-input[type=number] {
    -moz-appearance: textfield;
  }

  .unit {
    font-size: 10px;
    color: #6b7360;
    margin-left: 4px;
  }

  .stat-note {
    font-size: 9px;
    color: #6b7360;
    margin-top: 2px;
  }

  .batches {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #d8d4bc;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  .batch-label {
    font-size: 9px;
    color: #6b7360;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .batch-weight {
    color: #231f20;
  }

  .batch-precise {
    font-size: 15px;
    font-weight: 700;
    color: #b29244;
    margin-top: 4px;
  }

  .batch-rounded {
    text-align: right;
  }

  .batch-up {
    font-size: 32px;
    font-weight: 700;
    color: #b75742;
    line-height: 1;
    margin-top: 2px;
  }
</style>
