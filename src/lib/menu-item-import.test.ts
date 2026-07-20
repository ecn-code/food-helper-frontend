import { describe, expect, it } from 'vitest';
import { parseMenuItemImportJson } from './menu-item-import';

describe('parseMenuItemImportJson', () => {
	it('parsea el contrato de importación', () => {
		expect(parseMenuItemImportJson('[{"id":12,"price":2.49,"quantity":3}]')).toEqual([
			{ productId: 12, price: 2.49, quantity: 3 }
		]);
	});

	it.each([
		['{', 'formato válido'],
		['{}', 'array'],
		['[]', 'al menos un producto'],
		['[{"id":0,"price":1,"quantity":1}]', 'id de producto válido'],
		['[{"id":1,"price":-1,"quantity":1}]', 'precio igual o mayor'],
		['[{"id":1,"price":1,"quantity":0}]', 'cantidad mayor']
	])('rechaza %s', (source, message) => {
		expect(() => parseMenuItemImportJson(source)).toThrow(message);
	});
});
