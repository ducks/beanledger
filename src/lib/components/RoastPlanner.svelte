<script lang="ts">
  import { onMount } from 'svelte';
  import type { RoastGroup, Product, Order, BatchOverride } from '$lib/types';
  import { calcGroup, formatWeight } from '$lib/calc';
  import CsvImport from './CsvImport.svelte';
  import PickList from './PickList.svelte';
  import Reports from './Reports.svelte';
  import Catalog from './Catalog.svelte';
  import Settings from './Settings.svelte';

  let groups = $state<RoastGroup[]>([]);
  let products = $state<Product[]>([]);
  let orders = $state<Order[]>([]);
  let leftovers = $state<Record<string, number>>({});
  let batchOverrides = $state<Record<string, number>>({});
  let search = $state('');
  let qty = $state(1);
  let dropOpen = $state(false);
  let units = $state<'lbs' | 'kg'>('lbs');
  let productionDate = $state(new Date().toISOString().slice(0, 10));
  let previousDate = $state(productionDate);

  // Modal states
  let showPickList = $state(false);
  let showReports = $state(false);
  let showCatalog = $state(false);
  let showSettings = $state(false);

  onMount(async () => {
    await loadData();
    await loadBatchOverrides();
    previousDate = productionDate;
  });

  async function loadData() {
    const [groupsRes, productsRes, ordersRes, leftoversRes] = await Promise.all([
      fetch('/api/groups'),
      fetch('/api/products'),
      fetch(`/api/orders?date=${productionDate}`),
      fetch('/api/leftovers')
    ]);

    groups = await groupsRes.json();
    products = await productsRes.json();
    orders = await ordersRes.json();
    const leftoversData = await leftoversRes.json();
    leftovers = leftoversData.reduce((acc, l) => ({ ...acc, [l.group_id]: l.lbs }), {});
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
  }

  async function saveSnapshot(date: string) {
    try {
      // Convert orders to product names + quantities
      const orderData = orders.map(o => {
        const product = products.find(p => p.id === o.product_id);
        return product ? { product_name: product.name, qty: o.qty } : null;
      }).filter(Boolean);

      await fetch('/api/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          production_date: date,
          orders: orderData,
          leftovers
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
    }))
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
</script>

<div class="planner">
  <header class="header">
    <div class="title">
      <h1>BeanLedger</h1>
      <p>Coffee roaster production planner</p>
    </div>
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
      <div class="date">
        <label>Production Date</label>
        <input type="date" bind:value={productionDate} onchange={() => handleProductionDateChange(productionDate)} />
      </div>
    </div>
  </header>

  <CsvImport productionDate={productionDate} onImportComplete={loadData} />

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
              value={leftovers[group.id] ?? 0}
              onchange={(e) => updateLeftover(group.id, parseFloat(e.currentTarget.value) || 0)}
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
              <div class="batch-label">
                Batches <span class="batch-weight">({formatWeight(calc.batchWeight, units)} green/batch)</span>
              </div>
              <div class="batch-precise">{calc.batches.toFixed(4)}</div>
            </div>
            <div class="batch-rounded">
              <div class="batch-label">Round Up</div>
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

  .title h1 {
    font-size: 32px;
    font-weight: 700;
    color: #b29244;
    margin: 0 0 4px 0;
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

  .date label {
    display: block;
    font-size: 10px;
    color: #6b7360;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 6px;
  }

  .date input {
    padding: 6px 10px;
    border: 1px solid #c8c4a8;
    border-radius: 4px;
    background: #eae8d8;
    color: #231f20;
    font-family: var(--font-family);
    font-size: 12px;
  }

  .search-bar {
    position: relative;
    margin-bottom: 24px;
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
