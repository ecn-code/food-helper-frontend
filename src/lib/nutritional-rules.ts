import type {
	NutrientRuleEvaluation,
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

export function evaluateDailyNutrition(
	values: NutritionalValues,
	rules: NutritionalRulesEvaluation
): NutritionalRulesEvaluation {
	return {
		plannedDays: 1,
		calories: evaluateNutrient(values.calories, rules.calories),
		carbohydrates: evaluateNutrient(values.carbohydrates, rules.carbohydrates),
		proteins: evaluateNutrient(values.proteins, rules.proteins),
		fats: evaluateNutrient(values.fats, rules.fats)
	};
}
