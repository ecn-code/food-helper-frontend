export type NutritionBasis = 'PER_100_GRAMS' | 'PER_UNIT';

export type NutritionalValues = {
	calories: number;
	carbohydrates: number;
	proteins: number;
	fats: number;
};

export type ProductDerivedIngredient = {
	productId: number;
	productName: string;
	quantity: number;
	quantityType: string;
	nutritionalValues: NutritionalValues;
};

export type ProductDerivedProduct = {
	stockFromComposition: boolean;
	recipeId?: number | null;
	ingredients?: ProductDerivedIngredient[];
};

export type Product = {
	id: number;
	name: string;
	description: string;
	gramsPerUnit: number;
	isStockInUnits: boolean;
	nutritionBasis: NutritionBasis;
	defaultPrice: number | null;
	nutritionalValues: NutritionalValues;
	photo: string | null;
	supermarkets: { id: number; name: string }[];
	derivedProduct?: ProductDerivedProduct | null;
};

export type ProductFormValues = {
	name: string;
	description: string;
	gramsPerUnit: string;
	isStockInUnits: boolean;
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
	isStockInUnits: false,
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
	isStockInUnits: product.isStockInUnits ?? false,
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

export function stockQuantityLabel(product: Pick<Product, 'isStockInUnits'> | null | undefined) {
	return product?.isStockInUnits ? 'Unidades' : 'Gramos';
}

export function stockQuantityToStoredGrams(quantity: number, product: Pick<Product, 'isStockInUnits' | 'gramsPerUnit'>) {
	return product.isStockInUnits ? quantity * product.gramsPerUnit : quantity;
}
