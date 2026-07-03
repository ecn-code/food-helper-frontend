<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowDown, ArrowUp, PiggyBank, Plus, Trash2, UserRound, WalletCards } from '@lucide/svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { ApiError, isSessionExpiredError } from '$lib/api/backend';
	import ValidationDialog from '$lib/components/ui/ValidationDialog.svelte';
	import {
		addMoneyBoxMovement,
		createManualMoneyBox,
		deleteMoneyBox,
		deleteMoneyBoxMovement,
		listMoneyBoxes,
		type MoneyBox,
		type MoneyBoxMovement
	} from '$lib/api/money-box';

	let { authorization, userId, reloadToken = 0 }: { authorization: string; userId: number; reloadToken?: number } = $props();
	let boxes = $state<MoneyBox[]>([]);
	let selectedId = $state<number | null>(null);
	let loaded = $state(false);
	let newBoxName = $state('');
	let amount = $state('');
	let description = $state('');
	let creating = $state(false);
	let savingMovement = $state(false);
	let deleting = $state(false);
	let deletingMovementId = $state<number | null>(null);
	let error = $state('');
	let message = $state('');
	let validationDialog = $state<{ title: string; message: string; items: string[] } | null>(null);
	let initialized = $state(false);
	let selectedBox = $derived(boxes.find((box) => box.id === selectedId) ?? null);

	async function load() {
		error = '';
		try {
			boxes = await listMoneyBoxes(authorization);
			if (!boxes.some((box) => box.id === selectedId)) {
				selectedId = boxes.find((box) => box.userId === userId)?.id ?? boxes[0]?.id ?? null;
			}
		} catch (cause) {
			if (isSessionExpiredError(cause)) return;
			error = cause instanceof ApiError ? cause.message : 'No se pudieron cargar las huchas.';
		} finally {
			loaded = true;
		}
	}

	onMount(() => void load());
	$effect(() => {
		reloadToken;
		if (initialized) {
			void load();
		}
		initialized = true;
	});

	async function createBox(event: SubmitEvent) {
		event.preventDefault();
		validationDialog = null;
		if (creating) return;
		if (!newBoxName.trim()) {
			error = 'Escribe un nombre para la hucha.';
			message = '';
			validationDialog = {
				title: 'No se pudo crear la hucha',
				message: 'Corrige este campo antes de continuar.',
				items: ['Nombre: escribe un nombre para la hucha.']
			};
			return;
		}

		creating = true;
		error = '';
		message = '';
		try {
			const created = await createManualMoneyBox(newBoxName, authorization);
			boxes = [...boxes, created];
			selectedId = created.id;
			newBoxName = '';
			message = 'Hucha creada.';
		} catch (cause) {
			if (isSessionExpiredError(cause)) return;
			error = cause instanceof ApiError ? cause.message : 'No se pudo crear la hucha.';
		} finally {
			creating = false;
		}
	}

	async function addMovement(event: SubmitEvent) {
		event.preventDefault();
		validationDialog = null;
		const parsed = Number(amount);
		if (!selectedBox || savingMovement) return;
		if (!Number.isFinite(parsed) || parsed === 0) {
			error = 'Introduce una cantidad distinta de cero.';
			validationDialog = {
				title: 'No se pudo registrar el movimiento',
				message: 'Corrige este campo antes de continuar.',
				items: ['Cantidad: introduce un valor distinto de cero.']
			};
			return;
		}

		savingMovement = true;
		error = '';
		message = '';
		try {
			const movement = await addMoneyBoxMovement(selectedBox.id, { amount: parsed, description }, authorization);
			boxes = boxes.map((box) =>
				box.id === selectedBox?.id
					? { ...box, balance: box.balance + movement.amount, movements: [movement, ...box.movements] }
					: box
			);
			amount = '';
			description = '';
			message = 'Movimiento registrado.';
		} catch (cause) {
			if (isSessionExpiredError(cause)) return;
			error = cause instanceof ApiError ? cause.message : 'No se pudo registrar el movimiento.';
		} finally {
			savingMovement = false;
		}
	}

	async function removeBox(box: MoneyBox) {
		if (deleting) return;
		if (!window.confirm(`¿Eliminar la hucha «${box.name}» y todos sus movimientos?`)) return;

		deleting = true;
		error = '';
		message = '';
		try {
			await deleteMoneyBox(box.id, authorization);
			const remaining = boxes.filter((current) => current.id !== box.id);
			boxes = remaining;
			if (selectedId === box.id) {
				selectedId = remaining.find((current) => current.userId === userId)?.id ?? remaining[0]?.id ?? null;
				amount = '';
				description = '';
			}
			message = 'Hucha eliminada.';
		} catch (cause) {
			if (isSessionExpiredError(cause)) return;
			error = cause instanceof ApiError ? cause.message : 'No se pudo eliminar la hucha.';
		} finally {
			deleting = false;
		}
	}

	async function removeMovement(boxId: number, movement: MoneyBoxMovement) {
		if (movement.menuId !== null || deletingMovementId !== null) return;
		const label = movement.description || money(movement.amount);
		if (!window.confirm(`¿Eliminar el movimiento «${label}»?`)) return;

		deletingMovementId = movement.id;
		error = '';
		message = '';
		try {
			await deleteMoneyBoxMovement(boxId, movement.id, authorization);
			boxes = boxes.map((box) =>
				box.id === boxId
					? {
							...box,
							balance: box.balance - movement.amount,
							movements: box.movements.filter((current) => current.id !== movement.id)
						}
					: box
			);
			message = 'Movimiento eliminado.';
		} catch (cause) {
			if (isSessionExpiredError(cause)) return;
			error = cause instanceof ApiError ? cause.message : 'No se pudo eliminar el movimiento.';
		} finally {
			deletingMovementId = null;
		}
	}

	function selectBox(id: number) {
		selectedId = id;
		error = '';
		message = '';
		amount = '';
		description = '';
	}

	function money(value: number) {
		return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
	}

	function date(value: string) {
		return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
	}
</script>

<section class="space-y-5" data-testid="money-box-panel">
	<div class="min-w-0">
		<h2 class="text-2xl font-semibold tracking-tight">Huchas</h2>
		<p class="mt-1 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
			Consulta las huchas personales y compartidas, y registra sus ingresos o gastos.
		</p>
	</div>

	<form class="flex max-w-xl flex-col gap-3 rounded-lg border bg-[hsl(var(--card))] p-4 sm:flex-row" onsubmit={createBox} novalidate>
		<label class="min-w-0 flex-1 space-y-2">
			<span class="text-sm font-medium">Nueva hucha compartida</span>
			<input
				class="h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
				bind:value={newBoxName}
				maxlength="150"
				placeholder="Caja de casa"
				required
				data-testid="money-box-name"
			/>
		</label>
		<div class="flex items-end">
			<Button type="submit" disabled={creating}>
				<Plus class="size-4" aria-hidden="true" /> Crear hucha
			</Button>
		</div>
	</form>

	{#if error}<p class="text-sm text-[hsl(var(--destructive))]" role="alert">{error}</p>{/if}
	{#if message}<p class="text-sm text-[hsl(var(--primary))]" role="status">{message}</p>{/if}
	<ValidationDialog
		open={validationDialog !== null}
		title={validationDialog?.title ?? 'Validación pendiente'}
		message={validationDialog?.message ?? 'Revisa el formulario antes de continuar.'}
		items={validationDialog?.items ?? []}
		onClose={() => (validationDialog = null)}
	/>

	<div class="grid min-w-0 gap-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
		<div class="overflow-hidden rounded-lg border bg-[hsl(var(--card))]">
			<div class="flex items-center gap-2 border-b px-4 py-3">
				<WalletCards class="size-4 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
				<h3 class="text-sm font-semibold">Todas las huchas</h3>
			</div>
			{#if !loaded}
				<p class="p-5 text-sm text-[hsl(var(--muted-foreground))]">Cargando huchas…</p>
			{:else if boxes.length === 0}
				<div class="p-6 text-center">
					<PiggyBank class="mx-auto size-8 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
					<p class="mt-3 text-sm">Todavía no hay huchas.</p>
				</div>
			{:else}
				<div class="divide-y">
					{#each boxes as box (box.id)}
						<button
							type="button"
							class={`flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[hsl(var(--secondary)/0.55)] ${selectedId === box.id ? 'bg-[hsl(var(--secondary))]' : ''}`}
							onclick={() => selectBox(box.id)}
							aria-pressed={selectedId === box.id}
							data-testid={`money-box-${box.id}`}
						>
							{#if box.type === 'USER'}
								<UserRound class="size-4 shrink-0 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
							{:else}
								<PiggyBank class="size-4 shrink-0 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
							{/if}
							<span class="min-w-0 flex-1">
								<span class="block truncate text-sm font-medium">{box.name}</span>
								<span class="block text-xs text-[hsl(var(--muted-foreground))]">{box.type === 'USER' ? 'Personal' : 'Compartida'}</span>
							</span>
							<span class="shrink-0 text-sm font-semibold tabular-nums">{money(box.balance)}</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		{#if selectedBox}
			<div class="min-w-0 space-y-4">
				<div class="rounded-lg border bg-[hsl(var(--card))] p-5">
					<div class="flex min-w-0 items-start justify-between gap-4">
						<div class="min-w-0">
							<p class="truncate text-sm font-medium">{selectedBox.name}</p>
							<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
								{selectedBox.type === 'USER' ? `Hucha personal de ${selectedBox.username ?? selectedBox.name}` : 'Hucha compartida'}
							</p>
						</div>
						<div class="flex items-center gap-2">
							{#if selectedBox.type === 'USER'}
								<UserRound class="size-5 shrink-0 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
							{:else}
								<PiggyBank class="size-5 shrink-0 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
							{/if}
							<Button
								type="button"
								variant="danger"
								size="sm"
								disabled={deleting}
								onclick={() => removeBox(selectedBox)}
								data-testid="money-box-delete"
							>
								<Trash2 class="size-4" aria-hidden="true" /> {deleting ? 'Eliminando…' : 'Eliminar'}
							</Button>
						</div>
					</div>
					<p class="mt-3 text-3xl font-semibold tabular-nums" data-testid="money-box-balance">{money(selectedBox.balance)}</p>
					<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Saldo disponible</p>
				</div>

				<form class="grid gap-3 rounded-lg border bg-[hsl(var(--card))] p-4 md:grid-cols-[10rem_minmax(0,1fr)_auto] md:items-end" onsubmit={addMovement}>
					<label class="min-w-0 space-y-2">
						<span class="text-sm font-medium">Cantidad</span>
						<input class="h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" type="number" step="0.01" bind:value={amount} placeholder="+50 o -12,50" required data-testid="money-movement-amount" />
					</label>
					<label class="min-w-0 space-y-2">
						<span class="text-sm font-medium">Descripción</span>
						<input class="h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" bind:value={description} placeholder="Compra semanal" data-testid="money-movement-description" />
					</label>
					<Button type="submit" disabled={savingMovement} data-testid="money-movement-submit">
						<Plus class="size-4" aria-hidden="true" /> Registrar
					</Button>
				</form>

				<div class="overflow-hidden rounded-lg border bg-[hsl(var(--card))]">
					<div class="border-b px-4 py-3"><h3 class="text-sm font-semibold">Movimientos</h3></div>
					{#if selectedBox.movements.length === 0}
						<p class="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">No hay movimientos registrados.</p>
					{:else}
						<ul class="divide-y">
							{#each selectedBox.movements as movement (movement.id)}
								<li class="flex min-w-0 items-center gap-3 px-4 py-3">
									{#if movement.amount >= 0}<ArrowUp class="size-4 shrink-0 text-[hsl(var(--primary))]" aria-hidden="true" />{:else}<ArrowDown class="size-4 shrink-0 text-[hsl(var(--destructive))]" aria-hidden="true" />{/if}
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-medium">{movement.description || (movement.menuId ? `Menú #${movement.menuId}` : 'Movimiento manual')}</p>
										<p class="text-xs text-[hsl(var(--muted-foreground))]">{date(movement.createdAt)}</p>
									</div>
									<span class={`shrink-0 text-sm font-semibold tabular-nums ${movement.amount < 0 ? 'text-[hsl(var(--destructive))]' : ''}`}>{money(movement.amount)}</span>
									{#if movement.menuId === null}
										<Button
											type="button"
											variant="ghost"
											size="icon"
											disabled={deletingMovementId !== null}
											onclick={() => removeMovement(selectedBox.id, movement)}
											aria-label={`Eliminar movimiento ${movement.description || movement.id}`}
											data-testid={`money-movement-delete-${movement.id}`}
										>
											<Trash2 class="size-4" aria-hidden="true" />
										</Button>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</section>
