import { expect, test, type APIRequestContext } from '@playwright/test';

const useRealBackend = process.env.E2E_REAL_BACKEND === '1';
const mockBackendUrl = process.env.MOCK_BACKEND_URL || 'http://127.0.0.1:4010';
const backendUrl = useRealBackend
	? (process.env.PUBLIC_BACKEND_BASE_URL ?? 'http://127.0.0.1:8080')
	: mockBackendUrl;

test.beforeEach(async ({ request }) => {
	if (!useRealBackend) {
		await request.post(`${mockBackendUrl}/__reset`);
	}
});

async function registerUser(request: APIRequestContext, username: string) {
	const response = await request.post(`${backendUrl}/api/v1/auth/register`, {
		data: {
			username,
			password: 'secret-password',
			registrationCode: 'foodhelper-invite'
		}
	});

	expect([201, 409]).toContain(response.status());
}

test('cierra un menú con varias personas y rechaza el cierre sin selección', async ({ page, request }) => {
	const collaborator = `friend-${Date.now()}`;
	await registerUser(request, collaborator);

	await page.goto('/');
	await page.getByTestId('login-username').fill('elias');
	await page.getByTestId('login-password').fill('secret-password');
	await page.getByTestId('login-submit').click();

	await page.getByRole('link', { name: 'Planificación' }).click();
	await page.getByRole('button', { name: 'Nueva semana' }).click();
	await page.getByTestId('week-start-date').fill('2026-07-01');
	await page.getByTestId('week-end-date').fill('2026-07-07');
	await page.getByTestId('week-create-form').getByRole('button', { name: 'Crear semana' }).click();
	await page.getByRole('button', { name: 'Establecer semana' }).click();
	await page.getByTestId('week-publish-modal').getByRole('button', { name: 'Establecer semana' }).click();

	await expect(page.getByTestId('menu-completion-panel')).toContainText('Menú establecido');
	await page.getByTestId('menu-completion-panel').getByRole('button', { name: 'Cerrar menú' }).click();
	await expect(page.getByTestId('close-menu-dialog')).toBeVisible();

	await page.getByRole('checkbox', { name: 'elias' }).uncheck();
	await page.getByRole('checkbox', { name: collaborator }).uncheck();
	await page.getByTestId('close-menu-dialog').getByRole('button', { name: 'Cerrar menú' }).click();
	await expect(page.getByTestId('close-menu-dialog')).toContainText('Selecciona al menos una persona.');

	await page.getByRole('checkbox', { name: 'elias' }).check();
	await page.getByRole('checkbox', { name: collaborator }).check();
	await page.getByTestId('close-menu-dialog').getByRole('button', { name: 'Cerrar menú' }).click();
	await expect(page.getByTestId('menu-completion-panel')).toContainText('Cerrado');
});

test('permite ajustar el stock temporal del menu y reducir la lista de la compra', async ({ page }) => {
	const backendBaseUrl =
		process.env.E2E_REAL_BACKEND === '1'
			? process.env.PUBLIC_BACKEND_BASE_URL || 'http://127.0.0.1:8080'
			: process.env.MOCK_BACKEND_URL ||
				`http://127.0.0.1:${process.env.MOCK_BACKEND_PORT || 4010}`;

	await page.goto('/');
	await page.getByTestId('login-username').fill('elias');
	await page.getByTestId('login-password').fill('secret-password');
	await page.getByTestId('login-submit').click();

	const session = await page.evaluate(() => {
		const raw = localStorage.getItem('foodhelper_session');
		return raw ? JSON.parse(raw) : null;
	});
	expect(session).not.toBeNull();
	const authHeaders = {
		Authorization: `${session.tokenType} ${session.accessToken}`
	};

	const weekResponse = await page.request.post(`${backendBaseUrl}/api/v1/proposed-week-menus`, {
		headers: authHeaders,
		data: {
			startDate: '2026-07-08',
			endDate: '2026-07-14'
		}
	});
	expect(weekResponse.ok()).toBeTruthy();
	const week = await weekResponse.json();

	const dayResponse = await page.request.put(`${backendBaseUrl}/api/v1/proposed-week-menus/${week.id}/days`, {
		headers: authHeaders,
		data: {
			date: '2026-07-08',
			sections: [
				{
					dayPartId: 1,
					products: [
						{
							productId: 1,
							sortOrder: 10,
							units: 1
						}
					]
				}
			]
		}
	});
	expect(dayResponse.ok()).toBeTruthy();

	const publishResponse = await page.request.post(`${backendBaseUrl}/api/v1/planning/${week.id}/menu`, {
		headers: authHeaders,
		data: {
			payerUserId: 1,
			personIds: [1]
		}
	});
	expect(publishResponse.ok()).toBeTruthy();
	const establishedMenu = await publishResponse.json();

	const dummyWeekResponse = await page.request.post(`${backendBaseUrl}/api/v1/proposed-week-menus`, {
		headers: authHeaders,
		data: {
			startDate: '2026-07-22',
			endDate: '2026-07-28'
		}
	});
	expect(dummyWeekResponse.ok()).toBeTruthy();
	const dummyWeek = await dummyWeekResponse.json();

	const dummyPublishResponse = await page.request.post(`${backendBaseUrl}/api/v1/planning/${dummyWeek.id}/menu`, {
		headers: authHeaders,
		data: {
			payerUserId: 1,
			personIds: [1]
		}
	});
	expect(dummyPublishResponse.ok()).toBeTruthy();

	await page.reload();
	await page.getByTestId('app-ready').waitFor();
	await page.getByRole('link', { name: 'Menú', exact: true }).click();
	await expect(page.getByTestId('menu-period-selector')).toBeVisible();
	await page.evaluate((menuId) => {
		const select = document.querySelector('[data-testid="menu-period-selector"]') as HTMLSelectElement | null;
		if (!select) return;
		select.value = String(menuId);
		select.dispatchEvent(new Event('change', { bubbles: true }));
	}, establishedMenu.id);

	await expect(page.getByTestId('menu-week-panel')).toBeVisible();
	await expect(page.getByTestId('menu-week-panel')).toContainText('1 productos pendientes');
	await expect(page.getByTestId('menu-week-panel')).toContainText('Apple');

	await page.getByTestId('menu-week-stock-product').selectOption('1');
	await page.getByTestId('menu-week-stock-quantity').fill('1');
	await page.getByTestId('menu-week-stock-add').click();

	await expect(page.getByTestId('menu-week-panel')).toContainText('0 productos pendientes');
	await expect(page.getByTestId('menu-week-panel')).toContainText('No hay productos pendientes.');
});

test('recuerda el estado colapsado del bloque de menú en el navegador', async ({ page }) => {
	const backendBaseUrl =
		process.env.E2E_REAL_BACKEND === '1'
			? process.env.PUBLIC_BACKEND_BASE_URL || 'http://127.0.0.1:8080'
			: process.env.MOCK_BACKEND_URL ||
				`http://127.0.0.1:${process.env.MOCK_BACKEND_PORT || 4010}`;

	await page.goto('/');
	await page.getByTestId('login-username').fill('elias');
	await page.getByTestId('login-password').fill('secret-password');
	await page.getByTestId('login-submit').click();

	const session = await page.evaluate(() => {
		const raw = localStorage.getItem('foodhelper_session');
		return raw ? JSON.parse(raw) : null;
	});
	expect(session).not.toBeNull();
	const authHeaders = {
		Authorization: `${session.tokenType} ${session.accessToken}`
	};

	const weekResponse = await page.request.post(`${backendBaseUrl}/api/v1/proposed-week-menus`, {
		headers: authHeaders,
		data: {
			users: 1,
			startDate: '2026-07-29',
			endDate: '2026-08-04'
		}
	});
	expect(weekResponse.ok()).toBeTruthy();
	const week = await weekResponse.json();

	const dayResponse = await page.request.put(`${backendBaseUrl}/api/v1/proposed-week-menus/${week.id}/days`, {
		headers: authHeaders,
		data: {
			date: '2026-07-29',
			sections: [
				{
					dayPartId: 1,
					products: [
						{
							productId: 1,
							sortOrder: 10,
							units: 1
						}
					]
				}
			]
		}
	});
	expect(dayResponse.ok()).toBeTruthy();

	const publishResponse = await page.request.post(`${backendBaseUrl}/api/v1/planning/${week.id}/menu`, {
		headers: authHeaders,
		data: {
			payerUserId: 1,
			personIds: [1]
		}
	});
	expect(publishResponse.ok()).toBeTruthy();
	const establishedMenu = await publishResponse.json();

	await page.route('**/api/v1/menus', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify([establishedMenu])
		});
	});

	await page.evaluate((menuId) => {
		localStorage.setItem('foodhelper_selected_menu_id', String(menuId));
	}, establishedMenu.id);

	await page.goto('/#menus');

	const panel = page.getByTestId('menu-week-panel');
	const content = page.locator('#menu-week-panel-content');
	const toggle = page.getByTestId('menu-week-panel-toggle');

	await expect(panel).toBeVisible();
	await expect(content).toBeHidden();

	await toggle.click();
	await expect(content).toBeVisible();

	await page.reload();
	await page.getByTestId('app-ready').waitFor();
	await page.getByRole('link', { name: 'Menú', exact: true }).click();
	await expect(page.getByTestId('menu-week-panel')).toBeVisible();
	await expect(page.locator('#menu-week-panel-content')).toBeVisible();

	await page.getByTestId('menu-week-panel-toggle').click();
	await expect(page.locator('#menu-week-panel-content')).toBeHidden();

	await page.reload();
	await page.getByTestId('app-ready').waitFor();
	await page.getByRole('link', { name: 'Menú', exact: true }).click();
	await expect(page.getByTestId('menu-week-panel')).toBeVisible();

	await expect(page.locator('#menu-week-panel-content')).toBeHidden();
});

test('crea, edita y elimina pesos desde la pantalla de personas', async ({ page }) => {
	await page.goto('/');
	await page.getByTestId('login-username').fill('elias');
	await page.getByTestId('login-password').fill('secret-password');
	await page.getByTestId('login-submit').click();

	await page.getByRole('link', { name: 'Pesos' }).click();
	await expect(page.getByTestId('people-panel')).toBeVisible();
	await expect(page.getByTestId('people-user-selector')).toBeVisible();

	await page.getByTestId('people-weight-input').fill('72.4');
	await page.getByTestId('people-weight-date').fill('2026-06-29');
	await page.getByTestId('people-weight-notes').fill('Peso inicial');
	await page.getByTestId('people-weight-save').click();
	await expect(page.locator('tbody tr').filter({ hasText: '72,4 kg' })).toHaveCount(1);

	await page.locator('[data-testid^="people-weight-edit-"]').first().click();
	await page.getByTestId('people-weight-input').fill('73.1');
	await page.getByTestId('people-weight-save').click();
	await expect(page.locator('tbody tr').filter({ hasText: '73,1 kg' })).toHaveCount(1);

	page.once('dialog', (dialog) => dialog.accept());
	await page.locator('[data-testid^="people-weight-delete-"]').first().click();
	await expect(page.locator('[data-testid^="people-weight-edit-"]')).toHaveCount(0);

	await page.getByRole('link', { name: 'Historial' }).click();
	await expect(page.getByTestId('people-panel')).toContainText('Historial de menús');
});
