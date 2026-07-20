import { request } from '$lib/api/backend';
import type { EstablishedWeekMenuResponse } from '$lib/api/established-week-menus';
import type { MoneyBoxMovement } from '$lib/api/money-box';
import type { StockEntryPayload } from '$lib/api/stock';

export type MenuItemImportDestination = 'MENU_STOCK' | 'MONEY_BOX' | 'GLOBAL_STOCK';

export type MenuItemImportRequestItem = {
	productId: number;
	quantity: number;
	price: number;
	destination: MenuItemImportDestination;
	moneyBoxId?: number;
	expirationDate?: string | null;
};

export type MenuItemImportResponse = {
	menu: EstablishedWeekMenuResponse;
	moneyBoxMovements: MoneyBoxMovement[];
	globalStockEntries: StockEntryPayload[];
};

export async function importMenuItems(
	menuId: number,
	items: MenuItemImportRequestItem[],
	authorization: string
) {
	return await request<MenuItemImportResponse>(`/api/v1/menus/${menuId}/item-imports`, {
		method: 'POST',
		headers: { Authorization: authorization },
		body: JSON.stringify({ items })
	});
}
