<script lang="ts">
	import { CalendarDays, CalendarRange, Flame, LayoutList, Pencil, Trash2, Utensils } from '@lucide/svelte';
	import type { EstablishedWeekMenu } from '$lib/established-week-menus';
	import Button from '$lib/components/ui/Button.svelte';
	import MetricCard from '$lib/components/ui/MetricCard.svelte';

	type FilterMode = 'menu' | 'dates';
	type ViewMode = 'table' | 'calendar';
	type MenuStatsCard = {
		label: string;
		value: string;
		hint: string;
		tone: 'default' | 'primary' | 'accent';
	};
	type MealRow = {
		key: string;
		date: string;
		dayPartId: number;
		dayPart: string;
		products: string[];
		sortOrder: number;
		menuId: number;
		menuLabel: string;
	};
	type CalendarGroup = {
		key: string;
		products: string[];
	};
	type CalendarCell = {
		key: string;
		date: string;
		dayPartId: number;
		dayPart: string;
		groups: CalendarGroup[];
	};

	let {
		menus,
		loaded,
		onEditMenu = null,
		onDeleteMenu = null,
		selectedMenuId: selectedMenuIdProp = null,
		onSelectMenu = null
	}: {
		menus: EstablishedWeekMenu[];
		loaded: boolean;
		onEditMenu?: ((menu: EstablishedWeekMenu) => void | Promise<void>) | null;
		onDeleteMenu?: ((menu: EstablishedWeekMenu) => void | Promise<void>) | null;
		selectedMenuId?: number | null;
		onSelectMenu?: ((menuId: number) => void | Promise<void>) | null;
	} = $props();

	let filterMode = $state<FilterMode>('menu');
	let viewMode = $state<ViewMode>('table');
	let selectedMenuId = $state('');
	let dateFrom = $state('');
	let dateTo = $state('');

	const orderedMenus = $derived(
		[...menus].sort((left, right) => right.startDate.localeCompare(left.startDate) || right.id - left.id)
	);
	const selectedMenu = $derived(
		orderedMenus.find((menu) => String(menu.id) === selectedMenuId) ?? null
	);
	const selectedMenuState = $derived(selectedMenu?.state ?? null);
	const rows = $derived(buildRows(orderedMenus, filterMode, selectedMenuId, dateFrom, dateTo));
	const calendarDates = $derived(buildCalendarDates(rows, filterMode, selectedMenu, dateFrom, dateTo));
	const calendarDayParts = $derived(buildCalendarDayParts(rows, filterMode, selectedMenu));
	const calendarCells = $derived(buildCalendarCells(rows));
	const statsCards = $derived(buildStatsCards(filterMode, selectedMenu, orderedMenus, dateFrom, dateTo));
	const statsSummaryLabel = $derived(buildStatsSummaryLabel(filterMode, selectedMenu, dateFrom, dateTo));

	$effect(() => {
		if (orderedMenus.length === 0) {
			selectedMenuId = '';
			return;
		}

		if (selectedMenuIdProp !== null && selectedMenuIdProp > 0) {
			const normalizedSelectedMenuId = String(selectedMenuIdProp);
			if (selectedMenuId !== normalizedSelectedMenuId) {
				selectedMenuId = normalizedSelectedMenuId;
			}
		} else if (filterMode === 'menu' && !selectedMenuId) {
			selectedMenuId = String(orderedMenus[0].id);
		}

		if (!dateFrom && !dateTo) {
			dateFrom = orderedMenus[0].startDate;
			dateTo = orderedMenus[0].endDate;
		}
	});

	function buildRows(
		availableMenus: EstablishedWeekMenu[],
		mode: FilterMode,
		menuId: string,
		from: string,
		to: string
	): MealRow[] {
		const filteredMenus =
			mode === 'menu'
				? availableMenus.filter((menu) => String(menu.id) === menuId)
				: availableMenus;

		return filteredMenus
			.flatMap((menu) =>
				menu.days.flatMap((day) =>
					day.sections.map((section) => ({
						key: `${menu.id}-${day.id}-${section.id}`,
						date: day.date,
						dayPartId: section.dayPartId,
						dayPart: section.name,
						products: section.products.map((product) => product.productName),
						sortOrder: section.sortOrder,
						menuId: menu.id,
						menuLabel: menuLabel(menu)
					}))
				)
			)
			.filter((row) => mode === 'menu' || ((!from || row.date >= from) && (!to || row.date <= to)))
			.sort(
				(left, right) =>
					left.date.localeCompare(right.date) ||
					left.sortOrder - right.sortOrder ||
					left.menuId - right.menuId ||
					left.key.localeCompare(right.key)
			);
	}

	function buildCalendarDates(
		currentRows: MealRow[],
		mode: FilterMode,
		selectedMenuValue: EstablishedWeekMenu | null,
		from: string,
		to: string
	) {
		if (mode === 'menu' && selectedMenuValue) {
			return weekDaysBetween(selectedMenuValue.startDate, selectedMenuValue.endDate);
		}

		if (from && to) {
			const dates = weekDaysBetween(from, to);
			if (dates.length > 0) return dates;
		}

		return [...new Set(currentRows.map((row) => row.date))].sort((left, right) => left.localeCompare(right));
	}

	function buildCalendarDayParts(currentRows: MealRow[], mode: FilterMode, selectedMenuValue: EstablishedWeekMenu | null) {
		const sourceRows =
			mode === 'menu' && selectedMenuValue
				? selectedMenuValue.days.flatMap((day) =>
						day.sections.map((section) => ({
							dayPartId: section.dayPartId,
							dayPart: section.name,
							sortOrder: section.sortOrder
						}))
					)
				: currentRows.map((row) => ({
						dayPartId: row.dayPartId,
						dayPart: row.dayPart,
						sortOrder: row.sortOrder
					}));

		return [...new Map(sourceRows.map((row) => [row.dayPartId, row])).values()].sort(
			(left, right) => left.sortOrder - right.sortOrder || left.dayPart.localeCompare(right.dayPart)
		);
	}

	function buildCalendarCells(currentRows: MealRow[]) {
		const cells = new Map<string, CalendarCell>();

		for (const row of currentRows) {
			const key = `${row.date}-${row.dayPartId}`;
			const cell = cells.get(key) ?? {
				key,
				date: row.date,
				dayPartId: row.dayPartId,
				dayPart: row.dayPart,
				groups: []
			};

			cell.groups.push({
				key: row.key,
				products: row.products
			});
			cells.set(key, cell);
		}

		return cells;
	}

	function buildStatsCards(
		mode: FilterMode,
		selectedMenuValue: EstablishedWeekMenu | null,
		availableMenus: EstablishedWeekMenu[],
		from: string,
		to: string
	): MenuStatsCard[] {
		if (mode === 'menu') {
			if (!selectedMenuValue) return [];

			return [
				{
					label: 'Días planificados',
					value: String(selectedMenuValue.stockSummary.plannedDays),
					hint: 'Días ya guardados',
					tone: 'default'
				},
				{
					label: 'Calorías',
					value: formatNumber(selectedMenuValue.nutritionalValues.calories),
					hint: 'Total del menú',
					tone: 'primary'
				},
				{
					label: 'Productos distintos',
					value: String(selectedMenuValue.stockSummary.distinctProducts),
					hint: 'Variedad de productos',
					tone: 'accent'
				},
				{
					label: 'Coste estimado',
					value: formatCurrency(selectedMenuValue.stockSummary.estimatedCost),
					hint: 'Stock aplicado y coste real',
					tone: 'default'
				}
			];
		}

		const stats = aggregateRangeStats(availableMenus, from, to);
		return [
			{
				label: 'Días visibles',
				value: String(stats.plannedDays),
				hint: stats.rangeLabel,
				tone: 'default'
			},
			{
				label: 'Calorías',
				value: formatNumber(stats.calories),
				hint: 'Suma de los días filtrados',
				tone: 'primary'
			},
			{
				label: 'Productos distintos',
				value: String(stats.distinctProducts),
				hint: 'Productos únicos del rango',
				tone: 'accent'
			},
			{
				label: 'Coste estimado',
				value: formatCurrency(stats.estimatedCost),
				hint: 'Estimación proporcional al rango',
				tone: 'default'
			}
		];
	}

	function aggregateRangeStats(availableMenus: EstablishedWeekMenu[], from: string, to: string) {
		let plannedDays = 0;
		let calories = 0;
		let estimatedCost = 0;
		const productIds = new Set<string>();
		const dates = new Set<string>();

		for (const menu of availableMenus) {
			const includedDays = menu.days.filter((day) => isDateWithinRange(day.date, from, to));
			if (includedDays.length === 0) continue;

			plannedDays += includedDays.length;
			calories += includedDays.reduce((sum, day) => sum + Number(day.nutritionalValues.calories ?? 0), 0);
			estimatedCost += Number(menu.stockSummary.estimatedCost ?? 0) * (includedDays.length / Math.max(menu.days.length, 1));

			for (const day of includedDays) {
				dates.add(day.date);
				for (const section of day.sections) {
					for (const product of section.products) {
						const key = product.productId === null ? `name:${product.productName}` : `id:${product.productId}`;
						productIds.add(key);
					}
				}
			}
		}

		const sortedDates = [...dates].sort((left, right) => left.localeCompare(right));
		const lastDate = sortedDates[sortedDates.length - 1] ?? sortedDates[0];
		const rangeLabel =
			sortedDates.length === 0
				? 'Sin días en el rango seleccionado'
				: sortedDates.length === 1
					? `Día filtrado: ${formatShortDate(sortedDates[0])}`
					: `Rango filtrado: ${formatShortDate(sortedDates[0])} – ${formatShortDate(lastDate)}`;

		return {
			plannedDays,
			calories,
			distinctProducts: productIds.size,
			estimatedCost,
			rangeLabel
		};
	}

	function isDateWithinRange(date: string, from: string, to: string) {
		if (from && date < from) return false;
		if (to && date > to) return false;
		return true;
	}

	function buildStatsSummaryLabel(mode: FilterMode, selectedMenuValue: EstablishedWeekMenu | null, from: string, to: string) {
		if (mode === 'menu') {
			if (!selectedMenuValue) return 'Sin menú seleccionado';
			return `Menú #${selectedMenuValue.id} · ${menuLabel(selectedMenuValue)}`;
		}

		if (from && to) {
			return `Rango ${formatShortDate(from)} – ${formatShortDate(to)}`;
		}

		if (from) return `Desde ${formatShortDate(from)}`;
		if (to) return `Hasta ${formatShortDate(to)}`;
		return 'Rango de fechas';
	}

	function menuLabel(menu: EstablishedWeekMenu) {
		return `${formatShortDate(menu.startDate)} – ${formatShortDate(menu.endDate)}`;
	}

	function formatNumber(value: number) {
		return new Intl.NumberFormat('es-ES', {
			maximumFractionDigits: 2
		}).format(Number(value ?? 0));
	}

	function formatCurrency(value: number) {
		return new Intl.NumberFormat('es-ES', {
			style: 'currency',
			currency: 'EUR',
			maximumFractionDigits: 2
		}).format(Number(value ?? 0));
	}

	function formatShortDate(value: string) {
		const [year, month, day] = value.split('-').map(Number);
		if (!year || !month || !day) return value;
		return new Intl.DateTimeFormat('es-ES', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		}).format(new Date(year, month - 1, day));
	}

	function formatDay(value: string) {
		const [year, month, day] = value.split('-').map(Number);
		if (!year || !month || !day) return value;
		const formatted = new Intl.DateTimeFormat('es-ES', {
			weekday: 'long',
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		}).format(new Date(year, month - 1, day));
		return formatted.charAt(0).toUpperCase() + formatted.slice(1);
	}

	function weekDaysBetween(startDate: string, endDate: string) {
		const start = parseDateInput(startDate);
		const end = parseDateInput(endDate);
		if (!start || !end) return [];

		const days: string[] = [];
		const current = new Date(start.getTime());
		while (current.getTime() <= end.getTime()) {
			days.push(toDateInputValue(current));
			current.setUTCDate(current.getUTCDate() + 1);
		}
		return days;
	}

	function parseDateInput(value: string) {
		if (!value) return null;
		const parts = value.split('-').map((entry) => Number(entry));
		if (parts.length !== 3 || parts.some((entry) => Number.isNaN(entry))) return null;
		const [year, month, day] = parts;
		return new Date(Date.UTC(year, month - 1, day));
	}

	function toDateInputValue(date: Date) {
		return date.toISOString().slice(0, 10);
	}

	function handleMenuSelection(event: Event) {
		const nextMenuId = Number((event.currentTarget as HTMLSelectElement | null)?.value ?? '');
		if (Number.isNaN(nextMenuId) || nextMenuId <= 0) {
			selectedMenuId = '';
			return;
		}

		selectedMenuId = String(nextMenuId);
		void onSelectMenu?.(nextMenuId);
	}
</script>

<section class="space-y-4" data-testid="menu-meals-table">
	<div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
		<div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
			<div class="min-w-0 space-y-3">
				<div>
					<h3 class="text-base font-semibold text-[hsl(var(--foreground))]">Filtrar comidas</h3>
					<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
						Consulta un período completo o acota el historial por fechas.
					</p>
				</div>
				<div class="flex flex-wrap items-center gap-2">
					<span class="inline-flex w-fit items-center gap-1.5 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] px-2 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))]">
						<Utensils class="size-3.5" aria-hidden="true" />
						{statsSummaryLabel}
					</span>
					{#if selectedMenu && filterMode === 'menu'}
						<span class="inline-flex w-fit items-center gap-1.5 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))]" data-testid="menu-selected-week">
							<CalendarDays class="size-3.5" aria-hidden="true" />
							{selectedMenu.days.length} días · {selectedMenu.stockSummary.plannedDays} planificados · {rows.length} secciones
						</span>
						{#if selectedMenuState}
							<span class="inline-flex w-fit rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))]">
								{selectedMenuState === 'ESTABLISHED' ? 'En curso' : 'Cerrado'}
							</span>
						{/if}
					{/if}
				</div>
			</div>
			{#if statsCards.length > 0}
				<div class="w-full min-w-0 xl:max-w-5xl" aria-label="Metricas del menu" data-testid="menu-stats-panel">
					<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
						{#each statsCards as stat, index (stat.label)}
							<MetricCard label={stat.label} value={stat.value} hint={stat.hint} tone={stat.tone}>
								{#if index === 0}
									<LayoutList class="size-4" aria-hidden="true" />
								{:else if index === 1}
									<Flame class="size-4" aria-hidden="true" />
								{:else if index === 2}
									<Utensils class="size-4" aria-hidden="true" />
								{:else}
									<CalendarDays class="size-4" aria-hidden="true" />
								{/if}
							</MetricCard>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<div class="mt-4 flex flex-wrap items-center gap-2">
			<div class="inline-flex w-fit rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-1" aria-label="Tipo de filtro">
				<Button
					type="button"
					size="sm"
					variant={filterMode === 'menu' ? 'primary' : 'ghost'}
					onclick={() => (filterMode = 'menu')}
					aria-pressed={filterMode === 'menu'}
					data-testid="menu-filter-mode-menu"
				>
					<CalendarDays class="size-4" aria-hidden="true" />
					Período de menú
				</Button>
				<Button
					type="button"
					size="sm"
					variant={filterMode === 'dates' ? 'primary' : 'ghost'}
					onclick={() => (filterMode = 'dates')}
					aria-pressed={filterMode === 'dates'}
					data-testid="menu-filter-mode-dates"
				>
					<CalendarRange class="size-4" aria-hidden="true" />
					Rango de fechas
				</Button>
			</div>
			<div class="inline-flex w-fit rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-1" aria-label="Modo de visualizacion">
				<Button
					type="button"
					size="sm"
					variant={viewMode === 'table' ? 'primary' : 'ghost'}
					onclick={() => (viewMode = 'table')}
					aria-pressed={viewMode === 'table'}
					data-testid="menu-view-mode-table"
				>
					<LayoutList class="size-4" aria-hidden="true" />
					Tabla
				</Button>
				<Button
					type="button"
					size="sm"
					variant={viewMode === 'calendar' ? 'primary' : 'ghost'}
					onclick={() => (viewMode = 'calendar')}
					aria-pressed={viewMode === 'calendar'}
					data-testid="menu-view-mode-calendar"
				>
					<CalendarDays class="size-4" aria-hidden="true" />
					Calendario
				</Button>
			</div>
			{#if selectedMenu && filterMode === 'menu'}
				<div class="flex flex-wrap gap-2 sm:ml-auto">
					<Button
						type="button"
						variant="secondary"
						size="icon"
						aria-label="Editar menú"
						title="Editar menú"
						onclick={() => onEditMenu?.(selectedMenu)}
						disabled={!onEditMenu || !selectedMenu?.canEdit}
						data-testid="menu-edit-button"
					>
						<Pencil class="size-4" aria-hidden="true" />
					</Button>
					<Button
						type="button"
						variant="danger"
						size="icon"
						aria-label="Borrar menú"
						title="Borrar menú"
						onclick={() => onDeleteMenu?.(selectedMenu)}
						disabled={!onDeleteMenu || !selectedMenu?.canDelete}
						data-testid="menu-delete-button"
					>
						<Trash2 class="size-4" aria-hidden="true" />
					</Button>
				</div>
			{/if}
		</div>

		<div class="mt-4 border-t border-[hsl(var(--border))] pt-4">
			{#if filterMode === 'menu'}
				<label class="block max-w-xl space-y-2">
					<span class="text-sm font-medium text-[hsl(var(--foreground))]">Período</span>
					<select
						class="h-10 w-full rounded-md border border-[hsl(var(--input))] bg-white px-3 text-sm focus:border-[hsl(var(--ring))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.2)]"
						value={selectedMenuId || String(orderedMenus[0]?.id ?? '')}
						onchange={handleMenuSelection}
						disabled={!loaded || orderedMenus.length === 0}
						data-testid="menu-period-selector"
					>
						{#if orderedMenus.length === 0}<option value="">No hay períodos disponibles</option>{/if}
						{#each orderedMenus as menu (menu.id)}
							<option value={String(menu.id)}>{menuLabel(menu)}</option>
						{/each}
					</select>
					{#if selectedMenu && filterMode === 'menu'}
						<span class="block text-xs text-[hsl(var(--muted-foreground))]">Menú #{selectedMenu.id}</span>
					{/if}
				</label>
			{:else}
				<div class="grid max-w-2xl gap-3 sm:grid-cols-2">
					<label class="space-y-2">
						<span class="text-sm font-medium text-[hsl(var(--foreground))]">Desde</span>
						<input
							class="h-10 w-full rounded-md border border-[hsl(var(--input))] bg-white px-3 text-sm focus:border-[hsl(var(--ring))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.2)]"
							type="date"
							bind:value={dateFrom}
							max={dateTo || undefined}
							data-testid="menu-date-from"
						/>
					</label>
					<label class="space-y-2">
						<span class="text-sm font-medium text-[hsl(var(--foreground))]">Hasta</span>
						<input
							class="h-10 w-full rounded-md border border-[hsl(var(--input))] bg-white px-3 text-sm focus:border-[hsl(var(--ring))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.2)]"
							type="date"
							bind:value={dateTo}
							min={dateFrom || undefined}
							data-testid="menu-date-to"
						/>
					</label>
				</div>
			{/if}
		</div>
	</div>

	<section class="overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
		<div class="flex items-center justify-between gap-3 border-b border-[hsl(var(--border))] px-4 py-3">
			<div class="min-w-0">
				<h3 class="text-base font-semibold text-[hsl(var(--foreground))]">Comidas</h3>
				<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{rows.length} {rows.length === 1 ? 'resultado' : 'resultados'}</p>
			</div>
			<Utensils class="size-5 shrink-0 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
		</div>

		{#if !loaded}
			<div class="grid place-items-center px-6 py-14 text-center">
				<div class="size-5 animate-spin rounded-full border-2 border-[hsl(var(--muted-foreground))] border-t-transparent" aria-hidden="true"></div>
				<p class="mt-3 text-sm text-[hsl(var(--muted-foreground))]">Cargando comidas…</p>
			</div>
		{:else if rows.length === 0}
			<div class="grid place-items-center px-6 py-14 text-center">
				<div class="grid size-10 place-items-center rounded-md bg-[hsl(var(--secondary))]">
					<Utensils class="size-5 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
				</div>
				<h4 class="mt-3 text-sm font-semibold text-[hsl(var(--foreground))]">No hay comidas en este período</h4>
				<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Prueba con otro menú o amplía el rango de fechas.</p>
			</div>
		{:else if viewMode === 'table'}
			<div class="hidden overflow-x-auto md:block">
				<table class="w-full text-sm">
					<thead class="bg-[hsl(var(--secondary)/0.65)] text-[hsl(var(--muted-foreground))]">
						<tr>
							<th class="w-[32%] px-4 py-3 text-left text-xs font-medium">Día</th>
							<th class="w-[24%] px-4 py-3 text-left text-xs font-medium">Parte del día</th>
							<th class="px-4 py-3 text-left text-xs font-medium">Comida</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[hsl(var(--border))]" data-testid="menu-meals-rows">
						{#each rows as row (row.key)}
							<tr class="align-top transition-colors hover:bg-[hsl(var(--secondary)/0.3)]">
								<td class="px-4 py-3 font-medium capitalize text-[hsl(var(--foreground))]">{formatDay(row.date)}</td>
								<td class="px-4 py-3 text-[hsl(var(--muted-foreground))]">{row.dayPart}</td>
								<td class="px-4 py-3 text-[hsl(var(--foreground))]">{row.products.join(', ') || 'Sin comida asignada'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="divide-y divide-[hsl(var(--border))] md:hidden" data-testid="menu-meals-cards">
				{#each rows as row (row.key)}
					<article class="space-y-3 p-4">
						<div>
							<p class="text-sm font-semibold capitalize text-[hsl(var(--foreground))]">{formatDay(row.date)}</p>
							<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{row.dayPart}</p>
						</div>
						<p class="break-words text-sm text-[hsl(var(--foreground))]">{row.products.join(', ') || 'Sin comida asignada'}</p>
					</article>
				{/each}
			</div>
		{:else}
			<div class="overflow-x-auto" data-testid="menu-calendar-view">
				<div class="min-w-[960px]">
					<div
						class="grid border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.55)] text-xs font-medium text-[hsl(var(--muted-foreground))]"
						style={`grid-template-columns: 200px repeat(${calendarDates.length}, minmax(180px, 1fr));`}
					>
						<div class="sticky left-0 z-20 border-r border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.9)] px-4 py-3">
							Parte del día
						</div>
						{#each calendarDates as date (date)}
							<div class="border-r border-[hsl(var(--border))] px-4 py-3 last:border-r-0">
								<p class="text-sm font-semibold capitalize text-[hsl(var(--foreground))]">{formatDay(date)}</p>
							</div>
						{/each}
					</div>

					<div data-testid="menu-calendar-grid">
						{#each calendarDayParts as dayPart (dayPart.dayPartId)}
							<div
								class="grid border-b border-[hsl(var(--border))] last:border-b-0"
								style={`grid-template-columns: 200px repeat(${calendarDates.length}, minmax(180px, 1fr));`}
							>
								<div class="sticky left-0 z-10 border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-4">
									<p class="text-sm font-medium text-[hsl(var(--foreground))]">{dayPart.dayPart}</p>
								</div>
								{#each calendarDates as date (date)}
									{@const cell = calendarCells.get(`${date}-${dayPart.dayPartId}`)}
									<div class="min-h-24 border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 last:border-r-0">
										{#if cell && cell.groups.length > 0}
											<div class="space-y-2">
												{#each cell.groups as group (group.key)}
													<ul class="list-disc space-y-1 pl-4 text-sm text-[hsl(var(--foreground))]">
														{#if group.products.length > 0}
															{#each group.products as product, index (product + index)}
																<li>{product}</li>
															{/each}
														{:else}
															<li>Sin comida asignada</li>
														{/if}
													</ul>
												{/each}
											</div>
										{:else}
											<div class="grid h-full min-h-18 place-items-center rounded-md border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.14)] text-sm text-[hsl(var(--muted-foreground))]">
												Sin comida
											</div>
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
</section>
