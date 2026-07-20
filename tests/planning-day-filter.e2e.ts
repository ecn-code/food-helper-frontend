import { expect, test } from '@playwright/test';

test('filters planning days in list and calendar views', async ({ page, request }) => {
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
	await page.getByTestId('week-end-date').fill('2026-06-17');
	await page.getByTestId('week-create-form').getByRole('button', { name: 'Crear semana' }).click();

	await expect(page.getByTestId(/^week-day-card-/)).toHaveCount(3);
	await page.getByTestId('planning-day-filter-2026-06-16').click();
	await expect(page.getByTestId('week-day-card-2026-06-16')).toBeVisible();
	await expect(page.getByTestId(/^week-day-card-/)).toHaveCount(1);
	await expect(page.getByTestId('planning-day-filter-clear')).toBeVisible();

	await page.getByTestId('planning-view-mode-calendar').click();
	await expect(page.getByTestId('planning-calendar-cell-2026-06-16-1')).toBeVisible();
	await expect(page.getByTestId('planning-calendar-cell-2026-06-15-1')).toHaveCount(0);

	await page.getByTestId('planning-day-filter-clear').click();
	await page.getByTestId('planning-view-mode-list').click();
	await expect(page.getByTestId(/^week-day-card-/)).toHaveCount(3);
});
