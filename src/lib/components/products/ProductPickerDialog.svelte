<script lang="ts">
	import { onMount } from 'svelte';
	import { Search, X } from '@lucide/svelte';
	import { listProductsPage } from '$lib/api/products';
	import Button from '$lib/components/ui/Button.svelte';
	import ProductFiltersPanel from '$lib/components/products/ProductFilters.svelte';
	import { emptyProductFilters, type ProductFilters as ProductFiltersState } from '$lib/product-filters';
	import type { Product } from '$lib/products';

	const PAGE_SIZE = 24;

	let {
		title,
		description = '',
		authorization,
		products,
		selectedProductId = '',
		onSelect,
		onClose,
		testId = 'product-picker-modal'
	}: {
		title: string;
		description?: string;
		authorization: string;
		products: Product[];
		selectedProductId?: number | string | null;
		onSelect: (product: Product) => void;
		onClose: () => void;
		testId?: string;
	} = $props();

	let filters = $state<ProductFiltersState>(emptyProductFilters());
	let visibleProducts = $state<Product[]>([]);
	let visibleProductsLoaded = $state(false);
	let visibleProductsLoading = $state(false);
	let visibleProductsTotal = $state(0);
	let visibleProductsError = $state<string | null>(null);
	let visibleProductsRefreshTimer: ReturnType<typeof setTimeout> | null = null;
	let visibleProductsRequestToken = 0;

	function normalizedSelectedProductId() {
		const numeric = Number(selectedProductId);
		return Number.isNaN(numeric) || numeric <= 0 ? null : numeric;
	}

	function selectedProduct() {
		const id = normalizedSelectedProductId();
		if (id === null) return null;
		return products.find((product) => product.id === id) ?? null;
	}

	function displayedProducts() {
		const visible = visibleProducts;
		const currentSelected = selectedProduct();

		if (!currentSelected) return visible;
		if (visible.some((product) => product.id === currentSelected.id)) return visible;

		return [currentSelected, ...visible];
	}

	function displayedCount() {
		return visibleProductsTotal;
	}

	function selectProduct(product: Product) {
		onSelect(product);
	}

	function cancelVisibleProductsRefresh() {
		if (visibleProductsRefreshTimer !== null) {
			clearTimeout(visibleProductsRefreshTimer);
			visibleProductsRefreshTimer = null;
		}
		visibleProductsRequestToken += 1;
	}

	async function loadVisibleProducts() {
		const requestToken = ++visibleProductsRequestToken;
		visibleProductsLoading = true;
		visibleProductsError = null;

		try {
			const response = await listProductsPage(authorization, {
				page: 0,
				size: PAGE_SIZE,
				filters
			});

			if (requestToken !== visibleProductsRequestToken) return;
			visibleProducts = response.items;
			visibleProductsTotal = response.totalElements;
			visibleProductsLoaded = true;
		} catch (error) {
			if (requestToken !== visibleProductsRequestToken) return;
			visibleProductsError = error instanceof Error ? error.message : 'No se pudieron cargar los productos.';
		} finally {
			if (requestToken === visibleProductsRequestToken) {
				visibleProductsLoading = false;
			}
		}
	}

	function refreshVisibleProducts(immediate = false) {
		cancelVisibleProductsRefresh();

		if (immediate) {
			void loadVisibleProducts();
			return;
		}

		visibleProductsRefreshTimer = setTimeout(() => {
			visibleProductsRefreshTimer = null;
			void loadVisibleProducts();
		}, 180);
	}

	function updateFilters(next: ProductFiltersState) {
		filters = next;
		refreshVisibleProducts();
	}

	function clearFilters() {
		filters = emptyProductFilters();
		refreshVisibleProducts(true);
	}

	onMount(() => {
		refreshVisibleProducts(true);

		return () => {
			cancelVisibleProductsRefresh();
		};
	});
</script>

<div class="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/35 p-3 backdrop-blur-sm sm:p-4" role="presentation">
	<div
		class="max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl"
		role="dialog"
		aria-modal="true"
		aria-labelledby="product-picker-title"
		data-testid={testId}
	>
		<div class="flex items-start justify-between gap-4 border-b border-[hsl(var(--border))] p-5">
			<div class="min-w-0">
				<h2 id="product-picker-title" class="text-lg font-semibold text-[hsl(var(--foreground))]">{title}</h2>
				{#if description}
					<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{description}</p>
				{/if}
			</div>
			<Button variant="ghost" size="icon" type="button" onclick={onClose} aria-label="Cerrar selector">
				<X class="size-4" aria-hidden="true" />
			</Button>
		</div>

		<div class="max-h-[calc(100vh-8rem)] overflow-y-auto p-5">
			<ProductFiltersPanel
				filters={filters}
				onChange={updateFilters}
				onClear={clearFilters}
				testIdPrefix="product-picker-filter"
				focusOnMount={true}
			/>

			<div class="mt-4 flex items-center justify-between gap-3 text-sm">
				<p class="text-[hsl(var(--muted-foreground))]">
					{#if visibleProductsLoading && !visibleProductsLoaded}
						Buscando...
					{:else}
						{displayedCount()} productos
					{/if}
				</p>
				{#if selectedProduct()}
					<p class="text-xs text-[hsl(var(--muted-foreground))]">
						Seleccionado: <span class="font-medium text-[hsl(var(--foreground))]">{selectedProduct()?.name}</span>
					</p>
				{/if}
			</div>

			{#if visibleProductsError}
				<div class="mt-6 rounded-lg border border-[hsl(var(--destructive)/0.2)] bg-[hsl(var(--destructive)/0.06)] px-6 py-5 text-sm text-[hsl(var(--destructive))]">
					{visibleProductsError}
				</div>
			{:else if displayedProducts().length === 0}
				<div class="mt-6 grid place-items-center rounded-lg border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.2)] px-6 py-14 text-center">
					<div class="grid size-12 place-items-center rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]">
						<Search class="size-5" aria-hidden="true" />
					</div>
					<h3 class="mt-4 text-sm font-semibold text-[hsl(var(--foreground))]">No hay coincidencias</h3>
					<p class="mt-1 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">
						Prueba a quitar filtros o a buscar por otro nombre.
					</p>
				</div>
			{:else}
				<div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
					{#each displayedProducts() as product (product.id)}
						<button
							type="button"
							class={`rounded-lg border p-4 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] ${
								product.id === normalizedSelectedProductId()
									? 'border-[hsl(var(--primary)/0.4)] bg-[hsl(var(--primary)/0.06)]'
									: 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--primary)/0.24)] hover:bg-[hsl(var(--secondary)/0.24)]'
							}`}
							onclick={() => selectProduct(product)}
							data-testid={`product-picker-option-${product.id}`}
						>
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<div class="flex items-center gap-2">
										<p class="truncate font-medium text-[hsl(var(--foreground))]">{product.name}</p>
										<span class="shrink-0 rounded-md bg-[hsl(var(--secondary))] px-1.5 py-0.5 text-xs text-[hsl(var(--muted-foreground))]">
											#{product.id}
										</span>
									</div>
									<p class="mt-1 line-clamp-2 text-sm text-[hsl(var(--muted-foreground))]">{product.description}</p>
								</div>
								{#if product.id === normalizedSelectedProductId()}
									<span class="rounded-md bg-[hsl(var(--primary))] px-2 py-1 text-xs font-medium text-[hsl(var(--primary-foreground))]">
										Actual
									</span>
								{/if}
							</div>

							<dl class="mt-4 grid grid-cols-2 gap-2 text-sm">
								<div class="rounded-md border border-[hsl(var(--border))] p-2">
									<dt class="text-xs text-[hsl(var(--muted-foreground))]">Kcal</dt>
									<dd class="mt-1 font-medium tabular-nums text-[hsl(var(--foreground))]">
										{product.nutritionalValues.calories}
									</dd>
								</div>
								<div class="rounded-md border border-[hsl(var(--border))] p-2">
									<dt class="text-xs text-[hsl(var(--muted-foreground))]">Carbos</dt>
									<dd class="mt-1 font-medium tabular-nums text-[hsl(var(--foreground))]">
										{product.nutritionalValues.carbohydrates}g
									</dd>
								</div>
								<div class="rounded-md border border-[hsl(var(--border))] p-2">
									<dt class="text-xs text-[hsl(var(--muted-foreground))]">Proteínas</dt>
									<dd class="mt-1 font-medium tabular-nums text-[hsl(var(--foreground))]">
										{product.nutritionalValues.proteins}g
									</dd>
								</div>
								<div class="rounded-md border border-[hsl(var(--border))] p-2">
									<dt class="text-xs text-[hsl(var(--muted-foreground))]">Grasas</dt>
									<dd class="mt-1 font-medium tabular-nums text-[hsl(var(--foreground))]">
										{product.nutritionalValues.fats}g
									</dd>
								</div>
							</dl>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
