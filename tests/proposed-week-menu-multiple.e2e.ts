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
	await expect(page.getByTestId('planning-menu-selector').locator('option:checked')).toContainText('15/06/2026');
	await expect(page.getByTestId('week-users-count')).toHaveText('1 persona');

	await page.getByRole('button', { name: 'Nueva semana' }).click();
	await page.getByTestId('week-start-date').fill('2026-06-22');
	await page.getByTestId('week-end-date').fill('2026-06-28');
	await page.getByTestId('week-create-form').getByRole('button', { name: 'Crear semana' }).click();
	await expect(page.getByTestId('planning-menu-selector').locator('option:checked')).toContainText('22/06/2026');

	// Reloading exercises selection from GET /api/v1/planning instead of the in-memory active menu.
	await page.reload();
	await expect(page.getByTestId('planning-menu-selector').locator('option:checked')).toContainText('22/06/2026');

	const selector = page.getByTestId('planning-menu-selector');
	await expect(selector).toBeVisible();
	const options = await selector.locator('option').evaluateAll((elements) =>
		elements.map((option) => ({
			value: (option as HTMLOptionElement).value,
			text: option.textContent ?? ''
		}))
	);
	expect(options.length).toBeGreaterThanOrEqual(2);
	const firstMenuId = options.find((option) => option.text.includes('15/06/2026'))?.value ?? '';
	const secondMenuId = options.find((option) => option.text.includes('22/06/2026'))?.value ?? '';
	expect(firstMenuId).not.toBe('');
	expect(secondMenuId).not.toBe('');
	await expect(selector).toHaveValue(secondMenuId);
	await expect(selector.locator('option:checked')).toContainText('22/06/2026');

	await selector.selectOption(firstMenuId);
	await expect(selector).toHaveValue(firstMenuId);
	await expect(selector.locator('option:checked')).toContainText('15/06/2026');
	await expect.poll(() => page.evaluate(() => localStorage.getItem('foodhelper_selected_planning_menu_id'))).toBe(firstMenuId);

	await selector.selectOption(secondMenuId);
	await expect(selector).toHaveValue(secondMenuId);
	await expect(selector.locator('option:checked')).toContainText('22/06/2026');
});
