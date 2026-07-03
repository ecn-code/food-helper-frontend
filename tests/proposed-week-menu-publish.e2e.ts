import { expect, test } from '@playwright/test';

test('publishes a proposed week menu into an established snapshot', async ({ page, request }) => {
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
	await page.getByRole('button', { name: 'Catálogo' }).click();
	await expect(page.getByTestId('product-picker-modal')).toBeVisible();
	await page.getByTestId('product-picker-option-1').click();
	await expect(page.getByTestId('product-picker-modal')).toHaveCount(0);
	await page.getByRole('button', { name: 'Guardar menu' }).click();

	await page.getByRole('button', { name: 'Establecer semana' }).click();
	await expect(page.getByTestId('week-publish-modal')).toBeVisible();
	const publishModal = page.getByTestId('week-publish-modal');
	const payerOptions = await page.getByTestId('week-publish-payer').locator('option').evaluateAll((elements) =>
		elements.map((option) => option.textContent ?? '')
	);
	expect(payerOptions.length).toBeGreaterThan(1);
	expect(payerOptions).toContain('elias');
	await expect(publishModal.getByRole('heading', { name: 'Personas consumidoras' })).toBeVisible();
	await expect(publishModal.getByRole('button', { name: 'Automática' })).toHaveCount(0);
	await expect(publishModal.getByRole('button', { name: 'Manual' })).toHaveCount(0);
	await publishModal.getByRole('checkbox', { name: 'elias' }).check();
	await Promise.all([
		page.waitForResponse((response) =>
			response.request().method() === 'POST' &&
			response.url().includes('/api/v1/planning/') &&
			response.url().endsWith('/menu') &&
			response.status() === 201
		),
		page.getByTestId('week-publish-form').getByRole('button', { name: 'Establecer semana' }).click()
	]);

	await expect(page.getByTestId('week-publish-modal')).toHaveCount(0);
	await expect(page).toHaveURL(/#menus$/);
});
