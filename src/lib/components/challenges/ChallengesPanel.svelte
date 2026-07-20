<script lang="ts">
	import { CircleAlert, CircleCheck, Clock, RefreshCw, Trophy } from '@lucide/svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { ChallengeResponse } from '$lib/api/challenges';

	type Props = {
		challenges: ChallengeResponse[];
		loaded: boolean;
		loading: boolean;
		error: string | null;
		redeemingCode?: string | null;
		onRedeem?: (challenge: ChallengeResponse) => void;
		onRetry?: () => void;
	};

	let { challenges, loaded, loading, error, redeemingCode = null, onRedeem, onRetry }: Props = $props();

	function dateLabel(value: string | null) {
		if (!value) return null;
		const date = new Date(value);
		return Number.isNaN(date.getTime())
			? value
			: new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
	}

	function rewardLabel(amount: number) {
		return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
	}
</script>

<section class="space-y-4" data-testid="challenges-panel">
	{#if error}
		<div class="flex flex-col gap-3 rounded-lg border border-[hsl(var(--destructive)/0.2)] bg-[hsl(var(--destructive)/0.04)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex min-w-0 items-start gap-2 text-sm text-[hsl(var(--destructive))]">
				<CircleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
				<span class="break-words">{error}</span>
			</div>
			{#if onRetry}
				<Button type="button" variant="secondary" size="sm" class="shrink-0" onclick={onRetry}>
					<RefreshCw class={`size-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
					Reintentar
				</Button>
			{/if}
		</div>
	{/if}

	{#if !loaded && loading}
		<div class="grid place-items-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-8 py-16 text-center shadow-sm">
			<div class="size-5 animate-spin rounded-full border-2 border-[hsl(var(--muted-foreground))] border-t-transparent" aria-hidden="true"></div>
			<h3 class="mt-4 text-sm font-semibold">Cargando challenges</h3>
		</div>
	{:else if challenges.length === 0}
		<div class="grid gap-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center shadow-sm">
			<Trophy class="mx-auto size-5 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
			<div>
				<h3 class="text-base font-semibold">No hay challenges para mostrar</h3>
				<p class="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">El backend no ha devuelto challenges para este pagador.</p>
			</div>
		</div>
	{:else}
		<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
			{#each challenges as challenge (challenge.code)}
				<article class={`rounded-lg border p-4 shadow-sm ${challenge.available ? 'border-[hsl(var(--border))] bg-[hsl(var(--card))]' : 'border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.2)]'}`}>
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<div class="flex flex-wrap items-center gap-2">
								<h3 class="text-sm font-semibold text-[hsl(var(--foreground))]">{challenge.name}</h3>
								<span class={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${challenge.available ? 'bg-emerald-600/10 text-emerald-700' : 'bg-amber-600/10 text-amber-700'}`}>
									{challenge.available ? 'Disponible' : 'En espera'}
								</span>
							</div>
							<p class="mt-2 break-words text-sm leading-6 text-[hsl(var(--muted-foreground))]">{challenge.description}</p>
						</div>
						<div class="grid size-10 shrink-0 place-items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))]">
							<Trophy class="size-4" aria-hidden="true" />
						</div>
					</div>

					<div class="mt-4 flex items-end justify-between gap-3 border-t border-[hsl(var(--border))] pt-3">
						<div class="min-w-0 text-xs text-[hsl(var(--muted-foreground))]">
							<p class="font-medium text-[hsl(var(--foreground))]">Recompensa: {rewardLabel(challenge.rewardAmount)}</p>
							<p class="mt-1">Periodo: {challenge.periodDays} días</p>
							{#if !challenge.available && dateLabel(challenge.nextAvailableAt)}
								<p class="mt-1 flex items-center gap-1"><Clock class="size-3" aria-hidden="true" />Disponible: {dateLabel(challenge.nextAvailableAt)}</p>
							{/if}
						</div>
						<Button type="button" size="sm" disabled={!challenge.available || redeemingCode !== null} onclick={() => onRedeem?.(challenge)}>
							{#if redeemingCode === challenge.code}<RefreshCw class="size-4 animate-spin" aria-hidden="true" />{:else}<CircleCheck class="size-4" aria-hidden="true" />{/if}
							Canjear
						</Button>
					</div>
				</article>
			{/each}
		</div>
	{/if}
</section>
