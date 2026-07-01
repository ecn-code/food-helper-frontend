import type {
	NutrientRuleEvaluation,
	NutritionalRuleSetEvaluation,
	NutritionalRulesEvaluation
} from '$lib/api/proposed-week-menus';
import type { NutritionalValues } from '$lib/products';

export type NutritionalMetric = keyof NutritionalValues;

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

export function evaluateNutritionRules(
	values: NutritionalValues,
	rules: NutritionalRulesEvaluation
): NutritionalRulesEvaluation {
	return {
		daily: evaluateRuleSet(values, rules.daily),
		weekly: evaluateRuleSet(values, rules.weekly)
	};
}
