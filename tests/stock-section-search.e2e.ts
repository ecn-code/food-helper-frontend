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
	await expect(page.getByRole('cell', { name: 'Apple' }).first()).toBeVisible();
});

test('recuerda el modo de vista y los stats del stock en mobile', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');

	await page.getByTestId('login-username').fill('elias');
	await page.getByTestId('login-password').fill('secret-password');
	await page.getByTestId('login-submit').click();
	await expect(page).toHaveURL(/\/products$/);

	await page.goto('/stock');
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

test('muestra y filtra el historial paginado de stock', async ({ page }) => {
	const requestedUrls: string[] = [];
	await page.route('**/api/v1/stock/movements?**', async (route) => {
		requestedUrls.push(route.request().url());
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				items: [
					{
						id: 24,
						productId: 1,
						productName: 'Apple',
						stockEntryId: 3,
						movementType: 'ADJUSTMENT',
						signedQuantity: -2.5,
						effectiveDate: '2026-06-10',
						recordedAt: '2026-06-10T14:30:00Z',
						price: 4.99,
						expirationDate: '2026-06-20',
						entryDate: '2026-06-10'
					}
				],
				page: 0,
				size: 20,
				totalElements: 1,
				totalPages: 1
			})
		});
	});

	await page.goto('/');
	await page.getByTestId('login-username').fill('elias');
	await page.getByTestId('login-password').fill('secret-password');
	await page.getByTestId('login-submit').click();
	await page.getByRole('link', { name: 'Stock' }).click();
	await page.getByTestId('stock-history-tab').click();

	await expect(page.getByTestId('stock-history')).toContainText('Apple');
	await expect(page.getByTestId('stock-history')).toContainText('Ajuste');
	await page.getByLabel('Desde').fill('2026-06-01');
	await page.getByLabel('Hasta').fill('2026-06-30');
	await page.getByLabel('ID de producto').fill('1');
	await page.getByRole('button', { name: 'Aplicar' }).click();

	await expect.poll(() => requestedUrls.length).toBe(2);
	const filteredRequest = new URL(requestedUrls.at(-1)!);
	expect(filteredRequest.searchParams.get('fromDate')).toBe('2026-06-01');
	expect(filteredRequest.searchParams.get('toDate')).toBe('2026-06-30');
	expect(filteredRequest.searchParams.get('productIds')).toBe('1');
	expect(filteredRequest.searchParams.get('page')).toBe('0');
	expect(filteredRequest.searchParams.get('size')).toBe('20');
});
