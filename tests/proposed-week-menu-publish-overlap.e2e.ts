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

async function chooseProductFromPicker(page: Page, triggerTestId: string, productId: number, search = '') {
	await page.getByTestId(triggerTestId).click();
	await expect(page.getByTestId('product-picker-modal')).toBeVisible();
	if (search) {
		await page.getByTestId('product-picker-filter-search').fill(search);
	}
	await page.getByTestId(`product-picker-option-${productId}`).click();
	await expect(page.getByTestId('product-picker-modal')).toHaveCount(0);
}

async function createPublishedWeek(page: Page, startDate: string, endDate: string, productId: number) {
	await page.getByRole('link', { name: 'Planificación' }).click();
	await page.getByRole('button', { name: 'Nueva semana' }).click();

	await page.getByTestId('week-start-date').fill(startDate);
	await page.getByTestId('week-end-date').fill(endDate);
	await page.getByTestId('week-create-form').getByRole('button', { name: 'Crear semana' }).click();

	await page.getByTestId(`week-day-action-${startDate}`).click();
	await chooseProductFromPicker(page, 'week-product-id-0-0', productId);
	await page.getByRole('button', { name: 'Guardar menu' }).click();

	await page.getByRole('button', { name: 'Establecer semana' }).click();
	await expect(page.getByTestId('week-publish-modal')).toBeVisible();
	await page.getByTestId('week-publish-payer').selectOption('1');
	await page.getByTestId('week-publish-person-1').check();
	await page.getByTestId('week-publish-form').getByRole('button', { name: 'Establecer semana' }).click();
	await expect(page.getByTestId('week-publish-modal')).toHaveCount(0);
}

test('bloquea el establecimiento cuando la semana se solapa con otra planificación', async ({ page }) => {
	await login(page);

	await createPublishedWeek(page, '2026-06-15', '2026-06-21', 1);

	await page.getByRole('link', { name: 'Planificación' }).click();
	await page.getByRole('button', { name: 'Nueva semana' }).click();

	await page.getByTestId('week-start-date').fill('2026-06-18');
	await page.getByTestId('week-end-date').fill('2026-06-24');
	await page.getByTestId('week-create-form').getByRole('button', { name: 'Crear semana' }).click();

	await page.getByTestId('week-day-action-2026-06-18').click();
	await chooseProductFromPicker(page, 'week-product-id-0-0', 2);
	await page.getByRole('button', { name: 'Guardar menu' }).click();

	await page.getByRole('button', { name: 'Establecer semana' }).click();
	await expect(page.getByTestId('week-publish-modal')).toBeVisible();
	await expect(page.getByTestId('week-publish-overlap-warning')).toBeVisible();
	await expect(page.getByTestId('week-publish-form').getByRole('button', { name: 'Establecer semana' })).toBeDisabled();
});
