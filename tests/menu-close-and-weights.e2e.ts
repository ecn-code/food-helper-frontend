import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const useRealBackend = process.env.E2E_REAL_BACKEND === '1';
const mockBackendUrl = process.env.MOCK_BACKEND_URL || 'http://127.0.0.1:4010';
const backendUrl = useRealBackend
	? (process.env.PUBLIC_BACKEND_BASE_URL ?? 'http://127.0.0.1:8080')
	: mockBackendUrl;

async function loginAs(page: Page, username: string) {
	await page.getByTestId('login-username').fill(username);
	await page.getByTestId('login-password').fill('secret-password');
	await page.getByTestId('login-submit').click();
	await expect(page.getByText(username, { exact: true }).first()).toBeVisible();
}

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
	await loginAs(page, 'elias');

	await page.getByRole('link', { name: 'Planificación' }).click();
	await page.getByRole('button', { name: 'Nueva semana' }).click();
	await page.getByTestId('week-start-date').fill('2026-07-01');
	await page.getByTestId('week-end-date').fill('2026-07-07');
	await page.getByTestId('week-create-form').getByRole('button', { name: 'Crear semana' }).click();
	await page.getByRole('button', { name: 'Establecer semana' }).click();
	const publishResponsePromise = page.waitForResponse((response) =>
		response.request().method() === 'POST' &&
		response.url().includes('/api/v1/planning/') &&
		response.url().endsWith('/menu') &&
		response.status() === 201
	);
	await expect(page.getByTestId('week-publish-modal')).toBeVisible();
	await page.getByRole('checkbox', { name: collaborator }).check();
	await page.getByTestId('week-publish-modal').getByRole('button', { name: 'Establecer semana' }).click();
	const publishResponse = await publishResponsePromise;
	const establishedMenu = await publishResponse.json();
	await page.getByRole('link', { name: 'Menú', exact: true }).click();
	await page.getByTestId('menu-period-selector').selectOption(String(establishedMenu.id));

	await page.getByTestId('menu-week-close-menu').click();
	await expect(page.getByTestId('close-menu-dialog')).toBeVisible();
	await expect(page.getByTestId('close-menu-dialog')).toContainText('Resumen previo al cierre');
	await expect(page.getByTestId('close-menu-dialog')).toContainText('Movimiento previsto en la hucha');
	await expect(page.getByTestId('close-menu-dialog')).toContainText('Stock final estimado');
	await expect(page.getByRole('checkbox', { name: 'elias' })).toBeChecked();
	await expect(page.getByRole('checkbox', { name: collaborator })).toBeChecked();

	await page.getByRole('checkbox', { name: 'elias' }).uncheck();
	await page.getByRole('checkbox', { name: collaborator }).uncheck();
	await page.getByTestId('close-menu-dialog').getByRole('button', { name: 'Confirmar cierre' }).click();
	await expect(page.getByTestId('close-menu-dialog')).toContainText('Selecciona al menos una persona.');
	await page.getByTestId('validation-dialog-close').click();
	await page.getByTestId('close-menu-dialog').getByRole('button', { name: 'Cancelar' }).click();
	await expect(page.getByTestId('close-menu-dialog')).toHaveCount(0);
	await page.getByRole('button', { name: 'Ir a planificación' }).click();
	await expect(page).toHaveURL(/\/planning$/);
	await page.getByRole('link', { name: 'Menú', exact: true }).click();
	await expect(page.getByTestId('close-menu-dialog')).toHaveCount(0);
	await page.getByTestId('menu-week-close-menu').click();

	await page.getByRole('checkbox', { name: 'elias' }).check();
	await page.getByRole('checkbox', { name: collaborator }).check();
	await page.getByTestId('close-menu-dialog').getByRole('button', { name: 'Confirmar cierre' }).click();
	await expect(page.getByTestId('menu-week-panel')).toHaveCount(0);
});

test('muestra el mensaje del backend cuando el cierre del menú falla con 400', async ({ page, request }) => {
	const collaborator = `friend-${Date.now()}`;
	await registerUser(request, collaborator);

	await page.goto('/');
	await loginAs(page, 'elias');

	await page.getByRole('link', { name: 'Planificación' }).click();
	await page.getByRole('button', { name: 'Nueva semana' }).click();
	await page.getByTestId('week-start-date').fill('2026-07-01');
	await page.getByTestId('week-end-date').fill('2026-07-07');
	await page.getByTestId('week-create-form').getByRole('button', { name: 'Crear semana' }).click();
	await page.getByRole('button', { name: 'Establecer semana' }).click();
	const publishResponsePromise = page.waitForResponse((response) =>
		response.request().method() === 'POST' &&
		response.url().includes('/api/v1/planning/') &&
		response.url().endsWith('/menu') &&
		response.status() === 201
	);
	await expect(page.getByTestId('week-publish-modal')).toBeVisible();
	await page.getByRole('checkbox', { name: collaborator }).check();
	await page.getByTestId('week-publish-modal').getByRole('button', { name: 'Establecer semana' }).click();
	const publishResponse = await publishResponsePromise;
	const establishedMenu = await publishResponse.json();
	await page.getByRole('link', { name: 'Menú', exact: true }).click();
	await page.getByTestId('menu-period-selector').selectOption(String(establishedMenu.id));

	await page.route('**/api/v1/menus/*/close', async (route) => {
		await route.fulfill({
			status: 400,
			contentType: 'application/json',
			body: JSON.stringify({
				timestamp: '2026-07-12T11:28:36.973220Z',
				status: 400,
				error: 'Bad Request',
				message: 'Menu can only be closed after its end date',
				path: `/api/v1/menus/${establishedMenu.id}/close`
			})
		});
	});

	await page.getByTestId('menu-week-close-menu').click();
	await page.getByTestId('close-menu-dialog').getByRole('button', { name: 'Confirmar cierre' }).click();
	await expect(page.getByTestId('close-menu-dialog')).toContainText('Menu can only be closed after its end date');
	await expect(page.getByTestId('close-menu-dialog')).toBeVisible();
});

test('permite ajustar el stock temporal del menu y reducir la lista de la compra', async ({ page }) => {
	const backendBaseUrl =
		process.env.E2E_REAL_BACKEND === '1'
			? process.env.PUBLIC_BACKEND_BASE_URL || 'http://127.0.0.1:8080'
			: process.env.MOCK_BACKEND_URL ||
				`http://127.0.0.1:${process.env.MOCK_BACKEND_PORT || 4010}`;

	await page.goto('/');
	await loginAs(page, 'elias');

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
			users: 1,
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
	const dummyEstablishedMenu = await dummyPublishResponse.json();

	await page.reload();
	await page.getByTestId('app-ready').waitFor();
	await page.getByRole('link', { name: 'Menú', exact: true }).click();
	const menuSelector = page.getByTestId('menu-period-selector');
	await expect(menuSelector).toBeVisible();
	await expect(menuSelector).not.toHaveValue('');
	await expect(menuSelector.locator('option:checked')).not.toHaveText('');
	await menuSelector.selectOption(String(establishedMenu.id));
	await expect(menuSelector).toHaveValue(String(establishedMenu.id));
	await expect(menuSelector.locator('option:checked')).toHaveAttribute('value', String(establishedMenu.id));

	await expect(page.getByTestId('menu-week-panel')).toBeVisible({ timeout: 10000 });
	await expect(page.getByTestId('menu-week-panel')).toContainText('1 productos pendientes');
	await expect(page.getByTestId('menu-week-panel')).toContainText('Apple');

	await page.getByTestId('menu-week-panel-toggle').click();
	await page.getByTestId('menu-week-open-shopping-list-dialog').click();
	await expect(page.getByTestId('menu-week-shopping-list-dialog')).toBeVisible();
	const stockProductSelector = page.getByTestId('menu-week-stock-product');
	await stockProductSelector.selectOption('1');
	await page.getByTestId('menu-week-stock-quantity').fill('1');
	await page.getByTestId('menu-week-stock-price').fill('2.5');
	await page.getByTestId('menu-week-stock-add').click();

	await expect(page.getByTestId('menu-week-panel')).toContainText('0 productos pendientes');
	await expect(page.getByTestId('menu-week-panel')).toContainText('No hay productos pendientes.');
	await expect(page.getByTestId('menu-week-shopping-list-dialog')).toHaveCount(0);
	await page.getByTestId('menu-week-open-catalog-dialog').click();
	await expect(page.getByTestId('menu-week-catalog-dialog')).toBeVisible();
	const catalogSearch = page.getByTestId('menu-week-catalog-search').getByTestId('stock-product-search-input');
	await catalogSearch.fill('Ap');
	await expect(page.getByTestId('menu-week-catalog-search').getByTestId('stock-product-search-option-1')).toBeVisible();
	await page.getByTestId('menu-week-catalog-search').getByTestId('stock-product-search-option-1').click();
	await page.getByTestId('menu-week-catalog-quantity').fill('2');
	await page.getByTestId('menu-week-catalog-price').fill('3.1');
	await page.getByTestId('menu-week-catalog-add').click();

	await expect(page.getByTestId('menu-week-catalog-dialog')).toHaveCount(0);
	await expect(page.getByTestId('menu-week-panel')).toContainText('2 productos');
	await expect(page.getByTestId('menu-week-stock-item-0')).toContainText('Apple');
	await expect(page.getByTestId('menu-week-stock-item-0')).toContainText('1 uds · 2,50 €');
	await expect(page.getByTestId('menu-week-stock-item-1')).toContainText('Apple');
	await expect(page.getByTestId('menu-week-stock-item-1')).toContainText('2 uds · 3,10 €');
	const stockBeforeCloseResponse = await page.request.get(`${backendBaseUrl}/api/v1/products/1/stock`, { headers: authHeaders });
	expect(stockBeforeCloseResponse.ok()).toBeTruthy();
	const stockBeforeClose = await stockBeforeCloseResponse.json();

	await expect(menuSelector).toHaveValue(String(establishedMenu.id));
	await page.getByTestId('menu-week-close-menu').click();
	const positiveStockCheckbox = page.getByRole('checkbox', { name: 'Añadir Apple al stock global' });
	await expect(positiveStockCheckbox).toBeChecked();
	await expect(page.getByTestId('close-menu-dialog')).toContainText('3 uds');
	await page.setViewportSize({ width: 375, height: 812 });
	const mobilePositiveStockCheckbox = page.getByTestId('close-positive-stock-mobile-1');
	await expect(mobilePositiveStockCheckbox).toBeVisible();
	await expect(mobilePositiveStockCheckbox).toBeChecked();
	await mobilePositiveStockCheckbox.uncheck();
	await expect(page.getByTestId('close-menu-dialog')).toContainText('Positivos al stock global');
	const [closeRequest] = await Promise.all([
		page.waitForRequest(
			(request) =>
				request.method() === 'POST' &&
				request.url().endsWith(`/api/v1/menus/${establishedMenu.id}/close`)
		),
		page.waitForResponse(
			(response) =>
				response.request().method() === 'POST' &&
				response.url().endsWith(`/api/v1/menus/${establishedMenu.id}/close`) &&
				response.status() === 200
		),
		page.getByTestId('close-menu-dialog').getByRole('button', { name: 'Confirmar cierre' }).click()
	]);
	expect(closeRequest.postDataJSON()).toEqual({
		personIds: [1],
		excludedPositiveStockProductIds: [1]
	});
	const stockAfterCloseResponse = await page.request.get(`${backendBaseUrl}/api/v1/products/1/stock`, { headers: authHeaders });
	expect(stockAfterCloseResponse.ok()).toBeTruthy();
	expect(await stockAfterCloseResponse.json()).toEqual(stockBeforeClose);
	await expect(page.getByTestId('close-menu-dialog')).toHaveCount(0);
	await expect(menuSelector).toHaveValue(String(dummyEstablishedMenu.id));
	await expect(page.getByTestId('menu-week-panel')).toBeVisible();
});

test('limita la cantidad del stock global al maximo disponible', async ({ page, request }) => {
	const backendBaseUrl =
		process.env.E2E_REAL_BACKEND === '1'
			? process.env.PUBLIC_BACKEND_BASE_URL || 'http://127.0.0.1:8080'
			: process.env.MOCK_BACKEND_URL ||
				`http://127.0.0.1:${process.env.MOCK_BACKEND_PORT || 4010}`;

	await page.goto('/');
	await loginAs(page, 'elias');

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
			startDate: '2026-08-05',
			endDate: '2026-08-11'
		}
	});
	expect(weekResponse.ok()).toBeTruthy();
	const week = await weekResponse.json();

	const publishResponse = await page.request.post(`${backendBaseUrl}/api/v1/planning/${week.id}/menu`, {
		headers: authHeaders,
		data: {
			payerUserId: 1,
			personIds: [1]
		}
	});
	expect(publishResponse.ok()).toBeTruthy();
	const establishedMenu = await publishResponse.json();

	const stockResponse = await page.request.post(`${backendBaseUrl}/api/v1/products/1/stock`, {
		headers: authHeaders,
		data: {
			quantity: 4.5,
			price: 2.5,
			expirationDate: '2026-08-20',
			entryDate: '2026-08-05'
		}
	});
	expect(stockResponse.ok()).toBeTruthy();

	await page.reload();
	await page.getByTestId('app-ready').waitFor();
	await page.getByRole('link', { name: 'Menú', exact: true }).click();
	await page.getByTestId('menu-period-selector').selectOption(String(establishedMenu.id));

	const panelContent = page.locator('#menu-week-panel-content');
	if (!(await panelContent.isVisible())) {
		await page.getByTestId('menu-week-panel-toggle').click();
	}
	await Promise.all([
		page.waitForResponse((response) =>
			response.request().method() === 'GET' &&
			response.url().includes('/api/v1/stock') &&
			response.status() === 200
		),
		page.getByTestId('menu-week-open-global-stock-dialog').click()
	]);
	await expect(page.getByTestId('menu-week-global-stock-dialog')).toBeVisible();
	const stockSearch = page.getByTestId('menu-week-global-stock-search-entry');
	await stockSearch.fill('App');
	await expect(page.getByTestId('menu-week-global-stock-entry')).toContainText('uds');
	await page.getByTestId('menu-week-global-stock-entry').focus();
	await page.keyboard.press('ArrowDown');
	await page.keyboard.press('Enter');
	await expect(page.getByTestId('menu-week-global-stock-entry')).not.toHaveValue('');
	await expect(page.getByTestId('menu-week-global-stock-quantity')).toHaveValue('4.5');

	await page.getByTestId('menu-week-global-stock-quantity').fill('10');
	await expect(page.getByTestId('menu-week-global-stock-quantity')).toHaveValue('4.5');

	await Promise.all([
		page.waitForResponse((response) =>
			response.request().method() === 'POST' &&
			response.url().endsWith(`/api/v1/menus/${establishedMenu.id}/week-stock/transfer`) &&
			response.status() === 200
		),
		page.getByTestId('menu-week-global-stock-add').click()
	]);
	await expect(page.getByTestId('menu-week-global-stock-dialog')).toHaveCount(0);
	await expect(page.getByTestId('menu-week-stock-item-0')).toContainText('Apple');
});

test('recuerda el estado colapsado del bloque de menú en el navegador', async ({ page }) => {
	const backendBaseUrl =
		process.env.E2E_REAL_BACKEND === '1'
			? process.env.PUBLIC_BACKEND_BASE_URL || 'http://127.0.0.1:8080'
			: process.env.MOCK_BACKEND_URL ||
				`http://127.0.0.1:${process.env.MOCK_BACKEND_PORT || 4010}`;

	await page.goto('/');
	await loginAs(page, 'elias');

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

	await page.goto('/menus/current');

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

test('selecciona al usuario logado y permite gestionar sus pesos', async ({ page, request }) => {
	const username = `weights-${Date.now()}`;
	await registerUser(request, username);
	await page.goto('/');
	await loginAs(page, username);
	const loggedUserId = await page.evaluate(() => {
		const raw = localStorage.getItem('foodhelper_session');
		return raw ? String(JSON.parse(raw).userId) : '';
	});

	await page.getByRole('link', { name: 'Pesos' }).click();
	await expect(page.getByTestId('people-panel')).toBeVisible();
	const userSelector = page.getByTestId('people-user-selector');
	await expect(userSelector).toBeVisible();
	await expect(userSelector).toHaveValue(loggedUserId);
	await expect(userSelector.locator('option:checked')).toHaveText(username);

	await page.getByTestId('people-weight-input').fill('72.4');
	const today = await page.evaluate(() => {
		const date = new Date();
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	});
	await page.getByTestId('people-weight-date').fill(today);
	await page.getByTestId('people-weight-notes').fill('Peso inicial');
	await page.getByTestId('people-weight-save').click();
	await expect(page.locator('tbody tr').filter({ hasText: '72,40 kg' })).toHaveCount(1);

	await page.locator('[data-testid^="people-weight-edit-"]').first().click();
	await page.getByTestId('people-weight-input').fill('73.1');
	await page.getByTestId('people-weight-save').click();
	await expect(page.locator('tbody tr').filter({ hasText: '73,10 kg' })).toHaveCount(1);

	page.once('dialog', (dialog) => dialog.accept());
	await page.locator('[data-testid^="people-weight-delete-"]').first().click();
	await expect(page.locator('[data-testid^="people-weight-edit-"]')).toHaveCount(0);

	await page.getByRole('link', { name: 'Historial' }).click();
	await expect(page.getByTestId('people-panel')).toContainText('Historial de menús');
});
