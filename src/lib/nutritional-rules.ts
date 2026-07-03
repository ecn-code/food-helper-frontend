import type {
	NutrientRuleEvaluation,
	NutritionalRuleSetEvaluation,
	NutritionalRuleSetEvaluationResponse,
	NutritionalRulesEvaluation,
	NutritionalRulesEvaluationResponse,
	NutrientRuleEvaluationResponse
} from '$lib/api/proposed-week-menus';
import type { NutritionalValues } from '$lib/products';

export type NutritionalMetric = keyof NutritionalValues;

export const emptyNutrientRuleEvaluation: NutrientRuleEvaluation = {
	value: 0,
	minimum: null,
	maximum: null,
	status: 'NOT_CONFIGURED'
};

function isKnownStatus(status: unknown): status is NutrientRuleEvaluation['status'] {
	return (
		status === 'BELOW_MINIMUM' ||
		status === 'WITHIN_RANGE' ||
		status === 'ABOVE_MAXIMUM' ||
		status === 'NOT_CONFIGURED'
	);
}

function evaluateNutrient(value: number, rule: NutrientRuleEvaluation): NutrientRuleEvaluation {
	let status: NutrientRuleEvaluation['status'] = 'WITHIN_RANGE';

	if (rule.minimum === null && rule.maximum === null) status = 'NOT_CONFIGURED';
	else if (rule.minimum !== null && value < rule.minimum) status = 'BELOW_MINIMUM';
	else if (rule.maximum !== null && value > rule.maximum) status = 'ABOVE_MAXIMUM';

	return {
		value,
		minimum: rule.minimum,
		maximum: rule.maximum,
		status
	};
}

function evaluateRuleSet(values: NutritionalValues, rules: NutritionalRuleSetEvaluation): NutritionalRuleSetEvaluation {
	return {
		plannedDays: rules.plannedDays,
		calories: evaluateNutrient(values.calories, rules.calories),
		carbohydrates: evaluateNutrient(values.carbohydrates, rules.carbohydrates),
		proteins: evaluateNutrient(values.proteins, rules.proteins),
		fats: evaluateNutrient(values.fats, rules.fats)
	};
}

export function normalizeNutrientRuleEvaluation(
	rule: NutrientRuleEvaluationResponse | NutrientRuleEvaluation | null | undefined
): NutrientRuleEvaluation {
	const minimum = rule?.minimum ?? null;
	const maximum = rule?.maximum ?? null;
	const value = typeof rule?.value === 'number' ? rule.value : 0;
	const status = isKnownStatus(rule?.status)
		? rule.status
		: minimum === null && maximum === null
			? 'NOT_CONFIGURED'
			: minimum !== null && value < minimum
				? 'BELOW_MINIMUM'
				: maximum !== null && value > maximum
					? 'ABOVE_MAXIMUM'
					: 'WITHIN_RANGE';

	return {
		value,
		minimum,
		maximum,
		status
	};
}

export function normalizeNutritionalRuleSetEvaluation(
	rules: NutritionalRuleSetEvaluationResponse | NutritionalRuleSetEvaluation | null | undefined
): NutritionalRuleSetEvaluation {
	return {
		plannedDays: typeof rules?.plannedDays === 'number' ? rules.plannedDays : 0,
		calories: normalizeNutrientRuleEvaluation(rules?.calories),
		carbohydrates: normalizeNutrientRuleEvaluation(rules?.carbohydrates),
		proteins: normalizeNutrientRuleEvaluation(rules?.proteins),
		fats: normalizeNutrientRuleEvaluation(rules?.fats)
	};
}

export function normalizeNutritionalRulesEvaluation(
	rules: NutritionalRulesEvaluationResponse | NutritionalRulesEvaluation | null | undefined
): NutritionalRulesEvaluation | undefined {
	if (!rules) return undefined;

	return {
		daily: normalizeNutritionalRuleSetEvaluation(rules.daily),
		weekly: normalizeNutritionalRuleSetEvaluation(rules.weekly)
	};
}

export function evaluateNutritionRules(
	values: NutritionalValues,
	rules: NutritionalRulesEvaluation | NutritionalRulesEvaluationResponse | null | undefined
): NutritionalRulesEvaluation {
	const normalizedRules = normalizeNutritionalRulesEvaluation(rules) ?? {
		daily: normalizeNutritionalRuleSetEvaluation(undefined),
		weekly: normalizeNutritionalRuleSetEvaluation(undefined)
	};

	return {
		daily: evaluateRuleSet(values, normalizedRules.daily),
		weekly: evaluateRuleSet(values, normalizedRules.weekly)
	};
}
