import { expect, test } from '@playwright/test';

test('keeps product sort orders unique when adding products to a proposed day', async ({ page, request }) => {
	const backendBaseUrl =
		process.env.MOCK_BACKEND_URL || `http://127.0.0.1:${process.env.MOCK_BACKEND_PORT || 4010}`;
	await request.post(`${backendBaseUrl}/__reset`);

	await page.goto('/');

	await page.getByTestId('login-username').fill('elias');
	await page.getByTestId('login-password').fill('secret-password');
	await page.getByTestId('login-submit').click();

	await page.getByRole('link', { name: 'Planificación' }).click();
	await page.getByRole('button', { name: 'Nueva semana' }).click();

	await page.getByTestId('week-start-date').fill('2026-06-15');
	await page.getByTestId('week-end-date').fill('2026-06-21');
	await page.getByTestId('week-create-form').getByRole('button', { name: 'Crear semana' }).click();

	await expect(page.getByTestId('success-banner')).toHaveText('Planificación creada correctamente');

	await page.getByTestId('week-day-action-2026-06-15').click();
	await expect(page.getByTestId('week-day-modal')).toBeVisible();

	await page.getByRole('button', { name: 'Catálogo' }).click();
	await expect(page.getByTestId('product-picker-modal')).toBeVisible();
	await page.getByTestId('product-picker-option-1').click();
	await expect(page.getByTestId('product-picker-modal')).toHaveCount(0);
	await expect(page.getByTestId('week-product-quantity-value-0-0')).toHaveAttribute('placeholder', 'Unidades');
	await expect(page.getByTestId('week-product-move-up-0-0')).toHaveCount(0);
	await expect(page.getByTestId('week-product-move-down-0-0')).toHaveCount(0);

	await page.getByRole('button', { name: 'Catálogo' }).click();
	await expect(page.getByTestId('product-picker-modal')).toBeVisible();
	await page.getByTestId('product-picker-option-2').click();
	await expect(page.getByTestId('product-picker-modal')).toHaveCount(0);
	await page.waitForTimeout(150);
	await expect(page.getByTestId('week-product-quantity-value-0-1')).toHaveAttribute('placeholder', 'Gramos');
	await expect(page.getByTestId('week-product-move-up-0-0')).toHaveCount(0);
	await expect(page.getByTestId('week-product-move-down-0-0')).toHaveCount(1);
	await expect(page.getByTestId('week-product-move-up-0-1')).toHaveCount(1);
	await expect(page.getByTestId('week-product-move-down-0-1')).toHaveCount(0);

	await page.getByTestId('week-product-move-down-0-0').click();
	await expect(page.getByTestId('week-product-quantity-value-0-0')).toHaveAttribute('placeholder', 'Gramos');
	await expect(page.getByTestId('week-product-quantity-value-0-1')).toHaveAttribute('placeholder', 'Unidades');
	await expect(page.getByTestId('week-product-move-up-0-0')).toHaveCount(0);
	await expect(page.getByTestId('week-product-move-down-0-0')).toHaveCount(1);
	await expect(page.getByTestId('week-product-move-up-0-1')).toHaveCount(1);
	await expect(page.getByTestId('week-product-move-down-0-1')).toHaveCount(0);
	await page.getByRole('button', { name: 'Guardar menu' }).click({ force: true });

	await expect(page.getByTestId('success-banner')).toHaveText('Menu diario guardado correctamente');
});
