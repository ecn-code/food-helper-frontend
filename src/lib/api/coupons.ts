import { request } from '$lib/api/backend';

export type CouponResponse = {
	code: string;
	name: string;
	conditionDescription: string;
	available: boolean;
	unavailableReasons: string[] | null;
};

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
