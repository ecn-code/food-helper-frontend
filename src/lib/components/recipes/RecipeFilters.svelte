<script lang="ts">
	import { BookOpen, Package, Search, X } from '@lucide/svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import NutritionRangeFilter from '$lib/components/filters/NutritionRangeFilter.svelte';
	import {
		RECIPE_FILTER_METRICS,
		hasActiveRecipeFilters,
		type RecipeDerivedFilter,
		type RecipeFilters,
		updateRecipeFilterDerived,
		updateRecipeFilterSearch
	} from '$lib/recipe-filters';

	const inputClass =
		'h-10 w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm text-[hsl(var(--foreground))] shadow-sm transition-colors placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.14)] disabled:cursor-not-allowed disabled:bg-[hsl(var(--muted))] disabled:opacity-70';
	const fieldLabelClass = 'mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]';

	const derivedOptions: Array<{ value: RecipeDerivedFilter; label: string }> = [
		{ value: 'all', label: 'Todas' },
		{ value: 'with-derived', label: 'Con derivado' },
		{ value: 'without-derived', label: 'Sin derivado' }
	];

	let {
		filters,
		onChange,
		onClear,
		testIdPrefix = 'recipe-filter'
	}: {
		filters: RecipeFilters;
		onChange: (next: RecipeFilters) => void;
		onClear: () => void;
		testIdPrefix?: string;
	} = $props();

	function setSearch(value: string) {
		onChange(updateRecipeFilterSearch(filters, value));
	}

	function setDerived(value: RecipeDerivedFilter) {
		onChange(updateRecipeFilterDerived(filters, value));
	}

	function applyAdvancedFilters(next: Record<string, { min: string; max: string }>) {
		onChange({
			...filters,
			metrics: {
				calories: { ...next.calories },
				carbohydrates: { ...next.carbohydrates },
				proteins: { ...next.proteins },
				fats: { ...next.fats }
			}
		});
	}
</script>

<div class="space-y-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
	<div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
		<label class="block min-w-0">
			<span class={fieldLabelClass}>Filtro rápido</span>
			<div class="relative">
				<Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
				<input
					class={`${inputClass} pl-9`}
					placeholder="Buscar por receta, descripción o ingrediente"
					value={filters.search}
					oninput={(event) => setSearch((event.currentTarget as HTMLInputElement).value)}
					data-testid={`${testIdPrefix}-search`}
				/>
			</div>
		</label>

		<fieldset>
			<legend class={fieldLabelClass}>Derivado</legend>
			<div class="inline-flex rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.2)] p-1">
				{#each derivedOptions as option}
					<button
						type="button"
						class={`inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-sm font-medium transition ${
							filters.derived === option.value
								? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm'
								: 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
						}`}
						onclick={() => setDerived(option.value)}
						data-testid={`${testIdPrefix}-derived-${option.value}`}
					>
						{#if option.value === 'all'}
							<BookOpen class="size-4" aria-hidden="true" />
						{:else}
							<Package class="size-4" aria-hidden="true" />
						{/if}
						{option.label}
					</button>
				{/each}
			</div>
		</fieldset>
	</div>

	<NutritionRangeFilter
		metrics={RECIPE_FILTER_METRICS}
		ranges={filters.metrics}
		onApply={applyAdvancedFilters}
		{testIdPrefix}
		description="Define los límites nutricionales de las recetas. Todos los valores guardados se combinarán."
	/>

	<div class="flex flex-wrap items-center justify-between gap-3">
		<p class="text-xs text-[hsl(var(--muted-foreground))]">
			La búsqueda rápida incluye ingredientes de las recetas cargadas.
		</p>
		{#if hasActiveRecipeFilters(filters)}
			<Button type="button" variant="ghost" size="sm" onclick={onClear}>
				<X class="size-4" aria-hidden="true" />
				Limpiar filtros
			</Button>
		{/if}
	</div>
</div>
