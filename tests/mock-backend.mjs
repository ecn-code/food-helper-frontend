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
let products = [
	{
		id: 1,
		name: 'Apple',
		description: 'Fresh apple',
		gramsPerUnit: 150,
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
}

function sendJson(res, status, body) {
	res.writeHead(status, {
		'content-type': 'application/json'
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

function recipeById(id) {
	return recipes.find((recipe) => recipe.id === id) || null;
}

function sortStockEntries(entries) {
	return [...entries].sort((a, b) => {
		if (a.expirationDate && b.expirationDate) {
			return String(a.expirationDate).localeCompare(String(b.expirationDate));
		}
		if (a.expirationDate) return -1;
		if (b.expirationDate) return 1;
		return a.entryDate.localeCompare(b.entryDate);
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
		expirationDate: entry.expirationDate,
		entryDate: entry.entryDate
	};
}

function validateStockPayload(payload, productId) {
	const quantity = Number(payload.quantity);
	if (Number.isNaN(quantity) || quantity <= 0) return 'quantity must be greater than 0';
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
	return {
		id: media.id,
		fileName: media.fileName,
		contentType: media.contentType,
		sizeBytes: media.sizeBytes,
		width: media.width,
		height: media.height
	};
}

const server = http.createServer(async (req, res) => {
	if (!req.url) {
		sendJson(res, 404, errorBody(404, 'Not Found', 'Unknown route', ''));
		return;
	}

	const url = new URL(req.url, `http://127.0.0.1:${port}`);

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
			'content-length': media.buffer.length
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
			url.pathname.startsWith('/api/v1/stock')) &&
		!requireAuth(req, res, url.pathname)
	) {
		return;
	}

	if (req.method === 'GET' && url.pathname === '/api/v1/recipes') {
		sendJson(res, 200, recipes.map(recipeResponse));
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
			res.writeHead(204);
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
				expirationDate: payload.expirationDate ? String(payload.expirationDate) : null,
				entryDate: String(payload.entryDate)
			};
			stockEntries.push(created);
			sendJson(res, 201, stockResponse(created));
			return;
		}
	}

	if (req.method === 'GET' && url.pathname === '/api/v1/products') {
		sendJson(res, 200, products);
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
			res.writeHead(204);
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
