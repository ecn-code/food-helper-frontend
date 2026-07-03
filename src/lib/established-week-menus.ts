import type {
	EstablishedWeekMenuResponse,
	EstablishedWeekMenuShoppingListItemResponse,
	EstablishedWeekMenuStockSummaryResponse,
	EstablishedWeekMenuUsedStockResponse,
	EstablishedWeekMenuWeekStockItemResponse
} from '$lib/api/established-week-menus';
import type { ProposedWeekMenuDay, ProposedWeekMenuSection, ProposedWeekMenuProduct } from '$lib/proposed-week-menus';
import { toProposedWeekMenuDayModel } from '$lib/proposed-week-menus';
import type { NutritionalValues } from '$lib/products';
import type { NutritionalRulesEvaluation } from '$lib/api/proposed-week-menus';
import { normalizeNutritionalRulesEvaluation } from '$lib/nutritional-rules';

export type EstablishedWeekMenuDay = ProposedWeekMenuDay;
export type EstablishedWeekMenuSection = ProposedWeekMenuSection;
export type EstablishedWeekMenuProduct = ProposedWeekMenuProduct;

export type EstablishedWeekMenuUsedStock = EstablishedWeekMenuUsedStockResponse;
export type EstablishedWeekMenuWeekStockItem = EstablishedWeekMenuWeekStockItemResponse;
export type EstablishedWeekMenuShoppingListItem = EstablishedWeekMenuShoppingListItemResponse;
export type EstablishedWeekMenuStockSummary = EstablishedWeekMenuStockSummaryResponse;

export type EstablishedWeekMenu = {
	id: number;
	proposedWeekMenuId: number;
	payerUserId: number;
	payerUsername: string;
	startDate: string;
	endDate: string;
	days: EstablishedWeekMenuDay[];
	nutritionalValues: NutritionalValues;
	stockSummary: EstablishedWeekMenuStockSummary;
	usedStock: EstablishedWeekMenuUsedStock[];
	weekStock: EstablishedWeekMenuWeekStockItem[];
	shoppingList: EstablishedWeekMenuShoppingListItem[];
	nutritionalRules?: NutritionalRulesEvaluation;
};

export function toEstablishedWeekMenuModel(menu: EstablishedWeekMenuResponse): EstablishedWeekMenu {
	return {
		id: menu.id,
		proposedWeekMenuId: menu.planningId,
		payerUserId: menu.payerUserId,
		payerUsername: menu.payerUsername,
		startDate: menu.startDate,
		endDate: menu.endDate,
		days: [...menu.days].sort((left, right) => left.date.localeCompare(right.date)).map(toProposedWeekMenuDayModel),
		nutritionalValues: menu.nutritionalValues,
		stockSummary: menu.stockSummary,
		usedStock: menu.usedStock,
		weekStock: menu.weekStock,
		shoppingList: menu.shoppingList,
		nutritionalRules: normalizeNutritionalRulesEvaluation(menu.nutritionalRules)
	};
}
