import type {
	EstablishedWeekMenuResponse,
	EstablishedWeekMenuShoppingListItemResponse,
	EstablishedWeekMenuStockSummaryResponse,
	EstablishedWeekMenuUsedStockResponse
} from '$lib/api/established-week-menus';
import type { ProposedWeekMenuDay, ProposedWeekMenuSection, ProposedWeekMenuProduct } from '$lib/proposed-week-menus';
import { toProposedWeekMenuDayModel } from '$lib/proposed-week-menus';
import type { NutritionalValues } from '$lib/products';

export type EstablishedWeekMenuDay = ProposedWeekMenuDay;
export type EstablishedWeekMenuSection = ProposedWeekMenuSection;
export type EstablishedWeekMenuProduct = ProposedWeekMenuProduct;

export type EstablishedWeekMenuUsedStock = EstablishedWeekMenuUsedStockResponse;
export type EstablishedWeekMenuShoppingListItem = EstablishedWeekMenuShoppingListItemResponse;
export type EstablishedWeekMenuStockSummary = EstablishedWeekMenuStockSummaryResponse;

export type EstablishedWeekMenu = {
	id: number;
	proposedWeekMenuId: number;
	startDate: string;
	endDate: string;
	days: EstablishedWeekMenuDay[];
	nutritionalValues: NutritionalValues;
	stockSummary: EstablishedWeekMenuStockSummary;
	usedStock: EstablishedWeekMenuUsedStock[];
	shoppingList: EstablishedWeekMenuShoppingListItem[];
};

export function toEstablishedWeekMenuModel(menu: EstablishedWeekMenuResponse): EstablishedWeekMenu {
	return {
		id: menu.id,
		proposedWeekMenuId: menu.proposedWeekMenuId,
		startDate: menu.startDate,
		endDate: menu.endDate,
		days: [...menu.days].sort((left, right) => left.date.localeCompare(right.date)).map(toProposedWeekMenuDayModel),
		nutritionalValues: menu.nutritionalValues,
		stockSummary: menu.stockSummary,
		usedStock: menu.usedStock,
		shoppingList: menu.shoppingList
	};
}
