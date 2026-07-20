import { describe, expect, it } from 'vitest';
import { evaluateArithmeticExpression } from './arithmetic-expression';

describe('evaluateArithmeticExpression', () => {
	it('resuelve operadores y paréntesis respetando la precedencia', () => {
		expect(evaluateArithmeticExpression('(5+12)/10')).toBe(1.7);
		expect(evaluateArithmeticExpression('2 + 3 * 4')).toBe(14);
		expect(evaluateArithmeticExpression('2,5 × 4')).toBe(10);
	});

	it.each(['', '2/0', '2+', 'alert(1)', '2 ** 3', '(2+3'])('rechaza %s', (expression) => {
		expect(evaluateArithmeticExpression(expression)).toBeNull();
	});
});
