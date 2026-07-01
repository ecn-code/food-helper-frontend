import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';

const useRealBackend = process.env.E2E_REAL_BACKEND === '1';
const mockBackendUrl = process.env.MOCK_BACKEND_URL || 'http://127.0.0.1:4010';
const backendUrl = useRealBackend
	? (process.env.PUBLIC_BACKEND_BASE_URL ?? 'http://127.0.0.1:8080')
	: mockBackendUrl;
const testPassword = 'secret-password';
const registrationCode = 'foodhelper-invite';

test.beforeEach(async ({ request }) => {
	if (!useRealBackend) {
		await request.post(`${mockBackendUrl}/__reset`);
	}
});

function uniqueUsername() {
	return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function registerUser(request: APIRequestContext, username: string) {
	const response = await request.post(`${backendUrl}/api/v1/auth/register`, {
		data: {
			username,
			password: testPassword,
			registrationCode
		}
	});

	expect([201, 409]).toContain(response.status());
}

async function login(page: Page, username: string) {
	await page.addInitScript(() => {
		localStorage.clear();
		sessionStorage.clear();
	});
	await page.goto('/');
	await page.getByTestId('app-ready').waitFor();
	await expect(page.getByTestId('login-screen')).toBeVisible();
	await page.getByTestId('login-username').fill(username);
	await page.getByTestId('login-password').fill(testPassword);
	await page.getByTestId('login-submit').click();
	await expect(page.getByRole('heading', { level: 1, name: 'Productos' })).toBeVisible();
	await expect(page.getByTestId('product-count')).not.toHaveText('Cargando...', { timeout: 15000 });
}

async function selectInputTextWithMouse(page: Page, locator: Locator) {
	const box = await locator.boundingBox();
	expect(box).not.toBeNull();
	if (!box) return;

	const y = box.y + Math.min(18, box.height / 2);
	await page.mouse.move(box.x + box.width - 8, y);
	await page.mouse.down();
	await page.mouse.move(box.x + 8, y, { steps: 12 });
	await page.mouse.up();
}

async function selectedTextLength(locator: Locator) {
	return locator.evaluate((element) => {
		if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) return 0;
		return (element.selectionEnd ?? 0) - (element.selectionStart ?? 0);
	});
}

async function chooseProductFromPicker(page: Page, triggerTestId: string, productId: number, search = '') {
	await page.getByTestId(triggerTestId).click();
	await expect(page.getByTestId('product-picker-modal')).toBeVisible();
	if (search) {
		await page.getByTestId('product-picker-filter-search').fill(search);
	}
	await page.getByTestId(`product-picker-option-${productId}`).click();
	await expect(page.getByTestId('product-picker-modal')).toHaveCount(0);
}

test('registra un usuario desde la web y accede automaticamente', async ({ page }) => {
	const username = uniqueUsername();

	await page.goto('/');
	await page.getByTestId('app-ready').waitFor();
	await expect(page.getByTestId('login-screen')).toBeVisible();
	await page.getByTestId('auth-mode-register').click();
	await expect(page.getByTestId('register-form')).toBeVisible();
	await page.getByTestId('register-username').fill(username);
	await page.getByTestId('register-password').fill(testPassword);
	await page.getByTestId('register-code').fill(registrationCode);
	await page.getByTestId('register-submit').click();

	await expect(page.getByRole('heading', { level: 1, name: 'Productos' })).toBeVisible();
	await expect(page.getByText(username)).toBeVisible();
});

test('devuelve 400 real al fallar el registro contra la API', async ({ request }) => {
	const response = await request.post(`${backendUrl}/api/v1/auth/register`, {
		data: {
			username: uniqueUsername(),
			password: testPassword,
			registrationCode: ''
		}
	});
	const body = await response.json();

	expect(response.status()).toBe(400);
	expect(body).toMatchObject({
		status: 400,
		error: 'Bad Request',
		message: 'registrationCode size must be between 1 and 128',
		path: '/api/v1/auth/register'
	});
});

test('lista, crea, edita y elimina productos desde la web', async ({ page, request }) => {
	const seed = Date.now();
	const username = uniqueUsername();
	const productName = `Tomate ${seed}`;
	const updatedName = `Tomate pera ${seed}`;

	await registerUser(request, username);
	await login(page, username);

	await expect(page.getByRole('heading', { level: 1, name: 'Productos' })).toBeVisible();
	if (!useRealBackend) {
		await expect(page.getByTestId('product-list')).toContainText('Apple');
		await expect(page.getByTestId('product-list')).toContainText('Rice');
	}

	await page.getByTestId('open-create-modal').click();
	await expect(page.getByTestId('create-modal')).toBeVisible();
	await page.getByTestId('create-name').fill(productName);
	await page.getByTestId('create-description').fill('Tomate maduro de temporada');
	await page.getByTestId('create-default-price').fill('2.49');
	await page.getByTestId('create-calories').fill('18');
	await page.getByTestId('create-carbohydrates').fill('3.9');
	await page.getByTestId('create-proteins').fill('0.9');
	await page.getByTestId('create-fats').fill('0.2');
	await page.getByRole('button', { name: 'Guardar producto' }).click();

	await expect(page.getByTestId('success-banner')).toContainText('Producto creado correctamente');
	await expect(page.getByTestId('product-list')).toContainText(productName);
	await expect(page.getByTestId('create-modal')).toHaveCount(0);

	const createdCard = page.locator('[data-testid^="product-card-"]').filter({ hasText: productName });
	await createdCard.getByRole('button', { name: 'Ver' }).click();
	await expect(page.getByTestId('product-view-modal')).toBeVisible();
	await expect(page.getByTestId('product-view-modal')).toContainText(productName);
	await expect(page.getByTestId('product-view-modal')).toContainText(/2[,\.]49\s?€/);
	await page.getByTestId('product-view-modal').getByRole('button', { name: 'Cerrar modal' }).click();
	await createdCard.getByRole('button', { name: 'Editar' }).click();

	await expect(page.getByTestId('edit-modal')).toBeVisible();
	await page.getByTestId('edit-name').fill(updatedName);
	await page.getByTestId('edit-description').fill('Tomate pera con sabor intenso');
	await page.getByTestId('edit-default-price').fill('2.79');
	await page.getByTestId('edit-calories').fill('20');
	await page.getByTestId('edit-carbohydrates').fill('4.2');
	await page.getByTestId('edit-proteins').fill('1');
	await page.getByTestId('edit-fats').fill('0.1');
	await page.getByRole('button', { name: 'Actualizar producto' }).click();

	await expect(page.getByTestId('success-banner')).toContainText('Producto actualizado correctamente');
	await expect(page.getByTestId('product-list')).toContainText(updatedName);
	await expect(page.getByTestId('product-list')).not.toContainText(productName);
	await expect(page.getByTestId('edit-modal')).toHaveCount(0);

	const updatedCardView = page.locator('[data-testid^="product-card-"]').filter({ hasText: updatedName });
	await updatedCardView.getByRole('button', { name: 'Ver' }).click();
	await expect(page.getByTestId('product-view-modal')).toContainText(/2[,\.]79\s?€/);
	await page.getByTestId('product-view-modal').getByRole('button', { name: 'Cerrar modal' }).click();

	const updatedCard = page.locator('[data-testid^="product-card-"]').filter({ hasText: updatedName });
	await updatedCard.getByRole('button', { name: 'Eliminar' }).click();
	await expect(page.getByTestId('delete-modal')).toBeVisible();
	await page.getByRole('button', { name: 'Si, eliminar' }).click();

	await expect(page.getByTestId('success-banner')).toContainText('Producto eliminado correctamente');
	await expect(page.getByText(updatedName)).toHaveCount(0);
});

test('filtra productos por texto y campos nutricionales', async ({ page, request }) => {
	const username = uniqueUsername();

	await registerUser(request, username);
	await login(page, username);

	await page.getByTestId('product-filter-search').fill('apple');
	await expect(page.getByTestId('product-count')).toContainText('1 de 2');
	await expect(page.getByTestId('product-list')).toContainText('Apple');
	await expect(page.getByTestId('product-list')).not.toContainText('Rice');

	await page.getByTestId('product-filter-search').fill('');
	await page.getByTestId('product-filter-advanced-trigger').click();
	await expect(page.getByTestId('product-filter-advanced-dialog')).toBeVisible();
	await page.getByTestId('product-filter-calories-min').fill('100');
	await expect(page.getByTestId('product-count')).toContainText('2');
	await page.getByTestId('product-filter-advanced-apply').click();
	await expect(page.getByTestId('product-filter-advanced-dialog')).toHaveCount(0);
	await expect(page.getByTestId('product-filter-advanced-trigger')).toContainText('Kcal ≥ 100');
	await expect(page.getByTestId('product-count')).toContainText('1 de 2');
	await expect(page.getByTestId('product-list')).toContainText('Rice');
	await expect(page.getByTestId('product-list')).not.toContainText('Apple');

	await page.getByTestId('product-filter-advanced-trigger').click();
	await page.getByTestId('product-filter-calories-max').fill('120');
	await page.getByTestId('product-filter-advanced-apply').click();
	await expect(page.getByTestId('product-filter-advanced-trigger')).toContainText('Kcal: 100–120');
	await expect(page.getByText('No hay coincidencias')).toBeVisible();
	await page.getByRole('button', { name: 'Limpiar filtros' }).click();
	await expect(page.getByTestId('product-filter-advanced-trigger')).toContainText('Sin filtros nutricionales aplicados');
	await expect(page.getByTestId('product-count')).toContainText('2');
	await expect(page.getByTestId('product-list')).toContainText('Apple');
	await expect(page.getByTestId('product-list')).toContainText('Rice');
});

test('mantiene productos operativos si fallan las estadisticas y permite reintentarlas', async ({ page, request }) => {
	const username = uniqueUsername();
	const productName = `Producto sin stats ${Date.now()}`;
	let failStats = true;

	await page.route('**/api/v1/products/stats', async (route) => {
		if (route.request().method() !== 'GET' || !failStats) {
			await route.continue();
			return;
		}

		await route.fulfill({
			status: 500,
			contentType: 'application/json',
			headers: { 'access-control-allow-origin': '*' },
			body: JSON.stringify({ message: 'Product stats unavailable' })
		});
	});

	await registerUser(request, username);
	await login(page, username);

	await expect(page.getByTestId('product-list')).toContainText('Apple');
	await expect(page.getByTestId('product-stats-error')).toContainText(
		'No se pudieron cargar las estadísticas de productos.'
	);
	await expect(page.locator('section[aria-label="Metricas del catalogo"]')).toContainText('—');

	await page.getByTestId('open-create-modal').click();
	await page.getByTestId('create-name').fill(productName);
	await page.getByTestId('create-description').fill('El alta debe completarse aunque fallen las estadísticas');
	await page.getByTestId('create-calories').fill('18');
	await page.getByTestId('create-carbohydrates').fill('3.9');
	await page.getByTestId('create-proteins').fill('0.9');
	await page.getByTestId('create-fats').fill('0.2');
	await page.getByRole('button', { name: 'Guardar producto' }).click();

	await expect(page.getByTestId('success-banner')).toContainText('Producto creado correctamente');
	await expect(page.getByTestId('product-list')).toContainText(productName);
	await expect(page.getByTestId('product-stats-error')).toBeVisible();

	failStats = false;
	await page.getByTestId('product-stats-retry').click();
	await expect(page.getByTestId('product-stats-error')).toHaveCount(0);
	await expect(page.locator('section[aria-label="Metricas del catalogo"]')).toContainText('Rice');
});

test('muestra el producto que antes caduca al actualizar el stock', async ({ page, request }) => {
	const username = uniqueUsername();

	await registerUser(request, username);
	await login(page, username);

	const appleCard = page.locator('[data-testid^="product-card-"]').filter({ hasText: 'Apple' });
	await appleCard.getByRole('button', { name: 'Añadir stock' }).click();
	await expect(page.getByTestId('stock-modal')).toBeVisible();
	await page.getByTestId('stock-quantity').fill('3');
	await page.getByTestId('stock-price').fill('2.50');
	await page.getByTestId('stock-expiration-date').fill('2030-01-01');
	await page.getByTestId('stock-entry-date').fill('2026-06-16');
	await page.getByRole('button', { name: 'Guardar stock' }).click();
	await expect(page.getByTestId('success-banner')).toContainText('Stock guardado correctamente');

	const riceCard = page.locator('[data-testid^="product-card-"]').filter({ hasText: 'Rice' });
	await riceCard.getByRole('button', { name: 'Añadir stock' }).click();
	await expect(page.getByTestId('stock-modal')).toBeVisible();
	await page.getByTestId('stock-quantity').fill('5');
	await page.getByTestId('stock-price').fill('1.25');
	await page.getByTestId('stock-expiration-date').fill('2029-01-01');
	await page.getByTestId('stock-entry-date').fill('2026-06-16');
	await page.getByRole('button', { name: 'Guardar stock' }).click();
	await expect(page.getByTestId('success-banner')).toContainText('Stock guardado correctamente');

	const metrics = page.locator('section[aria-label="Metricas del catalogo"]');
	await expect(metrics).toContainText('Producto que antes caduca');
	await expect(metrics).toContainText('Rice');
	await expect(metrics).toContainText('2029');
});

test('edita una entrada de stock sin pasar por borrado', async ({ page, request }) => {
	const username = uniqueUsername();
	const stockRequests: Array<{ method: string; path: string }> = [];

	await registerUser(request, username);
	page.on('request', (req) => {
		const url = new URL(req.url());
		if (url.origin === backendUrl && url.pathname.startsWith('/api/v1/stock')) {
			stockRequests.push({ method: req.method(), path: url.pathname });
		}
	});

	await login(page, username);

	const appleCard = page.locator('[data-testid^="product-card-"]').filter({ hasText: 'Apple' });
	await appleCard.getByRole('button', { name: 'Añadir stock' }).click();
	await expect(page.getByTestId('stock-modal')).toBeVisible();
	await page.getByTestId('stock-quantity').fill('3');
	await page.getByTestId('stock-price').fill('2.50');
	await page.getByTestId('stock-expiration-date').fill('2030-01-01');
	await page.getByTestId('stock-entry-date').fill('2026-06-16');
	await page.getByRole('button', { name: 'Guardar stock' }).click();
	await expect(page.getByTestId('success-banner')).toContainText('Stock guardado correctamente');

	await page.getByTestId('stock-edit-button-1').click();
	await expect(page.getByTestId('stock-modal')).toBeVisible();
	await expect(page.getByRole('heading', { level: 2, name: 'Editar stock' })).toBeVisible();
	await page.getByTestId('stock-price').fill('3.10');
	await page.getByRole('button', { name: 'Guardar cambios' }).click();

	await expect(page.getByTestId('success-banner')).toContainText('Stock actualizado correctamente');
	await expect(page.getByTestId('stock-modal')).toHaveCount(0);
	const inventorySection = page.locator('section').filter({
		has: page.getByRole('heading', { level: 2, name: 'Inventario' })
	});
	await expect(inventorySection.locator('table')).toContainText('3,10 €');
	expect(stockRequests.some((request) => request.method === 'PUT' && request.path === '/api/v1/stock/1')).toBe(
		true
	);
	expect(stockRequests.some((request) => request.path.endsWith('/remove'))).toBe(false);
});

test('en productos no carga recetas hasta entrar en esa pantalla', async ({ page, request }) => {
	const username = uniqueUsername();
	const backendRequests: string[] = [];

	await registerUser(request, username);
	page.on('request', (req) => {
		const url = new URL(req.url());
		if (url.origin === backendUrl) {
			backendRequests.push(url.pathname);
		}
	});

	await login(page, username);

	expect(backendRequests).toContain('/api/v1/products');
	expect(backendRequests).toContain('/api/v1/stock');
	expect(backendRequests).not.toContain('/api/v1/recipes');

	await page.getByRole('link', { name: 'Recetas' }).click();
	await expect(page.getByRole('heading', { level: 2, name: 'Recetas' })).toBeVisible();
	await expect.poll(() => backendRequests.includes('/api/v1/recipes')).toBeTruthy();
});

test('permite ver una receta desde su tarjeta', async ({ page, request }) => {
	const username = uniqueUsername();
	const recipeName = `Receta visible ${Date.now()}`;

	await registerUser(request, username);
	await login(page, username);

	await page.getByRole('link', { name: 'Recetas' }).click();
	await expect(page.getByRole('heading', { level: 2, name: 'Recetas' })).toBeVisible();

	await page.getByTestId('open-create-recipe-modal').click();
	await page.getByTestId('create-recipe-name').fill(recipeName);
	await page.getByTestId('create-recipe-description').fill('Receta para probar la vista');
	await page.getByTestId('create-recipe-instructions').fill('Mezclar y servir.');
	await chooseProductFromPicker(page, 'create-recipe-product-0', 1, 'Apple');
	await page.getByTestId('create-recipe-grams-0').fill('100');
	await page.getByRole('button', { name: 'Guardar receta' }).click();
	await expect(page.getByTestId('recipe-list')).toContainText(recipeName);

	const recipeCard = page.locator('[data-testid^="recipe-card-"]').filter({ hasText: recipeName });
	await recipeCard.getByRole('button', { name: 'Ver' }).click();

	await expect(page.getByTestId('recipe-view-modal')).toBeVisible();
	await expect(page.getByTestId('recipe-view-modal')).toContainText(recipeName);
	await expect(page.getByTestId('recipe-view-modal')).toContainText('Ingredientes');
	await page.getByTestId('recipe-view-modal').getByRole('button', { name: 'Cerrar modal' }).click();
});

test('crea una planificación y añade un menu diario con productos', async ({ page, request }) => {
	const username = uniqueUsername();
	const startDate = '2030-01-01';
	const endDate = '2030-01-05';

	await registerUser(request, username);
	await login(page, username);

	const appleCard = page.locator('[data-testid^="product-card-"]').filter({ hasText: 'Apple' });
	await appleCard.getByRole('button', { name: 'Añadir stock' }).click();
	await expect(page.getByTestId('stock-modal')).toBeVisible();
	await page.getByTestId('stock-quantity').fill('3');
	await page.getByTestId('stock-price').fill('2.50');
	await page.getByTestId('stock-expiration-date').fill('2030-01-01');
	await page.getByTestId('stock-entry-date').fill('2026-06-16');
	await page.getByRole('button', { name: 'Guardar stock' }).click();
	await expect(page.getByTestId('success-banner')).toContainText('Stock guardado correctamente');

	const riceCard = page.locator('[data-testid^="product-card-"]').filter({ hasText: 'Rice' });
	await riceCard.getByRole('button', { name: 'Añadir stock' }).click();
	await expect(page.getByTestId('stock-modal')).toBeVisible();
	await page.getByTestId('stock-quantity').fill('5');
	await page.getByTestId('stock-price').fill('1.25');
	await page.getByTestId('stock-expiration-date').fill('2029-01-01');
	await page.getByTestId('stock-entry-date').fill('2026-06-16');
	await page.getByRole('button', { name: 'Guardar stock' }).click();
	await expect(page.getByTestId('success-banner')).toContainText('Stock guardado correctamente');

	await page.getByRole('link', { name: 'Planificación' }).click();
	await expect(page.getByRole('heading', { level: 2, name: 'Planificación' })).toBeVisible();

	await page.getByRole('button', { name: 'Nueva semana' }).click();
	await expect(page.getByTestId('week-create-modal')).toBeVisible();
	await page.getByTestId('week-start-date').fill(startDate);
	await page.getByTestId('week-end-date').fill(endDate);
	await page.getByTestId('week-create-form').getByRole('button', { name: 'Crear semana' }).click();

	await expect(page.getByTestId('success-banner')).toContainText('Planificación creada correctamente');
	await expect(page.getByTestId(`week-day-card-${startDate}`)).toBeVisible();

	await page.getByTestId(`week-day-action-${startDate}`).click();
	await expect(page.getByTestId('week-day-modal')).toBeVisible();
	await page.getByTestId('week-day-date').fill(startDate);
	await page.getByTestId('week-section-day-part-0').selectOption({ label: 'Comida' });
	await chooseProductFromPicker(page, 'week-product-id-0-0', 1);
	await page.getByTestId('week-product-units-0-0').fill('2');
	await page.getByTestId('week-product-grams-0-0').fill('300');
	await page.getByTestId('week-product-sort-0-0').fill('10');
	await page.getByRole('button', { name: 'Guardar menu' }).click();

	await expect(page.getByTestId('success-banner')).toContainText('Menu diario guardado correctamente');
	await expect(page.getByTestId(`week-day-card-${startDate}`)).toContainText('Comida');
	await expect(page.getByTestId(`week-day-card-${startDate}`)).toContainText('Apple');

	const secondDate = '2030-01-02';
	await page.getByTestId(`week-day-action-${secondDate}`).click();
	await expect(page.getByTestId('week-day-modal')).toBeVisible();
	await page.getByTestId('week-day-date').fill(secondDate);
	await page.getByTestId('week-section-day-part-0').selectOption({ label: 'Cena' });
	await chooseProductFromPicker(page, 'week-product-id-0-0', 2);
	await page.getByTestId('week-product-units-0-0').fill('2');
	await page.getByTestId('week-product-grams-0-0').fill('300');
	await page.getByTestId('week-product-sort-0-0').fill('10');
	await page.getByRole('button', { name: 'Guardar menu' }).click();

	await expect(page.getByTestId('success-banner')).toContainText('Menu diario guardado correctamente');
	await expect(page.getByTestId(`week-day-card-${secondDate}`)).toContainText('Cena');
	await expect(page.getByTestId(`week-day-card-${secondDate}`)).toContainText('Rice');

	await expect(page.getByTestId('week-date-range')).toContainText('01/01/2030 al 05/01/2030');
	await expect(page.getByTestId('week-planned-days-card')).toContainText('2');
	await expect(page.getByTestId('week-calories-card')).toContainText('273');
	await expect(page.getByTestId('week-calories-card')).toContainText('01/01/2030');
	await expect(page.getByTestId('week-distinct-products-card')).toContainText('2');
	await expect(page.getByTestId('week-cost-card')).toContainText('7,50');
	await page.getByRole('button', { name: 'Ver stock' }).click();
	await expect(page.getByTestId('week-stock-summary')).toBeVisible();
	await expect(page.getByTestId('week-stock-summary')).toContainText('Apple');
	await expect(page.getByTestId('week-stock-summary')).toContainText('Rice');
	await expect(page.getByTestId('week-stock-row-1')).toContainText('5,00');
	await expect(page.getByTestId('week-stock-row-2')).toContainText('2,50');
});

test('enfoca el buscador al abrir el selector de productos desde planificación', async ({ page, request }) => {
	const username = uniqueUsername();
	const startDate = '2030-03-10';
	const endDate = '2030-03-16';

	await registerUser(request, username);
	await login(page, username);

	await page.getByRole('link', { name: 'Planificación' }).click();
	await page.getByRole('button', { name: 'Nueva semana' }).click();
	await page.getByTestId('week-start-date').fill(startDate);
	await page.getByTestId('week-end-date').fill(endDate);
	await page.getByTestId('week-create-form').getByRole('button', { name: 'Crear semana' }).click();

	await page.getByTestId(`week-day-action-${startDate}`).click();
	await expect(page.getByTestId('week-day-modal')).toBeVisible();
	await page.getByTestId('week-section-day-part-0').selectOption({ label: 'Comida' });

	await page.getByTestId('week-product-id-0-0').click();
	await expect(page.getByTestId('product-picker-modal')).toBeVisible();
	await expect(page.getByTestId('product-picker-filter-search')).toBeFocused();

	await page.getByTestId('product-picker-filter-search').fill('Ap');
	await page.getByTestId('product-picker-option-1').click();
	await page.getByRole('button', { name: 'Guardar menu' }).click();
	await expect(page.getByTestId('success-banner')).toContainText('Menu diario guardado correctamente');

	await page.getByTestId(`week-day-action-${startDate}`).click();
	await expect(page.getByTestId('week-day-modal')).toBeVisible();
	await page.getByTestId('week-product-id-0-0').click();
	await expect(page.getByTestId('product-picker-modal')).toBeVisible();
	await expect(page.getByTestId('product-picker-filter-search')).toBeFocused();
});

test('permite reabrir y editar un menu diario ya guardado', async ({ page, request }) => {
	const username = uniqueUsername();
	const startDate = '2030-02-10';
	const endDate = '2030-02-16';

	await registerUser(request, username);
	await login(page, username);

	await page.getByRole('link', { name: 'Planificación' }).click();
	await page.getByRole('button', { name: 'Nueva semana' }).click();
	await page.getByTestId('week-start-date').fill(startDate);
	await page.getByTestId('week-end-date').fill(endDate);
	await page.getByTestId('week-create-form').getByRole('button', { name: 'Crear semana' }).click();
	await expect(page.getByTestId('success-banner')).toContainText('Planificación creada correctamente');

	await page.getByTestId(`week-day-action-${startDate}`).click();
	await expect(page.getByTestId('week-day-modal')).toBeVisible();
	await chooseProductFromPicker(page, 'week-product-id-0-0', 1);
	await page.getByTestId('week-product-units-0-0').fill('1');
	await page.getByTestId('week-product-sort-0-0').fill('10');
	await page.getByRole('button', { name: 'Guardar menu' }).click();
	await expect(page.getByTestId('success-banner')).toContainText('Menu diario guardado correctamente');
	await expect(page.getByTestId(`week-day-card-${startDate}`)).toContainText('Apple');
	await expect(page.getByTestId(`week-day-action-${startDate}`)).toContainText('Editar menu');

	await page.getByTestId(`week-day-action-${startDate}`).click();
	await expect(page.getByTestId('week-day-modal')).toBeVisible();
	await chooseProductFromPicker(page, 'week-product-id-0-0', 2);
	await page.getByRole('button', { name: 'Guardar menu' }).click();
	await expect(page.getByTestId('success-banner')).toContainText('Menu diario guardado correctamente');
	await expect(page.getByTestId(`week-day-card-${startDate}`)).toContainText('Rice');
	await expect(page.getByTestId(`week-day-card-${startDate}`)).not.toContainText('Apple');
});

test('avisa cuando no hay partes del dia para añadir menus a la planificacion', async ({ page, request }) => {
	const username = uniqueUsername();
	const startDate = '2031-01-06';
	const endDate = '2031-01-07';

	await registerUser(request, username);
	await page.route('**/api/v1/planning/day-parts', async (route) => {
		if (route.request().method() !== 'GET') {
			await route.continue();
			return;
		}

		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			headers: { 'access-control-allow-origin': '*' },
			body: '[]'
		});
	});
	await login(page, username);

	await page.getByRole('link', { name: 'Planificación' }).click();
	await page.getByRole('button', { name: 'Nueva semana' }).click();
	await page.getByTestId('week-start-date').fill(startDate);
	await page.getByTestId('week-end-date').fill(endDate);
	await page.getByTestId('week-create-form').getByRole('button', { name: 'Crear semana' }).click();

	const warning = page.getByTestId('week-day-parts-warning');
	await expect(warning).toBeVisible();
	await expect(warning).toContainText('Añade una parte del día para continuar');
	await expect(page.getByTestId(`week-day-action-${startDate}`)).toBeDisabled();

	await warning.getByRole('button', { name: 'Añadir parte del día' }).click();
	await expect(page.getByRole('heading', { level: 2, name: 'Partes del dia' })).toBeVisible();
});

test('permite configurar partes del dia fuera del menu semanal', async ({ page, request }) => {
	const username = uniqueUsername();
	const dayPartName = `Merienda ${Date.now()}`;

	await registerUser(request, username);
	await login(page, username);

	await page.getByRole('link', { name: 'Partes del dia' }).click();
	await expect(page.getByRole('heading', { level: 2, name: 'Partes del dia' })).toBeVisible();
	await expect(page.getByRole('cell', { name: 'Comida', exact: true })).toBeVisible();

	await page.getByRole('button', { name: 'Nueva parte' }).click();
	await expect(page.getByTestId('day-part-modal')).toBeVisible();
	await page.getByTestId('day-part-name').fill(dayPartName);
	await page.getByTestId('day-part-description').fill('Tentempie de media tarde');
	await page.getByTestId('day-part-sort').fill('30');
	await page.getByRole('button', { name: 'Guardar parte' }).click();

	await expect(page.getByTestId('success-banner')).toContainText('Parte del dia creada correctamente');
	await expect(page.getByTestId('day-part-modal')).toHaveCount(0);
	await expect(page.getByRole('cell', { name: dayPartName, exact: true })).toBeVisible();
});

test('permite subir y visualizar una imagen de producto', async ({ page, request }) => {
	const username = uniqueUsername();
	const productName = `Producto con foto ${Date.now()}`;
	const imageBuffer = Buffer.from(
		'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFUlEQVR42mP8z/CfAQgwYGBgYAAAAAQAAVgD+T0qz4QAAAABJRU5ErkJggg==',
		'base64'
	);

	await registerUser(request, username);
	await login(page, username);

	await page.getByTestId('open-create-modal').click();
	await page.getByTestId('create-name').fill(productName);
	await page.getByTestId('create-description').fill('Producto para comprobar miniaturas');
	await page.getByTestId('create-calories').fill('10');
	await page.getByTestId('create-carbohydrates').fill('2');
	await page.getByTestId('create-proteins').fill('1');
	await page.getByTestId('create-fats').fill('0');
	await page.getByTestId('create-photo').setInputFiles({
		name: 'miniatura.png',
		mimeType: 'image/png',
		buffer: imageBuffer
	});

	await expect(page.getByText('miniatura.png')).toBeVisible();
	await page.getByRole('button', { name: 'Guardar producto' }).click();

	await expect(page.getByTestId('product-list')).toContainText(productName);
	const createdCard = page.locator('[data-testid^="product-card-"]').filter({ hasText: productName });
	const photoButton = createdCard.locator('[data-testid^="product-photo-"]');
	await expect(photoButton).toBeVisible();
	await photoButton.click();

	await expect(page.getByTestId('photo-preview-modal')).toBeVisible();
	await expect(page.getByTestId('photo-preview-modal')).toContainText(productName);
	await expect(page.getByTestId('photo-preview-modal')).toContainText('URL temporal');
	await expect(page.getByTestId('photo-preview-modal').locator('img')).toBeVisible();
});

test('permite editar un producto y reemplazar su imagen', async ({ page, request }) => {
	const username = uniqueUsername();
	const productName = `Producto editable con foto ${Date.now()}`;
	const updatedName = `Producto actualizado con foto ${Date.now()}`;
	const imageBuffer = Buffer.from(
		'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFUlEQVR42mP8z/CfAQgwYGBgYAAAAAQAAVgD+T0qz4QAAAABJRU5ErkJggg==',
		'base64'
	);

	await registerUser(request, username);
	await login(page, username);

	await page.getByTestId('open-create-modal').click();
	await page.getByTestId('create-name').fill(productName);
	await page.getByTestId('create-description').fill('Producto para probar la edicion con foto');
	await page.getByTestId('create-calories').fill('10');
	await page.getByTestId('create-carbohydrates').fill('2');
	await page.getByTestId('create-proteins').fill('1');
	await page.getByTestId('create-fats').fill('0');
	await page.getByTestId('create-photo').setInputFiles({
		name: 'original.png',
		mimeType: 'image/png',
		buffer: imageBuffer
	});
	await page.getByRole('button', { name: 'Guardar producto' }).click();

	await expect(page.getByTestId('success-banner')).toContainText('Producto creado correctamente');
	const createdCard = page.locator('[data-testid^="product-card-"]').filter({ hasText: productName });
	await createdCard.getByRole('button', { name: 'Editar' }).click();

	await expect(page.getByTestId('edit-modal')).toBeVisible();
	await page.getByTestId('edit-name').fill(updatedName);
	await page.getByTestId('edit-description').fill('Producto actualizado con nueva foto');
	await page.getByTestId('edit-photo').setInputFiles({
		name: 'updated.png',
		mimeType: 'image/png',
		buffer: imageBuffer
	});
	await expect(page.getByText('updated.png')).toBeVisible();
	await page.getByRole('button', { name: 'Actualizar producto' }).click();

	await expect(page.getByTestId('success-banner')).toContainText('Producto actualizado correctamente');
	await expect(page.getByTestId('product-list')).toContainText(updatedName);
	await expect(page.getByTestId('product-list')).not.toContainText(productName);
	const updatedCard = page.locator('[data-testid^="product-card-"]').filter({ hasText: updatedName });
	const updatedPhotoButton = updatedCard.locator('[data-testid^="product-photo-"]');
	await expect(updatedPhotoButton).toBeVisible();
	await updatedPhotoButton.click();
	await expect(page.getByTestId('photo-preview-modal')).toContainText(updatedName);
	await expect(page.getByTestId('photo-preview-modal')).toContainText('URL temporal');
	await expect(page.getByTestId('photo-preview-modal').locator('img')).toBeVisible();
});

test('permite seleccionar texto con el raton en campos editables', async ({ page, request }) => {
	const username = uniqueUsername();

	await page.goto('/');
	await expect(page.getByTestId('login-screen')).toBeVisible();
	await page.getByTestId('login-username').fill('usuario editable');
	await selectInputTextWithMouse(page, page.getByTestId('login-username'));
	await expect.poll(() => selectedTextLength(page.getByTestId('login-username'))).toBeGreaterThan(0);

	await registerUser(request, username);
	await login(page, username);
	await page.getByRole('button', { name: 'Editar' }).first().click();
	await expect(page.getByTestId('edit-modal')).toBeVisible();

	await page.getByTestId('edit-name').fill('Producto editable');
	await selectInputTextWithMouse(page, page.getByTestId('edit-name'));
	await expect.poll(() => selectedTextLength(page.getByTestId('edit-name'))).toBeGreaterThan(0);

	await page.getByTestId('edit-description').fill('Descripcion editable con varias palabras');
	await selectInputTextWithMouse(page, page.getByTestId('edit-description'));
	await expect.poll(() => selectedTextLength(page.getByTestId('edit-description'))).toBeGreaterThan(0);
});

test('muestra errores del backend cuando intentas duplicar un nombre', async ({ page, request }) => {
	const seed = Date.now();
	const username = uniqueUsername();
	const productName = `Duplicado ${seed}`;

	await registerUser(request, username);
	await login(page, username);

	await page.getByTestId('open-create-modal').click();
	await page.getByTestId('create-name').fill(productName);
	await page.getByTestId('create-description').fill('Producto base');
	await page.getByTestId('create-calories').fill('50');
	await page.getByTestId('create-carbohydrates').fill('10');
	await page.getByTestId('create-proteins').fill('1');
	await page.getByTestId('create-fats').fill('0');
	await page.getByRole('button', { name: 'Guardar producto' }).click();
	await expect(page.getByTestId('success-banner')).toContainText('Producto creado correctamente');

	await page.getByTestId('open-create-modal').click();
	await page.getByTestId('create-name').fill(productName);
	await page.getByTestId('create-description').fill('Intento duplicado');
	await page.getByTestId('create-calories').fill('50');
	await page.getByTestId('create-carbohydrates').fill('10');
	await page.getByTestId('create-proteins').fill('1');
	await page.getByTestId('create-fats').fill('0');
	await page.getByRole('button', { name: 'Guardar producto' }).click();

	await expect(page.getByTestId('error-banner')).toContainText('Product name already exists');
	await expect(page.getByTestId('create-modal')).toBeVisible();
});

test('cierra sesion y vuelve al acceso', async ({ page, request }) => {
	const username = uniqueUsername();

	await registerUser(request, username);
	await login(page, username);

	await page.getByTestId('logout-button').click();
	await expect(page.getByTestId('login-screen')).toBeVisible();

	await page.goto('/');
	await expect(page.getByTestId('login-screen')).toBeVisible();
});
