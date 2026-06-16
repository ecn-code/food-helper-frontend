import { request } from '$lib/server/backend-api';

export type NutritionalValuesPayload = {
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
	nutritionalValues: NutritionalValuesPayload;
};

export type RecipeDerivedProductPayload = {
	productId: number;
	producedGrams: number;
	gramsPerUnit: number;
	unitsProduced: number;
};

export type MediaPayload = {
	id: number;
	fileName: string;
	contentType: string;
	sizeBytes: number;
	width: number;
	height: number;
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
	nutritionalValues: NutritionalValuesPayload;
	products: RecipeIngredientPayload[];
	derivedProduct: RecipeDerivedProductPayload | null;
	photo: MediaPayload | null;
};

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

export async function createRecipe(values: CreateRecipeRequest, authorization: string) {
	return await request<RecipePayload>('/api/v1/recipes', {
		method: 'POST',
		headers: authHeaders(authorization),
		body: JSON.stringify(sanitizeRecipeRequest(values))
	});
}

export async function listRecipes(authorization: string) {
	return await request<RecipePayload[]>('/api/v1/recipes', {
		headers: authHeaders(authorization)
	});
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
