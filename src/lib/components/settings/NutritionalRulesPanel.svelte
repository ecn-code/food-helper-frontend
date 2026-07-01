<script lang="ts">
	import { onMount } from 'svelte';
	import { Save } from '@lucide/svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { ApiError, isSessionExpiredError } from '$lib/api/backend';
	import {
		getNutritionalRules,
		saveNutritionalRules,
		type NutritionalRuleSet,
		type NutritionalRules
	} from '$lib/api/nutritional-rules';
	import { nutritionalMetricFields } from '$lib/components/planning/nutritional-evaluation';

	let { authorization }: { authorization: string } = $props();

	type DraftScope = Record<keyof NutritionalRuleSet, { minimum: string; maximum: string }>;
	type Draft = Record<keyof NutritionalRules, DraftScope>;

	const emptyScope = (): DraftScope => ({
		calories: { minimum: '', maximum: '' },
		carbohydrates: { minimum: '', maximum: '' },
		proteins: { minimum: '', maximum: '' },
		fats: { minimum: '', maximum: '' }
	});

	const emptyRuleSet = (): NutritionalRuleSet => ({
		calories: { minimum: null, maximum: null },
		carbohydrates: { minimum: null, maximum: null },
		proteins: { minimum: null, maximum: null },
		fats: { minimum: null, maximum: null }
	});

	const empty = (): Draft => ({
		daily: emptyScope(),
		weekly: emptyScope()
	});

	const scopes: { key: keyof NutritionalRules; title: string; description: string }[] = [
		{
			key: 'daily',
			title: 'Reglas diarias',
			description: 'Límites por día que se aplican a cada menú diario.'
		},
		{
			key: 'weekly',
			title: 'Reglas semanales',
			description: 'Límites sobre la media diaria de la planificación semanal.'
		}
	];

	let draft = $state<Draft>(empty());
	let loaded = $state(false);
	let saving = $state(false);
	let error = $state('');
	let message = $state('');

	function setValues(values: NutritionalRules) {
		for (const scope of scopes) {
			for (const field of nutritionalMetricFields) {
				draft[scope.key][field.key] = {
					minimum: values[scope.key][field.key].minimum?.toString() ?? '',
					maximum: values[scope.key][field.key].maximum?.toString() ?? ''
				};
			}
		}
	}

	onMount(() =>
		void (async () => {
			try {
				setValues(await getNutritionalRules(authorization));
			} catch (cause) {
				if (isSessionExpiredError(cause)) return;
				error = cause instanceof ApiError ? cause.message : 'No se pudieron cargar las reglas.';
			} finally {
				loaded = true;
			}
		})()
	);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		error = '';
		message = '';

		const payload: NutritionalRules = {
			daily: emptyRuleSet(),
			weekly: emptyRuleSet()
		};

		for (const scope of scopes) {
			for (const field of nutritionalMetricFields) {
				const minimum = draft[scope.key][field.key].minimum === '' ? null : Number(draft[scope.key][field.key].minimum);
				const maximum = draft[scope.key][field.key].maximum === '' ? null : Number(draft[scope.key][field.key].maximum);

				if (
					(minimum !== null && minimum < 0) ||
					(maximum !== null && maximum < 0) ||
					(minimum !== null && maximum !== null && minimum > maximum)
				) {
					error = `Revisa los límites de ${field.label.toLowerCase()} en ${scope.title.toLowerCase()}.`;
					saving = false;
					return;
				}

				payload[scope.key][field.key] = { minimum, maximum };
			}
		}

		try {
			setValues(await saveNutritionalRules(payload, authorization));
			message = 'Reglas nutricionales guardadas.';
		} catch (cause) {
			if (isSessionExpiredError(cause)) return;
			error = cause instanceof ApiError ? cause.message : 'No se pudieron guardar las reglas.';
		} finally {
			saving = false;
		}
	}
</script>

<section class="space-y-5" data-testid="nutritional-rules-panel">
	<div class="flex items-start justify-between gap-4">
		<div class="min-w-0">
			<h2 class="text-2xl font-semibold tracking-tight">Reglas nutricionales</h2>
			<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
				Define límites diarios y semanales para cada nutriente.
			</p>
		</div>

		{#if loaded}
			<Button type="submit" form="nutritional-rules-form" disabled={saving} class="shrink-0">
				<Save class="size-4" />
				Guardar reglas
			</Button>
		{/if}
	</div>

	{#if !loaded}
		<p class="text-sm text-[hsl(var(--muted-foreground))]">Cargando reglas…</p>
	{:else}
		<form id="nutritional-rules-form" class="space-y-5" onsubmit={submit}>
			{#each scopes as scope}
				<section class="overflow-hidden rounded-lg border bg-[hsl(var(--card))]">
					<div class="border-b bg-[hsl(var(--muted))] px-4 py-3">
						<h3 class="text-sm font-semibold text-[hsl(var(--foreground))]">{scope.title}</h3>
						<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{scope.description}</p>
					</div>

					<div class="hidden grid-cols-[1fr_7rem_7rem] gap-3 border-b bg-[hsl(var(--muted))] px-4 py-3 text-xs font-medium text-[hsl(var(--muted-foreground))] sm:grid">
						<span>Nutriente</span>
						<span>Mínimo</span>
						<span>Máximo</span>
					</div>

					{#each nutritionalMetricFields as field}
						<div class="grid grid-cols-2 items-end gap-3 border-b px-4 py-3 last:border-0 sm:grid-cols-[1fr_7rem_7rem] sm:items-center">
							<div class="col-span-2 min-w-0 sm:col-span-1">
								<p class="break-words text-sm font-medium">{field.label}</p>
								<p class="text-xs text-[hsl(var(--muted-foreground))]">
									{scope.key === 'daily' ? `${field.unit} al día` : `Media diaria semanal en ${field.unit}`}
								</p>
							</div>

							<label class="min-w-0">
								<span class="mb-1 block text-xs text-[hsl(var(--muted-foreground))] sm:sr-only">Mínimo</span>
								<input
									class="h-9 w-full min-w-0 rounded-md border px-2 text-sm tabular-nums"
									type="number"
									min="0"
									step="0.01"
									aria-label={`Mínimo de ${field.label} ${scope.key === 'daily' ? 'diario' : 'semanal'}`}
									bind:value={draft[scope.key][field.key].minimum}
								/>
							</label>

							<label class="min-w-0">
								<span class="mb-1 block text-xs text-[hsl(var(--muted-foreground))] sm:sr-only">Máximo</span>
								<input
									class="h-9 w-full min-w-0 rounded-md border px-2 text-sm tabular-nums"
									type="number"
									min="0"
									step="0.01"
									aria-label={`Máximo de ${field.label} ${scope.key === 'daily' ? 'diario' : 'semanal'}`}
									bind:value={draft[scope.key][field.key].maximum}
								/>
							</label>
						</div>
					{/each}
				</section>
			{/each}

			{#if error}
				<p class="text-sm text-[hsl(var(--destructive))]" role="alert">{error}</p>
			{/if}
			{#if message}
				<p class="text-sm text-[hsl(var(--primary))]" role="status">{message}</p>
			{/if}

			<div class="flex justify-end">
				<Button type="submit" disabled={saving}>
					<Save class="size-4" />
					Guardar reglas
				</Button>
			</div>
		</form>
	{/if}
</section>
