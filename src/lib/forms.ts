import type { LoginValues, RegisterValues } from '$lib/api/auth';
import type { ProductFormErrors, ProductFormValues } from '$lib/products';
import type {
	CreateRecipeDerivedProductRequest,
	CreateRecipeRequest,
	PhotoUploadPayload,
	RecipeDerivedProductPayload
} from '$lib/api/recipes';
import type {
	RecipeDerivedProductFormErrors,
	RecipeDerivedProductFormValues,
	RecipeFormErrors,
	RecipeFormValues
} from '$lib/recipes';
import type { StockFormErrors, StockFormValues } from '$lib/stock';

export function readString(formData: FormData, key: string) {
	return String(formData.get(key) ?? '').trim();
}

export function readLoginValues(formData: FormData): LoginValues {
	return {
		username: readString(formData, 'username'),
		password: readString(formData, 'password')
	};
}

export function readRegisterValues(formData: FormData): RegisterValues {
	return {
		username: readString(formData, 'username'),
		password: readString(formData, 'password'),
		registrationCode: readString(formData, 'registrationCode')
	};
}

export function readProductValues(formData: FormData): ProductFormValues {
	return {
		name: readString(formData, 'name'),
		description: readString(formData, 'description'),
		gramsPerUnit: readString(formData, 'gramsPerUnit'),
		defaultPrice: readString(formData, 'defaultPrice'),
		calories: readString(formData, 'calories'),
		carbohydrates: readString(formData, 'carbohydrates'),
		proteins: readString(formData, 'proteins'),
		fats: readString(formData, 'fats'),
		supermarketIds: formData.getAll('supermarketIds').map((value) => String(value))
	};
}

export function readRecipeValues(formData: FormData): RecipeFormValues {
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

export function readRecipeDerivedProductValues(formData: FormData): RecipeDerivedProductFormValues {
	return {
		name: readString(formData, 'name'),
		units: readString(formData, 'units'),
		stockFromComposition: String(formData.get('stockFromComposition') ?? 'false') === 'true'
	};
}

export function readStockValues(formData: FormData): StockFormValues {
	return {
		productId: readString(formData, 'productId'),
		quantity: readString(formData, 'quantity'),
		price: readString(formData, 'price'),
		expirationDate: readString(formData, 'expirationDate'),
		entryDate: readString(formData, 'entryDate')
	};
}

export function validateLoginForm(values: LoginValues) {
	const fieldErrors: Partial<Record<keyof LoginValues, string>> = {};
	if (!values.username) fieldErrors.username = 'El usuario es obligatorio';
	if (!values.password) fieldErrors.password = 'La contrasena es obligatoria';
	return fieldErrors;
}

export function validateRegisterForm(values: RegisterValues) {
	const fieldErrors: Partial<Record<keyof RegisterValues, string>> = {};
	if (!values.username) {
		fieldErrors.username = 'El usuario es obligatorio';
	} else if (values.username.length < 3 || values.username.length > 80) {
		fieldErrors.username = 'Debe tener entre 3 y 80 caracteres';
	}

	if (!values.password) {
		fieldErrors.password = 'La contrasena es obligatoria';
	} else if (values.password.length < 8 || values.password.length > 128) {
		fieldErrors.password = 'Debe tener entre 8 y 128 caracteres';
	}

	if (!values.registrationCode) {
		fieldErrors.registrationCode = 'El codigo es obligatorio';
	} else if (values.registrationCode.length > 128) {
		fieldErrors.registrationCode = 'No puede superar 128 caracteres';
	}

	return fieldErrors;
}

export function validateProductForm(values: ProductFormValues) {
	const fieldErrors: ProductFormErrors = {};
	const decimalFields: Array<keyof Omit<ProductFormValues, 'name' | 'description' | 'defaultPrice'>> = [
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

	const defaultPrice = String(values.defaultPrice ?? '').trim();
	if (defaultPrice) {
		const numericValue = Number(defaultPrice);
		if (Number.isNaN(numericValue)) {
			fieldErrors.defaultPrice = 'Introduce un numero valido';
		} else if (numericValue < 0) {
			fieldErrors.defaultPrice = 'El valor no puede ser negativo';
		}
	}

	return fieldErrors;
}

export function validateRecipeForm(values: RecipeFormValues) {
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

export function validateRecipeDerivedProductForm(values: RecipeDerivedProductFormValues) {
	const fieldErrors: RecipeDerivedProductFormErrors = {};
	if (!values.name) fieldErrors.name = 'El nombre es obligatorio';

	for (const field of ['units'] as const) {
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

export function validateStockForm(values: StockFormValues) {
	const fieldErrors: StockFormErrors = {};

	if (!values.productId) fieldErrors.productId = 'Selecciona un producto';
	if (!values.quantity) fieldErrors.quantity = 'La cantidad es obligatoria';
	if (!values.price) fieldErrors.price = 'El precio es obligatorio';
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

	if (values.price) {
		const numericValue = Number(values.price);
		if (Number.isNaN(numericValue)) {
			fieldErrors.price = 'Introduce un numero valido';
		} else if (numericValue < 0) {
			fieldErrors.price = 'El valor no puede ser negativo';
		}
	}

	if (values.expirationDate && Number.isNaN(Date.parse(values.expirationDate))) {
		fieldErrors.expirationDate = 'La fecha de caducidad no es valida';
	}

	return fieldErrors;
}

export function getId(formData: FormData) {
	const raw = String(formData.get('id') ?? '').trim();
	const id = Number(raw);
	if (!raw || Number.isNaN(id) || id <= 0) return null;
	return id;
}

export async function readPhotoUpload(formData: FormData, key: string): Promise<PhotoUploadPayload | undefined> {
	const fileValue = formData.get(key);
	if (!(fileValue instanceof File) || fileValue.size === 0) return undefined;

	const base64Data = Buffer.from(await fileValue.arrayBuffer()).toString('base64');
	return {
		fileName: fileValue.name,
		contentType: fileValue.type || 'application/octet-stream',
		base64Data
	};
}

export function toProductRequest(values: ProductFormValues, photo?: PhotoUploadPayload) {
	return {
		...values,
		defaultPrice: String(values.defaultPrice ?? '').trim() === '' ? null : Number(values.defaultPrice),
		photo
	};
}

export function toRecipeRequest(values: RecipeFormValues): CreateRecipeRequest {
	return {
		name: values.name,
		description: values.description,
		instructions: values.instructions,
		products: values.ingredients.map((ingredient) => ({
			productId: Number(ingredient.productId),
			quantity: Number(ingredient.grams),
			quantityType: 'GRAMS'
		}))
	};
}

export function toRecipeDerivedProductRequest(values: RecipeDerivedProductFormValues): CreateRecipeDerivedProductRequest {
	return {
		name: values.name,
		units: Number(values.units),
		stockFromComposition: values.stockFromComposition
	};
}

export function toStockRequest(values: StockFormValues) {
	return {
		quantity: Number(values.quantity),
		price: Number(values.price),
		expirationDate: values.expirationDate || null,
		entryDate: values.entryDate
	};
}
