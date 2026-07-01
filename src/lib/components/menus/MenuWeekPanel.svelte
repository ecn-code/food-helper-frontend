<script lang="ts">
	import { onMount } from 'svelte';
	import { Package, Plus, RefreshCw, Trash2, Users } from '@lucide/svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { ApiError, isSessionExpiredError } from '$lib/api/backend';
	import { listSupermarkets, type Supermarket } from '$lib/api/supermarkets';
	import { toEstablishedWeekMenuModel, type EstablishedWeekMenu } from '$lib/established-week-menus';
	import {
		listMenuShoppingList,
		updateMenuWeekStock,
		type EstablishedWeekMenuShoppingListItemResponse,
		type EstablishedWeekMenuWeekStockItemResponse,
		type EstablishedWeekMenuUsedStockResponse
	} from '$lib/api/established-week-menus';

	let {
		menu,
		authorization,
		onUpdated
	}: {
		menu: EstablishedWeekMenu;
		authorization: string;
		onUpdated?: (menu: EstablishedWeekMenu) => void | Promise<void>;
	} = $props();

	let supermarkets = $state<Supermarket[]>([]);
	let supermarketId = $state('');
	let shoppingList = $state<EstablishedWeekMenuShoppingListItemResponse[]>([]);
	let weekStockDraft = $state<EstablishedWeekMenuWeekStockItemResponse[]>([]);
	let usedStock = $state<EstablishedWeekMenuUsedStockResponse[]>([]);
	let shoppingListLoading = $state(false);
	let shoppingListError = $state('');
	let weekStockError = $state('');
	let savingWeekStock = $state(false);
	let newWeekStockProductId = $state('');
	let newWeekStockQuantity = $state('');

	onMount(() => void initialize());

	$effect(() => {
		weekStockDraft = menu.weekStock.map((item) => ({ ...item }));
		usedStock = menu.usedStock.map((item) => ({ ...item }));
		if (!supermarketId) {
			shoppingList = menu.shoppingList.map((item) => ({ ...item }));
		}
	});

	async function initialize() {
		try {
			supermarkets = await listSupermarkets(authorization);
		} catch {
			supermarkets = [];
		}
		weekStockDraft = menu.weekStock.map((item) => ({ ...item }));
		usedStock = menu.usedStock.map((item) => ({ ...item }));
		shoppingList = menu.shoppingList.map((item) => ({ ...item }));
	}

	function menuRequirements() {
		return menu.stockSummary.requirements;
	}

	function requirementName(productId: number) {
		return menuRequirements().find((item) => item.productId === productId)?.productName ?? `Producto ${productId}`;
	}

	function selectedSupermarketName() {
		return supermarkets.find((item) => String(item.id) === supermarketId)?.name ?? '';
	}

	async function refreshShoppingList() {
		shoppingListLoading = true;
		shoppingListError = '';
		try {
			if (!supermarketId) {
				shoppingList = menu.shoppingList.map((item) => ({ ...item }));
				return;
			}
			shoppingList = await listMenuShoppingList(menu.id, authorization, Number(supermarketId));
		} catch (cause) {
			if (isSessionExpiredError(cause)) return;
			shoppingListError = cause instanceof ApiError ? cause.message : 'No se pudo cargar la lista de compra.';
		} finally {
			shoppingListLoading = false;
		}
	}

	async function persistWeekStock(nextWeekStock: EstablishedWeekMenuWeekStockItemResponse[]) {
		savingWeekStock = true;
		weekStockError = '';
		try {
			const updatedMenu = toEstablishedWeekMenuModel(await updateMenuWeekStock(menu.id, nextWeekStock, authorization));
			await onUpdated?.(updatedMenu);
			weekStockDraft = updatedMenu.weekStock.map((item) => ({ ...item }));
			usedStock = updatedMenu.usedStock.map((item) => ({ ...item }));
			if (supermarketId) {
				await refreshShoppingList();
			} else {
				shoppingList = updatedMenu.shoppingList.map((item) => ({ ...item }));
			}
		} catch (cause) {
			if (isSessionExpiredError(cause)) return;
			weekStockError = cause instanceof ApiError ? cause.message : 'No se pudo actualizar el stock del menú.';
		} finally {
			savingWeekStock = false;
		}
	}

	async function addWeekStockItem() {
		const productId = Number(newWeekStockProductId);
		const quantity = Number(newWeekStockQuantity);
		if (!Number.isFinite(productId) || productId <= 0) {
			weekStockError = 'Selecciona un producto.';
			return;
		}
		if (!Number.isFinite(quantity) || quantity <= 0) {
			weekStockError = 'La cantidad debe ser mayor que 0.';
			return;
		}

		const nextWeekStock = weekStockDraft
			.filter((item) => item.productId !== productId)
			.concat({
				productId,
				productName: requirementName(productId),
				quantity
			})
			.sort((left, right) => left.productName.localeCompare(right.productName));

		await persistWeekStock(nextWeekStock);
		newWeekStockProductId = '';
		newWeekStockQuantity = '';
	}

	async function removeWeekStockItem(productId: number) {
		const nextWeekStock = weekStockDraft.filter((item) => item.productId !== productId);
		await persistWeekStock(nextWeekStock);
	}

	function formatNumber(value: number) {
		return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value);
	}
</script>

<section class="space-y-4 rounded-lg border bg-[hsl(var(--card))] p-4 shadow-sm" data-testid="menu-week-panel">
	<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
		<div class="min-w-0">
			<h3 class="text-base font-semibold">Menú en curso</h3>
			<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
				Añade lo que ya tienes para reducir la compra. Los productos sin supermercado se mostrarán en todos.
			</p>
		</div>
		<span class="inline-flex w-fit items-center gap-2 rounded-md bg-[hsl(var(--primary)/0.08)] px-2.5 py-1.5 text-sm font-medium text-[hsl(var(--primary))]">
			<Package class="size-4" />
			{shoppingList.length} productos pendientes
		</span>
	</div>

	<div class="grid gap-4 xl:grid-cols-3">
		<div class="space-y-4 xl:col-span-2">
			<div class="rounded-lg border border-[hsl(var(--border))] p-4">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h4 class="text-sm font-semibold">Lista de compra</h4>
						<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
							Filtra por supermercado si quieres ver solo lo que toca comprar en uno concreto.
						</p>
					</div>
					<div class="flex flex-col gap-2 sm:flex-row sm:items-end">
						<label class="block min-w-0">
							<span class="sr-only">Supermercado</span>
							<select class="h-10 w-full min-w-[14rem] rounded-md border bg-white px-3 text-sm" bind:value={supermarketId} data-testid="menu-shopping-list-supermarket">
								<option value="">Todos los supermercados</option>
								{#each supermarkets as supermarket}
									<option value={supermarket.id}>{supermarket.name}</option>
								{/each}
							</select>
						</label>
						<Button type="button" variant="secondary" onclick={refreshShoppingList} disabled={shoppingListLoading} data-testid="menu-shopping-list-filter">
							<RefreshCw class={`size-4 ${shoppingListLoading ? 'animate-spin' : ''}`} />
							{shoppingListLoading ? 'Filtrando…' : 'Filtrar'}
						</Button>
					</div>
				</div>

				{#if shoppingListError}
					<p class="mt-3 text-sm text-[hsl(var(--destructive))]" role="alert">{shoppingListError}</p>
				{/if}

				<div class="mt-4 space-y-2">
					{#if shoppingList.length === 0}
						<p class="text-sm text-[hsl(var(--muted-foreground))]">
							{supermarketId ? `No hay productos pendientes para ${selectedSupermarketName()}.` : 'No hay productos pendientes.'}
						</p>
					{:else}
						<div class="hidden overflow-x-auto md:block">
							<table class="w-full text-sm">
								<thead class="bg-[hsl(var(--secondary))] text-xs text-[hsl(var(--muted-foreground))]">
									<tr>
										<th class="px-3 py-2 text-left font-medium">Producto</th>
										<th class="px-3 py-2 text-right font-medium">Faltan</th>
									</tr>
								</thead>
								<tbody class="divide-y">
									{#each shoppingList as item}
										<tr>
											<td class="px-3 py-2">{item.productName}</td>
											<td class="px-3 py-2 text-right tabular-nums">{formatNumber(item.missingUnits)}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
						<div class="space-y-2 md:hidden">
							{#each shoppingList as item}
								<div class="rounded-md border p-3">
									<p class="text-sm font-medium">{item.productName}</p>
									<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{formatNumber(item.missingUnits)} uds</p>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<div class="rounded-lg border border-[hsl(var(--border))] p-4">
				<div class="flex items-start justify-between gap-4">
					<div>
						<h4 class="text-sm font-semibold">Stock temporal del menú</h4>
						<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
							Marca aquí lo que ya tienes en casa y se descontará de la lista.
						</p>
					</div>
					<span class="inline-flex items-center gap-2 rounded-md bg-[hsl(var(--secondary))] px-2 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))]">
						<Users class="size-3.5" />
						{weekStockDraft.length} productos
					</span>
				</div>

				{#if weekStockError}
					<p class="mt-3 text-sm text-[hsl(var(--destructive))]" role="alert">{weekStockError}</p>
				{/if}

				<div class="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_8rem_auto] md:items-end">
					<label class="block min-w-0">
						<span class="text-sm font-medium">Producto</span>
						<select class="mt-2 h-10 w-full rounded-md border bg-white px-3 text-sm" bind:value={newWeekStockProductId} data-testid="menu-week-stock-product">
							<option value="">Selecciona un producto</option>
							{#each menuRequirements() as requirement}
								<option value={requirement.productId}>{requirement.productName}</option>
							{/each}
						</select>
					</label>
					<label class="block min-w-0">
						<span class="text-sm font-medium">Cantidad</span>
						<input class="mt-2 h-10 w-full rounded-md border bg-white px-3 text-sm" bind:value={newWeekStockQuantity} inputmode="decimal" placeholder="1" data-testid="menu-week-stock-quantity" />
					</label>
					<Button type="button" onclick={addWeekStockItem} disabled={savingWeekStock} data-testid="menu-week-stock-add">
						<Plus class="size-4" />
						{savingWeekStock ? 'Guardando…' : 'Añadir'}
					</Button>
				</div>

				{#if weekStockDraft.length === 0}
					<p class="mt-4 text-sm text-[hsl(var(--muted-foreground))]">Aún no has marcado ningún producto como disponible.</p>
				{:else}
					<div class="mt-4 space-y-2">
						{#each weekStockDraft as item}
							<div class="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
								<div class="min-w-0">
									<p class="truncate text-sm font-medium">{item.productName}</p>
									<p class="text-xs text-[hsl(var(--muted-foreground))]">{formatNumber(item.quantity)} uds</p>
								</div>
								<Button type="button" variant="ghost" size="sm" onclick={() => removeWeekStockItem(item.productId)} disabled={savingWeekStock} data-testid={`menu-week-stock-remove-${item.productId}`}>
									<Trash2 class="size-4" />
									Quitar
								</Button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<div class="space-y-4">
			<div class="rounded-lg border border-[hsl(var(--border))] p-4">
				<div class="flex items-center justify-between gap-3">
					<div>
						<h4 class="text-sm font-semibold">Stock consumido</h4>
						<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Lo que ya ha salido del stock global al crear el menú.</p>
					</div>
					<span class="inline-flex items-center gap-2 rounded-md bg-[hsl(var(--secondary))] px-2 py-1 text-xs text-[hsl(var(--muted-foreground))]">
						<Users class="size-3.5" />
						{usedStock.length}
					</span>
				</div>

				<div class="mt-4 space-y-2">
					{#if usedStock.length === 0}
						<p class="text-sm text-[hsl(var(--muted-foreground))]">Todavía no se ha consumido stock para este menú.</p>
					{:else}
						{#each usedStock as stock}
							<div class="rounded-md border px-3 py-2">
								<p class="text-sm font-medium">{stock.productName}</p>
								<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
									{formatNumber(stock.usedUnits)} uds · {formatNumber(stock.totalCost)} €
								</p>
							</div>
						{/each}
					{/if}
				</div>
			</div>
		</div>
	</div>
</section>
