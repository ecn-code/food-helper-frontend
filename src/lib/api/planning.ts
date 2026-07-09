import { request } from '$lib/api/backend';
import type { CouponResponse } from '$lib/api/coupons';

export type PlanningState = 'DRAFT' | 'ESTABLISHED' | 'CLOSED';

export type PlanningCouponUnavailabilityReason = 'CONDITION_NOT_MET' | 'USED_WITHIN_PERIOD';

export type PlanningCouponAvailabilityState =
	| 'AVAILABLE'
	| 'CONDITION_NOT_MET'
	| 'USED_RECENTLY'
	| 'CONDITION_NOT_MET_AND_USED_RECENTLY';

export type PlanningMenuResponse = {
	id: number;
	startDate: string;
	endDate: string;
	plannedDays: number;
	state: PlanningState;
	menuId: number | null;
};

export type PlanningCouponResponse = CouponResponse & {
	code: string;
	name: string;
	conditionDescription: string;
	conditionMet: boolean;
	rewardAmount: number;
	periodDays: number;
	available: boolean;
	usedRecently: boolean;
	informativeAvailabilityState: PlanningCouponAvailabilityState;
	lastUsedAt: string | null;
	nextAvailableAt: string | null;
	unavailableReasons: PlanningCouponUnavailabilityReason[] | null;
};

function headers(authorization: string) {
	return { Authorization: authorization };
}

export async function listPlanning(authorization: string) {
	return await request<PlanningMenuResponse[]>('/api/v1/planning', {
		headers: headers(authorization)
	});
}

export async function listPlanningCoupons(planningId: number, payerUserId: number, authorization: string) {
	return await request<PlanningCouponResponse[]>(
		`/api/v1/planning/${planningId}/coupons?payerUserId=${encodeURIComponent(payerUserId)}`,
		{
			headers: headers(authorization)
		}
	);
}

export async function validatePlanningCoupons(
	planningId: number,
	payerUserId: number,
	couponCodes: string[] | undefined,
	authorization: string
) {
	return await request<CouponResponse[]>(`/api/v1/planning/${planningId}/coupons/validate`, {
		method: 'POST',
		headers: headers(authorization),
		body: JSON.stringify({
			payerUserId: Number(payerUserId),
			...(couponCodes && couponCodes.length > 0 ? { couponCodes } : {})
		})
	});
}
