import type { MediaPayload, PhotoUploadPayload } from '$lib/server/recipes-api';
import type { Product, ProductFormValues } from '$lib/products';
import { request } from '$lib/server/backend-api';

type ProductPayload = {
	id: number;
	name: string;
	description: string;
	gramsPerUnit: number;
	nutritionalValues: {
		calories: number;
		carbohydrates: number;
		proteins: number;
		fats: number;
	};
	photo: MediaPayload | null;
};

export type ProductRequestValues = ProductFormValues & {
	photo?: PhotoUploadPayload;
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
		nutritionalValues: product.nutritionalValues,
		photo: product.photo
	};
}

function authHeaders(authorization: string) {
	return {
		Authorization: authorization
	};
}

export async function listProducts(authorization: string) {
	const products = await request<ProductPayload[]>('/api/v1/products', {
		headers: authHeaders(authorization)
	});
	return products.map(fromPayload);
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
