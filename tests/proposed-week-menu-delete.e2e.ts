import { expect, test } from '@playwright/test';

test('deletes the active proposed week menu completely', async ({ page }) => {
	await page.goto('/');

	await page.getByTestId('login-username').fill('elias');
	await page.getByTestId('login-password').fill('secret-password');
	await page.getByTestId('login-submit').click();

	await page.getByRole('link', { name: 'Planificación' }).click();
	await page.getByRole('button', { name: 'Nueva semana' }).click();

	await page.getByTestId('week-start-date').fill('2026-06-15');
	await page.getByTestId('week-end-date').fill('2026-06-21');
	await page.getByTestId('week-create-form').getByRole('button', { name: 'Crear semana' }).click();
	await expect(page.getByTestId('week-date-range')).toContainText('15/06/2026');

	await page.getByRole('button', { name: 'Borrar planificación' }).click();
	await expect(page.getByTestId('week-delete-modal')).toBeVisible();
	await expect(page.getByTestId('week-delete-modal')).toContainText('15/06/2026');

	await Promise.all([
		page.waitForResponse((response) =>
			response.request().method() === 'DELETE' &&
			response.url().includes('/api/v1/planning/') &&
			response.status() === 204
		),
		page.getByTestId('week-delete-form').getByRole('button', { name: 'Borrar planificación' }).click()
	]);

	await expect(page.getByTestId('week-delete-modal')).toHaveCount(0);
	await expect(page.getByTestId('success-banner')).toContainText('Planificación eliminada correctamente');
	await expect(page.getByText('No hay una planificación activa')).toBeVisible();
	await expect(page.getByTestId('planning-menu-selector')).toHaveCount(0);

	await page.getByRole('button', { name: 'Nueva semana' }).click();
	await page.getByTestId('week-start-date').fill('2026-06-15');
	await page.getByTestId('week-end-date').fill('2026-06-21');
	await page.getByTestId('week-create-form').getByRole('button', { name: 'Crear semana' }).click();
	await page.getByRole('button', { name: 'Establecer semana' }).click();
	await expect(page.getByTestId('week-publish-modal')).toBeVisible();
	await page.getByTestId('week-publish-payer').selectOption('1');
	await page.getByTestId('week-publish-person-1').check();
	await Promise.all([
		page.waitForResponse((response) =>
			response.request().method() === 'POST' &&
			response.url().includes('/api/v1/planning/') &&
			response.url().endsWith('/menu') &&
			response.status() === 201
		),
		page.getByTestId('week-publish-form').getByRole('button', { name: 'Establecer semana' }).click()
	]);
	await expect(page.getByTestId('success-banner')).toContainText('Semana establecida correctamente');
});
