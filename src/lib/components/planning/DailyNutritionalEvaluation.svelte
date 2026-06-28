<script lang="ts">
	import { Droplets, Drumstick, Flame, Wheat } from '@lucide/svelte';
	import type { NutritionalRulesEvaluation } from '$lib/api/proposed-week-menus';
	import type { NutritionalValues } from '$lib/products';
	import { evaluateDailyNutrition, type NutritionalMetric } from '$lib/nutritional-rules';

	let {
		values,
		rules
	}: {
		values: NutritionalValues;
		rules: NutritionalRulesEvaluation;
	} = $props();

	const fields: { key: NutritionalMetric; label: string; unit: string }[] = [
		{ key: 'calories', label: 'Calorías', unit: 'kcal' },
		{ key: 'carbohydrates', label: 'Carbos', unit: 'g' },
		{ key: 'proteins', label: 'Proteínas', unit: 'g' },
		{ key: 'fats', label: 'Grasas', unit: 'g' }
	];

	const evaluation = $derived(evaluateDailyNutrition(values, rules));

	function statusLabel(status: string) {
		if (status === 'BELOW_MINIMUM') return 'Bajo';
		if (status === 'ABOVE_MAXIMUM') return 'Alto';
		if (status === 'WITHIN_RANGE') return 'Correcto';
		return 'Sin regla';
	}

	function statusTone(status: string) {
		if (status === 'WITHIN_RANGE') return 'bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))]';
		if (status === 'NOT_CONFIGURED') return 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]';
		return 'bg-[hsl(var(--destructive)/0.08)] text-[hsl(var(--destructive))]';
	}

	function formatNumber(value: number) {
		return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value);
	}

	function targetLabel(minimum: number | null, maximum: number | null, unit: string) {
		if (minimum === null && maximum === null) return 'Sin límites configurados';
		if (minimum === null) return `Máximo ${formatNumber(maximum!)} ${unit}`;
		if (maximum === null) return `Mínimo ${formatNumber(minimum)} ${unit}`;
		return `Objetivo ${formatNumber(minimum)}–${formatNumber(maximum)} ${unit}`;
	}
</script>

<div
	class="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
	aria-label="Evaluación nutricional del día"
	data-testid="daily-nutritional-evaluation"
>
	{#each fields as field}
		{@const rule = evaluation[field.key]}
		<div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
			<div class="flex min-w-0 items-center justify-between gap-2">
				<div class="flex min-w-0 items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
					<span class="grid size-6 shrink-0 place-items-center rounded-md bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]">
						{#if field.key === 'calories'}<Flame class="size-4" aria-hidden="true" />
						{:else if field.key === 'carbohydrates'}<Wheat class="size-4" aria-hidden="true" />
						{:else if field.key === 'proteins'}<Drumstick class="size-4" aria-hidden="true" />
						{:else}<Droplets class="size-4" aria-hidden="true" />{/if}
					</span>
					<p class="truncate">{field.label}</p>
				</div>
				<span
					class={`shrink-0 rounded-md px-2 py-1 text-xs font-medium ${statusTone(rule.status)}`}
					data-testid={`daily-nutritional-status-${field.key}`}
				>
					{statusLabel(rule.status)}
				</span>
			</div>
			<p class="mt-3 break-words text-2xl font-semibold tracking-tight text-[hsl(var(--foreground))] tabular-nums">
				{formatNumber(rule.value)}
			</p>
			<p class="mt-1 break-words text-xs text-[hsl(var(--muted-foreground))]">
				{targetLabel(rule.minimum, rule.maximum, field.unit)}
			</p>
		</div>
	{/each}
</div>
