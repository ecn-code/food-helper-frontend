<script lang="ts">
	import { CalendarDays, Flame, Pencil, Plus } from '@lucide/svelte';
	import type { ProposedWeekMenu, ProposedWeekMenuDay, ProposedWeekMenuDayPart } from '$lib/proposed-week-menus';
	import Button from '$lib/components/ui/Button.svelte';

	let {
		menu,
		dayParts,
		dates,
		disabled = false,
		onEditDay
	}: {
		menu: ProposedWeekMenu;
		dayParts: ProposedWeekMenuDayPart[];
		dates: string[];
		disabled?: boolean;
		onEditDay: (date: string) => void;
	} = $props();

	const daysByDate = $derived(new Map(menu.days.map((day) => [day.date, day])));
	const orderedDayParts = $derived([...dayParts].sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)));

	function dayFor(date: string) {
		return daysByDate.get(date) ?? null;
	}

	function sectionFor(day: ProposedWeekMenuDay | null, dayPartId: number) {
		return day?.sections.find((section) => section.dayPartId === dayPartId) ?? null;
	}

	function formatNumber(value: number) {
		return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(Number(value ?? 0));
	}

	function formatDay(value: string) {
		const [year, month, day] = value.split('-').map(Number);
		if (!year || !month || !day) return value;
		const formatted = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })
			.format(new Date(year, month - 1, day));
		return formatted.charAt(0).toUpperCase() + formatted.slice(1);
	}
</script>

<section class="overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]" data-testid="planning-calendar">
	<div class="flex items-center justify-between gap-3 border-b border-[hsl(var(--border))] px-4 py-3">
		<div class="min-w-0">
			<h3 class="text-base font-semibold text-[hsl(var(--foreground))]">Calendario de comidas</h3>
			<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Edita cada día directamente desde su sección.</p>
		</div>
		<CalendarDays class="size-5 shrink-0 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
	</div>

	{#if orderedDayParts.length === 0}
		<div class="p-4 text-sm text-[hsl(var(--muted-foreground))]">Configura partes del día para ver el calendario.</div>
	{:else}
		<div class="overflow-x-auto">
			<div class="min-w-max" style={`min-width: max(100%, ${200 + dates.length * 200}px);`}>
				<div class="grid border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.3)]" style={`grid-template-columns: 200px repeat(${dates.length}, minmax(200px, 1fr));`}>
					<div class="sticky left-0 z-20 border-r border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-4 py-3 text-sm font-medium text-[hsl(var(--muted-foreground))]">Parte del día</div>
					{#each dates as date (date)}
						{@const day = dayFor(date)}
						<div class="border-r border-[hsl(var(--border))] px-4 py-3 last:border-r-0">
							<p class="text-sm font-semibold capitalize text-[hsl(var(--foreground))]">{formatDay(date)}</p>
							<p class="mt-1 inline-flex items-center gap-1 text-xs font-medium tabular-nums text-amber-700" data-testid={`planning-calendar-day-calories-${date}`}>
								<Flame class="size-3.5" aria-hidden="true" /> {formatNumber(day?.nutritionalValues.calories ?? 0)} kcal
							</p>
						</div>
					{/each}
				</div>

				<div data-testid="planning-calendar-grid">
					{#each orderedDayParts as dayPart (dayPart.id)}
						<div class="grid border-b border-[hsl(var(--border))] last:border-b-0" style={`grid-template-columns: 200px repeat(${dates.length}, minmax(200px, 1fr));`}>
							<div class="sticky left-0 z-10 border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-4">
								<p class="text-sm font-medium text-[hsl(var(--foreground))]">{dayPart.name}</p>
							</div>
							{#each dates as date (date)}
								{@const day = dayFor(date)}
								{@const section = sectionFor(day, dayPart.id)}
								<div class="min-h-28 border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 last:border-r-0" data-testid={`planning-calendar-cell-${date}-${dayPart.id}`}>
									{#if section}
										<div class="flex h-full flex-col">
											<p class="text-xs font-medium tabular-nums text-amber-700">{formatNumber(section.nutritionalValues.calories)} kcal</p>
											{#if section.products.length > 0}
												<ul class="mt-2 space-y-1 text-sm text-[hsl(var(--foreground))]">
													{#each section.products as product, index (`${product.productName}-${index}`)}
														<li class="truncate">{product.productName}</li>
													{/each}
												</ul>
											{/if}
											<Button type="button" variant="ghost" size="sm" class="mt-auto self-start" onclick={() => onEditDay(date)} disabled={disabled} data-testid={`planning-calendar-edit-${date}-${dayPart.id}`}>
												<Pencil class="size-3.5" aria-hidden="true" /> Editar
											</Button>
										</div>
									{:else}
										<button type="button" class="grid h-full min-h-20 w-full place-items-center rounded-md border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.14)] px-3 text-center text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary)/0.45)] disabled:cursor-not-allowed disabled:opacity-60" onclick={() => onEditDay(date)} disabled={disabled} data-testid={`planning-calendar-add-${date}-${dayPart.id}`}>
											<span><Plus class="mx-auto mb-1 size-4" aria-hidden="true" />Añadir menú</span>
										</button>
									{/if}
								</div>
							{/each}
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</section>
