import { expect, test } from '@playwright/test';

test('crea stock desde la seccion de stock con busqueda remota', async ({ page }) => {
	await page.goto('/');

	await page.getByTestId('login-username').fill('elias');
	await page.getByTestId('login-password').fill('secret-password');
	await page.getByTestId('login-submit').click();

	await page.getByRole('link', { name: 'Stock' }).click();
	await expect(page.getByRole('heading', { name: 'Stock', exact: true })).toBeVisible();

	await page.getByRole('button', { name: 'Añadir stock' }).click();
	await page.getByTestId('stock-modal').getByTestId('stock-product-search-input').fill('Ap');

	await expect(page.getByTestId('stock-product-search-option-1')).toBeVisible();
	await page.getByTestId('stock-product-search-option-1').click();

	await page.getByTestId('stock-quantity').fill('3');
	await page.getByTestId('stock-price').fill('2.5');
	await page.getByTestId('stock-entry-date').fill('2026-06-29');
	await page.getByRole('button', { name: 'Guardar stock' }).click();

	await expect(page.getByTestId('stock-count')).toContainText('1');
	await page.getByTestId('stock-view-list').click();
	await expect(page.getByRole('cell', { name: 'Apple' })).toBeVisible();
});

test('recuerda el modo de vista y los stats del stock en mobile', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');

	await page.getByTestId('login-username').fill('elias');
	await page.getByTestId('login-password').fill('secret-password');
	await page.getByTestId('login-submit').click();

	await page.goto('/#stock');
	await expect(page.getByRole('heading', { name: 'Stock', exact: true })).toBeVisible();
	await expect(page.getByTestId('stock-stats-panel')).toHaveCount(0);
	await expect(page.getByTestId('stock-view-list')).toHaveAttribute('aria-pressed', 'true');

	await page.getByTestId('stock-stats-toggle').click();
	await expect(page.getByTestId('stock-stats-panel')).toBeVisible();

	await page.getByTestId('stock-view-block').click();
	await expect(page.getByTestId('stock-view-block')).toHaveAttribute('aria-pressed', 'true');

	await page.reload();
	await expect(page.getByTestId('stock-stats-panel')).toBeVisible();
	await expect(page.getByTestId('stock-view-block')).toHaveAttribute('aria-pressed', 'true');
});
