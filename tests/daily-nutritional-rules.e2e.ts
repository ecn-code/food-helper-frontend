import { expect, test } from '@playwright/test';

const mockBackendUrl = process.env.MOCK_BACKEND_URL || 'http://127.0.0.1:4010';

test('muestra la evaluación de las reglas en cada menú diario', async ({ page, request }) => {
	await request.post(`${mockBackendUrl}/__reset`);

	await page.goto('/');
	await page.getByTestId('login-username').fill('elias');
	await page.getByTestId('login-password').fill('secret-password');
	await page.getByTestId('login-submit').click();

	await page.getByRole('link', { name: 'Reglas nutricionales' }).click();
	await page.getByRole('spinbutton', { name: 'Mínimo de Calorías' }).fill('100');
	await page.getByRole('spinbutton', { name: 'Máximo de Calorías' }).fill('200');
	await page.getByRole('spinbutton', { name: 'Mínimo de Carbohidratos' }).fill('10');
	await page.getByRole('spinbutton', { name: 'Máximo de Carbohidratos' }).fill('20');
	await page.getByRole('spinbutton', { name: 'Mínimo de Proteínas' }).fill('0.2');
	await page.getByRole('spinbutton', { name: 'Máximo de Proteínas' }).fill('1');
	await page.getByRole('button', { name: 'Guardar reglas' }).click();
	await expect(page.getByRole('status')).toHaveText('Reglas nutricionales guardadas.');

	await page.getByRole('link', { name: 'Planificación' }).click();
	await page.getByRole('button', { name: 'Nueva semana' }).click();
	await page.getByTestId('week-start-date').fill('2026-06-15');
	await page.getByTestId('week-end-date').fill('2026-06-21');
	await page.getByTestId('week-create-form').getByRole('button', { name: 'Crear semana' }).click();

	await page.getByTestId('week-day-action-2026-06-15').click();
	await page.getByTestId('week-product-id-0-0').click();
	await page.getByTestId('product-picker-option-1').click();
	await page.getByRole('button', { name: 'Guardar menu' }).click();

	const day = page.getByTestId('week-day-card-2026-06-15');
	await expect(day.getByTestId('daily-nutritional-evaluation')).toBeVisible();
	await expect(day.getByTestId('daily-nutritional-status-calories')).toHaveText('Bajo');
	await expect(day.getByTestId('daily-nutritional-status-carbohydrates')).toHaveText('Alto');
	await expect(day.getByTestId('daily-nutritional-status-proteins')).toHaveText('Correcto');
	await expect(day.getByTestId('daily-nutritional-status-fats')).toHaveText('Sin regla');
	await expect(day).toContainText('Objetivo 100–200 kcal');
	await expect(day).toContainText('Sin límites configurados');
});
