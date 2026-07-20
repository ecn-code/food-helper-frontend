<script lang="ts">
	import { Droplets, Drumstick, Flame, Wheat } from '@lucide/svelte';
	import type { NutritionalRuleSetEvaluation } from '$lib/api/proposed-week-menus';
	import {
		emptyNutrientRuleEvaluation,
		formatNumber,
		nutritionalMetricFields,
		statusLabel,
		statusTone,
		statusCardTone
	} from '$lib/components/planning/nutritional-evaluation';

	let {
		evaluation
	}: {
		evaluation: NutritionalRuleSetEvaluation;
	} = $props();
</script>

<div
	class="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
	aria-label="Evaluación nutricional del día"
	data-testid="daily-nutritional-evaluation"
>
	{#each nutritionalMetricFields as field}
		{@const rule = evaluation[field.key] ?? emptyNutrientRuleEvaluation}
		<div class={`rounded-lg border p-4 shadow-sm ${statusCardTone(rule.status)}`}>
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
		</div>
	{/each}
</div>
