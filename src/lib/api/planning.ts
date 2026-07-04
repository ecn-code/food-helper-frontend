import { request } from '$lib/api/backend';

export type PlanningState = 'DRAFT' | 'ESTABLISHED' | 'CLOSED';

export type PlanningCouponUnavailabilityReason = 'CONDITION_NOT_MET' | 'USED_WITHIN_PERIOD';

export type PlanningMenuResponse = {
	id: number;
	startDate: string;
	endDate: string;
	plannedDays: number;
	state: PlanningState;
	menuId: number | null;
};

export type PlanningCouponResponse = {
	code: string;
	name: string;
	rewardAmount: number;
	periodDays: number;
	available: boolean;
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
