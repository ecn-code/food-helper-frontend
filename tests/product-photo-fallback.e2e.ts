import { expect, test } from '@playwright/test';

const transparentPng = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO0X6x0AAAAASUVORK5CYII=',
	'base64'
);

test('falls back when a product image cannot be loaded', async ({ page }) => {
	await page.route('**/api/v1/media/**', async (route) => {
		await route.fulfill({
			status: 404,
			contentType: 'application/json',
			body: JSON.stringify({
				message: 'Media not found'
			})
		});
	});

	await page.goto('/');

	await page.getByTestId('login-username').fill('elias');
	await page.getByTestId('login-password').fill('secret-password');
	await page.getByTestId('login-submit').click();

	await expect(page.getByTestId('product-count')).toHaveText('2');

	await page.getByTestId('open-create-modal').click();
	await page.getByTestId('create-name').fill('Broken photo product');
	await page.getByTestId('create-description').fill('Product used to verify the image fallback');
	await page.getByTestId('create-grams-per-unit').fill('100');
	await page.getByTestId('create-calories').fill('10');
	await page.getByTestId('create-carbohydrates').fill('1');
	await page.getByTestId('create-proteins').fill('0');
	await page.getByTestId('create-fats').fill('0');
	await page.setInputFiles('[data-testid="create-photo"]', {
		name: 'broken-photo.png',
		mimeType: 'image/png',
		buffer: transparentPng
	});
	await page.getByRole('button', { name: 'Guardar producto' }).click();

	const desktopCard = page.locator('table [data-testid^="product-card-"]', { hasText: 'Broken photo product' });
	await expect(desktopCard).toContainText('Broken photo product');
	await expect(desktopCard.locator('[data-testid^="product-photo-fallback-"]')).toBeVisible();
	await expect(desktopCard.locator('img')).toHaveCount(0);

	await desktopCard.getByRole('button', { name: 'Editar' }).click();
	await expect(page.getByTestId('edit-modal')).toContainText('La imagen temporal no se pudo cargar');
});
