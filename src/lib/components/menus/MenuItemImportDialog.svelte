<script lang="ts">
	import { FileJson2, Package, Pencil, Trash2, WalletCards, Warehouse, X } from '@lucide/svelte';
	import { ApiError, isSessionExpiredError } from '$lib/api/backend';
	import { importMenuItems, type MenuItemImportDestination } from '$lib/api/menu-item-import';
	import { listMoneyBoxes, type MoneyBox } from '$lib/api/money-box';
	import { getProduct } from '$lib/api/products';
	import type { EstablishedWeekMenuResponse } from '$lib/api/established-week-menus';
	import StockProductSearch from '$lib/components/stock/StockProductSearch.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { parseMenuItemImportJson } from '$lib/menu-item-import';
	import type { Product } from '$lib/products';

	type ImportDraftItem = {
		key: number;
		originalProductId: number;
		product: Product | null;
		quantity: string;
		price: string;
		destination: MenuItemImportDestination;
		moneyBoxId: string;
		expirationDate: string;
		productError: string;
	};

	let {
		menuId,
		authorization,
		onClose,
		onImported
	}: {
		menuId: number;
		authorization: string;
		onClose: () => void;
		onImported: (menu: EstablishedWeekMenuResponse) => void | Promise<void>;
	} = $props();

	let jsonSource = $state('');
	let items = $state<ImportDraftItem[]>([]);
	let parseError = $state('');
	let submitError = $state('');
	let resolving = $state(false);
	let submitting = $state(false);
	let moneyBoxes = $state<MoneyBox[]>([]);
	let moneyBoxesLoading = $state(false);
	let moneyBoxesLoaded = $state(false);
	let moneyBoxesError = $state('');
	let editingProductKey = $state<number | null>(null);

	function formatCurrency(value: number) {
		return new Intl.NumberFormat('es-ES', {
			style: 'currency',
			currency: 'EUR',
			maximumFractionDigits: 2
		}).format(value);
	}

	async function loadJson() {
		parseError = '';
		submitError = '';
		let parsed;
		try {
			parsed = parseMenuItemImportJson(jsonSource);
		} catch (cause) {
			parseError = cause instanceof Error ? cause.message : 'No se pudo leer el JSON.';
			return;
		}

		resolving = true;
		const productRequests = new Map<number, Promise<Product>>();
		for (const item of parsed) {
			if (!productRequests.has(item.productId)) {
				productRequests.set(item.productId, getProduct(item.productId, authorization));
			}
		}

		items = await Promise.all(parsed.map(async (item, index): Promise<ImportDraftItem> => {
			try {
				const product = await productRequests.get(item.productId)!;
				return {
					key: index + 1,
					originalProductId: item.productId,
					product,
					quantity: String(item.quantity),
					price: String(item.price),
					destination: 'MENU_STOCK',
					moneyBoxId: '',
					expirationDate: '',
					productError: ''
				};
			} catch (cause) {
				return {
					key: index + 1,
					originalProductId: item.productId,
					product: null,
					quantity: String(item.quantity),
					price: String(item.price),
					destination: 'MENU_STOCK',
					moneyBoxId: '',
					expirationDate: '',
					productError: isSessionExpiredError(cause)
						? 'La sesión ha caducado.'
						: `No se encontró el producto #${item.productId}.`
				};
			}
		}));
		resolving = false;
	}

	function updateItem(key: number, changes: Partial<ImportDraftItem>) {
		items = items.map((item) => item.key === key ? { ...item, ...changes } : item);
	}

	async function setDestination(key: number, destination: MenuItemImportDestination) {
		updateItem(key, {
			destination,
			moneyBoxId: destination === 'MONEY_BOX' ? items.find((item) => item.key === key)?.moneyBoxId ?? '' : '',
			expirationDate: destination === 'GLOBAL_STOCK' ? items.find((item) => item.key === key)?.expirationDate ?? '' : ''
		});
		if (destination === 'MONEY_BOX') {
			await loadMoneyBoxes();
		}
	}

	async function loadMoneyBoxes() {
		if (moneyBoxesLoaded || moneyBoxesLoading) return;
		moneyBoxesLoading = true;
		moneyBoxesError = '';
		try {
			moneyBoxes = await listMoneyBoxes(authorization);
			moneyBoxesLoaded = true;
		} catch (cause) {
			if (isSessionExpiredError(cause)) return;
			moneyBoxesError = cause instanceof ApiError ? cause.message : 'No se pudieron cargar las cajas.';
		} finally {
			moneyBoxesLoading = false;
		}
	}

	function removeItem(key: number) {
		items = items.filter((item) => item.key !== key);
		if (editingProductKey === key) editingProductKey = null;
	}

	function itemError(item: ImportDraftItem) {
		if (!item.product) return item.productError || 'Selecciona un producto.';
		const quantity = Number(item.quantity);
		if (!Number.isFinite(quantity) || quantity <= 0) return 'La cantidad debe ser mayor que 0.';
		const price = Number(item.price);
		if (item.price.trim() === '' || !Number.isFinite(price) || price < 0) return 'El precio debe ser igual o mayor que 0.';
		if (item.destination === 'MONEY_BOX' && !item.moneyBoxId) return 'Selecciona una caja.';
		if (item.destination === 'GLOBAL_STOCK' && item.expirationDate && !/^\d{4}-\d{2}-\d{2}$/.test(item.expirationDate)) {
			return 'Introduce una caducidad válida.';
		}
		return '';
	}

	function canSubmit() {
		return items.length > 0 && !submitting && items.every((item) => !itemError(item));
	}

	function countDestination(destination: MenuItemImportDestination) {
		return items.filter((item) => item.destination === destination).length;
	}

	function moneyExpense() {
		return items
			.filter((item) => item.destination === 'MONEY_BOX')
			.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0);
	}

	async function submit() {
		if (!canSubmit()) return;
		submitting = true;
		submitError = '';
		try {
			const response = await importMenuItems(menuId, items.map((item) => ({
				productId: item.product!.id,
				quantity: Number(item.quantity),
				price: Number(item.price),
				destination: item.destination,
				...(item.destination === 'MONEY_BOX' ? { moneyBoxId: Number(item.moneyBoxId) } : {}),
				...(item.destination === 'GLOBAL_STOCK'
					? { expirationDate: item.expirationDate || null }
					: {})
			})), authorization);
			await onImported(response.menu);
			onClose();
		} catch (cause) {
			if (isSessionExpiredError(cause)) return;
			submitError = cause instanceof ApiError ? cause.message : 'No se pudo aplicar la importación.';
		} finally {
			submitting = false;
		}
	}
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/35 p-3 backdrop-blur-sm sm:p-4"
	role="presentation"
	onclick={(event) => event.currentTarget === event.target && !submitting && onClose()}
>
	<div
		class="flex max-h-[calc(100vh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl sm:max-h-[calc(100vh-2rem)]"
		role="dialog"
		aria-modal="true"
		aria-labelledby="menu-item-import-title"
		tabindex="-1"
		onkeydown={(event) => event.key === 'Escape' && !submitting && onClose()}
		data-testid="menu-item-import-dialog"
	>
		<header class="flex items-start justify-between gap-4 border-b p-4 sm:p-5">
			<div class="min-w-0">
				<h2 id="menu-item-import-title" class="flex items-center gap-2 text-lg font-semibold">
					<FileJson2 class="size-5 text-[hsl(var(--primary))]" aria-hidden="true" />
					Importar productos desde JSON
				</h2>
				<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
					Pega el JSON, revisa cada producto y elige dónde aplicarlo.
				</p>
			</div>
			<Button variant="ghost" size="icon" onclick={onClose} disabled={submitting} aria-label="Cerrar importación">
				<X class="size-4" aria-hidden="true" />
			</Button>
		</header>

		<div class="overflow-y-auto p-4 sm:p-5">
			{#if items.length === 0}
				<div class="mx-auto max-w-3xl space-y-4">
					<label class="block">
						<span class="text-sm font-medium">JSON de productos</span>
						<textarea
							class="mt-2 min-h-56 w-full resize-y rounded-md border bg-white p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.2)]"
							bind:value={jsonSource}
							placeholder={'[\n  { "id": 12, "price": 2.49, "quantity": 3 }\n]'}
							spellcheck="false"
							data-testid="menu-item-import-json"
						></textarea>
					</label>
					<p class="text-xs text-[hsl(var(--muted-foreground))]">
						Formato: un array de objetos con <code>id</code>, <code>price</code> y <code>quantity</code> numéricos.
					</p>
					{#if parseError}
						<p class="text-sm text-[hsl(var(--destructive))]" role="alert">{parseError}</p>
					{/if}
					<div class="flex justify-end">
						<Button onclick={loadJson} disabled={resolving || !jsonSource.trim()} data-testid="menu-item-import-load">
							<FileJson2 class="size-4" aria-hidden="true" />
							{resolving ? 'Resolviendo…' : 'Cargar JSON'}
						</Button>
					</div>
				</div>
			{:else}
				<div class="space-y-4">
					<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
						<div class="rounded-md border p-3">
							<p class="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]"><Package class="size-4" /> Stock del menú</p>
							<p class="mt-1 text-lg font-semibold tabular-nums">{countDestination('MENU_STOCK')}</p>
						</div>
						<div class="rounded-md border p-3">
							<p class="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]"><WalletCards class="size-4" /> Movimientos de caja</p>
							<p class="mt-1 text-lg font-semibold tabular-nums">{countDestination('MONEY_BOX')}</p>
						</div>
						<div class="rounded-md border p-3">
							<p class="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]"><Warehouse class="size-4" /> Stock global</p>
							<p class="mt-1 text-lg font-semibold tabular-nums">{countDestination('GLOBAL_STOCK')}</p>
						</div>
						<div class="rounded-md border p-3">
							<p class="text-xs text-[hsl(var(--muted-foreground))]">Gasto en cajas</p>
							<p class="mt-1 text-lg font-semibold tabular-nums">{formatCurrency(moneyExpense())}</p>
						</div>
					</div>

					<div class="hidden overflow-x-auto rounded-md border lg:block">
						<table class="w-full min-w-[920px] text-sm">
							<thead class="bg-[hsl(var(--secondary))] text-xs text-[hsl(var(--muted-foreground))]">
								<tr>
									<th class="px-3 py-2 text-left font-medium">Producto</th>
									<th class="w-28 px-3 py-2 text-right font-medium">Cantidad</th>
									<th class="w-28 px-3 py-2 text-right font-medium">Precio</th>
									<th class="w-48 px-3 py-2 text-left font-medium">Destino</th>
									<th class="w-52 px-3 py-2 text-left font-medium">Detalle</th>
									<th class="w-12 px-2 py-2"><span class="sr-only">Acciones</span></th>
								</tr>
							</thead>
							<tbody class="divide-y">
								{#each items as item (item.key)}
									<tr class="align-top" data-testid={`menu-item-import-row-${item.key}`}>
										<td class="px-3 py-3">
											<div class="flex min-w-0 items-start justify-between gap-2">
												<div class="min-w-0">
													<p class="truncate font-medium">{item.product?.name ?? `Producto #${item.originalProductId}`}</p>
													<p class="text-xs text-[hsl(var(--muted-foreground))]">#{item.product?.id ?? item.originalProductId}</p>
												</div>
												<Button variant="ghost" size="icon" onclick={() => editingProductKey = item.key} aria-label={`Cambiar producto de la fila ${item.key}`}>
													<Pencil class="size-4" />
												</Button>
											</div>
										</td>
										<td class="px-3 py-3"><input class="h-9 w-full rounded-md border px-2 text-right tabular-nums" type="number" min="0" step="any" value={item.quantity} oninput={(event) => updateItem(item.key, { quantity: event.currentTarget.value })} aria-label={`Cantidad fila ${item.key}`} /></td>
										<td class="px-3 py-3"><input class="h-9 w-full rounded-md border px-2 text-right tabular-nums" type="number" min="0" step="any" value={item.price} oninput={(event) => updateItem(item.key, { price: event.currentTarget.value })} aria-label={`Precio fila ${item.key}`} /></td>
										<td class="px-3 py-3">
											<select class="h-9 w-full rounded-md border bg-white px-2" value={item.destination} onchange={(event) => void setDestination(item.key, event.currentTarget.value as MenuItemImportDestination)} aria-label={`Destino fila ${item.key}`}>
												<option value="MENU_STOCK">Stock del menú</option>
												<option value="MONEY_BOX">Caja</option>
												<option value="GLOBAL_STOCK">Stock global</option>
											</select>
										</td>
										<td class="px-3 py-3">
											{#if item.destination === 'MONEY_BOX'}
												<select class="h-9 w-full rounded-md border bg-white px-2" value={item.moneyBoxId} onchange={(event) => updateItem(item.key, { moneyBoxId: event.currentTarget.value })} aria-label={`Caja fila ${item.key}`}>
													<option value="">Selecciona una caja</option>
													{#each moneyBoxes as box (box.id)}<option value={box.id}>{box.name}</option>{/each}
												</select>
											{:else if item.destination === 'GLOBAL_STOCK'}
												<input class="h-9 w-full rounded-md border px-2" type="date" value={item.expirationDate} oninput={(event) => updateItem(item.key, { expirationDate: event.currentTarget.value })} aria-label={`Caducidad fila ${item.key}`} />
											{:else}
												<span class="text-xs text-[hsl(var(--muted-foreground))]">Sin datos adicionales</span>
											{/if}
											{#if itemError(item)}<p class="mt-1 text-xs text-[hsl(var(--destructive))]">{itemError(item)}</p>{/if}
										</td>
										<td class="px-2 py-3"><Button variant="ghost" size="icon" onclick={() => removeItem(item.key)} aria-label={`Eliminar fila ${item.key}`}><Trash2 class="size-4" /></Button></td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					<div class="space-y-3 lg:hidden">
						{#each items as item (item.key)}
							<div class="space-y-3 rounded-md border p-3" data-testid={`menu-item-import-mobile-row-${item.key}`}>
								<div class="flex items-start justify-between gap-3">
									<div class="min-w-0"><p class="break-words font-medium">{item.product?.name ?? `Producto #${item.originalProductId}`}</p><p class="text-xs text-[hsl(var(--muted-foreground))]">#{item.product?.id ?? item.originalProductId}</p></div>
									<div class="flex"><Button variant="ghost" size="icon" onclick={() => editingProductKey = item.key} aria-label={`Cambiar producto móvil fila ${item.key}`}><Pencil class="size-4" /></Button><Button variant="ghost" size="icon" onclick={() => removeItem(item.key)} aria-label={`Eliminar fila móvil ${item.key}`}><Trash2 class="size-4" /></Button></div>
								</div>
								<div class="grid grid-cols-2 gap-3">
									<label class="text-sm font-medium">Cantidad<input class="mt-1 h-9 w-full rounded-md border px-2" type="number" min="0" step="any" value={item.quantity} oninput={(event) => updateItem(item.key, { quantity: event.currentTarget.value })} /></label>
									<label class="text-sm font-medium">Precio<input class="mt-1 h-9 w-full rounded-md border px-2" type="number" min="0" step="any" value={item.price} oninput={(event) => updateItem(item.key, { price: event.currentTarget.value })} /></label>
								</div>
								<label class="block text-sm font-medium">Destino<select class="mt-1 h-9 w-full rounded-md border bg-white px-2" value={item.destination} onchange={(event) => void setDestination(item.key, event.currentTarget.value as MenuItemImportDestination)}><option value="MENU_STOCK">Stock del menú</option><option value="MONEY_BOX">Caja</option><option value="GLOBAL_STOCK">Stock global</option></select></label>
								{#if item.destination === 'MONEY_BOX'}
									<label class="block text-sm font-medium">Caja<select class="mt-1 h-9 w-full rounded-md border bg-white px-2" value={item.moneyBoxId} onchange={(event) => updateItem(item.key, { moneyBoxId: event.currentTarget.value })}><option value="">Selecciona una caja</option>{#each moneyBoxes as box (box.id)}<option value={box.id}>{box.name}</option>{/each}</select></label>
								{:else if item.destination === 'GLOBAL_STOCK'}
									<label class="block text-sm font-medium">Caducidad <span class="font-normal text-[hsl(var(--muted-foreground))]">(opcional)</span><input class="mt-1 h-9 w-full rounded-md border px-2" type="date" value={item.expirationDate} oninput={(event) => updateItem(item.key, { expirationDate: event.currentTarget.value })} /></label>
								{/if}
								{#if itemError(item)}<p class="text-xs text-[hsl(var(--destructive))]">{itemError(item)}</p>{/if}
							</div>
						{/each}
					</div>

					{#if editingProductKey !== null}
						{@const editingItem = items.find((item) => item.key === editingProductKey)}
						{#if editingItem}
							<div class="rounded-md border p-4" data-testid="menu-item-import-product-editor">
								<div class="mb-3 flex items-center justify-between"><div><h3 class="text-sm font-semibold">Cambiar producto de la fila {editingItem.key}</h3><p class="text-xs text-[hsl(var(--muted-foreground))]">Busca únicamente el producto que necesitas.</p></div><Button variant="ghost" size="icon" onclick={() => editingProductKey = null} aria-label="Cerrar selector de producto"><X class="size-4" /></Button></div>
								<StockProductSearch authorization={authorization} selectedProduct={editingItem.product} onSelect={(product) => { updateItem(editingItem.key, { product, originalProductId: product.id, productError: '' }); editingProductKey = null; }} onClear={() => updateItem(editingItem.key, { product: null, productError: 'Selecciona un producto.' })} testId="menu-item-import-product-search" />
							</div>
						{/if}
					{/if}

					{#if moneyBoxesLoading}<p class="text-sm text-[hsl(var(--muted-foreground))]">Cargando cajas…</p>{/if}
					{#if moneyBoxesError}<p class="text-sm text-[hsl(var(--destructive))]" role="alert">{moneyBoxesError}</p>{/if}
					{#if submitError}<p class="text-sm text-[hsl(var(--destructive))]" role="alert">{submitError}</p>{/if}
				</div>
			{/if}
		</div>

		<footer class="flex flex-col-reverse gap-2 border-t p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
			{#if items.length > 0}
				<Button variant="secondary" onclick={() => { items = []; editingProductKey = null; submitError = ''; }} disabled={submitting}>Volver al JSON</Button>
			{:else}<span></span>{/if}
			<div class="flex justify-end gap-2">
				<Button variant="secondary" onclick={onClose} disabled={submitting}>Cancelar</Button>
				{#if items.length > 0}
					<Button onclick={submit} disabled={!canSubmit()} data-testid="menu-item-import-submit">{submitting ? 'Aplicando…' : `Aplicar ${items.length} productos`}</Button>
				{/if}
			</div>
		</footer>
	</div>
</div>
