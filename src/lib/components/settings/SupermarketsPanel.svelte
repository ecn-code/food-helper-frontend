<script lang="ts">
	import { onMount } from 'svelte';
	import { Pencil, Plus, Save, Store, Trash2, X } from '@lucide/svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { ApiError, isSessionExpiredError } from '$lib/api/backend';
	import {
		createSupermarket,
		deleteSupermarket,
		listSupermarkets,
		updateSupermarket,
		type Supermarket
	} from '$lib/api/supermarkets';

	let { authorization }: { authorization: string } = $props();
	let items = $state<Supermarket[]>([]);
	let loaded = $state(false);
	let saving = $state(false);
	let name = $state('');
	let editingId = $state<number | null>(null);
	let message = $state('');
	let error = $state('');

	async function load() {
		try {
			items = await listSupermarkets(authorization);
		} catch (cause) {
			if (isSessionExpiredError(cause)) return;
			error = cause instanceof ApiError ? cause.message : 'No se pudieron cargar los supermercados.';
		} finally {
			loaded = true;
		}
	}

	onMount(() => void load());

	function resetForm() {
		name = '';
		editingId = null;
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!name.trim() || saving) return;
		saving = true;
		error = '';
		message = '';
		try {
			if (editingId === null) {
				items = [...items, await createSupermarket(name, authorization)].sort((a, b) => a.name.localeCompare(b.name));
				message = 'Supermercado creado.';
			} else {
				const updated = await updateSupermarket(editingId, name, authorization);
				items = items.map((item) => (item.id === updated.id ? updated : item)).sort((a, b) => a.name.localeCompare(b.name));
				message = 'Supermercado actualizado.';
			}
			resetForm();
		} catch (cause) {
			if (isSessionExpiredError(cause)) return;
			error = cause instanceof ApiError ? cause.message : 'No se pudo guardar el supermercado.';
		} finally {
			saving = false;
		}
	}

	async function remove(item: Supermarket) {
		if (!window.confirm(`Eliminar ${item.name}?`) || saving) return;
		saving = true;
		error = '';
		try {
			await deleteSupermarket(item.id, authorization);
			items = items.filter((current) => current.id !== item.id);
			if (editingId === item.id) resetForm();
			message = 'Supermercado eliminado.';
		} catch (cause) {
			if (isSessionExpiredError(cause)) return;
			error = cause instanceof ApiError ? cause.message : 'No se pudo eliminar el supermercado.';
		} finally {
			saving = false;
		}
	}
</script>

<section class="space-y-5" data-testid="supermarkets-panel">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<div class="min-w-0">
			<h2 class="text-2xl font-semibold tracking-tight">Supermercados</h2>
			<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Gestiona los comercios disponibles para productos y listas de compra.</p>
		</div>
	</div>

	<form class="flex max-w-xl flex-col gap-3 rounded-lg border bg-[hsl(var(--card))] p-4 sm:flex-row" onsubmit={submit}>
		<label class="min-w-0 flex-1 space-y-2">
			<span class="text-sm font-medium">Nombre</span>
			<input class="h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" bind:value={name} maxlength="150" required data-testid="supermarket-name" />
		</label>
		<div class="flex items-end gap-2">
			<Button type="submit" disabled={saving || !name.trim()}>
				{#if editingId === null}<Plus class="size-4" /> Añadir{:else}<Save class="size-4" /> Guardar{/if}
			</Button>
			{#if editingId !== null}<Button type="button" variant="secondary" size="icon" aria-label="Cancelar edición" onclick={resetForm}><X class="size-4" /></Button>{/if}
		</div>
	</form>

	{#if error}<p class="text-sm text-[hsl(var(--destructive))]" role="alert">{error}</p>{/if}
	{#if message}<p class="text-sm text-[hsl(var(--primary))]" role="status">{message}</p>{/if}

	<div class="overflow-hidden rounded-lg border bg-[hsl(var(--card))]">
		{#if !loaded}
			<p class="p-5 text-sm text-[hsl(var(--muted-foreground))]">Cargando supermercados…</p>
		{:else if items.length === 0}
			<div class="p-8 text-center"><Store class="mx-auto size-8 text-[hsl(var(--muted-foreground))]" /><p class="mt-3 text-sm">Todavía no hay supermercados.</p></div>
		{:else}
			<table class="w-full text-left text-sm">
				<thead class="border-b bg-[hsl(var(--muted))]"><tr><th class="px-4 py-3 font-medium">Nombre</th><th class="w-24 px-4 py-3 text-right font-medium">Acciones</th></tr></thead>
				<tbody>{#each items as item (item.id)}<tr class="border-b last:border-0 hover:bg-[hsl(var(--secondary)/0.55)]"><td class="px-4 py-3 font-medium">{item.name}</td><td class="px-4 py-2"><div class="flex justify-end gap-1"><Button type="button" variant="ghost" size="icon" aria-label={`Editar ${item.name}`} onclick={() => { editingId = item.id; name = item.name; }}><Pencil class="size-4" /></Button><Button type="button" variant="ghost" size="icon" aria-label={`Eliminar ${item.name}`} onclick={() => remove(item)}><Trash2 class="size-4" /></Button></div></td></tr>{/each}</tbody>
			</table>
		{/if}
	</div>
</section>
