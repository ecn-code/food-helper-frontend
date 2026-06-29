import { expect, test } from '@playwright/test';

test('uses the product default price when a proposed week has no stock', async ({ page }) => {
	const backendBaseUrl =
		process.env.E2E_REAL_BACKEND === '1'
			? process.env.PUBLIC_BACKEND_BASE_URL || 'http://127.0.0.1:8080'
			: process.env.MOCK_BACKEND_URL ||
				`http://127.0.0.1:${process.env.MOCK_BACKEND_PORT || 4010}`;

	await page.goto('/');

	await page.getByTestId('login-username').fill('elias');
	await page.getByTestId('login-password').fill('secret-password');
	await page.getByTestId('login-submit').click();
	await expect(page.getByTestId('logout-button')).toBeVisible();

	const session = await page.evaluate(() => {
		const raw = localStorage.getItem('foodhelper_session');
		return raw ? JSON.parse(raw) : null;
	});

	expect(session).not.toBeNull();
	const authHeaders = {
		Authorization: `${session.tokenType} ${session.accessToken}`
	};

	const productResponse = await page.request.post(`${backendBaseUrl}/api/v1/products`, {
		headers: authHeaders,
		data: {
			name: 'Leche con precio base',
			description: 'Producto de prueba para validar el coste estimado',
			gramsPerUnit: 1000,
			defaultPrice: 4.2,
			calories: 60,
			carbohydrates: 5,
			proteins: 3,
			fats: 2
		}
	});
	expect(productResponse.ok()).toBeTruthy();
	const product = await productResponse.json();

	const weekResponse = await page.request.post(`${backendBaseUrl}/api/v1/proposed-week-menus`, {
		headers: authHeaders,
		data: {
			startDate: '2026-06-15',
			endDate: '2026-06-21'
		}
	});
	expect(weekResponse.ok()).toBeTruthy();
	const week = await weekResponse.json();

	const dayResponse = await page.request.put(`${backendBaseUrl}/api/v1/proposed-week-menus/${week.id}/days`, {
		headers: authHeaders,
		data: {
			date: '2026-06-15',
			sections: [
				{
					dayPartId: 1,
					products: [
						{
							productId: product.id,
							sortOrder: 10,
							units: 2
						}
					]
				}
			]
		}
	});
	expect(dayResponse.ok()).toBeTruthy();

	await page.evaluate((weekId) => {
		localStorage.setItem('foodhelper_selected_planning_menu_id', String(weekId));
	}, week.id);

	await page.goto('/#week');
	await page.reload();

	await expect(page.getByRole('heading', { name: 'Planificación' })).toBeVisible();
	await expect(page.getByTestId('week-cost-card')).toContainText('8,40');
	await expect(page.locator('tr', { hasText: 'Leche con precio base' })).toContainText('8,40');
});
