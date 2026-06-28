<script lang="ts">
	import { tick } from 'svelte';
	import { Droplets, Drumstick, Flame, SlidersHorizontal, Wheat, X } from '@lucide/svelte';
	import Button from '$lib/components/ui/Button.svelte';

	type FilterRange = {
		min: string;
		max: string;
	};

	type FilterMetric = {
		key: string;
		label: string;
		shortLabel: string;
	};

	const inputClass =
		'h-10 w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm text-[hsl(var(--foreground))] shadow-sm transition-colors placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.14)]';

	const iconByMetric = {
		calories: Flame,
		carbohydrates: Wheat,
		proteins: Drumstick,
		fats: Droplets
	};

	let {
		metrics,
		ranges,
		onApply,
		testIdPrefix,
		description = 'Combina varios campos con lógica AND. Deja vacío un lado para usar solo un límite.'
	}: {
		metrics: FilterMetric[];
		ranges: Record<string, FilterRange>;
		onApply: (next: Record<string, FilterRange>) => void;
		testIdPrefix: string;
		description?: string;
	} = $props();

	let dialogOpen = $state(false);
	let draftRanges = $state<Record<string, FilterRange>>({});
	let dialogElement = $state<HTMLDivElement | null>(null);
	let triggerElement = $state<HTMLButtonElement | null>(null);

	function cloneRanges(source: Record<string, FilterRange>) {
		return Object.fromEntries(metrics.map((metric) => [metric.key, { ...source[metric.key] }]));
	}

	function activeSummaries() {
		return metrics.flatMap((metric) => {
			const range = ranges[metric.key];
			if (!range) return [];

			const min = range.min.trim();
			const max = range.max.trim();
			if (min && max) return [`${metric.shortLabel}: ${min}–${max}`];
			if (min) return [`${metric.shortLabel} ≥ ${min}`];
			if (max) return [`${metric.shortLabel} ≤ ${max}`];
			return [];
		});
	}

	async function openDialog() {
		draftRanges = cloneRanges(ranges);
		dialogOpen = true;
		await tick();
		dialogElement?.focus();
	}

	function closeDialog() {
		dialogOpen = false;
		void tick().then(() => triggerElement?.focus());
	}

	function updateDraft(metric: string, bound: keyof FilterRange, value: string) {
		draftRanges = {
			...draftRanges,
			[metric]: {
				...draftRanges[metric],
				[bound]: value
			}
		};
	}

	function clearDraft() {
		draftRanges = Object.fromEntries(metrics.map((metric) => [metric.key, { min: '', max: '' }]));
	}

	function applyDraft() {
		onApply(cloneRanges(draftRanges));
		closeDialog();
	}

	function handleDialogKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') closeDialog();
	}
</script>

<button
	bind:this={triggerElement}
	type="button"
	class="flex w-full min-w-0 items-center gap-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.16)] px-3 py-2.5 text-left transition-colors hover:bg-[hsl(var(--secondary)/0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
	onclick={openDialog}
	data-testid={`${testIdPrefix}-advanced-trigger`}
>
	<SlidersHorizontal class="size-4 shrink-0 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
	<span class="min-w-0 flex-1">
		<span class="block text-sm font-medium text-[hsl(var(--foreground))]">Filtro avanzado</span>
		<span class="mt-0.5 block break-words text-xs font-normal text-[hsl(var(--muted-foreground))]">
			{activeSummaries().length > 0 ? activeSummaries().join(' · ') : 'Sin filtros nutricionales aplicados'}
		</span>
	</span>
	{#if activeSummaries().length > 0}
		<span class="shrink-0 rounded-md bg-[hsl(var(--primary)/0.1)] px-2 py-0.5 text-xs font-medium tabular-nums text-[hsl(var(--primary))]">
			{activeSummaries().length}
		</span>
	{/if}
</button>

{#if dialogOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/35 p-3 backdrop-blur-sm sm:p-4"
		role="presentation"
		onclick={(event) => event.currentTarget === event.target && closeDialog()}
	>
		<div
			bind:this={dialogElement}
			class="flex max-h-[calc(100vh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl sm:max-h-[calc(100vh-2rem)]"
			role="dialog"
			aria-modal="true"
			aria-labelledby={`${testIdPrefix}-advanced-title`}
			tabindex="-1"
			onkeydown={handleDialogKeydown}
			data-testid={`${testIdPrefix}-advanced-dialog`}
		>
			<header class="flex items-start justify-between gap-4 border-b border-[hsl(var(--border))] p-4 sm:p-5">
				<div class="min-w-0">
					<h2 id={`${testIdPrefix}-advanced-title`} class="text-lg font-semibold text-[hsl(var(--foreground))]">
						Filtro avanzado
					</h2>
					<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{description}</p>
				</div>
				<Button variant="ghost" size="icon" type="button" onclick={closeDialog} aria-label="Cerrar filtro avanzado">
					<X class="size-4" aria-hidden="true" />
				</Button>
			</header>

			<div class="grid gap-3 overflow-y-auto p-4 sm:grid-cols-2 sm:p-5">
				{#each metrics as metric}
					{@const Icon = iconByMetric[metric.key as keyof typeof iconByMetric]}
					<div class="rounded-md border border-[hsl(var(--border))] p-3">
						<div class="flex items-center gap-2">
							{#if Icon}
								<Icon class="size-4 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
							{/if}
							<p class="text-sm font-medium text-[hsl(var(--foreground))]">{metric.label}</p>
						</div>

						<div class="mt-3 grid grid-cols-2 gap-2">
							<label class="min-w-0">
								<span class="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]">Mínimo</span>
								<input
									class={inputClass}
									type="number"
									step="any"
									placeholder="Sin mínimo"
									value={draftRanges[metric.key]?.min ?? ''}
									oninput={(event) => updateDraft(metric.key, 'min', event.currentTarget.value)}
									data-testid={`${testIdPrefix}-${metric.key}-min`}
								/>
							</label>

							<label class="min-w-0">
								<span class="mb-1 block text-xs font-medium text-[hsl(var(--muted-foreground))]">Máximo</span>
								<input
									class={inputClass}
									type="number"
									step="any"
									placeholder="Sin máximo"
									value={draftRanges[metric.key]?.max ?? ''}
									oninput={(event) => updateDraft(metric.key, 'max', event.currentTarget.value)}
									data-testid={`${testIdPrefix}-${metric.key}-max`}
								/>
							</label>
						</div>
					</div>
				{/each}
			</div>

			<footer class="flex flex-wrap items-center justify-between gap-3 border-t border-[hsl(var(--border))] p-4 sm:px-5">
				<Button type="button" variant="ghost" size="sm" onclick={clearDraft}>Limpiar</Button>
				<div class="ml-auto flex items-center gap-2">
					<Button type="button" variant="secondary" size="sm" onclick={closeDialog}>Cancelar</Button>
					<Button type="button" size="sm" onclick={applyDraft} data-testid={`${testIdPrefix}-advanced-apply`}>
						Guardar y aplicar
					</Button>
				</div>
			</footer>
		</div>
	</div>
{/if}
