<script lang="ts">
	import { CalendarClock, CircleAlert, CircleCheck, Clock, Percent, RefreshCw } from '@lucide/svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { PlanningCouponResponse } from '$lib/api/planning';

	type Props = {
		coupons: PlanningCouponResponse[];
		loaded: boolean;
		loading: boolean;
		error: string | null;
		selectable?: boolean;
		selectedCodes?: string[];
		onSelectedCodesChange?: (codes: string[]) => void;
		onRetry?: () => void;
		emptyTitle?: string;
		emptyMessage?: string;
	};

	let {
		coupons,
		loaded,
		loading,
		error,
		selectable = false,
		selectedCodes = [],
		onSelectedCodesChange,
		onRetry,
		emptyTitle = 'No hay cupones disponibles',
		emptyMessage = 'Cuando el backend tenga reglas y cupones activos, aparecerán aquí con su estado y tiempos de reutilización.'
	}: Props = $props();

	type ConditionSegment =
		| {
				type: 'text';
				value: string;
		  }
		| {
				type: 'product';
				label: string;
				productId: number;
		  };

	function money(value: number) {
		return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
	}

	function formatDateTime(value: string | null) {
		if (!value) return '-';
		const parsed = new Date(value);
		if (Number.isNaN(parsed.getTime())) return '-';
		return new Intl.DateTimeFormat('es-ES', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(parsed);
	}

	function reasonLabel(reason: string) {
		if (reason === 'CONDITION_NOT_MET') return 'La planificación actual no cumple la condición';
		if (reason === 'USED_WITHIN_PERIOD') return 'Aún está en periodo de reutilización';
		return reason;
	}

	function availabilityLabel(coupon: PlanningCouponResponse) {
		if (coupon.informativeAvailabilityState === 'AVAILABLE' || coupon.available) return 'Disponible';
		if (coupon.informativeAvailabilityState === 'CONDITION_NOT_MET') return 'No cumple condiciones';
		if (coupon.informativeAvailabilityState === 'USED_RECENTLY') return 'Usado recientemente';
		if (coupon.informativeAvailabilityState === 'CONDITION_NOT_MET_AND_USED_RECENTLY') return 'Bloqueado por ambas causas';
		return coupon.available ? 'Disponible' : 'Bloqueado';
	}

	function availabilityTone(coupon: PlanningCouponResponse) {
		return coupon.available ? 'bg-emerald-600/10 text-emerald-700' : 'bg-amber-600/10 text-amber-700';
	}

	function toggleSelected(code: string, checked: boolean) {
		if (!onSelectedCodesChange) return;
		const next = checked
			? [...new Set([...selectedCodes, code])]
			: selectedCodes.filter((current) => current !== code);
		onSelectedCodesChange(next);
	}

	function conditionDescriptionSegments(description: string): ConditionSegment[] {
		const segments: ConditionSegment[] = [];
		const pattern = /product\s+(\d+)/gi;
		let lastIndex = 0;
		let match: RegExpExecArray | null;

		while ((match = pattern.exec(description)) !== null) {
			if (match.index > lastIndex) {
				segments.push({
					type: 'text',
					value: description.slice(lastIndex, match.index)
				});
			}

			segments.push({
				type: 'product',
				label: match[0].slice(0, match[0].length - match[1].length).trimEnd(),
				productId: Number(match[1])
			});
			lastIndex = pattern.lastIndex;
		}

		if (lastIndex < description.length) {
			segments.push({
				type: 'text',
				value: description.slice(lastIndex)
			});
		}

		return segments.length > 0 ? segments : [{ type: 'text', value: description }];
	}

</script>

<section class="space-y-4" data-testid="planning-coupons-panel">
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
			<div class="grid size-12 place-items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
				<div class="size-5 animate-spin rounded-full border-2 border-[hsl(var(--muted-foreground))] border-t-transparent" aria-hidden="true"></div>
			</div>
			<h3 class="mt-4 text-sm font-semibold text-[hsl(var(--foreground))]">Cargando cupones</h3>
			<p class="mt-1 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">
				Estamos consultando los cupones disponibles para este pagador y esta planificación.
			</p>
		</div>
	{:else if coupons.length === 0}
		<div class="grid gap-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center shadow-sm">
			<div class="mx-auto grid size-12 place-items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
				<Percent class="size-5 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
			</div>
			<div>
				<h3 class="text-base font-semibold text-[hsl(var(--foreground))]">{emptyTitle}</h3>
				<p class="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{emptyMessage}</p>
			</div>
		</div>
	{:else}
		<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
			{#each coupons as coupon (coupon.code)}
				<article class={`rounded-lg border p-4 shadow-sm ${coupon.available ? 'border-[hsl(var(--border))] bg-[hsl(var(--card))]' : 'border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.2)]'}`}>
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<div class="flex flex-wrap items-center gap-2">
								{#if selectable}
									<label class="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--foreground))]">
										<input
											type="checkbox"
											checked={selectedCodes.includes(coupon.code)}
											disabled={!coupon.available}
											onchange={(event) => toggleSelected(coupon.code, (event.currentTarget as HTMLInputElement).checked)}
											aria-label={`Aplicar cupón ${coupon.name}`}
										/>
										<span class="truncate">{coupon.name}</span>
									</label>
								{:else}
									<h3 class="text-sm font-semibold text-[hsl(var(--foreground))]">{coupon.name}</h3>
								{/if}
								<span class={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${availabilityTone(coupon)}`}>
									{availabilityLabel(coupon)}
								</span>
							</div>
							<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{coupon.code}</p>
							<p class="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
								{#each conditionDescriptionSegments(coupon.conditionDescription) as segment, index (index)}
									{#if segment.type === 'text'}
										{segment.value}
									{:else}
										{segment.label}
										{' '}
										<a
											href={`?productId=${segment.productId}#products`}
											class="font-medium text-[hsl(var(--primary))] underline underline-offset-2 hover:text-[hsl(var(--primary)/0.8)]"
										>
											{segment.productId}
										</a>
									{/if}
								{/each}
							</p>
						</div>
						<div class="grid size-10 shrink-0 place-items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))]">
							<Percent class="size-4" aria-hidden="true" />
						</div>
					</div>

					<dl class="mt-4 grid grid-cols-2 gap-2 text-sm">
						<div class="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5">
							<dt class="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
								<CircleCheck class="size-3.5" aria-hidden="true" />
								Recompensa
							</dt>
							<dd class="mt-1 font-medium tabular-nums">{money(coupon.rewardAmount)}</dd>
						</div>
						<div class="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5">
							<dt class="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
								<Clock class="size-3.5" aria-hidden="true" />
								Cuarentena
							</dt>
							<dd class="mt-1 font-medium tabular-nums">{coupon.periodDays} d</dd>
						</div>
						<div class="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5">
							<dt class="text-xs text-[hsl(var(--muted-foreground))]">Cumple condiciones</dt>
							<dd class="mt-1 font-medium">{coupon.conditionMet ? 'Sí' : 'No'}</dd>
						</div>
						<div class="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5">
							<dt class="text-xs text-[hsl(var(--muted-foreground))]">Uso reciente</dt>
							<dd class="mt-1 font-medium">{coupon.usedRecently ? 'Sí' : 'No'}</dd>
						</div>
						<div class="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5">
							<dt class="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
								<CalendarClock class="size-3.5" aria-hidden="true" />
								Último uso
							</dt>
							<dd class="mt-1 text-xs leading-5">{formatDateTime(coupon.lastUsedAt)}</dd>
						</div>
						<div class="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5">
							<dt class="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
								<Clock class="size-3.5" aria-hidden="true" />
								Disponible otra vez
							</dt>
							<dd class="mt-1 text-xs leading-5">{formatDateTime(coupon.nextAvailableAt)}</dd>
						</div>
					</dl>

					{#if !coupon.available}
						<div class="mt-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3">
							<p class="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Condiciones</p>
							<ul class="mt-2 space-y-1 text-sm leading-5 text-[hsl(var(--foreground))]">
								{#if coupon.unavailableReasons && coupon.unavailableReasons.length > 0}
									{#each coupon.unavailableReasons as reason}
										<li>• {reasonLabel(reason)}</li>
									{/each}
								{:else}
									<li>• No está disponible en este momento.</li>
								{/if}
							</ul>
						</div>
					{/if}
				</article>
			{/each}
		</div>
	{/if}
</section>
