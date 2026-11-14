import { test, expect, TEST_USER } from './fixtures';

// Only account creation uses the shared fixture. Business setup and the main
// journey use the browser; API reads independently verify persisted results.
test('roaster journey: catalog → custom CSV → roast → inventory → archive', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  page.setDefaultTimeout(10_000);
  let date = ''; // Read the date chosen by the dashboard; do not race midnight.
  const csv = 'Coffee,Units\nWorkflow House - 10.9oz,4\nWorkflow Decaf - 10.9oz,3';
  const upload = {name:'wholesale.csv',mimeType:'text/csv',buffer:Buffer.from(csv)};
  const screenshot = async (name: string) => {
    const path = testInfo.outputPath(`${name}.png`);
    await page.screenshot({path, fullPage:true});
    await testInfo.attach(name, {path, contentType:'image/png'});
  };
  const closeModal = async () => { await page.locator('.modal .close-button').click(); };
  let plannerUrl = '';

  await test.step('Sign in and configure a roasting batch', async () => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Username',{exact:true}).fill(TEST_USER.username);
    await page.getByLabel('Password',{exact:true}).fill(TEST_USER.password);
    await page.getByRole('button',{name:'Log in',exact:true}).click();
    await expect(page.getByRole('button',{name:/Start New Roast Day/})).toBeVisible();
    await page.getByRole('button',{name:/Settings/}).click();
    await page.getByPlaceholder('New batch type (e.g., light)').fill('standard');
    await page.getByPlaceholder('Weight',{exact:true}).fill('20');
    await page.getByRole('button',{name:'Add',exact:true}).click();
    await expect(page.locator('.modal')).toContainText('standard');
    await page.getByRole('button',{name:'Save',exact:true}).click();
  });

  await test.step('Create physical bag inventory and a roast group', async () => {
    await page.getByRole('button',{name:/Packaging/}).click();
    await page.getByLabel('Bag type',{exact:true}).fill('Workflow shared bag');
    await page.getByLabel('Capacity (oz)',{exact:true}).fill('10.9');
    await page.getByLabel('Count on hand',{exact:true}).fill('100');
    await page.getByRole('button',{name:'Add bag type'}).click();
    await expect(page.getByRole('row').filter({hasText:'Workflow shared bag'})).toBeVisible();
    await closeModal();
    await page.getByRole('button',{name:/Catalog/}).click();
    await page.getByRole('button',{name:/^Roast Groups/}).click();
    await page.getByRole('button',{name:'+ Add Roast Group',exact:true}).click();
    await page.getByPlaceholder('e.g., french, dark, decaf').fill('workflow');
    await page.getByPlaceholder('e.g., French Roast, Dark Roast').fill('Workflow Coffee');
    await page.getByPlaceholder('e.g., 15',{exact:true}).fill('15');
    await page.locator('.form-modal').getByRole('button',{name:'Create',exact:true}).click();
    await expect(page.getByRole('row').filter({hasText:'Workflow Coffee'})).toBeVisible();
    await closeModal();
  });

  await test.step('Create a product and explicitly assign its bag', async () => {
    await page.goto('/products/new');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Product Name',{exact:true}).fill('Workflow House - 10.9oz');
    await page.getByLabel('Weight',{exact:false}).fill('0.68');
    await page.getByLabel('Roast Group',{exact:true}).selectOption({label:'Workflow Coffee'});
    await expect(page.getByRole('button',{name:'Create Product',exact:true})).toBeDisabled();
    await page.getByLabel('Packaging',{exact:true}).selectOption({label:'Workflow shared bag'});
    await screenshot('01-product-packaging-choice');
    await page.getByRole('button',{name:'Create Product',exact:true}).click();
    await expect(page.getByText('Product created successfully! Redirecting...')).toBeVisible();
    await expect(page).toHaveURL('/');
  });

  await test.step('Map a custom wholesale CSV format', async () => {
    await page.getByRole('button',{name:/Catalog/}).click();
    await page.getByRole('button',{name:/^CSV Formats/}).click();
    await page.getByRole('button',{name:'+ Add Format',exact:true}).click();
    await page.getByLabel('Format Name',{exact:true}).fill('Workflow wholesale');
    await page.locator('input[type=file]').setInputFiles(upload);
    await page.getByLabel('Column',{exact:true}).selectOption('coffee');
    await page.getByLabel('Quantity Column',{exact:true}).selectOption('units');
    await page.getByRole('button',{name:'Create',exact:true}).click();
    await expect(page.getByRole('row').filter({hasText:'Workflow wholesale'})).toBeVisible();
    await closeModal();
  });

  await test.step('Start a roast day and resolve the unmatched imported product', async () => {
    await page.getByRole('button',{name:/Start New Roast Day/}).click();
    await expect(page).toHaveURL(/\/planner\?date=\d{4}-\d{2}-\d{2}/);
    date = new URL(page.url()).searchParams.get('date')!;
    plannerUrl = page.url();
    await page.locator('input[type=file]').setInputFiles(upload);
    await page.getByRole('button',{name:'Preview Import',exact:true}).click();
    await page.getByRole('button',{name:'Add Product',exact:true}).click();
    await expect(page.getByRole('button',{name:'Create Product',exact:true})).toBeDisabled();
    await page.getByLabel('Packaging',{exact:true}).selectOption({label:'Workflow shared bag'});
    await screenshot('02-unmatched-product-review');
    await page.getByRole('button',{name:'Create Product',exact:true}).click();
    await expect(page.getByRole('button',{name:'Import 2 Orders',exact:true})).toBeEnabled();
    await page.getByRole('button',{name:'Import 2 Orders',exact:true}).click();
    await expect.poll(async () => (await (await page.request.get(`/api/orders?date=${date}`)).json()).length).toBe(2);
    const orders = await (await page.request.get(`/api/orders?date=${date}`)).json();
    expect(orders.map((o:{qty:number})=>o.qty).sort()).toEqual([3,4]);
  });

  await test.step('Review roast requirements and seven bags of projected consumption', async () => {
    await expect(page.locator('.group-card').filter({hasText:'Workflow Coffee'})).toBeVisible();
    await screenshot('03-roast-plan');
    await page.getByRole('button',{name:/Packaging/}).click();
    const row = page.getByRole('row').filter({hasText:'Workflow shared bag'});
    await expect(row).toContainText('93');
    const projected = await (await page.request.get(`/api/packaging?date=${date}`)).json();
    expect(projected.packaging[0]).toMatchObject({required_count:7,on_hand_count:100,projected_remaining:93});
    await closeModal();
  });

  await test.step('Complete the roast and verify committed inventory', async () => {
    await page.getByRole('button',{name:/Finish Roast Day/}).click();
    await page.locator('.modal').getByRole('button',{name:/Finish Roast Day/}).click();
    // Completion may navigate to the dashboard; revisit the same day as a user would.
    await expect.poll(async () => (await (await page.request.get(`/api/packaging?date=${date}`)).json()).day_status).toBe('completed');
    await page.goto(plannerUrl);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button',{name:/Reports/}).click();
    const bagRow = page.getByRole('row').filter({hasText:'Workflow shared bag'});
    await expect(bagRow).toHaveCount(1);
    await expect(bagRow.getByRole('cell')).toHaveText(['Workflow shared bag', '10.9 oz', '100', '7', '93']);
    await expect(page.locator('.size-label')).toHaveText(['10.9 oz (309.01 g)', '10.9 oz (308.443 g)']);
    await expect(page.locator('.size-qty')).toHaveText(['3', '4']);
    await screenshot('04-completed-report');
    await closeModal();
    const committed = await (await page.request.get(`/api/packaging?date=${date}`)).json();
    expect(committed.packaging[0]).toMatchObject({filled_count:7,starting_count:100,ending_count:93,on_hand_count:93});
  });

  await test.step('Archive a product and confirm historical orders and reports survive', async () => {
    await page.getByRole('button',{name:/Catalog/}).click();
    const product = page.getByRole('row').filter({hasText:'Workflow House - 10.9oz'});
    page.once('dialog', dialog => dialog.accept());
    await product.getByRole('button',{name:'Archive',exact:true}).click();
    await expect(product).toHaveCount(0);
    await page.getByRole('button',{name:'Archived',exact:true}).click();
    await expect(product).toBeVisible();
    await screenshot('05-archived-product');
    await closeModal();
    await page.getByRole('button',{name:/Reports/}).click();
    const bagRow = page.getByRole('row').filter({hasText:'Workflow shared bag'});
    await expect(bagRow).toHaveCount(1);
    await expect(bagRow.getByRole('cell')).toHaveText(['Workflow shared bag', '10.9 oz', '100', '7', '93']);
    expect((await (await page.request.get(`/api/orders?date=${date}`)).json())).toHaveLength(2);
    const snapshot = await (await page.request.get(`/api/snapshots?date=${date}`)).json();
    expect(snapshot.summary.orders).toEqual(expect.arrayContaining([{product_name:'Workflow House - 10.9oz',qty:4}]));
    await closeModal();
  });

});
