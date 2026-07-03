<script lang="ts">
	import type { NutritionalRulesEvaluation } from '$lib/api/proposed-week-menus';
	import {
		emptyNutrientRuleEvaluation,
		nutritionalMetricFields,
		formatNumber,
		statusLabel,
		statusTone,
		statusCardTone
	} from '$lib/components/planning/nutritional-evaluation';

	let { evaluation }: { evaluation: NutritionalRulesEvaluation } = $props();
</script>

<section class="space-y-4 rounded-lg border bg-[hsl(var(--card))]" data-testid="nutritional-evaluation">
	<div
		class="flex flex-col gap-4 border-b p-4 xl:flex-row xl:items-start xl:justify-between"
		data-testid="nutritional-evaluation-global"
	>
		<div class="min-w-0">
			<div class="flex flex-wrap items-center gap-2">
				<h3 class="text-base font-semibold text-[hsl(var(--foreground))]">Evaluación nutricional</h3>
				<span class="inline-flex w-fit items-center gap-1.5 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] px-2 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))]">
					{evaluation.weekly.plannedDays} días planificados
				</span>
			</div>
			<p class="mt-1 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
				Compara la planificación global con sus límites configurados.
			</p>
			<p class="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
				Reglas globales aplicadas una sola vez al total del menú.
			</p>
		</div>

		<div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
			{#each nutritionalMetricFields as field}
				{@const rule = evaluation.weekly[field.key] ?? emptyNutrientRuleEvaluation}
				<div class={`min-w-0 rounded-md border p-3 ${statusCardTone(rule.status)}`}>
					<div class="flex items-start justify-between gap-2">
						<p class="text-xs font-medium text-[hsl(var(--muted-foreground))]">{field.label}</p>
						<span class={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium ${statusTone(rule.status)}`}>
							{statusLabel(rule.status)}
						</span>
					</div>
					<p class="mt-2 text-lg font-semibold tabular-nums text-[hsl(var(--foreground))]">
						{formatNumber(rule.value)}
						<span class="text-xs font-normal text-[hsl(var(--muted-foreground))]">{field.unit}</span>
					</p>
				</div>
			{/each}
		</div>
	</div>
</section>
