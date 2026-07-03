import type { Product, ProductFormValues } from '$lib/products';
import { request } from '$lib/api/backend';
import { appendProductFilters, type ProductFilters } from '$lib/product-filters';

export type ProductPhotoPayload = {
	fileName: string;
	contentType: string;
	base64Data: string;
};

export type ProductRequestValues = ProductFormValues & {
	photo?: ProductPhotoPayload;
};

type ProductPayload = {
	id: number;
	name: string;
	description: string;
	gramsPerUnit: number;
	nutritionBasis: 'PER_100_GRAMS' | 'PER_UNIT';
	defaultPrice: number | null;
	nutritionalValues: {
		calories: number;
		carbohydrates: number;
		proteins: number;
		fats: number;
	};
	photo: string | null;
	supermarkets: { id: number; name: string }[];
	derivedProduct?: {
		stockFromComposition: boolean;
	} | null;
};

export type PaginatedResponse<T> = {
	items: T[];
	page: number;
	size: number;
	totalElements: number;
	totalPages: number;
};

export type ListProductsParams = {
	page?: number;
	size?: number;
	filters?: ProductFilters;
};

const DEFAULT_PAGE_SIZE = 100;
type ListAllProductsParams = {
	size?: number;
	filters?: ProductFilters;
};

function toPayload(values: ProductRequestValues) {
	const photo = values.photo
		? {
				fileName: values.photo.fileName.trim(),
				contentType: values.photo.contentType.trim(),
				base64Data: values.photo.base64Data
			}
		: undefined;

	return {
		name: values.name.trim(),
		description: values.description.trim(),
		gramsPerUnit: Number(values.gramsPerUnit),
		defaultPrice: String(values.defaultPrice ?? '').trim() === '' ? null : Number(values.defaultPrice),
		calories: Number(values.calories),
		carbohydrates: Number(values.carbohydrates),
		proteins: Number(values.proteins),
		fats: Number(values.fats),
		supermarketIds: values.supermarketIds.map(Number),
		...(photo ? { photo } : {})
	};
}

function fromPayload(product: ProductPayload): Product {
	return {
		id: product.id,
		name: product.name,
		description: product.description,
		gramsPerUnit: product.gramsPerUnit,
		nutritionBasis: product.nutritionBasis,
		defaultPrice: product.defaultPrice,
		nutritionalValues: product.nutritionalValues,
		photo: product.photo,
		supermarkets: product.supermarkets ?? [],
		derivedProduct: product.derivedProduct ?? null
	};
}

function authHeaders(authorization: string) {
	return {
		Authorization: authorization
	};
}

function normalizePage(value: number | undefined, fallback: number) {
	return Math.max(0, Math.trunc(value ?? fallback));
}

function normalizePageSize(value: number | undefined) {
	return Math.min(100, Math.max(1, Math.trunc(value ?? DEFAULT_PAGE_SIZE)));
}

function buildPageQuery(params: ListProductsParams = {}) {
	const searchParams = new URLSearchParams();
	searchParams.set('page', String(normalizePage(params.page, 0)));
	searchParams.set('size', String(normalizePageSize(params.size)));
	if (params.filters) {
		appendProductFilters(searchParams, params.filters);
	}
	return searchParams.toString();
}

export async function listProductsPage(authorization: string, params: ListProductsParams = {}) {
	const response = await request<PaginatedResponse<ProductPayload>>(`/api/v1/products?${buildPageQuery(params)}`, {
		headers: authHeaders(authorization)
	});

	return {
		...response,
		items: response.items.map(fromPayload)
	};
}

export async function listProducts(authorization: string, params: ListAllProductsParams = {}) {
	const products: Product[] = [];
	let page = 0;
	let totalPages = 1;

	do {
		const response = await listProductsPage(authorization, {
			page,
			size: params.size ?? DEFAULT_PAGE_SIZE,
			filters: params.filters
		});
		products.push(...response.items.map(fromPayload));
		totalPages = Math.max(response.totalPages, 1);
		page += 1;
	} while (page < totalPages);

	return products;
}

export async function createProduct(values: ProductRequestValues, authorization: string) {
	const product = await request<ProductPayload>('/api/v1/products', {
		method: 'POST',
		headers: authHeaders(authorization),
		body: JSON.stringify(toPayload(values))
	});
	return fromPayload(product);
}

export async function updateProduct(id: number, values: ProductRequestValues, authorization: string) {
	const product = await request<ProductPayload>(`/api/v1/products/${id}`, {
		method: 'PUT',
		headers: authHeaders(authorization),
		body: JSON.stringify(toPayload(values))
	});
	return fromPayload(product);
}

export async function deleteProduct(id: number, authorization: string) {
	await request<void>(`/api/v1/products/${id}`, {
		method: 'DELETE',
		headers: {
			...authHeaders(authorization),
			'content-type': 'application/json'
		}
	});
}

export async function getProduct(id: number, authorization: string) {
	const response = await request<ProductPayload>(`/api/v1/products/${id}`, {
		headers: authHeaders(authorization)
	});

	return fromPayload(response);
}
