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
