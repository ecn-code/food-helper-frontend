<script lang="ts">
	import { onMount } from 'svelte';
	import { CircleCheck, Store, Users, X } from '@lucide/svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { ApiError, isSessionExpiredError } from '$lib/api/backend';
	import ValidationDialog from '$lib/components/ui/ValidationDialog.svelte';
	import {
		closeMenu,
		getMenuStats,
		listMenuShoppingList,
		type EstablishedWeekMenuShoppingListItemResponse,
		type EstablishedWeekMenuUsedStockResponse,
		type MenuStatsResponse
	} from '$lib/api/established-week-menus';
	import { listStockEntries, type StockEntryPayload } from '$lib/api/stock';
	import { listSupermarkets, type Supermarket } from '$lib/api/supermarkets';
	import { listUsers, type UserResponse } from '$lib/api/users';
	import ShoppingListDialog from '$lib/components/planning/ShoppingListDialog.svelte';

	let {
		menuId,
		payerUsername,
		currentUserId,
		initialPersonIds,
		authorization,
		initialShoppingList,
		initialUsedStock,
		initialWeekStock,
		showPanel = true,
		openToken = 0,
		onClosed
	}: {
		menuId: number;
		payerUsername: string;
		currentUserId: number;
		initialPersonIds: number[];
		authorization: string;
		initialShoppingList: EstablishedWeekMenuShoppingListItemResponse[];
		initialUsedStock: EstablishedWeekMenuUsedStockResponse[];
		initialWeekStock: { productId: number; productName: string; quantity: number; price: number }[];
		showPanel?: boolean;
		openToken?: number;
		onClosed?: () => void | Promise<void>;
	} = $props();

	let stats = $state<MenuStatsResponse | null>(null);
	let supermarkets = $state<Supermarket[]>([]);
	let users = $state<UserResponse[]>([]);
	let shoppingList = $state<EstablishedWeekMenuShoppingListItemResponse[]>([]);
	let usedStock = $state<EstablishedWeekMenuUsedStockResponse[]>([]);
	let weekStock = $state<{ productId: number; productName: string; quantity: number; price: number }[]>([]);
	let stockEntries = $state<StockEntryPayload[]>([]);
	let supermarketId = $state('');
	let error = $state('');
	let shoppingListDialogOpen = $state(false);
	let shoppingListDialogNonce = $state(0);
	let shoppingListLoading = $state(false);
	let shoppingListDialogError = $state('');
	let closeDialogOpen = $state(false);
	let selectedPersonIds = $state<string[]>([]);
	let closing = $state(false);
	let stockPreviewLoading = $state(false);
	let stockPreviewError = $state('');
	let validationDialog = $state<{ title: string; message: string; items: string[] } | null>(null);
	let lastOpenToken = $state(0);

	function normalizeSelectedPersonIds(values: unknown) {
		if (!Array.isArray(values)) return [];
		return [...new Set(
			values
				.map((value) => String(value))
				.filter((value) => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) > 0)
		)];
	}

	function fallbackSelectedPersonIds() {
		return [String(currentUserId)];
	}

	function initialSelectedPersonIds() {
		const normalized = normalizeSelectedPersonIds(initialPersonIds);
		return normalized.length > 0 ? normalized : fallbackSelectedPersonIds();
	}

	function syncMenuSnapshot() {
		shoppingList = initialShoppingList.map((item) => ({ ...item }));
		usedStock = initialUsedStock;
		weekStock = initialWeekStock.map((item) => ({ ...item }));
		stockEntries = [];
		stockPreviewError = '';
		stockPreviewLoading = false;
	}

	onMount(() => void (async () => {
		syncMenuSnapshot();
		try {
			supermarkets = await listSupermarkets(authorization);
		} catch {
			supermarkets = [];
		}
		try {
			users = await listUsers(authorization);
		} catch {
			users = [];
		}
		if (showPanel) {
			try {
				stats = await getMenuStats(menuId, authorization);
			} catch (cause) {
				if (isSessionExpiredError(cause)) return;
				if (!(cause instanceof ApiError && cause.status === 404)) {
					error = cause instanceof ApiError ? cause.message : 'No se pudieron cargar las estadísticas.';
				}
			}
		}
	})());

	$effect(() => {
		menuId;
		initialShoppingList;
		initialUsedStock;
		initialWeekStock;
		syncMenuSnapshot();
	});

	$effect(() => {
		if (showPanel) return;
		if (!openToken || openToken === lastOpenToken) return;
		lastOpenToken = openToken;
		openCloseDialog();
	});

	async function filterShoppingList() {
		validationDialog = null;
		shoppingListDialogOpen = false;
		if (!supermarketId) {
			shoppingListDialogError = 'Selecciona un supermercado para generar la lista.';
			validationDialog = {
				title: 'No se puede generar la lista de compra',
				message: 'Corrige este campo antes de continuar.',
				items: ['Supermercado: selecciona un supermercado.']
			};
			return;
		}

		shoppingListLoading = true;
		shoppingListDialogError = '';
		try {
			shoppingList = await listMenuShoppingList(menuId, authorization, supermarketId ? Number(supermarketId) : undefined);
			shoppingListDialogNonce += 1;
			shoppingListDialogOpen = true;
		} catch (cause) {
			if (isSessionExpiredError(cause)) return;
			shoppingListDialogError = cause instanceof ApiError ? cause.message : 'No se pudo cargar la lista de compra.';
		} finally {
			shoppingListLoading = false;
		}
	}

	function selectedSupermarketName() {
		return supermarkets.find((item) => String(item.id) === supermarketId)?.name ?? '';
	}

	function openCloseDialog() {
		error = '';
		closeDialogOpen = true;
		selectedPersonIds = initialSelectedPersonIds();
		void loadStockPreview();
	}

	function closeStockPreviewDialog() {
		closeDialogOpen = false;
		error = '';
		stockPreviewError = '';
		stockPreviewLoading = false;
	}

	async function loadStockPreview() {
		const relevantProductIds = [...new Set([...usedStock.map((item) => item.productId), ...weekStock.map((item) => item.productId)])];
		if (relevantProductIds.length === 0) {
			stockEntries = [];
			stockPreviewError = '';
			return;
		}

		stockPreviewLoading = true;
		stockPreviewError = '';
		try {
			stockEntries = await listStockEntries(authorization, { productIds: relevantProductIds });
		} catch (cause) {
			if (isSessionExpiredError(cause)) return;
			stockEntries = [];
			stockPreviewError = cause instanceof ApiError ? cause.message : 'No se pudo cargar la vista previa del stock.';
		} finally {
			stockPreviewLoading = false;
		}
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
			validationDialog = {
				title: 'No se puede cerrar el menú',
				message: 'Corrige este campo antes de continuar.',
				items: ['Personas consumidoras: selecciona al menos una persona.']
			};
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
			if (isSessionExpiredError(cause)) return;
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

	type StockPreviewRow = {
		productId: number;
		productName: string;
		currentUnits: number;
		usedUnits: number;
		positiveUnits: number;
		finalUnits: number;
	};

	function stockPreviewRows(): StockPreviewRow[] {
		const rowsByProduct = new Map<number, StockPreviewRow>();
		const getRow = (productId: number, productName: string) => {
			const existing = rowsByProduct.get(productId);
			if (existing) return existing;
			const created = {
				productId,
				productName,
				currentUnits: 0,
				usedUnits: 0,
				positiveUnits: 0,
				finalUnits: 0
			};
			rowsByProduct.set(productId, created);
			return created;
		};

		for (const entry of stockEntries) {
			getRow(entry.productId, entry.productName).currentUnits += Number(entry.quantity ?? 0);
		}

		for (const item of usedStock) {
			getRow(item.productId, item.productName).usedUnits += Number(item.usedUnits ?? 0);
		}

		for (const item of weekStock) {
			getRow(item.productId, item.productName).positiveUnits += Number(item.quantity ?? 0);
		}

		for (const row of rowsByProduct.values()) {
			row.finalUnits = Math.max(0, row.currentUnits - row.usedUnits + row.positiveUnits);
		}

		return [...rowsByProduct.values()].sort((left, right) => left.productName.localeCompare(right.productName));
	}

	function stockPreviewTotals() {
		const rows = stockPreviewRows();
		return {
			currentUnits: rows.reduce((sum, row) => sum + row.currentUnits, 0),
			usedUnits: rows.reduce((sum, row) => sum + row.usedUnits, 0),
			positiveUnits: rows.reduce((sum, row) => sum + row.positiveUnits, 0),
			finalUnits: rows.reduce((sum, row) => sum + row.finalUnits, 0)
		};
	}
</script>

{#if showPanel}
	<section class="space-y-4 rounded-lg border bg-[hsl(var(--card))] p-4" data-testid="menu-completion-panel">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
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
				<span class="text-sm font-medium">Supermercado</span>
				<select class="h-10 w-full rounded-md border bg-white px-3 text-sm" bind:value={supermarketId}>
					<option value="">Selecciona un supermercado</option>
					{#each supermarkets as supermarket}
						<option value={supermarket.id}>{supermarket.name}</option>
					{/each}
				</select>
			</label>
			<div class="min-w-0">
				<p class="text-sm font-medium">{shoppingList.length} productos en la lista</p>
				<p class="truncate text-xs text-[hsl(var(--muted-foreground))]">
					{supermarketId ? selectedSupermarketName() : 'Selecciona un supermercado para generar la lista'}
				</p>
			</div>
			<div class="flex flex-wrap gap-2">
				<Button type="button" variant="secondary" onclick={filterShoppingList} disabled={shoppingListLoading}>
					<Store class="size-4" />
					{shoppingListLoading ? 'Generando…' : 'Ver lista'}
				</Button>
			</div>
		</div>

		{#if shoppingListDialogError}
			<p class="text-sm text-[hsl(var(--destructive))]" role="alert">{shoppingListDialogError}</p>
		{/if}

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
{/if}

<ValidationDialog
	open={validationDialog !== null}
	title={validationDialog?.title ?? 'Validación pendiente'}
	message={validationDialog?.message ?? 'Revisa el formulario antes de continuar.'}
	items={validationDialog?.items ?? []}
	onClose={() => (validationDialog = null)}
/>

<ShoppingListDialog
	open={shoppingListDialogOpen}
	menuLabel={`Menú #${menuId}`}
	supermarketName={selectedSupermarketName()}
	items={shoppingList}
	resetToken={shoppingListDialogNonce}
	onClose={() => (shoppingListDialogOpen = false)}
/>

{#if closeDialogOpen}
	<div class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" role="presentation">
		<div class="w-full max-w-4xl rounded-lg border bg-[hsl(var(--card))] shadow-xl" role="dialog" aria-modal="true" aria-labelledby="close-menu-title" data-testid="close-menu-dialog">
			<div class="flex items-start justify-between gap-4 border-b p-5">
				<div>
					<h2 id="close-menu-title" class="text-lg font-semibold">Cerrar menú</h2>
					<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Selecciona al menos una persona. El usuario actual aparece marcado por defecto.</p>
				</div>
				<Button variant="ghost" size="icon" type="button" onclick={() => (closeDialogOpen = false)} aria-label="Cerrar">
					<X class="size-4" />
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
				<div class="space-y-4 rounded-lg border bg-[hsl(var(--secondary)/0.35)] p-4">
					<div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
						<div>
							<h3 class="text-sm font-semibold">Resumen previo al cierre</h3>
							<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
								Revisa cómo quedará el stock y qué movimiento se generará en la hucha antes de confirmar.
							</p>
						</div>
					</div>
					<div class="grid gap-3 sm:grid-cols-3">
						<div class="rounded-md border bg-[hsl(var(--card))] p-3">
							<p class="text-xs text-[hsl(var(--muted-foreground))]">Movimiento previsto en la hucha</p>
							<p class="mt-1 text-lg font-semibold tabular-nums text-[hsl(var(--destructive))]">{money(-usedStock.reduce((sum, item) => sum + Number(item.totalCost ?? 0), 0))}</p>
							<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Se generará un cargo para {payerUsername}.</p>
						</div>
						<div class="rounded-md border bg-[hsl(var(--card))] p-3">
							<p class="text-xs text-[hsl(var(--muted-foreground))]">Positivos del menú</p>
							<p class="mt-1 text-lg font-semibold tabular-nums">{number(weekStock.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0))} uds</p>
							<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Se muestran por línea para revisar su impacto antes de confirmar.</p>
						</div>
						<div class="rounded-md border bg-[hsl(var(--card))] p-3">
							<p class="text-xs text-[hsl(var(--muted-foreground))]">Stock final estimado</p>
							<p class="mt-1 text-lg font-semibold tabular-nums">{number(stockPreviewTotals().finalUnits)} uds</p>
							<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{stockPreviewRows().length} productos afectados</p>
						</div>
					</div>
				{#if stockPreviewLoading}
					<p class="text-sm text-[hsl(var(--muted-foreground))]">Cargando stock actual para la vista previa…</p>
				{:else if stockPreviewError}
					<p class="text-sm text-[hsl(var(--destructive))]" role="alert">{stockPreviewError}</p>
				{:else if stockPreviewRows().length === 0}
					<p class="text-sm text-[hsl(var(--muted-foreground))]">No hay productos relevantes para previsualizar.</p>
				{:else}
						<div class="hidden overflow-x-auto md:block">
							<table class="w-full text-sm">
								<thead class="bg-[hsl(var(--secondary))] text-xs text-[hsl(var(--muted-foreground))]">
									<tr>
										<th class="px-3 py-2 text-left font-medium">Producto</th>
										<th class="px-3 py-2 text-right font-medium">Actual</th>
										<th class="px-3 py-2 text-right font-medium">Usado</th>
										<th class="px-3 py-2 text-right font-medium">Positivos</th>
										<th class="px-3 py-2 text-right font-medium">Final</th>
									</tr>
								</thead>
								<tbody class="divide-y">
									{#each stockPreviewRows() as row (row.productId)}
										<tr>
											<td class="px-3 py-2">{row.productName}</td>
											<td class="px-3 py-2 text-right tabular-nums">{number(row.currentUnits)}</td>
											<td class="px-3 py-2 text-right tabular-nums">-{number(row.usedUnits)}</td>
											<td class="px-3 py-2 text-right tabular-nums">+{number(row.positiveUnits)}</td>
											<td class="px-3 py-2 text-right tabular-nums font-medium">{number(row.finalUnits)}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
						<div class="space-y-2 md:hidden">
							{#each stockPreviewRows() as row (row.productId)}
								<div class="rounded-md border bg-[hsl(var(--card))] p-3">
									<div class="flex items-start justify-between gap-3">
										<p class="text-sm font-medium">{row.productName}</p>
										<p class="text-sm font-semibold tabular-nums">{number(row.finalUnits)} uds</p>
									</div>
									<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
										Actual {number(row.currentUnits)} uds · usado {number(row.usedUnits)} uds · positivos +{number(row.positiveUnits)} uds
									</p>
								</div>
							{/each}
						</div>
					{/if}
					{#if error}
						<p class="text-sm text-[hsl(var(--destructive))]" role="alert">{error}</p>
					{/if}
				</div>
				<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<Button type="button" variant="secondary" onclick={closeStockPreviewDialog}>Cancelar</Button>
					<Button type="button" onclick={finish} disabled={closing}>
						<CircleCheck class="size-4" />
						{closing ? 'Cerrando…' : 'Confirmar cierre'}
					</Button>
				</div>
			</div>
		</div>
	</div>
{/if}
