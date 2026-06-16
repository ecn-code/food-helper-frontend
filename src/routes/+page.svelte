<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { onMount, tick } from 'svelte';
	import {
		BookOpen,
		CircleAlert,
		CircleCheck,
		Database,
		Droplets,
		Drumstick,
		Flame,
		LayoutList,
		Leaf,
		LogIn,
		LogOut,
		Package,
		Pencil,
		Plus,
		Save,
		Trash2,
		UserPlus,
		UserRound,
		Wheat,
		Wifi,
		WifiOff,
		X
	} from '@lucide/svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import MetricCard from '$lib/components/ui/MetricCard.svelte';
	import {
		emptyProductForm,
		toProductFormValues,
		type NutritionalValues,
		type Product,
		type ProductFormErrors,
		type ProductFormValues
	} from '$lib/products';
	import { emptyStockForm, type StockEntry, type StockFormErrors, type StockFormValues } from '$lib/stock';
	import {
		emptyRecipeDerivedProductForm,
		emptyRecipeForm,
		emptyRecipeIngredient,
		toRecipeFormValues,
		type Recipe,
		type RecipeDerivedProductFormErrors,
		type RecipeDerivedProductFormValues,
		type RecipeFormErrors,
		type RecipeFormValues,
		type RecipeIngredientFormValues
	} from '$lib/recipes';

	let { data, form } = $props() as { data: any; form: any };

	type ModalMode =
		| 'product-create'
		| 'product-edit'
		| 'product-delete'
		| 'stock'
		| 'recipe-create'
		| 'recipe-edit'
		| 'recipe-delete'
		| 'recipe-derive'
		| null;
	type AuthMode = 'login' | 'register';
	type SectionMode = 'products' | 'recipes';
	type AuthFormErrors = Partial<Record<'username' | 'password' | 'registrationCode', string>>;
	type ProductActionResult = {
		type?: 'create' | 'update' | 'delete';
		id?: number;
		values?: ProductFormValues;
	};
	type StockActionResult = {
		type?: 'stock';
		id?: number;
		values?: StockFormValues;
		fieldErrors?: StockFormErrors;
	};
	type RecipeActionResult = {
		type?: 'recipe-create' | 'recipe-update' | 'recipe-delete' | 'recipe-derive';
		id?: number;
		values?: RecipeFormValues | RecipeDerivedProductFormValues;
		fieldErrors?: RecipeFormErrors | RecipeDerivedProductFormErrors;
	};
	type RegisterResult = {
		type: 'register';
		success?: string;
		error?: string;
		values?: Partial<typeof registerDraft>;
		fieldErrors?: AuthFormErrors;
	};
	type PhotoPreview = {
		fileName: string;
		contentType: string;
		previewUrl: string;
	};

	const inputClass =
		'h-10 w-full cursor-text select-text rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm text-[hsl(var(--foreground))] shadow-sm transition-colors placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.14)] disabled:cursor-not-allowed disabled:bg-[hsl(var(--muted))] disabled:opacity-70';
	const fileInputClass =
		'block w-full cursor-pointer rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] text-sm text-[hsl(var(--foreground))] shadow-sm transition-colors file:mr-3 file:border-0 file:bg-[hsl(var(--secondary))] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[hsl(var(--foreground))] hover:file:bg-[hsl(var(--secondary)/0.88)] focus:border-[hsl(var(--ring))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.14)] disabled:cursor-not-allowed disabled:bg-[hsl(var(--muted))] disabled:opacity-70';
	const textareaClass =
		'min-h-24 w-full cursor-text select-text rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2 text-sm leading-6 text-[hsl(var(--foreground))] shadow-sm transition-colors placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.14)] disabled:cursor-not-allowed disabled:bg-[hsl(var(--muted))] disabled:opacity-70';
	const fieldLabelClass = 'mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]';
	const fieldErrorClass = 'mt-1.5 block text-xs text-[hsl(var(--destructive))]';

	let modalMode = $state<ModalMode>(null);
	let authMode = $state<AuthMode>('login');
	let createDraft = $state<ProductFormValues>(emptyProductForm());
	let editDraft = $state<ProductFormValues>(emptyProductForm());
	let stockDraft = $state<StockFormValues>(emptyStockForm());
	let recipeCreateDraft = $state<RecipeFormValues>(emptyRecipeForm());
	let recipeEditDraft = $state<RecipeFormValues>(emptyRecipeForm());
	let recipeDerivedProductDraft = $state<RecipeDerivedProductFormValues>(emptyRecipeDerivedProductForm());
	let loginDraft = $state({ username: '', password: '' });
	let registerDraft = $state({ username: '', password: '', registrationCode: '' });
	let registerResult = $state<RegisterResult | null>(null);
	let currentSection = $state<SectionMode>('products');
	let createPhotoPreview = $state<PhotoPreview | null>(null);
	let editPhotoPreview = $state<PhotoPreview | null>(null);
	let previewProduct = $state<Product | null>(null);
	let deleteProduct = $state<Product | null>(null);
	let stockProduct = $state<Product | null>(null);
	let deleteRecipeItem = $state<Recipe | null>(null);
	let editingProductId = $state<number | null>(null);
	let editingRecipeId = $state<number | null>(null);
	let derivingRecipeId = $state<number | null>(null);
	let createPhotoInput = $state<HTMLInputElement | null>(null);
	let editPhotoInput = $state<HTMLInputElement | null>(null);

	function loginErrors(): AuthFormErrors {
		return form?.type === 'login' && 'fieldErrors' in form
			? ((form.fieldErrors ?? {}) as AuthFormErrors)
			: {};
	}

	function registerErrors(): AuthFormErrors {
		return registerResult?.fieldErrors ?? {};
	}

	function normalizeSection(value: string | null | undefined): SectionMode {
		return value === 'recipes' ? 'recipes' : 'products';
	}

	function setSection(section: SectionMode) {
		currentSection = section;
		if (typeof window !== 'undefined') {
			window.location.hash = section;
		}
	}

	function createErrors(): ProductFormErrors {
		return form?.type === 'create' && 'fieldErrors' in form
			? ((form.fieldErrors ?? {}) as ProductFormErrors)
			: {};
	}

	function updateErrors(): ProductFormErrors {
		return form?.type === 'update' && 'fieldErrors' in form
			? ((form.fieldErrors ?? {}) as ProductFormErrors)
			: {};
	}

	function stockErrors(): StockFormErrors {
		return {};
	}

	function recipeCreateErrors(): RecipeFormErrors {
		return form?.type === 'recipe-create' && 'fieldErrors' in form
			? ((form.fieldErrors ?? {}) as RecipeFormErrors)
			: {};
	}

	function recipeUpdateErrors(): RecipeFormErrors {
		return form?.type === 'recipe-update' && 'fieldErrors' in form
			? ((form.fieldErrors ?? {}) as RecipeFormErrors)
			: {};
	}

	function recipeDerivedProductErrors(): RecipeDerivedProductFormErrors {
		return form?.type === 'recipe-derive' && 'fieldErrors' in form
			? ((form.fieldErrors ?? {}) as RecipeDerivedProductFormErrors)
			: {};
	}

	onMount(() => {
		currentSection = normalizeSection(window.location.hash.slice(1));

		const syncSection = () => {
			currentSection = normalizeSection(window.location.hash.slice(1));
		};

		window.addEventListener('hashchange', syncSection);

		return () => {
			window.removeEventListener('hashchange', syncSection);
		};
	});

	function openCreateModal() {
		createDraft = data.createDefaults;
		createPhotoPreview = null;
		if (createPhotoInput) createPhotoInput.value = '';
		modalMode = 'product-create';
	}

	function openEditModal(product: Product) {
		editingProductId = product.id;
		editDraft = toProductFormValues(product);
		editPhotoPreview = null;
		if (editPhotoInput) editPhotoInput.value = '';
		modalMode = 'product-edit';
	}

	function openDeleteModal(product: Product) {
		deleteProduct = product;
		modalMode = 'product-delete';
	}

	function openStockModal(product: Product) {
		stockProduct = product;
		stockDraft = emptyStockForm(product.id);
		modalMode = 'stock';
	}

	function openCreateRecipeModal() {
		recipeCreateDraft = data.createRecipeDefaults;
		modalMode = 'recipe-create';
	}

	function openEditRecipeModal(recipe: Recipe) {
		editingRecipeId = recipe.id;
		recipeEditDraft = toRecipeFormValues(recipe);
		modalMode = 'recipe-edit';
	}

	function openDeleteRecipeModal(recipe: Recipe) {
		deleteRecipeItem = recipe;
		modalMode = 'recipe-delete';
	}

	function openDerivedProductModal(recipe: Recipe) {
		derivingRecipeId = recipe.id;
		recipeDerivedProductDraft = data.createRecipeDerivedProductDefaults;
		modalMode = 'recipe-derive';
	}

	function addRecipeIngredient(target: 'create' | 'edit') {
		if (target === 'create') {
			recipeCreateDraft = {
				...recipeCreateDraft,
				ingredients: [...recipeCreateDraft.ingredients, emptyRecipeIngredient()]
			};
		} else {
			recipeEditDraft = {
				...recipeEditDraft,
				ingredients: [...recipeEditDraft.ingredients, emptyRecipeIngredient()]
			};
		}
	}

	function removeRecipeIngredient(target: 'create' | 'edit', index: number) {
		const minIngredients = 1;
		const source = target === 'create' ? recipeCreateDraft.ingredients : recipeEditDraft.ingredients;
		if (source.length <= minIngredients) return;

		const nextIngredients = source.filter((_, currentIndex) => currentIndex !== index);
		if (target === 'create') {
			recipeCreateDraft = { ...recipeCreateDraft, ingredients: nextIngredients };
		} else {
			recipeEditDraft = { ...recipeEditDraft, ingredients: nextIngredients };
		}
	}

	function closeModal() {
		modalMode = null;
		previewProduct = null;
		deleteProduct = null;
		stockProduct = null;
		deleteRecipeItem = null;
		editingProductId = null;
		editingRecipeId = null;
		derivingRecipeId = null;
	}

	function productMediaUrl(photo: NonNullable<Product['photo']>) {
		return `${data.backendBaseUrl}/api/v1/media/${photo.id}`;
	}

	function productPhotoPreview(product: Product | null) {
		return product?.photo ? productMediaUrl(product.photo) : null;
	}

	function currentEditingProduct() {
		if (editingProductId === null) return null;
		return data.products.find((product: Product) => product.id === editingProductId) ?? null;
	}

	async function setPhotoPreview(
		event: Event,
		target: 'create' | 'edit'
	) {
		const input = event.currentTarget as HTMLInputElement | null;
		const file = input?.files?.[0];

		if (!file) {
			if (target === 'create') {
				createPhotoPreview = null;
			} else {
				editPhotoPreview = null;
			}
			return;
		}

		const previewUrl = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
			reader.onload = () => resolve(String(reader.result ?? ''));
			reader.readAsDataURL(file);
		});

		const preview = {
			fileName: file.name,
			contentType: file.type || 'application/octet-stream',
			previewUrl
		};

		if (target === 'create') {
			createPhotoPreview = preview;
		} else {
			editPhotoPreview = preview;
		}
	}

	function clearPhotoSelection(target: 'create' | 'edit') {
		if (target === 'create') {
			createPhotoPreview = null;
			if (createPhotoInput) createPhotoInput.value = '';
		} else {
			editPhotoPreview = null;
			if (editPhotoInput) editPhotoInput.value = '';
		}
	}

	function openProductPreview(product: Product) {
		if (!product.photo) return;
		previewProduct = product;
	}

	function closeProductPreview() {
		previewProduct = null;
	}

	function restoreScroll(scrollY: number) {
		window.scrollTo({ top: scrollY });
	}

	function formatNumber(value: number) {
		return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
	}

	function averageMetric(metric: keyof NutritionalValues) {
		if (data.products.length === 0) return '0';
		const total = data.products.reduce((sum: number, product: Product) => sum + product.nutritionalValues[metric], 0);
		return formatNumber(total / data.products.length);
	}

	function highestMetric(metric: keyof NutritionalValues) {
		if (data.products.length === 0) return '0';
		return formatNumber(
			Math.max(...data.products.map((product: Product) => product.nutritionalValues[metric]))
		);
	}

	function richestProduct(metric: keyof NutritionalValues) {
		if (data.products.length === 0) return 'Sin datos';
		return [...data.products].sort(
			(a: Product, b: Product) => b.nutritionalValues[metric] - a.nutritionalValues[metric]
		)[0].name;
	}

	function formatDate(value: string | null) {
		if (!value) return 'Sin caducidad';

		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return value;

		return new Intl.DateTimeFormat('es-ES', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		}).format(date);
	}

	function stockEntriesForProduct(productId: number): StockEntry[] {
		return data.stockEntries.filter((entry: StockEntry) => entry.productId === productId);
	}

	function stockQuantityForProduct(productId: number) {
		return stockEntriesForProduct(productId).reduce((sum, entry) => sum + entry.quantity, 0);
	}

	function nearestExpirationForProduct(productId: number) {
		const entries = stockEntriesForProduct(productId)
			.filter((entry) => entry.expirationDate)
			.sort((a, b) => String(a.expirationDate).localeCompare(String(b.expirationDate)));

		return entries[0]?.expirationDate ?? null;
	}

	function totalStockQuantity() {
		return data.stockEntries.reduce((sum: number, entry: StockEntry) => sum + entry.quantity, 0);
	}

	function stockEntriesCount() {
		return data.stockEntries.length;
	}

	function recipeActionData(resultData: unknown): RecipeActionResult {
		return (resultData ?? {}) as RecipeActionResult;
	}

	function productActionData(resultData: unknown): ProductActionResult {
		return (resultData ?? {}) as ProductActionResult;
	}

	function stockActionData(resultData: unknown): StockActionResult {
		return (resultData ?? {}) as StockActionResult;
	}

	function productValues(values: ProductFormValues | undefined) {
		return {
			...emptyProductForm(),
			...(values ?? {})
		};
	}

	function stockValues(values: StockFormValues | undefined) {
		return {
			...emptyStockForm(),
			...(values ?? {})
		};
	}

	const createEnhance: SubmitFunction = () => {
		const scrollY = window.scrollY;

		return async ({ result, update }) => {
			const actionData = productActionData(result.type === 'failure' ? result.data : undefined);

			await update({
				invalidateAll: result.type === 'success',
				reset: false
			});
			await tick();
			restoreScroll(scrollY);

			if (result.type === 'success') {
				createDraft = data.createDefaults;
				clearPhotoSelection('create');
				modalMode = null;
			} else if (result.type === 'failure' && actionData.type === 'create') {
				createDraft = productValues(actionData.values);
				modalMode = 'product-create';
			}
		};
	};

	const updateEnhance: SubmitFunction = () => {
		const scrollY = window.scrollY;

		return async ({ result, update }) => {
			const actionData = productActionData(result.type === 'failure' ? result.data : undefined);

			await update({
				invalidateAll: result.type === 'success',
				reset: false
			});
			await tick();
			restoreScroll(scrollY);

			if (result.type === 'success') {
				clearPhotoSelection('edit');
				modalMode = null;
			} else if (result.type === 'failure' && actionData.type === 'update') {
				editDraft = productValues(actionData.values);
				editingProductId = actionData.id ?? editingProductId;
				modalMode = 'product-edit';
			}
		};
	};

	const recipeCreateEnhance: SubmitFunction = () => {
		const scrollY = window.scrollY;

		return async ({ result, update }) => {
			const actionData = recipeActionData(result.type === 'failure' ? result.data : undefined);

			await update({
				invalidateAll: result.type === 'success',
				reset: false
			});
			await tick();
			restoreScroll(scrollY);

			if (result.type === 'success') {
				recipeCreateDraft = data.createRecipeDefaults;
				modalMode = null;
			} else if (result.type === 'failure' && actionData.type === 'recipe-create') {
				recipeCreateDraft = {
					...emptyRecipeForm(),
					...(actionData.values as RecipeFormValues | undefined)
				};
				modalMode = 'recipe-create';
			}
		};
	};

	const recipeUpdateEnhance: SubmitFunction = () => {
		const scrollY = window.scrollY;

		return async ({ result, update }) => {
			const actionData = recipeActionData(result.type === 'failure' ? result.data : undefined);

			await update({
				invalidateAll: result.type === 'success',
				reset: false
			});
			await tick();
			restoreScroll(scrollY);

			if (result.type === 'success') {
				modalMode = null;
			} else if (result.type === 'failure' && actionData.type === 'recipe-update') {
				recipeEditDraft = {
					...emptyRecipeForm(),
					...(actionData.values as RecipeFormValues | undefined)
				};
				editingRecipeId = actionData.id ?? editingRecipeId;
				modalMode = 'recipe-edit';
			}
		};
	};

	const recipeDeleteEnhance: SubmitFunction = () => {
		const scrollY = window.scrollY;

		return async ({ result, update }) => {
			await update({
				invalidateAll: result.type === 'success',
				reset: false
			});
			await tick();
			restoreScroll(scrollY);

			if (result.type === 'success') {
				deleteRecipeItem = null;
				modalMode = null;
			}
		};
	};

	const recipeDerivedProductEnhance: SubmitFunction = () => {
		const scrollY = window.scrollY;

		return async ({ result, update }) => {
			const actionData = recipeActionData(result.type === 'failure' ? result.data : undefined);

			await update({
				invalidateAll: result.type === 'success',
				reset: false
			});
			await tick();
			restoreScroll(scrollY);

			if (result.type === 'success') {
				recipeDerivedProductDraft = data.createRecipeDerivedProductDefaults;
				modalMode = null;
			} else if (result.type === 'failure' && actionData.type === 'recipe-derive') {
				recipeDerivedProductDraft = {
					...data.createRecipeDerivedProductDefaults,
					...(actionData.values as RecipeDerivedProductFormValues | undefined)
				};
				derivingRecipeId = actionData.id ?? derivingRecipeId;
				modalMode = 'recipe-derive';
			}
		};
	};

	const deleteEnhance: SubmitFunction = () => {
		const scrollY = window.scrollY;

		return async ({ result, update }) => {
			await update({
				invalidateAll: result.type === 'success',
				reset: false
			});
			await tick();
			restoreScroll(scrollY);

			if (result.type === 'success') {
				deleteProduct = null;
				modalMode = null;
			}
		};
	};

	const stockEnhance: SubmitFunction = () => {
		const scrollY = window.scrollY;

		return async ({ result, update }) => {
			const actionData = stockActionData(result.type === 'failure' ? result.data : undefined);

			await update({
				invalidateAll: result.type === 'success',
				reset: false
			});
			await tick();
			restoreScroll(scrollY);

			if (result.type === 'success') {
				stockProduct = null;
				stockDraft = emptyStockForm();
				modalMode = null;
			} else if (result.type === 'failure' && actionData.type === 'stock') {
				stockDraft = stockValues(actionData.values);
				modalMode = 'stock';
			}
		};
	};

	const loginEnhance: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update({
				invalidateAll: result.type === 'success',
				reset: false
			});

			if (result.type === 'success') {
				loginDraft.password = '';
			}
		};
	};

	async function submitRegister(event: SubmitEvent) {
		event.preventDefault();
		registerResult = null;

		const response = await fetch('/api/auth/register', {
			method: 'POST',
			headers: {
				accept: 'application/json',
				'content-type': 'application/json'
			},
			body: JSON.stringify(registerDraft)
		});
		const result = (await response.json()) as RegisterResult;
		registerResult = result;

		if (response.ok) {
			registerDraft.password = '';
			await invalidateAll();
		}
	}

	$effect(() => {
		if (!data.session && form?.type === 'login') {
			authMode = form.type;
		}
	});

	$effect(() => {
		if (form?.type === 'recipe-create' && 'values' in form && form.values) {
			recipeCreateDraft = {
				...emptyRecipeForm(),
				...(form.values as RecipeFormValues)
			};
		}
	});

	$effect(() => {
		if (form?.type === 'stock' && 'values' in form && form.values) {
			stockDraft = stockValues(form.values as StockFormValues);
			modalMode = 'stock';
		}
	});
</script>

<svelte:head>
	<title>{data.session ? `FoodHelper ${currentSection === 'products' ? 'Productos' : 'Recetas'}` : 'FoodHelper Access'}</title>
	<meta
		name="description"
		content="Gestiona productos y recetas desde el frontend de FoodHelper."
	/>
</svelte:head>

<div class="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
	<aside class="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] lg:flex">
		<div class="flex h-14 items-center gap-2 border-b border-[hsl(var(--border))] px-4">
			<span class="grid size-8 place-items-center rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
				<Database class="size-4" aria-hidden="true" />
			</span>
			<div class="min-w-0">
				<p class="truncate text-sm font-semibold">FoodHelper</p>
				<p class="truncate text-xs text-[hsl(var(--muted-foreground))]">Catalogo nutricional</p>
			</div>
		</div>

			<nav class="flex-1 space-y-1 px-3 py-4" aria-label="Secciones">
				{#if data.session}
					<a
						class={`flex h-9 items-center gap-2 rounded-md px-2.5 text-sm font-medium ${
							currentSection === 'products'
								? 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]'
								: 'text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]'
						}`}
						href="#products"
						onclick={(event) => {
							event.preventDefault();
							setSection('products');
						}}
					>
						<LayoutList class="size-4 shrink-0" aria-hidden="true" />
						<span class="truncate">Productos</span>
					</a>
					<a
						class={`flex h-9 items-center gap-2 rounded-md px-2.5 text-sm font-medium ${
							currentSection === 'recipes'
								? 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]'
								: 'text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]'
						}`}
						href="#recipes"
						onclick={(event) => {
							event.preventDefault();
							setSection('recipes');
						}}
					>
						<BookOpen class="size-4 shrink-0" aria-hidden="true" />
						<span class="truncate">Recetas</span>
				</a>
			{:else}
				<a
					class="flex h-9 items-center gap-2 rounded-md bg-[hsl(var(--secondary))] px-2.5 text-sm font-medium text-[hsl(var(--foreground))]"
					href="/"
				>
					<LogIn class="size-4 shrink-0" aria-hidden="true" />
					<span class="truncate">Acceso</span>
				</a>
			{/if}
		</nav>

		<div class="border-t border-[hsl(var(--border))] p-3">
			<div class="space-y-2">
				{#if data.session}
					<div class="flex min-w-0 items-start gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3">
						<UserRound class="mt-0.5 size-4 shrink-0 text-[hsl(var(--primary))]" aria-hidden="true" />
						<div class="min-w-0">
							<p class="truncate text-sm font-medium">{data.session.username}</p>
							<p class="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Sesion activa</p>
						</div>
					</div>
				{/if}
				<div class="flex min-w-0 items-start gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3">
					{#if data.backendAvailable}
						<Wifi class="mt-0.5 size-4 shrink-0 text-[hsl(var(--primary))]" aria-hidden="true" />
					{:else}
						<WifiOff class="mt-0.5 size-4 shrink-0 text-[hsl(var(--destructive))]" aria-hidden="true" />
					{/if}
					<div class="min-w-0">
						<p class="truncate text-sm font-medium">
							{data.backendAvailable ? 'Backend activo' : 'Backend caido'}
						</p>
						<p class="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
							{data.backendAvailable ? 'API disponible' : 'API no disponible'}
						</p>
					</div>
				</div>
			</div>
		</div>
	</aside>

	<div class="lg:pl-60">
		<header class="sticky top-0 z-20 border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/0.92)] backdrop-blur">
			<div class="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
					<div class="flex min-w-0 items-center gap-2">
						<span class="grid size-8 place-items-center rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] lg:hidden">
							<Database class="size-4" aria-hidden="true" />
						</span>
							<div class="min-w-0">
								<p class="truncate text-sm font-medium">
									{data.session ? (currentSection === 'products' ? 'Productos' : 'Recetas') : 'Acceso'}
								</p>
								<p class="truncate text-xs text-[hsl(var(--muted-foreground))]">
									{data.session
										? currentSection === 'products'
											? `${data.products.length} productos`
											: `${data.recipes.length} recetas`
										: 'Inicia sesion para continuar'}
								</p>
							</div>
					</div>
					<div class="flex shrink-0 items-center gap-2">
						{#if data.session}
							<form method="POST" action="?/logout">
								<Button variant="secondary" size="sm" type="submit" data-testid="logout-button">
									<LogOut class="size-4" aria-hidden="true" />
									Salir
								</Button>
							</form>
						{/if}
						<span
							class={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${
								data.backendAvailable
									? 'border-[hsl(var(--primary)/0.2)] bg-[hsl(var(--primary)/0.06)] text-[hsl(var(--primary))]'
									: 'border-[hsl(var(--destructive)/0.2)] bg-[hsl(var(--destructive)/0.06)] text-[hsl(var(--destructive))]'
							}`}
						>
							{#if data.backendAvailable}
								<Wifi class="size-3.5" aria-hidden="true" />
								Online
							{:else}
								<WifiOff class="size-3.5" aria-hidden="true" />
								Offline
							{/if}
						</span>
					</div>
				</div>
			</header>

		<main class="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
			{#if !data.session}
				<section class="grid min-h-[calc(100vh-7rem)] items-center py-6" data-testid="login-screen">
					<div class="mx-auto w-full max-w-sm">
						<div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm">
							<div class="mb-5 flex items-start gap-3">
								<span class="grid size-9 shrink-0 place-items-center rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
									{#if authMode === 'login'}
										<LogIn class="size-4" aria-hidden="true" />
									{:else}
										<UserPlus class="size-4" aria-hidden="true" />
									{/if}
								</span>
								<div class="min-w-0">
									<h2 class="text-base font-semibold text-[hsl(var(--foreground))]">
										{authMode === 'login' ? 'Iniciar sesion' : 'Crear cuenta'}
									</h2>
									<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
										{authMode === 'login'
											? 'Usa tus credenciales existentes para acceder.'
											: 'Da de alta un usuario nuevo contra la API de autenticacion.'}
									</p>
								</div>
							</div>

							<div class="mb-5 grid grid-cols-2 gap-2 rounded-lg bg-[hsl(var(--secondary))] p-1">
								<button
									type="button"
									class={`inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${
										authMode === 'login'
											? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm'
											: 'text-[hsl(var(--muted-foreground))]'
									}`}
									onclick={() => (authMode = 'login')}
									data-testid="auth-mode-login"
								>
									<LogIn class="size-4" aria-hidden="true" />
									Entrar
								</button>
								<button
									type="button"
									class={`inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${
										authMode === 'register'
											? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm'
											: 'text-[hsl(var(--muted-foreground))]'
									}`}
									onclick={() => (authMode = 'register')}
									data-testid="auth-mode-register"
								>
									<UserPlus class="size-4" aria-hidden="true" />
									Registrarse
								</button>
							</div>

							{#if authMode === 'login'}
								<form
									method="POST"
									action="?/login"
									class="space-y-4"
									use:enhance={loginEnhance}
									data-testid="login-form"
								>
									<label class="block min-w-0">
										<span class={fieldLabelClass}>Usuario</span>
										<input
											class={inputClass}
											name="username"
											autocomplete="username"
											bind:value={loginDraft.username}
											data-testid="login-username"
										/>
										{#if loginErrors().username}
											<small class={fieldErrorClass}>{loginErrors().username}</small>
										{/if}
									</label>

									<label class="block min-w-0">
										<span class={fieldLabelClass}>Contrasena</span>
										<input
											class={inputClass}
											name="password"
											type="password"
											autocomplete="current-password"
											bind:value={loginDraft.password}
											data-testid="login-password"
										/>
										{#if loginErrors().password}
											<small class={fieldErrorClass}>{loginErrors().password}</small>
										{/if}
									</label>

									<Button
										type="submit"
										class="w-full"
										disabled={!data.backendAvailable}
										data-testid="login-submit"
									>
										<LogIn class="size-4" aria-hidden="true" />
										Entrar
									</Button>
								</form>
							{:else}
								<form
									class="space-y-4"
									onsubmit={submitRegister}
									data-testid="register-form"
								>
									<label class="block min-w-0">
										<span class={fieldLabelClass}>Usuario</span>
										<input
											class={inputClass}
											name="username"
											autocomplete="username"
											bind:value={registerDraft.username}
											data-testid="register-username"
										/>
										{#if registerErrors().username}
											<small class={fieldErrorClass}>{registerErrors().username}</small>
										{/if}
									</label>

									<label class="block min-w-0">
										<span class={fieldLabelClass}>Contrasena</span>
										<input
											class={inputClass}
											name="password"
											type="password"
											autocomplete="new-password"
											bind:value={registerDraft.password}
											data-testid="register-password"
										/>
										{#if registerErrors().password}
											<small class={fieldErrorClass}>{registerErrors().password}</small>
										{/if}
									</label>

									<label class="block min-w-0">
										<span class={fieldLabelClass}>Codigo de registro</span>
										<input
											class={inputClass}
											name="registrationCode"
											autocomplete="one-time-code"
											bind:value={registerDraft.registrationCode}
											data-testid="register-code"
										/>
										{#if registerErrors().registrationCode}
											<small class={fieldErrorClass}>{registerErrors().registrationCode}</small>
										{/if}
									</label>

									<Button
										type="submit"
										class="w-full"
										disabled={!data.backendAvailable}
										data-testid="register-submit"
									>
										<UserPlus class="size-4" aria-hidden="true" />
										Crear cuenta
									</Button>
								</form>
							{/if}

							{#if form?.success || registerResult?.success}
								<p
									class="mt-4 flex items-start gap-2 rounded-lg border border-[hsl(var(--primary)/0.2)] bg-[hsl(var(--primary)/0.06)] px-3 py-2.5 text-sm text-[hsl(var(--primary))]"
									data-testid="success-banner"
								>
									<CircleCheck class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
									<span class="min-w-0 break-words">{form?.success ?? registerResult?.success}</span>
								</p>
							{/if}

							{#if form?.error || registerResult?.error}
								<p
									class="mt-4 flex items-start gap-2 rounded-lg border border-[hsl(var(--destructive)/0.2)] bg-[hsl(var(--destructive)/0.06)] px-3 py-2.5 text-sm text-[hsl(var(--destructive))]"
									data-testid="error-banner"
								>
									<CircleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
									<span class="min-w-0 break-words">{form?.error ?? registerResult?.error}</span>
								</p>
							{/if}

							{#if data.authError}
								<p
									class="mt-4 flex items-start gap-2 rounded-lg border border-[hsl(var(--destructive)/0.2)] bg-[hsl(var(--destructive)/0.06)] px-3 py-2.5 text-sm text-[hsl(var(--destructive))]"
									data-testid="auth-error-banner"
								>
									<CircleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
									<span class="min-w-0 break-words">{data.authError}</span>
								</p>
							{/if}

							{#if data.backendError}
								<p
									class="mt-4 flex items-start gap-2 rounded-lg border border-[hsl(var(--destructive)/0.2)] bg-[hsl(var(--destructive)/0.06)] px-3 py-2.5 text-sm text-[hsl(var(--destructive))]"
									data-testid="backend-error-banner"
								>
									<CircleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
									<span class="min-w-0 break-words">{data.backendError}</span>
								</p>
							{/if}
						</div>
					</div>
				</section>
			{:else}
			<div class="flex flex-wrap items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 shadow-sm lg:hidden" aria-label="Selector de pantalla">
				<button
					type="button"
					class={`inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
						currentSection === 'products'
							? 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]'
							: 'text-[hsl(var(--muted-foreground))]'
					}`}
					onclick={() => setSection('products')}
				>
					<LayoutList class="size-4" aria-hidden="true" />
					Productos
				</button>
				<button
					type="button"
					class={`inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
						currentSection === 'recipes'
							? 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]'
							: 'text-[hsl(var(--muted-foreground))]'
					}`}
					onclick={() => setSection('recipes')}
				>
					<BookOpen class="size-4" aria-hidden="true" />
					Recetas
				</button>
			</div>
			{#if data.backendError}
				<p
					class="flex items-start gap-2 rounded-lg border border-[hsl(var(--destructive)/0.2)] bg-[hsl(var(--destructive)/0.06)] px-3 py-2.5 text-sm leading-6 text-[hsl(var(--destructive))]"
					data-testid="backend-error-banner"
				>
					<CircleAlert class="mt-1 size-4 shrink-0" aria-hidden="true" />
					<span class="min-w-0 break-words">
						{data.backendError} Revisa `BACKEND_BASE_URL` o levanta la API para habilitar la gestion completa.
					</span>
				</p>
			{/if}
			{#if currentSection === 'products'}
			<section id="products" class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div class="min-w-0">
					<h1 class="text-2xl font-semibold tracking-tight text-[hsl(var(--foreground))]">Productos</h1>
					<p class="mt-1 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
						Gestiona alimentos, calorias y macronutrientes por 100g en una vista compacta.
					</p>
				</div>
				<Button
					type="button"
					class="sm:shrink-0"
					onclick={openCreateModal}
					disabled={!data.backendAvailable}
					aria-label="Añadir producto"
					data-testid="open-create-modal"
				>
					<Plus class="size-4" aria-hidden="true" />
					Añadir producto
				</Button>
			</section>

				<section class="grid gap-3 md:grid-cols-2 xl:grid-cols-6" aria-label="Metricas del catalogo">
					<MetricCard
						label="Top Kcal"
						value={highestMetric('calories')}
						hint={`Mayor: ${richestProduct('calories')}`}
						tone="primary"
					>
						<Flame class="size-4" aria-hidden="true" />
					</MetricCard>
					<MetricCard
						label="Top carbos"
						value={highestMetric('carbohydrates')}
						hint={`Mayor: ${richestProduct('carbohydrates')}`}
					>
						<Wheat class="size-4" aria-hidden="true" />
					</MetricCard>
					<MetricCard
						label="Pico proteico"
						value={highestMetric('proteins')}
						hint={`Lider: ${richestProduct('proteins')}`}
					>
						<Drumstick class="size-4" aria-hidden="true" />
					</MetricCard>
					<MetricCard
						label="Top grasas"
						value={highestMetric('fats')}
						hint={`Mayor: ${richestProduct('fats')}`}
						tone="accent"
					>
						<Droplets class="size-4" aria-hidden="true" />
					</MetricCard>
						<MetricCard
							label="Stock total"
							value={formatNumber(totalStockQuantity())}
							hint="Suma de todas las entradas"
						>
							<Package class="size-4" aria-hidden="true" />
					</MetricCard>
					<MetricCard
						label="Lotes"
						value={String(stockEntriesCount())}
						hint="Entradas por caducidad"
						tone="accent"
					>
						<Database class="size-4" aria-hidden="true" />
					</MetricCard>
				</section>

			{#if form?.success}
				<p
					class="flex items-start gap-2 rounded-lg border border-[hsl(var(--primary)/0.2)] bg-[hsl(var(--primary)/0.06)] px-3 py-2.5 text-sm text-[hsl(var(--primary))]"
					data-testid="success-banner"
				>
					<CircleCheck class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
					<span class="min-w-0 break-words">{form.success}</span>
				</p>
			{/if}

			{#if form?.error}
				<p
					class="flex items-start gap-2 rounded-lg border border-[hsl(var(--destructive)/0.2)] bg-[hsl(var(--destructive)/0.06)] px-3 py-2.5 text-sm text-[hsl(var(--destructive))]"
					data-testid="error-banner"
				>
					<CircleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
					<span class="min-w-0 break-words">{form.error}</span>
				</p>
			{/if}

					<section class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
				<div class="flex flex-col gap-3 border-b border-[hsl(var(--border))] p-4 sm:flex-row sm:items-center sm:justify-between">
					<div class="min-w-0">
							<h2 class="text-base font-semibold text-[hsl(var(--foreground))]">Productos</h2>
						<p class="mt-1 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
							Productos con descripcion, calorias y macros principales.
						</p>
					</div>
					<span class="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-md border border-[hsl(var(--border))] px-2 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))]">
						<Leaf class="size-3.5" aria-hidden="true" />
						<span data-testid="product-count">{data.products.length}</span>
						registrados
					</span>
				</div>

				{#if data.products.length === 0}
					<div class="p-8 text-center">
						<div class="mx-auto grid size-10 place-items-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
							<Package class="size-5 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
						</div>
						<h3 class="mt-3 text-sm font-semibold text-[hsl(var(--foreground))]">No hay productos</h3>
						<p class="mx-auto mt-1 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">
							Crea el primero para empezar a construir tu catalogo nutricional.
						</p>
						<div class="mt-4">
							<Button type="button" onclick={openCreateModal} disabled={!data.backendAvailable}>
								<Plus class="size-4" aria-hidden="true" />
								Añadir producto
							</Button>
						</div>
					</div>
				{:else}
					<div data-testid="product-list">
							<div class="hidden overflow-x-auto md:block">
								<table class="w-full table-fixed text-sm">
									<colgroup>
										<col class="w-[34%]" />
										<col class="w-[10%]" />
										<col class="w-[10%]" />
										<col class="w-[10%]" />
										<col class="w-[10%]" />
										<col class="w-[12%]" />
										<col class="w-[14%]" />
									</colgroup>
									<thead class="bg-[hsl(var(--secondary))] text-xs text-[hsl(var(--muted-foreground))]">
										<tr class="border-b border-[hsl(var(--border))]">
											<th class="px-4 py-2.5 text-left font-medium">Producto</th>
											<th class="px-3 py-2.5 text-right font-medium">Kcal</th>
											<th class="px-3 py-2.5 text-right font-medium">Carbos</th>
											<th class="px-3 py-2.5 text-right font-medium">Proteinas</th>
											<th class="px-3 py-2.5 text-right font-medium">Grasas</th>
											<th class="px-3 py-2.5 text-right font-medium">Stock</th>
											<th class="px-4 py-2.5 text-right font-medium">Acciones</th>
										</tr>
									</thead>
								<tbody class="divide-y divide-[hsl(var(--border))]">
									{#each data.products as product (product.id)}
										<tr class="transition-colors hover:bg-[hsl(var(--secondary)/0.55)]" data-testid={`product-card-${product.id}`}>
											<td class="px-4 py-3 align-top">
												<div class="flex min-w-0 items-start gap-3">
													{#if product.photo}
														<button
															type="button"
															class="group mt-0.5 overflow-hidden rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-sm transition hover:border-[hsl(var(--primary)/0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
															aria-label={`Ver imagen de ${product.name}`}
															onclick={() => openProductPreview(product)}
															data-testid={`product-photo-${product.id}`}
														>
															<img
																src={productMediaUrl(product.photo)}
																alt={`Imagen de ${product.name}`}
																class="size-12 object-cover transition duration-150 group-hover:scale-105"
																loading="lazy"
																decoding="async"
															/>
														</button>
													{:else}
														<span class="mt-0.5 grid size-12 shrink-0 place-items-center rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))]">
															<Package class="size-4" aria-hidden="true" />
														</span>
													{/if}
													<div class="min-w-0">
														<div class="flex min-w-0 items-center gap-2">
															<p class="truncate font-medium text-[hsl(var(--foreground))]">{product.name}</p>
															<span class="shrink-0 rounded-md bg-[hsl(var(--secondary))] px-1.5 py-0.5 text-xs text-[hsl(var(--muted-foreground))]">
																#{product.id}
															</span>
														</div>
														<p class="mt-1 line-clamp-2 break-words text-xs leading-5 text-[hsl(var(--muted-foreground))]">
															{product.description}
														</p>
													</div>
												</div>
											</td>
											<td class="px-3 py-3 text-right align-top font-medium tabular-nums">
												{formatNumber(product.nutritionalValues.calories)}
											</td>
											<td class="px-3 py-3 text-right align-top tabular-nums">
												{formatNumber(product.nutritionalValues.carbohydrates)}g
											</td>
											<td class="px-3 py-3 text-right align-top tabular-nums">
												{formatNumber(product.nutritionalValues.proteins)}g
											</td>
											<td class="px-3 py-3 text-right align-top tabular-nums">
												{formatNumber(product.nutritionalValues.fats)}g
											</td>
											<td class="px-3 py-3 text-right align-top">
												<div class="space-y-1">
													<p class="font-medium tabular-nums">{formatNumber(stockQuantityForProduct(product.id))}</p>
													<p class="text-xs text-[hsl(var(--muted-foreground))]">
														{nearestExpirationForProduct(product.id)
															? `Caduca ${formatDate(nearestExpirationForProduct(product.id))}`
															: 'Sin lotes'}
													</p>
												</div>
											</td>
											<td class="px-4 py-3 align-top">
												<div class="flex justify-end gap-1">
													<Button
														variant="ghost"
														size="icon"
														type="button"
														aria-label="Añadir stock"
														title="Añadir stock"
														onclick={() => openStockModal(product)}
														data-testid={`stock-button-${product.id}`}
													>
														<Package class="size-4" aria-hidden="true" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														type="button"
														aria-label="Editar"
														title="Editar"
														onclick={() => openEditModal(product)}
														data-testid={`edit-button-${product.id}`}
													>
														<Pencil class="size-4" aria-hidden="true" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														type="button"
														aria-label="Eliminar"
														title="Eliminar"
														class="text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.08)] hover:text-[hsl(var(--destructive))]"
														onclick={() => openDeleteModal(product)}
														data-testid={`delete-button-${product.id}`}
													>
														<Trash2 class="size-4" aria-hidden="true" />
													</Button>
												</div>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>

						<div class="divide-y divide-[hsl(var(--border))] md:hidden">
							{#each data.products as product (product.id)}
								<article class="space-y-4 p-4">
									<div class="flex min-w-0 items-start gap-3">
										{#if product.photo}
											<button
												type="button"
												class="group overflow-hidden rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-sm transition hover:border-[hsl(var(--primary)/0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
												aria-label={`Ver imagen de ${product.name}`}
												onclick={() => openProductPreview(product)}
												data-testid={`product-photo-${product.id}`}
											>
												<img
													src={productMediaUrl(product.photo)}
													alt={`Imagen de ${product.name}`}
													class="size-12 object-cover transition duration-150 group-hover:scale-105"
													loading="lazy"
													decoding="async"
												/>
											</button>
										{:else}
											<span class="grid size-12 shrink-0 place-items-center rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))]">
												<Package class="size-4" aria-hidden="true" />
											</span>
										{/if}
										<div class="min-w-0 flex-1">
											<div class="flex min-w-0 items-center gap-2">
												<h3 class="truncate text-sm font-semibold text-[hsl(var(--foreground))]">{product.name}</h3>
												<span class="shrink-0 rounded-md bg-[hsl(var(--secondary))] px-1.5 py-0.5 text-xs text-[hsl(var(--muted-foreground))]">
													#{product.id}
												</span>
											</div>
											<p class="mt-1 break-words text-sm leading-6 text-[hsl(var(--muted-foreground))]">
												{product.description}
											</p>
										</div>
									</div>

									<dl class="grid grid-cols-2 gap-2 text-sm">
										<div class="rounded-md border border-[hsl(var(--border))] p-2.5">
											<dt class="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
												<Flame class="size-3.5" aria-hidden="true" />
												Calorias
											</dt>
											<dd class="mt-1 font-medium tabular-nums">
												{formatNumber(product.nutritionalValues.calories)}
											</dd>
										</div>
										<div class="rounded-md border border-[hsl(var(--border))] p-2.5">
											<dt class="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
												<Wheat class="size-3.5" aria-hidden="true" />
												Carbos
											</dt>
											<dd class="mt-1 font-medium tabular-nums">
												{formatNumber(product.nutritionalValues.carbohydrates)}g
											</dd>
										</div>
										<div class="rounded-md border border-[hsl(var(--border))] p-2.5">
											<dt class="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
												<Drumstick class="size-3.5" aria-hidden="true" />
												Proteinas
											</dt>
											<dd class="mt-1 font-medium tabular-nums">
												{formatNumber(product.nutritionalValues.proteins)}g
											</dd>
										</div>
										<div class="rounded-md border border-[hsl(var(--border))] p-2.5">
											<dt class="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
												<Droplets class="size-3.5" aria-hidden="true" />
												Grasas
											</dt>
											<dd class="mt-1 font-medium tabular-nums">
												{formatNumber(product.nutritionalValues.fats)}g
											</dd>
										</div>
										</dl>

										<div class="rounded-md border border-[hsl(var(--border))] p-3">
											<p class="text-xs text-[hsl(var(--muted-foreground))]">Stock disponible</p>
											<p class="mt-1 text-sm font-medium tabular-nums">{formatNumber(stockQuantityForProduct(product.id))}</p>
											<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
												{nearestExpirationForProduct(product.id)
													? `Caduca ${formatDate(nearestExpirationForProduct(product.id))}`
													: 'Sin lotes registrados'}
											</p>
										</div>

										<div class="grid grid-cols-3 gap-2">
											<Button
												variant="secondary"
												size="sm"
												type="button"
												onclick={() => openStockModal(product)}
											>
												<Package class="size-4" aria-hidden="true" />
												Stock
											</Button>
											<Button
												variant="secondary"
												size="sm"
												type="button"
												onclick={() => openEditModal(product)}
										>
											<Pencil class="size-4" aria-hidden="true" />
											Editar
										</Button>
											<Button
												variant="ghost"
												size="sm"
												type="button"
												class="text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.08)] hover:text-[hsl(var(--destructive))]"
												onclick={() => openDeleteModal(product)}
											>
												<Trash2 class="size-4" aria-hidden="true" />
												Eliminar
											</Button>
										</div>
									</article>
							{/each}
						</div>
						</div>
					{/if}
				</section>

				<section class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
					<div class="flex flex-col gap-3 border-b border-[hsl(var(--border))] p-4 sm:flex-row sm:items-center sm:justify-between">
						<div class="min-w-0">
							<h2 class="text-base font-semibold text-[hsl(var(--foreground))]">Inventario</h2>
							<p class="mt-1 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
								Entradas de stock ordenadas por caducidad para consultar el estado real del almacen.
							</p>
						</div>
						<span class="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-md border border-[hsl(var(--border))] px-2 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))]">
							<Package class="size-3.5" aria-hidden="true" />
							<span data-testid="stock-count">{data.stockEntries.length}</span>
							entradas
						</span>
					</div>

					{#if data.stockEntries.length === 0}
						<div class="p-8 text-center">
							<div class="mx-auto grid size-10 place-items-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
								<Package class="size-5 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
							</div>
							<h3 class="mt-3 text-sm font-semibold text-[hsl(var(--foreground))]">No hay stock registrado</h3>
							<p class="mx-auto mt-1 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">
								Abre el alta de stock desde un producto para ir registrando lotes y vencimientos.
							</p>
						</div>
					{:else}
						<div class="overflow-x-auto">
							<table class="w-full table-fixed text-sm">
								<colgroup>
									<col class="w-[34%]" />
									<col class="w-[14%]" />
									<col class="w-[18%]" />
									<col class="w-[18%]" />
									<col class="w-[16%]" />
								</colgroup>
								<thead class="bg-[hsl(var(--secondary))] text-xs text-[hsl(var(--muted-foreground))]">
									<tr class="border-b border-[hsl(var(--border))]">
										<th class="px-4 py-2.5 text-left font-medium">Producto</th>
										<th class="px-3 py-2.5 text-right font-medium">Cantidad</th>
										<th class="px-3 py-2.5 text-right font-medium">Caducidad</th>
										<th class="px-3 py-2.5 text-right font-medium">Entrada</th>
										<th class="px-4 py-2.5 text-right font-medium">Accion</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-[hsl(var(--border))]">
									{#each data.stockEntries as stockEntry (stockEntry.id)}
										<tr class="transition-colors hover:bg-[hsl(var(--secondary)/0.55)]">
											<td class="px-4 py-3 align-top">
												<div class="min-w-0">
													<p class="truncate font-medium text-[hsl(var(--foreground))]">{stockEntry.productName}</p>
													<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Producto #{stockEntry.productId}</p>
												</div>
											</td>
											<td class="px-3 py-3 text-right align-top font-medium tabular-nums">
												{formatNumber(stockEntry.quantity)}
											</td>
											<td class="px-3 py-3 text-right align-top tabular-nums">
												{formatDate(stockEntry.expirationDate)}
											</td>
											<td class="px-3 py-3 text-right align-top tabular-nums">
												{formatDate(stockEntry.entryDate)}
											</td>
											<td class="px-4 py-3 align-top">
												<div class="flex justify-end">
													<Button
														variant="ghost"
														size="sm"
														type="button"
														onclick={() => {
															const product = data.products.find((item: Product) => item.id === stockEntry.productId);
															if (product) openStockModal(product);
														}}
													>
														<Plus class="size-4" aria-hidden="true" />
														Añadir stock
													</Button>
												</div>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
					</section>

					{:else}
					<section id="recipes" class="space-y-4">
					<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
						<div class="min-w-0">
							<h2 class="text-2xl font-semibold tracking-tight text-[hsl(var(--foreground))]">Recetas</h2>
							<p class="mt-1 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
								Combina productos existentes, calcula nutrientes y genera productos derivados desde una sola vista.
							</p>
						</div>
						<Button
							type="button"
							class="sm:shrink-0"
							onclick={openCreateRecipeModal}
							disabled={!data.backendAvailable}
							aria-label="Añadir receta"
							data-testid="open-create-recipe-modal"
						>
							<Plus class="size-4" aria-hidden="true" />
							Añadir receta
						</Button>
					</div>

					<section class="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Metricas de recetas">
						<MetricCard
							label="Recetas activas"
							value={String(data.recipes.length)}
							hint="Preparaciones registradas"
							tone="primary"
						>
							<BookOpen class="size-4" aria-hidden="true" />
						</MetricCard>
						<MetricCard
							label="Media kcal"
							value={data.recipes.length === 0 ? '0' : formatNumber(data.recipes.reduce((sum: number, recipe: Recipe) => sum + recipe.nutritionalValues.calories, 0) / data.recipes.length)}
							hint="Calorias por receta"
						>
							<Flame class="size-4" aria-hidden="true" />
						</MetricCard>
						<MetricCard
							label="Ingredientes totales"
							value={String(data.recipes.reduce((sum: number, recipe: Recipe) => sum + recipe.ingredients.length, 0))}
							hint="Productos usados en recetas"
						>
							<LayoutList class="size-4" aria-hidden="true" />
						</MetricCard>
						<MetricCard
							label="Con derivado"
							value={String(data.recipes.filter((recipe: Recipe) => recipe.derivedProduct).length)}
							hint="Recetas con producto generado"
							tone="accent"
						>
							<Package class="size-4" aria-hidden="true" />
						</MetricCard>
					</section>

					<section class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
						<div class="flex flex-col gap-3 border-b border-[hsl(var(--border))] p-4 sm:flex-row sm:items-center sm:justify-between">
							<div class="min-w-0">
								<h3 class="text-base font-semibold text-[hsl(var(--foreground))]">Biblioteca de recetas</h3>
								<p class="mt-1 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
									Define ingredientes, instrucciones y el producto derivado que quieras exponer.
								</p>
							</div>
							<span class="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-md border border-[hsl(var(--border))] px-2 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))]">
								<BookOpen class="size-3.5" aria-hidden="true" />
								<span data-testid="recipe-count">{data.recipes.length}</span>
								registradas
							</span>
						</div>

						{#if data.recipes.length === 0}
							<div class="p-8 text-center">
								<div class="mx-auto grid size-10 place-items-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
									<BookOpen class="size-5 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
								</div>
								<h3 class="mt-3 text-sm font-semibold text-[hsl(var(--foreground))]">No hay recetas</h3>
								<p class="mx-auto mt-1 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">
									Crea la primera receta para empezar a generar preparaciones reutilizables.
								</p>
								<div class="mt-4">
									<Button type="button" onclick={openCreateRecipeModal} disabled={!data.backendAvailable}>
										<Plus class="size-4" aria-hidden="true" />
										Añadir receta
									</Button>
								</div>
							</div>
						{:else}
							<div data-testid="recipe-list">
								<div class="hidden overflow-x-auto md:block">
									<table class="w-full table-fixed text-sm">
										<colgroup>
											<col class="w-[34%]" />
											<col class="w-[14%]" />
											<col class="w-[14%]" />
											<col class="w-[18%]" />
											<col class="w-[20%]" />
										</colgroup>
										<thead class="bg-[hsl(var(--secondary))] text-xs text-[hsl(var(--muted-foreground))]">
											<tr class="border-b border-[hsl(var(--border))]">
												<th class="px-4 py-2.5 text-left font-medium">Receta</th>
												<th class="px-3 py-2.5 text-right font-medium">Ingredientes</th>
												<th class="px-3 py-2.5 text-right font-medium">Kcal</th>
												<th class="px-3 py-2.5 text-right font-medium">Derivado</th>
												<th class="px-4 py-2.5 text-right font-medium">Acciones</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-[hsl(var(--border))]">
											{#each data.recipes as recipe (recipe.id)}
												<tr class="transition-colors hover:bg-[hsl(var(--secondary)/0.55)]" data-testid={`recipe-card-${recipe.id}`}>
													<td class="px-4 py-3 align-top">
														<div class="flex min-w-0 items-start gap-3">
															<span class="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))]">
																<BookOpen class="size-4" aria-hidden="true" />
															</span>
															<div class="min-w-0">
																<div class="flex min-w-0 items-center gap-2">
																	<p class="truncate font-medium text-[hsl(var(--foreground))]">{recipe.name}</p>
																	<span class="shrink-0 rounded-md bg-[hsl(var(--secondary))] px-1.5 py-0.5 text-xs text-[hsl(var(--muted-foreground))]">
																		#{recipe.id}
																	</span>
																</div>
																<p class="mt-1 line-clamp-2 break-words text-xs leading-5 text-[hsl(var(--muted-foreground))]">
																	{recipe.description}
																</p>
															</div>
														</div>
													</td>
													<td class="px-3 py-3 text-right align-top tabular-nums">
														{recipe.ingredients.length}
													</td>
													<td class="px-3 py-3 text-right align-top font-medium tabular-nums">
														{formatNumber(recipe.nutritionalValues.calories)}
													</td>
													<td class="px-3 py-3 text-right align-top tabular-nums">
														{recipe.derivedProduct ? `${formatNumber(recipe.derivedProduct.unitsProduced)} u` : 'No'}
													</td>
													<td class="px-4 py-3 align-top">
														<div class="flex justify-end gap-1">
															<Button
																variant="ghost"
																size="icon"
																type="button"
																aria-label="Crear producto derivado"
																title="Crear producto derivado"
																onclick={() => openDerivedProductModal(recipe)}
																data-testid={`derive-button-${recipe.id}`}
															>
																<Package class="size-4" aria-hidden="true" />
															</Button>
															<Button
																variant="ghost"
																size="icon"
																type="button"
																aria-label="Editar"
																title="Editar"
																onclick={() => openEditRecipeModal(recipe)}
																data-testid={`recipe-edit-button-${recipe.id}`}
															>
																<Pencil class="size-4" aria-hidden="true" />
															</Button>
															<Button
																variant="ghost"
																size="icon"
																type="button"
																aria-label="Eliminar"
																title="Eliminar"
																class="text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.08)] hover:text-[hsl(var(--destructive))]"
																onclick={() => openDeleteRecipeModal(recipe)}
																data-testid={`recipe-delete-button-${recipe.id}`}
															>
																<Trash2 class="size-4" aria-hidden="true" />
															</Button>
														</div>
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>

								<div class="divide-y divide-[hsl(var(--border))] md:hidden">
									{#each data.recipes as recipe (recipe.id)}
										<article class="space-y-4 p-4">
											<div class="flex min-w-0 items-start gap-3">
												<span class="grid size-9 shrink-0 place-items-center rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))]">
													<BookOpen class="size-4" aria-hidden="true" />
												</span>
												<div class="min-w-0 flex-1">
													<div class="flex min-w-0 items-center gap-2">
														<h3 class="truncate text-sm font-semibold text-[hsl(var(--foreground))]">{recipe.name}</h3>
														<span class="shrink-0 rounded-md bg-[hsl(var(--secondary))] px-1.5 py-0.5 text-xs text-[hsl(var(--muted-foreground))]">
															#{recipe.id}
														</span>
													</div>
													<p class="mt-1 break-words text-sm leading-6 text-[hsl(var(--muted-foreground))]">
														{recipe.description}
													</p>
												</div>
											</div>

											<dl class="grid grid-cols-2 gap-2 text-sm">
												<div class="rounded-md border border-[hsl(var(--border))] p-2.5">
													<dt class="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
														<LayoutList class="size-3.5" aria-hidden="true" />
														Ingredientes
													</dt>
													<dd class="mt-1 font-medium tabular-nums">{recipe.ingredients.length}</dd>
												</div>
												<div class="rounded-md border border-[hsl(var(--border))] p-2.5">
													<dt class="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
														<Flame class="size-3.5" aria-hidden="true" />
														Calorias
													</dt>
													<dd class="mt-1 font-medium tabular-nums">{formatNumber(recipe.nutritionalValues.calories)}</dd>
												</div>
												<div class="rounded-md border border-[hsl(var(--border))] p-2.5">
													<dt class="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
														<Package class="size-3.5" aria-hidden="true" />
														Derivado
													</dt>
													<dd class="mt-1 font-medium tabular-nums">
														{recipe.derivedProduct ? `${formatNumber(recipe.derivedProduct.unitsProduced)} u` : 'No'}
													</dd>
												</div>
												<div class="rounded-md border border-[hsl(var(--border))] p-2.5">
													<dt class="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
														<Drumstick class="size-3.5" aria-hidden="true" />
														Proteinas
													</dt>
													<dd class="mt-1 font-medium tabular-nums">{formatNumber(recipe.nutritionalValues.proteins)}g</dd>
												</div>
											</dl>

											<div class="grid grid-cols-3 gap-2">
												<Button
													variant="secondary"
													size="sm"
													type="button"
													onclick={() => openDerivedProductModal(recipe)}
												>
													<Package class="size-4" aria-hidden="true" />
													Derivar
												</Button>
												<Button
													variant="secondary"
													size="sm"
													type="button"
													onclick={() => openEditRecipeModal(recipe)}
												>
													<Pencil class="size-4" aria-hidden="true" />
													Editar
												</Button>
												<Button
													variant="ghost"
													size="sm"
													type="button"
													class="text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.08)] hover:text-[hsl(var(--destructive))]"
													onclick={() => openDeleteRecipeModal(recipe)}
												>
													<Trash2 class="size-4" aria-hidden="true" />
													Eliminar
												</Button>
											</div>
										</article>
									{/each}
								</div>
							</div>
						{/if}
					</section>
					</section>
				{/if}
			{/if}
				</main>
			</div>

	{#if modalMode === 'product-create'}
		<div class="fixed inset-0 z-30 grid place-items-center bg-black/30 p-4 backdrop-blur-sm" role="presentation">
			<div
				class="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby="create-title"
				data-testid="create-modal"
			>
				<div class="flex items-start justify-between gap-4 border-b border-[hsl(var(--border))] p-5">
					<div class="min-w-0">
						<h2 id="create-title" class="text-lg font-semibold text-[hsl(var(--foreground))]">
							Añadir producto
						</h2>
						<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
							Introduce la informacion basica y los valores por 100g.
						</p>
					</div>
					<Button variant="ghost" size="icon" type="button" onclick={closeModal} aria-label="Cerrar modal">
						<X class="size-4" aria-hidden="true" />
					</Button>
				</div>

				<form
					method="POST"
					action="?/create"
					enctype="multipart/form-data"
					class="space-y-6 p-5"
					use:enhance={createEnhance}
					data-testid="create-form"
				>
					<fieldset class="space-y-6" disabled={!data.backendAvailable}>
						<section class="space-y-4">
							<div>
								<h3 class="text-sm font-semibold text-[hsl(var(--foreground))]">Informacion basica</h3>
								<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
									Nombre visible y descripcion corta del alimento.
								</p>
							</div>
							<div class="grid gap-4 md:grid-cols-2">
								<label class="block min-w-0">
									<span class={fieldLabelClass}>Nombre</span>
									<input
										class={inputClass}
										name="name"
										bind:value={createDraft.name}
										data-testid="create-name"
									/>
									{#if createErrors().name}
										<small class={fieldErrorClass}>{createErrors().name}</small>
									{/if}
								</label>

								<label class="block min-w-0">
									<span class={fieldLabelClass}>Por defecto gr/unidad</span>
									<input
										class={inputClass}
										name="gramsPerUnit"
										type="number"
										min="0.01"
										step="any"
										inputmode="decimal"
										bind:value={createDraft.gramsPerUnit}
										data-testid="create-grams-per-unit"
									/>
									{#if createErrors().gramsPerUnit}
										<small class={fieldErrorClass}>{createErrors().gramsPerUnit}</small>
									{/if}
								</label>

								<label class="block min-w-0 md:col-span-2">
									<span class={fieldLabelClass}>Descripcion</span>
									<textarea
										class={textareaClass}
										name="description"
										rows="4"
										bind:value={createDraft.description}
										data-testid="create-description"
									></textarea>
									{#if createErrors().description}
										<small class={fieldErrorClass}>{createErrors().description}</small>
									{/if}
								</label>
							</div>
						</section>

						<section class="space-y-4 border-t border-[hsl(var(--border))] pt-5">
							<div>
								<h3 class="text-sm font-semibold text-[hsl(var(--foreground))]">Valores nutricionales por 100g</h3>
								<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
									Usa decimales cuando el producto lo necesite.
								</p>
							</div>
							<div class="grid gap-4 md:grid-cols-2">
								<label class="block min-w-0">
									<span class={fieldLabelClass}>Calorias</span>
									<input
										class={inputClass}
										name="calories"
										inputmode="decimal"
										bind:value={createDraft.calories}
										data-testid="create-calories"
									/>
									{#if createErrors().calories}
										<small class={fieldErrorClass}>{createErrors().calories}</small>
									{/if}
								</label>
								<label class="block min-w-0">
									<span class={fieldLabelClass}>Carbohidratos</span>
									<input
										class={inputClass}
										name="carbohydrates"
										inputmode="decimal"
										bind:value={createDraft.carbohydrates}
										data-testid="create-carbohydrates"
									/>
									{#if createErrors().carbohydrates}
										<small class={fieldErrorClass}>{createErrors().carbohydrates}</small>
									{/if}
								</label>
								<label class="block min-w-0">
									<span class={fieldLabelClass}>Proteinas</span>
									<input
										class={inputClass}
										name="proteins"
										inputmode="decimal"
										bind:value={createDraft.proteins}
										data-testid="create-proteins"
									/>
									{#if createErrors().proteins}
										<small class={fieldErrorClass}>{createErrors().proteins}</small>
									{/if}
								</label>
								<label class="block min-w-0">
									<span class={fieldLabelClass}>Grasas</span>
									<input
										class={inputClass}
										name="fats"
										inputmode="decimal"
										bind:value={createDraft.fats}
										data-testid="create-fats"
									/>
									{#if createErrors().fats}
										<small class={fieldErrorClass}>{createErrors().fats}</small>
									{/if}
								</label>
							</div>
						</section>

						<section class="space-y-4 border-t border-[hsl(var(--border))] pt-5">
							<div>
								<h3 class="text-sm font-semibold text-[hsl(var(--foreground))]">Imagen del producto</h3>
								<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
									Añade una foto para verla como miniatura en el listado y abrirla desde la tarjeta.
								</p>
							</div>
							<label class="block min-w-0">
								<span class={fieldLabelClass}>Seleccionar imagen</span>
								<input
									bind:this={createPhotoInput}
									class={fileInputClass}
									name="photo"
									type="file"
									accept="image/*"
									onchange={(event) => setPhotoPreview(event, 'create')}
									data-testid="create-photo"
								/>
							</label>

							{#if createPhotoPreview}
								<div class="flex items-start gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-3">
									<img
										src={createPhotoPreview.previewUrl}
										alt={`Vista previa de ${createPhotoPreview.fileName}`}
										class="size-24 shrink-0 rounded-md border border-[hsl(var(--border))] object-cover"
										loading="lazy"
										decoding="async"
									/>
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-medium">{createPhotoPreview.fileName}</p>
										<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
											{createPhotoPreview.contentType}
										</p>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											class="mt-3"
											onclick={() => clearPhotoSelection('create')}
										>
											Quitar imagen
										</Button>
									</div>
								</div>
							{/if}
						</section>
					</fieldset>

					<div class="flex flex-col-reverse gap-2 border-t border-[hsl(var(--border))] pt-5 sm:flex-row sm:justify-end">
						<Button variant="secondary" type="button" onclick={closeModal}>Cancelar</Button>
						<Button type="submit" disabled={!data.backendAvailable}>
							<Save class="size-4" aria-hidden="true" />
							Guardar producto
						</Button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if modalMode === 'product-edit' && editingProductId !== null}
		<div class="fixed inset-0 z-30 grid place-items-center bg-black/30 p-4 backdrop-blur-sm" role="presentation">
			<div
				class="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby="edit-title"
				data-testid="edit-modal"
			>
				<div class="flex items-start justify-between gap-4 border-b border-[hsl(var(--border))] p-5">
					<div class="min-w-0">
						<h2 id="edit-title" class="text-lg font-semibold text-[hsl(var(--foreground))]">
							Editar producto
						</h2>
						<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
							Ajusta los campos manteniendo la estructura nutricional.
						</p>
					</div>
					<Button variant="ghost" size="icon" type="button" onclick={closeModal} aria-label="Cerrar modal">
						<X class="size-4" aria-hidden="true" />
					</Button>
				</div>

				<form
					method="POST"
					action="?/update"
					enctype="multipart/form-data"
					class="space-y-6 p-5"
					use:enhance={updateEnhance}
					data-testid="edit-form"
				>
					<fieldset class="space-y-6" disabled={!data.backendAvailable}>
						<input type="hidden" name="id" value={editingProductId} />

						<section class="space-y-4">
							<div>
								<h3 class="text-sm font-semibold text-[hsl(var(--foreground))]">Informacion basica</h3>
								<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
									Nombre visible y descripcion corta del alimento.
								</p>
							</div>
							<div class="grid gap-4 md:grid-cols-2">
								<label class="block min-w-0">
									<span class={fieldLabelClass}>Nombre</span>
									<input
										class={inputClass}
										name="name"
										bind:value={editDraft.name}
										data-testid="edit-name"
									/>
									{#if updateErrors().name}
										<small class={fieldErrorClass}>{updateErrors().name}</small>
									{/if}
								</label>

								<label class="block min-w-0">
									<span class={fieldLabelClass}>Por defecto gr/unidad</span>
									<input
										class={inputClass}
										name="gramsPerUnit"
										type="number"
										min="0.01"
										step="any"
										inputmode="decimal"
										bind:value={editDraft.gramsPerUnit}
										data-testid="edit-grams-per-unit"
									/>
									{#if updateErrors().gramsPerUnit}
										<small class={fieldErrorClass}>{updateErrors().gramsPerUnit}</small>
									{/if}
								</label>

								<label class="block min-w-0 md:col-span-2">
									<span class={fieldLabelClass}>Descripcion</span>
									<textarea
										class={textareaClass}
										name="description"
										rows="4"
										bind:value={editDraft.description}
										data-testid="edit-description"
									></textarea>
									{#if updateErrors().description}
										<small class={fieldErrorClass}>{updateErrors().description}</small>
									{/if}
								</label>
							</div>
						</section>

						<section class="space-y-4 border-t border-[hsl(var(--border))] pt-5">
							<div>
								<h3 class="text-sm font-semibold text-[hsl(var(--foreground))]">Imagen del producto</h3>
								<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
									Sube una nueva foto si quieres reemplazar la miniatura actual.
								</p>
							</div>
							<label class="block min-w-0">
								<span class={fieldLabelClass}>Cambiar imagen</span>
								<input
									bind:this={editPhotoInput}
									class={fileInputClass}
									name="photo"
									type="file"
									accept="image/*"
									onchange={(event) => setPhotoPreview(event, 'edit')}
									data-testid="edit-photo"
								/>
							</label>

							{#if editPhotoPreview}
								<div class="flex items-start gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-3">
									<img
										src={editPhotoPreview.previewUrl}
										alt={`Vista previa de ${editPhotoPreview.fileName}`}
										class="size-24 shrink-0 rounded-md border border-[hsl(var(--border))] object-cover"
										loading="lazy"
										decoding="async"
									/>
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-medium">{editPhotoPreview.fileName}</p>
										<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
											{editPhotoPreview.contentType}
										</p>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											class="mt-3"
											onclick={() => clearPhotoSelection('edit')}
										>
											Quitar imagen
										</Button>
									</div>
								</div>
							{:else if currentEditingProduct()?.photo}
								{@const editingProduct = currentEditingProduct()}
								<div class="flex items-start gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.25)] p-3">
									<img
										src={productMediaUrl(editingProduct!.photo!)}
										alt={`Imagen actual de ${editingProduct!.name}`}
										class="size-24 shrink-0 rounded-md border border-[hsl(var(--border))] object-cover"
										loading="lazy"
										decoding="async"
									/>
									<div class="min-w-0">
										<p class="text-sm font-medium">{editingProduct!.name}</p>
										<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
											Se mantendra si no subes una nueva.
										</p>
									</div>
								</div>
							{/if}
						</section>

						<section class="space-y-4 border-t border-[hsl(var(--border))] pt-5">
							<div>
								<h3 class="text-sm font-semibold text-[hsl(var(--foreground))]">Valores nutricionales por 100g</h3>
								<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
									Usa decimales cuando el producto lo necesite.
								</p>
							</div>
							<div class="grid gap-4 md:grid-cols-2">
								<label class="block min-w-0">
									<span class={fieldLabelClass}>Calorias</span>
									<input
										class={inputClass}
										name="calories"
										inputmode="decimal"
										bind:value={editDraft.calories}
										data-testid="edit-calories"
									/>
									{#if updateErrors().calories}
										<small class={fieldErrorClass}>{updateErrors().calories}</small>
									{/if}
								</label>
								<label class="block min-w-0">
									<span class={fieldLabelClass}>Carbohidratos</span>
									<input
										class={inputClass}
										name="carbohydrates"
										inputmode="decimal"
										bind:value={editDraft.carbohydrates}
										data-testid="edit-carbohydrates"
									/>
									{#if updateErrors().carbohydrates}
										<small class={fieldErrorClass}>{updateErrors().carbohydrates}</small>
									{/if}
								</label>
								<label class="block min-w-0">
									<span class={fieldLabelClass}>Proteinas</span>
									<input
										class={inputClass}
										name="proteins"
										inputmode="decimal"
										bind:value={editDraft.proteins}
										data-testid="edit-proteins"
									/>
									{#if updateErrors().proteins}
										<small class={fieldErrorClass}>{updateErrors().proteins}</small>
									{/if}
								</label>
								<label class="block min-w-0">
									<span class={fieldLabelClass}>Grasas</span>
									<input
										class={inputClass}
										name="fats"
										inputmode="decimal"
										bind:value={editDraft.fats}
										data-testid="edit-fats"
									/>
									{#if updateErrors().fats}
										<small class={fieldErrorClass}>{updateErrors().fats}</small>
									{/if}
								</label>
							</div>
						</section>
					</fieldset>

					<div class="flex flex-col-reverse gap-2 border-t border-[hsl(var(--border))] pt-5 sm:flex-row sm:justify-end">
						<Button variant="secondary" type="button" onclick={closeModal}>Cancelar</Button>
						<Button type="submit" disabled={!data.backendAvailable}>
							<Save class="size-4" aria-hidden="true" />
							Actualizar producto
						</Button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if modalMode === 'product-delete' && deleteProduct}
		<div class="fixed inset-0 z-30 grid place-items-center bg-black/30 p-4 backdrop-blur-sm" role="presentation">
			<div
				class="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby="delete-title"
				data-testid="delete-modal"
			>
				<div class="flex items-start justify-between gap-4 border-b border-[hsl(var(--border))] p-5">
					<div class="min-w-0">
						<h2 id="delete-title" class="text-lg font-semibold text-[hsl(var(--foreground))]">
							Eliminar producto
						</h2>
						<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
							Esta accion no se puede deshacer desde este panel.
						</p>
					</div>
					<Button variant="ghost" size="icon" type="button" onclick={closeModal} aria-label="Cerrar modal">
						<X class="size-4" aria-hidden="true" />
					</Button>
				</div>

				<div class="space-y-5 p-5">
					<div class="flex items-start gap-3 rounded-lg border border-[hsl(var(--destructive)/0.2)] bg-[hsl(var(--destructive)/0.06)] p-3">
						<CircleAlert class="mt-0.5 size-4 shrink-0 text-[hsl(var(--destructive))]" aria-hidden="true" />
						<p class="min-w-0 text-sm leading-6 text-[hsl(var(--foreground))]">
							Seguro que quieres eliminar <strong class="break-words">{deleteProduct.name}</strong>? Se retirara del catalogo actual.
						</p>
					</div>

					<form method="POST" action="?/delete" use:enhance={deleteEnhance}>
						<input type="hidden" name="id" value={deleteProduct.id} />
						<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
							<Button variant="secondary" type="button" onclick={closeModal}>No</Button>
							<Button variant="danger" type="submit">
								<Trash2 class="size-4" aria-hidden="true" />
								Si, eliminar
							</Button>
						</div>
					</form>
				</div>
			</div>
		</div>
	{/if}

	{#if modalMode === 'stock' && stockProduct}
		<div class="fixed inset-0 z-30 grid place-items-center bg-black/30 p-4 backdrop-blur-sm" role="presentation">
			<div
				class="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby="stock-title"
				data-testid="stock-modal"
			>
				<div class="flex items-start justify-between gap-4 border-b border-[hsl(var(--border))] p-5">
					<div class="min-w-0">
						<h2 id="stock-title" class="text-lg font-semibold text-[hsl(var(--foreground))]">
							Añadir stock
						</h2>
						<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
							Registra una nueva entrada para <strong class="break-words">{stockProduct.name}</strong>.
						</p>
					</div>
					<Button variant="ghost" size="icon" type="button" onclick={closeModal} aria-label="Cerrar modal">
						<X class="size-4" aria-hidden="true" />
					</Button>
				</div>

				<form method="POST" action="?/stock" class="space-y-6 p-5" use:enhance={stockEnhance} data-testid="stock-form">
					<fieldset class="space-y-6" disabled={!data.backendAvailable}>
						<input type="hidden" name="productId" value={stockDraft.productId} />

						<section class="space-y-4">
							<div>
								<h3 class="text-sm font-semibold text-[hsl(var(--foreground))]">Cantidad</h3>
								<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
									Introduce una cantidad positiva y, si aplica, la fecha de caducidad.
								</p>
							</div>
							<div class="grid gap-4 md:grid-cols-2">
								<label class="block min-w-0 md:col-span-2">
									<span class={fieldLabelClass}>Cantidad</span>
									<input
										class={inputClass}
										name="quantity"
										inputmode="decimal"
										step="any"
										bind:value={stockDraft.quantity}
										data-testid="stock-quantity"
									/>
									{#if stockErrors().quantity}
										<small class={fieldErrorClass}>{stockErrors().quantity}</small>
									{/if}
								</label>

								<label class="block min-w-0">
									<span class={fieldLabelClass}>Fecha de caducidad</span>
									<input
										class={inputClass}
										name="expirationDate"
										type="date"
										bind:value={stockDraft.expirationDate}
										data-testid="stock-expiration-date"
									/>
									{#if stockErrors().expirationDate}
										<small class={fieldErrorClass}>{stockErrors().expirationDate}</small>
									{/if}
								</label>

								<label class="block min-w-0">
									<span class={fieldLabelClass}>Fecha de entrada</span>
									<input
										class={inputClass}
										name="entryDate"
										type="date"
										bind:value={stockDraft.entryDate}
										data-testid="stock-entry-date"
									/>
									{#if stockErrors().entryDate}
										<small class={fieldErrorClass}>{stockErrors().entryDate}</small>
									{/if}
								</label>
							</div>
						</section>
					</fieldset>

					<div class="flex flex-col-reverse gap-2 border-t border-[hsl(var(--border))] pt-5 sm:flex-row sm:justify-end">
						<Button variant="secondary" type="button" onclick={closeModal}>Cancelar</Button>
						<Button type="submit" disabled={!data.backendAvailable}>
							<Save class="size-4" aria-hidden="true" />
							Guardar stock
						</Button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if modalMode === 'recipe-create'}
		<div class="fixed inset-0 z-30 grid place-items-center bg-black/30 p-4 backdrop-blur-sm" role="presentation">
			<div
				class="max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby="create-recipe-title"
				data-testid="create-recipe-modal"
			>
				<div class="flex items-start justify-between gap-4 border-b border-[hsl(var(--border))] p-5">
					<div class="min-w-0">
						<h2 id="create-recipe-title" class="text-lg font-semibold text-[hsl(var(--foreground))]">
							Añadir receta
						</h2>
						<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
							Define ingredientes, instrucciones y deja lista la receta para derivar productos.
						</p>
					</div>
					<Button variant="ghost" size="icon" type="button" onclick={closeModal} aria-label="Cerrar modal">
						<X class="size-4" aria-hidden="true" />
					</Button>
				</div>

				<form method="POST" action="?/recipeCreate" class="space-y-6 p-5" use:enhance={recipeCreateEnhance} data-testid="create-recipe-form">
					<fieldset class="space-y-6" disabled={!data.backendAvailable}>
						<section class="space-y-4">
							<div>
								<h3 class="text-sm font-semibold text-[hsl(var(--foreground))]">Informacion basica</h3>
								<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
									Nombre, descripcion e instrucciones de preparacion.
								</p>
							</div>
							<div class="grid gap-4 md:grid-cols-2">
								<label class="block min-w-0">
									<span class={fieldLabelClass}>Nombre</span>
									<input class={inputClass} name="name" bind:value={recipeCreateDraft.name} data-testid="create-recipe-name" />
									{#if recipeCreateErrors().name}
										<small class={fieldErrorClass}>{recipeCreateErrors().name}</small>
									{/if}
								</label>

								<label class="block min-w-0 md:col-span-2">
									<span class={fieldLabelClass}>Descripcion</span>
									<textarea class={textareaClass} name="description" rows="3" bind:value={recipeCreateDraft.description} data-testid="create-recipe-description"></textarea>
									{#if recipeCreateErrors().description}
										<small class={fieldErrorClass}>{recipeCreateErrors().description}</small>
									{/if}
								</label>

								<label class="block min-w-0 md:col-span-2">
									<span class={fieldLabelClass}>Instrucciones</span>
									<textarea class={textareaClass} name="instructions" rows="5" bind:value={recipeCreateDraft.instructions} data-testid="create-recipe-instructions"></textarea>
									{#if recipeCreateErrors().instructions}
										<small class={fieldErrorClass}>{recipeCreateErrors().instructions}</small>
									{/if}
								</label>
							</div>
						</section>

						<section class="space-y-4 border-t border-[hsl(var(--border))] pt-5">
							<div class="flex items-center justify-between gap-3">
								<div>
									<h3 class="text-sm font-semibold text-[hsl(var(--foreground))]">Ingredientes</h3>
									<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
										Selecciona productos y los gramos asignados a cada uno.
									</p>
								</div>
								<Button type="button" variant="secondary" size="sm" onclick={() => addRecipeIngredient('create')}>
									<Plus class="size-4" aria-hidden="true" />
									Añadir fila
								</Button>
							</div>

							{#if recipeCreateErrors().ingredients}
								<p class={fieldErrorClass}>{recipeCreateErrors().ingredients}</p>
							{/if}

							<div class="space-y-3">
								{#each recipeCreateDraft.ingredients as ingredient, index}
									<div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_auto]">
										<label class="block min-w-0">
											<span class={fieldLabelClass}>Producto</span>
											<select class={inputClass} name="ingredientProductId" bind:value={ingredient.productId} data-testid={`create-recipe-product-${index}`}>
												<option value="">Selecciona un producto</option>
												{#each data.products as product}
													<option value={String(product.id)}>{product.name}</option>
												{/each}
											</select>
											{#if recipeCreateErrors().ingredientProductId?.[index]}
												<small class={fieldErrorClass}>{recipeCreateErrors().ingredientProductId?.[index]}</small>
											{/if}
										</label>

										<label class="block min-w-0">
											<span class={fieldLabelClass}>Gramos</span>
											<input class={inputClass} name="ingredientGrams" inputmode="decimal" step="any" bind:value={ingredient.grams} data-testid={`create-recipe-grams-${index}`} />
											{#if recipeCreateErrors().ingredientGrams?.[index]}
												<small class={fieldErrorClass}>{recipeCreateErrors().ingredientGrams?.[index]}</small>
											{/if}
										</label>

										<div class="flex items-end">
											<Button
												type="button"
												variant="ghost"
												size="icon"
												disabled={recipeCreateDraft.ingredients.length <= 1}
												onclick={() => removeRecipeIngredient('create', index)}
												aria-label="Eliminar ingrediente"
											>
												<Trash2 class="size-4" aria-hidden="true" />
											</Button>
										</div>
									</div>
								{/each}
							</div>
						</section>
					</fieldset>

					<div class="flex flex-col-reverse gap-2 border-t border-[hsl(var(--border))] pt-5 sm:flex-row sm:justify-end">
						<Button variant="secondary" type="button" onclick={closeModal}>Cancelar</Button>
						<Button type="submit" disabled={!data.backendAvailable}>
							<Save class="size-4" aria-hidden="true" />
							Guardar receta
						</Button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if modalMode === 'recipe-edit' && editingRecipeId !== null}
		<div class="fixed inset-0 z-30 grid place-items-center bg-black/30 p-4 backdrop-blur-sm" role="presentation">
			<div
				class="max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby="edit-recipe-title"
				data-testid="edit-recipe-modal"
			>
				<div class="flex items-start justify-between gap-4 border-b border-[hsl(var(--border))] p-5">
					<div class="min-w-0">
						<h2 id="edit-recipe-title" class="text-lg font-semibold text-[hsl(var(--foreground))]">
							Editar receta
						</h2>
						<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
							Actualiza ingredientes e instrucciones sin perder el historial visual.
						</p>
					</div>
					<Button variant="ghost" size="icon" type="button" onclick={closeModal} aria-label="Cerrar modal">
						<X class="size-4" aria-hidden="true" />
					</Button>
				</div>

				<form method="POST" action="?/recipeUpdate" class="space-y-6 p-5" use:enhance={recipeUpdateEnhance} data-testid="edit-recipe-form">
					<fieldset class="space-y-6" disabled={!data.backendAvailable}>
						<input type="hidden" name="id" value={editingRecipeId} />

						<section class="space-y-4">
							<div>
								<h3 class="text-sm font-semibold text-[hsl(var(--foreground))]">Informacion basica</h3>
								<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
									Ajusta nombre, descripcion e instrucciones.
								</p>
							</div>
							<div class="grid gap-4 md:grid-cols-2">
								<label class="block min-w-0">
									<span class={fieldLabelClass}>Nombre</span>
									<input class={inputClass} name="name" bind:value={recipeEditDraft.name} data-testid="edit-recipe-name" />
									{#if recipeUpdateErrors().name}
										<small class={fieldErrorClass}>{recipeUpdateErrors().name}</small>
									{/if}
								</label>

								<label class="block min-w-0 md:col-span-2">
									<span class={fieldLabelClass}>Descripcion</span>
									<textarea class={textareaClass} name="description" rows="3" bind:value={recipeEditDraft.description} data-testid="edit-recipe-description"></textarea>
									{#if recipeUpdateErrors().description}
										<small class={fieldErrorClass}>{recipeUpdateErrors().description}</small>
									{/if}
								</label>

								<label class="block min-w-0 md:col-span-2">
									<span class={fieldLabelClass}>Instrucciones</span>
									<textarea class={textareaClass} name="instructions" rows="5" bind:value={recipeEditDraft.instructions} data-testid="edit-recipe-instructions"></textarea>
									{#if recipeUpdateErrors().instructions}
										<small class={fieldErrorClass}>{recipeUpdateErrors().instructions}</small>
									{/if}
								</label>
							</div>
						</section>

						<section class="space-y-4 border-t border-[hsl(var(--border))] pt-5">
							<div class="flex items-center justify-between gap-3">
								<div>
									<h3 class="text-sm font-semibold text-[hsl(var(--foreground))]">Ingredientes</h3>
									<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
										Selecciona productos y corrige los gramos si es necesario.
									</p>
								</div>
								<Button type="button" variant="secondary" size="sm" onclick={() => addRecipeIngredient('edit')}>
									<Plus class="size-4" aria-hidden="true" />
									Añadir fila
								</Button>
							</div>

							{#if recipeUpdateErrors().ingredients}
								<p class={fieldErrorClass}>{recipeUpdateErrors().ingredients}</p>
							{/if}

							<div class="space-y-3">
								{#each recipeEditDraft.ingredients as ingredient, index}
									<div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_auto]">
										<label class="block min-w-0">
											<span class={fieldLabelClass}>Producto</span>
											<select class={inputClass} name="ingredientProductId" bind:value={ingredient.productId} data-testid={`edit-recipe-product-${index}`}>
												<option value="">Selecciona un producto</option>
												{#each data.products as product}
													<option value={String(product.id)}>{product.name}</option>
												{/each}
											</select>
											{#if recipeUpdateErrors().ingredientProductId?.[index]}
												<small class={fieldErrorClass}>{recipeUpdateErrors().ingredientProductId?.[index]}</small>
											{/if}
										</label>

										<label class="block min-w-0">
											<span class={fieldLabelClass}>Gramos</span>
											<input class={inputClass} name="ingredientGrams" inputmode="decimal" step="any" bind:value={ingredient.grams} data-testid={`edit-recipe-grams-${index}`} />
											{#if recipeUpdateErrors().ingredientGrams?.[index]}
												<small class={fieldErrorClass}>{recipeUpdateErrors().ingredientGrams?.[index]}</small>
											{/if}
										</label>

										<div class="flex items-end">
											<Button
												type="button"
												variant="ghost"
												size="icon"
												disabled={recipeEditDraft.ingredients.length <= 1}
												onclick={() => removeRecipeIngredient('edit', index)}
												aria-label="Eliminar ingrediente"
											>
												<Trash2 class="size-4" aria-hidden="true" />
											</Button>
										</div>
									</div>
								{/each}
							</div>
						</section>
					</fieldset>

					<div class="flex flex-col-reverse gap-2 border-t border-[hsl(var(--border))] pt-5 sm:flex-row sm:justify-end">
						<Button variant="secondary" type="button" onclick={closeModal}>Cancelar</Button>
						<Button type="submit" disabled={!data.backendAvailable}>
							<Save class="size-4" aria-hidden="true" />
							Actualizar receta
						</Button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if modalMode === 'recipe-delete' && deleteRecipeItem}
		<div class="fixed inset-0 z-30 grid place-items-center bg-black/30 p-4 backdrop-blur-sm" role="presentation">
			<div
				class="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby="delete-recipe-title"
				data-testid="delete-recipe-modal"
			>
				<div class="flex items-start justify-between gap-4 border-b border-[hsl(var(--border))] p-5">
					<div class="min-w-0">
						<h2 id="delete-recipe-title" class="text-lg font-semibold text-[hsl(var(--foreground))]">
							Eliminar receta
						</h2>
						<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
							Esta accion elimina la receta y su producto derivado si existe.
						</p>
					</div>
					<Button variant="ghost" size="icon" type="button" onclick={closeModal} aria-label="Cerrar modal">
						<X class="size-4" aria-hidden="true" />
					</Button>
				</div>

				<div class="space-y-5 p-5">
					<div class="flex items-start gap-3 rounded-lg border border-[hsl(var(--destructive)/0.2)] bg-[hsl(var(--destructive)/0.06)] p-3">
						<CircleAlert class="mt-0.5 size-4 shrink-0 text-[hsl(var(--destructive))]" aria-hidden="true" />
						<p class="min-w-0 text-sm leading-6 text-[hsl(var(--foreground))]">
							Seguro que quieres eliminar <strong class="break-words">{deleteRecipeItem.name}</strong>? Se retirara de la biblioteca actual.
						</p>
					</div>

					<form method="POST" action="?/recipeDelete" use:enhance={recipeDeleteEnhance}>
						<input type="hidden" name="id" value={deleteRecipeItem.id} />
						<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
							<Button variant="secondary" type="button" onclick={closeModal}>No</Button>
							<Button variant="danger" type="submit">
								<Trash2 class="size-4" aria-hidden="true" />
								Si, eliminar
							</Button>
						</div>
					</form>
				</div>
			</div>
		</div>
	{/if}

	{#if modalMode === 'recipe-derive' && derivingRecipeId !== null}
		<div class="fixed inset-0 z-30 grid place-items-center bg-black/30 p-4 backdrop-blur-sm" role="presentation">
			<div
				class="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby="derive-recipe-title"
				data-testid="derive-recipe-modal"
			>
				<div class="flex items-start justify-between gap-4 border-b border-[hsl(var(--border))] p-5">
					<div class="min-w-0">
						<h2 id="derive-recipe-title" class="text-lg font-semibold text-[hsl(var(--foreground))]">
							Crear producto derivado
						</h2>
						<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
							Define el rendimiento final de la receta en gramos y unidades.
						</p>
					</div>
					<Button variant="ghost" size="icon" type="button" onclick={closeModal} aria-label="Cerrar modal">
						<X class="size-4" aria-hidden="true" />
					</Button>
				</div>

				<form method="POST" action="?/recipeDerive" class="space-y-6 p-5" use:enhance={recipeDerivedProductEnhance} data-testid="derive-recipe-form">
					<fieldset class="space-y-6" disabled={!data.backendAvailable}>
						<input type="hidden" name="id" value={derivingRecipeId} />

						<section class="space-y-4">
							<div>
								<h3 class="text-sm font-semibold text-[hsl(var(--foreground))]">Rendimiento</h3>
								<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
									La API lo usa para calcular las unidades producidas.
								</p>
							</div>
							<div class="grid gap-4 md:grid-cols-2">
								<label class="block min-w-0">
									<span class={fieldLabelClass}>Gramos producidos</span>
									<input class={inputClass} name="producedGrams" inputmode="decimal" step="any" bind:value={recipeDerivedProductDraft.producedGrams} data-testid="derive-produced-grams" />
									{#if recipeDerivedProductErrors().producedGrams}
										<small class={fieldErrorClass}>{recipeDerivedProductErrors().producedGrams}</small>
									{/if}
								</label>
								<label class="block min-w-0">
									<span class={fieldLabelClass}>Gramos por unidad</span>
									<input class={inputClass} name="gramsPerUnit" inputmode="decimal" step="any" bind:value={recipeDerivedProductDraft.gramsPerUnit} data-testid="derive-grams-per-unit" />
									{#if recipeDerivedProductErrors().gramsPerUnit}
										<small class={fieldErrorClass}>{recipeDerivedProductErrors().gramsPerUnit}</small>
									{/if}
								</label>
							</div>
						</section>
					</fieldset>

					<div class="flex flex-col-reverse gap-2 border-t border-[hsl(var(--border))] pt-5 sm:flex-row sm:justify-end">
						<Button variant="secondary" type="button" onclick={closeModal}>Cancelar</Button>
						<Button type="submit" disabled={!data.backendAvailable}>
							<Save class="size-4" aria-hidden="true" />
							Crear producto derivado
						</Button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if previewProduct?.photo}
		<div class="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4 backdrop-blur-sm" role="presentation">
			<div
				class="w-full max-w-4xl overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby="photo-preview-title"
				data-testid="photo-preview-modal"
			>
				<div class="flex items-start justify-between gap-4 border-b border-[hsl(var(--border))] p-5">
					<div class="min-w-0">
						<h2 id="photo-preview-title" class="text-lg font-semibold text-[hsl(var(--foreground))]">
							Imagen de {previewProduct.name}
						</h2>
						<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
							Presiona cerrar para volver al listado.
						</p>
					</div>
					<Button variant="ghost" size="icon" type="button" onclick={closeProductPreview} aria-label="Cerrar vista previa">
						<X class="size-4" aria-hidden="true" />
					</Button>
				</div>

				<div class="grid gap-6 p-5 md:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.8fr)]">
					<div class="overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
						<img
							src={productMediaUrl(previewProduct.photo)}
							alt={`Imagen ampliada de ${previewProduct.name}`}
							class="h-full max-h-[70vh] w-full object-contain bg-[hsl(var(--background))]"
							loading="eager"
							decoding="async"
						/>
					</div>
					<div class="space-y-4">
						<div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-4">
							<p class="text-sm font-medium">{previewProduct.name}</p>
							<p class="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
								{previewProduct.description}
							</p>
						</div>
						<dl class="grid grid-cols-1 gap-3 text-sm">
							<div class="rounded-lg border border-[hsl(var(--border))] p-3">
								<dt class="text-xs text-[hsl(var(--muted-foreground))]">Archivo</dt>
								<dd class="mt-1 break-words font-medium">{previewProduct.photo.fileName}</dd>
							</div>
							<div class="rounded-lg border border-[hsl(var(--border))] p-3">
								<dt class="text-xs text-[hsl(var(--muted-foreground))]">Tipo</dt>
								<dd class="mt-1 font-medium">{previewProduct.photo.contentType}</dd>
							</div>
							{#if previewProduct.photo.sizeBytes}
								<div class="rounded-lg border border-[hsl(var(--border))] p-3">
									<dt class="text-xs text-[hsl(var(--muted-foreground))]">Tamaño</dt>
									<dd class="mt-1 font-medium">{previewProduct.photo.sizeBytes} bytes</dd>
								</div>
							{/if}
						</dl>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
