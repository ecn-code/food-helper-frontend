import { describe, expect, it } from 'vitest';
import { aggregatePositiveStockProducts } from '$lib/menu-close-stock';

describe('aggregatePositiveStockProducts', () => {
	it('agrega por producto el stock semanal y las recetas pendientes', () => {
		const products = aggregatePositiveStockProducts(
			[
				{ productId: 7, productName: 'Sopa', quantity: 1, price: 2 },
				{ productId: 7, productName: 'Sopa', quantity: 0.5, price: 3 }
			],
			[
				{ id: 1, recipeId: 2, recipeName: 'Sopa', productId: 7, productName: 'Sopa', units: 4, sortOrder: 10, transferred: false, transferType: null, stockEntryId: null, transferredAt: null },
				{ id: 2, recipeId: 2, recipeName: 'Sopa', productId: 7, productName: 'Sopa', units: 9, sortOrder: 20, transferred: true, transferType: 'MANUAL', stockEntryId: 3, transferredAt: '2026-07-01T10:00:00' }
			]
		);

		expect(products).toEqual([
			{ productId: 7, productName: 'Sopa', weekStockUnits: 1.5, recipeProductionUnits: 4, positiveUnits: 5.5 }
		]);
	});
});
