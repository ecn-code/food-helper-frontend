import { expect, test, type APIRequestContext } from '@playwright/test';

const useRealBackend = process.env.E2E_REAL_BACKEND === '1';
const mockBackendUrl = process.env.MOCK_BACKEND_URL || 'http://127.0.0.1:4010';
const backendUrl = useRealBackend
	? (process.env.PUBLIC_BACKEND_BASE_URL ?? 'http://127.0.0.1:8080')
	: mockBackendUrl;
const testPassword = 'secret-password';

test.beforeEach(async ({ request }) => {
	if (!useRealBackend) {
		await request.post(`${mockBackendUrl}/__reset`);
	}
});

function uniqueUsername() {
	return `expired-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function registerUser(request: APIRequestContext, username: string) {
	const response = await request.post(`${backendUrl}/api/v1/auth/register`, {
		data: {
			username,
			password: testPassword,
			registrationCode: 'foodhelper-invite'
		}
	});

	expect([201, 409]).toContain(response.status());
}

test('muestra un dialogo al expirar la sesion y vuelve al login al aceptarlo', async ({ page, request }) => {
	const username = uniqueUsername();
	await registerUser(request, username);

	let forced401 = false;
	await page.route('**/api/v1/products**', async (route) => {
		if (forced401) {
			await route.continue();
			return;
		}

		forced401 = true;
		await route.fulfill({
			status: 401,
			contentType: 'application/json',
			body: JSON.stringify({
				status: 401,
				error: 'Unauthorized',
				message: 'Missing or invalid Bearer token',
				path: new URL(route.request().url()).pathname
			})
		});
	});

	await page.goto('/');
	await page.getByTestId('login-username').fill(username);
	await page.getByTestId('login-password').fill(testPassword);
	await page.getByTestId('login-submit').click();

	await expect(page.getByTestId('session-expired-dialog')).toBeVisible();
	await expect(page.getByTestId('session-expired-dialog')).toContainText(
		'La sesion ha caducado. Vuelve a iniciar sesion.'
	);

	await page.getByTestId('session-expired-confirm').click();
	await expect(page.getByTestId('login-screen')).toBeVisible();
});
