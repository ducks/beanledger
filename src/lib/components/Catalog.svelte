<script lang="ts">
  import type { Product, RoastGroup } from '$lib/types';

  let {
    onClose,
    onUpdate
  }: {
    onClose: () => void;
    onUpdate: () => void;
  } = $props();

  let tab = $state<'products' | 'groups'>('products');
  let products = $state<Product[]>([]);
  let groups = $state<RoastGroup[]>([]);
  let loading = $state(true);

  async function loadData() {
    loading = true;
    try {
      const [productsRes, groupsRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/groups')
      ]);
      products = await productsRes.json();
      groups = await groupsRes.json();
    } catch (err) {
      console.error('Failed to load catalog', err);
    } finally {
      loading = false;
    }
  }

  loadData();

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm('Delete this product?')) return;
    await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
    await loadData();
    onUpdate();
  }

  async function deleteGroup(id: string) {
    if (!confirm('Delete this roast group and all its products?')) return;
    await fetch(`/api/groups?id=${id}`, { method: 'DELETE' });
    await loadData();
    onUpdate();
  }

  async function toggleProductActive(product: Product) {
    await fetch('/api/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...product, active: !product.active })
    });
    await loadData();
    onUpdate();
  }

  async function toggleGroupActive(group: RoastGroup) {
    await fetch('/api/groups', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...group, active: !group.active })
    });
    await loadData();
    onUpdate();
  }
</script>

<div class="modal-backdrop" onclick={handleBackdropClick}>
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title">Catalog Management</div>
      <button class="close-button" onclick={onClose}>×</button>
    </div>

    <div class="tabs">
      <button
        class="tab"
        class:active={tab === 'products'}
        onclick={() => (tab = 'products')}
      >
        Products ({products.length})
      </button>
      <button
        class="tab"
        class:active={tab === 'groups'}
        onclick={() => (tab = 'groups')}
      >
        Roast Groups ({groups.length})
      </button>
    </div>

    <div class="modal-body">
      {#if loading}
        <div class="loading">Loading...</div>
      {:else if tab === 'products'}
        <div class="section-header">
          <div class="section-title">Products</div>
          <a href="/products/new" class="add-button">+ Add Product</a>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Weight</th>
                <th>Roast Group</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each products as product}
                <tr class:inactive={!product.active}>
                  <td>{product.name}</td>
                  <td>{product.lbs} lb</td>
                  <td>{groups.find((g) => g.id === product.group_id)?.label || '—'}</td>
                  <td>
                    <button
                      class="status-toggle"
                      onclick={() => toggleProductActive(product)}
                    >
                      {product.active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>
                    <button class="delete-button" onclick={() => deleteProduct(product.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <div class="section-header">
          <div class="section-title">Roast Groups</div>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Label</th>
                <th>Tag</th>
                <th>Batch Type</th>
                <th>Type</th>
                <th>Loss %</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each groups as group}
                <tr class:inactive={!group.active}>
                  <td>{group.label}</td>
                  <td>{group.tag}</td>
                  <td>{group.batch_type}</td>
                  <td>{group.type.replace('_', ' ')}</td>
                  <td>{group.roast_loss_pct}%</td>
                  <td>
                    <button
                      class="status-toggle"
                      onclick={() => toggleGroupActive(group)}
                    >
                      {group.active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>
                    <button class="delete-button" onclick={() => deleteGroup(group.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
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
    width: 900px;
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

  .tabs {
    display: flex;
    border-bottom: 1px solid #c8c4a8;
  }

  .tab {
    padding: 10px 20px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: #6b7360;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-family);
  }

  .tab.active {
    color: #b29244;
    border-bottom-color: #b29244;
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  .loading {
    text-align: center;
    padding: 40px;
    color: #6b7360;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .section-title {
    font-size: 13px;
    color: #b29244;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .add-button {
    padding: 6px 12px;
    background: #b29244;
    color: #f6f4eb;
    text-decoration: none;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
  }

  .add-button:hover {
    background: #9d7d37;
  }

  .table-container {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }

  th {
    background: #f6f4eb;
    padding: 10px;
    text-align: left;
    border-bottom: 2px solid #c8c4a8;
    font-weight: 600;
    color: #231f20;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.05em;
  }

  td {
    padding: 10px;
    border-bottom: 1px solid #d8d4bc;
    color: #231f20;
  }

  tr.inactive {
    opacity: 0.5;
  }

  tr:hover {
    background: #f6f4eb;
  }

  .status-toggle {
    padding: 4px 10px;
    background: #b29244;
    border: none;
    border-radius: 3px;
    color: #f6f4eb;
    font-size: 10px;
    cursor: pointer;
    font-family: var(--font-family);
  }

  .status-toggle:hover {
    background: #9d7d37;
  }

  .delete-button {
    padding: 4px 10px;
    background: none;
    border: 1px solid #b75742;
    border-radius: 3px;
    color: #b75742;
    font-size: 10px;
    cursor: pointer;
    font-family: var(--font-family);
  }

  .delete-button:hover {
    background: #b75742;
    color: #f6f4eb;
  }
</style>
