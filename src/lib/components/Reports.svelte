<script lang="ts">
  import { onMount } from 'svelte';
  import type { Order, Product, RoastGroup } from '$lib/types';
  import { calcGroup, formatWeight } from '$lib/calc';

  let {
    orders,
    products,
    groups,
    leftovers,
    units,
    onClose
  }: {
    orders: Order[];
    products: Product[];
    groups: RoastGroup[];
    leftovers: Record<string, number>;
    units: 'lbs' | 'kg';
    onClose: () => void;
  } = $props();

  let dateFrom = $state('');
  let dateTo = $state('');
  let rangeOrders = $state<Order[]>([]);
  let loading = $state(false);

  onMount(() => {
    // Start with current orders
    rangeOrders = orders;
  });

  async function fetchRangeOrders() {
    if (!dateFrom && !dateTo) {
      rangeOrders = orders;
      return;
    }

    loading = true;
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await fetch(`/api/orders?${params}`);
      rangeOrders = await res.json();
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      rangeOrders = orders;
    } finally {
      loading = false;
    }
  }

  function clearDateRange() {
    dateFrom = '';
    dateTo = '';
    rangeOrders = orders;
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  const productById = $derived(Object.fromEntries(products.map((p) => [p.id, p])));

  // Group orders by production date
  const ordersByDate = $derived.by(() => {
    const byDate = new Map<string, Order[]>();
    for (const order of rangeOrders) {
      if (!byDate.has(order.production_date)) {
        byDate.set(order.production_date, []);
      }
      byDate.get(order.production_date)!.push(order);
    }
    return byDate;
  });

  const uniqueDates = $derived(
    Array.from(ordersByDate.keys()).sort((a, b) => b.localeCompare(a))
  );

  const plan = $derived(
    groups.map((g) => ({
      ...g,
      calc: calcGroup(g, rangeOrders, products, leftovers[g.id] ?? 0, {})
    }))
  );

  const roastNeeded = $derived(plan.filter((g) => g.calc.needed > 0));

  const totalBatches = $derived(roastNeeded.reduce((s, g) => s + g.calc.batchesUp, 0));
  const totalOrdered = $derived(plan.reduce((s, g) => s + g.calc.totalLbs, 0));
  const totalGreen = $derived(
    roastNeeded.reduce((s, g) => s + g.calc.batchesUp * g.calc.batchWeight, 0)
  );

  // Package sizes
  const packageSizes = $derived.by(() => {
    const sizeMap = new Map<number, { size: string; qty: number }>();
    for (const order of rangeOrders) {
      const product = productById[order.product_id];
      if (!product) continue;

      const sizeKey = product.lbs;
      const sizeLabel = product.lbs >= 1 ? `${product.lbs} lb` : `${(product.lbs * 16).toFixed(1)} oz`;

      if (!sizeMap.has(sizeKey)) {
        sizeMap.set(sizeKey, { size: sizeLabel, qty: 0 });
      }
      sizeMap.get(sizeKey)!.qty += order.qty;
    }

    return Array.from(sizeMap.values()).sort((a, b) => {
      const aLbs = parseFloat(a.size);
      const bLbs = parseFloat(b.size);
      return bLbs - aLbs;
    });
  });
</script>

<div class="modal-backdrop" onclick={handleBackdropClick}>
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title">Production Reports</div>
      <button class="close-button" onclick={onClose}>×</button>
    </div>

    <!-- Date Range Filter -->
    <div class="date-range-filter">
      <span class="filter-label">Date Range</span>
      <div class="date-inputs">
        <input
          type="date"
          bind:value={dateFrom}
          onchange={fetchRangeOrders}
          class="date-input"
        />
        <span class="date-separator">—</span>
        <input
          type="date"
          bind:value={dateTo}
          onchange={fetchRangeOrders}
          class="date-input"
        />
      </div>
      {#if dateFrom || dateTo}
        <button class="clear-button" onclick={clearDateRange}>Clear</button>
      {/if}
      <span class="date-count">{uniqueDates.length} day{uniqueDates.length !== 1 ? 's' : ''} in range</span>
    </div>

    <div class="modal-body">
      <!-- Overview Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Batches</div>
          <div class="stat-value">{totalBatches}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Ordered</div>
          <div class="stat-value">{formatWeight(totalOrdered, units)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Green Needed</div>
          <div class="stat-value">{formatWeight(totalGreen, units)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Units</div>
          <div class="stat-value">{orders.reduce((s, o) => s + o.qty, 0)}</div>
        </div>
      </div>

      <!-- Batches by Group -->
      <div class="section">
        <div class="section-title">Batches by Group</div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Group</th>
                <th>Total</th>
                <th>Leftover</th>
                <th>Needed</th>
                <th>Batches</th>
              </tr>
            </thead>
            <tbody>
              {#each roastNeeded as group}
                <tr>
                  <td>{group.label}</td>
                  <td>{formatWeight(group.calc.totalLbs, units)}</td>
                  <td>{formatWeight(leftovers[group.id] ?? 0, units)}</td>
                  <td>{formatWeight(group.calc.needed, units)}</td>
                  <td class="batch-cell">{group.calc.batchesUp}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Units by Package Size -->
      <div class="section">
        <div class="section-title">Units by Package Size</div>
        <div class="size-grid">
          {#each packageSizes as size}
            <div class="size-card">
              <div class="size-label">{size.size}</div>
              <div class="size-qty">{size.qty}</div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
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
    width: 800px;
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
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

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
    margin-bottom: 24px;
  }

  .stat-card {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 14px;
    text-align: center;
  }

  .stat-label {
    font-size: 9px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 6px;
  }

  .stat-value {
    font-size: 20px;
    color: var(--accent);
    font-weight: 700;
  }

  .section {
    margin-bottom: 24px;
  }

  .section-title {
    font-size: 9px;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 12px;
    font-weight: 700;
  }

  .table-container {
    overflow-x: auto;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }

  th {
    background: var(--bg-raised);
    padding: 10px;
    text-align: left;
    border-bottom: 2px solid var(--border);
    font-weight: 600;
    color: var(--text);
    text-transform: uppercase;
    font-size: 9px;
    letter-spacing: 0.05em;
  }

  td {
    padding: 10px;
    border-bottom: 1px solid var(--border-subtle);
    color: var(--text);
  }

  .batch-cell {
    color: var(--accent);
    font-weight: 700;
    font-size: 14px;
  }

  .size-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 10px;
  }

  .size-card {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 12px;
    text-align: center;
  }

  .size-label {
    font-size: 10px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .size-qty {
    font-size: 18px;
    color: var(--accent);
    font-weight: 700;
    margin-top: 4px;
  }

  .date-range-filter {
    padding: 10px 20px;
    border-bottom: 1px solid var(--border-subtle);
    background: var(--bg);
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .filter-label {
    font-size: 10px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .date-inputs {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .date-input {
    padding: 4px 8px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-raised);
    color: var(--text);
    font-family: var(--font-family);
    font-size: 11px;
  }

  .date-separator {
    color: var(--text-muted);
    font-size: 11px;
  }

  .clear-button {
    font-size: 10px;
    color: var(--text-muted);
    background: none;
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 3px 8px;
    cursor: pointer;
    font-family: var(--font-family);
  }

  .clear-button:hover {
    background: var(--bg-raised);
  }

  .date-count {
    font-size: 10px;
    color: var(--text-muted);
    margin-left: auto;
    font-family: var(--font-family);
  }
</style>
