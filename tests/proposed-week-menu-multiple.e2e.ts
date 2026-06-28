import { expect, test } from '@playwright/test';

test('keeps multiple proposed weeks selectable', async ({ page }) => {
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

	await page.getByRole('button', { name: 'Nueva semana' }).click();
	await page.getByTestId('week-start-date').fill('2026-06-22');
	await page.getByTestId('week-end-date').fill('2026-06-28');
	await page.getByTestId('week-create-form').getByRole('button', { name: 'Crear semana' }).click();
	await expect(page.getByTestId('week-date-range')).toContainText('22/06/2026');

	const selector = page.getByTestId('proposed-week-menu-selector');
	await expect(selector).toBeVisible();
	await expect(selector.locator('option')).toHaveCount(3);
	const menus = await page.evaluate(() =>
		JSON.parse(localStorage.getItem('foodhelper_proposed_week_menus') ?? '[]') as { id: number; startDate: string }[]
	);
	expect(menus).toHaveLength(2);
	const firstMenuId = String(menus.find((menu) => menu.startDate === '2026-06-15')?.id);
	const secondMenuId = String(menus.find((menu) => menu.startDate === '2026-06-22')?.id);

	await selector.selectOption(firstMenuId);
	await expect(page.getByTestId('week-date-range')).toContainText('15/06/2026');

	await selector.selectOption(secondMenuId);
	await expect(page.getByTestId('week-date-range')).toContainText('22/06/2026');
});
