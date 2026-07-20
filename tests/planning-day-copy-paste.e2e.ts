import { expect, test } from '@playwright/test';

test('copies a complete planning day and pastes it into another day', async ({ page, request }) => {
	const backendBaseUrl =
		process.env.MOCK_BACKEND_URL || `http://127.0.0.1:${process.env.MOCK_BACKEND_PORT || 4010}`;
	await request.post(`${backendBaseUrl}/__reset`);
	await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

	await page.goto('/');
	await page.getByTestId('login-username').fill('elias');
	await page.getByTestId('login-password').fill('secret-password');
	await page.getByTestId('login-submit').click();

	await page.getByRole('link', { name: 'Planificación' }).click();
	await page.getByRole('button', { name: 'Nueva semana' }).click();
	await page.getByTestId('week-start-date').fill('2026-06-15');
	await page.getByTestId('week-end-date').fill('2026-06-16');
	await page.getByTestId('week-create-form').getByRole('button', { name: 'Crear semana' }).click();

	await page.getByTestId('week-day-action-2026-06-15').click();
	await page.getByRole('button', { name: 'Manual' }).click();
	await page.getByTestId('week-product-name-0-0').fill('Desayuno casero');
	await page.getByTestId('week-product-calories-0-0').fill('350');
	await page.getByTestId('week-product-carbohydrates-0-0').fill('40');
	await page.getByTestId('week-product-proteins-0-0').fill('20');
	await page.getByTestId('week-product-fats-0-0').fill('10');
	await page.getByRole('button', { name: 'Guardar menu' }).click();

	await page.getByTestId('week-day-copy-2026-06-15').click();
	await expect(page.getByTestId('week-day-copy-feedback-2026-06-15')).toContainText('Menú diario copiado');
	expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('foodhelper/planning-day');

	await page.getByTestId('week-day-action-2026-06-16').click();
	await page.getByTestId('week-day-paste').click();
	await expect(page.getByTestId('week-day-paste-feedback')).toContainText('Menú diario pegado');
	await expect(page.getByTestId('week-day-date')).toHaveValue('2026-06-16');
	await expect(page.getByTestId('week-section-day-part-0')).toHaveValue('1');
	await expect(page.getByTestId('week-product-name-0-0')).toHaveValue('Desayuno casero');
	await expect(page.getByTestId('week-product-calories-0-0')).toHaveValue('350');

	const saveRequest = page.waitForRequest(
		(request) => request.method() === 'PUT' && request.url().includes('/api/v1/planning/') && request.url().endsWith('/days')
	);
	await page.getByTestId('week-day-save').click();
	const savedPayload = (await saveRequest).postDataJSON();
	expect(savedPayload).toMatchObject({
		date: '2026-06-16',
		sections: [{ dayPartId: 1, products: [{ productName: 'Desayuno casero', calories: 350 }] }]
	});
});
