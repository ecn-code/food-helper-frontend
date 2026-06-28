import { request } from '$lib/api/backend';

export type NutrientRule = { minimum: number | null; maximum: number | null };
export type NutritionalRules = {
	calories: NutrientRule;
	carbohydrates: NutrientRule;
	proteins: NutrientRule;
	fats: NutrientRule;
};

function headers(authorization: string) {
	return { Authorization: authorization };
}

export async function getNutritionalRules(authorization: string) {
	return await request<NutritionalRules>('/api/v1/nutritional-rules', { headers: headers(authorization) });
}

export async function saveNutritionalRules(values: NutritionalRules, authorization: string) {
	return await request<NutritionalRules>('/api/v1/nutritional-rules', {
		method: 'PUT',
		headers: headers(authorization),
		body: JSON.stringify(values)
	});
}
