/**
 * Evaluates a small arithmetic expression without executing JavaScript.
 * Accepted operators: +, -, *, / and parentheses.
 */
export function evaluateArithmeticExpression(source: string): number | null {
	const expression = source.trim().replaceAll(',', '.').replaceAll('×', '*').replaceAll('÷', '/');
	if (!expression || expression.length > 200) return null;

	let position = 0;

	function skipWhitespace() {
		while (/\s/.test(expression[position] ?? '')) position += 1;
	}

	function parseNumber(): number | null {
		skipWhitespace();
		const match = /^(?:\d+(?:\.\d*)?|\.\d+)/.exec(expression.slice(position));
		if (!match) return null;
		position += match[0].length;
		const value = Number(match[0]);
		return Number.isFinite(value) ? value : null;
	}

	function parseFactor(): number | null {
		skipWhitespace();
		const operator = expression[position];
		if (operator === '+' || operator === '-') {
			position += 1;
			const value = parseFactor();
			return value === null ? null : operator === '-' ? -value : value;
		}
		if (operator === '(') {
			position += 1;
			const value = parseExpression();
			skipWhitespace();
			if (value === null || expression[position] !== ')') return null;
			position += 1;
			return value;
		}
		return parseNumber();
	}

	function parseTerm(): number | null {
		let value = parseFactor();
		while (value !== null) {
			skipWhitespace();
			const operator = expression[position];
			if (operator !== '*' && operator !== '/') break;
			position += 1;
			const right = parseFactor();
			if (right === null || (operator === '/' && right === 0)) return null;
			value = operator === '*' ? value * right : value / right;
			if (!Number.isFinite(value)) return null;
		}
		return value;
	}

	function parseExpression(): number | null {
		let value = parseTerm();
		while (value !== null) {
			skipWhitespace();
			const operator = expression[position];
			if (operator !== '+' && operator !== '-') break;
			position += 1;
			const right = parseTerm();
			if (right === null) return null;
			value = operator === '+' ? value + right : value - right;
			if (!Number.isFinite(value)) return null;
		}
		return value;
	}

	const result = parseExpression();
	skipWhitespace();
	return result === null || position !== expression.length || !Number.isFinite(result) ? null : result;
}
