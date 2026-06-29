import { request } from '$lib/api/backend';
import type { NutritionalRulesEvaluation, NutritionalValues } from '$lib/api/proposed-week-menus';
import type { ProposedWeekMenuDayResponse } from '$lib/api/proposed-week-menus';

export type EstablishedWeekMenuDayCaloriesResponse = {
	date: string;
	calories: number;
};

export type EstablishedWeekMenuRequirementResponse = {
	productId: number;
	productName: string;
	requiredUnits: number;
	availableUnits: number;
	coveredUnits: number;
	missingUnits: number;
	estimatedCost: number;
};

export type EstablishedWeekMenuStockSummaryResponse = {
	plannedDays: number;
	distinctProducts: number;
	calories: {
		averagePerPlannedDay: number;
		maxDay: EstablishedWeekMenuDayCaloriesResponse | null;
		minDay: EstablishedWeekMenuDayCaloriesResponse | null;
	};
	estimatedCost: number;
	requirements: EstablishedWeekMenuRequirementResponse[];
};

export type EstablishedWeekMenuUsedStockResponse = {
	stockEntryId: number;
	productId: number;
	productName: string;
	usedUnits: number;
	price: number;
	totalCost: number;
	expirationDate: string | null;
	entryDate: string;
};

export type EstablishedWeekMenuShoppingListItemResponse = {
	productId: number;
	productName: string;
	missingUnits: number;
};

export type ManualStockAllocationRequest = {
	stockEntryId: number;
	usedUnits: number;
};

export type EstablishedWeekMenuResponse = {
	id: number;
	planningId: number;
	payerUserId: number;
	payerUsername: string;
	startDate: string;
	endDate: string;
	days: ProposedWeekMenuDayResponse[];
	nutritionalValues: NutritionalValues;
	stockSummary: EstablishedWeekMenuStockSummaryResponse;
	usedStock: EstablishedWeekMenuUsedStockResponse[];
	shoppingList: EstablishedWeekMenuShoppingListItemResponse[];
	nutritionalRules?: NutritionalRulesEvaluation;
};

function authHeaders(authorization: string) {
	return {
		Authorization: authorization
	};
}

export async function publishProposedWeekMenu(
	id: number,
	options: { payerUserId: number; stockAllocations?: ManualStockAllocationRequest[] },
	authorization: string
) {
	return await request<EstablishedWeekMenuResponse>(`/api/v1/planning/${id}/menu`, {
		method: 'POST',
		headers: authHeaders(authorization),
		body: JSON.stringify({
			payerUserId: Number(options.payerUserId),
			...(options.stockAllocations ? { stockAllocations: options.stockAllocations.map((allocation) => ({
				stockEntryId: Number(allocation.stockEntryId),
				usedUnits: Number(allocation.usedUnits)
			})) } : {})
		})
	});
}

export async function undoEstablishedWeekMenu(id: number, authorization: string) {
	await request<void>(`/api/v1/menus/${id}`, {
		method: 'DELETE',
		headers: authHeaders(authorization)
	});
}

export async function getEstablishedWeekMenu(id: number, authorization: string) {
	return await request<EstablishedWeekMenuResponse>(`/api/v1/menus/${id}`, {
		headers: authHeaders(authorization)
	});
}

export type MenuStatsDay = { date: string; calories: number };
export type MenuPeriodStats = {
	maxDay: MenuStatsDay;
	minDay: MenuStatsDay;
	averageCalories: number;
	averageCarbohydrates: number;
	averageProteins: number;
	averageFats: number;
	moneySpent: number;
};
export type MenuStatsResponse = { menuId: number; period: MenuPeriodStats; month: MenuPeriodStats };

export async function closeMenu(id: number, personIds: number[], authorization: string) {
	return await request<MenuStatsResponse>(`/api/v1/menus/${id}/close`, {
		method: 'POST',
		headers: authHeaders(authorization)
		,
		body: JSON.stringify({
			personIds: personIds.map((personId) => Number(personId))
		})
	});
}

export async function getMenuStats(id: number, authorization: string) {
	return await request<MenuStatsResponse>(`/api/v1/menus/${id}/stats`, {
		headers: authHeaders(authorization)
	});
}

export async function listMenuShoppingList(id: number, authorization: string, supermarketId?: number) {
	const query = supermarketId ? `?supermarketId=${encodeURIComponent(supermarketId)}` : '';
	return await request<EstablishedWeekMenuShoppingListItemResponse[]>(`/api/v1/menus/${id}/shopping-list${query}`, {
		headers: authHeaders(authorization)
	});
}
