<script lang="ts">
	import { untrack } from 'svelte';
	import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, History, Search } from '@lucide/svelte';
	import { listStockMovements, type StockMovementPagePayload } from '$lib/api/stock';
	import Button from '$lib/components/ui/Button.svelte';

	let { authorization }: { authorization: string } = $props();
	const inputClass =
		'h-10 w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm focus:border-[hsl(var(--ring))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.14)]';
	const pageSize = 20;
	let result = $state<StockMovementPagePayload | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let fromDate = $state('');
	let toDate = $state('');
	let productId = $state('');

	function formatNumber(value: number) {
		return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value);
	}

	function formatCurrency(value: number | null) {
		return value == null ? '—' : new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
	}

	function formatDate(value: string | null) {
		if (!value) return '—';
		return new Intl.DateTimeFormat('es-ES').format(new Date(`${value}T00:00:00`));
	}

	function movementLabel(type: string) {
		const labels: Record<string, string> = {
			ENTRY: 'Entrada',
			CREATION: 'Alta',
			ADDITION: 'Entrada',
			REMOVAL: 'Salida',
			ADJUSTMENT: 'Ajuste',
			DELETION: 'Eliminación',
			MENU_CONSUMPTION: 'Consumo de menú',
			MENU_RESTORATION: 'Devolución de menú',
			RECIPE_PRODUCTION: 'Producción'
		};
		return labels[type] ?? type.replaceAll('_', ' ').toLocaleLowerCase('es-ES');
	}

	async function load(page = 0) {
		loading = true;
		error = null;
		try {
			result = await listStockMovements(authorization, {
				fromDate: fromDate || undefined,
				toDate: toDate || undefined,
				productIds: productId ? [Number(productId)] : undefined,
				page,
				size: pageSize
			});
		} catch (reason) {
			error = reason instanceof Error ? reason.message : 'No se pudo cargar el historial de stock.';
		} finally {
			loading = false;
		}
	}

	function submitFilters(event: SubmitEvent) {
		event.preventDefault();
		void load(0);
	}

	function changePage(offset: number) {
		if (result) void load(result.page + offset);
	}

	$effect(() => {
		authorization;
		untrack(() => void load(0));
	});
</script>

<section class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm" data-testid="stock-history">
	<div class="border-b border-[hsl(var(--border))] p-4">
		<h3 class="text-base font-semibold">Historial de movimientos</h3>
		<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Entradas, salidas y ajustes ordenados desde el movimiento más reciente.</p>
	</div>

	<form class="grid gap-3 border-b border-[hsl(var(--border))] p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end" onsubmit={submitFilters}>
		<label class="space-y-2"><span class="text-sm font-medium">Desde</span><input class={inputClass} type="date" bind:value={fromDate} /></label>
		<label class="space-y-2"><span class="text-sm font-medium">Hasta</span><input class={inputClass} type="date" bind:value={toDate} /></label>
		<label class="space-y-2"><span class="text-sm font-medium">ID de producto</span><input class={inputClass} type="number" min="1" placeholder="Todos" bind:value={productId} /></label>
		<Button type="submit" variant="secondary" disabled={loading}><Search class="size-4" aria-hidden="true" />Aplicar</Button>
	</form>

	{#if loading}
		<div class="grid place-items-center px-8 py-16 text-center"><div class="size-5 animate-spin rounded-full border-2 border-[hsl(var(--muted-foreground))] border-t-transparent"></div><p class="mt-3 text-sm text-[hsl(var(--muted-foreground))]">Cargando historial</p></div>
	{:else if error}
		<div class="p-8 text-center"><p class="text-sm text-[hsl(var(--destructive))]">{error}</p><Button class="mt-3" variant="secondary" size="sm" onclick={() => load(result?.page ?? 0)}>Reintentar</Button></div>
	{:else if !result?.items.length}
		<div class="p-8 text-center"><History class="mx-auto size-8 text-[hsl(var(--muted-foreground))]" /><h4 class="mt-3 text-sm font-semibold">No hay movimientos</h4><p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">No se encontraron movimientos con estos filtros.</p></div>
	{:else}
		<div class="hidden overflow-x-auto md:block">
			<table class="w-full text-sm">
				<thead class="bg-[hsl(var(--secondary))] text-xs text-[hsl(var(--muted-foreground))]"><tr><th class="px-4 py-2.5 text-left font-medium">Fecha</th><th class="px-3 py-2.5 text-left font-medium">Producto</th><th class="px-3 py-2.5 text-left font-medium">Movimiento</th><th class="px-3 py-2.5 text-right font-medium">Cantidad</th><th class="px-3 py-2.5 text-right font-medium">Precio</th><th class="px-4 py-2.5 text-right font-medium">Caducidad</th></tr></thead>
				<tbody class="divide-y divide-[hsl(var(--border))]">{#each result.items as movement (movement.id)}<tr class="hover:bg-[hsl(var(--secondary)/0.55)]"><td class="px-4 py-3 tabular-nums">{formatDate(movement.effectiveDate)}</td><td class="px-3 py-3"><p class="font-medium">{movement.productName}</p><p class="text-xs text-[hsl(var(--muted-foreground))]">Producto #{movement.productId}</p></td><td class="px-3 py-3">{movementLabel(movement.movementType)}</td><td class={`px-3 py-3 text-right font-semibold tabular-nums ${movement.signedQuantity >= 0 ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--destructive))]'}`}><span class="inline-flex items-center gap-1">{#if movement.signedQuantity >= 0}<ArrowUp class="size-3.5" />{:else}<ArrowDown class="size-3.5" />{/if}{formatNumber(Math.abs(movement.signedQuantity))}</span></td><td class="px-3 py-3 text-right tabular-nums">{formatCurrency(movement.price)}</td><td class="px-4 py-3 text-right tabular-nums">{formatDate(movement.expirationDate)}</td></tr>{/each}</tbody>
			</table>
		</div>
		<div class="divide-y divide-[hsl(var(--border))] md:hidden">{#each result.items as movement (movement.id)}<article class="space-y-3 p-4"><div class="flex justify-between gap-3"><div class="min-w-0"><h4 class="truncate text-sm font-semibold">{movement.productName}</h4><p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{movementLabel(movement.movementType)} · {formatDate(movement.effectiveDate)}</p></div><p class={`shrink-0 font-semibold tabular-nums ${movement.signedQuantity >= 0 ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--destructive))]'}`}>{movement.signedQuantity > 0 ? '+' : ''}{formatNumber(movement.signedQuantity)}</p></div><div class="flex gap-3 text-xs text-[hsl(var(--muted-foreground))]"><span>Precio {formatCurrency(movement.price)}</span><span>Caduca {formatDate(movement.expirationDate)}</span></div></article>{/each}</div>
	{/if}

	{#if result && result.totalPages > 1}
		<div class="flex items-center justify-between border-t border-[hsl(var(--border))] p-4"><p class="text-xs text-[hsl(var(--muted-foreground))]">{result.totalElements} movimientos · Página {result.page + 1} de {result.totalPages}</p><div class="flex gap-2"><Button variant="secondary" size="icon" aria-label="Página anterior" disabled={loading || result.page === 0} onclick={() => changePage(-1)}><ChevronLeft class="size-4" /></Button><Button variant="secondary" size="icon" aria-label="Página siguiente" disabled={loading || result.page + 1 >= result.totalPages} onclick={() => changePage(1)}><ChevronRight class="size-4" /></Button></div></div>
	{/if}
</section>
