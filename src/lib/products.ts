export type NutritionBasis = 'PER_100_GRAMS' | 'PER_UNIT';

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
	nutritionBasis: NutritionBasis;
	defaultPrice: number | null;
	nutritionalValues: NutritionalValues;
	photo: string | null;
	supermarkets: { id: number; name: string }[];
	derivedProduct?: {
		stockFromComposition: boolean;
	} | null;
};

export type ProductFormValues = {
	name: string;
	description: string;
	gramsPerUnit: string;
	defaultPrice: string;
	calories: string;
	carbohydrates: string;
	proteins: string;
	fats: string;
	supermarketIds: string[];
};

export type ProductFormErrors = Partial<Record<keyof ProductFormValues, string>>;

export const emptyProductForm = (): ProductFormValues => ({
	name: '',
	description: '',
	gramsPerUnit: '100',
	defaultPrice: '',
	calories: '',
	carbohydrates: '',
	proteins: '',
	fats: '',
	supermarketIds: []
});

export const toProductFormValues = (product: Product): ProductFormValues => ({
	name: product.name,
	description: product.description,
	gramsPerUnit: String(product.gramsPerUnit ?? 100),
	defaultPrice: product.defaultPrice === null || product.defaultPrice === undefined ? '' : String(product.defaultPrice),
	calories: String(product.nutritionalValues.calories),
	carbohydrates: String(product.nutritionalValues.carbohydrates),
	proteins: String(product.nutritionalValues.proteins),
	fats: String(product.nutritionalValues.fats),
	supermarketIds: product.supermarkets.map((supermarket) => String(supermarket.id))
});

export function productQuantityMode(product: Pick<Product, 'nutritionBasis'> | null | undefined): 'units' | 'grams' {
	return product?.nutritionBasis === 'PER_UNIT' ? 'units' : 'grams';
}
