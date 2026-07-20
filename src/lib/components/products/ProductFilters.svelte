<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { Search, X } from '@lucide/svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import NutritionRangeFilter from '$lib/components/filters/NutritionRangeFilter.svelte';
	import {
		PRODUCT_FILTER_METRICS,
		hasActiveProductFilters,
		type ProductFilters,
		updateProductFilterSearch
	} from '$lib/product-filters';

	const inputClass =
		'h-10 w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm text-[hsl(var(--foreground))] shadow-sm transition-colors placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.14)] disabled:cursor-not-allowed disabled:bg-[hsl(var(--muted))] disabled:opacity-70';
	const fieldLabelClass = 'mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]';

	let {
		filters,
		onChange,
		onClear,
		testIdPrefix = 'product-filter',
		focusOnMount = false
	}: {
		filters: ProductFilters;
		onChange: (next: ProductFilters) => void;
		onClear: () => void;
		testIdPrefix?: string;
		focusOnMount?: boolean;
	} = $props();

	let searchInput = $state<HTMLInputElement | null>(null);

	function setSearch(value: string) {
		onChange(updateProductFilterSearch(filters, value));
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

	async function focusSearchInput() {
		await tick();
		searchInput?.focus();
	}

	onMount(() => {
		if (focusOnMount) {
			void focusSearchInput();
		}
	});
</script>

<div class="space-y-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
	<label class="block min-w-0">
		<span class={fieldLabelClass}>Filtro rápido <span class="font-normal text-[hsl(var(--muted-foreground))]">(La búsqueda rápida actúa sobre nombre y descripción.)</span></span>
		<div class="relative">
			<Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
			<input
				class={`${inputClass} pl-9`}
				placeholder="Buscar por nombre o descripción"
				value={filters.search}
				bind:this={searchInput}
				oninput={(event) => setSearch((event.currentTarget as HTMLInputElement).value)}
				data-testid={`${testIdPrefix}-search`}
			/>
		</div>
	</label>

	<NutritionRangeFilter
		metrics={PRODUCT_FILTER_METRICS}
		ranges={filters.metrics}
		onApply={applyAdvancedFilters}
		{testIdPrefix}
		description="Define los límites nutricionales por 100 g. Todos los valores guardados se combinarán."
	/>

	<div class="flex flex-wrap items-center justify-end gap-3">
		{#if hasActiveProductFilters(filters)}
			<Button type="button" variant="ghost" size="sm" onclick={onClear}>
				<X class="size-4" aria-hidden="true" />
				Limpiar filtros
			</Button>
		{/if}
	</div>
</div>
