import type {
	EstablishedWeekMenuRecipeProductionResponse,
	EstablishedWeekMenuWeekStockItemResponse
} from '$lib/api/established-week-menus';

export type PositiveStockProduct = {
	productId: number;
	productName: string;
	weekStockUnits: number;
	recipeProductionUnits: number;
	positiveUnits: number;
};

export function aggregatePositiveStockProducts(
	weekStock: EstablishedWeekMenuWeekStockItemResponse[],
	recipeProductions: EstablishedWeekMenuRecipeProductionResponse[]
) {
	const products = new Map<number, PositiveStockProduct>();
	const getProduct = (productId: number, productName: string) => {
		const existing = products.get(productId);
		if (existing) return existing;
		const created = { productId, productName, weekStockUnits: 0, recipeProductionUnits: 0, positiveUnits: 0 };
		products.set(productId, created);
		return created;
	};

	for (const item of weekStock) {
		const quantity = Number(item.quantity ?? 0);
		if (quantity <= 0) continue;
		const product = getProduct(item.productId, item.productName);
		product.weekStockUnits += quantity;
		product.positiveUnits += quantity;
	}

	for (const production of recipeProductions) {
		const units = Number(production.units ?? 0);
		if (production.transferred || units <= 0) continue;
		const product = getProduct(production.productId, production.productName);
		product.recipeProductionUnits += units;
		product.positiveUnits += units;
	}

	return [...products.values()];
}
