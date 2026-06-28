<script lang="ts">
	import type { NutritionalRulesEvaluation } from '$lib/api/proposed-week-menus';
	let { evaluation }: { evaluation: NutritionalRulesEvaluation } = $props();
	const fields: { key: 'calories' | 'carbohydrates' | 'proteins' | 'fats'; label: string; unit: string }[] = [
		{ key: 'calories', label: 'Calorías', unit: 'kcal' }, { key: 'carbohydrates', label: 'Carbohidratos', unit: 'g' }, { key: 'proteins', label: 'Proteínas', unit: 'g' }, { key: 'fats', label: 'Grasas', unit: 'g' }
	];
	function label(status: string) { return status === 'BELOW_MINIMUM' ? 'Bajo' : status === 'ABOVE_MAXIMUM' ? 'Alto' : status === 'WITHIN_RANGE' ? 'Correcto' : 'Sin regla'; }
	function tone(status: string) { return status === 'WITHIN_RANGE' ? 'bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))]' : status === 'NOT_CONFIGURED' ? 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]' : 'bg-[hsl(var(--destructive)/0.08)] text-[hsl(var(--destructive))]'; }
	function number(value: number) { return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value); }
</script>
<section class="rounded-lg border bg-[hsl(var(--card))]" data-testid="nutritional-evaluation"><div class="border-b p-4"><h3 class="text-base font-semibold">Evaluación nutricional</h3><p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Media diaria sobre {evaluation.plannedDays} días planificados.</p></div><div class="grid gap-px bg-[hsl(var(--border))] sm:grid-cols-2 lg:grid-cols-4">{#each fields as field}{@const rule = evaluation[field.key]}<div class="bg-[hsl(var(--card))] p-4"><div class="flex items-center justify-between gap-2"><p class="text-sm font-medium">{field.label}</p><span class={`rounded-md px-2 py-1 text-xs font-medium ${tone(rule.status)}`}>{label(rule.status)}</span></div><p class="mt-3 text-xl font-semibold tabular-nums">{number(rule.value)} <span class="text-xs font-normal text-[hsl(var(--muted-foreground))]">{field.unit}</span></p><p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{rule.minimum === null ? '—' : number(rule.minimum)} – {rule.maximum === null ? '—' : number(rule.maximum)}</p></div>{/each}</div></section>
