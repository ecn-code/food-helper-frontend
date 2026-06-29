<script lang="ts">
	import { onMount } from 'svelte';
	import { CircleCheck, RefreshCw, Users } from '@lucide/svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { ApiError } from '$lib/api/backend';
	import {
		closeMenu,
		getMenuStats,
		listMenuShoppingList,
		type EstablishedWeekMenuShoppingListItemResponse,
		type EstablishedWeekMenuUsedStockResponse,
		type MenuStatsResponse
	} from '$lib/api/established-week-menus';
	import { listSupermarkets, type Supermarket } from '$lib/api/supermarkets';
	import { listUsers, type UserResponse } from '$lib/api/users';

	let {
		menuId,
		payerUsername,
		currentUserId,
		authorization,
		initialShoppingList,
		initialUsedStock,
		onClosed
	}: {
		menuId: number;
		payerUsername: string;
		currentUserId: number;
		authorization: string;
		initialShoppingList: EstablishedWeekMenuShoppingListItemResponse[];
		initialUsedStock: EstablishedWeekMenuUsedStockResponse[];
		onClosed?: () => void | Promise<void>;
	} = $props();

	let stats = $state<MenuStatsResponse | null>(null);
	let supermarkets = $state<Supermarket[]>([]);
	let users = $state<UserResponse[]>([]);
	let shoppingList = $state<EstablishedWeekMenuShoppingListItemResponse[]>([]);
	let usedStock = $state<EstablishedWeekMenuUsedStockResponse[]>([]);
	let supermarketId = $state('');
	let loading = $state(false);
	let error = $state('');
	let closeDialogOpen = $state(false);
	let selectedPersonIds = $state<string[]>([]);
	let closing = $state(false);

	onMount(() => void (async () => {
		if (selectedPersonIds.length === 0) {
			selectedPersonIds = [String(currentUserId)];
		}
		shoppingList = initialShoppingList;
		usedStock = initialUsedStock;
		try {
			supermarkets = await listSupermarkets(authorization);
		} catch {
			supermarkets = [];
		}
		try {
			users = await listUsers(authorization);
			if (!selectedPersonIds.includes(String(currentUserId))) {
				selectedPersonIds = [String(currentUserId)];
			}
		} catch {
			users = [];
		}
		try {
			stats = await getMenuStats(menuId, authorization);
		} catch (cause) {
			if (!(cause instanceof ApiError && cause.status === 404)) {
				error = cause instanceof ApiError ? cause.message : 'No se pudieron cargar las estadísticas.';
			}
		}
	})());

	async function filterShoppingList() {
		loading = true;
		error = '';
		try {
			shoppingList = await listMenuShoppingList(menuId, authorization, supermarketId ? Number(supermarketId) : undefined);
		} catch (cause) {
			error = cause instanceof ApiError ? cause.message : 'No se pudo filtrar la lista de compra.';
		} finally {
			loading = false;
		}
	}

	function openCloseDialog() {
		closeDialogOpen = true;
		selectedPersonIds = selectedPersonIds.length > 0 ? selectedPersonIds : [String(currentUserId)];
	}

	function togglePerson(personId: number) {
		const value = String(personId);
		if (selectedPersonIds.includes(value)) {
			selectedPersonIds = selectedPersonIds.filter((item) => item !== value);
		} else {
			selectedPersonIds = [...selectedPersonIds, value];
		}
	}

	async function finish() {
		if (closing) return;
		const numericPersonIds = selectedPersonIds.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0);
		if (numericPersonIds.length === 0) {
			error = 'Selecciona al menos una persona.';
			return;
		}
		closing = true;
		error = '';
		try {
			stats = await closeMenu(menuId, numericPersonIds, authorization);
			closeDialogOpen = false;
			usedStock = initialUsedStock;
			await onClosed?.();
		} catch (cause) {
			error = cause instanceof ApiError ? cause.message : 'No se pudo cerrar el menú.';
		} finally {
			closing = false;
		}
	}

	function money(value: number) {
		return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
	}

	function number(value: number) {
		return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value);
	}
</script>

<section class="space-y-4 rounded-lg border bg-[hsl(var(--card))] p-4" data-testid="menu-completion-panel">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<div>
			<h3 class="text-base font-semibold">Menú establecido</h3>
			<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Coste asignado a {payerUsername}.</p>
		</div>
		{#if !stats}
			<Button type="button" variant="secondary" onclick={openCloseDialog} disabled={closing}>
				<CircleCheck class="size-4" /> Cerrar menú
			</Button>
		{:else}
			<span class="inline-flex items-center gap-2 rounded-md bg-[hsl(var(--primary)/0.08)] px-2.5 py-1.5 text-sm font-medium text-[hsl(var(--primary))]">
				<CircleCheck class="size-4" /> Cerrado
			</span>
		{/if}
	</div>

	{#if error}
		<p class="text-sm text-[hsl(var(--destructive))]" role="alert">{error}</p>
	{/if}

	<div class="grid gap-3 lg:grid-cols-[14rem_1fr_auto] lg:items-end">
		<label class="space-y-2">
			<span class="text-sm font-medium">Filtrar lista de compra</span>
			<select class="h-10 w-full rounded-md border bg-white px-3 text-sm" bind:value={supermarketId}>
				<option value="">Todos los supermercados</option>
				{#each supermarkets as supermarket}
					<option value={supermarket.id}>{supermarket.name}</option>
				{/each}
			</select>
		</label>
		<div class="min-w-0">
			<p class="text-sm font-medium">{shoppingList.length} productos pendientes</p>
			<p class="truncate text-xs text-[hsl(var(--muted-foreground))]">
				{shoppingList.map((item) => `${item.productName} (${number(item.missingUnits)})`).join(' · ') || 'No falta ningún producto'}
			</p>
		</div>
		<Button type="button" variant="secondary" onclick={filterShoppingList} disabled={loading}>
			<RefreshCw class="size-4" /> Aplicar
		</Button>
	</div>

	{#if usedStock.length > 0}
		<div class="space-y-2 rounded-lg border p-3">
			<div class="flex items-center gap-2">
				<Users class="size-4 text-[hsl(var(--muted-foreground))]" />
				<h4 class="text-sm font-semibold">Stock consumido</h4>
			</div>
			<div class="hidden overflow-x-auto md:block">
				<table class="w-full text-sm">
					<thead class="bg-[hsl(var(--secondary))] text-xs text-[hsl(var(--muted-foreground))]">
						<tr>
							<th class="px-3 py-2 text-left font-medium">Producto</th>
							<th class="px-3 py-2 text-right font-medium">Usado</th>
							<th class="px-3 py-2 text-right font-medium">Coste</th>
							<th class="px-3 py-2 text-right font-medium">Caducidad</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#each usedStock as stock}
							<tr>
								<td class="px-3 py-2">{stock.productName}</td>
								<td class="px-3 py-2 text-right tabular-nums">{number(stock.usedUnits)}</td>
								<td class="px-3 py-2 text-right tabular-nums">{money(stock.totalCost)}</td>
								<td class="px-3 py-2 text-right tabular-nums">{stock.expirationDate ?? 'Sin caducidad'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<div class="space-y-2 md:hidden">
				{#each usedStock as stock}
					<div class="rounded-md border p-3">
						<p class="text-sm font-medium">{stock.productName}</p>
						<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
							{number(stock.usedUnits)} uds · {money(stock.totalCost)} · {stock.expirationDate ?? 'Sin caducidad'}
						</p>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if stats}
		<div class="grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
			<div><p class="text-xs text-[hsl(var(--muted-foreground))]">Media calorías</p><p class="mt-1 text-lg font-semibold tabular-nums">{number(stats.period.averageCalories)}</p></div>
			<div><p class="text-xs text-[hsl(var(--muted-foreground))]">Media proteínas</p><p class="mt-1 text-lg font-semibold tabular-nums">{number(stats.period.averageProteins)} g</p></div>
			<div><p class="text-xs text-[hsl(var(--muted-foreground))]">Gasto del periodo</p><p class="mt-1 text-lg font-semibold tabular-nums">{money(stats.period.moneySpent)}</p></div>
			<div><p class="text-xs text-[hsl(var(--muted-foreground))]">Gasto del mes</p><p class="mt-1 text-lg font-semibold tabular-nums">{money(stats.month.moneySpent)}</p></div>
		</div>
	{/if}
</section>

{#if closeDialogOpen}
	<div class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" role="presentation">
		<div class="w-full max-w-xl rounded-lg border bg-[hsl(var(--card))] shadow-xl" role="dialog" aria-modal="true" aria-labelledby="close-menu-title" data-testid="close-menu-dialog">
			<div class="flex items-start justify-between gap-4 border-b p-5">
				<div>
					<h2 id="close-menu-title" class="text-lg font-semibold">Cerrar menú</h2>
					<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Selecciona al menos una persona. El usuario actual aparece marcado por defecto.</p>
				</div>
				<Button variant="ghost" size="icon" type="button" onclick={() => (closeDialogOpen = false)} aria-label="Cerrar">
					<CircleCheck class="size-4 rotate-45" />
				</Button>
			</div>
			<div class="space-y-4 p-5">
				<div class="grid gap-2 sm:grid-cols-2">
					{#each users as user}
						<label class="flex items-center gap-2 rounded-md border p-3 text-sm">
							<input type="checkbox" checked={selectedPersonIds.includes(String(user.id))} onchange={() => togglePerson(user.id)} />
							<span class="min-w-0 truncate">{user.username}</span>
						</label>
					{/each}
				</div>
				<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<Button type="button" variant="secondary" onclick={() => (closeDialogOpen = false)}>Cancelar</Button>
					<Button type="button" onclick={finish} disabled={closing}>
						<CircleCheck class="size-4" />
						{closing ? 'Cerrando…' : 'Cerrar menú'}
					</Button>
				</div>
			</div>
		</div>
	</div>
{/if}
