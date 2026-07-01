import { request } from '$lib/api/backend';

export type NutritionalValues = {
	calories: number;
	carbohydrates: number;
	proteins: number;
	fats: number;
};

export type NutrientRuleEvaluation = {
	value: number;
	minimum: number | null;
	maximum: number | null;
	status: 'BELOW_MINIMUM' | 'WITHIN_RANGE' | 'ABOVE_MAXIMUM' | 'NOT_CONFIGURED';
};

export type NutritionalRuleSetEvaluation = {
	plannedDays: number;
	calories: NutrientRuleEvaluation;
	carbohydrates: NutrientRuleEvaluation;
	proteins: NutrientRuleEvaluation;
	fats: NutrientRuleEvaluation;
};

export type NutritionalRulesEvaluation = {
	daily: NutritionalRuleSetEvaluation;
	weekly: NutritionalRuleSetEvaluation;
};

export type CreateProposedWeekMenuRequest = {
	startDate: string;
	endDate: string;
};

export type ProposedWeekMenuProductRequest = {
	productId: number;
	units?: number | null;
	grams?: number | null;
	sortOrder: number;
};

export type ProposedWeekMenuSectionRequest = {
	dayPartId: number;
	products: ProposedWeekMenuProductRequest[];
};

export type UpsertProposedWeekMenuDayRequest = {
	date: string;
	sections: ProposedWeekMenuSectionRequest[];
};

export type ProposedWeekMenuProductResponse = {
	productId: number;
	productName: string;
	units: number;
	grams: number;
	sortOrder: number;
	nutritionalValues: NutritionalValues;
};

export type ProposedWeekMenuSectionResponse = {
	id: number;
	dayPartId: number;
	name: string;
	description: string;
	sortOrder: number;
	products: ProposedWeekMenuProductResponse[];
	nutritionalValues: NutritionalValues;
};

export type ProposedWeekMenuDayPartResponse = {
	id: number;
	name: string;
	description: string;
	sortOrder: number;
};

export type ProposedWeekMenuDayPartRequest = {
	name: string;
	description: string;
	sortOrder: number;
};

export type ProposedWeekMenuDayResponse = {
	id: number;
	date: string;
	sections: ProposedWeekMenuSectionResponse[];
	nutritionalValues: NutritionalValues;
};

export type ProposedWeekMenuResponse = {
	id: number;
	startDate: string;
	endDate: string;
	days: ProposedWeekMenuDayResponse[];
	nutritionalValues: NutritionalValues;
	stockSummary?: unknown;
	nutritionalRules?: NutritionalRulesEvaluation;
};

function authHeaders(authorization: string) {
	return {
		Authorization: authorization
	};
}

function sanitizeNumber(value: number | null | undefined) {
	if (value === null || value === undefined) return undefined;
	return Number(value);
}

function sanitizeCreateRequest(values: CreateProposedWeekMenuRequest): CreateProposedWeekMenuRequest {
	return {
		startDate: values.startDate.trim(),
		endDate: values.endDate.trim()
	};
}

function sanitizeUpsertDayRequest(values: UpsertProposedWeekMenuDayRequest): UpsertProposedWeekMenuDayRequest {
	return {
		date: values.date.trim(),
		sections: values.sections.map((section) => ({
			dayPartId: Number(section.dayPartId),
			products: section.products.map((product) => ({
				productId: Number(product.productId),
				sortOrder: Number(product.sortOrder),
				...(product.units === undefined || product.units === null ? {} : { units: sanitizeNumber(product.units) }),
				...(product.grams === undefined || product.grams === null ? {} : { grams: sanitizeNumber(product.grams) })
			}))
		}))
	};
}

function sanitizeDayPartRequest(values: ProposedWeekMenuDayPartRequest): ProposedWeekMenuDayPartRequest {
	return {
		name: values.name.trim(),
		description: values.description.trim(),
		sortOrder: Number(values.sortOrder)
	};
}

export async function listProposedWeekMenuDayParts(authorization: string) {
	return await request<ProposedWeekMenuDayPartResponse[]>('/api/v1/planning/day-parts', {
		headers: authHeaders(authorization)
	});
}

export async function createProposedWeekMenuDayPart(
	values: ProposedWeekMenuDayPartRequest,
	authorization: string
) {
	return await request<ProposedWeekMenuDayPartResponse>('/api/v1/planning/day-parts', {
		method: 'POST',
		headers: authHeaders(authorization),
		body: JSON.stringify(sanitizeDayPartRequest(values))
	});
}

export async function updateProposedWeekMenuDayPart(
	id: number,
	values: ProposedWeekMenuDayPartRequest,
	authorization: string
) {
	return await request<ProposedWeekMenuDayPartResponse>(`/api/v1/planning/day-parts/${id}`, {
		method: 'PUT',
		headers: authHeaders(authorization),
		body: JSON.stringify(sanitizeDayPartRequest(values))
	});
}

export async function createProposedWeekMenu(
	values: CreateProposedWeekMenuRequest,
	authorization: string
) {
	return await request<ProposedWeekMenuResponse>('/api/v1/planning', {
		method: 'POST',
		headers: authHeaders(authorization),
		body: JSON.stringify(sanitizeCreateRequest(values))
	});
}

export async function getProposedWeekMenu(id: number, authorization: string) {
	return await request<ProposedWeekMenuResponse>(`/api/v1/planning/${id}`, {
		headers: authHeaders(authorization)
	});
}

export async function upsertProposedWeekMenuDay(
	id: number,
	values: UpsertProposedWeekMenuDayRequest,
	authorization: string
) {
	return await request<ProposedWeekMenuResponse>(`/api/v1/planning/${id}/days`, {
		method: 'PUT',
		headers: authHeaders(authorization),
		body: JSON.stringify(sanitizeUpsertDayRequest(values))
	});
}
