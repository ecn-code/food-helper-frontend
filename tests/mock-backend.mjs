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
	proposedWeekMenus = [];
	establishedWeekMenus = [];
	nextProposedWeekMenuId = 1;
	nextProposedWeekMenuDayId = 1;
	nextProposedWeekMenuSectionId = 1;
	nextEstablishedWeekMenuId = 1;
	proposedWeekMenuDayParts = defaultProposedWeekMenuDayParts.map((dayPart) => ({ ...dayPart }));
	nextProposedWeekMenuDayPartId = 4;
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
	return Number.isFinite(dateDifferenceInDays(startDate, endDate)) && dateDifferenceInDays(startDate, endDate) >= 0 && dateDifferenceInDays(startDate, endDate) <= 7;
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
		nutritionalValues: totals
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
		proposedWeekMenuId: menu.proposedWeekMenuId,
		startDate: menu.startDate,
		endDate: menu.endDate,
		days: menu.days,
		nutritionalValues: menu.nutritionalValues,
		stockSummary: menu.stockSummary,
		usedStock: menu.usedStock,
		shoppingList: menu.shoppingList
	};
}

function validateProposedWeekMenuPayload(payload) {
	if (!payload.startDate || !payload.endDate) return 'startDate and endDate are required';
	if (Number.isNaN(Date.parse(payload.startDate)) || Number.isNaN(Date.parse(payload.endDate))) {
		return 'startDate and endDate must be valid dates';
	}
	if (!clampWeekRange(payload.startDate, payload.endDate)) return 'range must fit within 8 days inclusive';
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
			: null,
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
			url.pathname.startsWith('/api/v1/proposed-week-menus') ||
			url.pathname.startsWith('/api/v1/proposed-week-menu-day-parts')) &&
		!requireAuth(req, res, url.pathname)
	) {
		return;
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
		sendJson(res, 200, paginate(recipes.map(recipeResponse), url));
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

	if (req.method === 'POST' && url.pathname === '/api/v1/proposed-week-menus') {
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

	if (req.method === 'GET' && url.pathname === '/api/v1/proposed-week-menu-day-parts') {
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

	if (req.method === 'POST' && url.pathname === '/api/v1/proposed-week-menu-day-parts') {
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

	const proposedWeekMenuDayPartMatch = url.pathname.match(/^\/api\/v1\/proposed-week-menu-day-parts\/(\d+)$/);
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

	const proposedWeekMenuMatch = url.pathname.match(/^\/api\/v1\/proposed-week-menus\/(\d+)$/);
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

	const proposedWeekMenuDayMatch = url.pathname.match(/^\/api\/v1\/proposed-week-menus\/(\d+)\/days$/);
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

	const proposedWeekMenuPublishMatch = url.pathname.match(/^\/api\/v1\/proposed-week-menus\/(\d+)\/publish$/);
	if (proposedWeekMenuPublishMatch && req.method === 'POST') {
		const id = Number(proposedWeekMenuPublishMatch[1]);
		const menu = proposedWeekMenuById(id);
		if (!menu) {
			sendJson(res, 404, errorBody(404, 'Not Found', 'Proposed week menu not found', url.pathname));
			return;
		}

		const coverage = calculateMenuCoverage(menu, stockEntries.map((entry) => ({ ...entry })));
		const established = {
			id: nextEstablishedWeekMenuId++,
			proposedWeekMenuId: menu.id,
			startDate: menu.startDate,
			endDate: menu.endDate,
			days: coverage.days,
			nutritionalValues: coverage.totals,
			stockSummary: coverage.stockSummary,
			usedStock: coverage.usedStock,
			shoppingList: coverage.shoppingList
		};
		establishedWeekMenus.push(established);
		sendJson(res, 201, establishedWeekMenuResponse(established));
		return;
	}

	const establishedWeekMenuMatch = url.pathname.match(/^\/api\/v1\/established-week-menus\/(\d+)$/);
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

	const establishedWeekMenuShoppingListMatch = url.pathname.match(/^\/api\/v1\/established-week-menus\/(\d+)\/shopping-list$/);
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
		sendJson(res, 200, paginate(products, url));
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
				photo: payload.photo ? createMediaRecord(payload.photo) : null
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
