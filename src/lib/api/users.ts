import { request } from '$lib/api/backend';
import type { MenuPeriodStats } from '$lib/api/established-week-menus';

export type UserResponse = {
	id: number;
	username: string;
};

export type UserMenuHistoryEntryResponse = {
	menuId: number;
	startDate: string;
	endDate: string;
	stats: MenuPeriodStats;
};

export type UserMenuHistoryResponse = {
	personId: number;
	personName: string;
	from: string;
	to: string;
	totals: MenuPeriodStats;
	menus: UserMenuHistoryEntryResponse[];
};

export type UserWeightResponse = {
	id: number;
	userId: number;
	weight: number;
	recordedAt: string;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
};

export type CreateUserWeightRequest = {
	weight: number;
	recordedAt: string;
	notes?: string | null;
};

export type UpdateUserWeightRequest = CreateUserWeightRequest;

export type DateRangeRequest = {
	from: string;
	to: string;
};

function headers(authorization: string) {
	return { Authorization: authorization };
}

export async function listUsers(authorization: string) {
	return await request<UserResponse[]>('/api/v1/users', {
		headers: headers(authorization)
	});
}

function rangeQuery(range: DateRangeRequest) {
	const query = new URLSearchParams({
		from: range.from,
		to: range.to
	});
	return `?${query.toString()}`;
}

export async function getUserHistory(
	userId: number,
	range: DateRangeRequest,
	authorization: string
) {
	return await request<UserMenuHistoryResponse>(`/api/v1/users/${userId}/menu-history${rangeQuery(range)}`, {
		headers: headers(authorization)
	});
}

export async function listUserWeights(
	userId: number,
	range: DateRangeRequest,
	authorization: string
) {
	return await request<UserWeightResponse[]>(`/api/v1/users/${userId}/weights${rangeQuery(range)}`, {
		headers: headers(authorization)
	});
}

export async function createUserWeight(
	userId: number,
	values: CreateUserWeightRequest,
	authorization: string
) {
	return await request<UserWeightResponse>(`/api/v1/users/${userId}/weights`, {
		method: 'POST',
		headers: headers(authorization),
		body: JSON.stringify({
			weight: Number(values.weight),
			recordedAt: String(values.recordedAt).trim(),
			notes: values.notes?.trim() || null
		})
	});
}

export async function updateUserWeight(
	userId: number,
	weightId: number,
	values: UpdateUserWeightRequest,
	authorization: string
) {
	return await request<UserWeightResponse>(`/api/v1/users/${userId}/weights/${weightId}`, {
		method: 'PUT',
		headers: headers(authorization),
		body: JSON.stringify({
			weight: Number(values.weight),
			recordedAt: String(values.recordedAt).trim(),
			notes: values.notes?.trim() || null
		})
	});
}

export async function deleteUserWeight(userId: number, weightId: number, authorization: string) {
	await request<void>(`/api/v1/users/${userId}/weights/${weightId}`, {
		method: 'DELETE',
		headers: headers(authorization)
	});
}
