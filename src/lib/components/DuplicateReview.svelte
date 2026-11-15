<script lang="ts">
  import type { Product } from '$lib/types';
  import { duplicateProductNames, nearbyProductWeights } from '$lib/catalog-duplicates';
  let {products, onEdit, onArchive}: {products:Product[]; onEdit:(p:Product)=>void; onArchive:(id:string)=>void} = $props();
  const names = $derived(duplicateProductNames(products));
  const sizes = $derived(nearbyProductWeights(products));
</script>
<section aria-label="Duplicate review">
  <h3>Matching product names</h3>
  <p>Names are compared without case or extra spaces. Review the coffee, weight, and packaging before choosing which record to keep. Archived products are included.</p>
  {#if !names.length}<p>No matching product names found.</p>{/if}
  {#each names as group}
    <div class="candidate">
      {#each group as product}
        <div class="product"><span><strong>{product.name}</strong> · {(product.lbs*453.59237).toFixed(3)} g · {product.active ? 'Active' : 'Archived'}<br/>{product.packaging_label ?? (product.packaging_mode === 'untracked' ? 'Untracked / bulk' : 'Legacy weight matching')}</span>
          <button onclick={() => onEdit(product)}>Review / edit</button>
          {#if product.active}<button onclick={() => onArchive(product.id)}>Archive {product.name}</button>{/if}
        </div>
      {/each}
    </div>
  {/each}
  <h3>Nearby coffee weights</h3>
  <p>Distinct weights within 2 g may be rounding differences or intentional. Different coffees sharing a size are not duplicate products. Confirm the intended weight with the roaster before editing; weight edits can affect historical coffee calculations.</p>
  {#if !sizes.length}<p>No nearby weight differences found.</p>{/if}
  {#each sizes as pair}
    <details class="candidate"><summary>{(pair.lower*453.59237).toFixed(6)} g / {(pair.upper*453.59237).toFixed(6)} g · {pair.products.length} products</summary>
      {#each pair.products as product}<div class="product"><span>{product.name} · {product.lbs} lb · {product.active ? 'Active' : 'Archived'}</span><button onclick={() => onEdit(product)}>Review / edit</button></div>{/each}
    </details>
  {/each}
  <p>Nothing is merged automatically. Archiving keeps existing orders and reports; it does not redirect imports or move aliases. Product merging and historical weight normalization need a separate reviewed operation.</p>
</section>
<style>
  p { line-height:1.5; } .candidate { border:1px solid var(--border,#888); padding:12px; margin:12px 0; } .product { display:flex; align-items:center; flex-wrap:wrap; gap:12px; padding:10px 0; } .product span { flex:1; min-width:180px; } button { font:inherit; padding:8px; cursor:pointer; } summary { cursor:pointer; }
</style>
