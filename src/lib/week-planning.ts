import type { EstablishedWeekMenu } from '$lib/established-week-menus';
import type { ProposedWeekMenu } from '$lib/proposed-week-menus';

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

function roundNumber(value: number) {
	return Number(value.toFixed(2));
}

function roundUnits(value: number) {
	return Number(value.toFixed(2));
}

export function buildWeekPlanningSummary(
	menu: ProposedWeekMenu | EstablishedWeekMenu | null
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

	if ('stockSummary' in menu && menu.stockSummary) {
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

	return {
		rangeDays: inclusiveRangeDays(menu.startDate, menu.endDate),
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
