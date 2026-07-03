import { request } from '$lib/api/backend';

export type NutritionalValues = {
	calories: number;
	carbohydrates: number;
	proteins: number;
	fats: number;
};

export type RecipeIngredientAssignment = {
	productId: number;
	quantity: number;
	quantityType: string;
};

export type RecipeIngredientPayload = {
	productId: number;
	productName: string;
	quantity: number;
	quantityType: string;
	nutritionalValues: NutritionalValues;
};

export type RecipeDerivedProductPayload = {
	productId: number;
	name: string;
	unitsProduced: number;
	stockFromComposition: boolean;
	ingredients: RecipeIngredientPayload[];
};

export type PhotoUploadPayload = {
	fileName: string;
	contentType: string;
	base64Data: string;
};

export type CreateRecipeRequest = {
	name: string;
	description: string;
	instructions: string;
	products: RecipeIngredientAssignment[];
	photo?: PhotoUploadPayload;
};

export type UpdateRecipeRequest = CreateRecipeRequest & {
	stockFromComposition?: boolean;
};

export type CreateRecipeDerivedProductRequest = {
	name: string;
	units: number;
	stockFromComposition: boolean;
};

export type RecipePayload = {
	id: number;
	name: string;
	description: string;
	instructions: string;
	nutritionalValues: NutritionalValues;
	products: RecipeIngredientPayload[];
	derivedProduct: RecipeDerivedProductPayload | null;
	photo: string | null;
};

export type PaginatedResponse<T> = {
	items: T[];
	page: number;
	size: number;
	totalElements: number;
	totalPages: number;
};

export type ListRecipesParams = {
	page?: number;
	size?: number;
	search?: string;
	derived?: 'all' | 'with-derived' | 'without-derived';
	caloriesMin?: number | string;
	caloriesMax?: number | string;
	carbohydratesMin?: number | string;
	carbohydratesMax?: number | string;
	proteinsMin?: number | string;
	proteinsMax?: number | string;
	fatsMin?: number | string;
	fatsMax?: number | string;
};

const DEFAULT_PAGE_SIZE = 20;

function authHeaders(authorization: string) {
	return {
		Authorization: authorization
	};
}

function sanitizeRecipeRequest(values: CreateRecipeRequest): CreateRecipeRequest & {
	stockFromComposition?: boolean;
} {
	return {
		name: values.name.trim(),
		description: values.description.trim(),
		instructions: values.instructions.trim(),
		products: values.products.map((product) => ({
			productId: Number(product.productId),
			quantity: Number(product.quantity),
			quantityType: product.quantityType.trim()
		})),
		photo: values.photo
			? {
					fileName: values.photo.fileName.trim(),
					contentType: values.photo.contentType.trim(),
					base64Data: values.photo.base64Data
				}
			: undefined,
		...(typeof (values as UpdateRecipeRequest).stockFromComposition === 'boolean'
			? { stockFromComposition: (values as UpdateRecipeRequest).stockFromComposition }
			: {})
	};
}

function sanitizeDerivedProductRequest(values: CreateRecipeDerivedProductRequest) {
	return {
		name: values.name.trim(),
		units: Number(values.units),
		stockFromComposition: Boolean(values.stockFromComposition)
	};
}

function normalizePage(value: number | undefined, fallback: number) {
	return Math.max(0, Math.trunc(value ?? fallback));
}

function normalizePageSize(value: number | undefined) {
	return Math.min(100, Math.max(1, Math.trunc(value ?? DEFAULT_PAGE_SIZE)));
}

function buildPageQuery(params: ListRecipesParams = {}) {
	const searchParams = new URLSearchParams();
	searchParams.set('page', String(normalizePage(params.page, 0)));
	searchParams.set('size', String(normalizePageSize(params.size)));
	if (params.search?.trim()) searchParams.set('search', params.search.trim());
	if (params.derived === 'with-derived') {
		searchParams.set('hasDerivedProduct', 'true');
	} else if (params.derived === 'without-derived') {
		searchParams.set('hasDerivedProduct', 'false');
	}
	for (const key of ['caloriesMin', 'caloriesMax', 'carbohydratesMin', 'carbohydratesMax', 'proteinsMin', 'proteinsMax', 'fatsMin', 'fatsMax'] as const) {
		const value = params[key];
		if (value !== undefined && value !== null && String(value).trim() !== '') {
			searchParams.set(key, String(value));
		}
	}
	return searchParams.toString();
}

export async function createRecipe(values: CreateRecipeRequest, authorization: string) {
	return await request<RecipePayload>('/api/v1/recipes', {
		method: 'POST',
		headers: authHeaders(authorization),
		body: JSON.stringify(sanitizeRecipeRequest(values))
	});
}

export async function listRecipesPage(authorization: string, params: ListRecipesParams = {}) {
	return await request<PaginatedResponse<RecipePayload>>(`/api/v1/recipes?${buildPageQuery(params)}`, {
		headers: authHeaders(authorization)
	});
}

export async function listRecipes(authorization: string, params: { size?: number } = {}) {
	const recipes: RecipePayload[] = [];
	let page = 0;
	let totalPages = 1;

	do {
		const response = await listRecipesPage(authorization, { page, size: params.size ?? DEFAULT_PAGE_SIZE });
		recipes.push(...response.items);
		totalPages = Math.max(response.totalPages, 1);
		page += 1;
	} while (page < totalPages);

	return recipes;
}

export async function updateRecipe(id: number, values: UpdateRecipeRequest, authorization: string) {
	return await request<RecipePayload>(`/api/v1/recipes/${id}`, {
		method: 'PUT',
		headers: authHeaders(authorization),
		body: JSON.stringify(sanitizeRecipeRequest(values))
	});
}

export async function deleteRecipe(id: number, authorization: string) {
	await request<void>(`/api/v1/recipes/${id}`, {
		method: 'DELETE',
		headers: {
			...authHeaders(authorization),
			'content-type': 'application/json'
		}
	});
}

export async function createDerivedProduct(
	id: number,
	values: CreateRecipeDerivedProductRequest,
	authorization: string
) {
	return await request<RecipeDerivedProductPayload>(`/api/v1/recipes/${id}/derived-product`, {
		method: 'POST',
		headers: authHeaders(authorization),
		body: JSON.stringify(sanitizeDerivedProductRequest(values))
	});
}
