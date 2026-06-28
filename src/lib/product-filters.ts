import type { Product, NutritionalValues } from '$lib/products';

export type ProductFilterMetric = keyof NutritionalValues;

export type ProductFilterRange = {
	min: string;
	max: string;
};

export type ProductFilters = {
	search: string;
	metrics: Record<ProductFilterMetric, ProductFilterRange>;
};

export const PRODUCT_FILTER_METRICS: Array<{
	key: ProductFilterMetric;
	label: string;
	shortLabel: string;
}> = [
	{ key: 'calories', label: 'Calorías', shortLabel: 'Kcal' },
	{ key: 'carbohydrates', label: 'Carbohidratos', shortLabel: 'Carbos' },
	{ key: 'proteins', label: 'Proteínas', shortLabel: 'Proteínas' },
	{ key: 'fats', label: 'Grasas', shortLabel: 'Grasas' }
];

export function emptyProductFilters(): ProductFilters {
	return {
		search: '',
		metrics: {
			calories: { min: '', max: '' },
			carbohydrates: { min: '', max: '' },
			proteins: { min: '', max: '' },
			fats: { min: '', max: '' }
		}
	};
}

export function cloneProductFilters(filters: ProductFilters): ProductFilters {
	return {
		search: filters.search,
		metrics: {
			calories: { ...filters.metrics.calories },
			carbohydrates: { ...filters.metrics.carbohydrates },
			proteins: { ...filters.metrics.proteins },
			fats: { ...filters.metrics.fats }
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

export function hasActiveProductFilters(filters: ProductFilters) {
	if (filters.search.trim()) return true;

	return PRODUCT_FILTER_METRICS.some((metric) => {
		const current = filters.metrics[metric.key];
		return Boolean(current.min.trim() || current.max.trim());
	});
}

export function productMatchesFilters(product: Product, filters: ProductFilters) {
	const search = normalizeText(filters.search);
	if (search) {
		const haystack = normalizeText(`${product.name} ${product.description}`);
		if (!haystack.includes(search)) return false;
	}

	for (const metric of PRODUCT_FILTER_METRICS) {
		const current = filters.metrics[metric.key];
		const min = parseBound(current.min);
		const max = parseBound(current.max);
		const value = product.nutritionalValues[metric.key];

		if (min !== null && value < min) return false;
		if (max !== null && value > max) return false;
	}

	return true;
}

export function filterProducts(products: Product[], filters: ProductFilters) {
	return products.filter((product) => productMatchesFilters(product, filters));
}

export function updateProductFilterSearch(filters: ProductFilters, search: string) {
	return {
		...filters,
		search
	};
}

export function updateProductFilterRange(
	filters: ProductFilters,
	metric: ProductFilterMetric,
	bound: keyof ProductFilterRange,
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

export function appendProductFilters(searchParams: URLSearchParams, filters: ProductFilters) {
	const search = filters.search.trim();
	if (search) {
		searchParams.set('search', search);
	}

	for (const metric of PRODUCT_FILTER_METRICS) {
		const current = filters.metrics[metric.key];
		const min = parseBound(current.min);
		const max = parseBound(current.max);

		if (min !== null) {
			searchParams.set(`${metric.key}Min`, String(min));
		}

		if (max !== null) {
			searchParams.set(`${metric.key}Max`, String(max));
		}
	}
}
