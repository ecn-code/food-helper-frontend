export type MediaPayload = {
	id: number;
	fileName: string;
	contentType: string;
	sizeBytes?: number;
	width?: number;
	height?: number;
};

export type NutritionalValues = {
	calories: number;
	carbohydrates: number;
	proteins: number;
	fats: number;
};

export type Product = {
	id: number;
	name: string;
	description: string;
	gramsPerUnit: number;
	nutritionalValues: NutritionalValues;
	photo: MediaPayload | null;
};

export type ProductFormValues = {
	name: string;
	description: string;
	gramsPerUnit: string;
	calories: string;
	carbohydrates: string;
	proteins: string;
	fats: string;
};

export type ProductFormErrors = Partial<Record<keyof ProductFormValues, string>>;

export const emptyProductForm = (): ProductFormValues => ({
	name: '',
	description: '',
	gramsPerUnit: '100',
	calories: '',
	carbohydrates: '',
	proteins: '',
	fats: ''
});

export const toProductFormValues = (product: Product): ProductFormValues => ({
	name: product.name,
	description: product.description,
	gramsPerUnit: String(product.gramsPerUnit ?? 100),
	calories: String(product.nutritionalValues.calories),
	carbohydrates: String(product.nutritionalValues.carbohydrates),
	proteins: String(product.nutritionalValues.proteins),
	fats: String(product.nutritionalValues.fats)
});
