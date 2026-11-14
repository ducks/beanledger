import { test, expect, TEST_USER, signupTenant } from './fixtures';

test('explicit assignments count physical bags independently of weight and preserve completed usage', async ({ page, baseURL }) => {
  const api = page.request;
  await api.post('/api/auth/login', {data:TEST_USER});
  await api.post('/api/batch-overrides', {data:{batch_type:'standard',weight_lbs:20}});
  const group = await (await api.post('/api/groups', {data:{label:'Synthetic coffee',batch_type:'standard',roast_loss_pct:15,type:'single_origin'}})).json();
  const bag = await (await api.post('/api/packaging', {data:{label:'Shared bag',size_value:10.9,size_unit:'oz',on_hand_count:100}})).json();
  const otherBag = await (await api.post('/api/packaging', {data:{label:'Other bag',size_value:12,size_unit:'oz',on_hand_count:100}})).json();
  const products = [];
  for (const [i, lbs] of [.68,.68125,.683433].entries()) {
    const res = await api.post('/api/products', {data:{name:`Coffee ${i}`,lbs,group_id:group.id,packaging_mode:'tracked',packaging_type_id:bag.id}});
    expect(res.status()).toBe(201); products.push(await res.json());
  }
  const bulk = await (await api.post('/api/products', {data:{name:'Bulk',lbs:.68125,group_id:group.id,packaging_mode:'untracked'}})).json();
  const legacy = await (await api.post('/api/products', {data:{name:'Legacy',lbs:.68125,group_id:group.id}})).json();
  expect(legacy.packaging_mode).toBe('legacy');
  // Older update clients must not erase an explicit assignment.
  expect((await api.put('/api/products', {data:{id:products[0].id,name:products[0].name,lbs:.68,group_id:group.id}})).status()).toBe(200);
  const date = '2026-11-01';
  await api.post('/api/production-days', {data:{production_date:date,status:'active'}});
  for (const p of [...products,bulk,legacy]) expect((await api.post('/api/orders',{data:{product_id:p.id,qty:2,production_date:date}})).status()).toBe(201);
  const projection = await (await api.get(`/api/packaging?date=${date}`)).json();
  expect(projection.packaging.find((p:any)=>p.id===bag.id).required_count).toBe(8);
  expect(projection.untracked).toEqual([]);

  // Cross-tenant, nonexistent, malformed, and inactive choices all fail cleanly.
  const other = await signupTenant(baseURL!, 'packaging-other');
  const foreign = await (await other.post('/api/packaging',{data:{label:'Private bag',size_value:250,size_unit:'g',on_hand_count:1}})).json();
  for (const id of [foreign.id,'00000000-0000-4000-8000-000000000000','bad-id']) {
    const res = await api.put('/api/products',{data:{...products[0],packaging_type_id:id}});
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({error:'Choose an available packaging type'});
  }
  await other.dispose();
  expect((await api.patch(`/api/production-days/${date}`,{data:{status:'completed'}})).status()).toBe(200);
  const before = await (await api.get(`/api/packaging?date=${date}`)).json();
  expect(before.packaging.find((p:any)=>p.id===bag.id)).toMatchObject({filled_count:8,on_hand_count:92,projected_remaining:92});
  expect((await api.put('/api/products',{data:{...products[0],packaging_type_id:otherBag.id}})).status()).toBe(200);
  expect(await (await api.get(`/api/packaging?date=${date}`)).json()).toEqual(before);
  const range = await (await api.get(`/api/packaging?dateFrom=${date}&dateTo=${date}`)).json();
  expect(range.packaging.find((p:any)=>p.id===bag.id)).toMatchObject({filled_count:8,required_count:8});
  expect((await api.patch(`/api/production-days/${date}`,{data:{status:'completed'}})).status()).toBe(200);
  expect((await api.patch(`/api/production-days/${date}`,{data:{status:'active'}})).status()).toBe(200);
  const reopened = await (await api.get(`/api/packaging?date=${date}`)).json();
  expect(reopened.packaging.find((p:any)=>p.id===bag.id)).toMatchObject({on_hand_count:100,required_count:6});
  expect(reopened.packaging.find((p:any)=>p.id===otherBag.id).required_count).toBe(2);
  await api.delete(`/api/packaging?id=${otherBag.id}`);
  expect((await api.patch(`/api/production-days/${date}`,{data:{status:'completed'}})).status()).toBe(400);
  expect((await api.put('/api/products',{data:{...products[0],packaging_type_id:otherBag.id}})).status()).toBe(400);
  const unchanged = await (await api.get('/api/packaging')).json();
  expect(unchanged.packaging.find((p:any)=>p.id===bag.id).on_hand_count).toBe(100);
});

test('product creation requires an explicit UI choice and catalog displays it', async ({ page }) => {
  const api = page.request;
  await api.post('/api/auth/login', {data:TEST_USER});
  await api.post('/api/batch-overrides', {data:{batch_type:'standard',weight_lbs:20}});
  const group = await (await api.post('/api/groups', {data:{label:'UI coffee',batch_type:'standard',roast_loss_pct:15,type:'single_origin'}})).json();
  const bag = await (await api.post('/api/packaging',{data:{label:'Chosen bag',size_value:309,size_unit:'g',on_hand_count:100}})).json();
  await page.goto('/products/new');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Product Name', {exact:true}).fill('UI assigned coffee');
  await page.getByLabel('Weight', {exact:false}).fill('0.68');
  await page.getByLabel('Roast Group', {exact:true}).selectOption(group.id);
  await expect(page.getByRole('button',{name:'Create Product',exact:true})).toBeDisabled();
  await page.getByLabel('Packaging',{exact:true}).selectOption(bag.id);
  await page.getByRole('button',{name:'Create Product',exact:true}).click();
  await expect(page.getByText('Product created successfully! Redirecting...')).toBeVisible();
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button',{name:/Catalog/}).click();
  const row = page.getByRole('row').filter({hasText:'UI assigned coffee'});
  await expect(row).toContainText('Chosen bag');
  await row.getByRole('button',{name:'Edit',exact:true}).click();
  await page.getByLabel('Packaging',{exact:true}).selectOption('untracked');
  await page.getByRole('button',{name:'Update',exact:true}).click();
  await expect(row).toContainText('Untracked / bulk');
});

test('unmatched CSV creation confirms packaging and import consumes the selected bag', async ({ page }) => {
  const api = page.request;
  await api.post('/api/auth/login', {data:TEST_USER});
  await api.post('/api/batch-overrides', {data:{batch_type:'standard',weight_lbs:20}});
  await api.post('/api/groups', {data:{label:'CSV coffee',batch_type:'standard',roast_loss_pct:15,type:'single_origin'}});
  const bag = await (await api.post('/api/packaging',{data:{label:'CSV bag',size_value:310,size_unit:'g',on_hand_count:100}})).json();
  const format = await (await api.post('/api/csv-formats',{data:{name:'Synthetic CSV',config:{productNameColumn:'name',quantityColumn:'qty'}}})).json();
  const date = '2026-11-02';
  await api.post('/api/production-days',{data:{production_date:date,status:'active'}});
  await page.goto(`/planner?date=${date}`);
  await page.waitForLoadState('networkidle');
  await page.locator('textarea').fill('name,qty\nCSV coffee - 10.9oz,3');
  await page.getByRole('button',{name:'Preview Import',exact:true}).click();
  await page.getByRole('button',{name:'Add Product',exact:true}).click();
  await expect(page.getByRole('button',{name:'Create Product',exact:true})).toBeDisabled();
  await page.getByLabel('Packaging',{exact:true}).selectOption(bag.id);
  await page.getByRole('button',{name:'Create Product',exact:true}).click();
  await expect(page.getByRole('button',{name:'Create Product',exact:true})).toHaveCount(0);
  const list = await (await api.get('/api/products')).json();
  expect(list[0]).toMatchObject({packaging_mode:'tracked',packaging_type_id:bag.id,lbs:.68125});
  expect((await api.post('/api/orders/import',{data:{csvText:'name,qty\nCSV coffee - 10.9oz,3',formatId:format.id,productionDate:date,confirm:true}})).status()).toBe(200);
  const projection = await (await api.get(`/api/packaging?date=${date}`)).json();
  expect(projection.packaging[0].required_count).toBe(3);
});
