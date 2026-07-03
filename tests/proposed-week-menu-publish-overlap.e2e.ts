import { expect, test, type Page } from '@playwright/test';

const useRealBackend = process.env.E2E_REAL_BACKEND === '1';
const mockBackendUrl = process.env.MOCK_BACKEND_URL || 'http://127.0.0.1:4010';
const testPassword = 'secret-password';

test.beforeEach(async ({ request }) => {
	if (!useRealBackend) {
		await request.post(`${mockBackendUrl}/__reset`);
	}
});

async function login(page: Page) {
	await page.addInitScript(() => {
		localStorage.clear();
		sessionStorage.clear();
	});
	await page.goto('/');
	await page.getByTestId('app-ready').waitFor();
	await expect(page.getByTestId('login-screen')).toBeVisible();
	await page.getByTestId('login-username').fill('elias');
	await page.getByTestId('login-password').fill(testPassword);
	await page.getByTestId('login-submit').click();
	await expect(page.getByRole('heading', { level: 1, name: 'Productos' })).toBeVisible();
}

async function authHeaders(page: Page) {
	const session = await page.evaluate(() => JSON.parse(localStorage.getItem('foodhelper_session') ?? 'null'));
	return {
		Authorization: `${session.tokenType} ${session.accessToken}`
	};
}

async function seedProposedWeek(page: Page, startDate: string, endDate: string) {
	const headers = await authHeaders(page);
	const createResponse = await page.request.post(`${mockBackendUrl}/api/v1/proposed-week-menus`, {
		headers,
		data: { startDate, endDate, users: 1 }
	});
	expect(createResponse.ok()).toBeTruthy();
	return await createResponse.json();
}

async function seedProposedWeekDay(page: Page, weekId: number, startDate: string) {
	const headers = await authHeaders(page);
	const dayResponse = await page.request.put(`${mockBackendUrl}/api/v1/proposed-week-menus/${weekId}/days`, {
		headers: { ...headers, 'content-type': 'application/json' },
		data: {
			date: startDate,
			sections: [
				{
					dayPartId: 1,
					products: [{ productId: 1, sortOrder: 0 }]
				}
			]
		}
	});
	expect(dayResponse.ok()).toBeTruthy();
}

async function publishProposedWeek(page: Page, weekId: number) {
	const headers = await authHeaders(page);
	const publishResponse = await page.request.post(`${mockBackendUrl}/api/v1/planning/${weekId}/menu`, {
		headers: { ...headers, 'content-type': 'application/json' },
		data: { payerUserId: 1, personIds: [1] }
	});
	expect(publishResponse.ok()).toBeTruthy();
}

test('muestra el error del backend cuando la semana se solapa con otra planificación', async ({ page }) => {
	await login(page);

	const firstWeek = await seedProposedWeek(page, '2026-06-15', '2026-06-21');
	await seedProposedWeekDay(page, firstWeek.id, '2026-06-15');
	await publishProposedWeek(page, firstWeek.id);

	const secondWeek = await seedProposedWeek(page, '2026-06-18', '2026-06-24');
	await seedProposedWeekDay(page, secondWeek.id, '2026-06-18');

	await page.getByRole('link', { name: 'Planificación' }).click();
	await page.getByRole('button', { name: 'Establecer semana' }).click();
	await expect(page.getByTestId('week-publish-modal')).toBeVisible();
	await expect(page.getByTestId('week-publish-form').getByRole('button', { name: 'Establecer semana' })).toBeEnabled();
	await Promise.all([
		page.waitForResponse((response) =>
			response.request().method() === 'POST' &&
			response.url().includes('/api/v1/planning/') &&
			response.url().endsWith('/menu') &&
			response.status() === 400
		),
		page.getByTestId('week-publish-form').getByRole('button', { name: 'Establecer semana' }).click()
	]);
	await expect(page.getByTestId('error-banner')).toContainText(
		'Ya existe una planificación que se solapa con este rango: #1 · 15/06/2026 al 21/06/2026.'
	);
	await expect(page.getByTestId('week-publish-modal')).toBeVisible();
});
