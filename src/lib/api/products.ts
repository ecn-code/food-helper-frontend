import type { Product, ProductFormValues } from '$lib/products';
import { request } from '$lib/api/backend';

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
	defaultPrice: number | null;
	nutritionalValues: {
		calories: number;
		carbohydrates: number;
		proteins: number;
		fats: number;
	};
	photo: string | null;
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
};

const DEFAULT_PAGE_SIZE = 100;

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
		...(photo ? { photo } : {})
	};
}

function fromPayload(product: ProductPayload): Product {
	return {
		id: product.id,
		name: product.name,
		description: product.description,
		gramsPerUnit: product.gramsPerUnit,
		defaultPrice: product.defaultPrice,
		nutritionalValues: product.nutritionalValues,
		photo: product.photo
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
	return searchParams.toString();
}

export async function listProductsPage(authorization: string, params: ListProductsParams = {}) {
	return await request<PaginatedResponse<ProductPayload>>(`/api/v1/products?${buildPageQuery(params)}`, {
		headers: authHeaders(authorization)
	});
}

export async function listProducts(authorization: string) {
	const products: Product[] = [];
	let page = 0;
	let totalPages = 1;

	do {
		const response = await listProductsPage(authorization, { page, size: DEFAULT_PAGE_SIZE });
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
