<script lang="ts">
	import { onMount } from 'svelte';
	import { Save, SlidersHorizontal } from '@lucide/svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { ApiError } from '$lib/api/backend';
	import { getNutritionalRules, saveNutritionalRules, type NutritionalRules } from '$lib/api/nutritional-rules';

	let { authorization }: { authorization: string } = $props();
	type Draft = Record<keyof NutritionalRules, { minimum: string; maximum: string }>;
	const empty = (): Draft => ({ calories: { minimum: '', maximum: '' }, carbohydrates: { minimum: '', maximum: '' }, proteins: { minimum: '', maximum: '' }, fats: { minimum: '', maximum: '' } });
	let draft = $state<Draft>(empty());
	let loaded = $state(false);
	let saving = $state(false);
	let error = $state('');
	let message = $state('');
	const fields: { key: keyof NutritionalRules; label: string; unit: string }[] = [
		{ key: 'calories', label: 'Calorías', unit: 'kcal' }, { key: 'carbohydrates', label: 'Carbohidratos', unit: 'g' },
		{ key: 'proteins', label: 'Proteínas', unit: 'g' }, { key: 'fats', label: 'Grasas', unit: 'g' }
	];

	function setValues(values: NutritionalRules) {
		for (const field of fields) draft[field.key] = { minimum: values[field.key].minimum?.toString() ?? '', maximum: values[field.key].maximum?.toString() ?? '' };
	}
	onMount(() => void (async () => { try { setValues(await getNutritionalRules(authorization)); } catch (cause) { error = cause instanceof ApiError ? cause.message : 'No se pudieron cargar las reglas.'; } finally { loaded = true; } })());

	async function submit(event: SubmitEvent) {
		event.preventDefault(); saving = true; error = ''; message = '';
		const payload = {} as NutritionalRules;
		for (const field of fields) {
			const minimum = draft[field.key].minimum === '' ? null : Number(draft[field.key].minimum);
			const maximum = draft[field.key].maximum === '' ? null : Number(draft[field.key].maximum);
			if ((minimum !== null && minimum < 0) || (maximum !== null && maximum < 0) || (minimum !== null && maximum !== null && minimum > maximum)) { error = `Revisa los límites de ${field.label.toLowerCase()}.`; saving = false; return; }
			payload[field.key] = { minimum, maximum };
		}
		try { setValues(await saveNutritionalRules(payload, authorization)); message = 'Reglas nutricionales guardadas.'; }
		catch (cause) { error = cause instanceof ApiError ? cause.message : 'No se pudieron guardar las reglas.'; }
		finally { saving = false; }
	}
</script>

<section class="space-y-5" data-testid="nutritional-rules-panel">
	<div><h2 class="text-2xl font-semibold tracking-tight">Reglas nutricionales</h2><p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Define los límites diarios que se evaluarán durante la planificación.</p></div>
	{#if !loaded}<p class="text-sm text-[hsl(var(--muted-foreground))]">Cargando reglas…</p>{:else}
	<form class="space-y-4" onsubmit={submit}>
		<div class="overflow-hidden rounded-lg border bg-[hsl(var(--card))]"><div class="hidden grid-cols-[1fr_7rem_7rem] gap-3 border-b bg-[hsl(var(--muted))] px-4 py-3 text-xs font-medium text-[hsl(var(--muted-foreground))] sm:grid"><span>Nutriente</span><span>Mínimo</span><span>Máximo</span></div>{#each fields as field}<div class="grid grid-cols-2 items-end gap-3 border-b px-4 py-3 last:border-0 sm:grid-cols-[1fr_7rem_7rem] sm:items-center"><div class="col-span-2 min-w-0 sm:col-span-1"><p class="break-words text-sm font-medium">{field.label}</p><p class="text-xs text-[hsl(var(--muted-foreground))]">{field.unit} al día</p></div><label class="min-w-0"><span class="mb-1 block text-xs text-[hsl(var(--muted-foreground))] sm:sr-only">Mínimo</span><input class="h-9 w-full min-w-0 rounded-md border px-2 text-sm tabular-nums" type="number" min="0" step="0.01" aria-label={`Mínimo de ${field.label}`} bind:value={draft[field.key].minimum} /></label><label class="min-w-0"><span class="mb-1 block text-xs text-[hsl(var(--muted-foreground))] sm:sr-only">Máximo</span><input class="h-9 w-full min-w-0 rounded-md border px-2 text-sm tabular-nums" type="number" min="0" step="0.01" aria-label={`Máximo de ${field.label}`} bind:value={draft[field.key].maximum} /></label></div>{/each}</div>
		{#if error}<p class="text-sm text-[hsl(var(--destructive))]" role="alert">{error}</p>{/if}{#if message}<p class="text-sm text-[hsl(var(--primary))]" role="status">{message}</p>{/if}
		<Button type="submit" disabled={saving}><Save class="size-4" /> Guardar reglas</Button>
	</form>{/if}
</section>
