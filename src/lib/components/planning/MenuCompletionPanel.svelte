<script lang="ts">
	import { onMount } from 'svelte';
	import { CircleCheck, RefreshCw } from '@lucide/svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { ApiError } from '$lib/api/backend';
	import { closeMenu, getMenuStats, listMenuShoppingList, type MenuStatsResponse, type EstablishedWeekMenuShoppingListItemResponse } from '$lib/api/established-week-menus';
	import { listSupermarkets, type Supermarket } from '$lib/api/supermarkets';

	let { menuId, payerUsername, authorization, initialShoppingList }: { menuId: number; payerUsername: string; authorization: string; initialShoppingList: EstablishedWeekMenuShoppingListItemResponse[] } = $props();
	let stats = $state<MenuStatsResponse | null>(null);
	let supermarkets = $state<Supermarket[]>([]);
	let shoppingList = $state<EstablishedWeekMenuShoppingListItemResponse[]>([]);
	let supermarketId = $state('');
	let loading = $state(false);
	let error = $state('');

	onMount(() => void (async () => {
		shoppingList = initialShoppingList;
		try { supermarkets = await listSupermarkets(authorization); } catch { supermarkets = []; }
		try { stats = await getMenuStats(menuId, authorization); } catch (cause) { if (!(cause instanceof ApiError && cause.status === 404)) error = cause instanceof ApiError ? cause.message : 'No se pudieron cargar las estadísticas.'; }
	})());

	async function filterShoppingList() {
		loading = true; error = '';
		try { shoppingList = await listMenuShoppingList(menuId, authorization, supermarketId ? Number(supermarketId) : undefined); }
		catch (cause) { error = cause instanceof ApiError ? cause.message : 'No se pudo filtrar la lista de compra.'; }
		finally { loading = false; }
	}

	async function finish() {
		if (!window.confirm('¿Cerrar este menú y guardar sus estadísticas?')) return;
		loading = true; error = '';
		try { stats = await closeMenu(menuId, authorization); }
		catch (cause) { error = cause instanceof ApiError ? cause.message : 'No se pudo cerrar el menú.'; }
		finally { loading = false; }
	}
	function money(value: number) { return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value); }
	function number(value: number) { return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value); }
</script>

<section class="space-y-4 rounded-lg border bg-[hsl(var(--card))] p-4" data-testid="menu-completion-panel">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 class="text-base font-semibold">Menú establecido</h3><p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Coste asignado a {payerUsername}.</p></div>{#if !stats}<Button type="button" variant="secondary" onclick={finish} disabled={loading}><CircleCheck class="size-4" /> Cerrar menú</Button>{:else}<span class="inline-flex items-center gap-2 rounded-md bg-[hsl(var(--primary)/0.08)] px-2.5 py-1.5 text-sm font-medium text-[hsl(var(--primary))]"><CircleCheck class="size-4" /> Cerrado</span>{/if}</div>
	{#if error}<p class="text-sm text-[hsl(var(--destructive))]" role="alert">{error}</p>{/if}
	<div class="grid gap-3 lg:grid-cols-[14rem_1fr_auto] lg:items-end"><label class="space-y-2"><span class="text-sm font-medium">Filtrar lista de compra</span><select class="h-10 w-full rounded-md border bg-white px-3 text-sm" bind:value={supermarketId}><option value="">Todos los supermercados</option>{#each supermarkets as supermarket}<option value={supermarket.id}>{supermarket.name}</option>{/each}</select></label><div class="min-w-0"><p class="text-sm font-medium">{shoppingList.length} productos pendientes</p><p class="truncate text-xs text-[hsl(var(--muted-foreground))]">{shoppingList.map((item) => `${item.productName} (${number(item.missingUnits)})`).join(' · ') || 'No falta ningún producto'}</p></div><Button type="button" variant="secondary" onclick={filterShoppingList} disabled={loading}><RefreshCw class="size-4" /> Aplicar</Button></div>
	{#if stats}<div class="grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4"><div><p class="text-xs text-[hsl(var(--muted-foreground))]">Media calorías</p><p class="mt-1 text-lg font-semibold tabular-nums">{number(stats.period.averageCalories)}</p></div><div><p class="text-xs text-[hsl(var(--muted-foreground))]">Media proteínas</p><p class="mt-1 text-lg font-semibold tabular-nums">{number(stats.period.averageProteins)} g</p></div><div><p class="text-xs text-[hsl(var(--muted-foreground))]">Gasto del periodo</p><p class="mt-1 text-lg font-semibold tabular-nums">{money(stats.period.moneySpent)}</p></div><div><p class="text-xs text-[hsl(var(--muted-foreground))]">Gasto del mes</p><p class="mt-1 text-lg font-semibold tabular-nums">{money(stats.month.moneySpent)}</p></div></div>{/if}
</section>
