import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { apiBaseUrl, checkHealth, ApiError } from '$lib/server/backend-api';
import { login as loginUser, type LoginValues } from '$lib/server/auth-api';
import {
	createProduct,
	deleteProduct,
	listProducts,
	updateProduct,
	type ProductRequestValues
} from '$lib/server/products-api';
import { createStockEntry, listStockEntries } from '$lib/server/stock-api';
import {
	authorizationHeader,
	clearAuthSession,
	publicAuthSession,
	readAuthSession,
	setAuthSession
} from '$lib/server/session';
import {
	createDerivedProduct,
	createRecipe,
	deleteRecipe,
	listRecipes,
	updateRecipe,
	type CreateRecipeDerivedProductRequest,
	type CreateRecipeRequest,
	type PhotoUploadPayload
} from '$lib/server/recipes-api';
import { emptyProductForm, type Product, type ProductFormErrors, type ProductFormValues } from '$lib/products';
import { emptyStockForm, type StockEntry, type StockFormErrors, type StockFormValues } from '$lib/stock';
import {
	emptyRecipeDerivedProductForm,
	emptyRecipeForm,
	toRecipeModel,
	type Recipe,
	type RecipeDerivedProductFormErrors,
	type RecipeDerivedProductFormValues,
	type RecipeFormErrors,
	type RecipeFormValues
} from '$lib/recipes';

type AuthFormErrors = Partial<Record<'username' | 'password', string>>;

type BaseActionState = {
	success?: string;
	error?: string;
};

type ProductActionState =
	| (BaseActionState & {
			type: 'login';
			values?: Partial<Pick<LoginValues, 'username'>>;
			fieldErrors?: AuthFormErrors;
	  })
	| (BaseActionState & {
			type: 'logout' | 'create' | 'update' | 'delete';
			id?: number;
			values?: ProductFormValues;
			fieldErrors?: ProductFormErrors | AuthFormErrors;
	  });

type RecipeActionState =
	| (BaseActionState & {
			type: 'recipe-create' | 'recipe-update' | 'recipe-delete';
			id?: number;
			values?: RecipeFormValues;
			fieldErrors?: RecipeFormErrors;
	  })
	| (BaseActionState & {
			type: 'recipe-derive';
			id?: number;
			values?: RecipeDerivedProductFormValues;
			fieldErrors?: RecipeDerivedProductFormErrors;
	  });

type StockActionState = BaseActionState & {
	type: 'stock';
	id?: number;
	values?: StockFormValues;
	fieldErrors?: StockFormErrors;
};

type ActionState = ProductActionState | RecipeActionState | StockActionState;

function isSecure(url: URL) {
	return url.protocol === 'https:';
}

function readString(formData: FormData, key: string) {
	return String(formData.get(key) ?? '').trim();
}

function readProductValues(formData: FormData): ProductFormValues {
	return {
		name: readString(formData, 'name'),
		description: readString(formData, 'description'),
		gramsPerUnit: readString(formData, 'gramsPerUnit'),
		calories: readString(formData, 'calories'),
		carbohydrates: readString(formData, 'carbohydrates'),
		proteins: readString(formData, 'proteins'),
		fats: readString(formData, 'fats')
	};
}

function readRecipeValues(formData: FormData): RecipeFormValues {
	const productIds = formData.getAll('ingredientProductId').map((value) => String(value ?? '').trim());
	const grams = formData.getAll('ingredientGrams').map((value) => String(value ?? '').trim());
	const count = Math.max(productIds.length, grams.length);

	return {
		name: readString(formData, 'name'),
		description: readString(formData, 'description'),
		instructions: readString(formData, 'instructions'),
		ingredients: Array.from({ length: count }, (_, index) => ({
			productId: productIds[index] ?? '',
			grams: grams[index] ?? ''
		}))
	};
}

function readRecipeDerivedProductValues(formData: FormData): RecipeDerivedProductFormValues {
	return {
		producedGrams: readString(formData, 'producedGrams'),
		gramsPerUnit: readString(formData, 'gramsPerUnit')
	};
}

function readStockValues(formData: FormData): StockFormValues {
	return {
		productId: readString(formData, 'productId'),
		quantity: readString(formData, 'quantity'),
		expirationDate: readString(formData, 'expirationDate'),
		entryDate: readString(formData, 'entryDate')
	};
}

function validateLoginForm(values: LoginValues) {
	const fieldErrors: AuthFormErrors = {};
	if (!values.username) fieldErrors.username = 'El usuario es obligatorio';
	if (!values.password) fieldErrors.password = 'La contrasena es obligatoria';
	return fieldErrors;
}

function validateProductForm(values: ProductFormValues) {
	const fieldErrors: ProductFormErrors = {};
	const decimalFields: Array<keyof Omit<ProductFormValues, 'name' | 'description'>> = [
		'gramsPerUnit',
		'calories',
		'carbohydrates',
		'proteins',
		'fats'
	];

	if (!values.name) fieldErrors.name = 'El nombre es obligatorio';
	if (!values.description) fieldErrors.description = 'La descripcion es obligatoria';

	for (const field of decimalFields) {
		const value = values[field];
		if (!value) {
			fieldErrors[field] = 'Este valor es obligatorio';
			continue;
		}

		const numericValue = Number(value);
		if (Number.isNaN(numericValue)) {
			fieldErrors[field] = 'Introduce un numero valido';
		} else if (field === 'gramsPerUnit' && numericValue <= 0) {
			fieldErrors[field] = 'El valor debe ser mayor que 0';
		} else if (numericValue < 0) {
			fieldErrors[field] = 'El valor no puede ser negativo';
		}
	}

	return fieldErrors;
}

function validateRecipeForm(values: RecipeFormValues) {
	const fieldErrors: RecipeFormErrors = {};
	const ingredientProductIdErrors: string[] = [];
	const ingredientGramsErrors: string[] = [];
	let validIngredients = 0;

	if (!values.name) fieldErrors.name = 'El nombre es obligatorio';
	if (!values.description) fieldErrors.description = 'La descripcion es obligatoria';
	if (!values.instructions) fieldErrors.instructions = 'Las instrucciones son obligatorias';

	values.ingredients.forEach((ingredient, index) => {
		let rowValid = true;

		if (!ingredient.productId) {
			ingredientProductIdErrors[index] = 'Selecciona un producto';
			rowValid = false;
		} else if (Number.isNaN(Number(ingredient.productId)) || Number(ingredient.productId) <= 0) {
			ingredientProductIdErrors[index] = 'Selecciona un producto valido';
			rowValid = false;
		}

		if (!ingredient.grams) {
			ingredientGramsErrors[index] = 'La cantidad es obligatoria';
			rowValid = false;
		} else {
			const numericValue = Number(ingredient.grams);
			if (Number.isNaN(numericValue)) {
				ingredientGramsErrors[index] = 'Introduce un numero valido';
				rowValid = false;
			} else if (numericValue <= 0) {
				ingredientGramsErrors[index] = 'Debe ser mayor que 0';
				rowValid = false;
			}
		}

		if (rowValid) validIngredients += 1;
	});

	if (values.ingredients.length === 0) {
		fieldErrors.ingredients = 'Debes añadir al menos un ingrediente';
	} else if (validIngredients === 0) {
		fieldErrors.ingredients = 'Completa al menos un ingrediente valido';
	}

	if (ingredientProductIdErrors.some(Boolean)) {
		fieldErrors.ingredientProductId = ingredientProductIdErrors;
	}

	if (ingredientGramsErrors.some(Boolean)) {
		fieldErrors.ingredientGrams = ingredientGramsErrors;
	}

	return fieldErrors;
}

function validateRecipeDerivedProductForm(values: RecipeDerivedProductFormValues) {
	const fieldErrors: RecipeDerivedProductFormErrors = {};
	for (const field of ['producedGrams', 'gramsPerUnit'] as const) {
		const value = values[field];
		if (!value) {
			fieldErrors[field] = 'Este valor es obligatorio';
			continue;
		}

		const numericValue = Number(value);
		if (Number.isNaN(numericValue)) {
			fieldErrors[field] = 'Introduce un numero valido';
		} else if (numericValue <= 0) {
			fieldErrors[field] = 'El valor debe ser mayor que 0';
		}
	}

	return fieldErrors;
}

function validateStockForm(values: StockFormValues) {
	const fieldErrors: StockFormErrors = {};

	if (!values.productId) fieldErrors.productId = 'Selecciona un producto';
	if (!values.quantity) fieldErrors.quantity = 'La cantidad es obligatoria';
	if (!values.entryDate) fieldErrors.entryDate = 'La fecha de entrada es obligatoria';

	if (values.productId && (Number.isNaN(Number(values.productId)) || Number(values.productId) <= 0)) {
		fieldErrors.productId = 'Selecciona un producto valido';
	}

	if (values.quantity) {
		const numericValue = Number(values.quantity);
		if (Number.isNaN(numericValue)) {
			fieldErrors.quantity = 'Introduce un numero valido';
		} else if (numericValue <= 0) {
			fieldErrors.quantity = 'Debe ser mayor que 0';
		}
	}

	if (values.expirationDate && Number.isNaN(Date.parse(values.expirationDate))) {
		fieldErrors.expirationDate = 'La fecha de caducidad no es valida';
	}

	return fieldErrors;
}

function getId(formData: FormData) {
	const raw = String(formData.get('id') ?? '').trim();
	const id = Number(raw);
	if (!raw || Number.isNaN(id) || id <= 0) return null;
	return id;
}

async function readPhotoUpload(formData: FormData, key: string): Promise<PhotoUploadPayload | undefined> {
	const fileValue = formData.get(key);
	if (!(fileValue instanceof File) || fileValue.size === 0) return undefined;

	const base64Data = Buffer.from(await fileValue.arrayBuffer()).toString('base64');
	return {
		fileName: fileValue.name,
		contentType: fileValue.type || 'application/octet-stream',
		base64Data
	};
}

function toProductRequest(values: ProductFormValues, photo?: PhotoUploadPayload): ProductRequestValues {
	return {
		...values,
		photo
	};
}

function toRecipeRequest(values: RecipeFormValues): CreateRecipeRequest {
	return {
		name: values.name,
		description: values.description,
		instructions: values.instructions,
		products: values.ingredients.map((ingredient) => ({
			productId: Number(ingredient.productId),
			grams: Number(ingredient.grams)
		}))
	};
}

function toRecipeDerivedProductRequest(
	values: RecipeDerivedProductFormValues
): CreateRecipeDerivedProductRequest {
	return {
		producedGrams: Number(values.producedGrams),
		gramsPerUnit: Number(values.gramsPerUnit)
	};
}

function toStockRequest(values: StockFormValues) {
	return {
		quantity: Number(values.quantity),
		expirationDate: values.expirationDate || null,
		entryDate: values.entryDate
	};
}

function stockPublicValues(values: StockFormValues): StockFormValues {
	return { ...values };
}

function apiErrorResponse(type: ActionState['type'], message: string, id?: number, values?: any) {
	return fail(400, {
		type,
		id,
		error: message,
		values
	} as ActionState);
}

function unauthenticatedResponse(type: ActionState['type'], values?: any) {
	return fail(401, {
		type,
		error: 'Inicia sesion para continuar',
		values
	} as ActionState);
}

export const load: PageServerLoad = async ({ cookies, url }) => {
	const secure = isSecure(url);
	const session = readAuthSession(cookies, secure);
	let publicSession = session ? publicAuthSession(session) : null;
	let backendAvailable = true;
	let backendError: string | null = null;
	let authError: string | null = null;
	let products: Product[] = [];
	let recipes: Recipe[] = [];
	let stockEntries: StockEntry[] = [];

	try {
		await checkHealth();
	} catch (error) {
		backendAvailable = false;
		backendError = error instanceof ApiError ? error.message : 'No se pudo conectar con el backend configurado.';
	}

	if (backendAvailable && session) {
		try {
			products = await listProducts(authorizationHeader(session));
		} catch (error) {
			if (error instanceof ApiError && error.status === 401) {
				clearAuthSession(cookies, secure);
				publicSession = null;
				authError = 'La sesion ha caducado. Vuelve a iniciar sesion.';
			} else {
				backendError = error instanceof ApiError ? error.message : 'No se pudieron cargar los datos.';
			}
		}

		try {
			const [loadedRecipes, loadedStockEntries] = await Promise.all([
				listRecipes(authorizationHeader(session)),
				listStockEntries(authorizationHeader(session))
			]);

			recipes = loadedRecipes.map(toRecipeModel);
			stockEntries = loadedStockEntries;
		} catch (error) {
			if (error instanceof ApiError && error.status === 401) {
				clearAuthSession(cookies, secure);
				publicSession = null;
				authError = 'La sesion ha caducado. Vuelve a iniciar sesion.';
			} else if (!backendError) {
				backendError = error instanceof ApiError ? error.message : 'No se pudieron cargar los datos.';
			}
		}
	}

	return {
		backendBaseUrl: apiBaseUrl(),
		backendAvailable,
		backendError,
		authError,
		session: publicSession,
		products,
		recipes,
		stockEntries,
		createDefaults: emptyProductForm(),
		createRecipeDefaults: emptyRecipeForm(),
		createRecipeDerivedProductDefaults: emptyRecipeDerivedProductForm()
	};
};

export const actions: Actions = {
	login: async ({ request, cookies, url }) => {
		const formData = await request.formData();
		const values: LoginValues = {
			username: readString(formData, 'username'),
			password: readString(formData, 'password')
		};
		const fieldErrors = validateLoginForm(values);

		if (Object.keys(fieldErrors).length > 0) {
			return fail(400, {
				type: 'login',
				error: 'Revisa los campos marcados',
				values: { username: values.username },
				fieldErrors
			} satisfies ActionState);
		}

		try {
			const auth = await loginUser(values);
			setAuthSession(cookies, auth, isSecure(url));
			return {
				type: 'login',
				success: 'Sesion iniciada correctamente',
				values: { username: auth.username }
			} satisfies ActionState;
		} catch (error) {
			if (error instanceof ApiError) {
				return fail(400, {
					type: 'login',
					error: error.message,
					values: { username: values.username }
				} satisfies ActionState);
			}

			throw error;
		}
	},
	logout: async ({ cookies, url }) => {
		clearAuthSession(cookies, isSecure(url));
		return {
			type: 'logout',
			success: 'Sesion cerrada'
		} satisfies ActionState;
	},
	create: async ({ request, cookies, url }) => {
		const formData = await request.formData();
		const values = readProductValues(formData);
		const fieldErrors = validateProductForm(values);
		const session = readAuthSession(cookies, isSecure(url));
		const photo = await readPhotoUpload(formData, 'photo');

		if (!session) return unauthenticatedResponse('create', values);
		if (Object.keys(fieldErrors).length > 0) {
			return fail(400, {
				type: 'create',
				error: 'Revisa los campos marcados',
				values,
				fieldErrors
			} satisfies ActionState);
		}

		try {
			await createProduct(toProductRequest(values, photo), authorizationHeader(session));
			return {
				type: 'create',
				success: 'Producto creado correctamente',
				values: emptyProductForm()
			} satisfies ActionState;
		} catch (error) {
			if (error instanceof ApiError) {
				return apiErrorResponse('create', error.message, undefined, values);
			}
			throw error;
		}
	},
	update: async ({ request, cookies, url }) => {
		const formData = await request.formData();
		const id = getId(formData);
		const values = readProductValues(formData);
		const fieldErrors = validateProductForm(values);
		const session = readAuthSession(cookies, isSecure(url));
		const photo = await readPhotoUpload(formData, 'photo');

		if (!session) return unauthenticatedResponse('update', values);
		if (!id) return apiErrorResponse('update', 'No se pudo identificar el producto', undefined, values);
		if (Object.keys(fieldErrors).length > 0) {
			return fail(400, {
				type: 'update',
				id,
				error: 'Revisa los campos marcados',
				values,
				fieldErrors
			} satisfies ActionState);
		}

		try {
			await updateProduct(id, toProductRequest(values, photo), authorizationHeader(session));
			return {
				type: 'update',
				id,
				success: 'Producto actualizado correctamente',
				values
			} satisfies ActionState;
		} catch (error) {
			if (error instanceof ApiError) {
				return fail(error.status, {
					type: 'update',
					id,
					error: error.message,
					values
				} satisfies ActionState);
			}
			throw error;
		}
	},
	delete: async ({ request, cookies, url }) => {
		const formData = await request.formData();
		const id = getId(formData);
		const session = readAuthSession(cookies, isSecure(url));

		if (!session) return unauthenticatedResponse('delete');
		if (!id) return apiErrorResponse('delete', 'No se pudo identificar el producto');

		try {
			await deleteProduct(id, authorizationHeader(session));
			return {
				type: 'delete',
				id,
				success: 'Producto eliminado correctamente'
			} satisfies ActionState;
		} catch (error) {
			if (error instanceof ApiError) {
				return fail(error.status, {
					type: 'delete',
					id,
					error: error.message
				} satisfies ActionState);
			}
			throw error;
		}
	},
	recipeCreate: async ({ request, cookies, url }) => {
		const formData = await request.formData();
		const values = readRecipeValues(formData);
		const fieldErrors = validateRecipeForm(values);
		const session = readAuthSession(cookies, isSecure(url));

		if (!session) return unauthenticatedResponse('recipe-create', values);
		if (Object.keys(fieldErrors).length > 0) {
			return fail(400, {
				type: 'recipe-create',
				error: 'Revisa los campos marcados',
				values,
				fieldErrors
			} satisfies ActionState);
		}

		try {
			await createRecipe(toRecipeRequest(values), authorizationHeader(session));
			return {
				type: 'recipe-create',
				success: 'Receta creada correctamente',
				values: emptyRecipeForm()
			} satisfies ActionState;
		} catch (error) {
			if (error instanceof ApiError) {
				return fail(error.status, {
					type: 'recipe-create',
					error: error.message,
					values
				} satisfies ActionState);
			}
			throw error;
		}
	},
	recipeUpdate: async ({ request, cookies, url }) => {
		const formData = await request.formData();
		const id = getId(formData);
		const values = readRecipeValues(formData);
		const fieldErrors = validateRecipeForm(values);
		const session = readAuthSession(cookies, isSecure(url));

		if (!session) return unauthenticatedResponse('recipe-update', values);
		if (!id) return apiErrorResponse('recipe-update', 'No se pudo identificar la receta', undefined, values);
		if (Object.keys(fieldErrors).length > 0) {
			return fail(400, {
				type: 'recipe-update',
				id,
				error: 'Revisa los campos marcados',
				values,
				fieldErrors
			} satisfies ActionState);
		}

		try {
			await updateRecipe(id, toRecipeRequest(values), authorizationHeader(session));
			return {
				type: 'recipe-update',
				id,
				success: 'Receta actualizada correctamente',
				values
			} satisfies ActionState;
		} catch (error) {
			if (error instanceof ApiError) {
				return fail(error.status, {
					type: 'recipe-update',
					id,
					error: error.message,
					values
				} satisfies ActionState);
			}
			throw error;
		}
	},
	recipeDelete: async ({ request, cookies, url }) => {
		const formData = await request.formData();
		const id = getId(formData);
		const session = readAuthSession(cookies, isSecure(url));

		if (!session) return unauthenticatedResponse('recipe-delete');
		if (!id) return apiErrorResponse('recipe-delete', 'No se pudo identificar la receta');

		try {
			await deleteRecipe(id, authorizationHeader(session));
			return {
				type: 'recipe-delete',
				id,
				success: 'Receta eliminada correctamente'
			} satisfies ActionState;
		} catch (error) {
			if (error instanceof ApiError) {
				return fail(error.status, {
					type: 'recipe-delete',
					id,
					error: error.message
				} satisfies ActionState);
			}
			throw error;
		}
	},
	recipeDerive: async ({ request, cookies, url }) => {
		const formData = await request.formData();
		const id = getId(formData);
		const values = readRecipeDerivedProductValues(formData);
		const fieldErrors = validateRecipeDerivedProductForm(values);
		const session = readAuthSession(cookies, isSecure(url));

		if (!session) return unauthenticatedResponse('recipe-derive', values);
		if (!id) return apiErrorResponse('recipe-derive', 'No se pudo identificar la receta', undefined, values);
		if (Object.keys(fieldErrors).length > 0) {
			return fail(400, {
				type: 'recipe-derive',
				id,
				error: 'Revisa los campos marcados',
				values,
				fieldErrors
			} satisfies ActionState);
		}

		try {
			await createDerivedProduct(id, toRecipeDerivedProductRequest(values), authorizationHeader(session));
			return {
				type: 'recipe-derive',
				id,
				success: 'Producto derivado creado correctamente',
				values: emptyRecipeDerivedProductForm()
			} satisfies ActionState;
		} catch (error) {
			if (error instanceof ApiError) {
				return fail(error.status, {
					type: 'recipe-derive',
					id,
					error: error.message,
					values
				} satisfies ActionState);
			}
			throw error;
		}
	},
	stock: async ({ request, cookies, url }) => {
		const formData = await request.formData();
		const values = readStockValues(formData);
		const id = getId(formData);
		const fieldErrors = validateStockForm(values);
		const session = readAuthSession(cookies, isSecure(url));

		if (!session) return unauthenticatedResponse('stock', values);
		if (!id) return apiErrorResponse('stock', 'No se pudo identificar el producto', undefined, values);
		if (Object.keys(fieldErrors).length > 0) {
			return fail(400, {
				type: 'stock',
				id,
				error: 'Revisa los campos marcados',
				values,
				fieldErrors
			} satisfies ActionState);
		}

		try {
			await createStockEntry(id, toStockRequest(values), authorizationHeader(session));
			return {
				type: 'stock',
				id,
				success: 'Stock añadido correctamente',
				values: stockPublicValues(values)
			} satisfies ActionState;
		} catch (error) {
			if (error instanceof ApiError) {
				return fail(error.status, {
					type: 'stock',
					id,
					error: error.message,
					values
				} satisfies ActionState);
			}
			throw error;
		}
	}
};
