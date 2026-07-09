<script lang="ts">
	import { Download, Share2, X } from '@lucide/svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { buildShoppingListShareText, shareShoppingList, shoppingListPrimaryActionLabel } from '$lib/shopping-list-share';

	type ShoppingListItem = {
		productName: string;
		missingUnits: number;
	};

	let {
		open,
		title = 'Lista de compra',
		menuLabel,
		supermarketName,
		items,
		resetToken = 0,
		onClose
	}: {
		open: boolean;
		title?: string;
		menuLabel: string;
		supermarketName?: string;
		items: ShoppingListItem[];
		resetToken?: number;
		onClose: () => void;
	} = $props();

	let sharing = $state(false);
	let statusMessage = $state('');
	let error = $state('');
	let lastResetToken = $state<number | null>(null);

	$effect(() => {
		if (resetToken !== lastResetToken) {
			sharing = false;
			statusMessage = '';
			error = '';
			lastResetToken = resetToken;
		}
	});

	function shoppingListText() {
		return buildShoppingListShareText({
			title,
			menuLabel,
			supermarketName,
			items
		});
	}

	function downloadShoppingList() {
		const blob = new Blob([shoppingListText()], { type: 'text/plain;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `${sanitizeFileName(menuLabel)}-lista-compra.txt`;
		link.click();
		URL.revokeObjectURL(url);
	}

	async function shareList() {
		if (items.length === 0 || sharing) return;

		sharing = true;
		error = '';
		statusMessage = '';
		try {
			const result = await shareShoppingList({
				title,
				menuLabel,
				supermarketName,
				items
			});

			if (result.method === 'clipboard') {
				statusMessage = 'Lista copiada al portapapeles.';
			}
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'No se pudo compartir la lista de compra.';
		} finally {
			sharing = false;
		}
	}

	function sanitizeFileName(value: string) {
		const normalized = value
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-zA-Z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.toLowerCase();
		return normalized || 'lista-compra';
	}

	function formatUnits(value: number) {
		return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value);
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
		role="presentation"
		onclick={(event) => event.currentTarget === event.target && onClose()}
	>
		<div
			class="w-full max-w-2xl rounded-lg border bg-[hsl(var(--card))] shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="shopping-list-title"
			data-testid="shopping-list-dialog"
			tabindex="-1"
		>
			<div class="flex items-start justify-between gap-4 border-b p-5">
				<div class="min-w-0">
					<h2 id="shopping-list-title" class="text-lg font-semibold text-[hsl(var(--foreground))]">{title}</h2>
					<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
						{menuLabel} · {supermarketName || 'Todos los supermercados'} · {items.length} productos
					</p>
				</div>
				<Button variant="ghost" size="icon" type="button" onclick={onClose} aria-label="Cerrar">
					<X class="size-4" />
				</Button>
			</div>

			<div class="space-y-4 p-5">
				{#if items.length === 0}
					<p class="text-sm text-[hsl(var(--muted-foreground))]">No hay productos pendientes para esta lista.</p>
				{:else}
					<div class="max-h-[50vh] overflow-y-auto rounded-lg border">
						<table class="w-full text-sm">
							<thead class="border-b bg-[hsl(var(--muted))]">
								<tr>
									<th class="px-3 py-2 text-left font-medium">Producto</th>
									<th class="px-3 py-2 text-right font-medium">Faltan</th>
								</tr>
							</thead>
							<tbody>
								{#each items as item}
									<tr class="border-b last:border-0">
										<td class="px-3 py-2">{item.productName}</td>
										<td class="px-3 py-2 text-right tabular-nums">{formatUnits(item.missingUnits)} uds</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}

				{#if statusMessage}
					<p class="text-sm text-[hsl(var(--primary))]" role="status">{statusMessage}</p>
				{/if}
				{#if error}
					<p class="text-sm text-[hsl(var(--destructive))]" role="alert">{error}</p>
				{/if}
			</div>

			<div class="flex flex-col-reverse gap-2 border-t p-5 sm:flex-row sm:justify-end">
				<Button type="button" variant="secondary" onclick={onClose}>Cerrar</Button>
				<Button type="button" onclick={downloadShoppingList} disabled={items.length === 0}>
					<Download class="size-4" />
					Descargar lista
				</Button>
				<Button type="button" variant="secondary" onclick={shareList} disabled={items.length === 0 || sharing}>
					<Share2 class="size-4" />
					{sharing ? 'Compartiendo…' : shoppingListPrimaryActionLabel()}
				</Button>
			</div>
		</div>
	</div>
{/if}
