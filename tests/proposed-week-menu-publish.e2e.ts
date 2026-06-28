import { expect, test } from '@playwright/test';

test('publishes a proposed week menu into an established snapshot', async ({ page }) => {
	await page.goto('/');

	await page.getByTestId('login-username').fill('elias');
	await page.getByTestId('login-password').fill('secret-password');
	await page.getByTestId('login-submit').click();

	await page.getByRole('link', { name: 'Planificación' }).click();
	await page.getByRole('button', { name: 'Nueva semana' }).click();

	await page.getByTestId('week-start-date').fill('2026-06-15');
	await page.getByTestId('week-end-date').fill('2026-06-21');
	await page.getByTestId('week-create-form').getByRole('button', { name: 'Crear semana' }).click();

	await page.getByTestId('week-day-action-2026-06-15').click();
	await page.getByTestId('week-product-id-0-0').click();
	await expect(page.getByTestId('product-picker-modal')).toBeVisible();
	await page.getByTestId('product-picker-option-1').click();
	await expect(page.getByTestId('product-picker-modal')).toHaveCount(0);
	await page.getByRole('button', { name: 'Guardar menu' }).click();

	await page.getByRole('button', { name: 'Establecer semana' }).click();

	await expect(page.getByTestId('success-banner')).toHaveText('Semana establecida correctamente');
	await expect(page.getByRole('heading', { name: 'Semana establecida' })).toBeVisible();
	await expect(page.getByTestId('week-date-range')).toContainText('15/06/2026');
	await expect(page.getByTestId('week-day-action-2026-06-15')).toHaveCount(0);
});
