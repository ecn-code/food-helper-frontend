<script lang="ts">
	import { Pencil, Plus, Save, Trash2, X } from '@lucide/svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { ChallengeDefinitionRequest, ChallengeResponse } from '$lib/api/challenges';
	type Props = { challenges: ChallengeResponse[]; busy?: boolean; error?: string | null; onSave: (code: string | null, values: ChallengeDefinitionRequest) => void; onDelete: (challenge: ChallengeResponse) => void; };
	let { challenges, busy = false, error = null, onSave, onDelete }: Props = $props();
	let editingCode = $state<string | null>(null);
	let draft = $state<ChallengeDefinitionRequest>(emptyDraft());
	function emptyDraft(): ChallengeDefinitionRequest { return { code: '', name: '', description: '', rewardAmount: 0, periodDays: 0 }; }
	function startCreate() { editingCode = ''; draft = emptyDraft(); }
	function startEdit(challenge: ChallengeResponse) { editingCode = challenge.code; draft = { code: challenge.code, name: challenge.name, description: challenge.description, rewardAmount: challenge.rewardAmount, periodDays: challenge.periodDays }; }
	function cancel() { editingCode = null; draft = emptyDraft(); }
	function submit() { onSave(editingCode || null, { ...draft, code: draft.code.trim().toUpperCase(), name: draft.name.trim(), description: draft.description.trim() }); }
	function handleSubmit(event: SubmitEvent) { event.preventDefault(); submit(); }
</script>
<section class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm" data-testid="challenge-definitions">
	<div class="flex items-center justify-between gap-3"><div><h3 class="text-base font-semibold">Gestionar definiciones</h3><p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Crea, edita o elimina los challenges del catálogo.</p></div>{#if editingCode === null}<Button size="sm" onclick={startCreate}><Plus class="size-4" />Nuevo challenge</Button>{/if}</div>
	{#if error}<p class="mt-3 text-sm text-[hsl(var(--destructive))]">{error}</p>{/if}
	{#if editingCode !== null}
		<form class="mt-4 grid gap-3 border-t border-[hsl(var(--border))] pt-4 md:grid-cols-2" onsubmit={handleSubmit}><label class="text-sm font-medium">Código<input required pattern="[A-Za-z0-9_]+" maxlength="80" disabled={busy || editingCode !== ''} class="mt-1 h-10 w-full rounded-md border bg-[hsl(var(--background))] px-3" bind:value={draft.code} /></label><label class="text-sm font-medium">Nombre<input required disabled={busy} class="mt-1 h-10 w-full rounded-md border bg-[hsl(var(--background))] px-3" bind:value={draft.name} /></label><label class="text-sm font-medium md:col-span-2">Descripción<textarea required disabled={busy} class="mt-1 min-h-20 w-full rounded-md border bg-[hsl(var(--background))] px-3 py-2" bind:value={draft.description}></textarea></label><div class="grid grid-cols-2 gap-3"><label class="text-sm font-medium">Recompensa (€)<input required min="0" step="0.01" type="number" disabled={busy} class="mt-1 h-10 w-full rounded-md border bg-[hsl(var(--background))] px-3" bind:value={draft.rewardAmount} /></label><label class="text-sm font-medium">Periodo (días)<input required min="0" step="1" type="number" disabled={busy} class="mt-1 h-10 w-full rounded-md border bg-[hsl(var(--background))] px-3" bind:value={draft.periodDays} /></label></div><div class="flex gap-2 md:col-span-2"><Button type="submit" size="sm" disabled={busy}><Save class="size-4" />Guardar</Button><Button type="button" size="sm" variant="secondary" disabled={busy} onclick={cancel}><X class="size-4" />Cancelar</Button></div></form>
	{/if}
	<div class="mt-4 divide-y divide-[hsl(var(--border))]">{#each challenges as challenge (challenge.code)}<div class="flex items-center justify-between gap-3 py-3"><div class="min-w-0"><p class="font-medium">{challenge.name} <span class="font-mono text-xs text-[hsl(var(--muted-foreground))]">{challenge.code}</span></p><p class="truncate text-sm text-[hsl(var(--muted-foreground))]">{challenge.rewardAmount} € · {challenge.periodDays} días</p></div><div class="flex gap-1"><Button size="icon" variant="ghost" aria-label={`Editar ${challenge.name}`} disabled={busy} onclick={() => startEdit(challenge)}><Pencil class="size-4" /></Button><Button size="icon" variant="ghost" aria-label={`Eliminar ${challenge.name}`} disabled={busy} onclick={() => onDelete(challenge)}><Trash2 class="size-4 text-[hsl(var(--destructive))]" /></Button></div></div>{/each}</div>
</section>
