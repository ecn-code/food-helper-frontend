import { request } from '$lib/api/backend';

export type PlanningState = 'DRAFT' | 'ESTABLISHED' | 'CLOSED';

export type PlanningMenuResponse = {
	id: number;
	startDate: string;
	endDate: string;
	plannedDays: number;
	state: PlanningState;
	menuId: number | null;
};

function headers(authorization: string) {
	return { Authorization: authorization };
}

export async function listPlanning(authorization: string) {
	return await request<PlanningMenuResponse[]>('/api/v1/planning', {
		headers: headers(authorization)
	});
}
