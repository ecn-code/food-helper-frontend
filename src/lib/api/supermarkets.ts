import { request } from '$lib/api/backend';

export type Supermarket = { id: number; name: string };

function headers(authorization: string) {
	return { Authorization: authorization };
}

export async function listSupermarkets(authorization: string) {
	return await request<Supermarket[]>('/api/v1/supermarkets', { headers: headers(authorization) });
}

export async function createSupermarket(name: string, authorization: string) {
	return await request<Supermarket>('/api/v1/supermarkets', {
		method: 'POST',
		headers: headers(authorization),
		body: JSON.stringify({ name: name.trim() })
	});
}

export async function updateSupermarket(id: number, name: string, authorization: string) {
	return await request<Supermarket>(`/api/v1/supermarkets/${id}`, {
		method: 'PUT',
		headers: headers(authorization),
		body: JSON.stringify({ name: name.trim() })
	});
}

export async function deleteSupermarket(id: number, authorization: string) {
	await request<void>(`/api/v1/supermarkets/${id}`, {
		method: 'DELETE',
		headers: headers(authorization)
	});
}
