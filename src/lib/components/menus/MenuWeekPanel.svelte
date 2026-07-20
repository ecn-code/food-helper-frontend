<script lang="ts">
	import { onMount } from 'svelte';
	import { ChevronDown, ChevronUp, CircleCheck, FileJson2, Package, Plus, Search, Share2, Trash2, Users, X } from '@lucide/svelte';
	import MenuItemImportDialog from '$lib/components/menus/MenuItemImportDialog.svelte';
	import StockProductSearch from '$lib/components/stock/StockProductSearch.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { ApiError, isSessionExpiredError } from '$lib/api/backend';
	import { listMenuShoppingList, transferStockToWeekStock, updateMenuWeekStock, type EstablishedWeekMenuShoppingListItemResponse, type EstablishedWeekMenuWeekStockItemResponse, type EstablishedWeekMenuUsedStockResponse } from '$lib/api/established-week-menus';
	import { listStockEntries, type StockEntryPayload } from '$lib/api/stock';
	import { listSupermarkets, type Supermarket } from '$lib/api/supermarkets';
	import { toEstablishedWeekMenuModel, type EstablishedWeekMenu } from '$lib/established-week-menus';
	import { shareShoppingList as shareShoppingListToTarget, shoppingListPrimaryActionLabel } from '$lib/shopping-list-share';
	import type { Product } from '$lib/products';

	let {
		menu,
		authorization,
		onUpdated,
		onCloseMenu
	}: {
		menu: EstablishedWeekMenu;
		authorization: string;
		onUpdated?: (menu: EstablishedWeekMenu) => void | Promise<void>;
		onCloseMenu?: () => void | Promise<void>;
	} = $props();

	let supermarkets = $state<Supermarket[]>([]);
	let supermarketId = $state('');
	let shoppingList = $state<EstablishedWeekMenuShoppingListItemResponse[]>([]);
	let weekStockDraft = $state<EstablishedWeekMenuWeekStockItemResponse[]>([]);
	let usedStock = $state<EstablishedWeekMenuUsedStockResponse[]>([]);
	let shoppingListLoading = $state(false);
	let sharingShoppingList = $state(false);
	let shoppingListError = $state('');
	let shoppingListShareMessage = $state('');
	let weekStockError = $state('');
	let stockMovementError = $state('');
	let savingWeekStock = $state(false);
	let savingStockMovement = $state(false);
	let importDialogOpen = $state(false);
	let stockDialogMode = $state<'shopping-list' | 'catalog' | 'global-stock' | null>(null);
	let shoppingListProductId = $state('');
	let shoppingListQuantity = $state('');
	let shoppingListPrice = $state('');
	let catalogProduct = $state<Product | null>(null);
	let catalogQuantity = $state('');
	let catalogPrice = $state('');
	let globalStockEntries = $state<StockEntryPayload[]>([]);
	let globalStockEntryId = $state('');
	let globalStockEntryQuantity = $state('');
	let globalStockEntrySearch = $state('');
	let globalStockEntriesLoading = $state(false);
	let globalStockEntriesError = $state('');
	let stockTransferError = $state('');
	let stockEntriesRequestToken = 0;
	let isExpanded = $state(false);
	const panelStorageKey = 'foodhelper_menu_week_panel_open';

	onMount(() => {
		const storedValue = window.localStorage.getItem(panelStorageKey);
		isExpanded = storedValue === '1';
		void initialize();
	});

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

	function selectedSupermarketName() {
		return supermarkets.find((item) => String(item.id) === supermarketId)?.name ?? '';
	}

	function shoppingListItems() {
		return shoppingList.filter((item) => Number(item.missingUnits) > 0);
	}

	function formatNumber(value: number) {
		return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value);
	}

	function formatCurrency(value: number | null | undefined) {
		if (typeof value !== 'number' || !Number.isFinite(value)) {
			return '—';
		}
		return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 4 }).format(value);
	}

	function openStockDialog(mode: NonNullable<typeof stockDialogMode>) {
		stockDialogMode = mode;
		weekStockError = '';
		stockTransferError = '';
		if (mode === 'shopping-list') {
			resetShoppingListForm();
			return;
		}
		if (mode === 'catalog') {
			resetCatalogForm();
			return;
		}
		resetGlobalStockForm();
	}

	function closeStockDialog() {
		stockDialogMode = null;
		weekStockError = '';
		stockTransferError = '';
	}

	function appendWeekStockItem(
		currentWeekStock: EstablishedWeekMenuWeekStockItemResponse[],
		item: EstablishedWeekMenuWeekStockItemResponse
	) {
		return [...currentWeekStock.map((entry) => ({ ...entry })), { ...item }];
	}

	function resetShoppingListForm(productId = '') {
		shoppingListProductId = productId;
		const shoppingListItem = productId
			? shoppingListItems().find((item) => String(item.productId) === productId)
			: null;
		shoppingListQuantity = shoppingListItem ? String(shoppingListItem.missingUnits) : '';
		shoppingListPrice = shoppingListItem?.price === null || shoppingListItem?.price === undefined
			? ''
			: String(shoppingListItem.price);
	}

	function resetCatalogForm() {
		catalogProduct = null;
		catalogQuantity = '';
		catalogPrice = '';
	}

	function resetGlobalStockForm() {
		globalStockEntries = [];
		globalStockEntryId = '';
		globalStockEntryQuantity = '';
		globalStockEntrySearch = '';
		globalStockEntriesError = '';
		stockTransferError = '';
	}

	$effect(() => {
		if (stockDialogMode !== 'global-stock') {
			stockEntriesRequestToken += 1;
			globalStockEntries = [];
			globalStockEntryId = '';
			globalStockEntryQuantity = '';
			globalStockEntrySearch = '';
			globalStockEntriesError = '';
			stockTransferError = '';
			globalStockEntriesLoading = false;
			return;
		}

		void loadGlobalStockEntries();
	});

	async function loadGlobalStockEntries() {
		const requestToken = ++stockEntriesRequestToken;
		globalStockEntriesLoading = true;
		globalStockEntriesError = '';
		try {
			const entries = await listStockEntries(authorization);
			if (requestToken !== stockEntriesRequestToken) return;
			globalStockEntries = entries
				.filter((entry) => Number(entry.quantity) > 0)
				.sort((left, right) => left.expirationDate?.localeCompare(right.expirationDate ?? '') || left.entryDate.localeCompare(right.entryDate) || left.id - right.id);
			globalStockEntrySearch = '';
			globalStockEntryId = globalStockEntries.length > 0 ? String(globalStockEntries[0].id) : '';
			globalStockEntryQuantity = globalStockEntries.length > 0 ? String(globalStockEntries[0].quantity) : '';
		} catch (cause) {
			if (requestToken !== stockEntriesRequestToken || isSessionExpiredError(cause)) return;
			globalStockEntries = [];
			globalStockEntryId = '';
			globalStockEntryQuantity = '';
			globalStockEntrySearch = '';
			globalStockEntriesError = cause instanceof ApiError ? cause.message : 'No se pudo cargar el stock global.';
		} finally {
			if (requestToken === stockEntriesRequestToken) {
				globalStockEntriesLoading = false;
			}
		}
	}

	async function refreshShoppingList() {
		shoppingListLoading = true;
		shoppingListError = '';
		shoppingListShareMessage = '';
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

	async function shareShoppingList() {
		if (shoppingList.length === 0) return;

		sharingShoppingList = true;
		shoppingListError = '';
		shoppingListShareMessage = '';
		try {
			if (supermarketId) {
				shoppingList = await listMenuShoppingList(menu.id, authorization, Number(supermarketId));
			} else {
				shoppingList = menu.shoppingList.map((item) => ({ ...item }));
			}

			const result = await shareShoppingListToTarget({
				title: 'Lista de compra',
				menuLabel: `Menú #${menu.id}`,
				supermarketName: selectedSupermarketName(),
				items: shoppingList
			});

			if (result.method === 'clipboard') {
				shoppingListShareMessage = 'Lista copiada al portapapeles.';
			}
		} catch (cause) {
			if (isSessionExpiredError(cause)) return;
			shoppingListError = cause instanceof ApiError ? cause.message : 'No se pudo compartir la lista de compra.';
		} finally {
			sharingShoppingList = false;
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

	async function addWeekStockFromShoppingList() {
		const productId = Number(shoppingListProductId);
		const quantity = Number(shoppingListQuantity);
		const price = Number(shoppingListPrice);
		const shoppingListItem = shoppingListItems().find((item) => item.productId === productId);
		if (!Number.isFinite(productId) || productId <= 0) {
			weekStockError = 'Selecciona un producto de la lista de compra.';
			return;
		}
		if (!Number.isFinite(quantity) || quantity <= 0) {
			weekStockError = 'La cantidad debe ser mayor que 0.';
			return;
		}
		if (shoppingListPrice.trim() === '') {
			weekStockError = 'Introduce un precio.';
			return;
		}
		if (!Number.isFinite(price) || price < 0) {
			weekStockError = 'Introduce un precio valido.';
			return;
		}
		if (!shoppingListItem) {
			weekStockError = 'Ese producto ya no está pendiente.';
			return;
		}
		if (quantity > Number(shoppingListItem.missingUnits)) {
			weekStockError = 'No puedes añadir más de lo que falta en la lista.';
			return;
		}

		const nextWeekStock = appendWeekStockItem(weekStockDraft, {
			productId,
			productName: shoppingListItem.productName,
			quantity,
			price
		});

		await persistWeekStock(nextWeekStock);
		closeStockDialog();
		resetShoppingListForm();
	}

	async function addWeekStockFromCatalog() {
		if (!catalogProduct) {
			weekStockError = 'Selecciona un producto del catálogo.';
			return;
		}
		const quantity = Number(catalogQuantity);
		const price = Number(catalogPrice);
		if (!Number.isFinite(quantity) || quantity <= 0) {
			weekStockError = 'La cantidad debe ser mayor que 0.';
			return;
		}
		if (catalogPrice.trim() === '') {
			weekStockError = 'Introduce un precio.';
			return;
		}
		if (!Number.isFinite(price) || price < 0) {
			weekStockError = 'Introduce un precio valido.';
			return;
		}

		const nextWeekStock = appendWeekStockItem(weekStockDraft, {
			productId: catalogProduct.id,
			productName: catalogProduct.name,
			quantity,
			price
		});

		await persistWeekStock(nextWeekStock);
		closeStockDialog();
		resetCatalogForm();
	}

	async function applyGlobalStockToMenu() {
		const selectedStockEntry = globalStockEntries.find((entry) => String(entry.id) === globalStockEntryId);
		if (!selectedStockEntry) {
			stockTransferError = 'Selecciona un lote de stock.';
			return;
		}
		const quantity = Number(globalStockEntryQuantity);
		if (!Number.isFinite(quantity) || quantity <= 0) {
			stockTransferError = 'La cantidad debe ser mayor que 0.';
			return;
		}
		if (quantity > Number(selectedStockEntry.quantity)) {
			stockTransferError = 'No puedes aplicar más cantidad de la disponible en ese lote.';
			return;
		}

		savingStockMovement = true;
		stockTransferError = '';
		try {
			const updatedMenu = toEstablishedWeekMenuModel(
				await transferStockToWeekStock(
					menu.id,
					{
						stockEntryId: selectedStockEntry.id,
						quantity
					},
					authorization
				)
			);
			await onUpdated?.(updatedMenu);
			closeStockDialog();
			weekStockDraft = updatedMenu.weekStock.map((item) => ({ ...item }));
			usedStock = updatedMenu.usedStock.map((item) => ({ ...item }));
			if (supermarketId) {
				await refreshShoppingList();
			} else {
				shoppingList = updatedMenu.shoppingList.map((item) => ({ ...item }));
			}
		} catch (cause) {
			if (isSessionExpiredError(cause)) return;
			stockTransferError = cause instanceof ApiError ? cause.message : 'No se pudo aplicar el stock al menú.';
		} finally {
			savingStockMovement = false;
		}
	}

	function selectedGlobalStockEntry() {
		return globalStockEntries.find((entry) => String(entry.id) === globalStockEntryId) ?? null;
	}

	function filteredGlobalStockEntries() {
		const query = globalStockEntrySearch.trim().toLowerCase();
		const entries = globalStockEntries;
		if (!query) return entries;

		return entries.filter((entry) => {
			return [
				entry.productName,
				String(entry.id),
				String(entry.quantity),
				String(entry.price),
				entry.expirationDate ?? '',
				entry.entryDate
			]
				.join(' ')
				.toLowerCase()
				.includes(query);
		});
	}

	function globalStockEntryMaxQuantity() {
		return selectedGlobalStockEntry()?.quantity ?? 0;
	}

	function clampGlobalStockEntryQuantity(value: string) {
		const selectedEntry = selectedGlobalStockEntry();
		if (!selectedEntry) return value;
		const numeric = Number(value);
		if (!Number.isFinite(numeric)) return value;
		if (numeric <= 0) return value;
		return String(Math.min(numeric, selectedEntry.quantity));
	}

	function selectGlobalStockEntry(globalStockEntryIdValue: string) {
		globalStockEntryId = globalStockEntryIdValue;
		const selectedEntry = globalStockEntries.find((entry) => String(entry.id) === globalStockEntryIdValue) ?? null;
		globalStockEntryQuantity = selectedEntry ? String(selectedEntry.quantity) : '';
	}

	$effect(() => {
		if (stockDialogMode !== 'global-stock') return;
		const selectedEntry = selectedGlobalStockEntry();
		if (!selectedEntry) return;
		const numericQuantity = Number(globalStockEntryQuantity);
		if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) return;
		if (numericQuantity > Number(selectedEntry.quantity)) {
			globalStockEntryQuantity = String(selectedEntry.quantity);
		}
	});

	$effect(() => {
		if (stockDialogMode !== 'global-stock') return;
		const visibleEntries = filteredGlobalStockEntries();
		if (visibleEntries.length === 0) return;
		const currentEntry = visibleEntries.find((entry) => String(entry.id) === globalStockEntryId) ?? null;
		if (currentEntry) {
			const nextQuantity = clampGlobalStockEntryQuantity(globalStockEntryQuantity);
			if (nextQuantity !== globalStockEntryQuantity) {
				globalStockEntryQuantity = nextQuantity;
			}
			return;
		}

		globalStockEntryId = String(visibleEntries[0].id);
		globalStockEntryQuantity = String(visibleEntries[0].quantity);
	});

	async function removeWeekStockItem(index: number) {
		const nextWeekStock = weekStockDraft.filter((_, currentIndex) => currentIndex !== index);
		await persistWeekStock(nextWeekStock);
	}

	function togglePanel() {
		isExpanded = !isExpanded;
		window.localStorage.setItem(panelStorageKey, isExpanded ? '1' : '0');
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
		<div class="flex flex-wrap items-center gap-2">
			<span class="inline-flex w-fit items-center gap-2 rounded-md bg-[hsl(var(--primary)/0.08)] px-2.5 py-1.5 text-sm font-medium text-[hsl(var(--primary))]">
				<Package class="size-4" />
				{shoppingList.length} productos pendientes
			</span>
			<Button
				type="button"
				variant="secondary"
				onclick={togglePanel}
				aria-expanded={isExpanded}
				aria-controls="menu-week-panel-content"
				data-testid="menu-week-panel-toggle"
			>
				{#if isExpanded}
					<ChevronUp class="size-4" />
					Ocultar
				{:else}
					<ChevronDown class="size-4" />
					Mostrar
				{/if}
			</Button>
			{#if onCloseMenu}
				<Button type="button" variant="secondary" onclick={onCloseMenu} data-testid="menu-week-close-menu">
					<CircleCheck class="size-4" />
					Cerrar menú
				</Button>
			{/if}
		</div>
	</div>

	<div id="menu-week-panel-content" class:hidden={!isExpanded}>
		<div class="grid gap-4 xl:grid-cols-3">
			<div class="space-y-4 xl:col-span-2">
				<div class="rounded-lg border border-[hsl(var(--border))] p-4">
					<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
						<div>
							<h4 class="text-sm font-semibold">Lista de compra</h4>
							<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
								Elige un supermercado para ver solo lo que toca comprar en uno concreto.
							</p>
						</div>
						<div class="flex flex-col gap-2 sm:flex-row sm:items-end">
							<label class="block min-w-0">
								<span class="sr-only">Supermercado</span>
								<select
									class="h-10 w-full min-w-[14rem] rounded-md border bg-white px-3 text-sm"
									bind:value={supermarketId}
									onchange={() => void refreshShoppingList()}
									data-testid="menu-shopping-list-supermarket"
								>
									<option value="">Todos los supermercados</option>
									{#each supermarkets as supermarket}
										<option value={supermarket.id}>{supermarket.name}</option>
									{/each}
								</select>
							</label>
							<Button type="button" variant="secondary" onclick={shareShoppingList} disabled={shoppingListLoading || sharingShoppingList || shoppingList.length === 0} data-testid="menu-shopping-list-share">
								<Share2 class="size-4" />
								{sharingShoppingList ? 'Compartiendo…' : shoppingListPrimaryActionLabel()}
							</Button>
						</div>
					</div>

					{#if shoppingListShareMessage}
						<p class="mt-3 text-sm text-[hsl(var(--muted-foreground))]" role="status">{shoppingListShareMessage}</p>
					{/if}
					{#if shoppingListError}
						<p class="mt-3 text-sm text-[hsl(var(--destructive))]" role="alert">{shoppingListError}</p>
					{/if}

					<div class="mt-4 space-y-2">
											{#if shoppingList.length === 0}
												<p class="text-sm text-[hsl(var(--muted-foreground))]">
													{supermarketId ? `No hay productos pendientes para ${selectedSupermarketName()}.` : 'No hay productos pendientes.'}
												</p>
											{:else}
												<div class="max-h-[17rem] overflow-y-auto pr-1">
													<div class="hidden overflow-x-auto md:block">
														<table class="w-full text-sm">
															<thead class="bg-[hsl(var(--secondary))] text-xs text-[hsl(var(--muted-foreground))]">
																<tr>
																	<th class="px-3 py-2 text-left font-medium">Producto</th>
																	<th class="px-3 py-2 text-right font-medium">Faltan</th>
																	<th class="px-3 py-2 text-right font-medium">Precio</th>
																</tr>
															</thead>
															<tbody class="divide-y">
																{#each shoppingList as item}
																	<tr>
																		<td class="px-3 py-2">{item.productName}</td>
																		<td class="px-3 py-2 text-right tabular-nums">{formatNumber(item.missingUnits)}</td>
																		<td class="px-3 py-2 text-right tabular-nums">{formatCurrency(item.price ?? 0)}</td>
																	</tr>
																{/each}
															</tbody>
														</table>
													</div>
													<div class="space-y-2 md:hidden">
														{#each shoppingList as item}
															<div class="rounded-md border p-3">
																<p class="text-sm font-medium">{item.productName}</p>
																<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
																	{formatNumber(item.missingUnits)} uds · {formatCurrency(item.price ?? 0)}
																</p>
															</div>
														{/each}
													</div>
												</div>
											{/if}
					</div>
				</div>

				<div class="rounded-lg border border-[hsl(var(--border))] p-4">
					<div class="flex items-start justify-between gap-4">
						<div>
							<h4 class="text-sm font-semibold">Stock temporal del menú</h4>
							<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
								Elige si quieres sumar lo pendiente, traer algo del catálogo o aplicar un lote del stock global.
							</p>
						</div>
						<span class="inline-flex items-center gap-2 rounded-md bg-[hsl(var(--secondary))] px-2 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))]">
							<Users class="size-3.5" />
							{weekStockDraft.length} productos
						</span>
					</div>

					<div class="mt-4 flex flex-wrap gap-2">
						<Button type="button" onclick={() => importDialogOpen = true} data-testid="menu-week-open-json-import">
							<FileJson2 class="size-4" />
							Importar JSON
						</Button>
						<Button type="button" variant="secondary" onclick={() => openStockDialog('shopping-list')} data-testid="menu-week-open-shopping-list-dialog">
							Desde lista
						</Button>
						<Button type="button" variant="secondary" onclick={() => openStockDialog('catalog')} data-testid="menu-week-open-catalog-dialog">
							Desde catálogo
						</Button>
						<Button type="button" variant="secondary" onclick={() => openStockDialog('global-stock')} data-testid="menu-week-open-global-stock-dialog">
							Desde stock global
						</Button>
					</div>

					{#if weekStockError}
						<p class="mt-3 text-sm text-[hsl(var(--destructive))]" role="alert">{weekStockError}</p>
					{/if}
					{#if stockTransferError}
						<p class="mt-3 text-sm text-[hsl(var(--destructive))]" role="alert">{stockTransferError}</p>
					{/if}

						{#if weekStockDraft.length === 0}
						<p class="mt-4 text-sm text-[hsl(var(--muted-foreground))]">Aún no has marcado ningún producto como disponible.</p>
					{:else}
						<div class="mt-4 space-y-2">
							{#each weekStockDraft as item, index (index)}
								<div class="flex items-center justify-between gap-3 rounded-md border px-3 py-2" data-testid={`menu-week-stock-item-${index}`}>
									<div class="min-w-0">
										<p class="truncate text-sm font-medium">{item.productName}</p>
										<p class="text-xs text-[hsl(var(--muted-foreground))]">{formatNumber(item.quantity)} uds · {formatCurrency(item.price)}</p>
									</div>
									<Button type="button" variant="ghost" size="sm" onclick={() => removeWeekStockItem(index)} disabled={savingWeekStock} data-testid={`menu-week-stock-remove-${index}`}>
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
	{#if stockDialogMode}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/35 p-3 backdrop-blur-sm sm:p-4"
			role="presentation"
			onclick={(event) => event.currentTarget === event.target && closeStockDialog()}
		>
			<div
				class="flex max-h-[calc(100vh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl sm:max-h-[calc(100vh-2rem)]"
				role="dialog"
				aria-modal="true"
				aria-labelledby="menu-week-stock-dialog-title"
				tabindex="-1"
				onkeydown={(event) => event.key === 'Escape' && closeStockDialog()}
				data-testid={`menu-week-${stockDialogMode}-dialog`}
			>
				<header class="flex items-start justify-between gap-4 border-b border-[hsl(var(--border))] p-4 sm:p-5">
					<div class="min-w-0">
						<h2 id="menu-week-stock-dialog-title" class="text-lg font-semibold text-[hsl(var(--foreground))]">
							{stockDialogMode === 'shopping-list'
								? 'Añadir desde la lista de compra'
								: stockDialogMode === 'catalog'
									? 'Añadir desde catálogo'
									: 'Aplicar desde stock global'}
						</h2>
						<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
							{stockDialogMode === 'shopping-list'
								? 'Elige un producto pendiente y súmalo al stock temporal del menú.'
								: stockDialogMode === 'catalog'
									? 'Busca un producto del catálogo y añade la cantidad que quieras.'
									: 'Busca entre los lotes existentes del stock global y limita la cantidad a lo disponible.'}
						</p>
					</div>
					<Button variant="ghost" size="icon" type="button" onclick={closeStockDialog} aria-label="Cerrar diálogo de stock">
						<X class="size-4" aria-hidden="true" />
					</Button>
				</header>

				<div class="grid gap-5 overflow-y-auto p-4 sm:p-5">
					{#if stockDialogMode === 'shopping-list'}
						<div class="space-y-4">
							<div class="flex items-center justify-between gap-3">
								<div>
									<h3 class="text-sm font-semibold text-[hsl(var(--foreground))]">Lista de compra</h3>
									<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
										Las cantidades se rellenan con lo que falta en cada producto.
									</p>
								</div>
								<Button type="button" variant="secondary" onclick={shareShoppingList} disabled={shoppingListLoading || sharingShoppingList || shoppingList.length === 0} data-testid="menu-week-shopping-list-share">
									<Share2 class="size-4" />
									{sharingShoppingList ? 'Compartiendo…' : shoppingListPrimaryActionLabel()}
								</Button>
							</div>

							<label class="block min-w-0">
								<span class="sr-only">Supermercado</span>
								<select
									class="h-10 w-full rounded-md border bg-white px-3 text-sm"
									bind:value={supermarketId}
									onchange={() => void refreshShoppingList()}
									data-testid="menu-week-shopping-list-supermarket"
								>
									<option value="">Todos los supermercados</option>
									{#each supermarkets as supermarket}
										<option value={supermarket.id}>{supermarket.name}</option>
									{/each}
								</select>
							</label>

							{#if shoppingListShareMessage}
								<p class="text-sm text-[hsl(var(--muted-foreground))]" role="status">{shoppingListShareMessage}</p>
							{/if}
							{#if shoppingListError}
								<p class="text-sm text-[hsl(var(--destructive))]" role="alert">{shoppingListError}</p>
							{/if}

							{#if shoppingList.length === 0}
								<p class="text-sm text-[hsl(var(--muted-foreground))]">
									{supermarketId ? `No hay productos pendientes para ${selectedSupermarketName()}.` : 'No hay productos pendientes.'}
								</p>
							{:else}
								<div class="max-h-[17rem] overflow-y-auto pr-1">
									<div class="hidden overflow-x-auto md:block">
										<table class="w-full text-sm">
											<thead class="bg-[hsl(var(--secondary))] text-xs text-[hsl(var(--muted-foreground))]">
												<tr>
													<th class="px-3 py-2 text-left font-medium">Producto</th>
													<th class="px-3 py-2 text-right font-medium">Faltan</th>
													<th class="px-3 py-2 text-right font-medium">Precio</th>
												</tr>
											</thead>
											<tbody class="divide-y">
												{#each shoppingList as item}
													<tr>
														<td class="px-3 py-2">{item.productName}</td>
														<td class="px-3 py-2 text-right tabular-nums">{formatNumber(item.missingUnits)}</td>
														<td class="px-3 py-2 text-right tabular-nums">{formatCurrency(item.price ?? 0)}</td>
													</tr>
												{/each}
											</tbody>
										</table>
									</div>
									<div class="space-y-2 md:hidden">
										{#each shoppingList as item}
											<div class="rounded-md border p-3">
												<p class="text-sm font-medium">{item.productName}</p>
												<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{formatNumber(item.missingUnits)} uds · {formatCurrency(item.price ?? 0)}</p>
											</div>
										{/each}
									</div>
								</div>
							{/if}

							<div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_8rem_auto] md:items-end">
								<label class="block min-w-0">
									<span class="text-sm font-medium">Producto pendiente</span>
									<select
										class="mt-2 h-10 w-full rounded-md border bg-white px-3 text-sm"
										bind:value={shoppingListProductId}
										onchange={(event) => {
											const selected = shoppingListItems().find((item) => String(item.productId) === String((event.currentTarget as HTMLSelectElement).value));
											shoppingListQuantity = selected ? String(selected.missingUnits) : '';
											shoppingListPrice = selected?.price === null || selected?.price === undefined ? '' : String(selected.price);
										}}
										data-testid="menu-week-stock-product"
									>
										<option value="">Selecciona un producto</option>
										{#each shoppingListItems() as item}
											<option value={item.productId}>{item.productName} · faltan {formatNumber(item.missingUnits)}</option>
										{/each}
									</select>
								</label>
											<label class="block min-w-0">
												<span class="text-sm font-medium">Cantidad</span>
												<input class="mt-2 h-10 w-full rounded-md border bg-white px-3 text-sm" bind:value={shoppingListQuantity} inputmode="decimal" placeholder="1" data-testid="menu-week-stock-quantity" />
											</label>
											<label class="block min-w-0">
												<span class="text-sm font-medium">Precio</span>
												<input class="mt-2 h-10 w-full rounded-md border bg-white px-3 text-sm" bind:value={shoppingListPrice} inputmode="decimal" step="any" placeholder="0" data-testid="menu-week-stock-price" />
											</label>
											<Button type="button" onclick={addWeekStockFromShoppingList} disabled={savingWeekStock} data-testid="menu-week-stock-add">
												<Plus class="size-4" />
												{savingWeekStock ? 'Guardando…' : 'Añadir'}
											</Button>
										</div>
						</div>
					{:else if stockDialogMode === 'catalog'}
								<div class="space-y-4">
									<StockProductSearch
										authorization={authorization}
										selectedProduct={catalogProduct}
										onSelect={(product) => {
											catalogProduct = product;
											catalogQuantity = '1';
											catalogPrice = product.defaultPrice === null ? '' : String(product.defaultPrice);
										}}
										onClear={() => {
											catalogProduct = null;
											catalogQuantity = '';
											catalogPrice = '';
										}}
										testId="menu-week-catalog-search"
									/>
							<div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_8rem_auto] md:items-end">
								<label class="block min-w-0">
									<span class="text-sm font-medium">Cantidad</span>
									<input class="mt-2 h-10 w-full rounded-md border bg-white px-3 text-sm" bind:value={catalogQuantity} inputmode="decimal" placeholder="1" data-testid="menu-week-catalog-quantity" />
								</label>
								<label class="block min-w-0">
									<span class="text-sm font-medium">Precio</span>
									<input class="mt-2 h-10 w-full rounded-md border bg-white px-3 text-sm" bind:value={catalogPrice} inputmode="decimal" step="any" placeholder="0" data-testid="menu-week-catalog-price" />
								</label>
								<Button type="button" onclick={addWeekStockFromCatalog} disabled={savingWeekStock || !catalogProduct} data-testid="menu-week-catalog-add">
									<Plus class="size-4" />
									{savingWeekStock ? 'Guardando…' : 'Añadir al menú'}
								</Button>
							</div>
						</div>
					{:else}
						<div class="space-y-4">
							<label class="block min-w-0">
								<span class="text-sm font-medium">Buscar en stock</span>
								<div class="relative mt-2">
									<Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
									<input
										class="h-10 w-full rounded-md border bg-white px-3 pl-9 text-sm"
										type="search"
										value={globalStockEntrySearch}
										oninput={(event) => {
											globalStockEntrySearch = (event.currentTarget as HTMLInputElement).value;
										}}
										placeholder="Producto, lote, precio o fecha"
										autocomplete="off"
										data-testid="menu-week-global-stock-search-entry"
									/>
								</div>
							</label>
							{#if globalStockEntriesLoading}
								<p class="text-sm text-[hsl(var(--muted-foreground))]">Cargando lotes del stock global...</p>
							{:else if globalStockEntriesError}
								<p class="text-sm text-[hsl(var(--destructive))]" role="alert">{globalStockEntriesError}</p>
							{:else}
								<div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_8rem_auto] md:items-end">
									<label class="block min-w-0">
										<span class="text-sm font-medium">Lote de stock</span>
										<select
											class="mt-2 h-10 w-full rounded-md border bg-white px-3 text-sm"
											bind:value={globalStockEntryId}
											onchange={(event) => selectGlobalStockEntry(String((event.currentTarget as HTMLSelectElement).value))}
											data-testid="menu-week-global-stock-entry"
										>
											<option value="">Selecciona un lote</option>
											{#each filteredGlobalStockEntries() as entry}
												<option value={String(entry.id)}>
													{formatNumber(entry.quantity)} uds · {formatCurrency(entry.price)} · {entry.expirationDate ?? 'sin caducidad'}
												</option>
											{/each}
										</select>
									</label>
									<label class="block min-w-0">
										<span class="flex items-center justify-between gap-2 text-sm font-medium">
											Cantidad
											{#if selectedGlobalStockEntry()}
												<span class="text-xs font-normal text-[hsl(var(--muted-foreground))]">Máximo {formatNumber(globalStockEntryMaxQuantity())}</span>
											{/if}
										</span>
										<input
											class="mt-2 h-10 w-full rounded-md border bg-white px-3 text-sm"
											type="number"
											inputmode="decimal"
											step="any"
											min="0"
											max={selectedGlobalStockEntry() ? globalStockEntryMaxQuantity() : undefined}
											bind:value={globalStockEntryQuantity}
											placeholder="1"
											data-testid="menu-week-global-stock-quantity"
										/>
									</label>
									<Button type="button" onclick={applyGlobalStockToMenu} disabled={savingStockMovement || !globalStockEntryId} data-testid="menu-week-global-stock-add">
										<Plus class="size-4" />
										{savingStockMovement ? 'Aplicando…' : 'Aplicar al menú'}
									</Button>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
	</div>
	</section>

{#if importDialogOpen}
	<MenuItemImportDialog
		menuId={menu.id}
		{authorization}
		onClose={() => importDialogOpen = false}
		onImported={async (updatedMenu) => {
			const normalizedMenu = toEstablishedWeekMenuModel(updatedMenu);
			await onUpdated?.(normalizedMenu);
			weekStockDraft = normalizedMenu.weekStock.map((item) => ({ ...item }));
			usedStock = normalizedMenu.usedStock.map((item) => ({ ...item }));
			shoppingList = normalizedMenu.shoppingList.map((item) => ({ ...item }));
		}}
	/>
{/if}
