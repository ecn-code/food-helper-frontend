import type { NutrientRuleEvaluation } from '$lib/api/proposed-week-menus';
import type { NutritionalMetric } from '$lib/nutritional-rules';

export const nutritionalMetricFields: { key: NutritionalMetric; label: string; unit: string }[] = [
	{ key: 'calories', label: 'Calorías', unit: 'kcal' },
	{ key: 'carbohydrates', label: 'Carbohidratos', unit: 'g' },
	{ key: 'proteins', label: 'Proteínas', unit: 'g' },
	{ key: 'fats', label: 'Grasas', unit: 'g' }
];

export function statusLabel(status: NutrientRuleEvaluation['status']) {
	if (status === 'BELOW_MINIMUM') return 'Bajo';
	if (status === 'ABOVE_MAXIMUM') return 'Alto';
	if (status === 'WITHIN_RANGE') return 'Correcto';
	return 'Sin regla';
}

export function statusTone(status: NutrientRuleEvaluation['status']) {
	if (status === 'WITHIN_RANGE') return 'bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))]';
	if (status === 'NOT_CONFIGURED') return 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]';
	return 'bg-[hsl(var(--destructive)/0.08)] text-[hsl(var(--destructive))]';
}

export function statusCardTone(status: NutrientRuleEvaluation['status']) {
	if (status === 'WITHIN_RANGE') return 'border-[hsl(var(--border))] bg-[hsl(var(--card))]';
	if (status === 'NOT_CONFIGURED') return 'border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.18)]';
	return 'border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.06)]';
}

export function formatNumber(value: number) {
	return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value);
}
