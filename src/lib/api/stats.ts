import { request } from '$lib/api/backend';

export type ProductStatsMetric = {
	productId: number | null;
	productName: string;
	value: number;
	message: string | null;
};

export type ProductStatsEarliestExpiration = {
	productId: number | null;
	productName: string;
	quantity: number | null;
	expirationDate: string | null;
	message: string | null;
};

export type ProductStatsSummary = {
	productId: number;
	productName: string;
	totalQuantity: number;
	batchCount: number;
	nextExpirationDate: string | null;
	nextExpirationMessage: string | null;
};

export type ProductStatsResponse = {
	caloriesTop: ProductStatsMetric;
	carbohydratesTop: ProductStatsMetric;
	proteinsTop: ProductStatsMetric;
	fatsTop: ProductStatsMetric;
	stock: {
		totalQuantity: number;
		batchCount: number;
	};
	earliestExpiration: ProductStatsEarliestExpiration;
	summaries: ProductStatsSummary[];
};

export type RecipeStatsResponse = {
	activeRecipes: number;
	averageCalories: number;
	totalIngredients: number;
	recipesWithDerivedProduct: number;
};

function authHeaders(authorization: string) {
	return {
		Authorization: authorization
	};
}

export async function listProductStats(authorization: string) {
	return await request<ProductStatsResponse>('/api/v1/products/stats', {
		headers: authHeaders(authorization)
	});
}

export async function listRecipeStats(authorization: string) {
	return await request<RecipeStatsResponse>('/api/v1/recipes/stats', {
		headers: authHeaders(authorization)
	});
}
