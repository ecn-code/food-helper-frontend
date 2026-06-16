import { request } from '$lib/server/backend-api';

export type StockEntryPayload = {
	id: number;
	productId: number;
	productName: string;
	quantity: number;
	expirationDate: string | null;
	entryDate: string;
};

export type CreateStockEntryRequest = {
	quantity: number;
	expirationDate?: string | null;
	entryDate: string;
};

function authHeaders(authorization: string) {
	return {
		Authorization: authorization
	};
}

function sanitizeCreateStockEntryRequest(values: CreateStockEntryRequest) {
	return {
		quantity: Number(values.quantity),
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

