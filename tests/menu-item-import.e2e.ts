import { expect, test, type Page } from '@playwright/test';

const useRealBackend = process.env.E2E_REAL_BACKEND === '1';
const mockBackendUrl = process.env.MOCK_BACKEND_URL || 'http://127.0.0.1:4010';

async function loginAs(page: Page) {
	await page.getByTestId('login-username').fill('elias');
	await page.getByTestId('login-password').fill('secret-password');
	await page.getByTestId('login-submit').click();
	await expect(page.getByText('elias', { exact: true }).first()).toBeVisible();
}

test.beforeEach(async ({ request }) => {
	test.skip(useRealBackend, 'El backend real debe implementar primero POST /api/v1/menus/{id}/item-imports.');
	await request.post(`${mockBackendUrl}/__reset`);
});

test('importa JSON con destinos independientes y caducidad opcional', async ({ page }) => {
	await page.goto('/');
	await loginAs(page);

	const session = await page.evaluate(() => JSON.parse(localStorage.getItem('foodhelper_session') ?? 'null'));
	const authHeaders = { Authorization: `${session.tokenType} ${session.accessToken}` };
	const weekResponse = await page.request.post(`${mockBackendUrl}/api/v1/proposed-week-menus`, {
		headers: authHeaders,
		data: { users: 1, startDate: '2026-07-15', endDate: '2026-07-21' }
	});
	const week = await weekResponse.json();
	const publishResponse = await page.request.post(`${mockBackendUrl}/api/v1/planning/${week.id}/menu`, {
		headers: authHeaders,
		data: { payerUserId: 1, personIds: [1] }
	});
	expect(publishResponse.ok()).toBeTruthy();
	const menu = await publishResponse.json();

	await page.reload();
	await page.getByTestId('app-ready').waitFor();
	await page.getByRole('link', { name: 'Menú', exact: true }).click();
	await page.getByTestId('menu-period-selector').selectOption(String(menu.id));
	const panelContent = page.locator('#menu-week-panel-content');
	if (!(await panelContent.isVisible())) await page.getByTestId('menu-week-panel-toggle').click();

	await page.getByTestId('menu-week-open-json-import').click();
	await page.getByTestId('menu-item-import-json').fill(JSON.stringify([
		{ id: 1, price: 2.5, quantity: 2 },
		{ id: 2, price: 3, quantity: 2 },
		{ id: 1, price: 1.25, quantity: 4 }
	]));
	await page.getByTestId('menu-item-import-load').click();
	await expect(page.getByTestId('menu-item-import-row-1')).toContainText('Apple');
	await expect(page.getByTestId('menu-item-import-row-2')).toContainText('Rice');

	await page.getByLabel('Cantidad fila 1').fill('1.5');
	await page.getByLabel('Precio fila 1').fill('2');
	await page.getByLabel('Destino fila 2').selectOption('MONEY_BOX');
	await page.getByLabel('Caja fila 2').selectOption('1');
	await page.getByLabel('Destino fila 3').selectOption('GLOBAL_STOCK');
	await page.getByLabel('Caducidad fila 3').fill('2026-08-31');

	const [importRequest] = await Promise.all([
		page.waitForRequest((request) => request.method() === 'POST' && request.url().endsWith(`/api/v1/menus/${menu.id}/item-imports`)),
		page.getByTestId('menu-item-import-submit').click()
	]);
	expect(importRequest.postDataJSON()).toEqual({
		items: [
			{ productId: 1, quantity: 1.5, price: 2, destination: 'MENU_STOCK' },
			{ productId: 2, quantity: 2, price: 3, destination: 'MONEY_BOX', moneyBoxId: 1 },
			{ productId: 1, quantity: 4, price: 1.25, destination: 'GLOBAL_STOCK', expirationDate: '2026-08-31' }
		]
	});

	await expect(page.getByTestId('menu-item-import-dialog')).toHaveCount(0);
	await expect(page.getByTestId('menu-week-stock-item-0')).toContainText('Apple');
	await expect(page.getByTestId('menu-week-stock-item-0')).toContainText('1,5 uds · 2,00 €');

	const moneyBoxesResponse = await page.request.get(`${mockBackendUrl}/api/v1/money-boxes`, { headers: authHeaders });
	const moneyBoxes = await moneyBoxesResponse.json();
	const eliasBox = moneyBoxes.find((box: { id: number }) => box.id === 1);
	expect(eliasBox.movements).toEqual(expect.arrayContaining([
		expect.objectContaining({ amount: -6, description: 'Compra: Rice', menuId: null })
	]));

	const stockResponse = await page.request.get(`${mockBackendUrl}/api/v1/stock`, { headers: authHeaders });
	const stock = await stockResponse.json();
	expect(stock).toEqual(expect.arrayContaining([
		expect.objectContaining({ productId: 1, quantity: 4, price: 1.25, expirationDate: '2026-08-31' })
	]));
});
