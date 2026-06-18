import { request } from '$lib/api/backend';
import type { NutritionalValues } from '$lib/api/proposed-week-menus';
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

export type EstablishedWeekMenuResponse = {
	id: number;
	proposedWeekMenuId: number;
	startDate: string;
	endDate: string;
	days: ProposedWeekMenuDayResponse[];
	nutritionalValues: NutritionalValues;
	stockSummary: EstablishedWeekMenuStockSummaryResponse;
	usedStock: EstablishedWeekMenuUsedStockResponse[];
	shoppingList: EstablishedWeekMenuShoppingListItemResponse[];
};

function authHeaders(authorization: string) {
	return {
		Authorization: authorization
	};
}

export async function publishProposedWeekMenu(id: number, authorization: string) {
	return await request<EstablishedWeekMenuResponse>(`/api/v1/proposed-week-menus/${id}/publish`, {
		method: 'POST',
		headers: authHeaders(authorization)
	});
}

export async function getEstablishedWeekMenu(id: number, authorization: string) {
	return await request<EstablishedWeekMenuResponse>(`/api/v1/established-week-menus/${id}`, {
		headers: authHeaders(authorization)
	});
}
