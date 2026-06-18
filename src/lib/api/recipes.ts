import { request } from '$lib/api/backend';

export type NutritionalValues = {
	calories: number;
	carbohydrates: number;
	proteins: number;
	fats: number;
};

export type RecipeIngredientAssignment = {
	productId: number;
	grams: number;
};

export type RecipeIngredientPayload = {
	productId: number;
	productName: string;
	grams: number;
	nutritionalValues: NutritionalValues;
};

export type RecipeDerivedProductPayload = {
	productId: number;
	producedGrams: number;
	gramsPerUnit: number;
	unitsProduced: number;
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

export type UpdateRecipeRequest = CreateRecipeRequest;

export type CreateRecipeDerivedProductRequest = {
	producedGrams: number;
	gramsPerUnit: number;
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
};

const DEFAULT_PAGE_SIZE = 100;

function authHeaders(authorization: string) {
	return {
		Authorization: authorization
	};
}

function sanitizeRecipeRequest(values: CreateRecipeRequest): CreateRecipeRequest {
	return {
		name: values.name.trim(),
		description: values.description.trim(),
		instructions: values.instructions.trim(),
		products: values.products.map((product) => ({
			productId: Number(product.productId),
			grams: Number(product.grams)
		})),
		photo: values.photo
			? {
					fileName: values.photo.fileName.trim(),
					contentType: values.photo.contentType.trim(),
					base64Data: values.photo.base64Data
				}
			: undefined
	};
}

function sanitizeDerivedProductRequest(values: CreateRecipeDerivedProductRequest) {
	return {
		producedGrams: Number(values.producedGrams),
		gramsPerUnit: Number(values.gramsPerUnit)
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

export async function listRecipes(authorization: string) {
	const recipes: RecipePayload[] = [];
	let page = 0;
	let totalPages = 1;

	do {
		const response = await listRecipesPage(authorization, { page, size: DEFAULT_PAGE_SIZE });
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
