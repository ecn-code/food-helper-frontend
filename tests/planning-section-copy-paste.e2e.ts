import { expect, test } from '@playwright/test';

test('copies a planning section and pastes it into another day', async ({ page, request }) => {
	const backendBaseUrl =
		process.env.MOCK_BACKEND_URL || `http://127.0.0.1:${process.env.MOCK_BACKEND_PORT || 4010}`;
	await request.post(`${backendBaseUrl}/__reset`);
	await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

	await page.goto('/');
	await page.getByTestId('login-username').fill('elias');
	await page.getByTestId('login-password').fill('secret-password');
	await page.getByTestId('login-submit').click();

	await page.getByRole('link', { name: 'Planificación' }).click();
	await page.getByRole('button', { name: 'Nueva', exact: true }).click();
	await page.getByTestId('week-start-date').fill('2026-06-15');
	await page.getByTestId('week-end-date').fill('2026-06-16');
	await page.getByTestId('week-create-form').getByRole('button', { name: 'Crear semana' }).click();

	await page.getByTestId('week-day-action-2026-06-15').click();
	await page.getByTestId('week-section-paste-0').click();
	await expect(page.getByTestId('week-section-paste-feedback')).toContainText(
		'No se pudo pegar: el portapapeles y la sección copiada no contienen datos válidos.'
	);
	await page.getByRole('button', { name: 'Manual' }).click();
	await page.getByTestId('week-product-name-0-0').fill('Desayuno casero');
	await page.getByTestId('week-product-calories-0-0').fill('350');
	await page.getByTestId('week-product-carbohydrates-0-0').fill('40');
	await page.getByTestId('week-product-proteins-0-0').fill('20');
	await page.getByTestId('week-product-fats-0-0').fill('10');
	await page.getByRole('button', { name: 'Guardar menu' }).click();
	await expect(page.getByTestId('success-banner')).toHaveText('Menu diario guardado correctamente');
	await expect(page.getByTestId('week-day-calories-2026-06-15')).toContainText('350 kcal');
	await expect(page.getByTestId('week-day-carbohydrates-2026-06-15')).toContainText('40 g hidr.');
	await expect(page.getByTestId('week-day-proteins-2026-06-15')).toContainText('20 g prot.');
	await expect(page.getByTestId('week-day-fats-2026-06-15')).toContainText('10 g grasa');
	await expect(page.getByTestId('week-section-nutrition-2026-06-15-1')).toContainText(
		'350 kcal 40 g hidr. 20 g prot. 10 g grasa'
	);

	await page.getByRole('button', { name: 'Copiar sección Desayuno' }).click();
	await page.getByTestId('week-day-action-2026-06-16').click();
	await expect(page.getByTestId('week-section-paste-0')).toBeEnabled();
	await page.evaluate(() =>
		navigator.clipboard.writeText(
			JSON.stringify({
				type: 'manual',
				productName: 'Producto del portapapeles',
				calories: 200,
				carbohydrates: 25,
				proteins: 15,
				fats: 8
			})
		)
	);
	await page.getByTestId('week-section-paste-0').click();

	await expect(page.getByTestId('week-section-day-part-0')).toHaveValue('1');
	await expect(page.getByTestId('week-product-name-0-0')).toHaveValue('Producto del portapapeles');
	await expect(page.getByTestId('week-product-calories-0-0')).toHaveValue('200');

	let saveRequests = 0;
	let savedPayload: unknown = null;
	await page.route('**/api/v1/planning/*/days', async (route) => {
		if (route.request().method() !== 'PUT') {
			await route.continue();
			return;
		}

		saveRequests += 1;
		savedPayload = route.request().postDataJSON();
		await new Promise((resolve) => setTimeout(resolve, 200));
		await route.continue();
	});

	await page.getByTestId('week-day-save').click();
	await expect(page.getByTestId('week-day-save')).toBeDisabled();
	await expect(page.getByTestId('week-day-save')).toContainText('Guardando menú…');
	await page.getByTestId('week-day-form').evaluate((form: HTMLFormElement) => form.requestSubmit());
	await expect(page.getByTestId('success-banner')).toHaveText('Menu diario guardado correctamente');
	expect(saveRequests).toBe(1);

	expect(savedPayload).toEqual({
		date: '2026-06-16',
		sections: [
			{
				dayPartId: 1,
				products: [
					{
						productId: null,
						productName: 'Producto del portapapeles',
						calories: 200,
						carbohydrates: 25,
						proteins: 15,
						fats: 8,
						sortOrder: 10
					}
				]
			}
		]
	});

	await page.getByTestId('week-day-action-2026-06-16').click();
	await page.evaluate(() => navigator.clipboard.writeText('contenido externo inválido'));
	await page.getByTestId('week-section-paste-0').click();
	await expect(page.getByTestId('week-product-name-0-0')).toHaveValue('Desayuno casero');
	await expect(page.getByTestId('week-product-calories-0-0')).toHaveValue('350');
});
