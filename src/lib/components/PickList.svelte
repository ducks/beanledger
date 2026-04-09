<script lang="ts">
  import type { Order, Product, RoastGroup } from '$lib/types';
  import type { GroupCalc } from '$lib/calc';
  import { formatWeight } from '$lib/calc';

  let {
    orders,
    products,
    groups,
    productionDate,
    units,
    batchesNeeded,
    onClose
  }: {
    orders: Order[];
    products: Product[];
    groups: RoastGroup[];
    productionDate: string;
    units: 'lbs' | 'kg';
    batchesNeeded: Array<RoastGroup & { calc: GroupCalc }>;
    onClose: () => void;
  } = $props();

  let pickSort = $state<{ field: 'product' | 'size'; dir: 'asc' | 'desc' }>({
    field: 'size',
    dir: 'desc'
  });

  const productById = $derived(
    Object.fromEntries(products.map((p) => [p.id, p]))
  );

  const groupById = $derived(
    Object.fromEntries(groups.map((g) => [g.id, g]))
  );

  // Build pick list data structure
  const pickList = $derived.by(() => {
    // By package size (all groups combined)
    const sizeMap = new Map<number, { size: string; qty: number; totalLbs: number }>();

    // By roast group - aggregate orders by product
    const groupMap = new Map<
      string,
      {
        id: string;
        label: string;
        items: {
          productId: string;
          name: string;
          qty: number;
          lbs: number;
          totalLbs: number;
          hasManual: boolean;
          hasImported: boolean;
        }[]
      }
    >();

    for (const order of orders) {
      const product = productById[order.product_id];
      if (!product) continue;

      const group = groupById[product.group_id];
      if (!group) continue;

      // Track by size
      const sizeKey = product.lbs;
      const sizeLabel = product.lbs >= 1 ? `${product.lbs} lb` : `${(product.lbs * 16).toFixed(1)} oz`;

      if (!sizeMap.has(sizeKey)) {
        sizeMap.set(sizeKey, { size: sizeLabel, qty: 0, totalLbs: 0 });
      }
      const sizeEntry = sizeMap.get(sizeKey)!;
      sizeEntry.qty += order.qty;
      sizeEntry.totalLbs += product.lbs * order.qty;

      // Track by group - aggregate by product
      if (!groupMap.has(group.id)) {
        groupMap.set(group.id, { id: group.id, label: group.label, items: [] });
      }
      const groupEntry = groupMap.get(group.id)!;

      // Find or create product entry
      let productEntry = groupEntry.items.find(item => item.productId === product.id);
      const isManual = !order.import_batch_id || order.import_batch_id.trim() === '';

      if (!productEntry) {
        productEntry = {
          productId: product.id,
          name: product.name,
          qty: 0,
          lbs: product.lbs,
          totalLbs: 0,
          hasManual: false,
          hasImported: false
        };
        groupEntry.items.push(productEntry);
      }

      // Aggregate quantities
      productEntry.qty += order.qty;
      productEntry.totalLbs += product.lbs * order.qty;
      if (isManual) {
        productEntry.hasManual = true;
      } else {
        productEntry.hasImported = true;
      }
    }

    // Sort sizes by weight
    const bySizeAll = Array.from(sizeMap.values()).sort((a, b) => {
      const aLbs = parseFloat(a.size);
      const bLbs = parseFloat(b.size);
      return bLbs - aLbs;
    });

    // Sort groups
    const byGroup = Array.from(groupMap.values());

    return { bySizeAll, byGroup };
  });

  const grandTotalLbs = $derived(
    orders.reduce((sum, o) => {
      const p = productById[o.product_id];
      return sum + (p?.lbs || 0) * o.qty;
    }, 0)
  );

  const totalRoasts = $derived(
    batchesNeeded.reduce((sum, g) => sum + g.calc.batchesUp, 0)
  );

  const formatDate = (date: string) => {
    return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  function printPickList() {
    window.print();
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  function toggleSort(field: 'product' | 'size') {
    if (pickSort.field === field) {
      pickSort = { field, dir: pickSort.dir === 'asc' ? 'desc' : 'asc' };
    } else {
      pickSort = { field, dir: 'asc' };
    }
  }
</script>

<div class="modal-backdrop" onclick={handleBackdropClick}>
  <div class="modal print-root">
    <div class="modal-header no-print">
      <div>
        <div class="modal-title">Pick List</div>
        <div class="modal-subtitle">{formatDate(productionDate)}</div>
      </div>
      <div class="header-actions">
        <div class="sort-toggle">
          <button
            class="sort-button"
            class:active={pickSort.field === 'product'}
            onclick={() => toggleSort('product')}
          >
            Product {pickSort.field === 'product' ? (pickSort.dir === 'asc' ? '↑' : '↓') : ''}
          </button>
          <button
            class="sort-button"
            class:active={pickSort.field === 'size'}
            onclick={() => toggleSort('size')}
          >
            Size {pickSort.field === 'size' ? (pickSort.dir === 'asc' ? '↑' : '↓') : ''}
          </button>
        </div>
        <button class="print-button" onclick={printPickList}>Print</button>
        <button class="close-button" onclick={onClose}>×</button>
      </div>
    </div>

    <div class="modal-body">
      <!-- Package Size Summary -->
      <div class="size-summary">
        <div class="section-title">Package Size Summary</div>
        <div class="size-grid">
          {#each pickList.bySizeAll as size}
            <div class="size-card">
              <div class="size-label">{size.size}</div>
              <div class="size-qty">{size.qty}</div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Batches Needed -->
      {#if batchesNeeded.length > 0}
        <div class="batches-section">
          <div class="section-title">Batches to Roast ({totalRoasts} total)</div>
          <div class="batch-list">
            {#each batchesNeeded as group}
              <div class="batch-item">
                <div class="batch-label">{group.label}</div>
                <div class="batch-info">
                  <span class="batch-count">{group.calc.batchesUp}</span>
                  <span class="batch-type">× {group.calc.batchWeight} lb</span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Items by Group -->
      <div class="items-section">
        <div class="section-title">All Items by Roast Group</div>
        {#each pickList.byGroup as group}
          <div class="group-section">
            <div class="group-header">{group.label}</div>
            {#each group.items.sort((a, b) => {
              const dir = pickSort.dir === 'asc' ? 1 : -1;
              return pickSort.field === 'size' ? (a.lbs - b.lbs) * dir : a.name.localeCompare(b.name) * dir;
            }) as item}
              <div class="pick-item">
                <div class="checkbox"></div>
                <div class="item-name">
                  {item.name}
                  {#if item.hasManual && item.hasImported}
                    <span class="manual-badge" title="Contains both manual and imported orders">M+I</span>
                  {:else if item.hasManual}
                    <span class="manual-badge" title="Manually added">M</span>
                  {/if}
                </div>
                <div class="item-qty">×{item.qty}</div>
                <div class="item-weight">{formatWeight(item.totalLbs, units)}</div>
              </div>
            {/each}
            <div class="group-total">
              {formatWeight(
                group.items.reduce((s, i) => s + i.totalLbs, 0),
                units
              )}
            </div>
          </div>
        {/each}

        <div class="footer-summary">
          <span class="footer-info">
            {orders.reduce((s, o) => s + o.qty, 0)} units across {orders.length} products
          </span>
          <div class="total-section">
            <div class="total-label">Total Ordered</div>
            <div class="total-value">{formatWeight(grandTotalLbs, units)}</div>
          </div>
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
    width: 680px;
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

  .modal-subtitle {
    font-size: 10px;
    color: var(--text-muted);
    margin-top: 2px;
  }

  .header-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .sort-toggle {
    display: flex;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid var(--border);
  }

  .sort-button {
    padding: 4px 10px;
    font-size: 10px;
    border: none;
    cursor: pointer;
    background: transparent;
    color: var(--text-muted);
    font-family: var(--font-family);
  }

  .sort-button.active {
    background: var(--accent);
    color: var(--bg);
  }

  .print-button {
    padding: 5px 12px;
    background: none;
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-muted);
    font-size: 11px;
    cursor: pointer;
    font-family: var(--font-family);
  }

  .print-button:hover {
    background: var(--bg-sunken);
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
    display: flex;
    flex-direction: column;
  }

  .size-summary {
    padding: 14px 20px;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
  }

  .section-title {
    font-size: 9px;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 10px;
    font-weight: 700;
  }

  .size-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .size-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 14px;
    background: var(--bg-raised);
    border: 1px solid var(--border);
    border-radius: 6px;
    min-width: 120px;
  }

  .size-label {
    font-size: 9px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .size-qty {
    font-size: 18px;
    color: var(--accent);
    line-height: 1;
    margin-top: 2px;
    font-weight: 700;
  }

  .batches-section {
    padding: 14px 20px;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
  }

  .batch-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .batch-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: var(--bg-raised);
    border: 1px solid var(--border);
    border-radius: 6px;
  }

  .batch-label {
    font-size: 11px;
    color: var(--text);
    font-weight: 700;
  }

  .batch-info {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  .batch-count {
    font-size: 20px;
    color: var(--accent);
    font-weight: 700;
    line-height: 1;
  }

  .batch-type {
    font-size: 10px;
    color: var(--text-muted);
  }

  .items-section {
    padding: 14px 20px;
  }

  .group-section {
    margin-bottom: 16px;
  }

  .group-header {
    font-size: 10px;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--border);
    font-weight: 700;
  }

  .pick-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 5px 0;
    border-bottom: 1px solid var(--border-subtle);
  }

  .checkbox {
    width: 16px;
    height: 16px;
    border: 1px solid var(--text-muted);
    border-radius: 3px;
    flex-shrink: 0;
  }

  .item-name {
    flex: 1;
    font-size: 12px;
    color: var(--text);
  }

  .item-qty {
    font-size: 13px;
    color: var(--accent);
    min-width: 28px;
    text-align: right;
    font-weight: 700;
  }

  .item-weight {
    font-size: 10px;
    color: var(--text-muted);
    min-width: 60px;
    text-align: right;
  }

  .group-total {
    display: flex;
    justify-content: flex-end;
    padding: 4px 0;
    font-size: 10px;
    color: var(--text-muted);
  }

  .footer-summary {
    margin-top: 8px;
    padding-top: 12px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .footer-info {
    font-size: 11px;
    color: var(--text-muted);
  }

  .total-section {
    text-align: right;
  }

  .total-label {
    font-size: 9px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .total-value {
    font-size: 16px;
    color: var(--accent);
    font-weight: 700;
  }

  .manual-badge {
    display: inline-block;
    background: var(--accent);
    color: var(--bg);
    font-size: 8px;
    padding: 2px 5px;
    border-radius: 3px;
    font-weight: 700;
    margin-left: 6px;
    vertical-align: middle;
  }

  @media print {
    @page {
      margin: 0.5in;
    }

    /* Hide everything, then un-hide the printable region via :global */
    :global(body *) {
      visibility: hidden;
    }

    .print-root,
    .print-root * {
      visibility: visible;
    }

    .no-print {
      display: none !important;
    }

    /* Unhook the modal from its fixed overlay positioning so it flows
       as a normal document for printing */
    .modal-backdrop {
      position: static;
      background: none;
      display: block;
    }

    .print-root {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      max-width: none;
      max-height: none;
      background: white;
      color: black;
      border: none;
      box-shadow: none;
      display: block;
    }

    .modal-body {
      overflow: visible;
      display: block;
      padding: 0;
    }

    /* Force light colors for print regardless of theme */
    .print-root .section-title,
    .print-root .group-header {
      color: black;
    }

    .print-root .size-card,
    .print-root .batch-item {
      background: white;
      border-color: #999;
    }

    .print-root .size-label,
    .print-root .batch-type,
    .print-root .item-weight,
    .print-root .group-total,
    .print-root .footer-info,
    .print-root .total-label {
      color: #333;
    }

    .print-root .item-name,
    .print-root .batch-label,
    .print-root .size-qty,
    .print-root .item-qty,
    .print-root .batch-count,
    .print-root .total-value {
      color: black;
    }

    .print-root .group-header {
      border-bottom-color: #333;
      page-break-after: avoid;
    }

    .print-root .pick-item {
      border-bottom-color: #ccc;
      page-break-inside: avoid;
    }

    .print-root .group-section {
      page-break-inside: avoid;
    }

    .print-root .footer-summary {
      border-top-color: #333;
    }

    .print-root .checkbox {
      border-color: #333;
    }

    .print-root .manual-badge {
      background: black;
      color: white;
    }
  }
</style>
