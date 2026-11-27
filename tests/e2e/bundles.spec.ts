import { test, expect, TEST_USER, signupTenant } from './fixtures';
import type { APIRequestContext } from '@playwright/test';

async function setup(api:APIRequestContext) {
  expect((await api.post('/api/auth/login',{data:TEST_USER})).ok()).toBe(true);
  await api.post('/api/batch-overrides',{data:{batch_type:'standard',weight_lbs:20}});
  const products=[];
  for(const name of ['Ethiopia','Colombia','Kenya','Peru']) {
    const group=await (await api.post('/api/groups',{data:{label:name,batch_type:'standard',type:'single_origin',roast_loss_pct:15}})).json();
    const p=await api.post('/api/products',{data:{name:`${name} 100g`,group_id:group.id,lbs:100/453.59237,packaging_mode:'untracked'}});
    expect(p.status()).toBe(201); products.push(await p.json());
  }
  const format=await (await api.post('/api/csv-formats',{data:{name:'Bundles CSV',config:{productNameColumn:'Name',quantityColumn:'Qty',aggregate:true}}})).json();
  const calendar=await (await api.get('/api/bundles')).json();
  return {products,format,calendar};
}

async function create(api:APIRequestContext,name:string,contents_mode='rotating',quantity_mode='bags') {
  const r=await api.post('/api/bundles',{data:{name,contents_mode,quantity_mode}});
  expect(r.status()).toBe(201); return r.json();
}
async function save(api:APIRequestContext,id:string,cycle:string,ids:string[],base:string|null=null) {
  const r=await api.put('/api/bundles',{data:{id,cycle_start:cycle,base_revision_id:base,components:ids.map(product_id=>({product_id,quantity:1}))}});
  expect(r.status(),await r.text()).toBe(200); return r.json();
}

test('bundle imports preserve each subscription, immutable contents, history, tenant ownership and deletion',async({page,baseURL})=>{
  const api=page.request;
  const {products:p,format,calendar}=await setup(api);
  const bundle=await create(api,'Origin subscription');
  const rev=await save(api,bundle.id,calendar.current,p.slice(0,3).map(p=>p.id));
  const input={csvText:'Name,Qty\nOrigin subscription,2\nOrigin subscription,2',productionDate:calendar.current,formatId:format.id};
  const preview=await (await api.post('/api/orders/import',{data:input})).json();
  expect(preview.bundleLines).toHaveLength(2);
  expect(preview.bundleLines[0].source_name).toBe('Origin subscription');
  expect(preview.matches.map((m:{quantity:number})=>m.quantity)).toEqual([1,1,1,1]);
  expect((await api.post('/api/orders/import',{data:{...input,confirm:true}})).status()).toBe(409);
  const imported=await (await api.post('/api/orders/import',{data:{...input,confirm:true,bundlePreviewToken:preview.bundlePreviewToken}})).json();
  expect(imported.created).toBe(4);
  const orders=await (await api.get(`/api/orders?date=${calendar.current}`)).json();
  expect(new Set(orders.map((o:{bundle_line_id:string})=>o.bundle_line_id)).size).toBe(2);
  expect(orders.every((o:{product_id:string})=>[p[0].id,p[1].id].includes(o.product_id))).toBe(true);
  expect((await api.put('/api/orders',{data:{...orders[0],qty:5}})).status()).toBe(409);
  expect((await api.delete(`/api/orders?id=${orders[0].id}`)).status()).toBe(409);
  const replacement=await save(api,bundle.id,calendar.current,[p[3].id,p[1].id,p[2].id],rev.id);
  expect(replacement.id).not.toBe(rev.id);
  expect((await api.post('/api/orders/import',{data:{...input,confirm:true,bundlePreviewToken:preview.bundlePreviewToken}})).status()).toBe(409);
  expect(await (await api.get(`/api/orders?date=${calendar.current}`)).json()).toEqual(orders);
  const history=await (await api.get('/api/bundles')).json();
  expect(history.bundles[0].imported_usage.map((u:{bag_count:number})=>u.bag_count)).toEqual([2,2]);
  expect(history.bundles[0].revisions.find((r:{id:string})=>r.id===rev.id).imported_lines).toBe(2);
  const fresh=await (await api.post('/api/orders/import',{data:input})).json();
  expect(fresh.bundleLines[0].components[0].product_id).toBe(p[3].id);
  const next=await (await api.post('/api/orders/import',{data:{...input,productionDate:calendar.next}})).json();
  expect(next.bundleErrors).toHaveLength(2);
  expect((await api.post('/api/orders/import',{data:{...input,productionDate:calendar.next,confirm:true}})).status()).toBe(400);
  for(const qty of ['4','0','-1','2.5','2bags']) {
    const bad={...input,csvText:`Name,Qty\nOrigin subscription,${qty}\n${p[0].name},1`};
    expect((await (await api.post('/api/orders/import',{data:bad})).json()).bundleErrors).toHaveLength(1);
    expect((await api.post('/api/orders/import',{data:{...bad,confirm:true}})).status()).toBe(400);
  }
  const other=await signupTenant(baseURL!,'otherbundle');
  expect((await (await other.get('/api/bundles')).json()).bundles).toEqual([]);
  expect((await other.put('/api/bundles',{data:{id:bundle.id,active:false}})).status()).toBe(404);
  const otherBundle=await create(other,'Other');
  expect((await other.put('/api/bundles',{data:{id:otherBundle.id,cycle_start:calendar.current,components:[{product_id:p[0].id,quantity:1}]}})).status()).toBe(400);
  expect((await other.delete(`/api/imports?id=${imported.importId}`)).status()).toBe(404);
  await other.dispose();
  expect((await api.delete(`/api/imports?id=${imported.importId}`)).ok()).toBe(true);
  expect(await (await api.get(`/api/orders?date=${calendar.current}`)).json()).toEqual([]);
  expect((await (await api.get('/api/bundles')).json()).bundles[0].revisions.every((r:{imported_lines:number})=>r.imported_lines===0)).toBe(true);
});

test('fixed sample packs multiply components and already-expanded exports skip parents',async({page})=>{
  const api=page.request;
  const {products:p,format,calendar}=await setup(api);
  const bundle=await create(api,'Sampler','fixed','packs');
  await save(api,bundle.id,calendar.current,p.slice(0,3).map(p=>p.id));
  const input={csvText:'Name,Qty\nSampler,2',productionDate:calendar.current,formatId:format.id};
  const preview=await (await api.post('/api/orders/import',{data:input})).json();
  expect(preview.matches.map((m:{quantity:number})=>m.quantity)).toEqual([2,2,2]);
  expect((await api.post('/api/orders/import',{data:{...input,confirm:true,bundlePreviewToken:preview.bundlePreviewToken}})).ok()).toBe(true);
  const expanded={...input,csvText:`Name,Qty\nSampler,2\n${p[0].name},2\n${p[1].name},2\n${p[2].name},2`,bundleHandling:'components'};
  const again=await (await api.post('/api/orders/import',{data:expanded})).json();
  expect(again.bundleLines).toHaveLength(0); expect(again.skippedBundles).toHaveLength(1);
  expect(again.matches.map((m:{quantity:number})=>m.quantity)).toEqual([2,2,2]);
  expect((await api.post('/api/orders/import',{data:{...expanded,confirm:true,bundlePreviewToken:again.bundlePreviewToken}})).ok()).toBe(true);
  const orders=await (await api.get(`/api/orders?date=${calendar.current}`)).json();
  expect(orders.reduce((n:number,o:{qty:number})=>n+o.qty,0)).toBe(12);
});

test('roaster configures current and next lineups and previews bundles through the UI',async({page},testInfo)=>{
  const {products:p,calendar}=await setup(page.request);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button',{name:/Catalog/}).click();
  await page.getByRole('button',{name:'Bundles',exact:true}).click();
  await page.getByLabel('CSV bundle name').fill('Subscription UI');
  await page.getByRole('button',{name:'Create bundle',exact:true}).click();
  for(let i=0;i<3;i++) await page.getByRole('combobox',{name:`Slot ${i+1}`,exact:true}).selectOption(p[i].id);
  await page.getByRole('button',{name:'Save contents',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Contents saved');
  await page.getByRole('button',{name:/^Next ·/}).click();
  await expect(page.getByRole('combobox',{name:'Slot 1',exact:true})).toHaveValue('');
  for(let i=0;i<3;i++) await page.getByRole('combobox',{name:`Slot ${i+1}`,exact:true}).selectOption(p[i+1].id);
  await expect(page.getByText(/Recently selected/).first()).toBeVisible();
  await page.getByRole('button',{name:'Save contents',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Contents saved');
  await page.getByRole('button',{name:/^Current ·/}).click();
  await expect(page.getByRole('combobox',{name:'Slot 1',exact:true})).toHaveValue(p[0].id);
  await page.screenshot({path:testInfo.outputPath('bundle-lineup-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  const catalog = page.locator('.modal').first();
  await expect.poll(()=>catalog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  const box=await catalog.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x+box!.width).toBeLessThanOrEqual(390);
  await page.screenshot({path:testInfo.outputPath('bundle-lineup-mobile.png'),fullPage:true});
  await page.setViewportSize({width:1280,height:900});
  await page.request.post('/api/production-days',{data:{production_date:calendar.current,status:'active'}});
  await page.goto(`/planner?date=${calendar.current}`);
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Format:',{exact:true}).selectOption({label:'Bundles CSV'});
  await page.locator('textarea').fill('Name,Qty\nSubscription UI,3');
  await page.getByRole('button',{name:'Preview Import',exact:true}).click();
  await expect(page.getByText('Bundle expansion — 1 source line(s)')).toBeVisible();
  page.once('dialog',d=>d.accept());
  await page.getByRole('button',{name:'Import 3 Orders',exact:true}).click();
  await page.getByRole('button',{name:/Pick List/}).click();
  const packing=page.getByRole('region',{name:'Bundle packing'});
  await expect(packing).toContainText('Subscription UI');
  await expect(packing).toContainText('3 bags');
  await expect(packing.locator('li')).toHaveCount(3);
  await page.screenshot({path:testInfo.outputPath('bundle-packing.png'),fullPage:true});
});

test('bundle validation prevents stale edits and inactive contents; packaging counts expanded bags once',async({page})=>{
  const api=page.request;
  const {products:p,format,calendar}=await setup(api);
  const bag=await (await api.post('/api/packaging',{data:{label:'Sample bag',size_value:100,size_unit:'g',on_hand_count:100}})).json();
  for(const product of p.slice(0,3)) expect((await api.put('/api/products',{data:{...product,packaging_mode:'tracked',packaging_type_id:bag.id}})).ok()).toBe(true);
  const bundle=await create(api,'Sample box','fixed','packs');
  expect((await api.post('/api/bundles',{data:{name:' sample BOX ',contents_mode:'fixed',quantity_mode:'packs'}})).status()).toBe(409);
  const rev=await save(api,bundle.id,calendar.current,p.slice(0,3).map(p=>p.id));
  expect((await api.put('/api/bundles',{data:{id:bundle.id,components:[{product_id:p[0].id,quantity:1}]}})).status()).toBe(409);
  for(const components of [[],[{product_id:p[0].id,quantity:1},{product_id:p[0].id,quantity:1}],[{product_id:p[0].id,quantity:0}]]) {
    expect((await api.put('/api/bundles',{data:{id:bundle.id,base_revision_id:rev.id,components}})).status()).toBe(400);
  }
  const input={csvText:'Name,Qty\nSample box,2',productionDate:calendar.current,formatId:format.id};
  await api.delete(`/api/products?id=${p[2].id}`);
  expect((await (await api.post('/api/orders/import',{data:input})).json()).bundleErrors).toHaveLength(1);
  expect((await api.put('/api/products',{data:{...p[2],active:true,packaging_mode:'tracked',packaging_type_id:bag.id}})).ok()).toBe(true);
  await api.put('/api/bundles',{data:{id:bundle.id,active:false}});
  expect((await (await api.post('/api/orders/import',{data:input})).json()).bundleErrors).toHaveLength(1);
  await api.put('/api/bundles',{data:{id:bundle.id,active:true}});
  const preview=await (await api.post('/api/orders/import',{data:input})).json();
  expect((await api.post('/api/orders/import',{data:{...input,confirm:true,bundlePreviewToken:preview.bundlePreviewToken}})).ok()).toBe(true);
  await api.post('/api/production-days',{data:{production_date:calendar.current,status:'active'}});
  expect((await (await api.get(`/api/packaging?date=${calendar.current}`)).json()).packaging.find((p:{id:string})=>p.id===bag.id).required_count).toBe(6);
  expect((await api.patch(`/api/production-days/${calendar.current}`,{data:{status:'completed'}})).ok()).toBe(true);
  const completed=await (await api.get(`/api/packaging?date=${calendar.current}`)).json();
  expect(completed.packaging.find((p:{id:string})=>p.id===bag.id)).toMatchObject({filled_count:6,on_hand_count:94});
  const rotation=await create(api,'Rotation');
  expect((await api.put('/api/bundles',{data:{id:rotation.id,cycle_start:'2099-01-01',components:[{product_id:p[0].id,quantity:1}]}})).status()).toBe(400);
  const importData=await (await api.get(`/api/orders?date=${calendar.current}`)).json();
  expect(importData.every((o:{bundle_snapshot:{components:unknown[]}})=>o.bundle_snapshot.components.length===3)).toBe(true);
  expect((await api.delete(`/api/production-days/${calendar.current}`)).ok()).toBe(true);
  expect((await (await api.get('/api/bundles')).json()).bundles.find((b:{id:string})=>b.id===bundle.id).imported_usage).toEqual([]);
});
