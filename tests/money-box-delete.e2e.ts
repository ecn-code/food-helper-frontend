import { expect, test } from '@playwright/test';

const mockBackendUrl = process.env.MOCK_BACKEND_URL || 'http://127.0.0.1:4010';

test.skip(process.env.E2E_REAL_BACKEND === '1', 'El backend real todavía no expone los endpoints DELETE de huchas.');

test.beforeEach(async ({ request }) => {
	await request.post(`${mockBackendUrl}/__reset`);
});

test('elimina movimientos manuales y huchas compartidas', async ({ page }) => {
	await page.goto('/');
	await page.getByTestId('login-username').fill('elias');
	await page.getByTestId('login-password').fill('secret-password');
	await page.getByTestId('login-submit').click();

	await page.getByRole('link', { name: 'Huchas' }).click();
	await expect(page.getByTestId('money-box-panel')).toBeVisible();

	await page.getByTestId('money-box-name').fill('Vacaciones');
	await page.getByRole('button', { name: 'Crear hucha' }).click();
	await expect(page.getByTestId('money-box-1000')).toContainText('Vacaciones');

	await page.getByTestId('money-movement-amount').fill('25');
	await page.getByTestId('money-movement-description').fill('Ahorro inicial');
	await page.getByTestId('money-movement-submit').click();
	await expect(page.getByTestId('money-box-balance')).toContainText('25,00');

	page.once('dialog', (dialog) => dialog.accept());
	await page.getByRole('button', { name: 'Eliminar movimiento Ahorro inicial' }).click();
	await expect(page.getByRole('status')).toHaveText('Movimiento eliminado.');
	await expect(page.getByText('Ahorro inicial')).toHaveCount(0);
	await expect(page.getByTestId('money-box-balance')).toContainText('0,00');

	page.once('dialog', (dialog) => dialog.accept());
	await page.getByTestId('money-box-delete').click();

	await expect(page.getByRole('status')).toHaveText('Hucha eliminada.');
	await expect(page.getByText('Vacaciones', { exact: true })).toHaveCount(0);
	await expect(page.getByTestId('money-box-delete')).toHaveCount(0);
});
