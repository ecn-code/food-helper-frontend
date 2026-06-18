import type { EstablishedWeekMenu } from '$lib/established-week-menus';
import type { ProposedWeekMenu } from '$lib/proposed-week-menus';
import type { StockEntry } from '$lib/stock';

export type WeekDayCalories = {
	date: string;
	calories: number;
};

export type WeekStockRequirement = {
	productId: number;
	productName: string;
	requiredUnits: number;
	availableUnits: number;
	coveredUnits: number;
	missingUnits: number;
	estimatedCost: number;
};

export type WeekPlanningSummary = {
	rangeDays: number;
	plannedDays: number;
	calories: {
		total: number;
		averagePerPlannedDay: number;
		maxDay: WeekDayCalories | null;
		minDay: WeekDayCalories | null;
	};
	distinctProducts: number;
	estimatedCost: number;
	requirements: WeekStockRequirement[];
};

function parseDateInput(value: string) {
	const parts = String(value).split('-').map((entry) => Number(entry));
	if (parts.length !== 3 || parts.some((entry) => Number.isNaN(entry))) return null;
	const [year, month, day] = parts;
	return new Date(Date.UTC(year, month - 1, day));
}

function dateDifferenceInDays(startDate: string, endDate: string) {
	const start = parseDateInput(startDate);
	const end = parseDateInput(endDate);
	if (!start || !end) return Number.NaN;
	return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function inclusiveRangeDays(startDate: string, endDate: string) {
	const difference = dateDifferenceInDays(startDate, endDate);
	if (!Number.isFinite(difference) || difference < 0) return 0;
	return difference + 1;
}

function sortStockEntries(left: StockEntry, right: StockEntry) {
	const leftExpiration = left.expirationDate;
	const rightExpiration = right.expirationDate;

	if (leftExpiration && rightExpiration) {
		const byExpiration = leftExpiration.localeCompare(rightExpiration);
		if (byExpiration !== 0) return byExpiration;
	} else if (leftExpiration) {
		return -1;
	} else if (rightExpiration) {
		return 1;
	}

	const byEntryDate = left.entryDate.localeCompare(right.entryDate);
	if (byEntryDate !== 0) return byEntryDate;
	return left.id - right.id;
}

function roundNumber(value: number) {
	return Number(value.toFixed(2));
}

function roundUnits(value: number) {
	return Number(value.toFixed(2));
}

function plannedDays(menu: ProposedWeekMenu) {
	return menu.days.filter((day) => day.sections.some((section) => section.products.length > 0));
}

function dayCalories(day: ProposedWeekMenu['days'][number]) {
	return Number(day.nutritionalValues.calories ?? 0);
}

export function buildWeekPlanningSummary(
	menu: ProposedWeekMenu | EstablishedWeekMenu | null,
	stockEntries: StockEntry[]
): WeekPlanningSummary {
	if (!menu) {
		return {
			rangeDays: 0,
			plannedDays: 0,
			calories: {
				total: 0,
				averagePerPlannedDay: 0,
				maxDay: null,
				minDay: null
			},
			distinctProducts: 0,
			estimatedCost: 0,
			requirements: []
		};
	}

	if ('stockSummary' in menu) {
		const totalCalories = menu.days.reduce((sum, day) => sum + Number(day.nutritionalValues.calories ?? 0), 0);

		return {
			rangeDays: inclusiveRangeDays(menu.startDate, menu.endDate),
			plannedDays: menu.stockSummary.plannedDays,
			calories: {
				total: roundNumber(totalCalories),
				averagePerPlannedDay: roundNumber(menu.stockSummary.calories.averagePerPlannedDay),
				maxDay: menu.stockSummary.calories.maxDay,
				minDay: menu.stockSummary.calories.minDay
			},
			distinctProducts: menu.stockSummary.distinctProducts,
			estimatedCost: roundNumber(menu.stockSummary.estimatedCost),
			requirements: menu.stockSummary.requirements.map((requirement) => ({
				productId: requirement.productId,
				productName: requirement.productName,
				requiredUnits: roundUnits(requirement.requiredUnits),
				availableUnits: roundUnits(requirement.availableUnits),
				coveredUnits: roundUnits(requirement.coveredUnits),
				missingUnits: roundUnits(requirement.missingUnits),
				estimatedCost: roundNumber(requirement.estimatedCost)
			}))
		};
	}

	const days = plannedDays(menu);
	const caloriesByDay = days.map((day) => ({
		date: day.date,
		calories: dayCalories(day)
	}));
	const totalCalories = caloriesByDay.reduce((sum, day) => sum + day.calories, 0);
	const maxDay = caloriesByDay.reduce<WeekDayCalories | null>((currentMax, day) => {
		if (!currentMax || day.calories > currentMax.calories) return day;
		return currentMax;
	}, null);
	const minDay = caloriesByDay.reduce<WeekDayCalories | null>((currentMin, day) => {
		if (!currentMin || day.calories < currentMin.calories) return day;
		return currentMin;
	}, null);

	const requirementsByProduct = new Map<
		number,
		{ productId: number; productName: string; requiredUnits: number }
	>();

	for (const day of days) {
		for (const section of day.sections) {
			for (const product of section.products) {
				const requiredUnits = product.units ?? 1;
				const current = requirementsByProduct.get(product.productId) ?? {
					productId: product.productId,
					productName: product.productName,
					requiredUnits: 0
				};

				current.requiredUnits += Number.isFinite(requiredUnits) ? requiredUnits : 0;
				requirementsByProduct.set(product.productId, current);
			}
		}
	}

	const stockByProduct = new Map<number, StockEntry[]>();
	for (const stockEntry of stockEntries) {
		const entries = stockByProduct.get(stockEntry.productId) ?? [];
		entries.push(stockEntry);
		stockByProduct.set(stockEntry.productId, entries);
	}

	const requirements = [...requirementsByProduct.values()]
		.map((requirement) => {
			const lots = [...(stockByProduct.get(requirement.productId) ?? [])].sort(sortStockEntries);
			let remainingUnits = requirement.requiredUnits;
			let availableUnits = 0;
			let coveredUnits = 0;
			let estimatedCost = 0;

			for (const lot of lots) {
				const lotQuantity = Number(lot.quantity ?? 0);
				if (!Number.isFinite(lotQuantity) || lotQuantity <= 0) continue;

				availableUnits += lotQuantity;
				if (remainingUnits <= 0) continue;

				const consumedUnits = Math.min(remainingUnits, lotQuantity);
				coveredUnits += consumedUnits;
				estimatedCost += consumedUnits * Number(lot.price ?? 0);
				remainingUnits -= consumedUnits;
			}

			return {
				productId: requirement.productId,
				productName: requirement.productName,
				requiredUnits: roundUnits(requirement.requiredUnits),
				availableUnits: roundUnits(availableUnits),
				coveredUnits: roundUnits(coveredUnits),
				missingUnits: roundUnits(Math.max(0, requirement.requiredUnits - coveredUnits)),
				estimatedCost: roundNumber(estimatedCost)
			};
		})
		.sort((left, right) => {
			if (left.missingUnits !== right.missingUnits) return right.missingUnits - left.missingUnits;
			return left.productName.localeCompare(right.productName);
		});

	const estimatedCost = roundNumber(requirements.reduce((sum, item) => sum + item.estimatedCost, 0));

	return {
		rangeDays: inclusiveRangeDays(menu.startDate, menu.endDate),
		plannedDays: days.length,
		calories: {
			total: roundNumber(totalCalories),
			averagePerPlannedDay: roundNumber(days.length > 0 ? totalCalories / days.length : 0),
			maxDay,
			minDay
		},
		distinctProducts: requirementsByProduct.size,
		estimatedCost,
		requirements
	};
}
