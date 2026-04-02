<script lang="ts">
  import type { Product, RoastGroup, GroupType, BatchOverride, ImportAlias } from '$lib/types';

  let {
    onClose,
    onUpdate
  }: {
    onClose: () => void;
    onUpdate: () => void;
  } = $props();

  let tab = $state<'products' | 'groups' | 'aliases'>('products');
  let products = $state<Product[]>([]);
  let groups = $state<RoastGroup[]>([]);
  let batchTypes = $state<BatchOverride[]>([]);
  let aliases = $state<ImportAlias[]>([]);
  let loading = $state(true);
  let showGroupForm = $state(false);
  let editingGroup = $state<RoastGroup | null>(null);
  let productSearch = $state('');
  let groupSearch = $state('');
  let aliasSearch = $state('');

  // Roast group form state
  let formId = $state('');
  let formLabel = $state('');
  let formBatchType = $state('');
  let formRoastLossPct = $state(0);
  let formType = $state<GroupType>('blend');

  // Alias form state
  let showAliasForm = $state(false);
  let editingAlias = $state<ImportAlias | null>(null);
  let aliasFormName = $state('');
  let aliasFormProductId = $state('');

  // Product form state
  let showProductForm = $state(false);
  let editingProduct = $state<Product | null>(null);
  let productFormId = $state('');
  let productFormName = $state('');
  let productFormLbs = $state(0);
  let productFormGroupId = $state('');

  // Filtered lists based on search
  const filteredProducts = $derived(
    productSearch.trim()
      ? products.filter(p => {
          const query = productSearch.toLowerCase();
          const groupName = groups.find(g => g.id === p.group_id)?.label.toLowerCase() || '';
          return (
            p.name.toLowerCase().includes(query) ||
            p.id.toLowerCase().includes(query) ||
            groupName.includes(query) ||
            p.lbs.toString().includes(query)
          );
        })
      : products
  );

  const filteredAliases = $derived(
    aliasSearch.trim()
      ? aliases.filter(a => {
          const query = aliasSearch.toLowerCase();
          const productName = products.find(p => p.id === a.product_id)?.name.toLowerCase() || '';
          return (
            a.alias_name.toLowerCase().includes(query) ||
            productName.includes(query)
          );
        })
      : aliases
  );

  const filteredGroups = $derived(
    groupSearch.trim()
      ? groups.filter(g => {
          const query = groupSearch.toLowerCase();
          return (
            g.label.toLowerCase().includes(query) ||
            g.id.toLowerCase().includes(query) ||
            g.batch_type.toLowerCase().includes(query) ||
            g.type.toLowerCase().includes(query)
          );
        })
      : groups
  );

  async function loadData() {
    loading = true;
    try {
      const [productsRes, groupsRes, batchTypesRes, aliasesRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/groups'),
        fetch('/api/batch-overrides'),
        fetch('/api/aliases')
      ]);
      products = await productsRes.json();
      groups = await groupsRes.json();
      batchTypes = await batchTypesRes.json();
      aliases = await aliasesRes.json();

      // Set first batch type as default if available
      if (batchTypes.length > 0 && !formBatchType) {
        formBatchType = batchTypes[0].batch_type;
      }
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

    try {
      const res = await fetch(`/api/groups?id=${id}`, { method: 'DELETE' });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to delete group');
        return;
      }

      await loadData();
      onUpdate();
    } catch (err) {
      console.error('Failed to delete group:', err);
      alert('Network error while deleting group');
    }
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

  function openCreateGroupForm() {
    editingGroup = null;
    formId = '';
    formLabel = '';
    formBatchType = 'standard';
    formRoastLossPct = 0;
    formType = 'blend';
    showGroupForm = true;
  }

  function openEditGroupForm(group: RoastGroup) {
    editingGroup = group;
    formId = group.id;
    formLabel = group.label;
    formBatchType = group.batch_type;
    formRoastLossPct = group.roast_loss_pct;
    formType = group.type;
    showGroupForm = true;
  }

  function closeGroupForm() {
    showGroupForm = false;
    editingGroup = null;
  }

  async function saveGroup() {
    const groupData = {
      id: formId,
      label: formLabel,
      batch_type: formBatchType,
      roast_loss_pct: formRoastLossPct,
      type: formType,
      components: [],
      active: true,
      created_at: new Date().toISOString().slice(0, 10)
    };

    const method = editingGroup ? 'PUT' : 'POST';
    await fetch('/api/groups', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(groupData)
    });

    await loadData();
    onUpdate();
    closeGroupForm();
  }

  function openEditProductForm(product: Product) {
    editingProduct = product;
    productFormId = product.id;
    productFormName = product.name;
    productFormLbs = product.lbs;
    productFormGroupId = product.group_id;
    showProductForm = true;
  }

  function closeProductForm() {
    showProductForm = false;
    editingProduct = null;
  }

  async function saveProduct() {
    const productData = {
      id: productFormId,
      name: productFormName,
      lbs: productFormLbs,
      group_id: productFormGroupId,
      active: editingProduct?.active ?? true,
      created_at: editingProduct?.created_at ?? new Date().toISOString().slice(0, 10)
    };

    await fetch('/api/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });

    await loadData();
    onUpdate();
    closeProductForm();
  }
  // Alias CRUD
  function openCreateAliasForm() {
    editingAlias = null;
    aliasFormName = '';
    aliasFormProductId = '';
    showAliasForm = true;
  }

  function openEditAliasForm(alias: ImportAlias) {
    editingAlias = alias;
    aliasFormName = alias.alias_name;
    aliasFormProductId = alias.product_id;
    showAliasForm = true;
  }

  function closeAliasForm() {
    showAliasForm = false;
    editingAlias = null;
  }

  async function saveAlias() {
    const aliasData = {
      id: editingAlias?.id ?? `alias_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      alias_name: aliasFormName,
      product_id: aliasFormProductId,
      active: editingAlias?.active ?? true
    };

    const method = editingAlias ? 'PUT' : 'POST';
    await fetch('/api/aliases', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(aliasData)
    });

    await loadData();
    onUpdate();
    closeAliasForm();
  }

  async function deleteAlias(id: string) {
    if (!confirm('Delete this alias?')) return;
    await fetch(`/api/aliases?id=${id}`, { method: 'DELETE' });
    await loadData();
    onUpdate();
  }

  async function toggleAliasActive(alias: ImportAlias) {
    await fetch('/api/aliases', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...alias, active: !alias.active })
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
      <button
        class="tab"
        class:active={tab === 'aliases'}
        onclick={() => (tab = 'aliases')}
      >
        Aliases ({aliases.length})
      </button>
    </div>

    <div class="modal-body">
      {#if loading}
        <div class="loading">Loading...</div>
      {:else if tab === 'products'}
        <div class="section-header">
          <div class="section-title">Products</div>
          <input
            type="text"
            class="search-input"
            placeholder="Search products..."
            bind:value={productSearch}
          />
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
              {#each filteredProducts as product}
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
                    <div class="action-buttons">
                      <button class="edit-button" onclick={() => openEditProductForm(product)}>
                        Edit
                      </button>
                      <button class="delete-button" onclick={() => deleteProduct(product.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else if tab === 'groups'}
        <div class="section-header">
          <div class="section-title">Roast Groups</div>
          <input
            type="text"
            class="search-input"
            placeholder="Search groups..."
            bind:value={groupSearch}
          />
          <button class="add-button" onclick={openCreateGroupForm}>+ Add Roast Group</button>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Label</th>
                <th>Batch Type</th>
                <th>Type</th>
                <th>Loss %</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredGroups as group}
                <tr class:inactive={!group.active}>
                  <td>{group.id}</td>
                  <td>{group.label}</td>
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
                    <div class="action-buttons">
                      <button class="edit-button" onclick={() => openEditGroupForm(group)}>
                        Edit
                      </button>
                      <button class="delete-button" onclick={() => deleteGroup(group.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else if tab === 'aliases'}
        <div class="section-header">
          <div class="section-title">Import Aliases</div>
          <input
            type="text"
            class="search-input"
            placeholder="Search aliases..."
            bind:value={aliasSearch}
          />
          <button class="add-button" onclick={openCreateAliasForm}>+ Add Alias</button>
        </div>
        <p class="aliases-description">
          Map CSV product names to existing products. Useful for rotating subscriptions
          where the same name (e.g., "Single Origin Subscription") should resolve to a
          different product each week.
        </p>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>CSV Name</th>
                <th>Maps To</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredAliases as alias}
                <tr class:inactive={!alias.active}>
                  <td>{alias.alias_name}</td>
                  <td>{products.find(p => p.id === alias.product_id)?.name || '—'}</td>
                  <td>
                    <button
                      class="status-toggle"
                      onclick={() => toggleAliasActive(alias)}
                    >
                      {alias.active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>
                    <div class="action-buttons">
                      <button class="edit-button" onclick={() => openEditAliasForm(alias)}>
                        Edit
                      </button>
                      <button class="delete-button" onclick={() => deleteAlias(alias.id)}>
                        Delete
                      </button>
                    </div>
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

{#if showAliasForm}
  <div class="form-backdrop" onclick={(e) => e.target === e.currentTarget && closeAliasForm()}>
    <div class="form-modal">
      <div class="form-header">
        <div class="form-title">{editingAlias ? 'Edit' : 'Create'} Import Alias</div>
        <button class="close-button" onclick={closeAliasForm}>&times;</button>
      </div>

      <div class="form-body">
        <div class="form-group">
          <label>CSV Product Name</label>
          <input
            type="text"
            bind:value={aliasFormName}
            placeholder="e.g., Single Origin Subscription"
          />
        </div>

        <div class="form-group">
          <label>Maps To Product</label>
          <select bind:value={aliasFormProductId}>
            <option value="">Select a product</option>
            {#each products.filter(p => p.active) as product}
              <option value={product.id}>
                {product.name} ({groups.find(g => g.id === product.group_id)?.label || '—'})
              </option>
            {/each}
          </select>
        </div>
      </div>

      <div class="form-footer">
        <button class="cancel-button" onclick={closeAliasForm}>Cancel</button>
        <button class="save-button" onclick={saveAlias} disabled={!aliasFormName || !aliasFormProductId}>
          {editingAlias ? 'Update' : 'Create'}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if showGroupForm}
  <div class="form-backdrop" onclick={(e) => e.target === e.currentTarget && closeGroupForm()}>
    <div class="form-modal">
      <div class="form-header">
        <div class="form-title">{editingGroup ? 'Edit' : 'Create'} Roast Group</div>
        <button class="close-button" onclick={closeGroupForm}>×</button>
      </div>

      <div class="form-body">
        <div class="form-group">
          <label>ID</label>
          <input
            type="text"
            bind:value={formId}
            placeholder="e.g., french, dark, decaf"
            disabled={!!editingGroup}
          />
        </div>

        <div class="form-group">
          <label>Label</label>
          <input
            type="text"
            bind:value={formLabel}
            placeholder="e.g., French Roast, Dark Roast"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Batch Type</label>
            <select bind:value={formBatchType}>
              {#each batchTypes as batchType}
                <option value={batchType.batch_type}>
                  {batchType.batch_type} ({batchType.weight_lbs} lb)
                </option>
              {/each}
            </select>
          </div>

          <div class="form-group">
            <label>Type</label>
            <select bind:value={formType}>
              <option value="blend">Blend</option>
              <option value="single_origin">Single Origin</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Roast Loss %</label>
          <input
            type="number"
            bind:value={formRoastLossPct}
            step="0.1"
            min="0"
            max="100"
            placeholder="e.g., 15"
          />
        </div>
      </div>

      <div class="form-footer">
        <button class="cancel-button" onclick={closeGroupForm}>Cancel</button>
        <button class="save-button" onclick={saveGroup}>
          {editingGroup ? 'Update' : 'Create'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Product Edit Form Modal -->
{#if showProductForm}
  <div class="form-backdrop" onclick={(e) => e.target === e.currentTarget && closeProductForm()}>
    <div class="form-modal">
      <div class="form-header">
        <div class="form-title">Edit Product</div>
        <button class="close-button" onclick={closeProductForm}>×</button>
      </div>

      <div class="form-body">
        <div class="form-group">
          <label>ID</label>
          <input
            type="text"
            bind:value={productFormId}
            disabled={true}
          />
        </div>

        <div class="form-group">
          <label>Name</label>
          <input
            type="text"
            bind:value={productFormName}
            placeholder="e.g., Woodlawn Blend - 10oz"
          />
        </div>

        <div class="form-group">
          <label>Weight (lbs)</label>
          <input
            type="number"
            bind:value={productFormLbs}
            step="0.01"
            min="0"
            placeholder="e.g., 0.625"
          />
        </div>

        <div class="form-group">
          <label>Roast Group</label>
          <select bind:value={productFormGroupId}>
            <option value="">Select a roast group</option>
            {#each groups as group}
              <option value={group.id}>{group.label}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="form-footer">
        <button class="cancel-button" onclick={closeProductForm}>Cancel</button>
        <button class="save-button" onclick={saveProduct}>Update</button>
      </div>
    </div>
  </div>
{/if}

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
    gap: 12px;
    margin-bottom: 16px;
  }

  .section-title {
    font-size: 13px;
    color: #b29244;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .search-input {
    flex: 1;
    padding: 6px 12px;
    background: #f6f4eb;
    border: 1px solid #c8c4a8;
    border-radius: 4px;
    color: #231f20;
    font-family: var(--font-family);
    font-size: 12px;
  }

  .search-input::placeholder {
    color: #6b7360;
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

  .aliases-description {
    font-size: 11px;
    color: #6b7360;
    margin: -8px 0 16px 0;
    line-height: 1.5;
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

  .action-buttons {
    display: flex;
    gap: 6px;
  }

  .edit-button {
    padding: 4px 10px;
    background: none;
    border: 1px solid #b29244;
    border-radius: 3px;
    color: #b29244;
    font-size: 10px;
    cursor: pointer;
    font-family: var(--font-family);
  }

  .edit-button:hover {
    background: #b29244;
    color: #f6f4eb;
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

  /* Form Modal Styles */
  .form-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
  }

  .form-modal {
    background: #eae8d8;
    border: 1px solid #c8c4a8;
    border-radius: 8px;
    width: 500px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
  }

  .form-header {
    padding: 14px 20px;
    border-bottom: 1px solid #c8c4a8;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .form-title {
    font-size: 15px;
    color: #b29244;
    font-weight: 700;
  }

  .form-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .form-group label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: #231f20;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 6px;
  }

  .form-group input,
  .form-group select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #c8c4a8;
    border-radius: 4px;
    background: #f6f4eb;
    color: #231f20;
    font-family: var(--font-family);
    font-size: 13px;
  }

  .form-group input:disabled {
    background: #ddd9c4;
    color: #6b7360;
    cursor: not-allowed;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .form-footer {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    padding: 16px 20px;
    border-top: 1px solid #c8c4a8;
  }

  .save-button {
    padding: 8px 16px;
    background: #b29244;
    border: none;
    border-radius: 4px;
    color: #f6f4eb;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-family);
  }

  .save-button:hover {
    background: #9d7d37;
  }

  .cancel-button {
    padding: 8px 16px;
    background: none;
    border: 1px solid #c8c4a8;
    border-radius: 4px;
    color: #6b7360;
    font-size: 12px;
    cursor: pointer;
    font-family: var(--font-family);
  }

  .cancel-button:hover {
    background: #ddd9c4;
  }
</style>
