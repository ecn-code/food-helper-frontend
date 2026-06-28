import type { Recipe } from '$lib/recipes';

export type RecipeFilterMetric = keyof Recipe['nutritionalValues'];

export type RecipeFilterRange = {
	min: string;
	max: string;
};

export type RecipeDerivedFilter = 'all' | 'with-derived' | 'without-derived';

export type RecipeFilters = {
	search: string;
	derived: RecipeDerivedFilter;
	metrics: Record<RecipeFilterMetric, RecipeFilterRange>;
};

export const RECIPE_FILTER_METRICS: Array<{
	key: RecipeFilterMetric;
	label: string;
	shortLabel: string;
}> = [
	{ key: 'calories', label: 'Calorias', shortLabel: 'Kcal' },
	{ key: 'carbohydrates', label: 'Carbohidratos', shortLabel: 'Carbos' },
	{ key: 'proteins', label: 'Proteinas', shortLabel: 'Proteinas' },
	{ key: 'fats', label: 'Grasas', shortLabel: 'Grasas' }
];

export function emptyRecipeFilters(): RecipeFilters {
	return {
		search: '',
		derived: 'all',
		metrics: {
			calories: { min: '', max: '' },
			carbohydrates: { min: '', max: '' },
			proteins: { min: '', max: '' },
			fats: { min: '', max: '' }
		}
	};
}

function normalizeText(value: string) {
	return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function parseBound(value: string) {
	const trimmed = value.trim();
	if (!trimmed) return null;

	const numericValue = Number(trimmed);
	return Number.isNaN(numericValue) ? null : numericValue;
}

export function hasActiveRecipeFilters(filters: RecipeFilters) {
	if (filters.search.trim()) return true;
	if (filters.derived !== 'all') return true;

	return RECIPE_FILTER_METRICS.some((metric) => {
		const current = filters.metrics[metric.key];
		return Boolean(current.min.trim() || current.max.trim());
	});
}

export function recipeMatchesFilters(recipe: Recipe, filters: RecipeFilters) {
	const search = normalizeText(filters.search);
	if (search) {
		const ingredientNames = recipe.ingredients.map((ingredient) => ingredient.productName).join(' ');
		const haystack = normalizeText(`${recipe.name} ${recipe.description} ${recipe.instructions} ${ingredientNames}`);
		if (!haystack.includes(search)) return false;
	}

	if (filters.derived === 'with-derived' && !recipe.derivedProduct) return false;
	if (filters.derived === 'without-derived' && recipe.derivedProduct) return false;

	for (const metric of RECIPE_FILTER_METRICS) {
		const current = filters.metrics[metric.key];
		const min = parseBound(current.min);
		const max = parseBound(current.max);
		const value = recipe.nutritionalValues[metric.key];

		if (min !== null && value < min) return false;
		if (max !== null && value > max) return false;
	}

	return true;
}

export function filterRecipes(recipes: Recipe[], filters: RecipeFilters) {
	return recipes.filter((recipe) => recipeMatchesFilters(recipe, filters));
}

export function updateRecipeFilterSearch(filters: RecipeFilters, search: string) {
	return {
		...filters,
		search
	};
}

export function updateRecipeFilterDerived(filters: RecipeFilters, derived: RecipeDerivedFilter) {
	return {
		...filters,
		derived
	};
}

export function updateRecipeFilterRange(
	filters: RecipeFilters,
	metric: RecipeFilterMetric,
	bound: keyof RecipeFilterRange,
	value: string
) {
	return {
		...filters,
		metrics: {
			...filters.metrics,
			[metric]: {
				...filters.metrics[metric],
				[bound]: value
			}
		}
	};
}
