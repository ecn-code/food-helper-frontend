import { expect, test } from '@playwright/test';

test('creates manual proposed week products without quantity and keeps absolute values', async ({ page, request }) => {
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

	await page.getByTestId('week-day-action-2026-06-15').click();
	await page.getByRole('button', { name: 'Manual' }).click();

	await expect(page.getByTestId('week-product-quantity-value-0-0')).toHaveCount(0);
	await expect(page.getByTestId('week-product-move-up-0-0')).toHaveCount(0);
	await expect(page.getByTestId('week-product-move-down-0-0')).toHaveCount(0);
	await page.getByTestId('week-product-name-0-0').fill('Homemade bowl');
	await page.getByTestId('week-product-calories-0-0').fill('180');
	await page.getByTestId('week-product-carbohydrates-0-0').fill('24');
	await page.getByTestId('week-product-proteins-0-0').fill('5');
	await page.getByTestId('week-product-fats-0-0').fill('6');

	await page.getByRole('button', { name: 'Guardar menu' }).click();
	await expect(page.getByTestId('success-banner')).toHaveText('Menu diario guardado correctamente');

	await page.getByTestId('week-day-action-2026-06-15').click();
	await expect(page.getByTestId('week-product-name-0-0')).toHaveValue('Homemade bowl');
	await expect(page.getByTestId('week-product-calories-0-0')).toHaveValue('180');
	await expect(page.getByTestId('week-product-carbohydrates-0-0')).toHaveValue('24');
	await expect(page.getByTestId('week-product-proteins-0-0')).toHaveValue('5');
	await expect(page.getByTestId('week-product-fats-0-0')).toHaveValue('6');
	await expect(page.getByTestId('week-product-quantity-value-0-0')).toHaveCount(0);
	await expect(page.getByTestId('week-product-move-up-0-0')).toHaveCount(0);
	await expect(page.getByTestId('week-product-move-down-0-0')).toHaveCount(0);
});
