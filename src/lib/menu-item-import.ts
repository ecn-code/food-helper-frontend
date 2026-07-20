export type ParsedMenuItemImport = {
	productId: number;
	quantity: number;
	price: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseMenuItemImportJson(source: string): ParsedMenuItemImport[] {
	let payload: unknown;
	try {
		payload = JSON.parse(source);
	} catch {
		throw new Error('El JSON no tiene un formato válido.');
	}

	if (!Array.isArray(payload)) {
		throw new Error('El JSON debe ser un array de productos.');
	}
	if (payload.length === 0) {
		throw new Error('El JSON debe contener al menos un producto.');
	}

	return payload.map((item, index) => {
		const row = index + 1;
		if (!isRecord(item)) {
			throw new Error(`La fila ${row} debe ser un objeto.`);
		}

		const productId = Number(item.id);
		const quantity = Number(item.quantity);
		const price = Number(item.price);
		if (!Number.isInteger(productId) || productId <= 0) {
			throw new Error(`La fila ${row} necesita un id de producto válido.`);
		}
		if (!Number.isFinite(quantity) || quantity <= 0) {
			throw new Error(`La fila ${row} necesita una cantidad mayor que 0.`);
		}
		if (!Number.isFinite(price) || price < 0) {
			throw new Error(`La fila ${row} necesita un precio igual o mayor que 0.`);
		}

		return { productId, quantity, price };
	});
}
