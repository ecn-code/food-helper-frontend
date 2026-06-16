import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';

const useRealBackend = process.env.E2E_REAL_BACKEND === '1';
const mockBackendUrl = process.env.MOCK_BACKEND_URL || 'http://127.0.0.1:4010';
const backendUrl = useRealBackend
	? (process.env.BACKEND_BASE_URL ?? 'http://127.0.0.1:8080')
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
	await page.goto('/');
	await expect(page.getByTestId('login-screen')).toBeVisible();
	await page.getByTestId('login-username').fill(username);
	await page.getByTestId('login-password').fill(testPassword);
	await page.getByTestId('login-submit').click();
	await expect(page.getByRole('heading', { level: 1, name: 'Productos' })).toBeVisible();
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

test('registra un usuario desde la web y accede automaticamente', async ({ page }) => {
	const username = uniqueUsername();

	await page.goto('/');
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

test('devuelve 400 real al fallar el registro desde el endpoint web', async ({ request }) => {
	const response = await request.post('/api/auth/register', {
		data: {
			username: uniqueUsername(),
			password: testPassword,
			registrationCode: ''
		}
	});
	const body = await response.json();

	expect(response.status()).toBe(400);
	expect(body).toMatchObject({
		type: 'register',
		error: 'Revisa los campos marcados',
		fieldErrors: {
			registrationCode: 'El codigo es obligatorio'
		}
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
	await page.getByTestId('create-calories').fill('18');
	await page.getByTestId('create-carbohydrates').fill('3.9');
	await page.getByTestId('create-proteins').fill('0.9');
	await page.getByTestId('create-fats').fill('0.2');
	await page.getByRole('button', { name: 'Guardar producto' }).click();

	await expect(page.getByTestId('success-banner')).toContainText('Producto creado correctamente');
	await expect(page.getByTestId('product-list')).toContainText(productName);
	await expect(page.getByTestId('create-modal')).toHaveCount(0);

	const createdCard = page.locator('[data-testid^="product-card-"]').filter({ hasText: productName });
	await createdCard.getByRole('button', { name: 'Editar' }).click();

	await expect(page.getByTestId('edit-modal')).toBeVisible();
	await page.getByTestId('edit-name').fill(updatedName);
	await page.getByTestId('edit-description').fill('Tomate pera con sabor intenso');
	await page.getByTestId('edit-calories').fill('20');
	await page.getByTestId('edit-carbohydrates').fill('4.2');
	await page.getByTestId('edit-proteins').fill('1');
	await page.getByTestId('edit-fats').fill('0.1');
	await page.getByRole('button', { name: 'Actualizar producto' }).click();

	await expect(page.getByTestId('success-banner')).toContainText('Producto actualizado correctamente');
	await expect(page.getByTestId('product-list')).toContainText(updatedName);
	await expect(page.getByTestId('product-list')).not.toContainText(productName);
	await expect(page.getByTestId('edit-modal')).toHaveCount(0);

	const updatedCard = page.locator('[data-testid^="product-card-"]').filter({ hasText: updatedName });
	await updatedCard.getByRole('button', { name: 'Eliminar' }).click();
	await expect(page.getByTestId('delete-modal')).toBeVisible();
	await page.getByRole('button', { name: 'Si, eliminar' }).click();

	await expect(page.getByTestId('success-banner')).toContainText('Producto eliminado correctamente');
	await expect(page.getByText(updatedName)).toHaveCount(0);
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
	const photoButton = page.locator('[data-testid^="product-photo-"]').first();
	await expect(photoButton).toBeVisible();
	await photoButton.click();

	await expect(page.getByTestId('photo-preview-modal')).toBeVisible();
	await expect(page.getByTestId('photo-preview-modal')).toContainText(productName);
	await expect(page.getByTestId('photo-preview-modal')).toContainText('miniatura.png');
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
