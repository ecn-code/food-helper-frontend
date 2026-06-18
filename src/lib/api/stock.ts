import { request } from '$lib/api/backend';

export type StockEntryPayload = {
	id: number;
	productId: number;
	productName: string;
	quantity: number;
	price: number;
	expirationDate: string | null;
	entryDate: string;
};

export type CreateStockEntryRequest = {
	quantity: number;
	price: number;
	expirationDate?: string | null;
	entryDate: string;
};

export type UpdateStockEntryRequest = CreateStockEntryRequest;

export type AdjustStockQuantityRequest = {
	quantity: number;
};

function authHeaders(authorization: string) {
	return {
		Authorization: authorization
	};
}

function sanitizeCreateStockEntryRequest(values: CreateStockEntryRequest) {
	return {
		quantity: Number(values.quantity),
		price: Number(values.price),
		expirationDate: values.expirationDate ?? undefined,
		entryDate: values.entryDate.trim()
	};
}

export async function listStockEntries(authorization: string) {
	return await request<StockEntryPayload[]>('/api/v1/stock', {
		headers: authHeaders(authorization)
	});
}

export async function createStockEntry(
	productId: number,
	values: CreateStockEntryRequest,
	authorization: string
) {
	return await request<StockEntryPayload>(`/api/v1/products/${productId}/stock`, {
		method: 'POST',
		headers: authHeaders(authorization),
		body: JSON.stringify(sanitizeCreateStockEntryRequest(values))
	});
}

export async function updateStockEntry(
	stockEntryId: number,
	values: UpdateStockEntryRequest,
	authorization: string
) {
	return await request<StockEntryPayload>(`/api/v1/stock/${stockEntryId}`, {
		method: 'PUT',
		headers: authHeaders(authorization),
		body: JSON.stringify(sanitizeCreateStockEntryRequest(values))
	});
}

function sanitizeAdjustStockQuantityRequest(values: AdjustStockQuantityRequest) {
	return {
		quantity: Number(values.quantity)
	};
}

export async function addStockQuantity(
	stockEntryId: number,
	values: AdjustStockQuantityRequest,
	authorization: string
) {
	return await request<void>(`/api/v1/stock/${stockEntryId}/add`, {
		method: 'POST',
		headers: authHeaders(authorization),
		body: JSON.stringify(sanitizeAdjustStockQuantityRequest(values))
	});
}

export async function removeStockQuantity(
	stockEntryId: number,
	values: AdjustStockQuantityRequest,
	authorization: string
) {
	return await request<void>(`/api/v1/stock/${stockEntryId}/remove`, {
		method: 'POST',
		headers: authHeaders(authorization),
		body: JSON.stringify(sanitizeAdjustStockQuantityRequest(values))
	});
}
