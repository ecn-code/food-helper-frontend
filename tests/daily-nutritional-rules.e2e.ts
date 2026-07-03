import { expect, test } from '@playwright/test';

const mockBackendUrl = process.env.MOCK_BACKEND_URL || 'http://127.0.0.1:4010';

test('muestra la evaluación de las reglas en cada menú diario', async ({ page, request }) => {
	await request.post(`${mockBackendUrl}/__reset`);

	await page.goto('/');
	await page.getByTestId('login-username').fill('elias');
	await page.getByTestId('login-password').fill('secret-password');
	await page.getByTestId('login-submit').click();

	await page.getByRole('link', { name: 'Reglas nutricionales' }).click();
	await page.getByRole('spinbutton', { name: 'Mínimo de Calorías diario' }).fill('100');
	await page.getByRole('spinbutton', { name: 'Máximo de Calorías diario' }).fill('200');
	await page.getByRole('spinbutton', { name: 'Mínimo de Carbohidratos diario' }).fill('20');
	await page.getByRole('spinbutton', { name: 'Máximo de Carbohidratos diario' }).fill('30');
	await page.getByRole('spinbutton', { name: 'Mínimo de Proteínas diario' }).fill('0.2');
	await page.getByRole('spinbutton', { name: 'Máximo de Proteínas diario' }).fill('1');
	await page.getByRole('spinbutton', { name: 'Máximo de Grasas diario' }).fill('1.5');
	await page.getByRole('spinbutton', { name: 'Mínimo de Calorías semanal' }).fill('0');
	await page.getByRole('spinbutton', { name: 'Máximo de Calorías semanal' }).fill('100');
	await page.getByRole('spinbutton', { name: 'Mínimo de Carbohidratos semanal' }).fill('0');
	await page.getByRole('spinbutton', { name: 'Máximo de Carbohidratos semanal' }).fill('10');
	await page.getByRole('spinbutton', { name: 'Mínimo de Proteínas semanal' }).fill('0.5');
	await page.getByRole('spinbutton', { name: 'Máximo de Proteínas semanal' }).fill('1');
	await page.getByRole('spinbutton', { name: 'Mínimo de Grasas semanal' }).fill('0');
	await page.getByRole('spinbutton', { name: 'Máximo de Grasas semanal' }).fill('1');
	await expect(page.getByRole('button', { name: 'Guardar reglas' })).toHaveCount(2);
	await page.getByRole('button', { name: 'Guardar reglas' }).first().click();
	await expect(page.getByRole('status')).toHaveText('Reglas nutricionales guardadas.');

	await page.getByRole('link', { name: 'Planificación' }).click();
	await page.getByRole('button', { name: 'Nueva semana' }).click();
	await page.getByTestId('week-start-date').fill('2026-06-15');
	await page.getByTestId('week-end-date').fill('2026-06-21');
	await page.getByTestId('week-create-form').getByRole('button', { name: 'Crear semana' }).click();

	await page.getByTestId('week-day-action-2026-06-15').click();
	await page.getByTestId('week-day-form').getByRole('button', { name: 'Catálogo' }).click();
	await expect(page.getByTestId('product-picker-modal')).toBeVisible();
	await page.getByTestId('product-picker-option-1').click();
	await page.getByRole('button', { name: 'Guardar menu' }).click();

	const day = page.getByTestId('week-day-card-2026-06-15');
	await expect(day.getByTestId('daily-nutritional-evaluation')).toBeVisible();
	await expect(day.getByTestId('daily-nutritional-status-calories')).toHaveText('Bajo');
	await expect(day.getByTestId('daily-nutritional-status-carbohydrates')).toHaveText('Correcto');
	await expect(day.getByTestId('daily-nutritional-status-proteins')).toHaveText('Correcto');
	await expect(day.getByTestId('daily-nutritional-status-fats')).toHaveText('Correcto');
	await expect(day).not.toContainText('Objetivo 100–200 kcal');
	await expect(day).not.toContainText('Objetivo 20–30 g');
	await expect(page.getByTestId('nutritional-evaluation-global')).toContainText('Reglas globales');
	await expect(page.getByTestId('nutritional-evaluation-global')).toContainText('Bajo');
	await expect(page.getByTestId('nutritional-evaluation-global')).toContainText('Alto');
});
