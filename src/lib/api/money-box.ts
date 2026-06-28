import { request } from '$lib/api/backend';

export type MoneyBoxType = 'USER' | 'MANUAL';

export type MoneyBoxMovement = {
	id: number;
	moneyBoxId: number;
	userId: number | null;
	amount: number;
	description: string | null;
	menuId: number | null;
	createdAt: string;
};

export type MoneyBox = {
	id: number;
	type: MoneyBoxType;
	name: string;
	userId: number | null;
	username: string | null;
	balance: number;
	movements: MoneyBoxMovement[];
};

function headers(authorization: string) {
	return { Authorization: authorization };
}

export async function listMoneyBoxes(authorization: string) {
	return await request<MoneyBox[]>('/api/v1/money-boxes', { headers: headers(authorization) });
}

export async function createManualMoneyBox(name: string, authorization: string) {
	return await request<MoneyBox>('/api/v1/money-boxes', {
		method: 'POST',
		headers: headers(authorization),
		body: JSON.stringify({ name: name.trim() })
	});
}

export async function getMoneyBox(moneyBoxId: number, authorization: string) {
	return await request<MoneyBox>(`/api/v1/money-boxes/${moneyBoxId}`, {
		headers: headers(authorization)
	});
}

export async function deleteMoneyBox(moneyBoxId: number, authorization: string) {
	await request<void>(`/api/v1/money-boxes/${moneyBoxId}`, {
		method: 'DELETE',
		headers: headers(authorization)
	});
}

export async function addMoneyBoxMovement(
	moneyBoxId: number,
	values: { amount: number; description?: string },
	authorization: string
) {
	return await request<MoneyBoxMovement>(`/api/v1/money-boxes/${moneyBoxId}/movements`, {
		method: 'POST',
		headers: headers(authorization),
		body: JSON.stringify({
			amount: Number(values.amount),
			...(values.description?.trim() ? { description: values.description.trim() } : {})
		})
	});
}

export async function deleteMoneyBoxMovement(
	moneyBoxId: number,
	movementId: number,
	authorization: string
) {
	await request<void>(`/api/v1/money-boxes/${moneyBoxId}/movements/${movementId}`, {
		method: 'DELETE',
		headers: headers(authorization)
	});
}
