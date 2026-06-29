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
	await expect(page.getByRole('cell', { name: 'Apple' })).toBeVisible();
});
