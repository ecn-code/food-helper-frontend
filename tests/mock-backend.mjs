import http from 'node:http';

const port = Number(process.env.MOCK_BACKEND_PORT || 4010);

let nextId = 3;
let nextMediaId = 1;
let nextRecipeId = 1;
let nextStockId = 1;
let nextUserId = 2;
let users = new Map();
let issuedTokens = new Set();
const validRegistrationCode = 'foodhelper-invite';
let mediaStore = new Map();
let recipes = [];
let stockEntries = [];
let supermarkets = [];
let nextSupermarketId = 1;
let moneyMovements = [];
let nextMoneyMovementId = 1;
let manualMoneyBoxes = [];
let nextManualMoneyBoxId = 1000;
let deletedUserMoneyBoxIds = new Set();
let userWeights = [];
let nextWeightId = 1;
let nutritionalRules = {
	calories: { minimum: null, maximum: null },
	carbohydrates: { minimum: null, maximum: null },
	proteins: { minimum: null, maximum: null },
	fats: { minimum: null, maximum: null }
};
let proposedWeekMenus = [];
let establishedWeekMenus = [];
let nextProposedWeekMenuId = 1;
let nextProposedWeekMenuDayId = 1;
let nextProposedWeekMenuSectionId = 1;
let nextEstablishedWeekMenuId = 1;
const defaultProposedWeekMenuDayParts = [
	{ id: 1, name: 'Desayuno', description: 'Primera comida del dia', sortOrder: 10 },
	{ id: 2, name: 'Comida', description: 'Comida principal del dia', sortOrder: 20 },
	{ id: 3, name: 'Cena', description: 'Ultima comida del dia', sortOrder: 30 }
];
let proposedWeekMenuDayParts = defaultProposedWeekMenuDayParts.map((dayPart) => ({ ...dayPart }));
let nextProposedWeekMenuDayPartId = 4;
let products = [
	{
		id: 1,
		name: 'Apple',
		description: 'Fresh apple',
		gramsPerUnit: 150,
		defaultPrice: null,
		nutritionalValues: {
			calories: 52,
			carbohydrates: 14,
			proteins: 0.3,
			fats: 0.2
		},
		photo: null
	},
	{
		id: 2,
		name: 'Rice',
		description: 'Dry white rice',
		gramsPerUnit: 1000,
		defaultPrice: null,
		nutritionalValues: {
			calories: 130,
			carbohydrates: 28,
			proteins: 2.7,
			fats: 0.3
		},
		photo: null
	}
];

function resetAuth() {
	nextMediaId = 1;
	nextRecipeId = 1;
	nextStockId = 1;
	nextUserId = 2;
	users = new Map([
		[
			'elias',
			{
				id: 1,
				username: 'elias',
				password: 'secret-password'
			}
		]
	]);
	issuedTokens = new Set();
	mediaStore = new Map();
	recipes = [];
	stockEntries = [];
	supermarkets = [];
	nextSupermarketId = 1;
	moneyMovements = [];
	nextMoneyMovementId = 1;
	manualMoneyBoxes = [];
	nextManualMoneyBoxId = 1000;
	deletedUserMoneyBoxIds = new Set();
	userWeights = [];
	nextWeightId = 1;
	proposedWeekMenus = [];
	establishedWeekMenus = [];
	nextProposedWeekMenuId = 1;
	nextProposedWeekMenuDayId = 1;
	nextProposedWeekMenuSectionId = 1;
	nextEstablishedWeekMenuId = 1;
	proposedWeekMenuDayParts = defaultProposedWeekMenuDayParts.map((dayPart) => ({ ...dayPart }));
	nextProposedWeekMenuDayPartId = 4;
}

function moneyBoxMovements(moneyBoxId) {
	return moneyMovements.filter((item) => item.moneyBoxId === moneyBoxId).sort((a, b) => b.id - a.id);
}

function userMoneyBoxResponse(user) {
	if (deletedUserMoneyBoxIds.has(user.id)) {
		return null;
	}
	const movements = moneyBoxMovements(user.id);
	return {
		id: user.id,
		type: 'USER',
		name: user.username,
		userId: user.id,
		username: user.username,
		balance: movements.reduce((sum, item) => sum + item.amount, 0),
		movements
	};
}

function manualMoneyBoxResponse(box) {
	const movements = moneyBoxMovements(box.id);
	return {
		id: box.id,
		type: 'MANUAL',
		name: box.name,
		userId: null,
		username: null,
		balance: movements.reduce((sum, item) => sum + item.amount, 0),
		movements
	};
}

function sendJson(res, status, body) {
	res.writeHead(status, {
		'content-type': 'application/json',
		'access-control-allow-origin': '*',
		'access-control-allow-headers': 'content-type, authorization',
		'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS'
	});
	res.end(JSON.stringify(body));
}

function parseBody(req) {
	return new Promise((resolve, reject) => {
		let raw = '';
		req.on('data', (chunk) => {
			raw += chunk;
		});
		req.on('end', () => {
			if (!raw) {
				resolve({});
				return;
			}

			try {
				resolve(JSON.parse(raw));
			} catch (error) {
				reject(error);
			}
		});
		req.on('error', reject);
	});
}

function validate(payload) {
	const requiredStrings = ['name', 'description'];
	const requiredNumbers = ['calories', 'carbohydrates', 'proteins', 'fats'];

	for (const key of requiredStrings) {
		if (!payload[key] || String(payload[key]).trim() === '') {
			return `${key} must not be blank`;
		}
	}

	for (const key of requiredNumbers) {
		const value = Number(payload[key]);
		if (Number.isNaN(value)) return `${key} must be a number`;
		if (value < 0) return `${key} must be greater than or equal to 0`;
	}

	if (payload.defaultPrice !== undefined && payload.defaultPrice !== null && String(payload.defaultPrice).trim() !== '') {
		const defaultPrice = Number(payload.defaultPrice);
		if (Number.isNaN(defaultPrice)) return 'defaultPrice must be a number';
		if (defaultPrice < 0) return 'defaultPrice must be greater than or equal to 0';
	}

	return null;
}

function duplicateName(name, excludedId) {
	return products.some(
		(product) => product.name.toLowerCase() === String(name).trim().toLowerCase() && product.id !== excludedId
	);
}

function duplicateRecipeName(name, excludedId) {
	return recipes.some(
		(recipe) => recipe.name.toLowerCase() === String(name).trim().toLowerCase() && recipe.id !== excludedId
	);
}

function productById(id) {
	return products.find((product) => product.id === id) || null;
}

function stockEntryById(id) {
	return stockEntries.find((entry) => entry.id === id) || null;
}

function proposedWeekMenuDayPartById(id) {
	return proposedWeekMenuDayParts.find((dayPart) => dayPart.id === id) || null;
}

function recipeById(id) {
	return recipes.find((recipe) => recipe.id === id) || null;
}

function proposedWeekMenuById(id) {
	return proposedWeekMenus.find((menu) => menu.id === id) || null;
}

function establishedWeekMenuById(id) {
	return establishedWeekMenus.find((menu) => menu.id === id) || null;
}

function parseDateInput(value) {
	const parts = String(value).split('-').map((entry) => Number(entry));
	if (parts.length !== 3 || parts.some((entry) => Number.isNaN(entry))) return null;
	const [year, month, day] = parts;
	return new Date(Date.UTC(year, month - 1, day));
}

function toDateInputValue(date) {
	return date.toISOString().slice(0, 10);
}

function dateDifferenceInDays(startDate, endDate) {
	const start = parseDateInput(startDate);
	const end = parseDateInput(endDate);
	if (!start || !end) return Number.NaN;
	return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function clampWeekRange(startDate, endDate) {
	return Number.isFinite(dateDifferenceInDays(startDate, endDate)) && dateDifferenceInDays(startDate, endDate) >= 0 && dateDifferenceInDays(startDate, endDate) <= 15;
}

function nutritionalZero() {
	return { calories: 0, carbohydrates: 0, proteins: 0, fats: 0 };
}

function addNutrition(totals, nutritionalValues) {
	totals.calories += nutritionalValues.calories;
	totals.carbohydrates += nutritionalValues.carbohydrates;
	totals.proteins += nutritionalValues.proteins;
	totals.fats += nutritionalValues.fats;
	return totals;
}

function evaluateNutritionalRules(totals, plannedDays) {
	const divisor = plannedDays > 0 ? plannedDays : 1;
	const evaluate = (metric) => {
		const value = Number((totals[metric] / divisor).toFixed(2));
		const rule = nutritionalRules[metric];
		let status = 'WITHIN_RANGE';

		if (rule.minimum === null && rule.maximum === null) status = 'NOT_CONFIGURED';
		else if (rule.minimum !== null && value < rule.minimum) status = 'BELOW_MINIMUM';
		else if (rule.maximum !== null && value > rule.maximum) status = 'ABOVE_MAXIMUM';

		return { value, minimum: rule.minimum, maximum: rule.maximum, status };
	};

	return {
		plannedDays,
		calories: evaluate('calories'),
		carbohydrates: evaluate('carbohydrates'),
		proteins: evaluate('proteins'),
		fats: evaluate('fats')
	};
}

function normalizeMenuProduct(product) {
	const sourceProduct = productById(Number(product.productId));
	if (!sourceProduct) return null;

	const units = product.units === undefined || product.units === null ? 1 : Number(product.units);
	const grams = product.grams === undefined || product.grams === null ? sourceProduct.gramsPerUnit * units : Number(product.grams);
	const factor = grams / 100;

	return {
		productId: sourceProduct.id,
		productName: sourceProduct.name,
		units,
		grams,
		sortOrder: Number(product.sortOrder),
		nutritionalValues: {
			calories: Number((sourceProduct.nutritionalValues.calories * factor).toFixed(2)),
			carbohydrates: Number((sourceProduct.nutritionalValues.carbohydrates * factor).toFixed(2)),
			proteins: Number((sourceProduct.nutritionalValues.proteins * factor).toFixed(2)),
			fats: Number((sourceProduct.nutritionalValues.fats * factor).toFixed(2))
		}
	};
}

function proposedWeekMenuResponse(menu) {
	const days = [...menu.days]
		.sort((left, right) => left.date.localeCompare(right.date))
		.map((day) => {
			const sections = [...day.sections]
				.sort((left, right) => left.sortOrder - right.sortOrder)
				.map((section) => {
					const products = [...section.products]
						.sort((left, right) => left.sortOrder - right.sortOrder)
						.map((product) => normalizeMenuProduct(product))
						.filter(Boolean);
					const sectionTotals = products.reduce(
						(totals, product) => addNutrition(totals, product.nutritionalValues),
						nutritionalZero()
					);

					return {
						id: section.id,
						dayPartId: section.dayPartId,
						name: section.name,
						description: section.description,
						sortOrder: section.sortOrder,
						products,
						nutritionalValues: sectionTotals
					};
				});

			const dayTotals = sections.reduce(
				(totals, section) => addNutrition(totals, section.nutritionalValues),
				nutritionalZero()
			);

			return {
				id: day.id,
				date: day.date,
				sections,
				nutritionalValues: dayTotals
			};
		});

	const totals = days.reduce((accumulator, day) => addNutrition(accumulator, day.nutritionalValues), nutritionalZero());

	return {
		id: menu.id,
		startDate: menu.startDate,
		endDate: menu.endDate,
		days,
		nutritionalValues: totals,
		nutritionalRules: evaluateNutritionalRules(totals, days.length)
	};
}

function calculateMenuCoverage(menu, stockSnapshot) {
	const days = [...menu.days]
		.sort((left, right) => left.date.localeCompare(right.date))
		.map((day) => {
			const sections = [...day.sections]
				.sort((left, right) => left.sortOrder - right.sortOrder)
				.map((section) => {
					const products = [...section.products]
						.sort((left, right) => left.sortOrder - right.sortOrder)
						.map((product) => normalizeMenuProduct(product))
						.filter(Boolean);
					const sectionTotals = products.reduce(
						(totals, product) => addNutrition(totals, product.nutritionalValues),
						nutritionalZero()
					);

					return {
						id: section.id,
						dayPartId: section.dayPartId,
						name: section.name,
						description: section.description,
						sortOrder: section.sortOrder,
						products,
						nutritionalValues: sectionTotals
					};
				});

			const dayTotals = sections.reduce(
				(totals, section) => addNutrition(totals, section.nutritionalValues),
				nutritionalZero()
			);

			return {
				id: day.id,
				date: day.date,
				sections,
				nutritionalValues: dayTotals
			};
		});

	const totals = days.reduce((accumulator, day) => addNutrition(accumulator, day.nutritionalValues), nutritionalZero());
	const plannedDays = days.filter((day) => day.sections.some((section) => section.products.length > 0));
	const caloriesByDay = plannedDays.map((day) => ({ date: day.date, calories: day.nutritionalValues.calories }));
	const totalRequirements = new Map();
	const stockByProduct = new Map();

	for (const entry of stockSnapshot) {
		const entries = stockByProduct.get(entry.productId) ?? [];
		entries.push(entry);
		stockByProduct.set(entry.productId, entries);
	}

	for (const day of plannedDays) {
		for (const section of day.sections) {
			for (const product of section.products) {
				const requiredUnits = product.units ?? 1;
				const current = totalRequirements.get(product.productId) ?? {
					productId: product.productId,
					productName: product.productName,
					requiredUnits: 0
				};
				current.requiredUnits += Number.isFinite(requiredUnits) ? requiredUnits : 0;
				totalRequirements.set(product.productId, current);
			}
		}
	}

	const requirements = [...totalRequirements.values()].map((requirement) => {
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
			requiredUnits: Number(requirement.requiredUnits.toFixed(2)),
			availableUnits: Number(availableUnits.toFixed(2)),
			coveredUnits: Number(coveredUnits.toFixed(2)),
			missingUnits: Number(Math.max(0, requirement.requiredUnits - coveredUnits).toFixed(2)),
			estimatedCost: Number(estimatedCost.toFixed(2))
		};
	});

	const stockSummary = {
		plannedDays: plannedDays.length,
		distinctProducts: totalRequirements.size,
		calories: {
			averagePerPlannedDay: Number(
				(plannedDays.length > 0 ? caloriesByDay.reduce((sum, day) => sum + day.calories, 0) / plannedDays.length : 0).toFixed(2)
			),
			maxDay: caloriesByDay.reduce((currentMax, day) => {
				if (!currentMax || day.calories > currentMax.calories) return day;
				return currentMax;
			}, null),
			minDay: caloriesByDay.reduce((currentMin, day) => {
				if (!currentMin || day.calories < currentMin.calories) return day;
				return currentMin;
			}, null)
		},
		estimatedCost: Number(requirements.reduce((sum, item) => sum + item.estimatedCost, 0).toFixed(2)),
		requirements: requirements.sort((left, right) => {
			if (left.missingUnits !== right.missingUnits) return right.missingUnits - left.missingUnits;
			return left.productName.localeCompare(right.productName);
		})
	};

	const stockConsumption = new Map();

	for (const requirement of requirements) {
		let remainingUnits = requirement.requiredUnits;
		const lots = [...(stockByProduct.get(requirement.productId) ?? [])].sort(sortStockEntries);

		for (const lot of lots) {
			const lotQuantity = Number(lot.quantity ?? 0);
			if (!Number.isFinite(lotQuantity) || lotQuantity <= 0 || remainingUnits <= 0) continue;

			const consumedUnits = Math.min(remainingUnits, lotQuantity);
			const currentConsumption = stockConsumption.get(lot.id) ?? 0;
			stockConsumption.set(lot.id, currentConsumption + consumedUnits);
			remainingUnits -= consumedUnits;
		}
	}

	const usedStock = [...stockSnapshot]
		.sort(sortStockEntries)
		.flatMap((lot) => {
			const consumedUnits = stockConsumption.get(lot.id) ?? 0;
			if (consumedUnits <= 0) return [];
			return [
				{
					stockEntryId: lot.id,
					productId: lot.productId,
					productName: lot.productName,
					usedUnits: Number(consumedUnits.toFixed(2)),
					price: Number(lot.price.toFixed(2)),
					totalCost: Number((consumedUnits * lot.price).toFixed(2)),
					expirationDate: lot.expirationDate,
					entryDate: lot.entryDate
				}
			];
		});

	const shoppingList = requirements
		.filter((requirement) => requirement.missingUnits > 0)
		.map((requirement) => ({
			productId: requirement.productId,
			productName: requirement.productName,
			missingUnits: requirement.missingUnits
		}));

	for (const entry of stockEntries) {
		const consumedUnits = stockConsumption.get(entry.id) ?? 0;
		if (consumedUnits <= 0) continue;
		entry.quantity = Number((entry.quantity - consumedUnits).toFixed(2));
	}
	stockEntries = stockEntries.filter((entry) => entry.quantity > 0);

	return {
		days,
		totals,
		stockSummary,
		usedStock,
		shoppingList
	};
}

function establishedWeekMenuResponse(menu) {
	return {
		id: menu.id,
		planningId: menu.proposedWeekMenuId,
		proposedWeekMenuId: menu.proposedWeekMenuId,
		payerUserId: menu.payerUserId ?? 1,
		payerUsername: menu.payerUsername ?? 'elias',
		startDate: menu.startDate,
		endDate: menu.endDate,
		days: menu.days,
		nutritionalValues: menu.nutritionalValues,
		stockSummary: menu.stockSummary,
		usedStock: menu.usedStock,
		shoppingList: menu.shoppingList,
		nutritionalRules: evaluateNutritionalRules(menu.nutritionalValues, menu.days.length)
	};
}

function planningMenuResponse(menu) {
	const established = establishedWeekMenus.find((item) => item.proposedWeekMenuId === menu.id);
	return {
		id: menu.id,
		startDate: menu.startDate,
		endDate: menu.endDate,
		plannedDays: menu.days.length,
		state: established ? (established.stats ? 'CLOSED' : 'ESTABLISHED') : 'DRAFT',
		menuId: established?.id ?? null
	};
}

function userResponse(user) {
	return {
		id: user.id,
		username: user.username
	};
}

function userWeightResponse(weight) {
	return {
		...weight,
		recordedAt: weight.recordedAt ?? weight.measuredAt,
		measuredAt: weight.recordedAt ?? weight.measuredAt
	};
}

function userHistoryEntryResponse(menu) {
	return {
		menuId: menu.id,
		startDate: menu.startDate,
		endDate: menu.endDate,
		stats: menu.stats?.period ?? menuStatsResponse(menu).period
	};
}

function historyRangeResponse(userId, from, to) {
	const fromDate = new Date(from);
	const toDate = new Date(to);
	const menus = establishedWeekMenus
		.filter((menu) => Array.isArray(menu.personIds) && menu.personIds.includes(userId))
		.filter((menu) => menu.stats && !Number.isNaN(Date.parse(menu.startDate)))
		.filter((menu) => {
			const menuDate = new Date(menu.startDate);
			return menuDate >= fromDate && menuDate <= toDate;
		})
		.sort((left, right) => left.startDate.localeCompare(right.startDate) || left.id - right.id);
	const entries = menus.map(userHistoryEntryResponse);
	let maxDay = null;
	let minDay = null;
	let averageCalories = 0;
	let averageCarbohydrates = 0;
	let averageProteins = 0;
	let averageFats = 0;
	let moneySpent = 0;
	for (const entry of entries) {
		if (entry.stats.maxDay && (!maxDay || entry.stats.maxDay.calories > maxDay.calories)) {
			maxDay = entry.stats.maxDay;
		}
		if (entry.stats.minDay && (!minDay || entry.stats.minDay.calories < minDay.calories)) {
			minDay = entry.stats.minDay;
		}
		averageCalories += Number(entry.stats.averageCalories ?? 0);
		averageCarbohydrates += Number(entry.stats.averageCarbohydrates ?? 0);
		averageProteins += Number(entry.stats.averageProteins ?? 0);
		averageFats += Number(entry.stats.averageFats ?? 0);
		moneySpent += Number(entry.stats.moneySpent ?? 0);
	}
	const count = entries.length || 1;
	return {
		personId: userId,
		personName: [...users.values()].find((user) => user.id === userId)?.username ?? `user-${userId}`,
		from,
		to,
		totals: {
			maxDay,
			minDay,
			averageCalories: Number((averageCalories / count).toFixed(2)),
			averageCarbohydrates: Number((averageCarbohydrates / count).toFixed(2)),
			averageProteins: Number((averageProteins / count).toFixed(2)),
			averageFats: Number((averageFats / count).toFixed(2)),
			moneySpent: Number(moneySpent.toFixed(2))
		},
		menus: entries
	};
}

function parseRangeQuery(url) {
	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');
	if (!from || !to) return null;
	if (Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to))) return null;
	if (new Date(from) > new Date(to)) return null;
	return { from, to };
}

function weightRecordedAt(payload) {
	return String(payload?.recordedAt ?? payload?.measuredAt ?? '');
}

function menuStatsResponse(menu) {
	const days = menu.days ?? [];
	const count = Math.max(days.length, 1);
	const ordered = [...days].sort((a, b) => Number(a.nutritionalValues?.calories ?? 0) - Number(b.nutritionalValues?.calories ?? 0));
	const period = {
		maxDay: ordered.length ? { date: ordered.at(-1).date, calories: ordered.at(-1).nutritionalValues.calories } : null,
		minDay: ordered.length ? { date: ordered[0].date, calories: ordered[0].nutritionalValues.calories } : null,
		averageCalories: Number(menu.nutritionalValues.calories ?? 0) / count,
		averageCarbohydrates: Number(menu.nutritionalValues.carbohydrates ?? 0) / count,
		averageProteins: Number(menu.nutritionalValues.proteins ?? 0) / count,
		averageFats: Number(menu.nutritionalValues.fats ?? 0) / count,
		moneySpent: Number(menu.stockSummary.estimatedCost ?? 0)
	};
	return { menuId: menu.id, period, month: { ...period } };
}

function validateProposedWeekMenuPayload(payload) {
	if (!payload.startDate || !payload.endDate) return 'startDate and endDate are required';
	if (Number.isNaN(Date.parse(payload.startDate)) || Number.isNaN(Date.parse(payload.endDate))) {
		return 'startDate and endDate must be valid dates';
	}
	if (!clampWeekRange(payload.startDate, payload.endDate)) return 'range must fit within 16 days inclusive';
	return null;
}

function validateDayPartPayload(payload) {
	if (!payload.name || String(payload.name).trim() === '') return 'name must not be blank';
	if (!payload.description || String(payload.description).trim() === '') return 'description must not be blank';
	if (Number.isNaN(Number(payload.sortOrder)) || Number(payload.sortOrder) < 0) {
		return 'sortOrder must be greater than or equal to 0';
	}
	return null;
}

function validateProposedDayPayload(payload, menu) {
	if (!payload.date) return 'date is required';
	if (Number.isNaN(Date.parse(payload.date))) return 'date must be a valid date';
	if (payload.date < menu.startDate || payload.date > menu.endDate) {
		return 'date must be inside the proposed week range';
	}
	if (!Array.isArray(payload.sections) || payload.sections.length === 0) return 'sections must not be empty';

	const sectionDayPartIds = new Set();
	for (const section of payload.sections) {
		const dayPartId = Number(section.dayPartId);
		if (Number.isNaN(dayPartId) || dayPartId <= 0) return 'dayPartId must be a valid identifier';
		if (!proposedWeekMenuDayPartById(dayPartId)) return 'proposed week menu day part not found';
		if (sectionDayPartIds.has(dayPartId)) return 'dayPartId must be unique per day';
		sectionDayPartIds.add(dayPartId);

		if (!Array.isArray(section.products) || section.products.length === 0) {
			return 'section products must not be empty';
		}
		const productSortOrders = new Set();
		for (const product of section.products) {
			if (!productById(Number(product.productId))) return 'proposed week product not found';
			if (Number.isNaN(Number(product.sortOrder)) || Number(product.sortOrder) < 0) {
				return 'product sortOrder must be greater than or equal to 0';
			}
			if (productSortOrders.has(Number(product.sortOrder))) {
				return 'Day parts and product sort orders must be unique within their parent';
			}
			productSortOrders.add(Number(product.sortOrder));
			if (product.units !== undefined && product.units !== null && (Number.isNaN(Number(product.units)) || Number(product.units) <= 0)) {
				return 'product units must be greater than 0';
			}
			if (product.grams !== undefined && product.grams !== null && (Number.isNaN(Number(product.grams)) || Number(product.grams) <= 0)) {
				return 'product grams must be greater than 0';
			}
		}
	}

	return null;
}

function sortStockEntries(entries) {
	return [...entries].sort((a, b) => {
		if (a.expirationDate && b.expirationDate) {
			const byExpiration = String(a.expirationDate).localeCompare(String(b.expirationDate));
			if (byExpiration !== 0) return byExpiration;
		} else if (a.expirationDate) {
			return -1;
		} else if (b.expirationDate) {
			return 1;
		}

		const byEntryDate = a.entryDate.localeCompare(b.entryDate);
		if (byEntryDate !== 0) return byEntryDate;
		return a.id - b.id;
	});
}

function ingredientPayload(product, grams) {
	const factor = grams / 100;
	return {
		productId: product.id,
		productName: product.name,
		grams,
		nutritionalValues: {
			calories: Number((product.nutritionalValues.calories * factor).toFixed(2)),
			carbohydrates: Number((product.nutritionalValues.carbohydrates * factor).toFixed(2)),
			proteins: Number((product.nutritionalValues.proteins * factor).toFixed(2)),
			fats: Number((product.nutritionalValues.fats * factor).toFixed(2))
		}
	};
}

function recipeTotals(ingredients) {
	return ingredients.reduce(
		(totals, ingredient) => {
			totals.calories += ingredient.nutritionalValues.calories;
			totals.carbohydrates += ingredient.nutritionalValues.carbohydrates;
			totals.proteins += ingredient.nutritionalValues.proteins;
			totals.fats += ingredient.nutritionalValues.fats;
			return totals;
		},
		{ calories: 0, carbohydrates: 0, proteins: 0, fats: 0 }
	);
}

function recipeResponse(recipe) {
	const ingredients = recipe.ingredients.map((ingredient) => ingredientPayload(productById(ingredient.productId), ingredient.grams));
	const totals = recipeTotals(ingredients);
	return {
		id: recipe.id,
		name: recipe.name,
		description: recipe.description,
		instructions: recipe.instructions,
		nutritionalValues: totals,
		products: ingredients,
		derivedProduct: recipe.derivedProduct,
		photo: recipe.photo
	};
}

function recipeMatchesFilters(recipe, url) {
	const search = normalizeSearch(url.searchParams.get('search'));
	if (search) {
		const ingredientNames = recipe.ingredients
			.map((ingredient) => ingredientPayload(productById(ingredient.productId), ingredient.grams).productName)
			.join(' ');
		const haystack = normalizeSearch(`${recipe.name} ${recipe.description} ${recipe.instructions} ${ingredientNames}`);
		if (!haystack.includes(search)) return false;
	}

	const derived = url.searchParams.get('derived') ?? 'all';
	if (derived === 'with-derived' && !recipe.derivedProduct) return false;
	if (derived === 'without-derived' && recipe.derivedProduct) return false;

	for (const metric of ['calories', 'carbohydrates', 'proteins', 'fats']) {
		const min = parseNumericFilter(url.searchParams.get(`${metric}Min`));
		const max = parseNumericFilter(url.searchParams.get(`${metric}Max`));
		const value = recipeResponse(recipe).nutritionalValues[metric];

		if (min !== null && value < min) return false;
		if (max !== null && value > max) return false;
	}

	return true;
}

function paginate(items, url) {
	const page = Math.max(0, Number.parseInt(url.searchParams.get('page') ?? '0', 10) || 0);
	const size = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get('size') ?? '20', 10) || 20));
	const totalElements = items.length;
	const totalPages = Math.max(1, Math.ceil(totalElements / size));
	const start = page * size;
	const end = start + size;

	return {
		items: items.slice(start, end),
		page,
		size,
		totalElements,
		totalPages
	};
}

function normalizeSearch(value) {
	return String(value ?? '')
		.trim()
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
}

function parseNumericFilter(value) {
	if (value === null || value === undefined || String(value).trim() === '') return null;
	const numericValue = Number(value);
	return Number.isNaN(numericValue) ? null : numericValue;
}

function productMatchesFilters(product, url) {
	const search = normalizeSearch(url.searchParams.get('search'));
	if (search) {
		const haystack = normalizeSearch(`${product.name} ${product.description}`);
		if (!haystack.includes(search)) return false;
	}

	for (const metric of ['calories', 'carbohydrates', 'proteins', 'fats']) {
		const min = parseNumericFilter(url.searchParams.get(`${metric}Min`));
		const max = parseNumericFilter(url.searchParams.get(`${metric}Max`));
		const value = product.nutritionalValues[metric];

		if (min !== null && value < min) return false;
		if (max !== null && value > max) return false;
	}

	return true;
}

function filterProducts(url) {
	return products.filter((product) => productMatchesFilters(product, url));
}

function validateRecipePayload(payload) {
	if (!payload.name || String(payload.name).trim() === '') return 'name must not be blank';
	if (!payload.description || String(payload.description).trim() === '') return 'description must not be blank';
	if (!payload.instructions || String(payload.instructions).trim() === '') return 'instructions must not be blank';
	if (!Array.isArray(payload.products) || payload.products.length === 0) return 'products must not be empty';

	for (const ingredient of payload.products) {
		const product = productById(Number(ingredient.productId));
		const grams = Number(ingredient.grams);
		if (!product) return 'ingredient product not found';
		if (Number.isNaN(grams) || grams <= 0) return 'ingredient grams must be greater than 0';
	}

	return null;
}

function validateDerivedProductPayload(payload) {
	const producedGrams = Number(payload.producedGrams);
	const gramsPerUnit = Number(payload.gramsPerUnit);
	if (Number.isNaN(producedGrams) || producedGrams <= 0) return 'producedGrams must be greater than 0';
	if (Number.isNaN(gramsPerUnit) || gramsPerUnit <= 0) return 'gramsPerUnit must be greater than 0';
	return null;
}

function stockResponse(entry) {
	return {
		id: entry.id,
		productId: entry.productId,
		productName: entry.productName,
		quantity: entry.quantity,
		price: entry.price,
		expirationDate: entry.expirationDate,
		entryDate: entry.entryDate
	};
}

function productStatsResponse() {
	const stockByProduct = new Map();
	const batchCountByProduct = new Map();
	const nearestExpirationByProduct = new Map();
	const expirations = [];

	for (const entry of stockEntries) {
		stockByProduct.set(entry.productId, (stockByProduct.get(entry.productId) ?? 0) + entry.quantity);
		batchCountByProduct.set(entry.productId, (batchCountByProduct.get(entry.productId) ?? 0) + 1);

		if (!entry.expirationDate) continue;
		expirations.push(entry);

		const current = nearestExpirationByProduct.get(entry.productId);
		if (!current || String(entry.expirationDate) < String(current.expirationDate)) {
			nearestExpirationByProduct.set(entry.productId, entry);
		}
	}

	const byMetric = (metric) => {
		if (products.length === 0) {
			return {
				productId: 0,
				productName: 'Sin datos',
				value: 0,
				message: 'Sin productos'
			};
		}

		const top = [...products].sort((a, b) => {
			if (b.nutritionalValues[metric] !== a.nutritionalValues[metric]) {
				return b.nutritionalValues[metric] - a.nutritionalValues[metric];
			}
			return a.id - b.id;
		})[0];

		return {
			productId: top.id,
			productName: top.name,
			value: top.nutritionalValues[metric],
			message: null
		};
	};

	const earliestExpiration = expirations.sort((a, b) => {
		const byDate = String(a.expirationDate).localeCompare(String(b.expirationDate));
		if (byDate !== 0) return byDate;
		return a.id - b.id;
	})[0];

	return {
		caloriesTop: byMetric('calories'),
		carbohydratesTop: byMetric('carbohydrates'),
		proteinsTop: byMetric('proteins'),
		fatsTop: byMetric('fats'),
		stock: {
			totalQuantity: stockEntries.reduce((sum, entry) => sum + entry.quantity, 0),
			batchCount: stockEntries.length
		},
		earliestExpiration: earliestExpiration
			? {
					productId: earliestExpiration.productId,
					productName: earliestExpiration.productName,
					quantity: earliestExpiration.quantity,
					expirationDate: earliestExpiration.expirationDate,
					message: null
				}
			: {
					productId: null,
					productName: 'Sin lotes',
					quantity: null,
					expirationDate: null,
					message: 'Sin lotes'
				},
		summaries: products.map((product) => ({
			productId: product.id,
			productName: product.name,
			totalQuantity: stockByProduct.get(product.id) ?? 0,
			batchCount: batchCountByProduct.get(product.id) ?? 0,
			nextExpirationDate: nearestExpirationByProduct.get(product.id)?.expirationDate ?? null,
			nextExpirationMessage: nearestExpirationByProduct.get(product.id)?.expirationDate ? null : 'Sin lotes'
		}))
	};
}

function recipeStatsResponse() {
	const activeRecipes = recipes.length;
	const totalIngredients = recipes.reduce((sum, recipe) => sum + recipe.ingredients.length, 0);
	const totalCalories = recipes.reduce((sum, recipe) => sum + recipeResponse(recipe).nutritionalValues.calories, 0);
	const recipesWithDerivedProduct = recipes.filter((recipe) => recipe.derivedProduct).length;

	return {
		activeRecipes,
		averageCalories: activeRecipes === 0 ? 0 : Number((totalCalories / activeRecipes).toFixed(2)),
		totalIngredients,
		recipesWithDerivedProduct
	};
}

function validateStockPayload(payload, productId) {
	const quantity = Number(payload.quantity);
	const price = Number(payload.price);
	if (Number.isNaN(quantity) || quantity <= 0) return 'quantity must be greater than 0';
	if (Number.isNaN(price) || price < 0) return 'price must be greater than or equal to 0';
	if (!payload.entryDate || String(payload.entryDate).trim() === '') return 'entryDate must not be blank';
	if (!productById(productId)) return 'product not found';
	if (payload.expirationDate && Number.isNaN(Date.parse(payload.expirationDate))) return 'expirationDate must be a valid date';
	return null;
}

function errorBody(status, error, message, path) {
	return {
		timestamp: new Date().toISOString(),
		status,
		error,
		message,
		path
	};
}

function authResponse(user) {
	const token = `mock-token-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
	issuedTokens.add(token);
	return {
		userId: user.id,
		username: user.username,
		accessToken: token,
		tokenType: 'Bearer',
		expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
	};
}

function authError(path) {
	return errorBody(401, 'Unauthorized', 'Missing or invalid Bearer token', path);
}

function hasBearerToken(req) {
	const authorization = req.headers.authorization || '';
	if (!authorization.startsWith('Bearer ')) return false;
	return issuedTokens.has(authorization.slice('Bearer '.length));
}

function requireAuth(req, res, path) {
	if (hasBearerToken(req)) return true;
	sendJson(res, 401, authError(path));
	return false;
}

function reset() {
	resetAuth();
	nextId = 3;
	products = [
		{
			id: 1,
			name: 'Apple',
			description: 'Fresh apple',
			gramsPerUnit: 150,
			defaultPrice: null,
			nutritionalValues: {
				calories: 52,
				carbohydrates: 14,
				proteins: 0.3,
				fats: 0.2
			},
			photo: null
		},
		{
			id: 2,
			name: 'Rice',
			description: 'Dry white rice',
			gramsPerUnit: 1000,
			defaultPrice: null,
			nutritionalValues: {
				calories: 130,
				carbohydrates: 28,
				proteins: 2.7,
				fats: 0.3
			},
			photo: null
		}
	];
	recipes = [];
	stockEntries = [];
	nutritionalRules = {
		calories: { minimum: null, maximum: null },
		carbohydrates: { minimum: null, maximum: null },
		proteins: { minimum: null, maximum: null },
		fats: { minimum: null, maximum: null }
	};
}

function createMediaRecord(upload) {
	const base64Data = String(upload?.base64Data ?? '');
	const buffer = Buffer.from(base64Data, 'base64');
	const id = nextMediaId++;
	const media = {
		id,
		fileName: String(upload?.fileName ?? `media-${id}`).trim(),
		contentType: String(upload?.contentType ?? 'application/octet-stream').trim(),
		sizeBytes: buffer.length,
		width: 0,
		height: 0,
		buffer
	};
	mediaStore.set(id, media);
	return `/api/v1/media/${id}?expiresAt=${Math.floor(Date.now() / 1000) + 3600}&signature=${Math.random().toString(36).slice(2)}`;
}

const server = http.createServer(async (req, res) => {
	if (!req.url) {
		sendJson(res, 404, errorBody(404, 'Not Found', 'Unknown route', ''));
		return;
	}

	const url = new URL(req.url, `http://127.0.0.1:${port}`);

	if (req.method === 'OPTIONS') {
		res.writeHead(204, {
			'access-control-allow-origin': '*',
			'access-control-allow-headers': 'content-type, authorization',
			'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
			'access-control-max-age': '86400'
		});
		res.end();
		return;
	}

	if (req.method === 'GET' && url.pathname === '/api/v1/health') {
		sendJson(res, 200, { status: 'UP' });
		return;
	}

	const mediaMatch = url.pathname.match(/^\/api\/v1\/media\/(\d+)$/);
	if (req.method === 'GET' && mediaMatch) {
		const id = Number(mediaMatch[1]);
		const media = mediaStore.get(id);
		if (!media) {
			sendJson(res, 404, errorBody(404, 'Not Found', 'Media not found', url.pathname));
			return;
		}

		res.writeHead(200, {
			'content-type': media.contentType,
			'content-length': media.buffer.length,
			'access-control-allow-origin': '*'
		});
		res.end(media.buffer);
		return;
	}

	if (req.method === 'POST' && url.pathname === '/__reset') {
		reset();
		sendJson(res, 200, { ok: true });
		return;
	}

	if (req.method === 'POST' && url.pathname === '/api/v1/auth/register') {
		const payload = await parseBody(req).catch(() => null);
		if (!payload) {
			sendJson(res, 400, errorBody(400, 'Bad Request', 'Malformed JSON', url.pathname));
			return;
		}

		const username = String(payload.username ?? '').trim();
		const password = String(payload.password ?? '');
		const registrationCode = String(payload.registrationCode ?? '').trim();
		if (username.length < 3 || username.length > 80) {
			sendJson(res, 400, errorBody(400, 'Bad Request', 'username size must be between 3 and 80', url.pathname));
			return;
		}
		if (password.length < 8 || password.length > 128) {
			sendJson(res, 400, errorBody(400, 'Bad Request', 'password size must be between 8 and 128', url.pathname));
			return;
		}
		if (!registrationCode || registrationCode.length > 128) {
			sendJson(
				res,
				400,
				errorBody(400, 'Bad Request', 'registrationCode size must be between 1 and 128', url.pathname)
			);
			return;
		}
		if (registrationCode !== validRegistrationCode) {
			sendJson(res, 400, errorBody(400, 'Bad Request', 'Invalid registration code', url.pathname));
			return;
		}
		if (users.has(username)) {
			sendJson(res, 409, errorBody(409, 'Conflict', 'Username already exists', url.pathname));
			return;
		}

		const user = { id: nextUserId++, username, password };
		users.set(username, user);
		sendJson(res, 201, authResponse(user));
		return;
	}

	if (req.method === 'POST' && url.pathname === '/api/v1/auth/login') {
		const payload = await parseBody(req).catch(() => null);
		if (!payload) {
			sendJson(res, 400, errorBody(400, 'Bad Request', 'Malformed JSON', url.pathname));
			return;
		}

		const username = String(payload.username ?? '').trim();
		const password = String(payload.password ?? '');
		const user = users.get(username);
		if (!user || user.password !== password) {
			sendJson(res, 400, errorBody(400, 'Bad Request', 'Invalid username or password', url.pathname));
			return;
		}

		sendJson(res, 200, authResponse(user));
		return;
	}

	if (
		(url.pathname.startsWith('/api/v1/products') ||
			url.pathname.startsWith('/api/v1/recipes') ||
			url.pathname.startsWith('/api/v1/stock') ||
			url.pathname.startsWith('/api/v1/supermarkets') ||
			url.pathname.startsWith('/api/v1/money-boxes') ||
			url.pathname.startsWith('/api/v1/users') ||
			url.pathname.startsWith('/api/v1/nutritional-rules') ||
			url.pathname.startsWith('/api/v1/planning') ||
			url.pathname.startsWith('/api/v1/menus') ||
			url.pathname.startsWith('/api/v1/proposed-week-menus') ||
			url.pathname.startsWith('/api/v1/proposed-week-menu-day-parts')) &&
		!requireAuth(req, res, url.pathname)
	) {
		return;
	}

	if (url.pathname === '/api/v1/supermarkets' && req.method === 'GET') {
		sendJson(res, 200, [...supermarkets].sort((a, b) => a.name.localeCompare(b.name)));
		return;
	}
	if (url.pathname === '/api/v1/supermarkets' && req.method === 'POST') {
		const payload = await parseBody(req);
		const created = { id: nextSupermarketId++, name: String(payload.name ?? '').trim() };
		supermarkets.push(created); sendJson(res, 201, created); return;
	}
	const supermarketMatch = url.pathname.match(/^\/api\/v1\/supermarkets\/(\d+)$/);
	if (supermarketMatch) {
		const id = Number(supermarketMatch[1]); const index = supermarkets.findIndex((item) => item.id === id);
		if (index < 0) { sendJson(res, 404, errorBody(404, 'Not Found', 'Supermarket not found', url.pathname)); return; }
		if (req.method === 'PUT') { const payload = await parseBody(req); supermarkets[index] = { id, name: String(payload.name ?? '').trim() }; sendJson(res, 200, supermarkets[index]); return; }
		if (req.method === 'DELETE') { supermarkets.splice(index, 1); res.writeHead(204, { 'access-control-allow-origin': '*' }); res.end(); return; }
	}
	if (url.pathname === '/api/v1/nutritional-rules') {
		if (req.method === 'GET') { sendJson(res, 200, nutritionalRules); return; }
		if (req.method === 'PUT') { nutritionalRules = await parseBody(req); sendJson(res, 200, nutritionalRules); return; }
	}
	if (req.method === 'GET' && url.pathname === '/api/v1/users') {
		sendJson(res, 200, [...users.values()].map(userResponse));
		return;
	}
	const userHistoryMatch = url.pathname.match(/^\/api\/v1\/users\/(\d+)\/menu-history$/);
	if (userHistoryMatch && req.method === 'GET') {
		const userId = Number(userHistoryMatch[1]);
		if (![...users.values()].some((user) => user.id === userId)) {
			sendJson(res, 404, errorBody(404, 'Not Found', 'User not found', url.pathname));
			return;
		}
		const range = parseRangeQuery(url);
		if (!range) {
			sendJson(res, 400, errorBody(400, 'Bad Request', 'from and to must be valid date-time values', url.pathname));
			return;
		}
		sendJson(res, 200, historyRangeResponse(userId, range.from, range.to));
		return;
	}
	const userWeightsMatch = url.pathname.match(/^\/api\/v1\/users\/(\d+)\/weights$/);
	if (userWeightsMatch && req.method === 'GET') {
		const userId = Number(userWeightsMatch[1]);
		if (![...users.values()].some((user) => user.id === userId)) {
			sendJson(res, 404, errorBody(404, 'Not Found', 'User not found', url.pathname));
			return;
		}
		const range = parseRangeQuery(url);
		if (!range) {
			sendJson(res, 400, errorBody(400, 'Bad Request', 'from and to must be valid date-time values', url.pathname));
			return;
		}
		sendJson(
			res,
			200,
			userWeights
				.filter((weight) => weight.userId === userId)
				.filter((weight) => {
					const recordedAt = new Date(weight.recordedAt ?? weight.measuredAt);
					return recordedAt >= new Date(range.from) && recordedAt <= new Date(range.to);
				})
				.sort((left, right) => new Date(left.recordedAt ?? left.measuredAt).getTime() - new Date(right.recordedAt ?? right.measuredAt).getTime() || left.id - right.id)
				.map(userWeightResponse)
		);
		return;
	}
	if (userWeightsMatch && req.method === 'POST') {
		const userId = Number(userWeightsMatch[1]);
		if (![...users.values()].some((user) => user.id === userId)) {
			sendJson(res, 404, errorBody(404, 'Not Found', 'User not found', url.pathname));
			return;
		}
		const payload = await parseBody(req);
		const weight = Number(payload.weight);
		if (!Number.isFinite(weight) || weight <= 0) {
			sendJson(res, 400, errorBody(400, 'Bad Request', 'weight must be greater than 0', url.pathname));
			return;
		}
		const recordedAt = weightRecordedAt(payload);
		if (!recordedAt || Number.isNaN(Date.parse(recordedAt))) {
			sendJson(res, 400, errorBody(400, 'Bad Request', 'recordedAt must be a valid date', url.pathname));
			return;
		}
		const created = {
			id: nextWeightId++,
			userId,
			weight: Number(weight.toFixed(1)),
			recordedAt,
			measuredAt: recordedAt,
			notes: payload.notes ? String(payload.notes) : null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};
		userWeights.push(created);
		sendJson(res, 201, userWeightResponse(created));
		return;
	}
	const weightUserMatch = url.pathname.match(/^\/api\/v1\/users\/(\d+)\/weights\/(\d+)$/);
	if (weightUserMatch && req.method === 'PUT') {
		const userId = Number(weightUserMatch[1]);
		const id = Number(weightUserMatch[2]);
		const existingIndex = userWeights.findIndex((weight) => weight.id === id && weight.userId === userId);
		if (existingIndex < 0) {
			sendJson(res, 404, errorBody(404, 'Not Found', 'Weight not found', url.pathname));
			return;
		}
		const payload = await parseBody(req);
		const weight = Number(payload.weight);
		if (!Number.isFinite(weight) || weight <= 0) {
			sendJson(res, 400, errorBody(400, 'Bad Request', 'weight must be greater than 0', url.pathname));
			return;
		}
		const recordedAt = weightRecordedAt(payload);
		if (!recordedAt || Number.isNaN(Date.parse(recordedAt))) {
			sendJson(res, 400, errorBody(400, 'Bad Request', 'recordedAt must be a valid date', url.pathname));
			return;
		}
		userWeights[existingIndex] = {
			...userWeights[existingIndex],
			weight: Number(weight.toFixed(1)),
			recordedAt,
			measuredAt: recordedAt,
			notes: payload.notes ? String(payload.notes) : null,
			updatedAt: new Date().toISOString()
		};
		sendJson(res, 200, userWeightResponse(userWeights[existingIndex]));
		return;
	}
	if (weightUserMatch && req.method === 'DELETE') {
		const userId = Number(weightUserMatch[1]);
		const id = Number(weightUserMatch[2]);
		const index = userWeights.findIndex((weight) => weight.id === id && weight.userId === userId);
		if (index < 0) {
			sendJson(res, 404, errorBody(404, 'Not Found', 'Weight not found', url.pathname));
			return;
		}
		userWeights.splice(index, 1);
		res.writeHead(204, { 'access-control-allow-origin': '*' }); res.end(); return;
	}
	const weightMatch = url.pathname.match(/^\/api\/v1\/weights\/(\d+)$/);
	if (weightMatch && req.method === 'PUT') {
		const id = Number(weightMatch[1]);
		const existingIndex = userWeights.findIndex((weight) => weight.id === id);
		if (existingIndex < 0) {
			sendJson(res, 404, errorBody(404, 'Not Found', 'Weight not found', url.pathname));
			return;
		}
		const payload = await parseBody(req);
		const weight = Number(payload.weight);
		if (!Number.isFinite(weight) || weight <= 0) {
			sendJson(res, 400, errorBody(400, 'Bad Request', 'weight must be greater than 0', url.pathname));
			return;
		}
		const recordedAt = weightRecordedAt(payload);
		if (!recordedAt || Number.isNaN(Date.parse(recordedAt))) {
			sendJson(res, 400, errorBody(400, 'Bad Request', 'recordedAt must be a valid date', url.pathname));
			return;
		}
		userWeights[existingIndex] = {
			...userWeights[existingIndex],
			weight: Number(weight.toFixed(1)),
			recordedAt,
			measuredAt: recordedAt,
			notes: payload.notes ? String(payload.notes) : null,
			updatedAt: new Date().toISOString()
		};
		sendJson(res, 200, userWeightResponse(userWeights[existingIndex]));
		return;
	}
	if (weightMatch && req.method === 'DELETE') {
		const id = Number(weightMatch[1]);
		const index = userWeights.findIndex((weight) => weight.id === id);
		if (index < 0) {
			sendJson(res, 404, errorBody(404, 'Not Found', 'Weight not found', url.pathname));
			return;
		}
		userWeights.splice(index, 1);
		res.writeHead(204, { 'access-control-allow-origin': '*' }); res.end(); return;
	}
	if (url.pathname === '/api/v1/money-boxes' && req.method === 'GET') {
		const userBoxes = [...users.values()].map(userMoneyBoxResponse).filter(Boolean);
		sendJson(res, 200, [...userBoxes, ...manualMoneyBoxes.map(manualMoneyBoxResponse)]);
		return;
	}
	if (url.pathname === '/api/v1/money-boxes' && req.method === 'POST') {
		const payload = await parseBody(req);
		const name = String(payload.name ?? '').trim();
		if (!name) { sendJson(res, 400, errorBody(400, 'Bad Request', 'Name is required', url.pathname)); return; }
		if (manualMoneyBoxes.some((box) => box.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
			sendJson(res, 409, errorBody(409, 'Conflict', 'Money box name already exists', url.pathname)); return;
		}
		const created = { id: nextManualMoneyBoxId++, name };
		manualMoneyBoxes.push(created);
		sendJson(res, 201, manualMoneyBoxResponse(created));
		return;
	}
	const unifiedMoneyBoxMatch = url.pathname.match(/^\/api\/v1\/money-boxes\/(\d+)$/);
	if (unifiedMoneyBoxMatch && req.method === 'GET') {
		const id = Number(unifiedMoneyBoxMatch[1]);
		const user = [...users.values()].find((item) => item.id === id && !deletedUserMoneyBoxIds.has(item.id));
		const manualBox = manualMoneyBoxes.find((item) => item.id === id);
		if (!user && !manualBox) { sendJson(res, 404, errorBody(404, 'Not Found', 'Money box not found', url.pathname)); return; }
		sendJson(res, 200, user ? userMoneyBoxResponse(user) : manualMoneyBoxResponse(manualBox));
		return;
	}
	if (unifiedMoneyBoxMatch && req.method === 'DELETE') {
		const id = Number(unifiedMoneyBoxMatch[1]);
		const user = [...users.values()].find((item) => item.id === id);
		const index = manualMoneyBoxes.findIndex((item) => item.id === id);
		if (!user && index < 0) { sendJson(res, 404, errorBody(404, 'Not Found', 'Money box not found', url.pathname)); return; }
		if (user) {
			deletedUserMoneyBoxIds.add(id);
		} else {
			manualMoneyBoxes.splice(index, 1);
		}
		moneyMovements = moneyMovements.filter((item) => item.moneyBoxId !== id);
		res.writeHead(204, { 'access-control-allow-origin': '*' }); res.end(); return;
	}
	const unifiedMoneyMovementMatch = url.pathname.match(/^\/api\/v1\/money-boxes\/(\d+)\/movements$/);
	if (unifiedMoneyMovementMatch && req.method === 'POST') {
		const moneyBoxId = Number(unifiedMoneyMovementMatch[1]);
		const user = [...users.values()].find((item) => item.id === moneyBoxId);
		const manualBox = manualMoneyBoxes.find((item) => item.id === moneyBoxId);
		if (!user && !manualBox) { sendJson(res, 404, errorBody(404, 'Not Found', 'Money box not found', url.pathname)); return; }
		const payload = await parseBody(req);
		const created = { id: nextMoneyMovementId++, moneyBoxId, userId: user?.id ?? null, amount: Number(payload.amount), description: payload.description ?? null, menuId: null, createdAt: new Date().toISOString() };
		moneyMovements.push(created); sendJson(res, 201, created); return;
	}
	const deleteMoneyMovementMatch = url.pathname.match(/^\/api\/v1\/money-boxes\/(\d+)\/movements\/(\d+)$/);
	if (deleteMoneyMovementMatch && req.method === 'DELETE') {
		const moneyBoxId = Number(deleteMoneyMovementMatch[1]);
		const movementId = Number(deleteMoneyMovementMatch[2]);
		const movement = moneyMovements.find((item) => item.id === movementId && item.moneyBoxId === moneyBoxId);
		if (!movement) { sendJson(res, 404, errorBody(404, 'Not Found', 'Money movement not found', url.pathname)); return; }
		if (movement.menuId !== null) { sendJson(res, 409, errorBody(409, 'Conflict', 'Menu movements cannot be deleted', url.pathname)); return; }
		moneyMovements = moneyMovements.filter((item) => item.id !== movementId);
		res.writeHead(204, { 'access-control-allow-origin': '*' }); res.end(); return;
	}
	const moneyBoxMatch = url.pathname.match(/^\/api\/v1\/users\/(\d+)\/money-box$/);
	if (moneyBoxMatch && req.method === 'GET') {
		const userId = Number(moneyBoxMatch[1]); const movements = moneyMovements.filter((item) => item.userId === userId).sort((a, b) => b.id - a.id);
		sendJson(res, 200, { userId, username: 'elias', balance: movements.reduce((sum, item) => sum + item.amount, 0), movements }); return;
	}
	const moneyMovementMatch = url.pathname.match(/^\/api\/v1\/users\/(\d+)\/money-box\/movements$/);
	if (moneyMovementMatch && req.method === 'POST') {
		const userId = Number(moneyMovementMatch[1]); const payload = await parseBody(req);
		const created = { id: nextMoneyMovementId++, moneyBoxId: userId, userId, amount: Number(payload.amount), description: payload.description ?? null, menuId: null, createdAt: new Date().toISOString() };
		moneyMovements.push(created); sendJson(res, 201, created); return;
	}

	if (req.method === 'GET' && url.pathname === '/api/v1/products/stats') {
		sendJson(res, 200, productStatsResponse());
		return;
	}

	if (req.method === 'GET' && url.pathname === '/api/v1/recipes/stats') {
		sendJson(res, 200, recipeStatsResponse());
		return;
	}

	if (req.method === 'GET' && url.pathname === '/api/v1/recipes') {
		const filtered = recipes.filter((recipe) => recipeMatchesFilters(recipe, url)).map(recipeResponse);
		sendJson(res, 200, paginate(filtered, url));
		return;
	}

	if (req.method === 'POST' && url.pathname === '/api/v1/recipes') {
		const payload = await parseBody(req).catch(() => null);
		if (!payload) {
			sendJson(res, 400, errorBody(400, 'Bad Request', 'Malformed JSON', url.pathname));
			return;
		}

		const validationError = validateRecipePayload(payload);
		if (validationError) {
			sendJson(res, 400, errorBody(400, 'Bad Request', validationError, url.pathname));
			return;
		}

		if (duplicateRecipeName(payload.name)) {
			sendJson(res, 409, errorBody(409, 'Conflict', 'Recipe name already exists', url.pathname));
			return;
		}

		const created = {
			id: nextRecipeId++,
			name: String(payload.name).trim(),
			description: String(payload.description).trim(),
			instructions: String(payload.instructions).trim(),
			ingredients: payload.products.map((ingredient) => ({
				productId: Number(ingredient.productId),
				grams: Number(ingredient.grams)
			})),
			derivedProduct: null,
			photo: payload.photo ? createMediaRecord(payload.photo) : null
		};
		recipes.push(created);
		sendJson(res, 201, recipeResponse(created));
		return;
	}

	const recipeMatch = url.pathname.match(/^\/api\/v1\/recipes\/(\d+)$/);
	if (recipeMatch) {
		const id = Number(recipeMatch[1]);
		const recipe = recipeById(id);

		if (!recipe) {
			sendJson(res, 404, errorBody(404, 'Not Found', 'Recipe not found', url.pathname));
			return;
		}

		if (req.method === 'PUT') {
			const payload = await parseBody(req).catch(() => null);
			if (!payload) {
				sendJson(res, 400, errorBody(400, 'Bad Request', 'Malformed JSON', url.pathname));
				return;
			}

			const validationError = validateRecipePayload(payload);
			if (validationError) {
				sendJson(res, 400, errorBody(400, 'Bad Request', validationError, url.pathname));
				return;
			}

			if (duplicateRecipeName(payload.name, id)) {
				sendJson(res, 409, errorBody(409, 'Conflict', 'Recipe name already exists', url.pathname));
				return;
			}

			recipe.name = String(payload.name).trim();
			recipe.description = String(payload.description).trim();
			recipe.instructions = String(payload.instructions).trim();
			recipe.ingredients = payload.products.map((ingredient) => ({
				productId: Number(ingredient.productId),
				grams: Number(ingredient.grams)
			}));
			sendJson(res, 200, recipeResponse(recipe));
			return;
		}

		if (req.method === 'DELETE') {
			recipes = recipes.filter((item) => item.id !== id);
			res.writeHead(204, {
				'access-control-allow-origin': '*',
				'access-control-allow-headers': 'content-type, authorization',
				'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS'
			});
			res.end();
			return;
		}
	}

	const derivedMatch = url.pathname.match(/^\/api\/v1\/recipes\/(\d+)\/derived-product$/);
	if (derivedMatch && req.method === 'POST') {
		const id = Number(derivedMatch[1]);
		const recipe = recipeById(id);
		if (!recipe) {
			sendJson(res, 404, errorBody(404, 'Not Found', 'Recipe not found', url.pathname));
			return;
		}

		const payload = await parseBody(req).catch(() => null);
		if (!payload) {
			sendJson(res, 400, errorBody(400, 'Bad Request', 'Malformed JSON', url.pathname));
			return;
		}

		const validationError = validateDerivedProductPayload(payload);
		if (validationError) {
			sendJson(res, 400, errorBody(400, 'Bad Request', validationError, url.pathname));
			return;
		}

		const created = {
			productId: recipe.derivedProduct?.productId ?? nextId++,
			producedGrams: Number(payload.producedGrams),
			gramsPerUnit: Number(payload.gramsPerUnit),
			unitsProduced: Number((Number(payload.producedGrams) / Number(payload.gramsPerUnit)).toFixed(2))
		};
		recipe.derivedProduct = created;
		sendJson(res, 201, created);
		return;
	}

	if (req.method === 'POST' && (url.pathname === '/api/v1/proposed-week-menus' || url.pathname === '/api/v1/planning')) {
		const payload = await parseBody(req).catch(() => null);
		if (!payload) {
			sendJson(res, 400, errorBody(400, 'Bad Request', 'Malformed JSON', url.pathname));
			return;
		}

		const validationError = validateProposedWeekMenuPayload(payload);
		if (validationError) {
			sendJson(res, 400, errorBody(400, 'Bad Request', validationError, url.pathname));
			return;
		}

		const created = {
			id: nextProposedWeekMenuId++,
			startDate: String(payload.startDate),
			endDate: String(payload.endDate),
			days: []
		};
		proposedWeekMenus.push(created);
		sendJson(res, 201, proposedWeekMenuResponse(created));
		return;
	}

	if (req.method === 'GET' && url.pathname === '/api/v1/planning') {
		const planning = proposedWeekMenus
			.map(planningMenuResponse)
			.sort((left, right) => right.startDate.localeCompare(left.startDate) || right.id - left.id);
		sendJson(res, 200, planning);
		return;
	}

	if (req.method === 'GET' && (url.pathname === '/api/v1/proposed-week-menu-day-parts' || url.pathname === '/api/v1/planning/day-parts')) {
		sendJson(
			res,
			200,
			[...proposedWeekMenuDayParts].sort((left, right) => {
				if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
				return left.id - right.id;
			})
		);
		return;
	}

	if (req.method === 'POST' && (url.pathname === '/api/v1/proposed-week-menu-day-parts' || url.pathname === '/api/v1/planning/day-parts')) {
		const payload = await parseBody(req).catch(() => null);
		if (!payload) {
			sendJson(res, 400, errorBody(400, 'Bad Request', 'Malformed JSON', url.pathname));
			return;
		}

		const validationError = validateDayPartPayload(payload);
		if (validationError) {
			sendJson(res, 400, errorBody(400, 'Bad Request', validationError, url.pathname));
			return;
		}

		const created = {
			id: nextProposedWeekMenuDayPartId++,
			name: String(payload.name).trim(),
			description: String(payload.description).trim(),
			sortOrder: Number(payload.sortOrder)
		};
		proposedWeekMenuDayParts.push(created);
		sendJson(res, 201, created);
		return;
	}

	const proposedWeekMenuDayPartMatch = url.pathname.match(/^\/api\/v1\/(?:proposed-week-menu-day-parts|planning\/day-parts)\/(\d+)$/);
	if (proposedWeekMenuDayPartMatch && req.method === 'PUT') {
		const id = Number(proposedWeekMenuDayPartMatch[1]);
		const existingIndex = proposedWeekMenuDayParts.findIndex((dayPart) => dayPart.id === id);
		if (existingIndex < 0) {
			sendJson(res, 404, errorBody(404, 'Not Found', 'Day part not found', url.pathname));
			return;
		}

		const payload = await parseBody(req).catch(() => null);
		if (!payload) {
			sendJson(res, 400, errorBody(400, 'Bad Request', 'Malformed JSON', url.pathname));
			return;
		}

		const validationError = validateDayPartPayload(payload);
		if (validationError) {
			sendJson(res, 400, errorBody(400, 'Bad Request', validationError, url.pathname));
			return;
		}

		const updated = {
			id,
			name: String(payload.name).trim(),
			description: String(payload.description).trim(),
			sortOrder: Number(payload.sortOrder)
		};
		proposedWeekMenuDayParts[existingIndex] = updated;
		sendJson(res, 200, updated);
		return;
	}

	const proposedWeekMenuMatch = url.pathname.match(/^\/api\/v1\/(?:proposed-week-menus|planning)\/(\d+)$/);
	if (proposedWeekMenuMatch && req.method === 'GET') {
		const id = Number(proposedWeekMenuMatch[1]);
		const menu = proposedWeekMenuById(id);
		if (!menu) {
			sendJson(res, 404, errorBody(404, 'Not Found', 'Proposed week menu not found', url.pathname));
			return;
		}

		sendJson(res, 200, proposedWeekMenuResponse(menu));
		return;
	}

	const proposedWeekMenuDayMatch = url.pathname.match(/^\/api\/v1\/(?:proposed-week-menus|planning)\/(\d+)\/days$/);
	if (proposedWeekMenuDayMatch && req.method === 'PUT') {
		const id = Number(proposedWeekMenuDayMatch[1]);
		const menu = proposedWeekMenuById(id);
		if (!menu) {
			sendJson(res, 404, errorBody(404, 'Not Found', 'Proposed week menu not found', url.pathname));
			return;
		}

		const payload = await parseBody(req).catch(() => null);
		if (!payload) {
			sendJson(res, 400, errorBody(400, 'Bad Request', 'Malformed JSON', url.pathname));
			return;
		}

		const validationError = validateProposedDayPayload(payload, menu);
		if (validationError) {
			sendJson(res, 400, errorBody(400, 'Bad Request', validationError, url.pathname));
			return;
		}

		const createdDay = {
			id: nextProposedWeekMenuDayId++,
			date: String(payload.date),
			sections: payload.sections.map((section) => ({
				...proposedWeekMenuDayPartById(Number(section.dayPartId)),
				id: nextProposedWeekMenuSectionId++,
				dayPartId: Number(section.dayPartId),
				products: section.products.map((product) => ({
					productId: Number(product.productId),
					units: product.units === undefined || product.units === null ? undefined : Number(product.units),
					grams: product.grams === undefined || product.grams === null ? undefined : Number(product.grams),
					sortOrder: Number(product.sortOrder)
				}))
			}))
		};

		const existingIndex = menu.days.findIndex((day) => day.date === createdDay.date);
		if (existingIndex >= 0) {
			menu.days[existingIndex] = createdDay;
		} else {
			menu.days.push(createdDay);
		}

		sendJson(res, 200, proposedWeekMenuResponse(menu));
		return;
	}

	const proposedWeekMenuPublishMatch = url.pathname.match(/^\/api\/v1\/(?:proposed-week-menus\/(\d+)\/publish|planning\/(\d+)\/menu)$/);
	if (proposedWeekMenuPublishMatch && req.method === 'POST') {
		const id = Number(proposedWeekMenuPublishMatch[1] ?? proposedWeekMenuPublishMatch[2]);
		const menu = proposedWeekMenuById(id);
		if (!menu) {
			sendJson(res, 404, errorBody(404, 'Not Found', 'Proposed week menu not found', url.pathname));
			return;
		}

		const payload = await parseBody(req);
		const payerUserId = Number(payload.payerUserId ?? 1);
		if (![...users.values()].some((user) => user.id === payerUserId)) {
			sendJson(res, 400, errorBody(400, 'Bad Request', 'payerUserId must reference a valid user', url.pathname));
			return;
		}
		if (payload.stockAllocations !== undefined && !Array.isArray(payload.stockAllocations)) {
			sendJson(res, 400, errorBody(400, 'Bad Request', 'stockAllocations must be an array', url.pathname));
			return;
		}
		for (const allocation of payload.stockAllocations ?? []) {
			const stockEntryId = Number(allocation?.stockEntryId);
			const usedUnits = Number(allocation?.usedUnits);
			if (!stockEntryById(stockEntryId)) {
				sendJson(res, 400, errorBody(400, 'Bad Request', 'stockAllocations must reference valid stock entries', url.pathname));
				return;
			}
			if (!Number.isFinite(usedUnits) || usedUnits <= 0) {
				sendJson(res, 400, errorBody(400, 'Bad Request', 'stockAllocations.usedUnits must be greater than 0', url.pathname));
				return;
			}
		}
		const coverage = calculateMenuCoverage(menu, stockEntries.map((entry) => ({ ...entry })));
		const established = {
			id: nextEstablishedWeekMenuId++,
			proposedWeekMenuId: menu.id,
			payerUserId,
			payerUsername: 'elias',
			personIds: payload.personIds ?? [payerUserId],
			startDate: menu.startDate,
			endDate: menu.endDate,
			days: coverage.days,
			nutritionalValues: coverage.totals,
			stockSummary: coverage.stockSummary,
			usedStock: coverage.usedStock,
			shoppingList: coverage.shoppingList
		};
		establishedWeekMenus.push(established);
		moneyMovements.push({ id: nextMoneyMovementId++, moneyBoxId: payerUserId, userId: payerUserId, amount: -Number(coverage.stockSummary.estimatedCost ?? 0), description: 'Menú', menuId: established.id, createdAt: new Date().toISOString() });
		sendJson(res, 201, establishedWeekMenuResponse(established));
		return;
	}

	const establishedWeekMenuMatch = url.pathname.match(/^\/api\/v1\/(?:established-week-menus|menus)\/(\d+)$/);
	if (establishedWeekMenuMatch && req.method === 'GET') {
		const id = Number(establishedWeekMenuMatch[1]);
		const menu = establishedWeekMenuById(id);
		if (!menu) {
			sendJson(res, 404, errorBody(404, 'Not Found', 'Established week menu not found', url.pathname));
			return;
		}

		sendJson(res, 200, establishedWeekMenuResponse(menu));
		return;
	}

	const establishedWeekMenuUsedStockMatch = url.pathname.match(/^\/api\/v1\/established-week-menus\/(\d+)\/used-stock$/);
	if (establishedWeekMenuUsedStockMatch && req.method === 'GET') {
		const id = Number(establishedWeekMenuUsedStockMatch[1]);
		const menu = establishedWeekMenuById(id);
		if (!menu) {
			sendJson(res, 404, errorBody(404, 'Not Found', 'Established week menu not found', url.pathname));
			return;
		}

		sendJson(res, 200, menu.usedStock);
		return;
	}

	const establishedWeekMenuShoppingListMatch = url.pathname.match(/^\/api\/v1\/(?:established-week-menus|menus)\/(\d+)\/shopping-list$/);
	if (establishedWeekMenuShoppingListMatch && req.method === 'GET') {
		const id = Number(establishedWeekMenuShoppingListMatch[1]);
		const menu = establishedWeekMenuById(id);
		if (!menu) {
			sendJson(res, 404, errorBody(404, 'Not Found', 'Established week menu not found', url.pathname));
			return;
		}

		sendJson(res, 200, menu.shoppingList);
		return;
	}

	const closeMenuMatch = url.pathname.match(/^\/api\/v1\/menus\/(\d+)\/close$/);
	if (closeMenuMatch && req.method === 'POST') {
		const menu = establishedWeekMenuById(Number(closeMenuMatch[1]));
		if (!menu) { sendJson(res, 404, errorBody(404, 'Not Found', 'Menu not found', url.pathname)); return; }
		const payload = await parseBody(req).catch(() => null);
		const personIds = Array.isArray(payload?.personIds) ? payload.personIds.map(Number).filter((value) => Number.isFinite(value) && value > 0) : [];
		if (personIds.length === 0) {
			sendJson(res, 400, errorBody(400, 'Bad Request', 'personIds must contain at least one person', url.pathname));
			return;
		}
		menu.personIds = personIds;
		menu.stats = menuStatsResponse(menu);
		sendJson(res, 200, menu.stats); return;
	}
	const undoMenuMatch = url.pathname.match(/^\/api\/v1\/menus\/(\d+)$/);
	if (undoMenuMatch && req.method === 'DELETE') {
		const id = Number(undoMenuMatch[1]);
		const index = establishedWeekMenus.findIndex((menu) => menu.id === id);
		if (index < 0) { sendJson(res, 404, errorBody(404, 'Not Found', 'Menu not found', url.pathname)); return; }
		const menu = establishedWeekMenus[index];
		for (const used of menu.usedStock ?? []) {
			const existing = stockEntries.find((entry) => entry.id === used.stockEntryId);
			if (existing) {
				existing.quantity = Number((existing.quantity + used.usedUnits).toFixed(2));
				continue;
			}
			stockEntries.push({
				id: used.stockEntryId,
				productId: used.productId,
				productName: used.productName,
				quantity: used.usedUnits,
				price: used.price,
				expirationDate: used.expirationDate,
				entryDate: used.entryDate
			});
			nextStockId = Math.max(nextStockId, used.stockEntryId + 1);
		}
		moneyMovements = moneyMovements.filter((movement) => movement.menuId !== id);
		establishedWeekMenus.splice(index, 1);
		res.writeHead(204, { 'access-control-allow-origin': '*' }); res.end(); return;
	}
	const menuStatsMatch = url.pathname.match(/^\/api\/v1\/menus\/(\d+)\/stats$/);
	if (menuStatsMatch && req.method === 'GET') {
		const menu = establishedWeekMenuById(Number(menuStatsMatch[1]));
		if (!menu?.stats) { sendJson(res, 404, errorBody(404, 'Not Found', 'Menu stats not found', url.pathname)); return; }
		sendJson(res, 200, menu.stats); return;
	}

	if (req.method === 'GET' && url.pathname === '/api/v1/stock') {
		const expiresBefore = url.searchParams.get('expiresBefore');
		const productIds = url.searchParams
			.getAll('productIds')
			.flatMap((value) =>
				String(value)
					.split(',')
					.map((entry) => Number(entry))
					.filter((entry) => !Number.isNaN(entry))
			);
		const filtered = stockEntries.filter((entry) => {
			if (expiresBefore && entry.expirationDate && String(entry.expirationDate) >= expiresBefore) {
				return false;
			}
			if (expiresBefore && !entry.expirationDate) return false;
			if (productIds.length > 0 && !productIds.includes(entry.productId)) return false;
			return true;
		});
		sendJson(res, 200, sortStockEntries(filtered).map(stockResponse));
		return;
	}

	const stockAdjustmentMatch = url.pathname.match(/^\/api\/v1\/stock\/(\d+)\/(add|remove)$/);
	if (stockAdjustmentMatch && req.method === 'POST') {
		const stockEntry = stockEntryById(Number(stockAdjustmentMatch[1]));
		if (!stockEntry) { sendJson(res, 404, errorBody(404, 'Not Found', 'Stock entry not found', url.pathname)); return; }
		const payload = await parseBody(req); const quantity = Number(payload.quantity);
		if (!Number.isFinite(quantity) || quantity <= 0) { sendJson(res, 400, errorBody(400, 'Bad Request', 'quantity must be greater than 0', url.pathname)); return; }
		if (stockAdjustmentMatch[2] === 'add') stockEntry.quantity += quantity;
		else stockEntry.quantity -= quantity;
		if (stockEntry.quantity <= 0) stockEntries = stockEntries.filter((entry) => entry.id !== stockEntry.id);
		res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization' }); res.end(); return;
	}

	const stockEntryMatch = url.pathname.match(/^\/api\/v1\/stock\/(\d+)$/);
	if (stockEntryMatch) {
		const stockEntryId = Number(stockEntryMatch[1]);
		const stockEntry = stockEntryById(stockEntryId);

		if (!stockEntry) {
			sendJson(res, 404, errorBody(404, 'Not Found', 'Stock entry not found', url.pathname));
			return;
		}

		if (req.method === 'PUT') {
			const payload = await parseBody(req).catch(() => null);
			if (!payload) {
				sendJson(res, 400, errorBody(400, 'Bad Request', 'Malformed JSON', url.pathname));
				return;
			}

			const validationError = validateStockPayload(payload, stockEntry.productId);
			if (validationError) {
				sendJson(res, 400, errorBody(400, 'Bad Request', validationError, url.pathname));
				return;
			}

			stockEntry.quantity = Number(payload.quantity);
			stockEntry.price = Number(payload.price);
			stockEntry.expirationDate = payload.expirationDate ? String(payload.expirationDate) : null;
			stockEntry.entryDate = String(payload.entryDate);
			stockEntry.productName = productById(stockEntry.productId)?.name ?? stockEntry.productName;
			sendJson(res, 200, stockResponse(stockEntry));
			return;
		}
	}

	const productStockMatch = url.pathname.match(/^\/api\/v1\/products\/(\d+)\/stock$/);
	if (productStockMatch) {
		const productId = Number(productStockMatch[1]);
		const product = productById(productId);

		if (!product) {
			sendJson(res, 404, errorBody(404, 'Not Found', 'Product not found', url.pathname));
			return;
		}

		if (req.method === 'GET') {
			const expiresBefore = url.searchParams.get('expiresBefore');
			const filtered = stockEntries.filter((entry) => {
				if (entry.productId !== productId) return false;
				if (expiresBefore && entry.expirationDate && String(entry.expirationDate) >= expiresBefore) {
					return false;
				}
				if (expiresBefore && !entry.expirationDate) return false;
				return true;
			});
			sendJson(res, 200, sortStockEntries(filtered).map(stockResponse));
			return;
		}

		if (req.method === 'POST') {
			const payload = await parseBody(req).catch(() => null);
			if (!payload) {
				sendJson(res, 400, errorBody(400, 'Bad Request', 'Malformed JSON', url.pathname));
				return;
			}

			const validationError = validateStockPayload(payload, productId);
			if (validationError) {
				sendJson(res, 400, errorBody(400, 'Bad Request', validationError, url.pathname));
				return;
			}

			const created = {
				id: nextStockId++,
				productId,
				productName: product.name,
				quantity: Number(payload.quantity),
				price: Number(payload.price),
				expirationDate: payload.expirationDate ? String(payload.expirationDate) : null,
				entryDate: String(payload.entryDate)
			};
			stockEntries.push(created);
			sendJson(res, 201, stockResponse(created));
			return;
		}
	}

	if (req.method === 'GET' && url.pathname === '/api/v1/products') {
		sendJson(res, 200, paginate(filterProducts(url), url));
		return;
	}

	if (req.method === 'POST' && url.pathname === '/api/v1/products') {
		const payload = await parseBody(req).catch(() => null);
		if (!payload) {
			sendJson(res, 400, errorBody(400, 'Bad Request', 'Malformed JSON', url.pathname));
			return;
		}

		const validationError = validate(payload);
		if (validationError) {
			sendJson(res, 400, errorBody(400, 'Bad Request', validationError, url.pathname));
			return;
		}

		if (duplicateName(payload.name)) {
			sendJson(
				res,
				409,
				errorBody(409, 'Conflict', 'Product name already exists', url.pathname)
			);
			return;
		}

			const created = {
				id: nextId++,
				name: String(payload.name).trim(),
				description: String(payload.description).trim(),
				gramsPerUnit: Number(payload.gramsPerUnit),
				defaultPrice:
					payload.defaultPrice === undefined || payload.defaultPrice === null || String(payload.defaultPrice).trim() === ''
						? null
						: Number(payload.defaultPrice),
				nutritionalValues: {
					calories: Number(payload.calories),
					carbohydrates: Number(payload.carbohydrates),
					proteins: Number(payload.proteins),
					fats: Number(payload.fats)
				},
				photo: payload.photo ? createMediaRecord(payload.photo) : null,
				supermarketIds: Array.isArray(payload.supermarketIds) ? payload.supermarketIds.map(Number) : [],
				supermarkets: supermarkets.filter((item) => (payload.supermarketIds ?? []).map(Number).includes(item.id))
			};
			products.push(created);
			sendJson(res, 201, created);
			return;
		}

	const productMatch = url.pathname.match(/^\/api\/v1\/products\/(\d+)$/);
	if (productMatch) {
		const id = Number(productMatch[1]);
		const product = products.find((item) => item.id === id);

		if (!product) {
			sendJson(res, 404, errorBody(404, 'Not Found', 'Product not found', url.pathname));
			return;
		}

		if (req.method === 'PUT') {
			const payload = await parseBody(req).catch(() => null);
			if (!payload) {
				sendJson(res, 400, errorBody(400, 'Bad Request', 'Malformed JSON', url.pathname));
				return;
			}

			const validationError = validate(payload);
			if (validationError) {
				sendJson(res, 400, errorBody(400, 'Bad Request', validationError, url.pathname));
				return;
			}

			if (duplicateName(payload.name, id)) {
				sendJson(
					res,
					409,
					errorBody(409, 'Conflict', 'Product name already exists', url.pathname)
				);
				return;
			}

			product.name = String(payload.name).trim();
			product.description = String(payload.description).trim();
			product.gramsPerUnit = Number(payload.gramsPerUnit);
			product.defaultPrice =
				payload.defaultPrice === undefined || payload.defaultPrice === null || String(payload.defaultPrice).trim() === ''
					? null
					: Number(payload.defaultPrice);
			product.nutritionalValues = {
				calories: Number(payload.calories),
				carbohydrates: Number(payload.carbohydrates),
				proteins: Number(payload.proteins),
				fats: Number(payload.fats)
			};
			if (payload.photo) {
				product.photo = createMediaRecord(payload.photo);
			}
			product.supermarketIds = Array.isArray(payload.supermarketIds) ? payload.supermarketIds.map(Number) : [];
			product.supermarkets = supermarkets.filter((item) => product.supermarketIds.includes(item.id));
			sendJson(res, 200, product);
			return;
		}

		if (req.method === 'DELETE') {
			products = products.filter((item) => item.id !== id);
			stockEntries = stockEntries.filter((entry) => entry.productId !== id);
			recipes = recipes.filter(
				(recipe) => !recipe.ingredients.some((ingredient) => ingredient.productId === id)
			);
			res.writeHead(204, {
				'access-control-allow-origin': '*',
				'access-control-allow-headers': 'content-type, authorization',
				'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS'
			});
			res.end();
			return;
		}
	}

	sendJson(res, 404, errorBody(404, 'Not Found', 'Unknown route', url.pathname));
});

resetAuth();
server.listen(port, '127.0.0.1', () => {
	console.log(`Mock backend listening on http://127.0.0.1:${port}`);
});
