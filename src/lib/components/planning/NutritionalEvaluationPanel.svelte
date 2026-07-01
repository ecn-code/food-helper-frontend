<script lang="ts">
	import type { NutritionalRulesEvaluation } from '$lib/api/proposed-week-menus';
	import {
		nutritionalMetricFields,
		formatNumber,
		statusLabel,
		statusTone,
		statusCardTone
	} from '$lib/components/planning/nutritional-evaluation';

	let { evaluation }: { evaluation: NutritionalRulesEvaluation } = $props();
</script>

<section class="space-y-4 rounded-lg border bg-[hsl(var(--card))]" data-testid="nutritional-evaluation">
	<div class="border-b p-4">
		<h3 class="text-base font-semibold">Evaluación nutricional</h3>
		<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
			Compara la planificación global con sus límites configurados.
		</p>
	</div>

	<div class="bg-[hsl(var(--border))] p-px">
		<section class="bg-[hsl(var(--card))] p-4" data-testid="nutritional-evaluation-global">
			<div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h4 class="text-sm font-semibold text-[hsl(var(--foreground))]">Reglas globales</h4>
					<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
						Se aplican una sola vez al total del menú.
					</p>
				</div>
				<p class="text-xs text-[hsl(var(--muted-foreground))]">
					{evaluation.weekly.plannedDays} días planificados
				</p>
			</div>

			<div class="mt-4 grid gap-px bg-[hsl(var(--border))] sm:grid-cols-2 lg:grid-cols-4">
				{#each nutritionalMetricFields as field}
					{@const rule = evaluation.weekly[field.key]}
					<div class={`p-4 ${statusCardTone(rule.status)}`}>
						<div class="flex items-center justify-between gap-2">
							<p class="text-sm font-medium">{field.label}</p>
							<span class={`rounded-md px-2 py-1 text-xs font-medium ${statusTone(rule.status)}`}>
								{statusLabel(rule.status)}
							</span>
						</div>
						<p class="mt-3 text-xl font-semibold tabular-nums">
							{formatNumber(rule.value)}
							<span class="text-xs font-normal text-[hsl(var(--muted-foreground))]">{field.unit}</span>
						</p>
					</div>
				{/each}
			</div>
		</section>
	</div>
</section>
