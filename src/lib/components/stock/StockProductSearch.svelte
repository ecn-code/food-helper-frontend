<script lang="ts">
	import { onMount } from 'svelte';
	import { Search, X } from '@lucide/svelte';
	import { listProductsPage } from '$lib/api/products';
	import Button from '$lib/components/ui/Button.svelte';
	import { emptyProductFilters, type ProductFilters as ProductFiltersState } from '$lib/product-filters';
	import type { Product } from '$lib/products';

	const PAGE_SIZE = 8;
	const MIN_QUERY_LENGTH = 2;
	const inputClass =
		'h-10 w-full cursor-text select-text rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 pl-10 text-sm text-[hsl(var(--foreground))] shadow-sm transition-colors placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.14)] disabled:cursor-not-allowed disabled:bg-[hsl(var(--muted))] disabled:opacity-70';

	let {
		authorization,
		selectedProduct = null,
		onSelect,
		onClear,
		testId = 'stock-product-search'
	}: {
		authorization: string;
		selectedProduct?: Product | null;
		onSelect: (product: Product) => void;
		onClear?: () => void;
		testId?: string;
	} = $props();

	let search = $state('');
	let results = $state<Product[]>([]);
	let totalResults = $state(0);
	let loaded = $state(false);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let refreshTimer: ReturnType<typeof setTimeout> | null = null;
	let requestToken = 0;

	function clearRefreshTimer() {
		if (refreshTimer !== null) {
			clearTimeout(refreshTimer);
			refreshTimer = null;
		}
	}

	function buildFilters(): ProductFiltersState {
		const filters = emptyProductFilters();
		filters.search = search.trim();
		return filters;
	}

	async function loadResults() {
		const query = search.trim();
		const request = ++requestToken;

		if (query.length < MIN_QUERY_LENGTH) {
			results = [];
			totalResults = 0;
			loaded = false;
			loading = false;
			error = null;
			return;
		}

		loading = true;
		error = null;

		try {
			const response = await listProductsPage(authorization, {
				page: 0,
				size: PAGE_SIZE,
				filters: buildFilters()
			});

			if (request !== requestToken) return;
			results = response.items;
			totalResults = response.totalElements;
			loaded = true;
		} catch (cause) {
			if (request !== requestToken) return;
			error = cause instanceof Error ? cause.message : 'No se pudieron cargar los productos.';
		} finally {
			if (request === requestToken) {
				loading = false;
			}
		}
	}

	function scheduleLoad(immediate = false) {
		clearRefreshTimer();

		if (immediate) {
			void loadResults();
			return;
		}

		refreshTimer = setTimeout(() => {
			refreshTimer = null;
			void loadResults();
		}, 220);
	}

	function handleInput(event: Event) {
		search = (event.currentTarget as HTMLInputElement).value;
		scheduleLoad();
	}

	function selectProduct(product: Product) {
		onSelect(product);
		search = '';
		results = [];
		totalResults = 0;
		loaded = false;
		error = null;
	}

	function clearSelection() {
		onClear?.();
	}

	$effect(() => {
		if (selectedProduct) {
			error = null;
		}
	});

	onMount(() => {
		return () => {
			clearRefreshTimer();
			requestToken += 1;
		};
	});
</script>

<div class="space-y-3" data-testid={testId}>
	<div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.16)] p-4">
		<div class="flex items-start justify-between gap-3">
			<div class="min-w-0">
				<h3 class="text-sm font-semibold text-[hsl(var(--foreground))]">Producto</h3>
				<p class="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
					Busca por nombre o descripción contra backend sin cargar todo el catálogo.
				</p>
			</div>
			{#if selectedProduct}
				<span class="shrink-0 rounded-md bg-[hsl(var(--primary))] px-2 py-1 text-xs font-medium text-[hsl(var(--primary-foreground))]">
					Seleccionado
				</span>
			{/if}
		</div>

		{#if selectedProduct}
			<div class="mt-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3">
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0">
						<p class="truncate font-medium text-[hsl(var(--foreground))]">{selectedProduct.name}</p>
						<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Producto #{selectedProduct.id}</p>
					</div>
					<Button variant="ghost" size="sm" type="button" onclick={clearSelection}>
						<X class="size-4" aria-hidden="true" />
						Quitar
					</Button>
				</div>
				<p class="mt-2 line-clamp-2 text-sm text-[hsl(var(--muted-foreground))]">
					{selectedProduct.description || 'Sin descripcion'}
				</p>
			</div>
		{/if}

		<label class="mt-3 block">
			<span class="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">Buscar producto</span>
			<div class="relative">
				<Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
				<input
					class={inputClass}
					type="search"
					placeholder="Nombre o descripcion"
					autocomplete="off"
					spellcheck="false"
					bind:value={search}
					oninput={handleInput}
					data-testid="stock-product-search-input"
				/>
			</div>
		</label>

		{#if search.trim().length < MIN_QUERY_LENGTH}
			<p class="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
				Escribe al menos {MIN_QUERY_LENGTH} caracteres para buscar.
			</p>
		{:else if loading && !loaded}
			<p class="mt-2 text-xs text-[hsl(var(--muted-foreground))]">Buscando productos...</p>
		{:else if error}
			<p class="mt-2 text-xs text-[hsl(var(--destructive))]">{error}</p>
		{:else if results.length === 0}
			<p class="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
				No hay coincidencias en los primeros {PAGE_SIZE} resultados.
			</p>
		{:else}
			<div class="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
				{#each results as product (product.id)}
					<button
						type="button"
						class="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 text-left shadow-sm transition hover:border-[hsl(var(--primary)/0.35)] hover:bg-[hsl(var(--secondary)/0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
						onclick={() => selectProduct(product)}
						data-testid={`stock-product-search-option-${product.id}`}
					>
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0">
								<p class="truncate font-medium text-[hsl(var(--foreground))]">{product.name}</p>
								<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">#{product.id}</p>
							</div>
							<span class="shrink-0 rounded-md bg-[hsl(var(--secondary))] px-2 py-1 text-xs text-[hsl(var(--muted-foreground))]">
								{product.nutritionalValues.calories} kcal
							</span>
						</div>
						<p class="mt-2 line-clamp-2 text-sm text-[hsl(var(--muted-foreground))]">
							{product.description || 'Sin descripcion'}
						</p>
					</button>
				{/each}
			</div>
			<p class="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
				Mostrando {results.length} de {totalResults} resultados.
			</p>
		{/if}
	</div>
</div>
