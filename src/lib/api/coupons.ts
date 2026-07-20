import { request } from '$lib/api/backend';

export type CouponResponse = {
	id: number;
	code: string;
	name: string;
	conditionDescription: string;
	ruleCode: string;
	rewardAmount: number;
	periodDays: number;
	available: boolean;
	unavailableReasons: string[] | null;
};

export type CouponDefinitionRequest = Pick<
	CouponResponse,
	'code' | 'name' | 'conditionDescription' | 'ruleCode' | 'rewardAmount' | 'periodDays'
>;

function headers(authorization: string) {
	return { Authorization: authorization };
}

export async function listCoupons(payerUserId: number, authorization: string, onlyAvailable = false) {
	const query = new URLSearchParams({
		payerUserId: String(Number(payerUserId))
	});
	if (onlyAvailable) {
		query.set('onlyAvailable', 'true');
	}

	return await request<CouponResponse[]>(`/api/v1/coupons?${query.toString()}`, {
		headers: headers(authorization)
	});
}

export async function createCoupon(values: CouponDefinitionRequest, authorization: string) {
	return await request<CouponResponse>('/api/v1/coupons', {
		method: 'POST',
		headers: headers(authorization),
		body: JSON.stringify(values)
	});
}

export async function updateCoupon(code: string, values: CouponDefinitionRequest, authorization: string) {
	return await request<CouponResponse>(`/api/v1/coupons/${encodeURIComponent(code)}`, {
		method: 'PUT',
		headers: headers(authorization),
		body: JSON.stringify(values)
	});
}

export async function deleteCoupon(code: string, authorization: string) {
	await request<void>(`/api/v1/coupons/${encodeURIComponent(code)}`, {
		method: 'DELETE',
		headers: headers(authorization)
	});
}
