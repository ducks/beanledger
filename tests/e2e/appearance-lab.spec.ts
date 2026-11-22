import { test, expect } from '@playwright/test';

for (const route of ['/design-system', '/design-system/packaging', '/design-system/components', '/design-system/ledger']) {
  test(`appearance lab works at ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page.getByRole('heading', { name: 'Same work. Different character.' })).toBeVisible();
    // The URL settings are written after the client mounts and binds controls.
    await expect(page).toHaveURL(/palette=service/);
    const mascot = page.getByLabel('Mascot', { exact: true });
    await expect(mascot).toHaveValue('bean');
    await mascot.selectOption('clipboard');
    await expect(page.locator('.bean-mascot')).toHaveAttribute('alt', 'Clipboard mascot holding a pencil');
    await expect.poll(() => page.locator('.bean-mascot').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    await expect(page.locator('.bean-icon')).toHaveAttribute('src', await page.locator('.bean-mascot').getAttribute('src') as string);
    await page.getByLabel('Color palette').selectOption('soft');
    await page.getByRole('button', { name: 'Switch to dark' }).click();
    await page.reload();
    await expect(mascot).toHaveValue('clipboard');
    await expect(page.getByLabel('Color palette')).toHaveValue('soft');
    await expect(page.getByRole('button', { name: 'Switch to light' })).toBeVisible();
    const packaging = page.getByRole('button', { name: 'Packaging', exact: true });
    await packaging.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(packaging).toBeFocused();
  });
}
