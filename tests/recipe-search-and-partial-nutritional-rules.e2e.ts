import { expect, test } from '@playwright/test';

const mockBackendUrl = process.env.MOCK_BACKEND_URL || 'http://127.0.0.1:4010';

test('mantiene la pantalla estable con una busqueda sin resultados y reglas nutricionales parciales', async ({
	page,
	request
}) => {
	await request.post(`${mockBackendUrl}/__reset`);

	const pageErrors: string[] = [];
	page.on('pageerror', (error) => {
		pageErrors.push(error.message);
	});

	await page.route('**/api/v1/planning/1', async (route) => {
		const response = await route.fetch();
		const body = await response.json();
		const nutritionalRules = body.nutritionalRules ?? {};

		body.nutritionalRules = {
			daily: {
				plannedDays: nutritionalRules.daily?.plannedDays ?? 1,
				calories: {
					value: nutritionalRules.daily?.calories?.value ?? 180,
					minimum: nutritionalRules.daily?.calories?.minimum ?? 100,
					maximum: nutritionalRules.daily?.calories?.maximum ?? 220
				}
			},
			weekly: {
				plannedDays: nutritionalRules.weekly?.plannedDays ?? 7,
				proteins: {
					value: nutritionalRules.weekly?.proteins?.value ?? 1.5,
					minimum: nutritionalRules.weekly?.proteins?.minimum ?? 1,
					maximum: nutritionalRules.weekly?.proteins?.maximum ?? 2
				}
			}
		};

		await route.fulfill({
			status: response.status(),
			headers: {
				...response.headers(),
				'content-type': 'application/json'
			},
			body: JSON.stringify(body)
		});
	});

	await page.goto('/');
	await page.getByTestId('login-username').fill('elias');
	await page.getByTestId('login-password').fill('secret-password');
	await page.getByTestId('login-submit').click();

	await page.getByRole('link', { name: 'Recetas' }).click();
	await expect(page.getByRole('heading', { name: 'No hay recetas' })).toBeVisible();
	await page.getByTestId('recipe-filter-search').fill('gachas');
	await expect(page.getByRole('heading', { name: 'No hay coincidencias' })).toBeVisible();

	await page.getByRole('link', { name: 'Planificación' }).click();
	await page.getByRole('button', { name: 'Nueva semana' }).click();
	await page.getByTestId('week-start-date').fill('2026-06-15');
	await page.getByTestId('week-end-date').fill('2026-06-21');
	await page.getByTestId('week-create-form').getByRole('button', { name: 'Crear semana' }).click();

	await expect(page.getByTestId('nutritional-evaluation')).toBeVisible();
	await page.getByTestId('week-day-action-2026-06-15').click();
	await page.getByTestId('week-day-form').getByRole('button', { name: 'Catálogo' }).click();
	await expect(page.getByTestId('product-picker-modal')).toBeVisible();
	await page.getByTestId('product-picker-option-1').click();
	await page.getByRole('button', { name: 'Guardar menu' }).click();

	const day = page.getByTestId('week-day-card-2026-06-15');
	await expect(day.getByTestId('daily-nutritional-evaluation')).toBeVisible();
	await expect(page.getByTestId('nutritional-evaluation-global')).toContainText('Reglas globales');

	expect(pageErrors).toEqual([]);
});
