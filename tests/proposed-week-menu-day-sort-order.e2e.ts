import { expect, test } from '@playwright/test';

test('keeps product sort orders unique when adding products to a proposed day', async ({ page }) => {
	await page.goto('/');

	await page.getByTestId('login-username').fill('elias');
	await page.getByTestId('login-password').fill('secret-password');
	await page.getByTestId('login-submit').click();

	await page.getByRole('link', { name: 'Semana propuesta' }).click();
	await page.getByRole('button', { name: 'Nueva semana' }).click();

	await page.getByTestId('week-start-date').fill('2026-06-15');
	await page.getByTestId('week-end-date').fill('2026-06-21');
	await page.getByTestId('week-create-form').getByRole('button', { name: 'Crear semana' }).click();

	await expect(page.getByTestId('success-banner')).toHaveText('Semana propuesta creada correctamente');

	await page.getByTestId('week-day-action-2026-06-15').click();
	await expect(page.getByTestId('week-day-modal')).toBeVisible();

	await expect(page.getByTestId('week-product-sort-0-0')).toHaveValue('10');
	await page.getByRole('button', { name: 'Añadir producto' }).click();
	await expect(page.getByTestId('week-product-sort-0-1')).toHaveValue('20');

	await page.getByTestId('week-product-id-0-0').selectOption('1');
	await page.getByTestId('week-product-id-0-1').selectOption('2');
	await page.getByTestId('week-product-sort-0-1').fill('10');
	await page.getByRole('button', { name: 'Guardar menu' }).click();

	await expect(page.getByText('El orden debe ser unico dentro de la seccion')).toHaveCount(2);
	await expect(page.getByTestId('week-day-modal')).toBeVisible();

	await page.getByTestId('week-product-sort-0-1').fill('20');
	await page.getByRole('button', { name: 'Guardar menu' }).click();

	await expect(page.getByTestId('success-banner')).toHaveText('Menu diario guardado correctamente');
	await expect(page.getByTestId('week-day-card-2026-06-15')).toContainText('2 productos');
});
