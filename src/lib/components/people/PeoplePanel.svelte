<script lang="ts">
	import { onMount } from 'svelte';
	import { CalendarClock, Pencil, Trash2, Users, TrendingUp } from '@lucide/svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import MetricCard from '$lib/components/ui/MetricCard.svelte';
	import { ApiError } from '$lib/api/backend';
	import {
		createUserWeight,
		deleteUserWeight,
		getUserHistory,
		listUserWeights,
		listUsers,
		updateUserWeight,
		type DateRangeRequest,
		type UserMenuHistoryResponse,
		type UserResponse,
		type UserWeightResponse
	} from '$lib/api/users';

	type PeopleViewMode = 'weights' | 'history' | 'trend';
	type ChartPoint = {
		date: string;
		value: number;
	};
	type ChartDot = ChartPoint & {
		x: number;
		y: number;
	};
	type ChartState = {
		hasData: boolean;
		points: ChartDot[];
		path: string;
		areaPath: string;
		minValue: number | null;
		maxValue: number | null;
		firstLabel: string;
		lastLabel: string;
	};

	const chartWidth = 640;
	const chartHeight = 220;
	const chartPadding = { top: 18, right: 20, bottom: 36, left: 52 };

	let { authorization, currentUserId, mode }: { authorization: string; currentUserId: number; mode: PeopleViewMode } = $props();

	let users = $state<UserResponse[]>([]);
	let selectedUserId = $state('');
	let loadingUsers = $state(true);
	let loadingHistory = $state(false);
	let loadingWeights = $state(false);
	let error = $state('');
	let history = $state<UserMenuHistoryResponse | null>(null);
	let weights = $state<UserWeightResponse[]>([]);
	let range = $state<DateRangeRequest>(defaultRange('weights'));
	let editingWeightId = $state<number | null>(null);
	let weightDraft = $state({ weight: '', recordedAt: '', notes: '' });

	const currentUser = $derived(users.find((user) => user.id === Number(selectedUserId)) ?? null);
	const weightsSummary = $derived(weightSummary(weights));
	const historySummary = $derived(historySummaryData(history));
	const historyChart = $derived(buildChart(history?.menus.map((menu) => ({
		date: menu.startDate,
		value: menu.stats.averageCalories
	})) ?? []));
	const weightChart = $derived(buildChart(weights.map((weight) => ({
		date: weight.recordedAt,
		value: weight.weight
	}))));

	onMount(() => void bootstrap());

	function title() {
		if (mode === 'weights') return 'Pesos';
		if (mode === 'history') return 'Historial';
		return 'Evolución';
	}

	function description() {
		if (mode === 'weights') return 'Añade y revisa las mediciones de peso de la persona seleccionada.';
		if (mode === 'history') return 'Filtra menús cerrados por un periodo concreto.';
		return 'Cruza calorías y peso en el mismo intervalo temporal.';
	}

	function defaultRange(view: PeopleViewMode): DateRangeRequest {
		const today = new Date();
		if (view === 'weights') {
			return {
				from: localDateInput(new Date(today.getFullYear(), today.getMonth(), 1)),
				to: localDateInput(today)
			};
		}

		return {
			from: localDateInput(new Date(today.getFullYear(), 0, 1)),
			to: localDateInput(today)
		};
	}

	function localDateInput(date: Date) {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	function dateInputToUtcStart(value: string) {
		const [year, month, day] = value.split('-').map((part) => Number(part));
		return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)).toISOString();
	}

	function dateInputToUtcEnd(value: string) {
		const [year, month, day] = value.split('-').map((part) => Number(part));
		return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999)).toISOString();
	}

	function dateTimeToInput(value: string) {
		if (!value) return '';
		return localDateInput(new Date(value));
	}

	function formatDate(value: string) {
		return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value));
	}

	function formatMoney(value: number) {
		return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
	}

	function formatWeight(value: number) {
		return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(value)} kg`;
	}

	function formatNumber(value: number) {
		return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(value);
	}

	function chartDateLabel(value: string) {
		return new Intl.DateTimeFormat('es-ES', {
			day: '2-digit',
			month: 'short',
			timeZone: 'UTC'
		}).format(new Date(value));
	}

	function weightSummary(items: UserWeightResponse[]) {
		if (items.length === 0) {
			return {
				count: 0,
				first: null as number | null,
				last: null as number | null,
				min: null as number | null,
				max: null as number | null
			};
		}

		const values = items.map((item) => item.weight);
		return {
			count: items.length,
			first: items[0]?.weight ?? null,
			last: items.at(-1)?.weight ?? null,
			min: Math.min(...values),
			max: Math.max(...values)
		};
	}

	function historySummaryData(response: UserMenuHistoryResponse | null) {
		if (!response) {
			return {
				count: 0,
				averageCalories: null as number | null,
				moneySpent: null as number | null,
				maxCalories: null as number | null,
				minCalories: null as number | null
			};
		}

		return {
			count: response.menus.length,
			averageCalories: response.totals.averageCalories,
			moneySpent: response.totals.moneySpent,
			maxCalories: response.totals.maxDay?.calories ?? null,
			minCalories: response.totals.minDay?.calories ?? null
		};
	}

	function buildChart(points: ChartPoint[]): ChartState {
		const ordered = [...points]
			.filter((point) => Number.isFinite(point.value))
			.sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());

		if (ordered.length === 0) {
			return {
				hasData: false,
				points: [],
				path: '',
				areaPath: '',
				minValue: null,
				maxValue: null,
				firstLabel: '',
				lastLabel: ''
			};
		}

		const values = ordered.map((point) => point.value);
		let minValue = Math.min(...values);
		let maxValue = Math.max(...values);
		if (minValue === maxValue) {
			minValue -= 1;
			maxValue += 1;
		} else {
			const padding = (maxValue - minValue) * 0.1;
			minValue -= padding;
			maxValue += padding;
		}

		const innerWidth = chartWidth - chartPadding.left - chartPadding.right;
		const innerHeight = chartHeight - chartPadding.top - chartPadding.bottom;
		const count = ordered.length;
		const denominator = Math.max(count - 1, 1);
		const span = maxValue - minValue;
		const chartPoints = ordered.map((point, index) => {
			const x = chartPadding.left + (index / denominator) * innerWidth;
			const normalized = (point.value - minValue) / span;
			const y = chartPadding.top + (1 - normalized) * innerHeight;
			return { ...point, x, y };
		});

		const path = chartPoints
			.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
			.join(' ');
		const areaPath = `${path} L ${chartPoints.at(-1)?.x.toFixed(2)} ${chartHeight - chartPadding.bottom} L ${chartPoints[0]?.x.toFixed(2)} ${chartHeight - chartPadding.bottom} Z`;

		return {
			hasData: true,
			points: chartPoints,
			path,
			areaPath,
			minValue,
			maxValue,
			firstLabel: chartDateLabel(ordered[0].date),
			lastLabel: chartDateLabel(ordered.at(-1)?.date ?? ordered[0].date)
		};
	}

	function initialUserId() {
		return String(users.some((user) => user.id === Number(selectedUserId)) ? selectedUserId : users[0]?.id ?? currentUserId);
	}

	async function bootstrap() {
		selectedUserId = String(currentUserId);
		range = defaultRange(mode);
		loadingUsers = true;
		try {
			users = await listUsers(authorization);
			selectedUserId = initialUserId();
		} catch (cause) {
			error = cause instanceof ApiError ? cause.message : 'No se pudieron cargar las personas.';
		} finally {
			loadingUsers = false;
		}

		await loadModeData();
	}

	function isValidRange() {
		return Boolean(range.from && range.to && range.from <= range.to);
	}

	async function loadModeData() {
		const userId = Number(selectedUserId);
		if (!Number.isFinite(userId) || userId <= 0) return;
		if (!isValidRange()) {
			error = 'Selecciona un rango válido.';
			return;
		}

		error = '';
		if (mode === 'weights') {
			await loadWeights(userId);
			return;
		}

		if (mode === 'history') {
			await loadHistory(userId);
			return;
		}

		await Promise.all([loadHistory(userId), loadWeights(userId)]);
	}

	async function loadHistory(userId: number) {
		loadingHistory = true;
		try {
			history = await getUserHistory(
				userId,
				{
					from: dateInputToUtcStart(range.from),
					to: dateInputToUtcEnd(range.to)
				},
				authorization
			);
		} catch (cause) {
			if (!error) {
				error = cause instanceof ApiError ? cause.message : 'No se pudo cargar el historial.';
			}
		} finally {
			loadingHistory = false;
		}
	}

	async function loadWeights(userId: number) {
		loadingWeights = true;
		try {
			weights = await listUserWeights(
				userId,
				{
					from: dateInputToUtcStart(range.from),
					to: dateInputToUtcEnd(range.to)
				},
				authorization
			);
		} catch (cause) {
			if (!error) {
				error = cause instanceof ApiError ? cause.message : 'No se pudieron cargar los pesos.';
			}
		} finally {
			loadingWeights = false;
		}
	}

	async function selectUser(userId: string) {
		selectedUserId = userId;
		editingWeightId = null;
		weightDraft = { weight: '', recordedAt: '', notes: '' };
		await loadModeData();
	}

	async function applyRange(event: SubmitEvent) {
		event.preventDefault();
		editingWeightId = null;
		weightDraft = { weight: '', recordedAt: '', notes: '' };
		await loadModeData();
	}

	function editWeight(weight: UserWeightResponse) {
		editingWeightId = weight.id;
		weightDraft = {
			weight: String(weight.weight),
			recordedAt: dateTimeToInput(weight.recordedAt),
			notes: weight.notes ?? ''
		};
	}

	function clearWeightDraft() {
		editingWeightId = null;
		weightDraft = { weight: '', recordedAt: '', notes: '' };
	}

	async function saveWeight(event: SubmitEvent) {
		event.preventDefault();
		const userId = Number(selectedUserId);
		if (!Number.isFinite(userId) || userId <= 0) return;

		const payload = {
			weight: Number(weightDraft.weight),
			recordedAt: weightDraft.recordedAt,
			notes: weightDraft.notes
		};
		if (!Number.isFinite(payload.weight) || payload.weight <= 0 || !payload.recordedAt) {
			error = 'Completa un peso y una fecha válidos.';
			return;
		}

		error = '';
		try {
			if (editingWeightId === null) {
				await createUserWeight(
					userId,
					{
						weight: payload.weight,
						recordedAt: dateInputToUtcStart(payload.recordedAt),
						notes: payload.notes
					},
					authorization
				);
			} else {
				await updateUserWeight(
					userId,
					editingWeightId,
					{
						weight: payload.weight,
						recordedAt: dateInputToUtcStart(payload.recordedAt),
						notes: payload.notes
					},
					authorization
				);
			}

			clearWeightDraft();
			await loadWeights(userId);
		} catch (cause) {
			error = cause instanceof ApiError ? cause.message : 'No se pudo guardar el peso.';
		}
	}

	async function removeWeight(weight: UserWeightResponse) {
		if (!window.confirm('¿Eliminar este peso?')) return;

		const userId = Number(selectedUserId);
		error = '';
		try {
			await deleteUserWeight(userId, weight.id, authorization);
			await loadWeights(userId);
		} catch (cause) {
			error = cause instanceof ApiError ? cause.message : 'No se pudo eliminar el peso.';
		}
	}
</script>

<section class="space-y-5" data-testid="people-panel" data-mode={mode}>
	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<div class="min-w-0">
			<h2 class="text-2xl font-semibold tracking-tight">{title()}</h2>
			<p class="mt-1 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">{description()}</p>
		</div>
		<label class="min-w-0 space-y-2 sm:w-72">
			<span class="text-sm font-medium">Usuario</span>
			<select
				class="h-10 w-full rounded-md border bg-white px-3 text-sm"
				bind:value={selectedUserId}
				onchange={(event) => void selectUser((event.currentTarget as HTMLSelectElement).value)}
				data-testid="people-user-selector"
			>
				{#if loadingUsers}
					<option value={selectedUserId}>Cargando personas…</option>
				{/if}
				{#each users as user}
					<option value={user.id}>{user.username}</option>
				{/each}
			</select>
			{#if currentUser}
				<p class="text-xs text-[hsl(var(--muted-foreground))]">Seleccionado por defecto: {currentUser.username}</p>
			{/if}
		</label>
	</div>

	{#if error}
		<p class="rounded-md border border-[hsl(var(--destructive)/0.2)] bg-[hsl(var(--destructive)/0.06)] px-3 py-2 text-sm text-[hsl(var(--destructive))]">{error}</p>
	{/if}

	<form class="space-y-4 rounded-lg border bg-[hsl(var(--card))] p-4 shadow-sm" onsubmit={applyRange}>
		<div class="grid gap-3 md:grid-cols-3">
			<label class="space-y-2">
				<span class="text-sm font-medium">Desde</span>
				<input class="h-10 w-full rounded-md border px-3 text-sm" type="date" bind:value={range.from} data-testid={`people-${mode}-from`} />
			</label>
			<label class="space-y-2">
				<span class="text-sm font-medium">Hasta</span>
				<input class="h-10 w-full rounded-md border px-3 text-sm" type="date" bind:value={range.to} data-testid={`people-${mode}-to`} />
			</label>
			<div class="flex items-end">
				<Button type="submit" class="w-full sm:w-auto" data-testid={`people-${mode}-apply`}>Aplicar</Button>
			</div>
		</div>
	</form>

	{#if mode === 'weights'}
		<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
			<MetricCard label="Pesos" value={String(weightsSummary.count)} hint="Entradas registradas">
				<CalendarClock class="size-4" />
			</MetricCard>
			<MetricCard label="Último" value={weightsSummary.last === null ? '—' : formatWeight(weightsSummary.last)} hint="Medición más reciente" />
			<MetricCard label="Máximo" value={weightsSummary.max === null ? '—' : formatWeight(weightsSummary.max)} hint="Periodo filtrado" />
			<MetricCard label="Mínimo" value={weightsSummary.min === null ? '—' : formatWeight(weightsSummary.min)} hint="Periodo filtrado" />
		</div>

		<form class="space-y-4 rounded-lg border bg-[hsl(var(--card))] p-4 shadow-sm" onsubmit={saveWeight}>
			<div class="grid gap-3 md:grid-cols-3">
				<label class="space-y-2">
					<span class="text-sm font-medium">Peso</span>
					<input class="h-10 w-full rounded-md border px-3 text-sm" type="number" step="0.1" min="0" bind:value={weightDraft.weight} data-testid="people-weight-input" />
				</label>
				<label class="space-y-2">
					<span class="text-sm font-medium">Fecha</span>
					<input class="h-10 w-full rounded-md border px-3 text-sm" type="date" bind:value={weightDraft.recordedAt} data-testid="people-weight-date" />
				</label>
				<label class="space-y-2">
					<span class="text-sm font-medium">Notas</span>
					<input class="h-10 w-full rounded-md border px-3 text-sm" bind:value={weightDraft.notes} data-testid="people-weight-notes" />
				</label>
			</div>
			<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				{#if editingWeightId !== null}
					<Button type="button" variant="secondary" onclick={clearWeightDraft} data-testid="people-weight-cancel">Cancelar edición</Button>
				{/if}
				<Button type="submit" data-testid="people-weight-save">{editingWeightId === null ? 'Añadir peso' : 'Guardar peso'}</Button>
			</div>
		</form>

		<section class="rounded-lg border bg-[hsl(var(--card))] shadow-sm">
			<div class="border-b p-4">
				<h3 class="text-base font-semibold">Pesos</h3>
			</div>
			{#if loadingWeights}
				<p class="p-4 text-sm text-[hsl(var(--muted-foreground))]">Cargando pesos…</p>
			{:else if weights.length === 0}
				<p class="p-4 text-sm text-[hsl(var(--muted-foreground))]">Todavía no hay pesos registrados en este periodo.</p>
			{:else}
				<div class="hidden overflow-x-auto md:block">
					<table class="w-full text-sm">
						<thead class="bg-[hsl(var(--secondary))] text-xs text-[hsl(var(--muted-foreground))]">
							<tr>
								<th class="px-3 py-2 text-left font-medium">Fecha</th>
								<th class="px-3 py-2 text-right font-medium">Peso</th>
								<th class="px-3 py-2 text-left font-medium">Notas</th>
								<th class="px-3 py-2 text-right font-medium">Acciones</th>
							</tr>
						</thead>
						<tbody class="divide-y">
							{#each weights as weight}
								<tr>
									<td class="px-3 py-2">{formatDate(weight.recordedAt)}</td>
									<td class="px-3 py-2 text-right tabular-nums">{formatWeight(weight.weight)}</td>
									<td class="px-3 py-2">{weight.notes ?? '—'}</td>
									<td class="px-3 py-2">
										<div class="flex justify-end gap-2">
											<Button type="button" size="sm" variant="secondary" onclick={() => editWeight(weight)} data-testid={`people-weight-edit-${weight.id}`}><Pencil class="size-4" />Editar</Button>
											<Button type="button" size="sm" variant="ghost" class="text-[hsl(var(--destructive))]" onclick={() => removeWeight(weight)} data-testid={`people-weight-delete-${weight.id}`}><Trash2 class="size-4" />Borrar</Button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<div class="space-y-2 md:hidden">
					{#each weights as weight}
						<article class="rounded-md border p-3">
							<div class="flex items-start justify-between gap-3">
								<div>
									<p class="text-sm font-medium">{formatDate(weight.recordedAt)}</p>
									<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{weight.notes ?? 'Sin notas'}</p>
								</div>
								<p class="text-sm tabular-nums">{formatWeight(weight.weight)}</p>
							</div>
							<div class="mt-3 flex gap-2">
								<Button type="button" size="sm" variant="secondary" onclick={() => editWeight(weight)} data-testid={`people-weight-card-edit-${weight.id}`}>Editar</Button>
								<Button type="button" size="sm" variant="ghost" class="text-[hsl(var(--destructive))]" onclick={() => removeWeight(weight)} data-testid={`people-weight-card-delete-${weight.id}`}>Borrar</Button>
							</div>
						</article>
					{/each}
				</div>
			{/if}
		</section>
	{:else if mode === 'history'}
		<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
			<MetricCard label="Menús" value={String(historySummary.count)} hint="Periodo filtrado">
				<Users class="size-4" />
			</MetricCard>
			<MetricCard label="Calorías medias" value={historySummary.averageCalories === null ? '—' : formatNumber(historySummary.averageCalories)} hint="Promedio diario" />
			<MetricCard label="Gasto" value={historySummary.moneySpent === null ? '—' : formatMoney(historySummary.moneySpent)} hint="Total del periodo" />
			<MetricCard label="Pico" value={historySummary.maxCalories === null ? '—' : `${formatNumber(historySummary.maxCalories)} kcal`} hint="Mayor media diaria" />
		</div>

		<section class="rounded-lg border bg-[hsl(var(--card))] shadow-sm">
			<div class="border-b p-4">
				<h3 class="text-base font-semibold">Historial de menús</h3>
			</div>
			{#if loadingHistory}
				<p class="p-4 text-sm text-[hsl(var(--muted-foreground))]">Cargando historial…</p>
			{:else if (history?.menus.length ?? 0) === 0}
				<p class="p-4 text-sm text-[hsl(var(--muted-foreground))]">No hay menús en este periodo.</p>
			{:else}
				<div class="hidden overflow-x-auto md:block">
					<table class="w-full text-sm">
						<thead class="bg-[hsl(var(--secondary))] text-xs text-[hsl(var(--muted-foreground))]">
							<tr>
								<th class="px-3 py-2 text-left font-medium">Menú</th>
								<th class="px-3 py-2 text-left font-medium">Periodo</th>
								<th class="px-3 py-2 text-right font-medium">Calorías medias</th>
								<th class="px-3 py-2 text-right font-medium">Gasto</th>
							</tr>
						</thead>
						<tbody class="divide-y">
							{#each history?.menus ?? [] as menu}
								<tr>
									<td class="px-3 py-2">#{menu.menuId}</td>
									<td class="px-3 py-2">{formatDate(menu.startDate)} - {formatDate(menu.endDate)}</td>
									<td class="px-3 py-2 text-right tabular-nums">{formatNumber(menu.stats.averageCalories)}</td>
									<td class="px-3 py-2 text-right tabular-nums">{formatMoney(menu.stats.moneySpent)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<div class="space-y-2 md:hidden">
					{#each history?.menus ?? [] as menu}
						<article class="rounded-md border p-3">
							<p class="text-sm font-medium">#{menu.menuId}</p>
							<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{formatDate(menu.startDate)} - {formatDate(menu.endDate)}</p>
							<p class="mt-2 text-sm tabular-nums">{formatNumber(menu.stats.averageCalories)} kcal · {formatMoney(menu.stats.moneySpent)}</p>
						</article>
					{/each}
				</div>
			{/if}
		</section>
	{:else}
		<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
			<MetricCard label="Menús" value={String(historySummary.count)} hint="Series de calorías">
				<TrendingUp class="size-4" />
			</MetricCard>
			<MetricCard label="Pesos" value={String(weightsSummary.count)} hint="Serie de peso">
				<CalendarClock class="size-4" />
			</MetricCard>
			<MetricCard label="Calorías medias" value={historySummary.averageCalories === null ? '—' : formatNumber(historySummary.averageCalories)} hint="Periodo filtrado" />
			<MetricCard label="Último peso" value={weightsSummary.last === null ? '—' : formatWeight(weightsSummary.last)} hint="Última medición" />
		</div>

		<div class="grid gap-4 xl:grid-cols-2">
			<section class="rounded-lg border bg-[hsl(var(--card))] shadow-sm">
				<div class="border-b p-4">
					<h3 class="text-base font-semibold">Calorías</h3>
					<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Promedio diario por menú dentro del periodo seleccionado.</p>
				</div>
				{#if loadingHistory}
					<p class="p-4 text-sm text-[hsl(var(--muted-foreground))]">Cargando calorías…</p>
				{:else if !historyChart.hasData}
					<p class="p-4 text-sm text-[hsl(var(--muted-foreground))]">No hay menús para graficar en este periodo.</p>
				{:else}
					<div class="p-4">
						<div class="mb-3 flex items-center justify-between gap-3 text-xs text-[hsl(var(--muted-foreground))]">
							<span>{historyChart.firstLabel}</span>
							<span>{historyChart.lastLabel}</span>
						</div>
						<svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} class="h-56 w-full rounded-xl bg-[hsl(var(--secondary)/0.28)]">
							<defs>
								<linearGradient id="history-fill" x1="0" x2="0" y1="0" y2="1">
									<stop offset="0%" stop-color="hsl(var(--primary) / 0.22)" />
									<stop offset="100%" stop-color="hsl(var(--primary) / 0.03)" />
								</linearGradient>
							</defs>
							<line x1={chartPadding.left} y1={chartPadding.top} x2={chartWidth - chartPadding.right} y2={chartPadding.top} stroke="hsl(var(--border))" />
							<line x1={chartPadding.left} y1={chartHeight - chartPadding.bottom} x2={chartWidth - chartPadding.right} y2={chartHeight - chartPadding.bottom} stroke="hsl(var(--border))" />
							{#if historyChart.areaPath}
								<path d={historyChart.areaPath} fill="url(#history-fill)" />
							{/if}
							<path d={historyChart.path} fill="none" stroke="hsl(var(--primary))" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" />
							{#each historyChart.points as point}
								<circle cx={point.x} cy={point.y} r="4" fill="hsl(var(--primary))" />
							{/each}
							{#if historyChart.maxValue !== null}
								<text x="12" y={chartPadding.top + 6} class="fill-[hsl(var(--muted-foreground))] text-xs">{formatNumber(historyChart.maxValue)} kcal</text>
							{/if}
							{#if historyChart.minValue !== null}
								<text x="12" y={chartHeight - chartPadding.bottom + 18} class="fill-[hsl(var(--muted-foreground))] text-xs">{formatNumber(historyChart.minValue)} kcal</text>
							{/if}
						</svg>
					</div>
				{/if}
			</section>

			<section class="rounded-lg border bg-[hsl(var(--card))] shadow-sm">
				<div class="border-b p-4">
					<h3 class="text-base font-semibold">Peso</h3>
					<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Mediciones registradas dentro del mismo periodo.</p>
				</div>
				{#if loadingWeights}
					<p class="p-4 text-sm text-[hsl(var(--muted-foreground))]">Cargando pesos…</p>
				{:else if !weightChart.hasData}
					<p class="p-4 text-sm text-[hsl(var(--muted-foreground))]">No hay pesos para graficar en este periodo.</p>
				{:else}
					<div class="p-4">
						<div class="mb-3 flex items-center justify-between gap-3 text-xs text-[hsl(var(--muted-foreground))]">
							<span>{weightChart.firstLabel}</span>
							<span>{weightChart.lastLabel}</span>
						</div>
						<svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} class="h-56 w-full rounded-xl bg-[hsl(var(--secondary)/0.28)]">
							<defs>
								<linearGradient id="weight-fill" x1="0" x2="0" y1="0" y2="1">
									<stop offset="0%" stop-color="hsl(var(--accent) / 0.22)" />
									<stop offset="100%" stop-color="hsl(var(--accent) / 0.03)" />
								</linearGradient>
							</defs>
							<line x1={chartPadding.left} y1={chartPadding.top} x2={chartWidth - chartPadding.right} y2={chartPadding.top} stroke="hsl(var(--border))" />
							<line x1={chartPadding.left} y1={chartHeight - chartPadding.bottom} x2={chartWidth - chartPadding.right} y2={chartHeight - chartPadding.bottom} stroke="hsl(var(--border))" />
							{#if weightChart.areaPath}
								<path d={weightChart.areaPath} fill="url(#weight-fill)" />
							{/if}
							<path d={weightChart.path} fill="none" stroke="hsl(var(--accent))" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" />
							{#each weightChart.points as point}
								<circle cx={point.x} cy={point.y} r="4" fill="hsl(var(--accent))" />
							{/each}
							{#if weightChart.maxValue !== null}
								<text x="12" y={chartPadding.top + 6} class="fill-[hsl(var(--muted-foreground))] text-xs">{formatWeight(weightChart.maxValue)}</text>
							{/if}
							{#if weightChart.minValue !== null}
								<text x="12" y={chartHeight - chartPadding.bottom + 18} class="fill-[hsl(var(--muted-foreground))] text-xs">{formatWeight(weightChart.minValue)}</text>
							{/if}
						</svg>
					</div>
				{/if}
			</section>
		</div>
	{/if}
</section>
