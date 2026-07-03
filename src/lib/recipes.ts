import type {
	NutritionalValues,
	RecipeDerivedProductPayload,
	RecipeIngredientAssignment,
	RecipeIngredientPayload,
	RecipePayload
} from '$lib/api/recipes';

export type RecipeIngredientFormValues = {
	productId: string;
	grams: string;
};

export type RecipeFormValues = {
	name: string;
	description: string;
	instructions: string;
	ingredients: RecipeIngredientFormValues[];
};

export type RecipeFormErrors = Partial<Record<'name' | 'description' | 'instructions' | 'ingredients', string>> & {
	ingredientProductId?: string[];
	ingredientGrams?: string[];
};

export type Recipe = {
	id: number;
	name: string;
	description: string;
	instructions: string;
	nutritionalValues: NutritionalValues;
	ingredients: RecipeIngredientPayload[];
	derivedProduct: RecipeDerivedProductPayload | null;
	photo: string | null;
};

export type RecipeDerivedProductFormValues = {
	name: string;
	units: string;
	stockFromComposition: boolean;
};

export type RecipeDerivedProductFormErrors = Partial<Record<keyof RecipeDerivedProductFormValues, string>>;

export const emptyRecipeIngredient = (): RecipeIngredientFormValues => ({
	productId: '',
	grams: ''
});

export const emptyRecipeForm = (): RecipeFormValues => ({
	name: '',
	description: '',
	instructions: '',
	ingredients: []
});

export const emptyRecipeDerivedProductForm = (): RecipeDerivedProductFormValues => ({
	name: '',
	units: '',
	stockFromComposition: false
});

export const toRecipeFormValues = (recipe: RecipePayload | Recipe): RecipeFormValues => ({
	name: recipe.name,
	description: recipe.description,
	instructions: recipe.instructions,
	ingredients: ('products' in recipe ? recipe.products : recipe.ingredients).map((product) => ({
		productId: String(product.productId),
		grams: String(product.quantity)
	}))
});

export const toRecipeModel = (recipe: RecipePayload): Recipe => ({
	id: recipe.id,
	name: recipe.name,
	description: recipe.description,
	instructions: recipe.instructions,
	nutritionalValues: recipe.nutritionalValues,
	ingredients: recipe.products,
	derivedProduct: recipe.derivedProduct,
	photo: recipe.photo
});

export const toRecipeIngredientAssignments = (
	ingredients: RecipeIngredientFormValues[]
): RecipeIngredientAssignment[] =>
	ingredients.map((ingredient) => ({
		productId: Number(ingredient.productId),
		quantity: Number(ingredient.grams),
		quantityType: 'GRAMS'
	}));
