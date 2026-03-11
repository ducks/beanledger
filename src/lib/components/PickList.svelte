<script lang="ts">
  import type { Order, Product, RoastGroup } from '$lib/types';
  import { formatWeight } from '$lib/calc';

  let {
    orders,
    products,
    groups,
    productionDate,
    units,
    onClose
  }: {
    orders: Order[];
    products: Product[];
    groups: RoastGroup[];
    productionDate: string;
    units: 'lbs' | 'kg';
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

    // By roast group
    const groupMap = new Map<
      string,
      { id: string; label: string; items: { name: string; qty: number; lbs: number; totalLbs: number }[] }
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

      // Track by group
      if (!groupMap.has(group.id)) {
        groupMap.set(group.id, { id: group.id, label: group.label, items: [] });
      }
      const groupEntry = groupMap.get(group.id)!;
      groupEntry.items.push({
        name: product.name,
        qty: order.qty,
        lbs: product.lbs,
        totalLbs: product.lbs * order.qty
      });
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

  const formatDate = (date: string) => {
    return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  function printPickList() {
    const html = `
<!DOCTYPE html>
<html>
<head>
<title>Pick List — ${formatDate(productionDate)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Roboto Mono', monospace; font-size: 11px; padding: 20px; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .subtitle { font-size: 12px; color: #666; margin-bottom: 20px; }
  .section { margin-bottom: 24px; page-break-inside: avoid; }
  .section-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #b29244; margin-bottom: 12px; font-weight: 700; }
  .size-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; }
  .size-box { border: 1px solid #ddd; padding: 10px; border-radius: 4px; }
  .size-label { font-size: 9px; color: #666; text-transform: uppercase; }
  .size-qty { font-size: 18px; font-weight: 700; margin-top: 2px; }
  .group-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; padding-bottom: 4px; border-bottom: 1px solid #ddd; margin-bottom: 8px; font-weight: 700; }
  .item { display: grid; grid-template-columns: 20px 1fr auto auto; gap: 12px; align-items: center; padding: 6px 0; border-bottom: 1px solid #eee; }
  .checkbox { width: 16px; height: 16px; border: 1px solid #999; border-radius: 3px; }
  .item-name { font-size: 11px; }
  .item-qty { font-size: 12px; font-weight: 700; text-align: right; }
  .item-weight { font-size: 10px; color: #666; text-align: right; min-width: 60px; }
  .group-total { text-align: right; padding: 4px 0; font-size: 10px; color: #666; margin-top: 4px; }
  .footer { margin-top: 20px; padding-top: 12px; border-top: 2px solid #ddd; display: flex; justify-content: space-between; }
  .footer-label { font-size: 10px; color: #666; }
  .footer-value { font-size: 16px; font-weight: 700; }
  @media print {
    @page { margin: 0.5in; }
    body { padding: 0; }
    .section { margin-bottom: 16px; page-break-inside: avoid; }
    .section:first-of-type { margin-bottom: 12px; }
    .section-title { color: #000; }
    .size-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .size-box { border-color: #333; }
    .size-label { color: #000; }
    .subtitle { color: #000; }
    .item { border-bottom-color: #ccc; }
    .item-weight { color: #000; }
    .checkbox { border-color: #333; }
    .footer { border-top-color: #333; margin-top: 12px; }
    .footer-label { color: #000; }
    .group-title { border-bottom-color: #333; page-break-after: avoid; }
    .group-total { color: #000; }
    div[style*="margin-bottom"] { margin-bottom: 12px !important; page-break-inside: avoid; }
  }
</style>
</head>
<body>
<h1>Pick List</h1>
<div class="subtitle">${formatDate(productionDate)}</div>

<div class="section section-summary">
  <div class="section-title">Package Size Summary</div>
  <div class="size-grid">
${pickList.bySizeAll.map((s) => `    <div class="size-box">
      <div class="size-label">${s.size}</div>
      <div class="size-qty">${s.qty}</div>
    </div>`).join('\n')}
  </div>
</div>

<div class="section section-items">
  <div class="section-title">All Items by Roast Group</div>
${pickList.byGroup.map((g) => `  <div class="roast-group" style="margin-bottom: 12px;">
    <div class="group-title">${g.label}</div>
${g.items
  .sort((a, b) => {
    const dir = pickSort.dir === 'asc' ? 1 : -1;
    return pickSort.field === 'size' ? (a.lbs - b.lbs) * dir : a.name.localeCompare(b.name) * dir;
  })
  .map((item) => `    <div class="item">
      <div class="checkbox"></div>
      <div class="item-name">${item.name}</div>
      <div class="item-qty">×${item.qty}</div>
      <div class="item-weight">${formatWeight(item.totalLbs, units)}</div>
    </div>`).join('\n')}
    <div class="group-total">${formatWeight(g.items.reduce((s, i) => s + i.totalLbs, 0), units)}</div>
  </div>`).join('\n')}
</div>

<div class="footer">
  <div>
    <div class="footer-label">${orders.reduce((s, o) => s + o.qty, 0)} units across ${orders.length} products</div>
  </div>
  <div style="text-align: right;">
    <div class="footer-label">Total Ordered</div>
    <div class="footer-value">${formatWeight(grandTotalLbs, units)}</div>
  </div>
</div>
</body>
</html>
`;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => {
      w.focus();
      w.print();
    }, 500);
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
  <div class="modal">
    <div class="modal-header">
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
                <div class="item-name">{item.name}</div>
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
    background: #eae8d8;
    border: 1px solid #c8c4a8;
    border-radius: 8px;
    width: 680px;
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
  }

  .modal-header {
    padding: 14px 20px;
    border-bottom: 1px solid #c8c4a8;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .modal-title {
    font-size: 15px;
    color: #b29244;
    font-weight: 700;
  }

  .modal-subtitle {
    font-size: 10px;
    color: #6b7360;
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
    border: 1px solid #c8c4a8;
  }

  .sort-button {
    padding: 4px 10px;
    font-size: 10px;
    border: none;
    cursor: pointer;
    background: transparent;
    color: #6b7360;
    font-family: var(--font-family);
  }

  .sort-button.active {
    background: #b29244;
    color: #f6f4eb;
  }

  .print-button {
    padding: 5px 12px;
    background: none;
    border: 1px solid #c8c4a8;
    border-radius: 4px;
    color: #6b7360;
    font-size: 11px;
    cursor: pointer;
    font-family: var(--font-family);
  }

  .print-button:hover {
    background: #ddd9c4;
  }

  .close-button {
    background: none;
    border: none;
    color: #6b7360;
    font-size: 20px;
    cursor: pointer;
    line-height: 1;
  }

  .close-button:hover {
    color: #231f20;
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .size-summary {
    padding: 14px 20px;
    border-bottom: 1px solid #c8c4a8;
    background: #f6f4eb;
  }

  .section-title {
    font-size: 9px;
    color: #b29244;
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
    background: #eae8d8;
    border: 1px solid #c8c4a8;
    border-radius: 6px;
    min-width: 120px;
  }

  .size-label {
    font-size: 9px;
    color: #6b7360;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .size-qty {
    font-size: 18px;
    color: #b29244;
    line-height: 1;
    margin-top: 2px;
    font-weight: 700;
  }

  .items-section {
    padding: 14px 20px;
  }

  .group-section {
    margin-bottom: 16px;
  }

  .group-header {
    font-size: 10px;
    color: #b29244;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid #c8c4a8;
    font-weight: 700;
  }

  .pick-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 5px 0;
    border-bottom: 1px solid #d8d4bc;
  }

  .checkbox {
    width: 16px;
    height: 16px;
    border: 1px solid #6b7360;
    border-radius: 3px;
    flex-shrink: 0;
  }

  .item-name {
    flex: 1;
    font-size: 12px;
    color: #231f20;
  }

  .item-qty {
    font-size: 13px;
    color: #b29244;
    min-width: 28px;
    text-align: right;
    font-weight: 700;
  }

  .item-weight {
    font-size: 10px;
    color: #6b7360;
    min-width: 60px;
    text-align: right;
  }

  .group-total {
    display: flex;
    justify-content: flex-end;
    padding: 4px 0;
    font-size: 10px;
    color: #6b7360;
  }

  .footer-summary {
    margin-top: 8px;
    padding-top: 12px;
    border-top: 1px solid #c8c4a8;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .footer-info {
    font-size: 11px;
    color: #6b7360;
  }

  .total-section {
    text-align: right;
  }

  .total-label {
    font-size: 9px;
    color: #6b7360;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .total-value {
    font-size: 16px;
    color: #b29244;
    font-weight: 700;
  }
</style>
