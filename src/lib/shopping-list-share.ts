import type { EstablishedWeekMenuShoppingListItemResponse } from '$lib/api/established-week-menus';

type ShoppingListShareItem = Pick<EstablishedWeekMenuShoppingListItemResponse, 'productName' | 'missingUnits'>;

export type ShoppingListShareInput = {
	title: string;
	menuLabel: string;
	supermarketName?: string;
	items: ShoppingListShareItem[];
};

export type ShoppingListShareResult = {
	method: 'native' | 'clipboard' | 'cancelled';
	text: string;
};

function buildShareHeader({ title, menuLabel, supermarketName }: ShoppingListShareInput) {
	return [
		title,
		menuLabel ? `Menú: ${menuLabel}` : null,
		`Supermercado: ${supermarketName || 'Todos los supermercados'}`
	].filter(Boolean) as string[];
}

export function buildShoppingListShareText(input: ShoppingListShareInput) {
	const lines = [...buildShareHeader(input), ''];

	if (input.items.length === 0) {
		lines.push('No hay productos pendientes.');
		return lines.join('\n');
	}

	for (const item of input.items) {
		lines.push(`- ${item.productName}: ${formatUnits(item.missingUnits)} uds`);
	}

	return lines.join('\n');
}

export function shoppingListPrimaryActionLabel() {
	return isMobileDevice() ? 'Compartir' : 'Copiar';
}

export async function shareShoppingList(input: ShoppingListShareInput): Promise<ShoppingListShareResult> {
	const text = buildShoppingListShareText(input);
	const mobileDevice = isMobileDevice();

	if (mobileDevice && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
		try {
			await navigator.share({
				title: input.title,
				text
			});
			return { method: 'native', text };
		} catch (cause) {
			if (isAbortError(cause)) {
				return { method: 'cancelled', text };
			}
		}
	}

	if (!mobileDevice && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
		try {
			await navigator.clipboard.writeText(text);
			return { method: 'clipboard', text };
		} catch {
			throw new Error('No se pudo copiar la lista de compra.');
		}
	}

	if (mobileDevice && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
		try {
			await navigator.clipboard.writeText(text);
			return { method: 'clipboard', text };
		} catch {
			// If native share failed, let the caller surface a clean error.
		}
	}

	throw new Error(mobileDevice ? 'No se pudo compartir la lista de compra.' : 'No se pudo copiar la lista de compra.');
}

function formatUnits(value: number) {
	return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value);
}

function isAbortError(cause: unknown) {
	return cause instanceof DOMException ? cause.name === 'AbortError' : false;
}

function isMobileDevice() {
	if (typeof navigator === 'undefined') return false;
	if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return true;
	if (navigator.maxTouchPoints > 0) return true;
	if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
		return window.matchMedia('(pointer: coarse)').matches;
	}
	return false;
}
