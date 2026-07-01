import { expect, test } from '@playwright/test';

test('shows menu stats in comidas header with table and calendar views', async ({ page, request }) => {
	const backendBaseUrl =
		process.env.MOCK_BACKEND_URL || `http://127.0.0.1:${process.env.MOCK_BACKEND_PORT || 4010}`;
	const startDate = '2026-06-15';
	const endDate = '2026-06-17';

	await page.goto('/');

	await page.getByTestId('login-username').fill('elias');
	await page.getByTestId('login-password').fill('secret-password');
	await page.getByTestId('login-submit').click();

	const session = await page.evaluate(() => localStorage.getItem('foodhelper_session'));
	expect(session).not.toBeNull();
	const authSession = JSON.parse(session ?? 'null') as { accessToken: string; tokenType: string; userId: number };
	const authorization = `${authSession.tokenType} ${authSession.accessToken}`;
	const headers = {
		Authorization: authorization,
		'content-type': 'application/json'
	};

	const planningResponse = await request.post(`${backendBaseUrl}/api/v1/planning`, {
		headers,
		data: {
			startDate,
			endDate
		}
	});
	expect(planningResponse.ok()).toBeTruthy();
	const planning = (await planningResponse.json()) as { id: number };

	const dayResponse = await request.put(`${backendBaseUrl}/api/v1/planning/${planning.id}/days`, {
		headers,
		data: {
			date: startDate,
			sections: [
				{
					dayPartId: 1,
					products: [
						{
							productId: 1,
							units: 1,
							sortOrder: 10
						}
					]
				}
			]
		}
	});
	expect(dayResponse.ok()).toBeTruthy();

	const publishResponse = await request.post(`${backendBaseUrl}/api/v1/planning/${planning.id}/menu`, {
		headers,
		data: {
			payerUserId: authSession.userId
		}
	});
	expect(publishResponse.ok()).toBeTruthy();

	await page.goto('/#menus');
	await expect(page.getByRole('heading', { name: 'Menú' })).toBeVisible();
	await expect(page.getByRole('heading', { name: /^Comidas$/ })).toBeVisible();
	await expect(page.getByTestId('menu-stats-panel')).toBeVisible({ timeout: 15000 });
	await expect(page.getByTestId('menu-edit-button')).toBeVisible({ timeout: 15000 });
	await expect(page.getByTestId('menu-delete-button')).toBeVisible({ timeout: 15000 });
	await expect(page.getByTestId('menu-meals-rows')).toContainText('Desayuno', { timeout: 15000 });

	await page.getByTestId('menu-view-mode-calendar').click();
	await expect(page.getByTestId('menu-calendar-view')).toBeVisible();
	await expect(page.getByTestId('menu-calendar-grid')).toContainText('Sin comida');

	await page.getByTestId('menu-edit-button').click();
	await expect(page.getByRole('heading', { name: 'Menú' })).toBeVisible();
	await expect(page.getByRole('heading', { name: /^Planificación$/ })).toHaveCount(0);
	await expect(page.getByTestId('week-day-modal')).toBeVisible();
	await expect(page.getByTestId('week-day-form')).toBeVisible();
});
