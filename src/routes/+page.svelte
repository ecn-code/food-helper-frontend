<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import {
		BookOpen,
		CircleAlert,
		CircleCheck,
		CalendarClock,
		Database,
		Droplets,
		Drumstick,
		Eye,
		Flame,
		LayoutList,
		Leaf,
		LogIn,
		LogOut,
		Package,
		Pencil,
		Plus,
		RefreshCw,
		Save,
		Settings,
		Trash2,
		UserPlus,
		UserRound,
		TrendingUp,
		Wheat,
		Wifi,
		WifiOff,
		Search,
		Store,
		PiggyBank,
		SlidersHorizontal,
		ChevronDown,
		X
	} from '@lucide/svelte';
	import { apiBaseUrl, checkHealth, ApiError, isSessionExpiredError } from '$lib/api/backend';
	import { login as loginUser, register as registerUser } from '$lib/api/auth';
	import {
		listProductStats,
		listRecipeStats,
		type ProductStatsResponse,
		type RecipeStatsResponse
	} from '$lib/api/stats';
	import {
		createProduct as createProductRequest,
		deleteProduct as deleteProductRequest,
		listProducts,
		listProductsPage,
		updateProduct as updateProductRequest,
		type ProductPhotoPayload
	} from '$lib/api/products';
	import {
		createDerivedProduct as createDerivedProductRequest,
		createRecipe as createRecipeRequest,
		deleteRecipe as deleteRecipeRequest,
		listRecipesPage,
		updateRecipe as updateRecipeRequest
	} from '$lib/api/recipes';
	import {
		createStockEntry as createStockEntryRequest,
		listStockEntries,
		removeStockQuantity as removeStockQuantityRequest,
		updateStockEntry as updateStockEntryRequest
	} from '$lib/api/stock';
	import {
		createProposedWeekMenuDayPart as createProposedWeekMenuDayPartRequest,
		createProposedWeekMenu as createProposedWeekMenuRequest,
		getProposedWeekMenu as getProposedWeekMenuRequest,
		listProposedWeekMenuDayParts as listProposedWeekMenuDayPartsRequest,
		updateProposedWeekMenuDayPart as updateProposedWeekMenuDayPartRequest,
		upsertProposedWeekMenuDay as upsertProposedWeekMenuDayRequest
	} from '$lib/api/proposed-week-menus';
	import {
		getEstablishedWeekMenu as getEstablishedWeekMenuRequest,
		listMenus as listMenusRequest,
		publishProposedWeekMenu as publishProposedWeekMenuRequest,
		undoEstablishedWeekMenu as undoEstablishedWeekMenuRequest
	} from '$lib/api/established-week-menus';
	import Button from '$lib/components/ui/Button.svelte';
	import MetricCard from '$lib/components/ui/MetricCard.svelte';
	import StockProductSearch from '$lib/components/stock/StockProductSearch.svelte';
	import {
		emptyProductForm,
		toProductFormValues,
		type NutritionalValues,
		type Product,
		type ProductFormErrors,
		type ProductFormValues
	} from '$lib/products';
	import {
		authorizationHeader,
		clearAuthSession,
		publicAuthSession,
		readAuthSession,
		saveAuthSession,
		toAuthSession,
		type AuthSession,
		type PublicAuthSession
	} from '$lib/session';
	import { emptyStockForm, type StockEntry, type StockFormErrors, type StockFormValues } from '$lib/stock';
	import {
		emptyRecipeDerivedProductForm,
		emptyRecipeForm,
		emptyRecipeIngredient,
		toRecipeFormValues,
		toRecipeIngredientAssignments,
		toRecipeModel,
		type Recipe,
		type RecipeDerivedProductFormErrors,
		type RecipeDerivedProductFormValues,
		type RecipeFormErrors,
		type RecipeFormValues,
		type RecipeIngredientFormValues
	} from '$lib/recipes';
	import {
		emptyProposedWeekMenuCreateForm,
		emptyProposedWeekMenuDayPartForm,
		emptyProposedWeekMenuDayForm,
		emptyProposedWeekMenuDayProductForm,
		emptyProposedWeekMenuSectionForm,
		toProposedWeekMenuDayFormValues,
		toProposedWeekMenuDayPartFormValues,
		toProposedWeekMenuDayPartModel,
		toProposedWeekMenuModel,
		nextProposedWeekMenuProductSortOrder,
		type ProposedWeekMenu,
		type ProposedWeekMenuCreateFormErrors,
		type ProposedWeekMenuCreateFormValues,
		type ProposedWeekMenuDayFormErrors,
		type ProposedWeekMenuDayFormValues,
		type ProposedWeekMenuDayPartFormErrors,
		type ProposedWeekMenuDayPartFormValues,
		type ProposedWeekMenuDayProductFormValues,
		type ProposedWeekMenuDayProductFormErrors,
		type ProposedWeekMenuDayPart,
		type ProposedWeekMenuSectionFormErrors,
		type ProposedWeekMenuSectionFormValues
	} from '$lib/proposed-week-menus';
	import { toEstablishedWeekMenuModel, type EstablishedWeekMenu } from '$lib/established-week-menus';
	import { buildWeekPlanningSummary } from '$lib/week-planning';
	import ProductFilters from '$lib/components/products/ProductFilters.svelte';
	import ProductPickerDialog from '$lib/components/products/ProductPickerDialog.svelte';
	import RecipeFilters from '$lib/components/recipes/RecipeFilters.svelte';
	import SupermarketsPanel from '$lib/components/settings/SupermarketsPanel.svelte';
	import MoneyBoxPanel from '$lib/components/settings/MoneyBoxPanel.svelte';
	import NutritionalRulesPanel from '$lib/components/settings/NutritionalRulesPanel.svelte';
	import MenuCompletionPanel from '$lib/components/planning/MenuCompletionPanel.svelte';
	import DailyNutritionalEvaluation from '$lib/components/planning/DailyNutritionalEvaluation.svelte';
	import NutritionalEvaluationPanel from '$lib/components/planning/NutritionalEvaluationPanel.svelte';
	import PeoplePanel from '$lib/components/people/PeoplePanel.svelte';
	import MenuMealsTable from '$lib/components/menus/MenuMealsTable.svelte';
	import { listSupermarkets, type Supermarket } from '$lib/api/supermarkets';
	import { listPlanning, type PlanningMenuResponse } from '$lib/api/planning';
	import { listUsers, type UserResponse } from '$lib/api/users';
	import {
		emptyProductFilters,
		hasActiveProductFilters,
		type ProductFilters as ProductFiltersState
	} from '$lib/product-filters';
	import {
		emptyRecipeFilters,
		hasActiveRecipeFilters,
		type RecipeFilters as RecipeFiltersState
	} from '$lib/recipe-filters';
	import {
		validateLoginForm,
		validateRegisterForm,
		validateProductForm,
		validateRecipeDerivedProductForm,
		validateRecipeForm,
		validateStockForm
	} from '$lib/forms';

	type RegisterDraft = {
		username: string;
		password: string;
		registrationCode: string;
	};

	type AuthFormErrors = Partial<Record<'username' | 'password' | 'registrationCode', string>>;
	type LoginActionState = {
		type: 'login';
		success?: string;
		error?: string;
		values?: Partial<Record<'username', string>>;
		fieldErrors?: AuthFormErrors;
	};
	type LogoutActionState = {
		type: 'logout';
		success?: string;
		error?: string;
	};
	type RegisterActionState = {
		type: 'register';
		success?: string;
		error?: string;
		values?: Partial<RegisterDraft>;
		fieldErrors?: AuthFormErrors;
	};
	type ProductActionState = {
		type: 'create' | 'update' | 'delete';
		success?: string;
		error?: string;
		id?: number;
		values?: ProductFormValues;
		fieldErrors?: ProductFormErrors;
	};
	type StockActionState = {
		type: 'stock';
		success?: string;
		error?: string;
		id?: number;
		values?: StockFormValues;
		fieldErrors?: StockFormErrors;
	};
	type RecipeActionState = {
		type: 'recipe-create' | 'recipe-update' | 'recipe-delete' | 'recipe-derive';
		success?: string;
		error?: string;
		id?: number;
		values?: RecipeFormValues | RecipeDerivedProductFormValues;
		fieldErrors?: RecipeFormErrors | RecipeDerivedProductFormErrors;
	};
	type WeekMenuCreateActionState = {
		type: 'week-create';
		success?: string;
		error?: string;
		values?: ProposedWeekMenuCreateFormValues;
		fieldErrors?: ProposedWeekMenuCreateFormErrors;
	};
	type WeekMenuDayActionState = {
		type: 'week-day';
		success?: string;
		error?: string;
		id?: number;
		values?: ProposedWeekMenuDayFormValues;
		fieldErrors?: ProposedWeekMenuDayFormErrors;
	};
	type WeekMenuPublishActionState = {
		type: 'week-publish';
		success?: string;
		error?: string;
		id?: number;
	};
	type DayPartActionState = {
		type: 'day-part-create' | 'day-part-update';
		success?: string;
		error?: string;
		id?: number;
		values?: ProposedWeekMenuDayPartFormValues;
		fieldErrors?: ProposedWeekMenuDayPartFormErrors;
	};
	type ClientActionState =
		| LoginActionState
		| LogoutActionState
		| RegisterActionState
		| ProductActionState
		| StockActionState
		| RecipeActionState
		| WeekMenuCreateActionState
		| WeekMenuDayActionState
		| WeekMenuPublishActionState
		| DayPartActionState;

	type ModalMode =
		| 'product-create'
		| 'product-edit'
		| 'product-delete'
		| 'stock'
		| 'stock-delete'
		| 'product-view'
		| 'product-picker'
		| 'recipe-view'
		| 'recipe-create'
		| 'recipe-edit'
		| 'recipe-delete'
		| 'recipe-derive'
		| 'week-create'
		| 'week-stock'
		| 'week-day'
		| 'week-publish'
		| 'day-part'
		| null;
	type AuthMode = 'login' | 'register';
	type SectionMode =
		| 'products'
		| 'stock'
		| 'recipes'
		| 'planning'
		| 'menus'
		| 'closed-menus'
		| 'people-weights'
		| 'people-history'
		| 'people-trend'
		| 'day-parts'
		| 'supermarkets'
		| 'money-box'
		| 'nutritional-rules';
	type StockViewMode = 'block' | 'list';
	type ProductViewMode = 'block' | 'list';
	type RecipeViewMode = 'block' | 'list';
	// The planning section now comes from the backend planning catalog, not localStorage.
	type PlanningMenu = PlanningMenuResponse & {
		label: string;
	};
	type PhotoPreview = {
		fileName: string;
		contentType: string;
		previewUrl: string;
	};

	type ProductPickerTarget =
		| {
				type: 'recipe-create';
				productIndex: number;
				selectedProductId: string;
		  }
		| {
				type: 'recipe-edit';
				productIndex: number;
				selectedProductId: string;
		  }
		| {
				type: 'week-day';
				sectionIndex: number;
				productIndex: number;
				selectedProductId: string;
		  };

	type SignedPhoto = string;

	type DataState = {
		backendBaseUrl: string;
		backendAvailable: boolean;
		backendError: string | null;
		session: PublicAuthSession | null;
		products: Product[];
		recipes: Recipe[];
		stockEntries: StockEntry[];
		proposedWeekMenu: ProposedWeekMenu | null;
		establishedWeekMenu: EstablishedWeekMenu | null;
		menus: EstablishedWeekMenu[];
		proposedWeekMenuDayParts: ProposedWeekMenuDayPart[];
		productStats: ProductStatsResponse | null;
		recipeStats: RecipeStatsResponse | null;
		supermarkets: Supermarket[];
		users: UserResponse[];
		planningMenus: PlanningMenu[];
		productsLoaded: boolean;
		recipesLoaded: boolean;
		stockEntriesLoaded: boolean;
		proposedWeekMenuLoaded: boolean;
		establishedWeekMenuLoaded: boolean;
		menusLoaded: boolean;
		proposedWeekMenuDayPartsLoaded: boolean;
		productStatsLoaded: boolean;
		recipeStatsLoaded: boolean;
		supermarketsLoaded: boolean;
		usersLoaded: boolean;
		planningMenusLoaded: boolean;
		createDefaults: ProductFormValues;
		createRecipeDefaults: RecipeFormValues;
		createRecipeDerivedProductDefaults: RecipeDerivedProductFormValues;
	};

	type KnownProposedWeekMenu = {
		id: number;
		startDate: string;
		endDate: string;
	};

	const inputClass =
		'h-10 w-full cursor-text select-text rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm text-[hsl(var(--foreground))] shadow-sm transition-colors placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.14)] disabled:cursor-not-allowed disabled:bg-[hsl(var(--muted))] disabled:opacity-70';
	const fileInputClass =
		'block w-full cursor-pointer rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] text-sm text-[hsl(var(--foreground))] shadow-sm transition-colors file:mr-3 file:border-0 file:bg-[hsl(var(--secondary))] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[hsl(var(--foreground))] hover:file:bg-[hsl(var(--secondary)/0.88)] focus:border-[hsl(var(--ring))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.14)] disabled:cursor-not-allowed disabled:bg-[hsl(var(--muted))] disabled:opacity-70';
	const textareaClass =
		'min-h-24 w-full cursor-text select-text rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2 text-sm leading-6 text-[hsl(var(--foreground))] shadow-sm transition-colors placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.14)] disabled:cursor-not-allowed disabled:bg-[hsl(var(--muted))] disabled:opacity-70';
	const fieldLabelClass = 'mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]';
	const fieldErrorClass = 'mt-1.5 block text-xs text-[hsl(var(--destructive))]';
	const PRODUCT_PAGE_SIZE = 20;
	const RECIPE_PAGE_SIZE = 20;

	let data = $state<DataState>({
		backendBaseUrl: apiBaseUrl(),
		backendAvailable: true,
		backendError: null,
		session: null,
		products: [],
		recipes: [],
		stockEntries: [],
		proposedWeekMenu: null,
		establishedWeekMenu: null,
		menus: [],
		proposedWeekMenuDayParts: [],
		productStats: null,
		recipeStats: null,
		supermarkets: [],
		users: [],
		planningMenus: [],
		productsLoaded: false,
		recipesLoaded: false,
		stockEntriesLoaded: false,
		proposedWeekMenuLoaded: false,
		establishedWeekMenuLoaded: false,
		menusLoaded: false,
		proposedWeekMenuDayPartsLoaded: false,
		productStatsLoaded: false,
		recipeStatsLoaded: false,
		supermarketsLoaded: false,
		usersLoaded: false,
		planningMenusLoaded: false,
		createDefaults: emptyProductForm(),
		createRecipeDefaults: emptyRecipeForm(),
		createRecipeDerivedProductDefaults: emptyRecipeDerivedProductForm()
	});
	let form = $state<ClientActionState | null>(null);
	let authSession = $state<AuthSession | null>(null);
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
	let registerResult = $state<RegisterActionState | null>(null);
	let currentSection = $state<SectionMode>('products');
	let activeProposedWeekMenuId = $state<number | null>(null);
	let activeEstablishedWeekMenuId = $state<number | null>(null);
	let knownProposedWeekMenus = $state<KnownProposedWeekMenu[]>([]);
	let planningMenus = $state<PlanningMenu[]>([]);
	let selectedPlanningMenuId = $state<number | null>(null);
	let selectedMenuId = $state<number | null>(null);
	let selectedClosedMenuId = $state<number | null>(null);
	let menus = $state<EstablishedWeekMenu[]>([]);
	let createPhotoPreview = $state<PhotoPreview | null>(null);
	let editPhotoPreview = $state<PhotoPreview | null>(null);
	let brokenProductPhotoUrls = $state<Record<SignedPhoto, true>>({});
	let previewProduct = $state<Product | null>(null);
	let detailProduct = $state<Product | null>(null);
	let detailRecipe = $state<Recipe | null>(null);
	let deleteProduct = $state<Product | null>(null);
	let stockProduct = $state<Product | null>(null);
	let editingStockEntry = $state<StockEntry | null>(null);
	let deletingStockEntry = $state<StockEntry | null>(null);
	let stockProductFilter = $state('');
	let stockExpiresBefore = $state('');
	let stockStatsOpen = $state(false);
	let stockViewMode = $state<StockViewMode>('block');
	let productStatsOpen = $state(false);
	let productViewMode = $state<ProductViewMode>('block');
	let recipeStatsOpen = $state(false);
	let recipeViewMode = $state<RecipeViewMode>('block');
	let deleteRecipeItem = $state<Recipe | null>(null);
	let editingProductId = $state<number | null>(null);
	let editingRecipeId = $state<number | null>(null);
	let derivingRecipeId = $state<number | null>(null);
	let creatingWeekMenuDraft = $state<ProposedWeekMenuCreateFormValues>(emptyProposedWeekMenuCreateForm());
	let publishPayerUserId = $state('');
	let publishPersonIds = $state<string[]>([]);
	let dayPartDraft = $state<ProposedWeekMenuDayPartFormValues>(emptyProposedWeekMenuDayPartForm());
	let editingDayPartId = $state<number | null>(null);
	let editingWeekDayDate = $state<string | null>(null);
	let weekDayDraft = $state<ProposedWeekMenuDayFormValues>(emptyProposedWeekMenuDayForm());
	let createPhotoInput = $state<HTMLInputElement | null>(null);
	let editPhotoInput = $state<HTMLInputElement | null>(null);
	let productFilters = $state<ProductFiltersState>(emptyProductFilters());
	let recipeFilters = $state<RecipeFiltersState>(emptyRecipeFilters());
	let visibleProducts = $state<Product[]>([]);
	let visibleProductsLoaded = $state(false);
	let visibleProductsLoading = $state(false);
	let productStatsLoading = $state(false);
	let productStatsError = $state<string | null>(null);
	let productsPage = $state(0);
	let productsTotalElements = $state(0);
	let productsTotalPages = $state(1);
	let productsLoadingMore = $state(false);
	let productsFullyLoaded = $state(false);
	let productsScrollSentinel = $state<HTMLElement | null>(null);
	let recipesPage = $state(0);
	let recipesTotalElements = $state(0);
	let recipesTotalPages = $state(1);
	let recipesLoadingMore = $state(false);
	let recipesScrollSentinel = $state<HTMLElement | null>(null);
	let productPickerTarget = $state<ProductPickerTarget | null>(null);
	let productPickerPreviousModalMode = $state<ModalMode>(null);
	let sessionExpiredDialogOpen = $state(false);
	let sessionExpiredDialogMessage = $state<string | null>(null);
	let hydrated = $state(false);
	let visibleProductsRefreshTimer: ReturnType<typeof setTimeout> | null = null;
	const planningSummary = $derived(weekPlanningSummary());
	const planningDayList = $derived(weekDays());
	let recipesRefreshTimer: ReturnType<typeof setTimeout> | null = null;
	let loginSuccessTimer: ReturnType<typeof setTimeout> | null = null;
	let visibleProductsRequestToken = 0;
	let productsRequestToken = 0;
	let sessionExpiredListener: ((event: Event) => void) | null = null;
	let planningMenusLoadedAt = $state(0);
	let proposedWeekMenuLoadedAt = $state(0);
	let establishedWeekMenuLoadedAt = $state(0);
	let menusLoadedAt = $state(0);
	let proposedWeekMenuDayPartsLoadedAt = $state(0);
	const WEEK_MENU_CACHE_TTL_MS = 60_000;

	function clearLoginSuccessTimer() {
		if (loginSuccessTimer !== null) {
			clearTimeout(loginSuccessTimer);
			loginSuccessTimer = null;
		}
	}

	function scheduleLoginSuccessDismiss() {
		clearLoginSuccessTimer();
		loginSuccessTimer = setTimeout(() => {
			loginSuccessTimer = null;
			if (form?.type === 'login' && form.success) {
				form = null;
			}
		}, 3000);
	}
	let recipesRequestToken = 0;
	let productsIntersectionObserver: IntersectionObserver | null = null;
	let recipesIntersectionObserver: IntersectionObserver | null = null;
	let refreshCatalogToken = $state(0);
	const stockStatsStorageKey = 'foodhelper_stock_stats_open';
	const stockViewModeStorageKey = 'foodhelper_stock_view_mode';
	const productStatsStorageKey = 'foodhelper_product_stats_open';
	const productViewModeStorageKey = 'foodhelper_product_view_mode';
	const recipeStatsStorageKey = 'foodhelper_recipe_stats_open';
	const recipeViewModeStorageKey = 'foodhelper_recipe_view_mode';

	function loginErrors(): AuthFormErrors {
		return form?.type === 'login' && 'fieldErrors' in form
			? ((form.fieldErrors ?? {}) as AuthFormErrors)
			: {};
	}

	function registerErrors(): AuthFormErrors {
		return registerResult?.fieldErrors ?? {};
	}

	function normalizeSection(value: string | null | undefined): SectionMode {
		return value === 'recipes' ||
			value === 'stock' ||
			value === 'planning' ||
			value === 'menus' ||
			value === 'closed-menus' ||
			value === 'people-weights' ||
			value === 'people-history' ||
			value === 'people-trend' ||
			value === 'day-parts' ||
			value === 'supermarkets' ||
			value === 'money-box' ||
			value === 'nutritional-rules'
			? value
			: 'products';
	}

	function activeWeekMenuKind() {
		if (data.establishedWeekMenu) return 'established';
		if (data.proposedWeekMenu) return 'proposed';
		if (activeEstablishedWeekMenuId) return 'established';
		if (activeProposedWeekMenuId) return 'proposed';
		return null;
	}

	function activeWeekMenu() {
		return data.establishedWeekMenu ?? data.proposedWeekMenu;
	}

	function setSection(section: SectionMode) {
		currentSection = section;
		if (typeof window !== 'undefined') {
			window.location.hash = section;
		}
	}

	function sectionLabel(section: SectionMode) {
		if (section === 'recipes') return 'Recetas';
		if (section === 'stock') return 'Stock';
		if (section === 'planning') return 'Planificación';
		if (section === 'menus') return 'Menú';
		if (section === 'closed-menus') return 'Historial de menús';
		if (section === 'people-weights') return 'Pesos';
		if (section === 'people-history') return 'Historial';
		if (section === 'people-trend') return 'Evolución';
		if (section === 'day-parts') return 'Partes del dia';
		if (section === 'supermarkets') return 'Supermercados';
		if (section === 'money-box') return 'Huchas';
		if (section === 'nutritional-rules') return 'Reglas nutricionales';
		return 'Productos';
	}

	function isCacheFresh(loaded: boolean, loadedAt: number, force = false) {
		if (force || !loaded) return false;
		if (!loadedAt) return false;
		return Date.now() - loadedAt < WEEK_MENU_CACHE_TTL_MS;
	}

	function invalidateWeekMenuCaches() {
		planningMenusLoadedAt = 0;
		proposedWeekMenuLoadedAt = 0;
		establishedWeekMenuLoadedAt = 0;
		menusLoadedAt = 0;
		proposedWeekMenuDayPartsLoadedAt = 0;
	}

	function shouldRefreshMenusViewAfterMutation() {
		return currentSection === 'menus' || currentSection === 'closed-menus' || data.menusLoaded || data.establishedWeekMenuLoaded;
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
		return form?.type === 'stock' && 'fieldErrors' in form
			? ((form.fieldErrors ?? {}) as StockFormErrors)
			: {};
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

	function weekCreateErrors(): ProposedWeekMenuCreateFormErrors {
		return form?.type === 'week-create' && 'fieldErrors' in form
			? ((form.fieldErrors ?? {}) as ProposedWeekMenuCreateFormErrors)
			: {};
	}

	function weekDayErrors(): ProposedWeekMenuDayFormErrors {
		return form?.type === 'week-day' && 'fieldErrors' in form
			? ((form.fieldErrors ?? {}) as ProposedWeekMenuDayFormErrors)
			: {};
	}

	function dayPartErrors(): ProposedWeekMenuDayPartFormErrors {
		return (form?.type === 'day-part-create' || form?.type === 'day-part-update') && 'fieldErrors' in form
			? ((form.fieldErrors ?? {}) as ProposedWeekMenuDayPartFormErrors)
			: {};
	}

	function catalogProducts() {
		return hasActiveProductFilters(productFilters) ? visibleProducts : data.products;
	}

	function catalogProductCount() {
		return hasActiveProductFilters(productFilters) ? visibleProducts.length : data.products.length;
	}

	function filteredProducts() {
		return catalogProducts();
	}

	function productCountLabel() {
		if (!data.productsLoaded) return 'Cargando...';
		if (hasActiveProductFilters(productFilters)) {
			if (visibleProductsLoading) return 'Buscando...';
			return `${visibleProducts.length} de ${productsTotalElements}`;
		}
		return `${data.products.length} de ${productsTotalElements}`;
	}

	function filteredRecipes() {
		return data.recipes;
	}

	function recipeCountLabel() {
		if (!data.recipesLoaded) return 'Cargando...';
		if (hasActiveRecipeFilters(recipeFilters)) {
			return `${filteredRecipes().length} de ${recipesTotalElements}`;
		}
		return `${data.recipes.length} de ${recipesTotalElements}`;
	}

	function productLabel(productId: string | number | null | undefined) {
		if (productId === null || productId === undefined || String(productId).trim() === '') {
			return 'Selecciona un producto';
		}

		const numericId = Number(productId);
		if (Number.isNaN(numericId) || numericId <= 0) {
			return 'Selecciona un producto';
		}

		const loadedProduct = data.products.find((product) => product.id === numericId);
		if (loadedProduct) return loadedProduct.name;

		for (const recipe of data.recipes) {
			const ingredient = recipe.ingredients.find((item) => item.productId === numericId);
			if (ingredient) return ingredient.productName;
		}

		return 'Producto no encontrado';
	}

	function clearProductFilters() {
		productFilters = emptyProductFilters();
		refreshVisibleProducts(true);
	}

	function updateProductFilters(next: ProductFiltersState) {
		productFilters = next;
		refreshVisibleProducts();
	}

	function clearRecipeFilters() {
		recipeFilters = emptyRecipeFilters();
		scheduleRecipeRefresh(true);
	}

	function updateRecipeFilters(next: RecipeFiltersState) {
		recipeFilters = next;
		scheduleRecipeRefresh();
	}

	function openProductPicker(target: ProductPickerTarget) {
		productPickerTarget = target;
		productPickerPreviousModalMode = modalMode;
		modalMode = 'product-picker';
	}

	function closeProductPicker() {
		productPickerTarget = null;
		if (modalMode === 'product-picker') {
			modalMode = productPickerPreviousModalMode;
		}
		productPickerPreviousModalMode = null;
	}

	function selectProductFromPicker(productId: number) {
		const target = productPickerTarget;
		if (!target) return;

		const selectedProductId = String(productId);
		if (target.type === 'recipe-create') {
			recipeCreateDraft = {
				...recipeCreateDraft,
				ingredients: recipeCreateDraft.ingredients.map((ingredient, index) =>
					index === target.productIndex
						? { ...ingredient, productId: selectedProductId }
						: ingredient
				)
			};
		} else if (target.type === 'recipe-edit') {
			recipeEditDraft = {
				...recipeEditDraft,
				ingredients: recipeEditDraft.ingredients.map((ingredient, index) =>
					index === target.productIndex
						? { ...ingredient, productId: selectedProductId }
						: ingredient
				)
			};
		} else if (target.type === 'week-day') {
			weekDayDraft = {
				...weekDayDraft,
				sections: weekDayDraft.sections.map((section, sectionIndex) =>
					sectionIndex === target.sectionIndex
						? {
								...section,
								products: section.products.map((product, productIndex) =>
									productIndex === target.productIndex
										? { ...product, productId: selectedProductId }
										: product
								)
						  }
						: section
				)
			};
		}

		closeProductPicker();
	}

	function resetCatalogState() {
		if (visibleProductsRefreshTimer !== null) {
			clearTimeout(visibleProductsRefreshTimer);
			visibleProductsRefreshTimer = null;
		}
		visibleProductsRequestToken += 1;
		productsRequestToken += 1;
		recipesRequestToken += 1;
		if (productsIntersectionObserver) {
			productsIntersectionObserver.disconnect();
			productsIntersectionObserver = null;
		}
		if (recipesIntersectionObserver) {
			recipesIntersectionObserver.disconnect();
			recipesIntersectionObserver = null;
		}
		visibleProducts = [];
		visibleProductsLoaded = false;
		visibleProductsLoading = false;
		productsPage = 0;
		productsTotalElements = 0;
		productsTotalPages = 1;
		productsLoadingMore = false;
		productsFullyLoaded = false;
		recipesPage = 0;
		recipesTotalElements = 0;
		recipesTotalPages = 1;
		recipesLoadingMore = false;
		data.products = [];
		data.recipes = [];
		data.stockEntries = [];
		data.proposedWeekMenu = null;
		data.establishedWeekMenu = null;
		data.menus = [];
		data.proposedWeekMenuDayParts = [];
		data.productStats = null;
		productStatsLoading = false;
		productStatsError = null;
		data.recipeStats = null;
		data.supermarkets = [];
		data.users = [];
		data.planningMenus = [];
		data.productsLoaded = false;
		data.recipesLoaded = false;
		data.stockEntriesLoaded = false;
		data.proposedWeekMenuLoaded = false;
		data.establishedWeekMenuLoaded = false;
		data.menusLoaded = false;
		data.proposedWeekMenuDayPartsLoaded = false;
		data.productStatsLoaded = false;
		data.recipeStatsLoaded = false;
		data.supermarketsLoaded = false;
		data.usersLoaded = false;
		data.planningMenusLoaded = false;
		planningMenusLoadedAt = 0;
		proposedWeekMenuLoadedAt = 0;
		establishedWeekMenuLoadedAt = 0;
		menusLoadedAt = 0;
		proposedWeekMenuDayPartsLoadedAt = 0;
		productFilters = emptyProductFilters();
		recipeFilters = emptyRecipeFilters();
		productPickerTarget = null;
		brokenProductPhotoUrls = {};
		activeProposedWeekMenuId = null;
		activeEstablishedWeekMenuId = null;
		selectedPlanningMenuId = null;
		selectedMenuId = null;
		selectedClosedMenuId = null;
		creatingWeekMenuDraft = emptyProposedWeekMenuCreateForm();
		dayPartDraft = emptyProposedWeekMenuDayPartForm();
		editingDayPartId = null;
		editingWeekDayDate = null;
		weekDayDraft = emptyProposedWeekMenuDayForm();
		if (typeof window !== 'undefined') {
			window.localStorage.removeItem('foodhelper_proposed_week_menu_id');
			window.localStorage.removeItem('foodhelper_established_week_menu_id');
			window.localStorage.removeItem('foodhelper_selected_planning_menu_id');
			window.localStorage.removeItem('foodhelper_selected_menu_id');
			window.localStorage.removeItem('foodhelper_selected_closed_menu_id');
		}
	}

	async function loadProducts(session = authSession) {
		if (!session) return;

		if (productsLoadingMore) return;

		const requestToken = ++productsRequestToken;
		const authorization = authorizationHeader(session);
		data.products = [];
		data.productsLoaded = false;
		visibleProducts = [];
		visibleProductsLoaded = false;
		visibleProductsLoading = false;
		productsPage = 0;
		productsTotalElements = 0;
		productsTotalPages = 1;
		productsFullyLoaded = false;
		productsLoadingMore = true;

		try {
			const response = await listProductsPage(authorization, { page: 0, size: PRODUCT_PAGE_SIZE });
			if (requestToken !== productsRequestToken) return;

			data.products = response.items;
			brokenProductPhotoUrls = {};
			data.productsLoaded = true;
			productsPage = response.page + 1;
			productsTotalElements = response.totalElements;
			productsTotalPages = Math.max(response.totalPages, 1);
			productsFullyLoaded = productsPage >= productsTotalPages;
			refreshVisibleProducts(true, session);
		} finally {
			if (requestToken === productsRequestToken) {
				productsLoadingMore = false;
			}
		}
	}

	async function loadMoreProducts(session = authSession) {
		if (!session) return;
		if (productsLoadingMore || productsPage >= productsTotalPages || productsFullyLoaded) return;

		const requestToken = productsRequestToken;
		const authorization = authorizationHeader(session);
		const pageToLoad = productsPage;
		productsLoadingMore = true;

		try {
			const response = await listProductsPage(authorization, { page: pageToLoad, size: PRODUCT_PAGE_SIZE });
			if (requestToken !== productsRequestToken) return;

			data.products = [...data.products, ...response.items];
			productsPage = response.page + 1;
			productsTotalElements = response.totalElements;
			productsTotalPages = Math.max(response.totalPages, 1);
			productsFullyLoaded = productsPage >= productsTotalPages;
			refreshVisibleProducts(true, session);
		} finally {
			if (requestToken === productsRequestToken) {
				productsLoadingMore = false;
			}
		}
	}

	async function loadAllProducts(session = authSession) {
		if (!session) return;

		const requestToken = ++productsRequestToken;
		const authorization = authorizationHeader(session);
		data.productsLoaded = false;
		productsLoadingMore = true;

		try {
			const products = await listProducts(authorization);
			if (requestToken !== productsRequestToken) return;

			data.products = products;
			brokenProductPhotoUrls = {};
			data.productsLoaded = true;
			productsPage = 1;
			productsTotalElements = products.length;
			productsTotalPages = 1;
			productsFullyLoaded = true;
			refreshVisibleProducts(true, session);
		} finally {
			if (requestToken === productsRequestToken) {
				productsLoadingMore = false;
			}
		}
	}

	function cancelVisibleProductsRefresh() {
		if (visibleProductsRefreshTimer !== null) {
			clearTimeout(visibleProductsRefreshTimer);
			visibleProductsRefreshTimer = null;
		}
		visibleProductsRequestToken += 1;
	}

	function cancelRecipesRefresh() {
		if (recipesRefreshTimer !== null) {
			clearTimeout(recipesRefreshTimer);
			recipesRefreshTimer = null;
		}
		recipesRequestToken += 1;
	}

	function scheduleRecipeRefresh(immediate = false) {
		cancelRecipesRefresh();
		if (!authSession) return;
		if (!hasActiveRecipeFilters(recipeFilters)) {
			void loadRecipes(authSession, true);
			return;
		}
		if (immediate) {
			void loadRecipes(authSession, true);
			return;
		}
		recipesRefreshTimer = setTimeout(() => {
			recipesRefreshTimer = null;
			void loadRecipes(authSession, true);
		}, 180);
	}

	async function loadVisibleProducts(session = authSession) {
		if (!session) return;

		if (!hasActiveProductFilters(productFilters)) {
			visibleProducts = data.products;
			visibleProductsLoaded = data.productsLoaded;
			visibleProductsLoading = false;
			return;
		}

		const requestToken = ++visibleProductsRequestToken;
		const authorization = authorizationHeader(session);

		try {
			const products = await listProducts(authorization, { filters: productFilters });
			if (requestToken !== visibleProductsRequestToken) return;
			visibleProducts = products;
			visibleProductsLoaded = true;
		} catch (error) {
			if (requestToken !== visibleProductsRequestToken) return;
			if (handleExpiredSession(error)) {
				return;
			}
			data.backendError = error instanceof ApiError ? error.message : 'No se pudieron cargar los productos filtrados.';
		} finally {
			if (requestToken === visibleProductsRequestToken) {
				visibleProductsLoading = false;
			}
		}
	}

	function refreshVisibleProducts(immediate = false, session = authSession) {
		cancelVisibleProductsRefresh();

		if (!session) {
			visibleProducts = [];
			visibleProductsLoaded = false;
			visibleProductsLoading = false;
			return;
		}

		if (!hasActiveProductFilters(productFilters)) {
			visibleProducts = data.products;
			visibleProductsLoaded = data.productsLoaded;
			visibleProductsLoading = false;
			return;
		}

		visibleProductsLoaded = false;
		visibleProductsLoading = true;

		if (immediate) {
			void loadVisibleProducts(session);
			return;
		}

		visibleProductsRefreshTimer = setTimeout(() => {
			visibleProductsRefreshTimer = null;
			void loadVisibleProducts(session);
		}, 180);
	}

	async function loadProductStats(session = authSession) {
		if (!session || productStatsLoading) return;

		const authorization = authorizationHeader(session);
		productStatsLoading = true;
		productStatsError = null;

		try {
			data.productStats = await listProductStats(authorization);
			data.productStatsLoaded = true;
		} catch (error) {
			data.productStats = null;
			data.productStatsLoaded = false;

			if (isSessionExpiredError(error)) {
				throw error;
			}

			productStatsError = 'No se pudieron cargar las estadísticas de productos.';
		} finally {
			productStatsLoading = false;
		}
	}

	async function loadRecipes(session = authSession, reset = true) {
		if (!session) return;

		if (recipesLoadingMore) return;
		if (!reset && recipesPage >= recipesTotalPages) return;

		const pageToLoad = reset ? 0 : recipesPage;
		const requestToken = reset ? ++recipesRequestToken : recipesRequestToken;
		const authorization = authorizationHeader(session);

		if (reset) {
			data.recipesLoaded = false;
			data.recipes = [];
			recipesPage = 0;
			recipesTotalElements = 0;
			recipesTotalPages = 1;
		}

		recipesLoadingMore = true;

		try {
			const response = await listRecipesPage(authorization, {
				page: pageToLoad,
				size: RECIPE_PAGE_SIZE,
				search: recipeFilters.search.trim() || undefined,
				derived: recipeFilters.derived,
				caloriesMin: recipeFilters.metrics.calories.min || undefined,
				caloriesMax: recipeFilters.metrics.calories.max || undefined,
				carbohydratesMin: recipeFilters.metrics.carbohydrates.min || undefined,
				carbohydratesMax: recipeFilters.metrics.carbohydrates.max || undefined,
				proteinsMin: recipeFilters.metrics.proteins.min || undefined,
				proteinsMax: recipeFilters.metrics.proteins.max || undefined,
				fatsMin: recipeFilters.metrics.fats.min || undefined,
				fatsMax: recipeFilters.metrics.fats.max || undefined
			});
			if (requestToken !== recipesRequestToken) return;

			const nextRecipes = response.items.map(toRecipeModel);
			data.recipes = reset ? nextRecipes : [...data.recipes, ...nextRecipes];
			recipesPage = response.page + 1;
			recipesTotalElements = response.totalElements;
			recipesTotalPages = Math.max(response.totalPages, 1);
			data.recipesLoaded = true;
		} finally {
			if (requestToken === recipesRequestToken) {
				recipesLoadingMore = false;
			}
		}
	}

	async function loadMoreRecipes(session = authSession) {
		await loadRecipes(session, false);
	}

	$effect(() => {
		if (!hydrated || !productsScrollSentinel || currentSection !== 'products') return;
		if (hasActiveProductFilters(productFilters)) return;

		if (productsIntersectionObserver) {
			productsIntersectionObserver.disconnect();
			productsIntersectionObserver = null;
		}

		productsIntersectionObserver = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				if (!entry?.isIntersecting) return;
				if (!authSession || productsLoadingMore || productsPage >= productsTotalPages || productsFullyLoaded) return;
				void loadMoreProducts(authSession);
			},
			{ rootMargin: '360px 0px' }
		);
		productsIntersectionObserver.observe(productsScrollSentinel);

		return () => {
			productsIntersectionObserver?.disconnect();
			productsIntersectionObserver = null;
		};
	});

	$effect(() => {
		if (!hydrated || !recipesScrollSentinel || currentSection !== 'recipes') return;

		if (recipesIntersectionObserver) {
			recipesIntersectionObserver.disconnect();
			recipesIntersectionObserver = null;
		}

		recipesIntersectionObserver = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				if (!entry?.isIntersecting) return;
				if (!authSession || recipesLoadingMore || recipesPage >= recipesTotalPages) return;
				void loadMoreRecipes(authSession);
			},
			{ rootMargin: '360px 0px' }
		);
		recipesIntersectionObserver.observe(recipesScrollSentinel);

		return () => {
			recipesIntersectionObserver?.disconnect();
			recipesIntersectionObserver = null;
		};
	});

	async function loadRecipeStats(session = authSession) {
		if (!session) return;

		const authorization = authorizationHeader(session);
		data.recipeStats = await listRecipeStats(authorization);
		data.recipeStatsLoaded = true;
	}

	async function loadStockEntries(session = authSession) {
		if (!session) return;

		const authorization = authorizationHeader(session);
		data.stockEntries = await listStockEntries(authorization);
		data.stockEntriesLoaded = true;
	}

	async function loadSupermarketsForProducts(session = authSession) {
		if (!session) return;
		data.supermarkets = await listSupermarkets(authorizationHeader(session));
		data.supermarketsLoaded = true;
	}

	async function loadUsers(session = authSession) {
		if (!session) return;
		data.users = await listUsers(authorizationHeader(session));
		data.usersLoaded = true;
	}

	function planningMenuLabel(menu: PlanningMenuResponse) {
		return `#${menu.id} · ${weekDateRangeLabel(menu.startDate, menu.endDate)}`;
	}

	function draftPlanningMenus() {
		return planningMenus.filter((menu) => menu.state === 'DRAFT');
	}

	function planningMenusForSelector() {
		return draftPlanningMenus();
	}

	function menuLabel(menu: EstablishedWeekMenu) {
		return `Menú #${menu.id} · ${weekDateRangeLabel(menu.startDate, menu.endDate)} · ${menu.payerUsername}`;
	}

	function planningStateByMenuId(menuId: number) {
		return planningMenus.find((menu) => menu.menuId === menuId)?.state ?? null;
	}

	function inProgressMenus() {
		return menus.filter((menu) => planningStateByMenuId(menu.id) === 'ESTABLISHED');
	}

	function closedMenus() {
		return menus.filter((menu) => planningStateByMenuId(menu.id) === 'CLOSED');
	}

	async function loadPlanningMenus(session = authSession) {
		if (!session) return;
		const planning = await listPlanning(authorizationHeader(session));
		planningMenus = planning.map((menu) => ({ ...menu, label: planningMenuLabel(menu) }));
		data.planningMenus = planning.map((menu) => ({ ...menu, label: planningMenuLabel(menu) }));
		data.planningMenusLoaded = true;
		planningMenusLoadedAt = Date.now();
		const draftMenus = planningMenus.filter((menu) => menu.state === 'DRAFT');
		if (selectedPlanningMenuId && !planningMenus.some((menu) => menu.id === selectedPlanningMenuId)) {
			selectedPlanningMenuId = draftMenus[0]?.id ?? null;
		}
	}

	async function loadMenus(session = authSession) {
		if (!session) return;
		const authorization = authorizationHeader(session);
		menus = (await listMenusRequest(authorization)).map((menu) => toEstablishedWeekMenuModel(menu));
		data.menus = menus;
		data.menusLoaded = true;
		menusLoadedAt = Date.now();
		if (selectedMenuId && !inProgressMenus().some((menu) => menu.id === selectedMenuId)) {
			selectedMenuId = inProgressMenus()[0]?.id ?? null;
		}
	}

	async function selectMenu(menuId: number) {
		const menu = menus.find((item) => item.id === menuId) ?? null;
		if (!authSession || !menu || menuId === selectedMenuId) return;

		selectedMenuId = menuId;
		if (typeof window !== 'undefined') {
			window.localStorage.setItem('foodhelper_selected_menu_id', String(menuId));
		}

		try {
			await loadEstablishedWeekMenu(authSession, menuId);
			setSection('menus');
		} catch (error) {
			if (handleExpiredSession(error)) {
				return;
			}
			data.backendError = error instanceof ApiError ? error.message : 'No se pudo cargar el menú.';
		}
	}

	async function selectClosedMenu(menuId: number) {
		const menu = menus.find((item) => item.id === menuId) ?? null;
		if (!authSession || !menu || menuId === selectedClosedMenuId) return;

		selectedClosedMenuId = menuId;
		if (typeof window !== 'undefined') {
			window.localStorage.setItem('foodhelper_selected_closed_menu_id', String(menuId));
		}

		const planningMenu = planningMenus.find((item) => item.menuId === menuId) ?? null;
		if (planningMenu) {
			selectedPlanningMenuId = planningMenu.id;
			if (typeof window !== 'undefined') {
				window.localStorage.setItem('foodhelper_selected_planning_menu_id', String(planningMenu.id));
			}
		}

		try {
			await loadClosedEstablishedWeekMenu(authSession, menuId);
			setSection('closed-menus');
		} catch (error) {
			if (handleExpiredSession(error)) {
				return;
			}
			data.backendError = error instanceof ApiError ? error.message : 'No se pudo cargar el menú cerrado.';
		}
	}

	async function loadProposedWeekMenu(session = authSession, menuId = activeProposedWeekMenuId) {
		if (!session) return;

		if (!menuId) {
			data.proposedWeekMenu = null;
			data.proposedWeekMenuLoaded = true;
			return;
		}

		const authorization = authorizationHeader(session);
		try {
			data.proposedWeekMenu = toProposedWeekMenuModel(await getProposedWeekMenuRequest(menuId, authorization));
			data.proposedWeekMenuLoaded = true;
			proposedWeekMenuLoadedAt = Date.now();
			activeProposedWeekMenuId = data.proposedWeekMenu.id;
			activeEstablishedWeekMenuId = null;
			rememberProposedWeekMenu(data.proposedWeekMenu);
			selectedPlanningMenuId = data.proposedWeekMenu.id;
		} catch (error) {
			if (error instanceof ApiError && error.status === 404) {
				forgetProposedWeekMenu(menuId);
				clearActiveWeekMenu();
				data.proposedWeekMenuLoaded = true;
				return;
			}
			if (handleExpiredSession(error)) {
				return;
			}
			throw error;
		}
	}

	async function loadEstablishedWeekMenu(
		session = authSession,
		menuId = activeEstablishedWeekMenuId,
		target: 'selected' | 'closed' = 'selected'
	) {
		if (!session) return;

		if (!menuId) {
			data.establishedWeekMenu = null;
			data.establishedWeekMenuLoaded = true;
			if (target === 'closed') {
				selectedClosedMenuId = null;
			} else {
				selectedMenuId = null;
			}
			return;
		}

		const authorization = authorizationHeader(session);
		try {
			data.establishedWeekMenu = toEstablishedWeekMenuModel(
				await getEstablishedWeekMenuRequest(menuId, authorization)
			);
			data.establishedWeekMenuLoaded = true;
			establishedWeekMenuLoadedAt = Date.now();
			activeEstablishedWeekMenuId = data.establishedWeekMenu.id;
			activeProposedWeekMenuId = null;
			if (target === 'closed') {
				selectedClosedMenuId = data.establishedWeekMenu.id;
			} else {
				selectedMenuId = data.establishedWeekMenu.id;
			}
			selectedPlanningMenuId = data.establishedWeekMenu.proposedWeekMenuId;
			if (typeof window !== 'undefined') {
				if (target === 'closed') {
					window.localStorage.setItem('foodhelper_selected_closed_menu_id', String(data.establishedWeekMenu.id));
				} else {
					window.localStorage.setItem('foodhelper_selected_menu_id', String(data.establishedWeekMenu.id));
				}
				window.localStorage.setItem('foodhelper_selected_planning_menu_id', String(data.establishedWeekMenu.proposedWeekMenuId));
			}
		} catch (error) {
			if (error instanceof ApiError && error.status === 404) {
				clearActiveWeekMenu();
				data.establishedWeekMenuLoaded = true;
				return;
			}
			if (handleExpiredSession(error)) {
				return;
			}
			throw error;
		}
	}

	async function loadClosedEstablishedWeekMenu(session = authSession, menuId = selectedClosedMenuId) {
		return await loadEstablishedWeekMenu(session, menuId, 'closed');
	}

	async function loadProposedWeekMenuDayParts(session = authSession) {
		if (!session) return;

		const authorization = authorizationHeader(session);
		data.proposedWeekMenuDayParts = (await listProposedWeekMenuDayPartsRequest(authorization)).map(
			toProposedWeekMenuDayPartModel
		);
		data.proposedWeekMenuDayPartsLoaded = true;
		proposedWeekMenuDayPartsLoadedAt = Date.now();
	}

	async function refreshProductsView(session = authSession, force = false) {
		if (!session) {
			resetCatalogState();
			return;
		}

		const tasks: Promise<void>[] = [];

		if (force || !data.productsLoaded) {
			tasks.push(loadProducts(session));
		}

		if (force || !data.stockEntriesLoaded) {
			tasks.push(loadStockEntries(session));
		}

		if (force || !data.productStatsLoaded) {
			tasks.push(loadProductStats(session));
		}

		if (force || !data.supermarketsLoaded) {
			tasks.push(loadSupermarketsForProducts(session));
		}

		await Promise.all(tasks);
	}

	async function refreshRecipesView(session = authSession, force = false) {
		if (!session) {
			resetCatalogState();
			return;
		}

		const tasks: Promise<void>[] = [];

		if (force || !data.recipesLoaded) {
			tasks.push(loadRecipes(session, true));
		}

		if (force || !data.recipeStatsLoaded) {
			tasks.push(loadRecipeStats(session));
		}

		await Promise.all(tasks);
	}

	async function refreshPlanningView(session = authSession, force = false) {
		if (!session) {
			resetCatalogState();
			return;
		}

		if (!isCacheFresh(data.planningMenusLoaded, planningMenusLoadedAt, force)) {
			await loadPlanningMenus(session);
		}

		const draftMenus = planningMenus.filter((menu) => menu.state === 'DRAFT');
		let selectedMenu = draftMenus.find((menu) => menu.id === selectedPlanningMenuId) ?? draftMenus[0] ?? null;
		if (!selectedMenu) {
			selectedPlanningMenuId = null;
			if (force || !data.proposedWeekMenuLoaded) {
				await loadProposedWeekMenu(session, null);
			}
			return;
		}
		selectedPlanningMenuId = selectedMenu.id;
		if (typeof window !== 'undefined') {
			window.localStorage.setItem('foodhelper_selected_planning_menu_id', String(selectedMenu.id));
		}
		const tasks: Promise<void>[] = [];

		if (force || !productsFullyLoaded) {
			tasks.push(loadAllProducts(session));
		}

		if (!isCacheFresh(data.proposedWeekMenuLoaded, proposedWeekMenuLoadedAt, force) || activeProposedWeekMenuId !== selectedMenu.id) {
			tasks.push(loadProposedWeekMenu(session, selectedMenu.id));
		}

		if (!isCacheFresh(data.proposedWeekMenuDayPartsLoaded, proposedWeekMenuDayPartsLoadedAt, force)) {
			tasks.push(loadProposedWeekMenuDayParts(session));
		}

		if (force || !data.stockEntriesLoaded) {
			tasks.push(loadStockEntries(session));
		}

		if (force || !data.usersLoaded) {
			tasks.push(loadUsers(session));
		}

		await Promise.all(tasks);
	}

	async function refreshMenusView(session = authSession, force = false) {
		if (!session) {
			resetCatalogState();
			return;
		}

		if (!isCacheFresh(data.planningMenusLoaded, planningMenusLoadedAt, force)) {
			await loadPlanningMenus(session);
		}

		if (!isCacheFresh(data.menusLoaded, menusLoadedAt, force)) {
			await loadMenus(session);
		}
	}

	async function refreshClosedMenusView(session = authSession, force = false) {
		if (!session) {
			resetCatalogState();
			return;
		}

		if (!isCacheFresh(data.planningMenusLoaded, planningMenusLoadedAt, force)) {
			await loadPlanningMenus(session);
		}

		if (!isCacheFresh(data.menusLoaded, menusLoadedAt, force)) {
			await loadMenus(session);
		}

		const closed = closedMenus();
		if (selectedClosedMenuId && !closed.some((menu) => menu.id === selectedClosedMenuId)) {
			selectedClosedMenuId = null;
		}

		let menuId = selectedClosedMenuId;
		if (!menuId && closed.length > 0) {
			menuId = closed[0].id;
			selectedClosedMenuId = menuId;
		}

		if (!menuId) {
			if (force || !data.establishedWeekMenuLoaded) {
				await loadEstablishedWeekMenu(session, null, 'closed');
			}
			return;
		}

		if (!isCacheFresh(data.establishedWeekMenuLoaded, establishedWeekMenuLoadedAt, force) || activeEstablishedWeekMenuId !== menuId) {
			await loadEstablishedWeekMenu(session, menuId, 'closed');
		}
	}

	async function refreshPeopleView(session = authSession, force = false) {
		if (!session) {
			resetCatalogState();
			return;
		}

		if (force || !data.usersLoaded) {
			await loadUsers(session);
		}
	}

	async function refreshDayPartsView(session = authSession, force = false) {
		if (!session) {
			resetCatalogState();
			return;
		}

		if (force || !data.proposedWeekMenuDayPartsLoaded) {
			await loadProposedWeekMenuDayParts(session);
		}
	}

	async function refreshCurrentView(session = authSession, force = false) {
		if (currentSection === 'recipes') {
			await refreshRecipesView(session, force);
			return;
		}

		if (currentSection === 'planning') {
			await refreshPlanningView(session, force);
			return;
		}

		if (currentSection === 'menus') {
			await refreshMenusView(session, force);
			return;
		}

		if (currentSection === 'closed-menus') {
			await refreshClosedMenusView(session, force);
			return;
		}

		if (currentSection === 'day-parts') {
			await refreshDayPartsView(session, force);
			return;
		}

		if (currentSection === 'people-weights' || currentSection === 'people-history' || currentSection === 'people-trend') {
			await refreshPeopleView(session, force);
			return;
		}

		if (currentSection === 'supermarkets' || currentSection === 'money-box' || currentSection === 'nutritional-rules') {
			return;
		}

		await refreshProductsView(session, force);
	}

	onMount(() => {
		hydrated = true;
		currentSection = normalizeSection(window.location.hash.slice(1));
		sessionExpiredListener = (event: Event) => {
			const detail = (event as CustomEvent<{ message?: string }>).detail;
			openSessionExpiredDialog(detail?.message);
		};

		const syncSection = () => {
			currentSection = normalizeSection(window.location.hash.slice(1));
			void refreshCurrentView();
		};

		const bootstrap = async () => {
			data.backendBaseUrl = apiBaseUrl();
			const storedSession = readAuthSession();
			authSession = storedSession;
			data.session = storedSession ? publicAuthSession(storedSession) : null;
			data.backendError = null;
			const storedSelectedPlanningMenuId =
				typeof window !== 'undefined'
					? Number(window.localStorage.getItem('foodhelper_selected_planning_menu_id') ?? '')
					: Number.NaN;
			selectedPlanningMenuId = Number.isNaN(storedSelectedPlanningMenuId) || storedSelectedPlanningMenuId <= 0 ? null : storedSelectedPlanningMenuId;
			const storedSelectedMenuId =
				typeof window !== 'undefined'
					? Number(window.localStorage.getItem('foodhelper_selected_menu_id') ?? '')
					: Number.NaN;
			selectedMenuId = Number.isNaN(storedSelectedMenuId) || storedSelectedMenuId <= 0 ? null : storedSelectedMenuId;
			const storedSelectedClosedMenuId =
				typeof window !== 'undefined'
					? Number(window.localStorage.getItem('foodhelper_selected_closed_menu_id') ?? '')
					: Number.NaN;
			selectedClosedMenuId =
				Number.isNaN(storedSelectedClosedMenuId) || storedSelectedClosedMenuId <= 0 ? null : storedSelectedClosedMenuId;
			const prefersCompactStockList =
				typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
			const storedStockStatsOpen = typeof window !== 'undefined' ? window.localStorage.getItem(stockStatsStorageKey) : null;
			stockStatsOpen = storedStockStatsOpen === null ? !prefersCompactStockList : storedStockStatsOpen === '1';
			const storedStockViewMode = typeof window !== 'undefined' ? window.localStorage.getItem(stockViewModeStorageKey) : null;
			stockViewMode =
				storedStockViewMode === 'list' || storedStockViewMode === 'block'
					? storedStockViewMode
					: prefersCompactStockList
						? 'list'
						: 'block';
			const storedProductStatsOpen = typeof window !== 'undefined' ? window.localStorage.getItem(productStatsStorageKey) : null;
			productStatsOpen = storedProductStatsOpen === null ? !prefersCompactStockList : storedProductStatsOpen === '1';
			const storedProductViewMode = typeof window !== 'undefined' ? window.localStorage.getItem(productViewModeStorageKey) : null;
			productViewMode =
				storedProductViewMode === 'list' || storedProductViewMode === 'block'
					? storedProductViewMode
					: prefersCompactStockList
						? 'block'
						: 'list';
			const storedRecipeStatsOpen = typeof window !== 'undefined' ? window.localStorage.getItem(recipeStatsStorageKey) : null;
			recipeStatsOpen = storedRecipeStatsOpen === null ? !prefersCompactStockList : storedRecipeStatsOpen === '1';
			const storedRecipeViewMode = typeof window !== 'undefined' ? window.localStorage.getItem(recipeViewModeStorageKey) : null;
			recipeViewMode =
				storedRecipeViewMode === 'list' || storedRecipeViewMode === 'block'
					? storedRecipeViewMode
					: prefersCompactStockList
						? 'block'
						: 'list';

			try {
				await checkHealth();
				data.backendAvailable = true;
			} catch (error) {
				data.backendAvailable = false;
				data.backendError = error instanceof ApiError ? error.message : 'No se pudo conectar con el backend configurado.';
				return;
			}

			if (storedSession) {
				try {
					await refreshCurrentView(storedSession);
				} catch (error) {
						if (
							(currentSection === 'planning' || currentSection === 'menus' || currentSection === 'closed-menus') &&
							error instanceof ApiError &&
							error.status === 404
						) {
							clearActiveWeekMenu();
							data.proposedWeekMenuLoaded = true;
							data.establishedWeekMenuLoaded = true;
							if (typeof window !== 'undefined') {
								window.localStorage.removeItem('foodhelper_proposed_week_menu_id');
								window.localStorage.removeItem('foodhelper_established_week_menu_id');
								window.localStorage.removeItem('foodhelper_selected_menu_id');
								window.localStorage.removeItem('foodhelper_selected_closed_menu_id');
							}
							return;
						}

					if (handleExpiredSession(error)) {
						return;
					}

					data.backendError = error instanceof ApiError ? error.message : 'No se pudieron cargar los datos.';
				}
			}
		};

		void bootstrap();
		if (sessionExpiredListener) {
			window.addEventListener('foodhelper-session-expired', sessionExpiredListener);
		}
		window.addEventListener('hashchange', syncSection);

		return () => {
			if (sessionExpiredListener) {
				window.removeEventListener('foodhelper-session-expired', sessionExpiredListener);
				sessionExpiredListener = null;
			}
			window.removeEventListener('hashchange', syncSection);
		};
	});

	onDestroy(() => {
		clearLoginSuccessTimer();
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

	function openViewProductModal(product: Product) {
		detailProduct = product;
		detailRecipe = null;
		modalMode = 'product-view';
	}

	function openStockModal(product: Product | null = null) {
		editingStockEntry = null;
		deletingStockEntry = null;
		stockProduct = product;
		stockDraft = product
			? {
					...emptyStockForm(product.id),
					price: product.defaultPrice === null ? '' : String(product.defaultPrice)
				}
			: emptyStockForm();
		modalMode = 'stock';
	}

	function productDefaultPriceLabel(product: Product) {
		return product.defaultPrice === null ? 'Sin precio' : formatCurrency(product.defaultPrice);
	}

	function productFromStockEntry(stockEntry: StockEntry): Product {
		return (
			data.products.find((item: Product) => item.id === stockEntry.productId) ?? {
				id: stockEntry.productId,
				name: stockEntry.productName,
				description: '',
				gramsPerUnit: 0,
				defaultPrice: null,
				nutritionalValues: {
					calories: 0,
					carbohydrates: 0,
					proteins: 0,
					fats: 0
				},
				photo: null,
				supermarkets: []
			}
		);
	}

	function openEditStockModal(stockEntry: StockEntry) {
		const product = productFromStockEntry(stockEntry);

		stockProduct = product;
		editingStockEntry = stockEntry;
		deletingStockEntry = null;
		stockDraft = {
			productId: String(stockEntry.productId),
			quantity: String(stockEntry.quantity),
			price: String(stockEntry.price),
			expirationDate: stockEntry.expirationDate ?? '',
			entryDate: stockEntry.entryDate
		};
		modalMode = 'stock';
	}

	function filteredStockEntries() {
		return data.stockEntries.filter((entry) => {
			if (stockProductFilter && String(entry.productId) !== stockProductFilter) return false;
			if (stockExpiresBefore && (!entry.expirationDate || entry.expirationDate >= stockExpiresBefore)) return false;
			return true;
		});
	}

	function stockFilterProducts() {
		return [...new Map(data.stockEntries.map((entry) => [entry.productId, { id: entry.productId, name: entry.productName }])).values()]
			.sort((left, right) => left.name.localeCompare(right.name));
	}

	function openDeleteStockModal(stockEntry: StockEntry) {
		deletingStockEntry = stockEntry;
		editingStockEntry = null;
		stockProduct = productFromStockEntry(stockEntry);
		modalMode = 'stock-delete';
	}

	function openCreateRecipeModal() {
		recipeCreateDraft = data.createRecipeDefaults;
		modalMode = 'recipe-create';
	}

	function openCreateWeekMenuModal() {
		creatingWeekMenuDraft = emptyProposedWeekMenuCreateForm();
		modalMode = 'week-create';
	}

	function openPublishWeekMenuModal() {
		publishPayerUserId = String(authSession?.userId ?? '');
		publishPersonIds = authSession?.userId ? [String(authSession.userId)] : [];
		if (authSession && !data.usersLoaded) {
			void loadUsers(authSession).catch(() => {
				// The select can still open; the backend error banner handles failures elsewhere.
			});
		}
		modalMode = 'week-publish';
	}

	function openWeekStockDialog() {
		modalMode = 'week-stock';
	}

	function resetDayPartForm() {
		dayPartDraft = emptyProposedWeekMenuDayPartForm();
		editingDayPartId = null;
	}

	function openCreateDayPartModal() {
		resetDayPartForm();
		form = null;
		modalMode = 'day-part';
	}

	function openEditDayPartModal(dayPart: ProposedWeekMenuDayPart) {
		dayPartDraft = toProposedWeekMenuDayPartFormValues(dayPart);
		editingDayPartId = dayPart.id;
		form = null;
		modalMode = 'day-part';
	}

	function createDaySectionDraft(existingSections: ProposedWeekMenuSectionFormValues[] = []) {
		const usedDayPartIds = new Set(existingSections.map((section) => section.dayPartId).filter(Boolean));
		const nextDayPart = data.proposedWeekMenuDayParts.find((dayPart) => !usedDayPartIds.has(String(dayPart.id)));

		return {
			...emptyProposedWeekMenuSectionForm(),
			dayPartId: nextDayPart ? String(nextDayPart.id) : ''
		};
	}

	function createDayProductDraft(existingProducts: ProposedWeekMenuDayProductFormValues[] = []) {
		return {
			...emptyProposedWeekMenuDayProductForm(),
			sortOrder: nextProposedWeekMenuProductSortOrder(existingProducts)
		};
	}

	function openWeekDayModal(date: string) {
		const day = data.proposedWeekMenu?.days.find((item) => item.date === date) ?? null;
		editingWeekDayDate = date;
		weekDayDraft = toProposedWeekMenuDayFormValues(day);
		if (!day) {
			weekDayDraft = {
				...emptyProposedWeekMenuDayForm(date),
				date,
				sections: [createDaySectionDraft()]
			};
		}
		modalMode = 'week-day';
	}

	function addWeekDaySection() {
		weekDayDraft = {
			...weekDayDraft,
			sections: [...weekDayDraft.sections, createDaySectionDraft(weekDayDraft.sections)]
		};
	}

	function removeWeekDaySection(index: number) {
		if (weekDayDraft.sections.length <= 1) return;
		weekDayDraft = {
			...weekDayDraft,
			sections: weekDayDraft.sections.filter((_, currentIndex) => currentIndex !== index)
		};
	}

	function addWeekDayProduct(sectionIndex: number) {
		weekDayDraft = {
			...weekDayDraft,
			sections: weekDayDraft.sections.map((section, currentIndex) =>
				currentIndex === sectionIndex
					? {
							...section,
							products: [...section.products, createDayProductDraft(section.products)]
						}
					: section
			)
		};
	}

	function removeWeekDayProduct(sectionIndex: number, productIndex: number) {
		const section = weekDayDraft.sections[sectionIndex];
		if (!section || section.products.length <= 1) return;

		weekDayDraft = {
			...weekDayDraft,
			sections: weekDayDraft.sections.map((item, currentSectionIndex) =>
				currentSectionIndex === sectionIndex
					? {
							...item,
							products: item.products.filter((_, currentProductIndex) => currentProductIndex !== productIndex)
						}
					: item
			)
		};
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

	function openViewRecipeModal(recipe: Recipe) {
		detailRecipe = recipe;
		detailProduct = null;
		modalMode = 'recipe-view';
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
		productPickerTarget = null;
		previewProduct = null;
		detailProduct = null;
		detailRecipe = null;
		deleteProduct = null;
		stockProduct = null;
		editingStockEntry = null;
		deletingStockEntry = null;
		deleteRecipeItem = null;
		editingProductId = null;
		editingRecipeId = null;
		derivingRecipeId = null;
		resetDayPartForm();
		editingWeekDayDate = null;
		creatingWeekMenuDraft = emptyProposedWeekMenuCreateForm();
		weekDayDraft = emptyProposedWeekMenuDayForm();
		publishPayerUserId = '';
		publishPersonIds = [];
	}

	function productPhotoUrl(photo: string) {
		return new URL(photo, data.backendBaseUrl).toString();
	}

	function productPhotoIsBroken(photo: string | null) {
		return photo ? brokenProductPhotoUrls[photo] === true : false;
	}

	function markProductPhotoBroken(photo: string) {
		if (brokenProductPhotoUrls[photo]) return;
		brokenProductPhotoUrls = { ...brokenProductPhotoUrls, [photo]: true };
	}

	function clearProductPhotoBroken(photo: string) {
		if (!brokenProductPhotoUrls[photo]) return;
		const next = { ...brokenProductPhotoUrls };
		delete next[photo];
		brokenProductPhotoUrls = next;
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
		if (!product.photo || productPhotoIsBroken(product.photo)) return;
		previewProduct = product;
	}

	function closeProductPreview() {
		previewProduct = null;
	}

	function restoreScroll(scrollY: number) {
		window.scrollTo({ top: scrollY });
	}

	function dateInputOffset(value: string, offsetDays: number) {
		if (!value) return '';
		const parsed = parseDateInput(value);
		if (!parsed) return '';
		parsed.setUTCDate(parsed.getUTCDate() + offsetDays);
		return toDateInputValue(parsed);
	}

	function parseDateInput(value: string) {
		if (!value) return null;
		const parts = value.split('-').map((entry) => Number(entry));
		if (parts.length !== 3 || parts.some((entry) => Number.isNaN(entry))) return null;
		const [year, month, day] = parts;
		return new Date(Date.UTC(year, month - 1, day));
	}

	function toDateInputValue(date: Date) {
		return date.toISOString().slice(0, 10);
	}

	function dateDifferenceInDays(startDate: string, endDate: string) {
		const start = parseDateInput(startDate);
		const end = parseDateInput(endDate);
		if (!start || !end) return Number.NaN;
		return Math.round((end.getTime() - start.getTime()) / 86400000);
	}

	function isWithinWeekRange(startDate: string, endDate: string) {
		const diff = dateDifferenceInDays(startDate, endDate);
		return Number.isFinite(diff) && diff >= 0 && diff <= 7;
	}

	function formatLongDate(value: string) {
		const date = parseDateInput(value);
		if (!date) return value;
		return new Intl.DateTimeFormat('es-ES', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			timeZone: 'UTC'
		}).format(date);
	}

	function formatShortDate(value: string) {
		const date = parseDateInput(value);
		if (!date) return value;
		return new Intl.DateTimeFormat('es-ES', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			timeZone: 'UTC'
		}).format(date);
	}

	function weekDateRangeLabel(startDate: string, endDate: string) {
		return `${formatShortDate(startDate)} al ${formatShortDate(endDate)}`;
	}

	function knownProposedWeekMenuLabel(menu: KnownProposedWeekMenu) {
		return `#${menu.id} · ${weekDateRangeLabel(menu.startDate, menu.endDate)}`;
	}

	function sortKnownProposedWeekMenus(menus: KnownProposedWeekMenu[]) {
		return [...menus].sort((left, right) => {
			const byStartDate = right.startDate.localeCompare(left.startDate);
			if (byStartDate !== 0) return byStartDate;
			return right.id - left.id;
		});
	}

	function readKnownProposedWeekMenus() {
		if (typeof window === 'undefined') return [];

		try {
			const parsed = JSON.parse(window.localStorage.getItem('foodhelper_proposed_week_menus') ?? '[]');
			if (!Array.isArray(parsed)) return [];

			return sortKnownProposedWeekMenus(
				parsed
					.map((menu) => ({
						id: Number(menu?.id),
						startDate: String(menu?.startDate ?? ''),
						endDate: String(menu?.endDate ?? '')
					}))
					.filter((menu) => menu.id > 0 && menu.startDate && menu.endDate)
			);
		} catch {
			return [];
		}
	}

	function saveKnownProposedWeekMenus(menus = knownProposedWeekMenus) {
		if (typeof window === 'undefined') return;
		window.localStorage.setItem('foodhelper_proposed_week_menus', JSON.stringify(sortKnownProposedWeekMenus(menus)));
	}

	function rememberProposedWeekMenu(menu: ProposedWeekMenu) {
		const nextMenu = {
			id: menu.id,
			startDate: menu.startDate,
			endDate: menu.endDate
		};
		const others = knownProposedWeekMenus.filter((item) => item.id !== menu.id);
		knownProposedWeekMenus = sortKnownProposedWeekMenus([nextMenu, ...others]);
		saveKnownProposedWeekMenus();
	}

	function forgetProposedWeekMenu(menuId: number) {
		knownProposedWeekMenus = knownProposedWeekMenus.filter((menu) => menu.id !== menuId);
		saveKnownProposedWeekMenus();
	}

	function weekDays() {
		const menu = data.proposedWeekMenu;
		if (!menu) return [];

		return weekDaysBetween(menu.startDate, menu.endDate);
	}

	function weekDaysBetween(startDate: string, endDate: string) {
		const start = parseDateInput(startDate);
		const end = parseDateInput(endDate);
		if (!start || !end) return [];

		const days: string[] = [];
		const current = new Date(start.getTime());
		while (current.getTime() <= end.getTime()) {
			days.push(toDateInputValue(current));
			current.setUTCDate(current.getUTCDate() + 1);
		}
		return days;
	}

	function weekPlanningSummary() {
		return buildWeekPlanningSummary(data.proposedWeekMenu, data.stockEntries, data.products);
	}

	function menuDays(menu: EstablishedWeekMenu | null) {
		if (!menu) return [];
		const dayLookup = new Map(menu.days.map((day) => [day.date, day]));
		return weekDaysBetween(menu.startDate, menu.endDate).map((date) => ({
			date,
			day: dayLookup.get(date) ?? null
		}));
	}

	function menuSectionColumns(menu: EstablishedWeekMenu | null) {
		if (!menu) return [];
		const sections = menu.days.flatMap((day) => day.sections);
		return [...new Map(sections.map((section) => [section.dayPartId, section])).values()].sort(
			(left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)
		);
	}

	function weekDayProductCount(day: ProposedWeekMenu['days'][number]) {
		return day.sections.reduce((total, section) => total + section.products.length, 0);
	}

	function proposedWeekMenuDay(date: string) {
		return data.proposedWeekMenu?.days.find((day) => day.date === date) ?? null;
	}

	function setActiveProposedWeekMenu(menu: ProposedWeekMenu | null) {
		data.proposedWeekMenu = menu;
		data.proposedWeekMenuLoaded = true;
		data.establishedWeekMenu = null;
		data.establishedWeekMenuLoaded = false;
		activeProposedWeekMenuId = menu?.id ?? null;
		activeEstablishedWeekMenuId = null;
		selectedMenuId = null;
		selectedPlanningMenuId = menu?.id ?? null;
		if (menu) {
			rememberProposedWeekMenu(menu);
		}
		if (typeof window !== 'undefined') {
			window.localStorage.removeItem('foodhelper_selected_menu_id');
			if (selectedPlanningMenuId) {
				window.localStorage.setItem('foodhelper_selected_planning_menu_id', String(selectedPlanningMenuId));
			} else {
				window.localStorage.removeItem('foodhelper_selected_planning_menu_id');
			}
		}
	}

	async function selectProposedWeekMenu(menuId: number) {
		if (!authSession || menuId <= 0 || menuId === activeProposedWeekMenuId) return;

		activeProposedWeekMenuId = menuId;
		activeEstablishedWeekMenuId = null;
		selectedPlanningMenuId = menuId;
		data.proposedWeekMenu = null;
		data.establishedWeekMenu = null;
		data.proposedWeekMenuLoaded = false;
		data.establishedWeekMenuLoaded = false;
		if (typeof window !== 'undefined') {
			window.localStorage.setItem('foodhelper_selected_planning_menu_id', String(menuId));
		}

		try {
			await refreshPlanningView(authSession, true);
			setSection('planning');
		} catch (error) {
			if (error instanceof ApiError && error.status === 404) {
				forgetProposedWeekMenu(menuId);
				clearActiveWeekMenu();
				data.proposedWeekMenuLoaded = true;
				return;
			}
			if (handleExpiredSession(error)) {
				return;
			}
			data.backendError = error instanceof ApiError ? error.message : 'No se pudo cargar la planificación.';
		}
	}

	function handleProposedWeekMenuSelection(event: Event) {
		const selectedMenuId = Number((event.currentTarget as HTMLSelectElement | null)?.value ?? '');
		if (Number.isNaN(selectedMenuId) || selectedMenuId <= 0) return;
		void selectProposedWeekMenu(selectedMenuId);
	}

	function setActiveEstablishedWeekMenu(menu: EstablishedWeekMenu | null) {
		data.establishedWeekMenu = menu;
		data.establishedWeekMenuLoaded = true;
		data.proposedWeekMenu = null;
		data.proposedWeekMenuLoaded = false;
		activeEstablishedWeekMenuId = menu?.id ?? null;
		activeProposedWeekMenuId = null;
		selectedMenuId = menu?.id ?? null;
		selectedPlanningMenuId = menu?.proposedWeekMenuId ?? null;
		if (typeof window !== 'undefined') {
			if (selectedMenuId) {
				window.localStorage.setItem('foodhelper_selected_menu_id', String(selectedMenuId));
			} else {
				window.localStorage.removeItem('foodhelper_selected_menu_id');
			}
			if (selectedPlanningMenuId) {
				window.localStorage.setItem('foodhelper_selected_planning_menu_id', String(selectedPlanningMenuId));
			} else {
				window.localStorage.removeItem('foodhelper_selected_planning_menu_id');
			}
		}
	}

	function clearActiveWeekMenu() {
		data.proposedWeekMenu = null;
		data.establishedWeekMenu = null;
		data.proposedWeekMenuLoaded = false;
		data.establishedWeekMenuLoaded = false;
		activeProposedWeekMenuId = null;
		activeEstablishedWeekMenuId = null;
		selectedPlanningMenuId = null;
		selectedMenuId = null;
		selectedClosedMenuId = null;
		if (typeof window !== 'undefined') {
			window.localStorage.removeItem('foodhelper_selected_planning_menu_id');
			window.localStorage.removeItem('foodhelper_selected_menu_id');
			window.localStorage.removeItem('foodhelper_selected_closed_menu_id');
		}
		editingWeekDayDate = null;
		weekDayDraft = emptyProposedWeekMenuDayForm();
	}

	async function selectPlanningMenu(menuId: number) {
		const menu = planningMenus.find((item) => item.id === menuId) ?? null;
		if (!authSession || !menu || menuId === selectedPlanningMenuId) return;

		selectedPlanningMenuId = menuId;
		if (typeof window !== 'undefined') {
			window.localStorage.setItem('foodhelper_selected_planning_menu_id', String(menuId));
		}

		try {
			if (menu.state === 'DRAFT') {
				activeEstablishedWeekMenuId = null;
				selectedMenuId = null;
				selectedClosedMenuId = null;
				if (typeof window !== 'undefined') {
					window.localStorage.removeItem('foodhelper_selected_menu_id');
					window.localStorage.removeItem('foodhelper_selected_closed_menu_id');
				}
				await loadProposedWeekMenu(authSession, menu.id);
				setSection('planning');
			} else if (menu.menuId && menu.state === 'ESTABLISHED') {
				activeProposedWeekMenuId = null;
				selectedMenuId = menu.menuId;
				if (typeof window !== 'undefined') {
					window.localStorage.setItem('foodhelper_selected_menu_id', String(menu.menuId));
				}
				await loadEstablishedWeekMenu(authSession, menu.menuId, 'selected');
				setSection('menus');
			} else if (menu.menuId && menu.state === 'CLOSED') {
				activeProposedWeekMenuId = null;
				selectedClosedMenuId = menu.menuId;
				if (typeof window !== 'undefined') {
					window.localStorage.setItem('foodhelper_selected_closed_menu_id', String(menu.menuId));
				}
				await loadClosedEstablishedWeekMenu(authSession, menu.menuId);
				setSection('closed-menus');
			} else {
				throw new Error('La planificación establecida no incluye un identificador de menú.');
			}
		} catch (error) {
			if (handleExpiredSession(error)) {
				return;
			}
			data.backendError = error instanceof ApiError ? error.message : 'No se pudo cargar la planificación.';
		}
	}

	function createWeekMenuRequestValues(values: ProposedWeekMenuCreateFormValues) {
		return {
			startDate: values.startDate,
			endDate: values.endDate
		};
	}

	function createWeekMenuDayRequestValues(values: ProposedWeekMenuDayFormValues) {
		return {
			date: values.date,
			sections: values.sections.map((section) => ({
				dayPartId: Number(section.dayPartId),
				products: section.products.map((product) => ({
					productId: Number(product.productId),
					units: product.units ? Number(product.units) : undefined,
					grams: product.grams ? Number(product.grams) : undefined,
					sortOrder: Number(product.sortOrder)
				}))
			}))
		};
	}

	function createDayPartRequestValues(values: ProposedWeekMenuDayPartFormValues) {
		return {
			name: values.name,
			description: values.description,
			sortOrder: Number(values.sortOrder)
		};
	}

	function validateProposedWeekCreate(values: ProposedWeekMenuCreateFormValues) {
		const fieldErrors: ProposedWeekMenuCreateFormErrors = {};

		if (!values.startDate) fieldErrors.startDate = 'La fecha de inicio es obligatoria';
		if (!values.endDate) fieldErrors.endDate = 'La fecha de fin es obligatoria';

		if (values.startDate && Number.isNaN(Date.parse(values.startDate))) {
			fieldErrors.startDate = 'La fecha de inicio no es valida';
		}

		if (values.endDate && Number.isNaN(Date.parse(values.endDate))) {
			fieldErrors.endDate = 'La fecha de fin no es valida';
		}

		if (values.startDate && values.endDate) {
			const diff = dateDifferenceInDays(values.startDate, values.endDate);
			if (!Number.isFinite(diff) || diff < 0) {
				fieldErrors.endDate = 'La fecha de fin debe ser posterior o igual a la de inicio';
			} else if (diff > 15) {
				fieldErrors.endDate = 'La planificación no puede superar 16 días incluidos';
			}
		}

		return fieldErrors;
	}

	function validateProposedWeekDay(values: ProposedWeekMenuDayFormValues) {
		const fieldErrors: ProposedWeekMenuDayFormErrors = {};
		const sectionErrors: ProposedWeekMenuSectionFormErrors[] = [];
		const selectedDayPartIds = new Set<string>();

		if (!values.date) fieldErrors.date = 'La fecha es obligatoria';
		else if (
			data.proposedWeekMenu &&
			(values.date < data.proposedWeekMenu.startDate || values.date > data.proposedWeekMenu.endDate)
		) {
			fieldErrors.date = 'La fecha debe estar dentro del rango de la semana';
		} else if (Number.isNaN(Date.parse(values.date))) {
			fieldErrors.date = 'La fecha no es valida';
		}

		values.sections.forEach((section, sectionIndex) => {
			const currentSectionErrors: ProposedWeekMenuSectionFormErrors = {};
			const productErrors: ProposedWeekMenuDayProductFormErrors[] = [];
			const productSortOrderIndexes = new Map<number, number[]>();
			const dayPartId = Number(section.dayPartId);

			if (!section.dayPartId || Number.isNaN(dayPartId) || dayPartId <= 0) {
				currentSectionErrors.dayPartId = 'Selecciona una parte del dia';
			} else if (!data.proposedWeekMenuDayParts.some((dayPart) => dayPart.id === dayPartId)) {
				currentSectionErrors.dayPartId = 'Selecciona una parte del dia valida';
			} else if (selectedDayPartIds.has(section.dayPartId)) {
				currentSectionErrors.dayPartId = 'Esta parte del dia ya esta incluida';
			} else {
				selectedDayPartIds.add(section.dayPartId);
			}

			if (section.products.length === 0) {
				currentSectionErrors.products = 'La seccion debe tener al menos un producto';
			}

			section.products.forEach((product, productIndex) => {
				const currentProductErrors: ProposedWeekMenuDayProductFormErrors = {};
				const sortOrder = Number(product.sortOrder);

				if (!product.productId || Number.isNaN(Number(product.productId)) || Number(product.productId) <= 0) {
					currentProductErrors.productId = 'Selecciona un producto valido';
				}

				if (product.units && (Number.isNaN(Number(product.units)) || Number(product.units) <= 0)) {
					currentProductErrors.units = 'Las unidades deben ser mayores que 0';
				}

				if (product.grams && (Number.isNaN(Number(product.grams)) || Number(product.grams) <= 0)) {
					currentProductErrors.grams = 'Los gramos deben ser mayores que 0';
				}

				if (!product.sortOrder || Number.isNaN(sortOrder) || sortOrder < 0) {
					currentProductErrors.sortOrder = 'El orden debe ser un numero valido mayor o igual a 0';
				} else {
					const existingIndexes = productSortOrderIndexes.get(sortOrder) ?? [];
					existingIndexes.push(productIndex);
					productSortOrderIndexes.set(sortOrder, existingIndexes);
				}

				productErrors[productIndex] = currentProductErrors;
			});

			for (const [, productIndexes] of productSortOrderIndexes) {
				if (productIndexes.length <= 1) continue;
				productIndexes.forEach((productIndex) => {
					productErrors[productIndex] = {
						...productErrors[productIndex],
						sortOrder: 'El orden debe ser unico dentro de la seccion'
					};
				});
			}

			const hasProductErrors = productErrors.some((productError) => Object.keys(productError).length > 0);
			if (Object.keys(currentSectionErrors).length > 0 || hasProductErrors) {
				currentSectionErrors.productErrors = productErrors;
			}

			sectionErrors[sectionIndex] = currentSectionErrors;
		});

		if (values.sections.length === 0) {
			fieldErrors.sections = 'Debes crear al menos una seccion';
		}

		if (sectionErrors.some((section) => Object.keys(section).length > 0)) {
			fieldErrors.sectionErrors = sectionErrors;
		}

		return fieldErrors;
	}

	function validateDayPart(values: ProposedWeekMenuDayPartFormValues) {
		const fieldErrors: ProposedWeekMenuDayPartFormErrors = {};

		if (!values.name.trim()) {
			fieldErrors.name = 'El nombre es obligatorio';
		}

		if (!values.description.trim()) {
			fieldErrors.description = 'La descripcion es obligatoria';
		}

		if (!values.sortOrder || Number.isNaN(Number(values.sortOrder)) || Number(values.sortOrder) < 0) {
			fieldErrors.sortOrder = 'El orden debe ser un numero valido mayor o igual a 0';
		}

		return fieldErrors;
	}

	function formatNumber(value: number) {
		return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
	}

	function formatCurrency(value: number) {
		return new Intl.NumberFormat('es-ES', {
			style: 'currency',
			currency: 'EUR'
		}).format(value);
	}

	function productMetricKey(
		metric: keyof NutritionalValues
	): 'caloriesTop' | 'carbohydratesTop' | 'proteinsTop' | 'fatsTop' {
		if (metric === 'calories') return 'caloriesTop';
		if (metric === 'carbohydrates') return 'carbohydratesTop';
		if (metric === 'proteins') return 'proteinsTop';
		return 'fatsTop';
	}

	function highestMetric(metric: keyof NutritionalValues) {
		if (!data.productStats) return productStatsLoading ? '…' : '—';
		const key = productMetricKey(metric);
		return formatNumber(data.productStats[key].value);
	}

	function richestProduct(metric: keyof NutritionalValues) {
		if (!data.productStats) return productStatsLoading ? 'Cargando estadísticas' : 'Estadísticas no disponibles';
		const key = productMetricKey(metric);
		return data.productStats[key].message ?? data.productStats[key].productName;
	}

	function productStockSummary(productId: number) {
		return data.productStats?.summaries.find((summary) => summary.productId === productId) ?? null;
	}

	function productStockQuantity(productId: number) {
		return productStockSummary(productId)?.totalQuantity ?? 0;
	}

	function nearestExpirationForProduct(productId: number) {
		return productStockSummary(productId)?.nextExpirationDate ?? null;
	}

	function totalStockQuantityLabel() {
		if (!data.productStats) return productStatsLoading ? '…' : '—';
		return formatNumber(data.productStats.stock.totalQuantity);
	}

	function stockEntriesCount() {
		return data.stockEntries.length;
	}

	function productsSectionLoading() {
		return !data.productsLoaded;
	}

	function recipesSectionLoading() {
		return !data.recipesLoaded || !data.recipeStatsLoaded;
	}

	function stockSectionLoading() {
		return !data.stockEntriesLoaded;
	}

	function setStockStatsOpen(next: boolean) {
		stockStatsOpen = next;
		if (typeof window !== 'undefined') {
			window.localStorage.setItem(stockStatsStorageKey, next ? '1' : '0');
		}
	}

	function toggleStockStatsOpen() {
		setStockStatsOpen(!stockStatsOpen);
	}

	function setStockViewMode(next: StockViewMode) {
		stockViewMode = next;
		if (typeof window !== 'undefined') {
			window.localStorage.setItem(stockViewModeStorageKey, next);
		}
	}

	function setProductStatsOpen(next: boolean) {
		productStatsOpen = next;
		if (typeof window !== 'undefined') {
			window.localStorage.setItem(productStatsStorageKey, next ? '1' : '0');
		}
	}

	function toggleProductStatsOpen() {
		setProductStatsOpen(!productStatsOpen);
	}

	function setProductViewMode(next: ProductViewMode) {
		productViewMode = next;
		if (typeof window !== 'undefined') {
			window.localStorage.setItem(productViewModeStorageKey, next);
		}
	}

	function setRecipeStatsOpen(next: boolean) {
		recipeStatsOpen = next;
		if (typeof window !== 'undefined') {
			window.localStorage.setItem(recipeStatsStorageKey, next ? '1' : '0');
		}
	}

	function toggleRecipeStatsOpen() {
		setRecipeStatsOpen(!recipeStatsOpen);
	}

	function setRecipeViewMode(next: RecipeViewMode) {
		recipeViewMode = next;
		if (typeof window !== 'undefined') {
			window.localStorage.setItem(recipeViewModeStorageKey, next);
		}
	}

	function loadingCountLabel(loaded: boolean, count: number) {
		return loaded ? String(count) : 'Cargando...';
	}

	function earliestExpirationLabel() {
		if (!data.productStats) return productStatsLoading ? '…' : '—';
		return data.productStats.earliestExpiration.productName;
	}

	function earliestExpirationHint() {
		if (!data.productStats) {
			return productStatsLoading ? 'Cargando estadísticas' : 'Estadísticas no disponibles';
		}

		const expiration = data.productStats.earliestExpiration;
		if (!expiration.expirationDate) return expiration.message ?? 'Sin caducidad';

		return `Caduca ${formatDate(expiration.expirationDate)} · ${formatNumber(expiration.quantity ?? 0)} uds`;
	}

	function formatDate(value: string | null | undefined) {
		if (!value) return 'Sin caducidad';

		const parsedDate = parseDateInput(value);
		const date = parsedDate ?? new Date(value);
		if (Number.isNaN(date.getTime())) return value;

		return new Intl.DateTimeFormat('es-ES', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			timeZone: 'UTC'
		}).format(date);
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

	function clearSession() {
		clearAuthSession();
		authSession = null;
		data.session = null;
		data.backendError = null;
		resetCatalogState();
	}

	function openSessionExpiredDialog(message = 'La sesion ha caducado. Vuelve a iniciar sesion.') {
		if (sessionExpiredDialogOpen) return;
		sessionExpiredDialogMessage = message;
		sessionExpiredDialogOpen = true;
	}

	function closeSessionExpiredDialog() {
		sessionExpiredDialogOpen = false;
		sessionExpiredDialogMessage = null;
	}

	function confirmSessionExpired() {
		closeSessionExpiredDialog();
		authMode = 'login';
		clearSession();
	}

	function handleExpiredSession(error: unknown) {
		if (isSessionExpiredError(error)) {
			openSessionExpiredDialog();
			return true;
		}

		return false;
	}

	async function settleSuccessfulAuth(session: AuthSession) {
		authSession = session;
		saveAuthSession(session);
		data.session = publicAuthSession(session);
		try {
			await refreshCurrentView(session);
		} catch (error) {
			if (handleExpiredSession(error)) {
				return;
			}

			data.backendError = error instanceof ApiError ? error.message : 'No se pudieron cargar los datos.';
		}
	}

	async function fileToBase64(file: File) {
		const bytes = new Uint8Array(await file.arrayBuffer());
		let binary = '';
		for (let index = 0; index < bytes.length; index += 0x8000) {
			binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
		}
		return btoa(binary);
	}

	async function readPhotoUpload(input: HTMLInputElement | null): Promise<ProductPhotoPayload | undefined> {
		const file = input?.files?.[0];
		if (!file) return undefined;

		return {
			fileName: file.name,
			contentType: file.type || 'application/octet-stream',
			base64Data: await fileToBase64(file)
		};
	}

	async function submitLogin(event: SubmitEvent) {
		event.preventDefault();
		clearLoginSuccessTimer();
		form = null;

		const values = { ...loginDraft };
		const fieldErrors = validateLoginForm(values);
		if (Object.keys(fieldErrors).length > 0) {
			form = {
				type: 'login',
				error: 'Revisa los campos marcados',
				values: { username: values.username },
				fieldErrors
			};
			return;
		}

		try {
			const auth = await loginUser(values);
			loginDraft.password = '';
			form = {
				type: 'login',
				success: 'Sesion iniciada correctamente',
				values: { username: auth.username }
			};
			scheduleLoginSuccessDismiss();
			await settleSuccessfulAuth(toAuthSession(auth));
		} catch (error) {
			if (handleExpiredSession(error)) {
				return;
			}

			if (error instanceof ApiError) {
				form = {
					type: 'login',
					error: error.message,
					values: { username: values.username }
				};
				return;
			}
			throw error;
		}
	}

	async function submitRegister(event: SubmitEvent) {
		event.preventDefault();
		registerResult = null;

		const values = { ...registerDraft };
		const fieldErrors = validateRegisterForm(values);
		if (Object.keys(fieldErrors).length > 0) {
			registerResult = {
				type: 'register',
				error: 'Revisa los campos marcados',
				values,
				fieldErrors
			};
			return;
		}

		try {
			const auth = await registerUser(values);
			registerDraft.password = '';
			registerResult = {
				type: 'register',
				success: 'Usuario registrado correctamente',
				values: {
					username: auth.username,
					registrationCode: values.registrationCode
				}
			};
			await settleSuccessfulAuth(toAuthSession(auth));
		} catch (error) {
			if (handleExpiredSession(error)) {
				return;
			}

			if (error instanceof ApiError) {
				registerResult = {
					type: 'register',
					error: error.message,
					values
				};
				return;
			}
			throw error;
		}
	}

	async function submitLogout(event: SubmitEvent) {
		event.preventDefault();
		clearAuthSession();
		authSession = null;
		data.session = null;
		resetCatalogState();
		closeSessionExpiredDialog();
		form = {
			type: 'logout',
			success: 'Sesion cerrada'
		};
		modalMode = null;
	}

	async function submitCreateProduct(event: SubmitEvent) {
		event.preventDefault();

		const values = { ...createDraft };
		const fieldErrors = validateProductForm(values);
		if (Object.keys(fieldErrors).length > 0) {
			form = {
				type: 'create',
				error: 'Revisa los campos marcados',
				values,
				fieldErrors
			};
			return;
		}
		if (!authSession) {
			clearSession();
			return;
		}

		try {
			await createProductRequest(
				{
					...values,
					photo: await readPhotoUpload(createPhotoInput)
				},
				authorizationHeader(authSession)
			);
			createDraft = data.createDefaults;
			clearPhotoSelection('create');
			modalMode = null;
			form = {
				type: 'create',
				success: 'Producto creado correctamente'
			};
			await refreshProductsView(authSession, true);
		} catch (error) {
			if (handleExpiredSession(error)) {
				return;
			}

			if (error instanceof ApiError) {
				form = {
					type: 'create',
					error: error.message,
					values
				};
				return;
			}
			throw error;
		}
	}

	async function submitUpdateProduct(event: SubmitEvent) {
		event.preventDefault();
		if (editingProductId === null) return;

		const values = { ...editDraft };
		const fieldErrors = validateProductForm(values);
		if (Object.keys(fieldErrors).length > 0) {
			form = {
				type: 'update',
				error: 'Revisa los campos marcados',
				id: editingProductId,
				values,
				fieldErrors
			};
			return;
		}
		if (!authSession) {
			clearSession();
			return;
		}

		try {
			await updateProductRequest(
				editingProductId,
				{
					...values,
					photo: await readPhotoUpload(editPhotoInput)
				},
				authorizationHeader(authSession)
			);
			clearPhotoSelection('edit');
			modalMode = null;
			form = {
				type: 'update',
				success: 'Producto actualizado correctamente',
				id: editingProductId
			};
			await refreshProductsView(authSession, true);
			if (data.recipesLoaded) {
				await refreshRecipesView(authSession, true);
			}
		} catch (error) {
			if (handleExpiredSession(error)) {
				return;
			}

			if (error instanceof ApiError) {
				form = {
					type: 'update',
					error: error.message,
					id: editingProductId,
					values
				};
				return;
			}
			throw error;
		}
	}

	async function submitDeleteProduct(event: SubmitEvent) {
		event.preventDefault();
		if (!deleteProduct || !authSession) return;
		const deletedProductId = deleteProduct.id;
		form = {
			type: 'delete',
			success: 'Producto eliminado correctamente',
			id: deletedProductId
		};

		try {
			await deleteProductRequest(deletedProductId, authorizationHeader(authSession));
			deleteProduct = null;
			modalMode = null;
			await refreshProductsView(authSession, true);
			if (data.recipesLoaded) {
				await refreshRecipesView(authSession, true);
			}
		} catch (error) {
			if (handleExpiredSession(error)) {
				return;
			}

			if (error instanceof ApiError) {
				form = {
					type: 'delete',
					error: error.message,
					id: deletedProductId
				};
				return;
			}
			throw error;
		}
	}

	async function submitCreateStock(event: SubmitEvent) {
		event.preventDefault();
		if (!authSession) return;
		const selectedStockEntry = editingStockEntry;
		const selectedStockProduct = stockProduct;

		const values = { ...stockDraft };
		const fieldErrors = validateStockForm(values);
		if (Object.keys(fieldErrors).length > 0) {
			form = {
				type: 'stock',
				error: 'Revisa los campos marcados',
				id: selectedStockProduct?.id,
				values,
				fieldErrors
			};
			return;
		}

		if (!selectedStockProduct) {
			form = {
				type: 'stock',
				error: 'Selecciona un producto',
				values,
				fieldErrors: { productId: 'Selecciona un producto' }
			};
			return;
		}

		const selectedStockProductId = selectedStockProduct.id;

		try {
			if (selectedStockEntry) {
				await updateStockEntryRequest(
					selectedStockEntry.id,
					{
						quantity: Number(values.quantity),
						price: Number(values.price),
						expirationDate: values.expirationDate || null,
						entryDate: values.entryDate
					},
					authorizationHeader(authSession)
				);
			} else {
				await createStockEntryRequest(
					selectedStockProductId,
					{
						quantity: Number(values.quantity),
						price: Number(values.price),
						expirationDate: values.expirationDate || null,
						entryDate: values.entryDate
					},
					authorizationHeader(authSession)
				);
			}
			stockProduct = null;
			stockDraft = emptyStockForm();
			editingStockEntry = null;
			modalMode = null;
			form = {
				type: 'stock',
				success: selectedStockEntry ? 'Stock actualizado correctamente' : 'Stock guardado correctamente',
				id: selectedStockProductId
			};
			await refreshProductsView(authSession, true);
		} catch (error) {
			if (handleExpiredSession(error)) {
				return;
			}

			if (error instanceof ApiError) {
				form = {
					type: 'stock',
					error: error.message,
					id: selectedStockProductId,
					values
				};
				return;
			}
			throw error;
		}
	}

	async function submitDeleteStock(event: SubmitEvent) {
		event.preventDefault();
		if (!authSession || !deletingStockEntry) return;

		const selectedStockEntry = deletingStockEntry;

		try {
			await removeStockQuantityRequest(
				selectedStockEntry.id,
				{ quantity: selectedStockEntry.quantity },
				authorizationHeader(authSession)
			);
			deletingStockEntry = null;
			stockProduct = null;
			modalMode = null;
			form = {
				type: 'stock',
				success: 'Stock eliminado correctamente',
				id: selectedStockEntry.productId
			};
			await refreshProductsView(authSession, true);
		} catch (error) {
			if (handleExpiredSession(error)) {
				return;
			}

			if (error instanceof ApiError) {
				form = {
					type: 'stock',
					error: error.message,
					id: selectedStockEntry.productId
				};
				return;
			}
			throw error;
		}
	}

	async function submitCreateRecipe(event: SubmitEvent) {
		event.preventDefault();
		if (!authSession) return;

		const values = { ...recipeCreateDraft };
		const fieldErrors = validateRecipeForm(values);
		if (Object.keys(fieldErrors).length > 0) {
			form = {
				type: 'recipe-create',
				error: 'Revisa los campos marcados',
				values,
				fieldErrors
			};
			return;
		}

		try {
			await createRecipeRequest(
				{
					name: values.name,
					description: values.description,
					instructions: values.instructions,
					products: toRecipeIngredientAssignments(values.ingredients)
				},
				authorizationHeader(authSession)
			);
			recipeCreateDraft = data.createRecipeDefaults;
			modalMode = null;
			form = {
				type: 'recipe-create',
				success: 'Receta creada correctamente'
			};
			await refreshRecipesView(authSession, true);
		} catch (error) {
			if (handleExpiredSession(error)) {
				return;
			}

			if (error instanceof ApiError) {
				form = {
					type: 'recipe-create',
					error: error.message,
					values
				};
				return;
			}
			throw error;
		}
	}

	async function submitUpdateRecipe(event: SubmitEvent) {
		event.preventDefault();
		if (!authSession || editingRecipeId === null) return;

		const values = { ...recipeEditDraft };
		const fieldErrors = validateRecipeForm(values);
		if (Object.keys(fieldErrors).length > 0) {
			form = {
				type: 'recipe-update',
				error: 'Revisa los campos marcados',
				id: editingRecipeId,
				values,
				fieldErrors
			};
			return;
		}

		try {
			await updateRecipeRequest(
				editingRecipeId,
				{
					name: values.name,
					description: values.description,
					instructions: values.instructions,
					products: toRecipeIngredientAssignments(values.ingredients)
				},
				authorizationHeader(authSession)
			);
			modalMode = null;
			form = {
				type: 'recipe-update',
				success: 'Receta actualizada correctamente',
				id: editingRecipeId
			};
			await refreshRecipesView(authSession, true);
		} catch (error) {
			if (handleExpiredSession(error)) {
				return;
			}

			if (error instanceof ApiError) {
				form = {
					type: 'recipe-update',
					error: error.message,
					id: editingRecipeId,
					values
				};
				return;
			}
			throw error;
		}
	}

	async function submitDeleteRecipe(event: SubmitEvent) {
		event.preventDefault();
		if (!authSession || !deleteRecipeItem) return;

		try {
			await deleteRecipeRequest(deleteRecipeItem.id, authorizationHeader(authSession));
			deleteRecipeItem = null;
			modalMode = null;
			form = {
				type: 'recipe-delete',
				success: 'Receta eliminada correctamente'
			};
			await refreshRecipesView(authSession, true);
		} catch (error) {
			if (handleExpiredSession(error)) {
				return;
			}

			if (error instanceof ApiError) {
				form = {
					type: 'recipe-delete',
					error: error.message
				};
				return;
			}
			throw error;
		}
	}

	async function submitCreateDerivedProduct(event: SubmitEvent) {
		event.preventDefault();
		if (!authSession || derivingRecipeId === null) return;

		const values = { ...recipeDerivedProductDraft };
		const fieldErrors = validateRecipeDerivedProductForm(values);
		if (Object.keys(fieldErrors).length > 0) {
			form = {
				type: 'recipe-derive',
				error: 'Revisa los campos marcados',
				id: derivingRecipeId,
				values,
				fieldErrors
			};
			return;
		}

		try {
			await createDerivedProductRequest(
				derivingRecipeId,
				{
					producedGrams: Number(values.producedGrams),
					gramsPerUnit: Number(values.gramsPerUnit)
				},
				authorizationHeader(authSession)
			);
			recipeDerivedProductDraft = data.createRecipeDerivedProductDefaults;
			modalMode = null;
			form = {
				type: 'recipe-derive',
				success: 'Producto derivado creado correctamente',
				id: derivingRecipeId
			};
			await refreshRecipesView(authSession, true);
		} catch (error) {
			if (handleExpiredSession(error)) {
				return;
			}

			if (error instanceof ApiError) {
				form = {
					type: 'recipe-derive',
					error: error.message,
					id: derivingRecipeId,
					values
				};
				return;
			}
			throw error;
		}
	}

	async function submitCreateWeekMenu(event: SubmitEvent) {
		event.preventDefault();
		if (!authSession) return;

		const values = { ...creatingWeekMenuDraft };
		const fieldErrors = validateProposedWeekCreate(values);
		if (Object.keys(fieldErrors).length > 0) {
			form = {
				type: 'week-create',
				error: 'Revisa los campos marcados',
				values,
				fieldErrors
			};
			return;
		}

		try {
			const menu = toProposedWeekMenuModel(
				await createProposedWeekMenuRequest(createWeekMenuRequestValues(values), authorizationHeader(authSession))
			);
			creatingWeekMenuDraft = emptyProposedWeekMenuCreateForm();
			setActiveProposedWeekMenu(menu);
			modalMode = null;
			form = {
				type: 'week-create',
				success: 'Planificación creada correctamente',
				values
			};
			await refreshPlanningView(authSession, true);
			setSection('planning');
		} catch (error) {
			if (handleExpiredSession(error)) {
				return;
			}

			if (error instanceof ApiError) {
				form = {
					type: 'week-create',
					error: error.message,
					values
				};
				return;
			}
			throw error;
		}
	}

	async function submitDayPart(event: SubmitEvent) {
		event.preventDefault();
		if (!authSession) return;

		const values = { ...dayPartDraft };
		const fieldErrors = validateDayPart(values);
		const actionType = editingDayPartId === null ? 'day-part-create' : 'day-part-update';
		if (Object.keys(fieldErrors).length > 0) {
			form = {
				type: actionType,
				error: 'Revisa los campos marcados',
				id: editingDayPartId ?? undefined,
				values,
				fieldErrors
			};
			return;
		}

		try {
			if (editingDayPartId === null) {
				await createProposedWeekMenuDayPartRequest(createDayPartRequestValues(values), authorizationHeader(authSession));
			} else {
				await updateProposedWeekMenuDayPartRequest(
					editingDayPartId,
					createDayPartRequestValues(values),
					authorizationHeader(authSession)
				);
			}

			form = {
				type: actionType,
				success: editingDayPartId === null ? 'Parte del dia creada correctamente' : 'Parte del dia actualizada correctamente',
				id: editingDayPartId ?? undefined,
				values
			};
			modalMode = null;
			resetDayPartForm();
			invalidateWeekMenuCaches();
			await refreshDayPartsView(authSession, true);
			if (data.proposedWeekMenuLoaded) {
				await loadProposedWeekMenu(authSession);
			}
			if (shouldRefreshMenusViewAfterMutation()) {
				await refreshMenusView(authSession, true);
			}
		} catch (error) {
			if (handleExpiredSession(error)) {
				return;
			}

			if (error instanceof ApiError) {
				form = {
					type: actionType,
					error: error.message,
					id: editingDayPartId ?? undefined,
					values
				};
				return;
			}
			throw error;
		}
	}

	async function submitUpsertWeekDay(event: SubmitEvent) {
		event.preventDefault();
		if (!authSession || !activeProposedWeekMenuId) return;

		const values = { ...weekDayDraft };
		const fieldErrors = validateProposedWeekDay(values);
		if (Object.keys(fieldErrors).length > 0) {
			form = {
				type: 'week-day',
				error: 'Revisa los campos marcados',
				id: activeProposedWeekMenuId,
				values,
				fieldErrors
			};
			return;
		}

		try {
			const menu = toProposedWeekMenuModel(
				await upsertProposedWeekMenuDayRequest(
					activeProposedWeekMenuId,
					createWeekMenuDayRequestValues(values),
					authorizationHeader(authSession)
				)
			);
			setActiveProposedWeekMenu(menu);
				weekDayDraft = emptyProposedWeekMenuDayForm();
				editingWeekDayDate = null;
				modalMode = null;
				form = {
					type: 'week-day',
					success: 'Menu diario guardado correctamente',
					id: activeProposedWeekMenuId,
					values
				};
				invalidateWeekMenuCaches();
				if (shouldRefreshMenusViewAfterMutation()) {
					await refreshMenusView(authSession, true);
				}
		} catch (error) {
			if (handleExpiredSession(error)) {
				return;
			}

			if (error instanceof ApiError) {
				form = {
					type: 'week-day',
					error: error.message,
					id: activeProposedWeekMenuId,
					values
				};
				return;
			}
			throw error;
		}
	}

	async function submitPublishWeekMenu(event: SubmitEvent) {
		event.preventDefault();
		if (!authSession || !activeProposedWeekMenuId) return;

		const payerUserId = Number(publishPayerUserId);
		if (!Number.isFinite(payerUserId) || payerUserId <= 0) {
			form = { type: 'week-publish', error: 'Selecciona un pagador válido.', id: activeProposedWeekMenuId };
			return;
		}

		const personIds = [...new Set(
			publishPersonIds
				.map((personId) => Number(personId))
				.filter((personId) => Number.isFinite(personId) && personId > 0)
		)];

		if (personIds.length === 0) {
			form = { type: 'week-publish', error: 'Selecciona al menos una persona que consuma la semana.', id: activeProposedWeekMenuId };
			return;
		}

		try {
			const menu = toEstablishedWeekMenuModel(
				await publishProposedWeekMenuRequest(
					activeProposedWeekMenuId,
					{
						payerUserId,
						personIds
					},
					authorizationHeader(authSession)
				)
			);
			setActiveEstablishedWeekMenu(menu);
			data.stockEntriesLoaded = false;
			form = {
				type: 'week-publish',
				success: 'Semana establecida correctamente',
				id: menu.id
			};
			modalMode = null;
			setSection('menus');
			invalidateWeekMenuCaches();
			if (shouldRefreshMenusViewAfterMutation()) {
				await refreshMenusView(authSession, true);
			}
			refreshCatalogToken += 1;
		} catch (error) {
			if (handleExpiredSession(error)) {
				return;
			}

			if (error instanceof ApiError) {
				form = {
					type: 'week-publish',
					error: error.message,
					id: activeProposedWeekMenuId
				};
				return;
			}
			throw error;
		}
	}

	async function undoActiveEstablishedWeekMenu() {
		if (!authSession || !activeEstablishedWeekMenuId) return;
		if (!window.confirm('¿Deshacer este menú establecido? Se restaurará el stock consumido y la hucha del pagador.')) return;
		const menuId = activeEstablishedWeekMenuId;
		const planningMenuId = data.establishedWeekMenu?.proposedWeekMenuId ?? selectedPlanningMenuId;
		try {
			await undoEstablishedWeekMenuRequest(menuId, authorizationHeader(authSession));
			clearActiveWeekMenu();
			if (planningMenuId) {
				selectedPlanningMenuId = planningMenuId;
				if (typeof window !== 'undefined') {
					window.localStorage.setItem('foodhelper_selected_planning_menu_id', String(planningMenuId));
				}
			}
			form = {
				type: 'week-publish',
				success: 'Menú deshecho correctamente',
				id: menuId
			};
			setSection('planning');
			invalidateWeekMenuCaches();
			await refreshPlanningView(authSession, true);
			if (shouldRefreshMenusViewAfterMutation()) {
				await refreshMenusView(authSession, true);
			}
			refreshCatalogToken += 1;
		} catch (error) {
			if (handleExpiredSession(error)) {
				return;
			}
			form = {
				type: 'week-publish',
				error: error instanceof ApiError ? error.message : 'No se pudo deshacer el menú.',
				id: menuId
			};
		}
	}

	async function undoEstablishedMenu(menu: EstablishedWeekMenu) {
		if (!authSession) return;
		const previousMenuId = activeEstablishedWeekMenuId;
		activeEstablishedWeekMenuId = menu.id;
		data.establishedWeekMenu = menu;
		try {
			await undoActiveEstablishedWeekMenu();
		} finally {
			if (activeEstablishedWeekMenuId === menu.id) {
				activeEstablishedWeekMenuId = previousMenuId;
			}
		}
	}

	async function editEstablishedMenu(menu: EstablishedWeekMenu) {
		if (!authSession) return;

		const planningMenu = planningMenus.find((item) => item.menuId === menu.id) ?? null;
		if (!planningMenu) {
			data.backendError = 'No se pudo localizar la planificación asociada a este menú.';
			return;
		}

		await loadProposedWeekMenu(authSession, planningMenu.id);
		const firstDayDate = data.proposedWeekMenu?.days[0]?.date ?? menu.startDate;
		setSection('menus');
		openWeekDayModal(firstDayDate);
	}
</script>

<svelte:head>
	<title>{data.session ? `FoodHelper ${sectionLabel(currentSection)}` : 'FoodHelper Access'}</title>
	<meta
		name="description"
		content="Gestiona productos, recetas y propuestas de semana desde el frontend de FoodHelper."
	/>
</svelte:head>

<div class="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
	{#if hydrated}
		<span data-testid="app-ready" aria-hidden="true" class="sr-only">ready</span>
	{/if}
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
							currentSection === 'stock'
								? 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]'
								: 'text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]'
						}`}
						href="#stock"
						onclick={(event) => {
							event.preventDefault();
							setSection('stock');
						}}
					>
						<Package class="size-4 shrink-0" aria-hidden="true" />
						<span class="truncate">Stock</span>
					</a>
					<a
						class={`flex h-9 items-center gap-2 rounded-md px-2.5 text-sm font-medium ${
							currentSection === 'day-parts'
								? 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]'
								: 'text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]'
						}`}
						href="#day-parts"
						onclick={(event) => {
							event.preventDefault();
							setSection('day-parts');
						}}
					>
						<Settings class="size-4 shrink-0" aria-hidden="true" />
						<span class="truncate">Partes del dia</span>
					</a>
					<a class={`flex h-9 items-center gap-2 rounded-md px-2.5 text-sm font-medium ${currentSection === 'supermarkets' ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]'}`} href="#supermarkets" onclick={(event) => { event.preventDefault(); setSection('supermarkets'); }}><Store class="size-4 shrink-0" aria-hidden="true" /><span class="truncate">Supermercados</span></a>
					<a class={`flex h-9 items-center gap-2 rounded-md px-2.5 text-sm font-medium ${currentSection === 'money-box' ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]'}`} href="#money-box" onclick={(event) => { event.preventDefault(); setSection('money-box'); }}><PiggyBank class="size-4 shrink-0" aria-hidden="true" /><span class="truncate">Huchas</span></a>
					<a class={`flex h-9 items-center gap-2 rounded-md px-2.5 text-sm font-medium ${currentSection === 'nutritional-rules' ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]'}`} href="#nutritional-rules" onclick={(event) => { event.preventDefault(); setSection('nutritional-rules'); }}><SlidersHorizontal class="size-4 shrink-0" aria-hidden="true" /><span class="truncate">Reglas nutricionales</span></a>
					<a
						class={`flex h-9 items-center gap-2 rounded-md px-2.5 text-sm font-medium ${
							currentSection === 'planning'
								? 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]'
								: 'text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]'
						}`}
						href="#planning"
						onclick={(event) => {
							event.preventDefault();
							setSection('planning');
						}}
					>
						<CalendarClock class="size-4 shrink-0" aria-hidden="true" />
						<span class="truncate">Planificación</span>
					</a>
					<a
						class={`flex h-9 items-center gap-2 rounded-md px-2.5 text-sm font-medium ${
							currentSection === 'menus'
								? 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]'
								: 'text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]'
						}`}
						href="#menus"
						onclick={(event) => {
							event.preventDefault();
							setSection('menus');
						}}
					>
						<CircleCheck class="size-4 shrink-0" aria-hidden="true" />
						<span class="truncate">Menú</span>
					</a>
					<a
						class={`flex h-9 items-center gap-2 rounded-md px-2.5 text-sm font-medium ${
							currentSection === 'closed-menus'
								? 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]'
								: 'text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]'
						}`}
						href="#closed-menus"
						onclick={(event) => {
							event.preventDefault();
							setSection('closed-menus');
						}}
					>
						<CircleCheck class="size-4 shrink-0" aria-hidden="true" />
						<span class="truncate">Historial</span>
					</a>
					<a class={`flex h-9 items-center gap-2 rounded-md px-2.5 text-sm font-medium ${currentSection === 'people-weights' ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]'}`} href="#people-weights" onclick={(event) => { event.preventDefault(); setSection('people-weights'); }}><CalendarClock class="size-4 shrink-0" aria-hidden="true" /><span class="truncate">Pesos</span></a>
					<a class={`flex h-9 items-center gap-2 rounded-md px-2.5 text-sm font-medium ${currentSection === 'people-history' ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]'}`} href="#people-history" onclick={(event) => { event.preventDefault(); setSection('people-history'); }}><UserRound class="size-4 shrink-0" aria-hidden="true" /><span class="truncate">Historial</span></a>
					<a class={`flex h-9 items-center gap-2 rounded-md px-2.5 text-sm font-medium ${currentSection === 'people-trend' ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]'}`} href="#people-trend" onclick={(event) => { event.preventDefault(); setSection('people-trend'); }}><TrendingUp class="size-4 shrink-0" aria-hidden="true" /><span class="truncate">Evolución</span></a>
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
					<details class="group rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))]">
						<summary class="flex list-none cursor-pointer items-center gap-2 p-3 [&::-webkit-details-marker]:hidden">
							<UserRound class="mt-0.5 size-4 shrink-0 text-[hsl(var(--primary))]" aria-hidden="true" />
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium">{data.session.username}</p>
								<p class="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Sesion activa</p>
							</div>
							<ChevronDown class="size-4 shrink-0 text-[hsl(var(--muted-foreground))] transition-transform group-open:rotate-180" aria-hidden="true" />
						</summary>
						<div class="border-t border-[hsl(var(--border))] p-3">
							<form onsubmit={submitLogout}>
								<Button variant="secondary" size="sm" type="submit" class="w-full" data-testid="logout-button">
									<LogOut class="size-4" aria-hidden="true" />
									Salir
								</Button>
							</form>
						</div>
					</details>
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
									class="space-y-4"
									onsubmit={submitLogin}
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
			<div class="grid grid-cols-2 gap-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 shadow-sm sm:grid-cols-4 lg:hidden" aria-label="Selector de pantalla">
				<button
					type="button"
					class={`inline-flex min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
						currentSection === 'recipes'
							? 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]'
							: 'text-[hsl(var(--muted-foreground))]'
					}`}
					onclick={() => setSection('recipes')}
				>
					<BookOpen class="size-4" aria-hidden="true" />
					<span class="truncate">Recetas</span>
				</button>
				<button
					type="button"
					class={`inline-flex min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
						currentSection === 'products'
							? 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]'
							: 'text-[hsl(var(--muted-foreground))]'
					}`}
					onclick={() => setSection('products')}
				>
					<LayoutList class="size-4" aria-hidden="true" />
					<span class="truncate">Productos</span>
				</button>
				<button
					type="button"
					class={`inline-flex min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
						currentSection === 'stock'
							? 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]'
							: 'text-[hsl(var(--muted-foreground))]'
					}`}
					onclick={() => setSection('stock')}
				>
					<Package class="size-4" aria-hidden="true" />
					<span class="truncate">Stock</span>
				</button>
				<button
					type="button"
					class={`inline-flex min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
						currentSection === 'day-parts'
							? 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]'
							: 'text-[hsl(var(--muted-foreground))]'
					}`}
					onclick={() => setSection('day-parts')}
				>
					<Settings class="size-4" aria-hidden="true" />
					<span class="truncate">Partes</span>
				</button>
				<button
					type="button"
					class={`inline-flex min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
						currentSection === 'planning'
							? 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]'
							: 'text-[hsl(var(--muted-foreground))]'
					}`}
					onclick={() => setSection('planning')}
				>
					<CalendarClock class="size-4" aria-hidden="true" />
					<span class="truncate">Planificación</span>
				</button>
				<button
					type="button"
					class={`inline-flex min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
						currentSection === 'menus'
							? 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]'
							: 'text-[hsl(var(--muted-foreground))]'
					}`}
					onclick={() => setSection('menus')}
				>
					<CircleCheck class="size-4" aria-hidden="true" />
					<span class="truncate">Menú</span>
				</button>
				<button
					type="button"
					class={`inline-flex min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
						currentSection === 'closed-menus'
							? 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]'
							: 'text-[hsl(var(--muted-foreground))]'
					}`}
					onclick={() => setSection('closed-menus')}
				>
					<CircleCheck class="size-4" aria-hidden="true" />
					<span class="truncate">Historial</span>
				</button>
				<button
					type="button"
					class={`inline-flex min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
						currentSection === 'people-weights'
							? 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]'
							: 'text-[hsl(var(--muted-foreground))]'
					}`}
					onclick={() => setSection('people-weights')}
				>
					<CalendarClock class="size-4" aria-hidden="true" />
					<span class="truncate">Pesos</span>
				</button>
				<button
					type="button"
					class={`inline-flex min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
						currentSection === 'people-history'
							? 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]'
							: 'text-[hsl(var(--muted-foreground))]'
					}`}
					onclick={() => setSection('people-history')}
				>
					<UserRound class="size-4" aria-hidden="true" />
					<span class="truncate">Historial</span>
				</button>
				<button
					type="button"
					class={`inline-flex min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
						currentSection === 'people-trend'
							? 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]'
							: 'text-[hsl(var(--muted-foreground))]'
					}`}
					onclick={() => setSection('people-trend')}
				>
					<TrendingUp class="size-4" aria-hidden="true" />
					<span class="truncate">Evolución</span>
				</button>
				<button type="button" class={`inline-flex min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${currentSection === 'supermarkets' ? 'bg-[hsl(var(--secondary))]' : 'text-[hsl(var(--muted-foreground))]'}`} onclick={() => setSection('supermarkets')}><Store class="size-4" /><span class="truncate">Supermercados</span></button>
				<button type="button" class={`inline-flex min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${currentSection === 'money-box' ? 'bg-[hsl(var(--secondary))]' : 'text-[hsl(var(--muted-foreground))]'}`} onclick={() => setSection('money-box')}><PiggyBank class="size-4" /><span class="truncate">Huchas</span></button>
				<button type="button" class={`inline-flex min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${currentSection === 'nutritional-rules' ? 'bg-[hsl(var(--secondary))]' : 'text-[hsl(var(--muted-foreground))]'}`} onclick={() => setSection('nutritional-rules')}><SlidersHorizontal class="size-4" /><span class="truncate">Reglas</span></button>
			</div>
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
			{#if currentSection === 'products'}
				<section id="products" class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div class="min-w-0">
						<h1 class="text-2xl font-semibold tracking-tight text-[hsl(var(--foreground))]">Productos</h1>
						<p class="mt-1 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
							Gestiona alimentos, calorias y macronutrientes por 100g en una vista compacta.
						</p>
					</div>
					<div class="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
						<Button
							type="button"
							variant="secondary"
							size="sm"
							onclick={toggleProductStatsOpen}
							aria-pressed={productStatsOpen}
							data-testid="product-stats-toggle"
						>
							<Eye class="size-4" aria-hidden="true" />
							{productStatsOpen ? 'Ocultar stats' : 'Ver stats'}
						</Button>
						<div class="inline-flex rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 shadow-sm">
							<Button
								type="button"
								size="sm"
								variant={productViewMode === 'list' ? 'primary' : 'ghost'}
								class={productViewMode === 'list' ? '' : 'text-[hsl(var(--muted-foreground))]'}
								onclick={() => setProductViewMode('list')}
								aria-pressed={productViewMode === 'list'}
								data-testid="product-view-list"
							>
								<LayoutList class="size-4" aria-hidden="true" />
								Lista
							</Button>
							<Button
								type="button"
								size="sm"
								variant={productViewMode === 'block' ? 'primary' : 'ghost'}
								class={productViewMode === 'block' ? '' : 'text-[hsl(var(--muted-foreground))]'}
								onclick={() => setProductViewMode('block')}
								aria-pressed={productViewMode === 'block'}
								data-testid="product-view-block"
							>
								<SlidersHorizontal class="size-4" aria-hidden="true" />
								Bloque
							</Button>
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
					</div>
				</section>

			<ProductFilters
				filters={productFilters}
				onChange={updateProductFilters}
				onClear={clearProductFilters}
				testIdPrefix="product-filter"
			/>

			<div class="flex flex-wrap items-center justify-between gap-3">
				<span class="inline-flex w-fit items-center gap-1.5 rounded-md border border-[hsl(var(--border))] px-2 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))]">
					<Leaf class="size-3.5" aria-hidden="true" />
					<span data-testid="product-count">
						{productCountLabel()}
					</span>
					productos
				</span>
			</div>

			{#if productStatsError}
				<div
					class="flex flex-col gap-3 rounded-lg border border-[hsl(var(--destructive)/0.2)] bg-[hsl(var(--destructive)/0.04)] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
					data-testid="product-stats-error"
				>
					<div class="flex min-w-0 items-start gap-2 text-sm text-[hsl(var(--destructive))]">
						<CircleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
						<span class="break-words">{productStatsError}</span>
					</div>
					<Button
						type="button"
						variant="secondary"
						size="sm"
						class="shrink-0"
						onclick={() => void loadProductStats()}
						disabled={productStatsLoading}
						data-testid="product-stats-retry"
					>
						<RefreshCw class={`size-4 ${productStatsLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
						Reintentar
					</Button>
				</div>
			{/if}

				{#if productStatsOpen}
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
						</section>
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
						<span data-testid="product-loaded-count">
							{productCountLabel()}
						</span>
						registrados
					</span>
				</div>

				{#if productsSectionLoading()}
					<div class="grid place-items-center px-8 py-16 text-center">
						<div class="grid size-12 place-items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
							<div
								class="size-5 animate-spin rounded-full border-2 border-[hsl(var(--muted-foreground))] border-t-transparent"
								aria-hidden="true"
							></div>
						</div>
						<h3 class="mt-4 text-sm font-semibold text-[hsl(var(--foreground))]">Cargando productos</h3>
						<p class="mt-1 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">
							Estamos esperando al backend para mostrar el catalogo.
						</p>
					</div>
				{:else if productsTotalElements === 0}
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
				{:else if filteredProducts().length === 0}
					<div class="grid place-items-center px-8 py-16 text-center">
						<div class="grid size-12 place-items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
							<Search class="size-5 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
						</div>
						<h3 class="mt-4 text-sm font-semibold text-[hsl(var(--foreground))]">No hay coincidencias</h3>
						<p class="mt-1 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">
							Prueba a limpiar filtros o a buscar por otro nombre, calorías o macros.
						</p>
						<div class="mt-4">
							<Button type="button" variant="secondary" onclick={clearProductFilters}>
								<X class="size-4" aria-hidden="true" />
								Reiniciar búsqueda
							</Button>
						</div>
					</div>
				{:else}
						<div data-testid="product-list">
								<div class={productViewMode === 'list' ? 'overflow-x-auto' : 'hidden'}>
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
											<th class="px-3 py-2.5 text-right font-medium">Precio</th>
											<th class="px-4 py-2.5 text-right font-medium">Acciones</th>
										</tr>
								</thead>
								<tbody class="divide-y divide-[hsl(var(--border))]">
									{#each filteredProducts() as product (product.id)}
										<tr class="transition-colors hover:bg-[hsl(var(--secondary)/0.55)]" data-testid={`product-card-${product.id}`}>
											<td class="px-4 py-3 align-top">
										<div class="flex min-w-0 items-start gap-3">
									{#if product.photo && !productPhotoIsBroken(product.photo)}
										{@const productPhoto = product.photo}
										<button
															type="button"
															class="group mt-0.5 overflow-hidden rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-sm transition hover:border-[hsl(var(--primary)/0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
															aria-label={`Ver imagen de ${product.name}`}
															onclick={() => openProductPreview(product)}
															data-testid={`product-photo-${product.id}`}
														>
											<img
												src={productPhotoUrl(productPhoto)}
												alt={`Imagen de ${product.name}`}
												class="size-12 object-cover transition duration-150 group-hover:scale-105"
												loading="lazy"
												decoding="async"
												onload={() => clearProductPhotoBroken(productPhoto)}
												onerror={() => markProductPhotoBroken(productPhoto)}
											/>
														</button>
													{:else}
														<span
															class="mt-0.5 grid size-12 shrink-0 place-items-center rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))]"
															data-testid={`product-photo-fallback-${product.id}`}
														>
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
												<p class="font-medium tabular-nums">{productDefaultPriceLabel(product)}</p>
											</td>
											<td class="px-4 py-3 align-top">
												<div class="flex justify-end gap-1">
													<Button
														variant="ghost"
														size="icon"
														type="button"
														aria-label="Ver"
														title="Ver"
														onclick={() => openViewProductModal(product)}
														data-testid={`view-button-${product.id}`}
													>
														<Eye class="size-4" aria-hidden="true" />
													</Button>
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

							<div class={productViewMode === 'block' ? 'divide-y divide-[hsl(var(--border))]' : 'hidden'}>
							{#each filteredProducts() as product (product.id)}
								<article class="space-y-4 p-4">
									<div class="flex min-w-0 items-start gap-3">
									{#if product.photo && !productPhotoIsBroken(product.photo)}
										{@const productPhoto = product.photo}
											<button
												type="button"
												class="group overflow-hidden rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-sm transition hover:border-[hsl(var(--primary)/0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
												aria-label={`Ver imagen de ${product.name}`}
												onclick={() => openProductPreview(product)}
												data-testid={`product-photo-${product.id}`}
											>
											<img
												src={productPhotoUrl(productPhoto)}
												alt={`Imagen de ${product.name}`}
												class="size-12 object-cover transition duration-150 group-hover:scale-105"
												loading="lazy"
												decoding="async"
												onload={() => clearProductPhotoBroken(productPhoto)}
												onerror={() => markProductPhotoBroken(productPhoto)}
											/>
											</button>
										{:else}
											<span
												class="grid size-12 shrink-0 place-items-center rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))]"
												data-testid={`product-photo-fallback-${product.id}`}
											>
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
											<p class="text-xs text-[hsl(var(--muted-foreground))]">Precio por defecto</p>
											<p class="mt-1 text-sm font-medium tabular-nums">{productDefaultPriceLabel(product)}</p>
										</div>

											<div class="grid grid-cols-2 gap-2">
											<Button
												variant="secondary"
												size="sm"
												type="button"
												onclick={() => openViewProductModal(product)}
											>
												<Eye class="size-4" aria-hidden="true" />
												Ver
											</Button>
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
						<div class="border-t border-[hsl(var(--border))] px-4 py-4 text-center" bind:this={productsScrollSentinel}>
							{#if productsLoadingMore}
								<div class="inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
									<span
										class="size-4 animate-spin rounded-full border-2 border-[hsl(var(--muted-foreground))] border-t-transparent"
										aria-hidden="true"
									></span>
									Cargando más productos
								</div>
							{:else if !hasActiveProductFilters(productFilters) && productsPage < productsTotalPages}
								<Button
									type="button"
									variant="secondary"
									size="sm"
									onclick={() => loadMoreProducts(authSession)}
								>
									<LayoutList class="size-4" aria-hidden="true" />
									Cargar más
								</Button>
							{:else}
								<p class="text-xs text-[hsl(var(--muted-foreground))]">
									{catalogProductCount()} de {productsTotalElements} productos cargados
								</p>
							{/if}
						</div>
						</div>
					{/if}
				</section>

				{:else if currentSection === 'stock'}
				<section id="stock" class="space-y-4">
					<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
						<div class="min-w-0">
							<h2 class="text-2xl font-semibold tracking-tight text-[hsl(var(--foreground))]">Stock</h2>
							<p class="mt-1 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
								Gestiona lotes, caducidades y cantidades desde una vista dedicada.
							</p>
						</div>
					</div>

					<section class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
						<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
							<div class="min-w-0">
								<h3 class="text-base font-semibold text-[hsl(var(--foreground))]">Resumen y acceso rápido</h3>
								<p class="mt-1 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
									Los stats quedan plegados en móvil y las preferencias se guardan en este navegador.
								</p>
							</div>
								<div class="flex flex-wrap gap-2 lg:justify-end">
									<Button
										type="button"
										variant="secondary"
										size="sm"
										onclick={toggleStockStatsOpen}
									aria-pressed={stockStatsOpen}
									data-testid="stock-stats-toggle"
										>
											<Eye class="size-4" aria-hidden="true" />
											{stockStatsOpen ? 'Ocultar stats' : 'Ver stats'}
										</Button>
								</div>
							</div>

						{#if stockStatsOpen}
							<section class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Metricas del stock" data-testid="stock-stats-panel">
								<MetricCard
									label="Stock total"
									value={totalStockQuantityLabel()}
									hint={data.productStats ? 'Suma de todas las entradas' : 'Cargando estadisticas'}
								>
									<Package class="size-4" aria-hidden="true" />
								</MetricCard>
								<MetricCard
									label="Entradas"
									value={loadingCountLabel(!stockSectionLoading(), stockEntriesCount())}
									hint="Lotes registrados en el sistema"
								>
									<Package class="size-4" aria-hidden="true" />
								</MetricCard>
								<MetricCard
									label="Antes caduca"
									value={earliestExpirationLabel()}
									hint={earliestExpirationHint()}
									tone="accent"
								>
									<CalendarClock class="size-4" aria-hidden="true" />
								</MetricCard>
							</section>
						{/if}
					</section>
						<section class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
						<div class="flex flex-col gap-3 border-b border-[hsl(var(--border))] p-4 sm:flex-row sm:items-center sm:justify-between">
							<div class="min-w-0">
								<h3 class="text-base font-semibold text-[hsl(var(--foreground))]">Inventario</h3>
								<p class="mt-1 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
									Entradas de stock ordenadas por caducidad para consultar el estado real del almacen.
								</p>
							</div>
							<div class="flex flex-wrap items-center gap-2">
								<div class="inline-flex rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 shadow-sm">
									<Button
										type="button"
										size="sm"
										variant={stockViewMode === 'list' ? 'primary' : 'ghost'}
										class={stockViewMode === 'list' ? '' : 'text-[hsl(var(--muted-foreground))]'}
										onclick={() => setStockViewMode('list')}
										aria-pressed={stockViewMode === 'list'}
										data-testid="stock-view-list"
									>
										<LayoutList class="size-4" aria-hidden="true" />
										Lista
									</Button>
									<Button
										type="button"
										size="sm"
										variant={stockViewMode === 'block' ? 'primary' : 'ghost'}
										class={stockViewMode === 'block' ? '' : 'text-[hsl(var(--muted-foreground))]'}
										onclick={() => setStockViewMode('block')}
										aria-pressed={stockViewMode === 'block'}
										data-testid="stock-view-block"
									>
										<SlidersHorizontal class="size-4" aria-hidden="true" />
										Bloque
									</Button>
								</div>
								<Button type="button" onclick={() => openStockModal()} disabled={!data.backendAvailable}>
									<Plus class="size-4" aria-hidden="true" />
									Añadir stock
								</Button>
								<span class="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-md border border-[hsl(var(--border))] px-2 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))]">
									<Package class="size-3.5" aria-hidden="true" />
									<span data-testid="stock-count">{loadingCountLabel(!stockSectionLoading(), filteredStockEntries().length)}</span>
									entradas
								</span>
							</div>
						</div>

						{#if !stockSectionLoading() && data.stockEntries.length > 0}
							<div class="grid gap-3 border-b border-[hsl(var(--border))] p-4 sm:grid-cols-2">
								<label class="space-y-2">
									<span class="text-sm font-medium">Producto</span>
									<select class={inputClass} bind:value={stockProductFilter}>
										<option value="">Todos los productos</option>
										{#each stockFilterProducts() as product}
											<option value={product.id}>{product.name}</option>
										{/each}
									</select>
								</label>
								<label class="space-y-2">
									<span class="text-sm font-medium">Caduca antes de</span>
									<input class={inputClass} type="date" bind:value={stockExpiresBefore} />
								</label>
							</div>
						{/if}

						{#if stockSectionLoading()}
							<div class="grid place-items-center px-8 py-16 text-center">
								<div class="grid size-12 place-items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
									<div class="size-5 animate-spin rounded-full border-2 border-[hsl(var(--muted-foreground))] border-t-transparent" aria-hidden="true"></div>
								</div>
								<h3 class="mt-4 text-sm font-semibold text-[hsl(var(--foreground))]">Cargando stock</h3>
								<p class="mt-1 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">
									Estamos consultando las entradas de stock.
								</p>
							</div>
						{:else if data.stockEntries.length === 0}
							<div class="p-8 text-center">
								<div class="mx-auto grid size-10 place-items-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
									<Package class="size-5 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
								</div>
								<h3 class="mt-3 text-sm font-semibold text-[hsl(var(--foreground))]">No hay stock registrado</h3>
								<p class="mx-auto mt-1 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">
									Abre el alta de stock desde este menu o desde un producto para empezar a registrar lotes.
								</p>
							</div>
						{:else if filteredStockEntries().length === 0}
							<div class="p-8 text-center">
								<Search class="mx-auto size-8 text-[hsl(var(--muted-foreground))]" />
								<h3 class="mt-3 text-sm font-semibold">No hay entradas que coincidan</h3>
								<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Cambia los filtros para volver a ver el inventario.</p>
							</div>
						{:else}
							{@const stockEntries = filteredStockEntries()}
							{#if stockViewMode === 'list'}
								<div class="hidden overflow-x-auto md:block">
									<table class="w-full table-fixed text-sm">
										<colgroup>
											<col class="w-[32%]" />
											<col class="w-[12%]" />
											<col class="w-[12%]" />
											<col class="w-[16%]" />
											<col class="w-[16%]" />
											<col class="w-[12%]" />
										</colgroup>
										<thead class="bg-[hsl(var(--secondary))] text-xs text-[hsl(var(--muted-foreground))]">
											<tr class="border-b border-[hsl(var(--border))]">
												<th class="px-4 py-2.5 text-left font-medium">Producto</th>
												<th class="px-3 py-2.5 text-right font-medium">Cant.</th>
												<th class="px-3 py-2.5 text-right font-medium">Precio</th>
												<th class="px-3 py-2.5 text-right font-medium">Caducidad</th>
												<th class="px-3 py-2.5 text-right font-medium">Entrada</th>
												<th class="px-4 py-2.5 text-right font-medium">Accion</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-[hsl(var(--border))]">
											{#each stockEntries as stockEntry (stockEntry.id)}
												<tr class="transition-colors hover:bg-[hsl(var(--secondary)/0.55)]">
													<td class="px-4 py-3 align-top">
														<div class="min-w-0">
															<p class="truncate font-medium text-[hsl(var(--foreground))]">{stockEntry.productName}</p>
															<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Producto #{stockEntry.productId}</p>
														</div>
													</td>
													<td class="px-3 py-3 text-right align-top font-medium tabular-nums">{formatNumber(stockEntry.quantity)}</td>
													<td class="px-3 py-3 text-right align-top tabular-nums">{formatCurrency(stockEntry.price)}</td>
													<td class="px-3 py-3 text-right align-top tabular-nums">{formatDate(stockEntry.expirationDate)}</td>
													<td class="px-3 py-3 text-right align-top tabular-nums">{formatDate(stockEntry.entryDate)}</td>
													<td class="px-4 py-3 align-top">
														<div class="flex justify-end gap-1">
															<Button
																variant="ghost"
																size="icon"
																type="button"
																aria-label="Editar stock"
																title="Editar stock"
																onclick={() => openEditStockModal(stockEntry)}
																data-testid={`stock-edit-button-${stockEntry.id}`}
															>
																<Pencil class="size-4" aria-hidden="true" />
															</Button>
															<Button
																variant="ghost"
																size="icon"
																type="button"
																aria-label="Borrar stock"
																title="Borrar stock"
																class="text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.08)] hover:text-[hsl(var(--destructive))]"
																onclick={() => openDeleteStockModal(stockEntry)}
																data-testid={`stock-delete-button-${stockEntry.id}`}
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
									{#each stockEntries as stockEntry (stockEntry.id)}
										<article class="space-y-4 p-4">
											<div class="flex items-start justify-between gap-3">
												<div class="min-w-0">
													<h3 class="truncate text-sm font-semibold text-[hsl(var(--foreground))]">{stockEntry.productName}</h3>
													<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Producto #{stockEntry.productId}</p>
												</div>
												<div class="shrink-0 text-right">
													<p class="text-sm font-semibold tabular-nums text-[hsl(var(--foreground))]">{formatNumber(stockEntry.quantity)}</p>
													<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">uds</p>
												</div>
											</div>
											<div class="grid grid-cols-3 gap-2 text-xs text-[hsl(var(--muted-foreground))]">
												<span class="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.2)] px-2 py-1">Precio {formatCurrency(stockEntry.price)}</span>
												<span class="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.2)] px-2 py-1">Caduca {formatDate(stockEntry.expirationDate)}</span>
												<span class="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.2)] px-2 py-1">Entra {formatDate(stockEntry.entryDate)}</span>
											</div>
											<div class="flex justify-end gap-1">
												<Button
													variant="ghost"
													size="icon"
													type="button"
													aria-label="Editar stock"
													title="Editar stock"
													onclick={() => openEditStockModal(stockEntry)}
													data-testid={`stock-edit-card-button-${stockEntry.id}`}
												>
													<Pencil class="size-4" aria-hidden="true" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													type="button"
													aria-label="Borrar stock"
													title="Borrar stock"
													class="text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.08)] hover:text-[hsl(var(--destructive))]"
													onclick={() => openDeleteStockModal(stockEntry)}
													data-testid={`stock-delete-card-button-${stockEntry.id}`}
												>
													<Trash2 class="size-4" aria-hidden="true" />
												</Button>
											</div>
										</article>
									{/each}
								</div>
							{:else}
								<div class="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3" data-testid="stock-block-list">
									{#each stockEntries as stockEntry (stockEntry.id)}
										<article class="space-y-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
											<div class="flex items-start justify-between gap-3">
												<div class="min-w-0">
													<h3 class="truncate text-sm font-semibold text-[hsl(var(--foreground))]">{stockEntry.productName}</h3>
													<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Producto #{stockEntry.productId}</p>
												</div>
												<div class="shrink-0 text-right">
													<p class="text-lg font-semibold tabular-nums text-[hsl(var(--foreground))]">{formatNumber(stockEntry.quantity)}</p>
													<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">uds</p>
												</div>
											</div>
											<dl class="grid grid-cols-2 gap-2 text-sm">
												<div class="rounded-md border border-[hsl(var(--border))] p-2.5">
													<dt class="text-xs text-[hsl(var(--muted-foreground))]">Precio</dt>
													<dd class="mt-1 font-medium tabular-nums">{formatCurrency(stockEntry.price)}</dd>
												</div>
												<div class="rounded-md border border-[hsl(var(--border))] p-2.5">
													<dt class="text-xs text-[hsl(var(--muted-foreground))]">Caducidad</dt>
													<dd class="mt-1 font-medium tabular-nums">{formatDate(stockEntry.expirationDate)}</dd>
												</div>
												<div class="rounded-md border border-[hsl(var(--border))] p-2.5">
													<dt class="text-xs text-[hsl(var(--muted-foreground))]">Entrada</dt>
													<dd class="mt-1 font-medium tabular-nums">{formatDate(stockEntry.entryDate)}</dd>
												</div>
												<div class="rounded-md border border-[hsl(var(--border))] p-2.5">
													<dt class="text-xs text-[hsl(var(--muted-foreground))]">Cantidad</dt>
													<dd class="mt-1 font-medium tabular-nums">{formatNumber(stockEntry.quantity)}</dd>
												</div>
											</dl>
											<div class="grid grid-cols-2 gap-2">
												<Button
													variant="secondary"
													size="sm"
													type="button"
													onclick={() => openEditStockModal(stockEntry)}
													data-testid={`stock-edit-card-button-${stockEntry.id}`}
												>
													<Pencil class="size-4" aria-hidden="true" />
													Editar
												</Button>
												<Button
													variant="ghost"
													size="sm"
													type="button"
													class="text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.08)] hover:text-[hsl(var(--destructive))]"
													onclick={() => openDeleteStockModal(stockEntry)}
													data-testid={`stock-delete-card-button-${stockEntry.id}`}
												>
													<Trash2 class="size-4" aria-hidden="true" />
													Borrar
												</Button>
											</div>
										</article>
									{/each}
								</div>
							{/if}
							{/if}
									</section>
						</section>

					{:else if currentSection === 'planning'}
					{@const activeMenu = data.proposedWeekMenu}
					<section id="planning" class="space-y-4">
						<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
							<div class="min-w-0">
								<div class="flex flex-wrap items-center gap-3">
									<h2 class="text-2xl font-semibold tracking-tight text-[hsl(var(--foreground))]">Planificación</h2>
									{#if activeMenu}
										<span class="inline-flex w-fit items-center gap-1.5 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))]" data-testid="week-date-range">
											<CalendarClock class="size-3.5" aria-hidden="true" />
											{weekDateRangeLabel(activeMenu.startDate, activeMenu.endDate)}
										</span>
									{/if}
									{#if planningMenusForSelector().length > 0}
										<label class="min-w-0">
											<span class="sr-only">Periodo de planificación</span>
											<select
												class="h-10 w-full max-w-[18rem] cursor-pointer rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 pr-8 text-sm text-[hsl(var(--foreground))] shadow-sm transition-colors focus:border-[hsl(var(--ring))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.14)] disabled:cursor-not-allowed disabled:bg-[hsl(var(--muted))] disabled:opacity-70"
												value={selectedPlanningMenuId ?? ''}
												onchange={(event) => void selectPlanningMenu(Number((event.currentTarget as HTMLSelectElement).value))}
												disabled={!data.backendAvailable}
												data-testid="planning-menu-selector"
												aria-label="Periodo de planificación"
											>
												<option value="" disabled>Selecciona un periodo</option>
												{#each planningMenusForSelector() as menu (menu.id)}
													<option value={menu.id}>{menu.label}</option>
												{/each}
											</select>
										</label>
									{/if}
								</div>
								<p class="mt-1 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
									Crea borradores de hasta 16 días y reparte menús por día, sección y producto.
								</p>
							</div>
							<div class="flex flex-wrap gap-2 sm:shrink-0">
								<Button type="button" onclick={openCreateWeekMenuModal} disabled={!data.backendAvailable}>
									<Plus class="size-4" aria-hidden="true" />
									Nueva semana
								</Button>
								{#if activeProposedWeekMenuId}
									<Button type="button" variant="secondary" onclick={openPublishWeekMenuModal} disabled={!data.backendAvailable}>
										<CircleCheck class="size-4" aria-hidden="true" />
										Establecer semana
									</Button>
								{/if}
							</div>
						</div>

						{#if planningMenusForSelector().length > 0}
							<!-- selector moved into the header -->
						{/if}

						{#if !data.proposedWeekMenuLoaded}
							<div class="grid place-items-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-8 py-16 text-center shadow-sm">
								<div class="grid size-12 place-items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
									<div class="size-5 animate-spin rounded-full border-2 border-[hsl(var(--muted-foreground))] border-t-transparent" aria-hidden="true"></div>
								</div>
								<h3 class="mt-4 text-sm font-semibold text-[hsl(var(--foreground))]">Cargando planificación</h3>
								<p class="mt-1 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">
									Estamos consultando la planificación activa y sus menús diarios.
								</p>
							</div>
						{:else if !activeMenu}
							<div class="grid gap-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 shadow-sm">
								<div class="mx-auto grid size-12 place-items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
									<CalendarClock class="size-5 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
								</div>
								<div class="text-center">
									<h3 class="text-base font-semibold text-[hsl(var(--foreground))]">No hay una planificación activa</h3>
									<p class="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
										Crea un rango de fechas y empieza a añadir menús diarios cuando quieras.
									</p>
								</div>
								<div class="flex justify-center">
									<Button type="button" onclick={openCreateWeekMenuModal} disabled={!data.backendAvailable}>
										<Plus class="size-4" aria-hidden="true" />
										Crear planificación
									</Button>
								</div>
							</div>
						{:else}
							<section class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
								<div class="border-b border-[hsl(var(--border))] p-4">
									<div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
										<div class="min-w-0">
											<div class="flex flex-wrap items-center gap-2">
												<h3 class="text-base font-semibold text-[hsl(var(--foreground))]">Dias de la semana</h3>
												<span class="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-md border border-[hsl(var(--border))] px-2 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))]">
													<CalendarClock class="size-3.5" aria-hidden="true" />
														{planningDayList.length} dias
												</span>
											</div>
											<p class="mt-1 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">Las semanas se pueden dejar vacias y completar dia a dia.</p>
											<Button type="button" variant="secondary" onclick={openWeekStockDialog} disabled={!activeMenu} class="mt-3 w-fit">
												<Package class="size-4" aria-hidden="true" />
												Ver stock
											</Button>
										</div>
										<div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
											<div class="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.18)] px-3 py-2 shadow-sm" data-testid="week-planned-days-card">
												<div class="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
													<LayoutList class="size-3.5" aria-hidden="true" />
													<span>Dias planificados</span>
												</div>
												<p class="mt-1 text-xl font-semibold tabular-nums text-[hsl(var(--foreground))]">{planningSummary.plannedDays}</p>
											</div>
											<div class="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.18)] px-3 py-2 shadow-sm" data-testid="week-calories-card">
												<div class="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
													<Flame class="size-3.5" aria-hidden="true" />
													<span>Calorias</span>
												</div>
												<p class="mt-1 text-xl font-semibold tabular-nums text-[hsl(var(--foreground))]">{formatNumber(planningSummary.calories.averagePerPlannedDay)}</p>
												<p class="mt-0.5 text-[11px] leading-4 text-[hsl(var(--muted-foreground))]">
													{planningSummary.plannedDays > 0 && planningSummary.calories.maxDay && planningSummary.calories.minDay ? `Media por dia. Max ${formatShortDate(planningSummary.calories.maxDay.date)} ${formatNumber(planningSummary.calories.maxDay.calories)} kcal · Min ${formatShortDate(planningSummary.calories.minDay.date)} ${formatNumber(planningSummary.calories.minDay.calories)} kcal` : 'Sin dias planificados'}
												</p>
											</div>
											<div class="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.18)] px-3 py-2 shadow-sm" data-testid="week-distinct-products-card">
												<div class="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
													<Package class="size-3.5" aria-hidden="true" />
													<span>Productos distintos</span>
												</div>
												<p class="mt-1 text-xl font-semibold tabular-nums text-[hsl(var(--foreground))]">{planningSummary.distinctProducts}</p>
											</div>
											<div class="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.18)] px-3 py-2 shadow-sm" data-testid="week-cost-card">
												<div class="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
													<Database class="size-3.5" aria-hidden="true" />
													<span>Coste estimado</span>
												</div>
												<p class="mt-1 text-xl font-semibold tabular-nums text-[hsl(var(--foreground))]">{formatCurrency(planningSummary.estimatedCost)}</p>
											</div>
										</div>
									</div>
								</div>
									{#if activeMenu.nutritionalRules}
										<div class="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.16)] p-4">
											<NutritionalEvaluationPanel evaluation={activeMenu.nutritionalRules} />
										</div>
									{/if}
									{#if data.proposedWeekMenuDayPartsLoaded && data.proposedWeekMenuDayParts.length === 0}
									<div class="flex flex-col gap-3 border-b border-[hsl(var(--accent)/0.3)] bg-[hsl(var(--accent)/0.08)] p-4 sm:flex-row sm:items-center sm:justify-between" role="alert" data-testid="week-day-parts-warning">
										<div class="flex min-w-0 items-start gap-3">
											<CircleAlert class="mt-0.5 size-5 shrink-0 text-[hsl(var(--accent))]" aria-hidden="true" />
											<div class="min-w-0">
												<h4 class="text-sm font-semibold text-[hsl(var(--foreground))]">Añade una parte del día para continuar</h4>
												<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
													Los botones para añadir menús estarán deshabilitados hasta que configures al menos una parte del día.
												</p>
											</div>
										</div>
										<Button type="button" variant="secondary" onclick={() => setSection('day-parts')} data-testid="week-day-parts-link">
											<Settings class="size-4" aria-hidden="true" />
											Añadir parte del día
										</Button>
									</div>
								{/if}
								<div class="divide-y divide-[hsl(var(--border))]">
									{#each planningDayList as date (date)}
										{@const day = proposedWeekMenuDay(date)}
										<article class="space-y-4 p-4" data-testid={`week-day-card-${date}`}>
											<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
												<div class="min-w-0">
													<div class="flex flex-wrap items-center gap-2">
														<h4 class="text-sm font-semibold text-[hsl(var(--foreground))]">{formatLongDate(date)}</h4>
													</div>
													<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{day ? `${day.sections.length} secciones · ${weekDayProductCount(day)} productos` : 'Sin menu todavía'}</p>
												</div>
												<div class="flex flex-wrap gap-2">
													<Button
														type="button"
														variant="secondary"
														class={day ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500' : ''}
														onclick={() => openWeekDayModal(date)}
														disabled={!data.backendAvailable || data.proposedWeekMenuDayParts.length === 0}
														data-testid={`week-day-action-${date}`}
													>
														{day ? 'Editar menu' : 'Añadir menu'}
													</Button>
												</div>
											</div>
											{#if day}
													{#if activeMenu.nutritionalRules}
														<DailyNutritionalEvaluation values={day.nutritionalValues} rules={activeMenu.nutritionalRules} />
													{:else}
														<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
														<MetricCard label="Calorias" value={formatNumber(day.nutritionalValues.calories)} hint="Total del dia"><Flame class="size-4" aria-hidden="true" /></MetricCard>
														<MetricCard label="Carbos" value={formatNumber(day.nutritionalValues.carbohydrates)} hint="Total del dia"><Wheat class="size-4" aria-hidden="true" /></MetricCard>
														<MetricCard label="Proteinas" value={formatNumber(day.nutritionalValues.proteins)} hint="Total del dia"><Drumstick class="size-4" aria-hidden="true" /></MetricCard>
														<MetricCard label="Grasas" value={formatNumber(day.nutritionalValues.fats)} hint="Total del dia"><Droplets class="size-4" aria-hidden="true" /></MetricCard>
													</div>
												{/if}
												<div class="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
													{#each day.sections as section}
														<div class="flex min-h-[14rem] flex-col overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-3 lg:aspect-square">
															<div class="flex items-start justify-between gap-3">
																<div>
																	<p class="text-sm font-medium text-[hsl(var(--foreground))]">{section.name}</p>
																</div>
																<p class="text-xs text-[hsl(var(--muted-foreground))]">{section.products.length} productos</p>
															</div>
															<div class="mt-3 min-h-0 flex-1 space-y-2 overflow-auto pr-1">
																{#each section.products as product}
																	<div class="flex items-center justify-between gap-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2.5 py-2">
																		<p class="min-w-0 truncate text-xs font-medium text-[hsl(var(--foreground))]">{product.productName}</p>
																		<p class="shrink-0 text-xs tabular-nums text-[hsl(var(--muted-foreground))]">
																			{product.units} uds
																			{#if product.grams}
																				· {formatNumber(product.grams)} g
																			{/if}
																		</p>
																	</div>
																{/each}
															</div>
														</div>
													{/each}
												</div>
											{:else}
												<div class="rounded-lg border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.25)] p-4">
													<p class="text-sm text-[hsl(var(--muted-foreground))]">Este dia todavia no tiene menu configurado.</p>
												</div>
											{/if}
										</article>
									{/each}
								</div>
							</section>
						{/if}
					</section>

				{:else if currentSection === 'menus'}
					<section id="menus" class="space-y-4">
						<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
							<div class="min-w-0">
								<h2 class="text-2xl font-semibold tracking-tight text-[hsl(var(--foreground))]">Menú</h2>
								<p class="mt-1 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
									Consulta las comidas planificadas por período de menú o por un rango de fechas.
								</p>
							</div>
							<div class="flex flex-wrap gap-2 sm:shrink-0">
								<Button type="button" variant="secondary" onclick={() => setSection('planning')}>
									<CalendarClock class="size-4" aria-hidden="true" />
									Ir a planificación
								</Button>
							</div>
						</div>

						<MenuMealsTable
							menus={data.menus}
							loaded={data.menusLoaded}
							menuStateByMenuId={planningStateByMenuId}
							selectedMenuId={selectedMenuId}
							onSelectMenu={selectMenu}
							onEditMenu={editEstablishedMenu}
							onDeleteMenu={undoEstablishedMenu}
						/>
					</section>

				{:else if currentSection === 'closed-menus'}
					{@const activeMenu = data.establishedWeekMenu}
					{@const closedMenuList = closedMenus()}
					<section id="closed-menus" class="space-y-4">
						<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
							<div class="min-w-0">
								<div class="flex flex-wrap items-center gap-2">
									<h2 class="text-2xl font-semibold tracking-tight text-[hsl(var(--foreground))]">Historial de menús</h2>
									{#if activeMenu}
										<span class="inline-flex w-fit items-center gap-1.5 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))]" data-testid="menu-date-range">
											<CalendarClock class="size-3.5" aria-hidden="true" />
											{weekDateRangeLabel(activeMenu.startDate, activeMenu.endDate)}
										</span>
									{/if}
								</div>
								<p class="mt-1 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
									Revisa los menús ya cerrados y sus estadísticas finales.
								</p>
							</div>
							<div class="flex flex-wrap gap-2 sm:shrink-0">
								<Button type="button" variant="secondary" onclick={() => setSection('menus')}>
									<CircleCheck class="size-4" aria-hidden="true" />
									Ver en curso
								</Button>
								<Button type="button" variant="secondary" onclick={() => setSection('planning')}>
									<CalendarClock class="size-4" aria-hidden="true" />
									Ir a planificación
								</Button>
							</div>
						</div>

						{#if closedMenuList.length > 0}
							<section class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm">
								<div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] lg:items-end">
									<div class="min-w-0">
										<p class="text-sm text-[hsl(var(--muted-foreground))]">
											{closedMenuList.length} menús cerrados cargados desde el backend.
										</p>
									</div>
									<label class="block min-w-0">
										<span class={fieldLabelClass}>Menú cerrado</span>
										<select
											class={inputClass}
											value={selectedClosedMenuId ?? ''}
											onchange={(event) => void selectClosedMenu(Number((event.currentTarget as HTMLSelectElement).value))}
											disabled={!data.backendAvailable}
											data-testid="closed-menu-selector"
										>
											<option value="" disabled>Selecciona un menú cerrado</option>
											{#each closedMenuList as menu (menu.id)}
												<option value={menu.id}>{menuLabel(menu)}</option>
											{/each}
										</select>
									</label>
								</div>
							</section>
						{/if}

						{#if !data.establishedWeekMenuLoaded}
							<div class="grid place-items-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-8 py-16 text-center shadow-sm">
								<div class="grid size-12 place-items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
									<div class="size-5 animate-spin rounded-full border-2 border-[hsl(var(--muted-foreground))] border-t-transparent" aria-hidden="true"></div>
								</div>
								<h3 class="mt-4 text-sm font-semibold text-[hsl(var(--foreground))]">Cargando historial</h3>
								<p class="mt-1 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">
									Estamos consultando el snapshot cerrado seleccionado y sus estadísticas.
								</p>
							</div>
						{:else if !activeMenu || planningStateByMenuId(activeMenu.id) !== 'CLOSED'}
							<div class="grid gap-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 shadow-sm">
								<div class="mx-auto grid size-12 place-items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
									<CircleCheck class="size-5 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
								</div>
								<div class="text-center">
									<h3 class="text-base font-semibold text-[hsl(var(--foreground))]">No hay un menú cerrado seleccionado</h3>
									<p class="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
										Selecciona un menú cerrado para ver sus estadísticas y su snapshot final.
									</p>
								</div>
							</div>
						{:else}
							<MenuCompletionPanel
								menuId={activeMenu.id}
								payerUsername={activeMenu.payerUsername}
								currentUserId={authSession!.userId}
								authorization={authorizationHeader(authSession!)}
								initialShoppingList={activeMenu.shoppingList}
								initialUsedStock={activeMenu.usedStock}
							/>
							<section class="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Metricas del menu">
								<div data-testid="menu-planned-days-card">
									<MetricCard label="Dias planificados" value={String(activeMenu.stockSummary.plannedDays)} hint="Dias ya guardados">
										<LayoutList class="size-4" aria-hidden="true" />
									</MetricCard>
								</div>
								<div data-testid="menu-calories-card">
									<MetricCard label="Calorias" value={formatNumber(activeMenu.nutritionalValues.calories)} hint="Total del menú">
										<Flame class="size-4" aria-hidden="true" />
									</MetricCard>
								</div>
								<div data-testid="menu-distinct-products-card">
									<MetricCard label="Productos distintos" value={String(activeMenu.stockSummary.distinctProducts)} hint="Variedad de productos" tone="accent">
										<Package class="size-4" aria-hidden="true" />
									</MetricCard>
								</div>
								<div data-testid="menu-cost-card">
									<MetricCard label="Coste estimado" value={formatCurrency(activeMenu.stockSummary.estimatedCost)} hint="Stock aplicado y coste real">
										<Database class="size-4" aria-hidden="true" />
									</MetricCard>
								</div>
							</section>
						{/if}
					</section>

					{:else if currentSection === 'people-weights'}
						<section id="people-weights" class="space-y-4">
							<PeoplePanel authorization={authorizationHeader(authSession!)} currentUserId={authSession!.userId} mode="weights" />
						</section>
					{:else if currentSection === 'people-history'}
						<section id="people-history" class="space-y-4">
							<PeoplePanel authorization={authorizationHeader(authSession!)} currentUserId={authSession!.userId} mode="history" />
						</section>
					{:else if currentSection === 'people-trend'}
						<section id="people-trend" class="space-y-4">
							<PeoplePanel authorization={authorizationHeader(authSession!)} currentUserId={authSession!.userId} mode="trend" />
						</section>
					{:else if currentSection === 'day-parts'}
						<section id="day-parts" class="space-y-4">
							<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
								<div class="min-w-0">
									<h2 class="text-2xl font-semibold tracking-tight text-[hsl(var(--foreground))]">Partes del dia</h2>
									<p class="mt-1 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
										Configura las secciones reutilizables que luego se seleccionan en los menus diarios.
									</p>
								</div>
									<Button type="button" onclick={openCreateDayPartModal} disabled={!data.backendAvailable}>
										<Plus class="size-4" aria-hidden="true" />
										Nueva parte
									</Button>
								</div>

								<section class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
									<div class="flex flex-col gap-3 border-b border-[hsl(var(--border))] p-4 sm:flex-row sm:items-center sm:justify-between">
										<div class="min-w-0">
											<h3 class="text-base font-semibold text-[hsl(var(--foreground))]">Configuracion disponible</h3>
											<p class="mt-1 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
												El orden se aplica al mostrar las secciones dentro de cada dia.
											</p>
										</div>
										<span class="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-md border border-[hsl(var(--border))] px-2 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))]">
											<Settings class="size-3.5" aria-hidden="true" />
											{loadingCountLabel(data.proposedWeekMenuDayPartsLoaded, data.proposedWeekMenuDayParts.length)}
										</span>
									</div>

									{#if !data.proposedWeekMenuDayPartsLoaded}
										<div class="grid place-items-center px-8 py-16 text-center">
											<div class="grid size-12 place-items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
												<div
													class="size-5 animate-spin rounded-full border-2 border-[hsl(var(--muted-foreground))] border-t-transparent"
													aria-hidden="true"
												></div>
											</div>
											<h3 class="mt-4 text-sm font-semibold text-[hsl(var(--foreground))]">Cargando partes del dia</h3>
										</div>
									{:else if data.proposedWeekMenuDayParts.length === 0}
										<div class="p-8 text-center">
											<div class="mx-auto grid size-10 place-items-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
												<Settings class="size-5 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
											</div>
											<h3 class="mt-3 text-sm font-semibold text-[hsl(var(--foreground))]">No hay partes del dia</h3>
											<p class="mx-auto mt-1 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">
												Crea al menos una para poder añadir secciones a un menu diario.
											</p>
										</div>
									{:else}
										<div class="hidden overflow-x-auto md:block">
											<table class="w-full table-fixed text-sm">
												<colgroup>
													<col class="w-[22%]" />
													<col class="w-[46%]" />
													<col class="w-[12%]" />
													<col class="w-[20%]" />
												</colgroup>
												<thead class="bg-[hsl(var(--secondary))] text-xs text-[hsl(var(--muted-foreground))]">
													<tr class="border-b border-[hsl(var(--border))]">
														<th class="px-4 py-2.5 text-left font-medium">Nombre</th>
														<th class="px-3 py-2.5 text-left font-medium">Descripcion</th>
														<th class="px-3 py-2.5 text-right font-medium">Orden</th>
														<th class="px-4 py-2.5 text-right font-medium">Acciones</th>
													</tr>
												</thead>
												<tbody class="divide-y divide-[hsl(var(--border))]">
													{#each data.proposedWeekMenuDayParts as dayPart (dayPart.id)}
														<tr class="transition-colors hover:bg-[hsl(var(--secondary)/0.55)]" data-testid={`day-part-row-${dayPart.id}`}>
															<td class="px-4 py-3 align-top font-medium text-[hsl(var(--foreground))]">{dayPart.name}</td>
															<td class="px-3 py-3 align-top text-[hsl(var(--muted-foreground))]">
																<p class="line-clamp-2 break-words">{dayPart.description}</p>
															</td>
															<td class="px-3 py-3 text-right align-top tabular-nums">{dayPart.sortOrder}</td>
															<td class="px-4 py-3 align-top">
																<div class="flex justify-end">
																	<Button
																		variant="ghost"
																		size="icon"
																		type="button"
																		aria-label="Editar"
																		title="Editar"
																		onclick={() => openEditDayPartModal(dayPart)}
																		data-testid={`day-part-edit-${dayPart.id}`}
																	>
																		<Pencil class="size-4" aria-hidden="true" />
																	</Button>
																</div>
															</td>
														</tr>
													{/each}
												</tbody>
											</table>
										</div>

										<div class="divide-y divide-[hsl(var(--border))] md:hidden">
											{#each data.proposedWeekMenuDayParts as dayPart (dayPart.id)}
												<article class="space-y-3 p-4" data-testid={`day-part-card-${dayPart.id}`}>
													<div class="flex items-start justify-between gap-3">
														<div class="min-w-0">
															<h3 class="truncate text-sm font-semibold text-[hsl(var(--foreground))]">{dayPart.name}</h3>
															<p class="mt-1 break-words text-sm leading-6 text-[hsl(var(--muted-foreground))]">
																{dayPart.description}
															</p>
														</div>
														<Button
															variant="ghost"
															size="icon"
															type="button"
															aria-label="Editar"
															title="Editar"
															onclick={() => openEditDayPartModal(dayPart)}
														>
															<Pencil class="size-4" aria-hidden="true" />
														</Button>
													</div>
													<p class="text-xs text-[hsl(var(--muted-foreground))]">Orden {dayPart.sortOrder}</p>
												</article>
											{/each}
									</div>
								{/if}
							</section>
							</section>

					{:else if currentSection === 'supermarkets'}
						<SupermarketsPanel authorization={authorizationHeader(authSession!)} />
					{:else if currentSection === 'money-box'}
						<MoneyBoxPanel authorization={authorizationHeader(authSession!)} userId={data.session.userId} reloadToken={refreshCatalogToken} />
					{:else if currentSection === 'nutritional-rules'}
						<NutritionalRulesPanel authorization={authorizationHeader(authSession!)} />
					{:else}
						<section id="recipes" class="space-y-4">
						<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
							<div class="min-w-0">
								<h2 class="text-2xl font-semibold tracking-tight text-[hsl(var(--foreground))]">Recetas</h2>
								<p class="mt-1 max-w-2xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
									Combina productos existentes, calcula nutrientes y genera productos derivados desde una sola vista.
								</p>
							</div>
							<div class="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
								<Button
									type="button"
									variant="secondary"
									size="sm"
									onclick={toggleRecipeStatsOpen}
									aria-pressed={recipeStatsOpen}
									data-testid="recipe-stats-toggle"
								>
									<Eye class="size-4" aria-hidden="true" />
									{recipeStatsOpen ? 'Ocultar stats' : 'Ver stats'}
								</Button>
								<div class="inline-flex rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 shadow-sm">
									<Button
										type="button"
										size="sm"
										variant={recipeViewMode === 'list' ? 'primary' : 'ghost'}
										class={recipeViewMode === 'list' ? '' : 'text-[hsl(var(--muted-foreground))]'}
										onclick={() => setRecipeViewMode('list')}
										aria-pressed={recipeViewMode === 'list'}
										data-testid="recipe-view-list"
									>
										<LayoutList class="size-4" aria-hidden="true" />
										Lista
									</Button>
									<Button
										type="button"
										size="sm"
										variant={recipeViewMode === 'block' ? 'primary' : 'ghost'}
										class={recipeViewMode === 'block' ? '' : 'text-[hsl(var(--muted-foreground))]'}
										onclick={() => setRecipeViewMode('block')}
										aria-pressed={recipeViewMode === 'block'}
										data-testid="recipe-view-block"
									>
										<SlidersHorizontal class="size-4" aria-hidden="true" />
										Bloque
									</Button>
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
						</div>

						{#if recipeStatsOpen}
							<section class="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Metricas de recetas">
						<MetricCard
							label="Recetas activas"
							value={String(data.recipeStats?.activeRecipes ?? data.recipes.length)}
							hint="Preparaciones registradas"
							tone="primary"
						>
							<BookOpen class="size-4" aria-hidden="true" />
						</MetricCard>
						<MetricCard
							label="Media kcal"
							value={formatNumber(data.recipeStats?.averageCalories ?? 0)}
							hint="Calorias por receta"
						>
							<Flame class="size-4" aria-hidden="true" />
						</MetricCard>
						<MetricCard
							label="Ingredientes totales"
							value={String(data.recipeStats?.totalIngredients ?? 0)}
							hint="Productos usados en recetas"
						>
							<LayoutList class="size-4" aria-hidden="true" />
						</MetricCard>
						<MetricCard
							label="Con derivado"
							value={String(data.recipeStats?.recipesWithDerivedProduct ?? 0)}
							hint="Recetas con producto generado"
							tone="accent"
						>
							<Package class="size-4" aria-hidden="true" />
						</MetricCard>
					</section>
				{/if}

				<RecipeFilters
						filters={recipeFilters}
						onChange={updateRecipeFilters}
						onClear={clearRecipeFilters}
						testIdPrefix="recipe-filter"
					/>

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
								<span data-testid="recipe-count">
									{recipeCountLabel()}
								</span>
								cargadas
									</span>
									</div>

								{#if recipesSectionLoading()}
							<div class="grid place-items-center px-8 py-16 text-center">
								<div class="grid size-12 place-items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
									<div
										class="size-5 animate-spin rounded-full border-2 border-[hsl(var(--muted-foreground))] border-t-transparent"
										aria-hidden="true"
									></div>
								</div>
								<h3 class="mt-4 text-sm font-semibold text-[hsl(var(--foreground))]">Cargando recetas</h3>
								<p class="mt-1 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">
									Estamos esperando al backend para mostrar la biblioteca.
								</p>
							</div>
							{:else if data.recipes.length === 0}
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
						{:else if filteredRecipes().length === 0}
							<div class="grid place-items-center px-8 py-16 text-center">
								<div class="grid size-12 place-items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
									<Search class="size-5 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
								</div>
								<h3 class="mt-4 text-sm font-semibold text-[hsl(var(--foreground))]">No hay coincidencias</h3>
								<p class="mt-1 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">
									Prueba a limpiar filtros o a cargar más recetas para ampliar la búsqueda.
								</p>
								<div class="mt-4 flex flex-wrap justify-center gap-2">
									<Button type="button" variant="secondary" onclick={clearRecipeFilters}>
										<X class="size-4" aria-hidden="true" />
										Limpiar filtros
									</Button>
									{#if recipesPage < recipesTotalPages}
										<Button
											type="button"
											variant="secondary"
											onclick={() => loadMoreRecipes(authSession)}
											disabled={recipesLoadingMore}
										>
											<LayoutList class="size-4" aria-hidden="true" />
											Cargar más
										</Button>
									{/if}
								</div>
							</div>
						{:else}
								<div data-testid="recipe-list">
									<div class={recipeViewMode === 'list' ? 'overflow-x-auto' : 'hidden'}>
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
											{#each filteredRecipes() as recipe (recipe.id)}
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
																aria-label="Ver"
																title="Ver"
																onclick={() => openViewRecipeModal(recipe)}
																data-testid={`recipe-view-button-${recipe.id}`}
															>
																<Eye class="size-4" aria-hidden="true" />
															</Button>
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

									<div class={recipeViewMode === 'block' ? 'divide-y divide-[hsl(var(--border))]' : 'hidden'}>
									{#each filteredRecipes() as recipe (recipe.id)}
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

											<div class="grid grid-cols-2 gap-2">
												<Button
													variant="secondary"
													size="sm"
													type="button"
													onclick={() => openViewRecipeModal(recipe)}
												>
													<Eye class="size-4" aria-hidden="true" />
													Ver
												</Button>
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
								<div class="border-t border-[hsl(var(--border))] px-4 py-4 text-center" bind:this={recipesScrollSentinel}>
									{#if recipesLoadingMore}
										<div class="inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
											<span
												class="size-4 animate-spin rounded-full border-2 border-[hsl(var(--muted-foreground))] border-t-transparent"
												aria-hidden="true"
											></span>
											Cargando más recetas
										</div>
									{:else if recipesPage < recipesTotalPages}
										<Button
											type="button"
											variant="secondary"
											size="sm"
											onclick={() => loadMoreRecipes(authSession)}
										>
											<LayoutList class="size-4" aria-hidden="true" />
											Cargar más
										</Button>
									{:else}
										<p class="text-xs text-[hsl(var(--muted-foreground))]">
											{data.recipes.length} de {recipesTotalElements} recetas cargadas
										</p>
									{/if}
											</div>
										</div>
									{/if}
									</section>
								</section>
								{/if}
							{/if}
							</main>
					</div>

			{#if sessionExpiredDialogOpen}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--background)/0.72)] px-4 backdrop-blur-sm"
			role="presentation"
		>
			<div
				class="w-full max-w-md rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby="session-expired-title"
				data-testid="session-expired-dialog"
			>
				<div class="flex items-start gap-3">
					<span class="grid size-10 shrink-0 place-items-center rounded-full bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]">
						<CircleAlert class="size-5" aria-hidden="true" />
					</span>
					<div class="min-w-0">
						<h2 id="session-expired-title" class="text-lg font-semibold text-[hsl(var(--foreground))]">
							Sesion caducada
						</h2>
						<p class="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
							{sessionExpiredDialogMessage}
						</p>
					</div>
				</div>
				<div class="mt-6 flex justify-end">
					<Button type="button" onclick={confirmSessionExpired} data-testid="session-expired-confirm">
						Aceptar
					</Button>
				</div>
			</div>
		</div>
	{/if}

	{#if modalMode === 'product-create'}
		<div class="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/30 p-3 backdrop-blur-sm sm:p-4" role="presentation">
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
					enctype="multipart/form-data"
					class="space-y-6 p-5"
					onsubmit={submitCreateProduct}
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

								<label class="block min-w-0">
									<span class={fieldLabelClass}>Precio por defecto</span>
									<input
										class={inputClass}
										name="defaultPrice"
										type="number"
										min="0"
										step="any"
										inputmode="decimal"
										bind:value={createDraft.defaultPrice}
										data-testid="create-default-price"
									/>
									{#if createErrors().defaultPrice}
										<small class={fieldErrorClass}>{createErrors().defaultPrice}</small>
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

							<section class="space-y-3 border-t border-[hsl(var(--border))] pt-5">
							<div><h3 class="text-sm font-semibold">Supermercados</h3><p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Selecciona dónde está disponible el producto.</p></div>
							{#if data.supermarkets.length === 0}<p class="text-sm text-[hsl(var(--muted-foreground))]">No hay supermercados configurados.</p>{:else}<div class="grid gap-2 sm:grid-cols-2">{#each data.supermarkets as supermarket (supermarket.id)}<label class="flex items-center gap-2 rounded-md border p-3 text-sm"><input type="checkbox" value={String(supermarket.id)} bind:group={createDraft.supermarketIds} /><span class="min-w-0 truncate">{supermarket.name}</span></label>{/each}</div>{/if}
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
		<div class="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/30 p-3 backdrop-blur-sm sm:p-4" role="presentation">
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
					enctype="multipart/form-data"
					class="space-y-6 p-5"
					onsubmit={submitUpdateProduct}
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

								<label class="block min-w-0">
									<span class={fieldLabelClass}>Precio por defecto</span>
									<input
										class={inputClass}
										name="defaultPrice"
										type="number"
										min="0"
										step="any"
										inputmode="decimal"
										bind:value={editDraft.defaultPrice}
										data-testid="edit-default-price"
									/>
									{#if updateErrors().defaultPrice}
										<small class={fieldErrorClass}>{updateErrors().defaultPrice}</small>
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
							<div class="space-y-3 border-b border-[hsl(var(--border))] pb-5">
								<div><h3 class="text-sm font-semibold">Supermercados</h3><p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Actualiza los comercios donde está disponible.</p></div>
								{#if data.supermarkets.length === 0}<p class="text-sm text-[hsl(var(--muted-foreground))]">No hay supermercados configurados.</p>{:else}<div class="grid gap-2 sm:grid-cols-2">{#each data.supermarkets as supermarket (supermarket.id)}<label class="flex items-center gap-2 rounded-md border p-3 text-sm"><input type="checkbox" value={String(supermarket.id)} bind:group={editDraft.supermarketIds} /><span class="min-w-0 truncate">{supermarket.name}</span></label>{/each}</div>{/if}
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
			{:else if currentEditingProduct()?.photo && !productPhotoIsBroken(currentEditingProduct()!.photo)}
				{@const editingProduct = currentEditingProduct()}
				{@const editingPhoto = editingProduct!.photo!}
				<div class="flex items-start gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.25)] p-3">
					<img
						src={productPhotoUrl(editingPhoto)}
						alt={`Imagen actual de ${editingProduct!.name}`}
						class="size-24 shrink-0 rounded-md border border-[hsl(var(--border))] object-cover"
						loading="lazy"
						decoding="async"
						onload={() => clearProductPhotoBroken(editingPhoto)}
						onerror={() => markProductPhotoBroken(editingPhoto)}
					/>
					<div class="min-w-0">
						<p class="text-sm font-medium">{editingProduct!.name}</p>
						<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
							Imagen temporal firmada. Se mantendra si no subes una nueva.
						</p>
					</div>
				</div>
			{:else if currentEditingProduct()?.photo}
				{@const editingProduct = currentEditingProduct()}
				<div class="flex items-start gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.25)] p-3">
					<span class="grid size-24 shrink-0 place-items-center rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))]">
						<Package class="size-5" aria-hidden="true" />
					</span>
					<div class="min-w-0">
						<p class="text-sm font-medium">{editingProduct!.name}</p>
						<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
							La imagen temporal no se pudo cargar. Se mantendra si no subes una nueva.
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
		<div class="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/30 p-3 backdrop-blur-sm sm:p-4" role="presentation">
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

					<form onsubmit={submitDeleteProduct}>
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

	{#if modalMode === 'stock'}
		<div class="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/30 p-3 backdrop-blur-sm sm:p-4" role="presentation">
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
							{editingStockEntry ? 'Editar stock' : stockProduct ? 'Añadir stock' : 'Nuevo stock'}
						</h2>
						<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
							{editingStockEntry
								? `Actualiza la entrada de stock para ${stockProduct?.name ?? 'este producto'}.`
								: stockProduct
									? `Registra una nueva entrada para ${stockProduct.name}.`
									: 'Busca un producto para registrar una nueva entrada de stock.'}
						</p>
					</div>
					<Button variant="ghost" size="icon" type="button" onclick={closeModal} aria-label="Cerrar modal">
						<X class="size-4" aria-hidden="true" />
					</Button>
				</div>

				<form onsubmit={submitCreateStock} class="space-y-6 p-5" data-testid="stock-form">
					<fieldset class="space-y-6" disabled={!data.backendAvailable}>
						<input type="hidden" name="productId" value={stockDraft.productId} />

						{#if editingStockEntry}
							<section class="space-y-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.16)] p-4">
								<p class="text-sm font-medium text-[hsl(var(--foreground))]">{stockProduct?.name ?? 'Producto seleccionado'}</p>
								<p class="text-xs text-[hsl(var(--muted-foreground))]">Producto #{stockProduct?.id ?? editingStockEntry.productId}</p>
							</section>
						{:else}
							<StockProductSearch
								authorization={authSession ? authorizationHeader(authSession) : ''}
								selectedProduct={stockProduct}
								onSelect={(product) => {
									stockProduct = product;
									stockDraft = {
										...stockDraft,
										productId: String(product.id),
										price: stockDraft.price || (product.defaultPrice === null ? '' : String(product.defaultPrice))
									};
								}}
								onClear={() => {
									stockProduct = null;
									stockDraft = {
										...stockDraft,
										productId: '',
										price: ''
									};
								}}
							/>
						{/if}

						<section class="space-y-4">
							<div>
								<h3 class="text-sm font-semibold text-[hsl(var(--foreground))]">Cantidad</h3>
								<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
									Introduce cantidad, precio unitario y, si aplica, la fecha de caducidad.
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

								<label class="block min-w-0 md:col-span-2">
									<span class={fieldLabelClass}>Precio unitario</span>
									<input
										class={inputClass}
										name="price"
										inputmode="decimal"
										step="any"
										bind:value={stockDraft.price}
										data-testid="stock-price"
									/>
									{#if stockErrors().price}
										<small class={fieldErrorClass}>{stockErrors().price}</small>
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
							{editingStockEntry ? 'Guardar cambios' : 'Guardar stock'}
						</Button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if modalMode === 'stock-delete' && deletingStockEntry}
		<div class="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/30 p-3 backdrop-blur-sm sm:p-4" role="presentation">
			<div
				class="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby="delete-stock-title"
				data-testid="delete-stock-modal"
			>
				<div class="flex items-start justify-between gap-4 border-b border-[hsl(var(--border))] p-5">
					<div class="min-w-0">
						<h2 id="delete-stock-title" class="text-lg font-semibold text-[hsl(var(--foreground))]">
							Borrar stock
						</h2>
						<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
							Eliminarás la entrada de <strong class="break-words">{deletingStockEntry.productName}</strong>
							con cantidad {formatNumber(deletingStockEntry.quantity)}.
						</p>
					</div>
					<Button variant="ghost" size="icon" type="button" onclick={closeModal} aria-label="Cerrar modal">
						<X class="size-4" aria-hidden="true" />
					</Button>
				</div>

				<form onsubmit={submitDeleteStock}>
					<div class="space-y-3 p-5 text-sm text-[hsl(var(--muted-foreground))]">
						<p>Esta acción eliminará la entrada del inventario.</p>
						<p>Si la cantidad llega a cero, la entrada desaparecerá por completo.</p>
					</div>
					<div class="flex flex-col-reverse gap-2 border-t border-[hsl(var(--border))] p-5 sm:flex-row sm:justify-end">
						<Button variant="secondary" type="button" onclick={closeModal}>Cancelar</Button>
						<Button type="submit" variant="danger" disabled={!data.backendAvailable}>
							<Trash2 class="size-4" aria-hidden="true" />
							Borrar stock
						</Button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if modalMode === 'recipe-create'}
		<div class="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/30 p-3 backdrop-blur-sm sm:p-4" role="presentation">
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

				<form onsubmit={submitCreateRecipe} class="space-y-6 p-5" data-testid="create-recipe-form">
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
											<input type="hidden" name="ingredientProductId" value={ingredient.productId} />
											<Button
												type="button"
												variant="secondary"
												class="w-full justify-between"
												onclick={() =>
													openProductPicker({
														type: 'recipe-create',
														productIndex: index,
														selectedProductId: ingredient.productId
													})
												}
												data-testid={`create-recipe-product-${index}`}
											>
												<span class="min-w-0 truncate text-left">{productLabel(ingredient.productId)}</span>
												<Search class="size-4 shrink-0" aria-hidden="true" />
											</Button>
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
		<div class="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/30 p-3 backdrop-blur-sm sm:p-4" role="presentation">
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

				<form onsubmit={submitUpdateRecipe} class="space-y-6 p-5" data-testid="edit-recipe-form">
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
											<input type="hidden" name="ingredientProductId" value={ingredient.productId} />
											<Button
												type="button"
												variant="secondary"
												class="w-full justify-between"
												onclick={() =>
													openProductPicker({
														type: 'recipe-edit',
														productIndex: index,
														selectedProductId: ingredient.productId
													})
												}
												data-testid={`edit-recipe-product-${index}`}
											>
												<span class="min-w-0 truncate text-left">{productLabel(ingredient.productId)}</span>
												<Search class="size-4 shrink-0" aria-hidden="true" />
											</Button>
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
		<div class="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/30 p-3 backdrop-blur-sm sm:p-4" role="presentation">
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

					<form onsubmit={submitDeleteRecipe}>
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
		<div class="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/30 p-3 backdrop-blur-sm sm:p-4" role="presentation">
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

				<form onsubmit={submitCreateDerivedProduct} class="space-y-6 p-5" data-testid="derive-recipe-form">
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

	{#if modalMode === 'day-part'}
		<div class="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/30 p-3 backdrop-blur-sm sm:p-4" role="presentation">
			<div
				class="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby="day-part-title"
				data-testid="day-part-modal"
			>
				<div class="flex items-start justify-between gap-4 border-b border-[hsl(var(--border))] p-5">
					<div class="min-w-0">
						<h2 id="day-part-title" class="text-lg font-semibold text-[hsl(var(--foreground))]">
							{editingDayPartId === null ? 'Nueva parte del dia' : 'Editar parte del dia'}
						</h2>
						<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
							Define una seccion reutilizable para seleccionarla despues en los menus diarios.
						</p>
					</div>
					<Button variant="ghost" size="icon" type="button" onclick={closeModal} aria-label="Cerrar modal">
						<X class="size-4" aria-hidden="true" />
					</Button>
				</div>

				<form class="space-y-6 p-5" onsubmit={submitDayPart} data-testid="day-part-form">
					<fieldset class="space-y-4" disabled={!data.backendAvailable}>
						<label class="block min-w-0">
							<span class={fieldLabelClass}>Nombre</span>
							<input class={inputClass} name="name" bind:value={dayPartDraft.name} data-testid="day-part-name" />
							{#if dayPartErrors().name}
								<small class={fieldErrorClass}>{dayPartErrors().name}</small>
							{/if}
						</label>

						<label class="block min-w-0">
							<span class={fieldLabelClass}>Descripcion</span>
							<textarea
								class={textareaClass}
								name="description"
								bind:value={dayPartDraft.description}
								data-testid="day-part-description"
							></textarea>
							{#if dayPartErrors().description}
								<small class={fieldErrorClass}>{dayPartErrors().description}</small>
							{/if}
						</label>

						<label class="block min-w-0">
							<span class={fieldLabelClass}>Orden</span>
							<input
								class={inputClass}
								name="sortOrder"
								inputmode="numeric"
								bind:value={dayPartDraft.sortOrder}
								data-testid="day-part-sort"
							/>
							{#if dayPartErrors().sortOrder}
								<small class={fieldErrorClass}>{dayPartErrors().sortOrder}</small>
							{/if}
						</label>
					</fieldset>

					<div class="flex flex-col-reverse gap-2 border-t border-[hsl(var(--border))] pt-5 sm:flex-row sm:justify-end">
						<Button variant="secondary" type="button" onclick={closeModal}>Cancelar</Button>
						<Button type="submit" disabled={!data.backendAvailable}>
							<Save class="size-4" aria-hidden="true" />
							{editingDayPartId === null ? 'Guardar parte' : 'Actualizar parte'}
						</Button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if modalMode === 'week-create'}
		<div class="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/30 p-3 backdrop-blur-sm sm:p-4" role="presentation">
			<div
				class="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby="week-create-title"
				data-testid="week-create-modal"
			>
				<div class="flex items-start justify-between gap-4 border-b border-[hsl(var(--border))] p-5">
					<div class="min-w-0">
						<h2 id="week-create-title" class="text-lg font-semibold text-[hsl(var(--foreground))]">
							Crear planificación
						</h2>
						<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
							Elige un rango de hasta 16 dias incluidos para empezar a planificar menus diarios.
						</p>
					</div>
					<Button variant="ghost" size="icon" type="button" onclick={closeModal} aria-label="Cerrar modal">
						<X class="size-4" aria-hidden="true" />
					</Button>
				</div>

				<form class="space-y-6 p-5" onsubmit={submitCreateWeekMenu} data-testid="week-create-form">
					<fieldset class="space-y-6" disabled={!data.backendAvailable}>
						<section class="space-y-4">
							<div>
								<h3 class="text-sm font-semibold text-[hsl(var(--foreground))]">Rango de fechas</h3>
								<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
									El backend admite planificaciones de hasta 16 días incluidos.
								</p>
							</div>
							<div class="grid gap-4 md:grid-cols-2">
								<label class="block min-w-0">
									<span class={fieldLabelClass}>Fecha de inicio</span>
									<input
										class={inputClass}
										type="date"
										name="startDate"
										bind:value={creatingWeekMenuDraft.startDate}
										data-testid="week-start-date"
									/>
									{#if weekCreateErrors().startDate}
										<small class={fieldErrorClass}>{weekCreateErrors().startDate}</small>
									{/if}
								</label>
								<label class="block min-w-0">
									<span class={fieldLabelClass}>Fecha de fin</span>
								<input
									class={inputClass}
									type="date"
									name="endDate"
									bind:value={creatingWeekMenuDraft.endDate}
									min={creatingWeekMenuDraft.startDate || undefined}
									max={creatingWeekMenuDraft.startDate ? dateInputOffset(creatingWeekMenuDraft.startDate, 15) : undefined}
									data-testid="week-end-date"
								/>
									{#if weekCreateErrors().endDate}
										<small class={fieldErrorClass}>{weekCreateErrors().endDate}</small>
									{/if}
								</label>
							</div>
						</section>
					</fieldset>

					<div class="flex flex-col-reverse gap-2 border-t border-[hsl(var(--border))] pt-5 sm:flex-row sm:justify-end">
						<Button variant="secondary" type="button" onclick={closeModal}>Cancelar</Button>
						<Button type="submit" disabled={!data.backendAvailable}>
							<Save class="size-4" aria-hidden="true" />
							Crear semana
						</Button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if modalMode === 'week-day' && editingWeekDayDate !== null}
		<div class="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/30 p-3 backdrop-blur-sm sm:p-4" role="presentation">
			<div
				class="max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby="week-day-title"
				data-testid="week-day-modal"
			>
				<div class="flex items-start justify-between gap-4 border-b border-[hsl(var(--border))] p-5">
					<div class="min-w-0">
						<h2 id="week-day-title" class="text-lg font-semibold text-[hsl(var(--foreground))]">
							{editingWeekDayDate ? 'Editar menu diario' : 'Añadir menu diario'}
						</h2>
						<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
							Ordena secciones y productos para un día concreto de la planificación.
						</p>
						<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
							Los menus guardados se pueden reabrir y ajustar tantas veces como haga falta.
						</p>
					</div>
					<div class="flex shrink-0 items-center gap-2">
						<Button
							type="submit"
							form="week-day-form"
							size="sm"
							disabled={!data.backendAvailable || data.products.length === 0 || data.proposedWeekMenuDayParts.length === 0}
						>
							<Save class="size-4" aria-hidden="true" />
							Guardar
						</Button>
						<Button variant="ghost" size="icon" type="button" onclick={closeModal} aria-label="Cerrar modal">
							<X class="size-4" aria-hidden="true" />
						</Button>
					</div>
				</div>

				<form id="week-day-form" class="space-y-6 p-5" onsubmit={submitUpsertWeekDay} data-testid="week-day-form">
					<fieldset class="space-y-6" disabled={!data.backendAvailable}>
						<section class="space-y-4">
							<div>
								<h3 class="text-sm font-semibold text-[hsl(var(--foreground))]">Dia</h3>
								<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
									Elige una fecha dentro del rango de la semana activa.
								</p>
							</div>
							<label class="block min-w-0">
								<span class={fieldLabelClass}>Fecha</span>
								<input
									class={inputClass}
									type="date"
									name="date"
									bind:value={weekDayDraft.date}
									min={data.proposedWeekMenu?.startDate || undefined}
									max={data.proposedWeekMenu?.endDate || undefined}
									data-testid="week-day-date"
								/>
								{#if weekDayErrors().date}
									<small class={fieldErrorClass}>{weekDayErrors().date}</small>
								{/if}
							</label>
						</section>

						<section class="space-y-4">
							<div>
								<h3 class="text-sm font-semibold text-[hsl(var(--foreground))]">Secciones</h3>
								<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
									Cada seccion usa una parte del dia configurada y agrupa uno o varios productos.
								</p>
							</div>

							{#if data.proposedWeekMenuDayPartsLoaded && data.proposedWeekMenuDayParts.length === 0}
								<p class="rounded-md border border-[hsl(var(--destructive)/0.2)] bg-[hsl(var(--destructive)/0.06)] px-3 py-2 text-sm text-[hsl(var(--destructive))]">
									No hay partes del dia configuradas en el backend.
								</p>
							{/if}

							{#if weekDayErrors().sections}
								<p class="rounded-md border border-[hsl(var(--destructive)/0.2)] bg-[hsl(var(--destructive)/0.06)] px-3 py-2 text-sm text-[hsl(var(--destructive))]">
									{weekDayErrors().sections}
								</p>
							{/if}

							<div class="space-y-4">
								{#each weekDayDraft.sections as section, sectionIndex}
									<div class="space-y-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.25)] p-4">
										<div class="flex flex-wrap items-end gap-3">
											<label class="block min-w-0 flex-1">
												<select
													class={inputClass}
													name="dayPartId"
													bind:value={section.dayPartId}
													data-testid={`week-section-day-part-${sectionIndex}`}
												>
													<option value="">Selecciona una parte del dia</option>
													{#each data.proposedWeekMenuDayParts as dayPart}
														<option value={String(dayPart.id)}>{dayPart.name}</option>
													{/each}
												</select>
												{#if weekDayErrors().sectionErrors?.[sectionIndex]?.dayPartId}
													<small class={fieldErrorClass}>{weekDayErrors().sectionErrors?.[sectionIndex]?.dayPartId}</small>
												{/if}
											</label>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												disabled={weekDayDraft.sections.length <= 1}
												onclick={() => removeWeekDaySection(sectionIndex)}
												class="shrink-0"
											>
												<Trash2 class="size-4" aria-hidden="true" />
												Eliminar seccion
											</Button>
										</div>

										<div class="space-y-3">
											<div class="flex flex-wrap items-center justify-between gap-3">
												<div>
													<h5 class="text-sm font-medium text-[hsl(var(--foreground))]">Productos</h5>
													<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
														Las unidades y los gramos son opcionales. Si los dejas vacios, el backend aplicara sus valores por defecto.
													</p>
												</div>
												<Button type="button" variant="secondary" size="sm" onclick={() => addWeekDayProduct(sectionIndex)}>
													<Plus class="size-4" aria-hidden="true" />
													Añadir producto
												</Button>
											</div>

											{#if weekDayErrors().sectionErrors?.[sectionIndex]?.products}
												<p class="rounded-md border border-[hsl(var(--destructive)/0.2)] bg-[hsl(var(--destructive)/0.06)] px-3 py-2 text-sm text-[hsl(var(--destructive))]">
													{weekDayErrors().sectionErrors?.[sectionIndex]?.products}
												</p>
											{/if}

											<div class="space-y-3">
												{#each section.products as product, productIndex}
													<div class="grid gap-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 lg:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,0.55fr))_auto]">
														<label class="block min-w-0">
															<span class={fieldLabelClass}>Producto</span>
															<input type="hidden" name="productId" value={product.productId} />
															<Button
																type="button"
																variant="secondary"
																class="w-full justify-between"
																onclick={() =>
																	openProductPicker({
																		type: 'week-day',
																		sectionIndex,
																		productIndex,
																		selectedProductId: product.productId
																	})
																}
																data-testid={`week-product-id-${sectionIndex}-${productIndex}`}
															>
																<span class="min-w-0 truncate text-left">{productLabel(product.productId)}</span>
																<Search class="size-4 shrink-0" aria-hidden="true" />
															</Button>
															{#if weekDayErrors().sectionErrors?.[sectionIndex]?.productErrors?.[productIndex]?.productId}
																<small class={fieldErrorClass}>
																	{weekDayErrors().sectionErrors?.[sectionIndex]?.productErrors?.[productIndex]?.productId}
																</small>
															{/if}
														</label>

														<label class="block min-w-0">
															<span class={fieldLabelClass}>Unidades</span>
															<input
																class={inputClass}
																name="units"
																inputmode="decimal"
																step="any"
																bind:value={product.units}
																data-testid={`week-product-units-${sectionIndex}-${productIndex}`}
															/>
															{#if weekDayErrors().sectionErrors?.[sectionIndex]?.productErrors?.[productIndex]?.units}
																<small class={fieldErrorClass}>
																	{weekDayErrors().sectionErrors?.[sectionIndex]?.productErrors?.[productIndex]?.units}
																</small>
															{/if}
														</label>

														<label class="block min-w-0">
															<span class={fieldLabelClass}>Gramos</span>
															<input
																class={inputClass}
																name="grams"
																inputmode="decimal"
																step="any"
																bind:value={product.grams}
																data-testid={`week-product-grams-${sectionIndex}-${productIndex}`}
															/>
															{#if weekDayErrors().sectionErrors?.[sectionIndex]?.productErrors?.[productIndex]?.grams}
																<small class={fieldErrorClass}>
																	{weekDayErrors().sectionErrors?.[sectionIndex]?.productErrors?.[productIndex]?.grams}
																</small>
															{/if}
														</label>

														<label class="block min-w-0">
															<span class={fieldLabelClass}>Orden</span>
															<input
																class={inputClass}
																name="productSortOrder"
																inputmode="numeric"
																bind:value={product.sortOrder}
																data-testid={`week-product-sort-${sectionIndex}-${productIndex}`}
															/>
															{#if weekDayErrors().sectionErrors?.[sectionIndex]?.productErrors?.[productIndex]?.sortOrder}
																<small class={fieldErrorClass}>
																	{weekDayErrors().sectionErrors?.[sectionIndex]?.productErrors?.[productIndex]?.sortOrder}
																</small>
															{/if}
														</label>

														<div class="flex items-end">
															<Button
																type="button"
																variant="ghost"
																size="icon"
																disabled={section.products.length <= 1}
																onclick={() => removeWeekDayProduct(sectionIndex, productIndex)}
																aria-label="Eliminar producto"
															>
																<Trash2 class="size-4" aria-hidden="true" />
															</Button>
														</div>
													</div>
												{/each}
											</div>
										</div>
									</div>
								{/each}
							</div>

							<div class="flex justify-start">
								<Button type="button" variant="secondary" onclick={addWeekDaySection}>
									<Plus class="size-4" aria-hidden="true" />
									Añadir seccion
								</Button>
							</div>
						</section>
					</fieldset>

					<div class="flex flex-col-reverse gap-2 border-t border-[hsl(var(--border))] pt-5 sm:flex-row sm:justify-end">
						<Button variant="secondary" type="button" onclick={closeModal}>Cancelar</Button>
						<Button
							type="submit"
							disabled={!data.backendAvailable || data.products.length === 0 || data.proposedWeekMenuDayParts.length === 0}
						>
							<Save class="size-4" aria-hidden="true" />
							Guardar menu
						</Button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if modalMode === 'week-publish' && authSession && activeProposedWeekMenuId}
		<div class="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/30 p-3 backdrop-blur-sm sm:p-4" role="presentation">
			<div class="max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl" role="dialog" aria-modal="true" aria-labelledby="week-publish-title" data-testid="week-publish-modal">
				<div class="flex items-start justify-between gap-4 border-b border-[hsl(var(--border))] p-5">
					<div class="min-w-0">
						<h2 id="week-publish-title" class="text-lg font-semibold text-[hsl(var(--foreground))]">Establecer semana</h2>
						<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Elige pagador y personas consumidoras. El stock se asignará automáticamente.</p>
					</div>
					<Button variant="ghost" size="icon" type="button" onclick={closeModal} aria-label="Cerrar modal">
						<X class="size-4" aria-hidden="true" />
					</Button>
				</div>
				<form class="space-y-6 p-5" onsubmit={submitPublishWeekMenu} data-testid="week-publish-form">
					<fieldset class="space-y-6" disabled={!data.backendAvailable}>
						<section class="grid gap-4 md:grid-cols-2">
							<label class="block min-w-0">
								<span class={fieldLabelClass}>Pagador</span>
								<select class={inputClass} bind:value={publishPayerUserId} data-testid="week-publish-payer">
									<option value="" disabled>Selecciona un pagador</option>
									{#if !data.usersLoaded}
										<option value={publishPayerUserId} disabled>Cargando personas…</option>
									{/if}
									{#each data.users as user}
										<option value={String(user.id)}>{user.username}</option>
									{/each}
								</select>
							</label>
							<div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.25)] p-4">
								<h3 class="text-sm font-semibold">Consumo compartido</h3>
								<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
									Selecciona las personas que consumirán la semana. Cada una contará para la asignación automática del stock.
								</p>
							</div>
						</section>
						<section class="space-y-3 rounded-lg border p-4">
							<div class="flex flex-wrap items-center justify-between gap-2">
								<div>
									<h3 class="text-sm font-semibold">Personas consumidoras</h3>
									<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Por defecto se incluye tu usuario actual.</p>
								</div>
								<span class="rounded-md bg-[hsl(var(--secondary))] px-2 py-1 text-xs text-[hsl(var(--muted-foreground))]">
									{publishPersonIds.length} seleccionadas
								</span>
							</div>
							{#if data.usersLoaded}
								<div class="grid gap-2 sm:grid-cols-2">
									{#each data.users as user (user.id)}
										<label class="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
											<input
												type="checkbox"
												value={String(user.id)}
												bind:group={publishPersonIds}
												data-testid={`week-publish-person-${user.id}`}
											/>
											<span class="min-w-0 truncate">{user.username}</span>
										</label>
									{/each}
								</div>
							{:else}
								<p class="text-sm text-[hsl(var(--muted-foreground))]">Cargando personas…</p>
							{/if}
						</section>
					</fieldset>
					<div class="flex flex-col-reverse gap-2 border-t border-[hsl(var(--border))] pt-5 sm:flex-row sm:justify-end">
						<Button variant="secondary" type="button" onclick={closeModal}>Cancelar</Button>
						<Button type="submit" disabled={!data.backendAvailable}>
							<CircleCheck class="size-4" aria-hidden="true" />
							Establecer semana
						</Button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if modalMode === 'week-stock' && data.proposedWeekMenu}
		{@const activeMenu = data.proposedWeekMenu}
		<div class="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/30 p-3 backdrop-blur-sm sm:p-4" role="presentation" onclick={(event) => event.currentTarget === event.target && closeModal()}>
			<div class="w-full max-w-5xl rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl" role="dialog" aria-modal="true" aria-labelledby="week-stock-title" data-testid="week-stock-summary" tabindex="-1">
				<div class="flex items-start justify-between gap-4 border-b border-[hsl(var(--border))] p-5">
					<div class="min-w-0">
						<h2 id="week-stock-title" class="text-lg font-semibold text-[hsl(var(--foreground))]">Stock</h2>
						<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
							{weekDateRangeLabel(activeMenu.startDate, activeMenu.endDate)} · {planningSummary.requirements.length} productos
						</p>
					</div>
					<Button variant="ghost" size="icon" type="button" onclick={closeModal} aria-label="Cerrar stock">
						<X class="size-4" aria-hidden="true" />
					</Button>
				</div>
				<div class="max-h-[calc(100vh-12rem)] overflow-y-auto">
					{#if planningSummary.requirements.length === 0}
						<div class="p-8 text-center">
							<div class="mx-auto grid size-10 place-items-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
								<Package class="size-5 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
							</div>
							<h4 class="mt-3 text-sm font-semibold text-[hsl(var(--foreground))]">Aun no hay productos planificados</h4>
							<p class="mx-auto mt-1 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">
								Añade menús diarios para calcular cuantas unidades de cada producto se necesitaran.
							</p>
						</div>
					{:else}
						<div class="hidden overflow-x-auto md:block">
							<table class="w-full table-fixed text-sm">
								<colgroup>
									<col class="w-[34%]" />
									<col class="w-[14%]" />
									<col class="w-[14%]" />
									<col class="w-[14%]" />
									<col class="w-[24%]" />
								</colgroup>
								<thead class="bg-[hsl(var(--secondary))] text-xs text-[hsl(var(--muted-foreground))]">
									<tr class="border-b border-[hsl(var(--border))]">
										<th class="px-4 py-2.5 text-left font-medium">Producto</th>
										<th class="px-3 py-2.5 text-right font-medium">Necesarias</th>
										<th class="px-3 py-2.5 text-right font-medium">Disponibles</th>
										<th class="px-3 py-2.5 text-right font-medium">Faltan</th>
										<th class="px-4 py-2.5 text-right font-medium">Coste estimado</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-[hsl(var(--border))]">
									{#each planningSummary.requirements as requirement (requirement.productId)}
										<tr class={`transition-colors hover:bg-[hsl(var(--secondary)/0.55)] ${requirement.missingUnits > 0 ? 'bg-[hsl(var(--destructive)/0.04)]' : ''}`} data-testid={`week-stock-row-${requirement.productId}`}>
											<td class="px-4 py-3 align-top">
												<div class="min-w-0">
													<p class="truncate font-medium text-[hsl(var(--foreground))]">{requirement.productName}</p>
													<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Producto #{requirement.productId}</p>
												</div>
											</td>
											<td class="px-3 py-3 text-right align-top tabular-nums">{formatNumber(requirement.requiredUnits)}</td>
											<td class="px-3 py-3 text-right align-top tabular-nums">{formatNumber(requirement.availableUnits)}</td>
											<td class="px-3 py-3 text-right align-top tabular-nums">{formatNumber(requirement.missingUnits)}</td>
											<td class="px-4 py-3 text-right align-top tabular-nums">{formatCurrency(requirement.estimatedCost)}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
						<div class="divide-y divide-[hsl(var(--border))] md:hidden">
							{#each planningSummary.requirements as requirement (requirement.productId)}
								<article class={`space-y-4 p-4 ${requirement.missingUnits > 0 ? 'bg-[hsl(var(--destructive)/0.04)]' : ''}`} data-testid={`week-stock-card-${requirement.productId}`}>
									<div class="flex items-start justify-between gap-3">
										<div class="min-w-0">
											<h4 class="truncate text-sm font-semibold text-[hsl(var(--foreground))]">{requirement.productName}</h4>
											<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Producto #{requirement.productId}</p>
										</div>
										<span class={`shrink-0 rounded-md px-2 py-1 text-xs font-medium ${requirement.missingUnits > 0 ? 'bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]' : 'bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))]'}`}>
											{requirement.missingUnits > 0 ? 'Falta stock' : 'Cubierto'}
										</span>
									</div>
									<dl class="grid grid-cols-2 gap-2 text-sm">
										<div class="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2.5">
											<dt class="text-xs text-[hsl(var(--muted-foreground))]">Necesarias</dt>
											<dd class="mt-1 font-medium tabular-nums">{formatNumber(requirement.requiredUnits)}</dd>
										</div>
										<div class="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2.5">
											<dt class="text-xs text-[hsl(var(--muted-foreground))]">Disponibles</dt>
											<dd class="mt-1 font-medium tabular-nums">{formatNumber(requirement.availableUnits)}</dd>
										</div>
										<div class="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2.5">
											<dt class="text-xs text-[hsl(var(--muted-foreground))]">Faltan</dt>
											<dd class="mt-1 font-medium tabular-nums">{formatNumber(requirement.missingUnits)}</dd>
										</div>
										<div class="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2.5">
											<dt class="text-xs text-[hsl(var(--muted-foreground))]">Coste estimado</dt>
											<dd class="mt-1 font-medium tabular-nums">{formatCurrency(requirement.estimatedCost)}</dd>
										</div>
									</dl>
								</article>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	{#if modalMode === 'product-picker' && productPickerTarget && authSession}
		<ProductPickerDialog
			title="Seleccionar producto"
			description="Busca por nombre o usa los filtros avanzados para encontrar el producto exacto."
			authorization={authorizationHeader(authSession)}
			products={data.products}
			selectedProductId={productPickerTarget.selectedProductId}
			onSelect={selectProductFromPicker}
			onClose={closeProductPicker}
		/>
	{/if}

	{#if modalMode === 'product-view' && detailProduct}
		<div class="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-3 backdrop-blur-sm sm:p-4" role="presentation">
			<div
				class="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby="product-view-title"
				data-testid="product-view-modal"
			>
				<div class="flex items-start justify-between gap-4 border-b border-[hsl(var(--border))] p-5">
					<div class="min-w-0">
						<h2 id="product-view-title" class="text-lg font-semibold text-[hsl(var(--foreground))]">
							Ver producto
						</h2>
						<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
							Ficha del producto con el stock y la primera caducidad calculados en el backend.
						</p>
					</div>
					<Button variant="ghost" size="icon" type="button" onclick={closeModal} aria-label="Cerrar modal">
						<X class="size-4" aria-hidden="true" />
					</Button>
				</div>

				<div class="space-y-5 p-5">
					<div class="flex flex-col gap-4 md:flex-row md:items-start">
						{#if detailProduct.photo && !productPhotoIsBroken(detailProduct.photo)}
							{@const detailPhoto = detailProduct.photo}
							<img
								src={productPhotoUrl(detailPhoto)}
								alt={`Imagen de ${detailProduct.name}`}
								class="h-40 w-full rounded-lg border border-[hsl(var(--border))] object-cover md:w-48"
								loading="lazy"
								decoding="async"
								onload={() => clearProductPhotoBroken(detailPhoto)}
								onerror={() => markProductPhotoBroken(detailPhoto)}
							/>
						{:else}
							<div class="grid h-40 w-full place-items-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] md:w-48">
								<Package class="size-8" aria-hidden="true" />
							</div>
						{/if}

						<div class="min-w-0 flex-1 space-y-3">
							<div>
								<div class="flex flex-wrap items-center gap-2">
									<h3 class="text-xl font-semibold text-[hsl(var(--foreground))]">{detailProduct.name}</h3>
									<span class="rounded-md bg-[hsl(var(--secondary))] px-1.5 py-0.5 text-xs text-[hsl(var(--muted-foreground))]">
										#{detailProduct.id}
									</span>
								</div>
								<p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-[hsl(var(--muted-foreground))]">
									{detailProduct.description}
								</p>
							</div>

							<div class="grid gap-3 sm:grid-cols-2">
								<div class="rounded-md border border-[hsl(var(--border))] p-3">
									<p class="text-xs text-[hsl(var(--muted-foreground))]">Precio por defecto</p>
									<p class="mt-1 text-sm font-medium">
										{detailProduct.defaultPrice === null ? 'Sin precio' : formatCurrency(detailProduct.defaultPrice)}
									</p>
								</div>
								<div class="rounded-md border border-[hsl(var(--border))] p-3">
									<p class="text-xs text-[hsl(var(--muted-foreground))]">Stock disponible</p>
									<p class="mt-1 text-lg font-semibold tabular-nums">{formatNumber(productStockQuantity(detailProduct.id))}</p>
								</div>
								<div class="rounded-md border border-[hsl(var(--border))] p-3">
									<p class="text-xs text-[hsl(var(--muted-foreground))]">Caducidad mas cercana</p>
									<p class="mt-1 text-sm font-medium">
										{nearestExpirationForProduct(detailProduct.id)
											? formatDate(nearestExpirationForProduct(detailProduct.id))
											: 'Sin lotes'}
									</p>
								</div>
								<div class="rounded-md border border-[hsl(var(--border))] p-3">
									<p class="text-xs text-[hsl(var(--muted-foreground))]">Lotes</p>
									<p class="mt-1 text-lg font-semibold tabular-nums">{formatNumber(productStockSummary(detailProduct.id)?.batchCount ?? 0)}</p>
								</div>
							</div>
						</div>
					</div>

					<section class="grid gap-3 sm:grid-cols-2">
						<div class="rounded-md border border-[hsl(var(--border))] p-3">
							<p class="text-xs text-[hsl(var(--muted-foreground))]">Calorias</p>
							<p class="mt-1 text-lg font-semibold tabular-nums">{formatNumber(detailProduct.nutritionalValues.calories)}</p>
						</div>
						<div class="rounded-md border border-[hsl(var(--border))] p-3">
							<p class="text-xs text-[hsl(var(--muted-foreground))]">Carbohidratos</p>
							<p class="mt-1 text-lg font-semibold tabular-nums">{formatNumber(detailProduct.nutritionalValues.carbohydrates)}g</p>
						</div>
						<div class="rounded-md border border-[hsl(var(--border))] p-3">
							<p class="text-xs text-[hsl(var(--muted-foreground))]">Proteinas</p>
							<p class="mt-1 text-lg font-semibold tabular-nums">{formatNumber(detailProduct.nutritionalValues.proteins)}g</p>
						</div>
						<div class="rounded-md border border-[hsl(var(--border))] p-3">
							<p class="text-xs text-[hsl(var(--muted-foreground))]">Grasas</p>
							<p class="mt-1 text-lg font-semibold tabular-nums">{formatNumber(detailProduct.nutritionalValues.fats)}g</p>
						</div>
					</section>

					<div class="flex flex-col-reverse gap-2 border-t border-[hsl(var(--border))] pt-5 sm:flex-row sm:justify-end">
						<Button variant="secondary" type="button" onclick={closeModal}>Cerrar</Button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if modalMode === 'recipe-view' && detailRecipe}
		<div class="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-3 backdrop-blur-sm sm:p-4" role="presentation">
			<div
				class="max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby="recipe-view-title"
				data-testid="recipe-view-modal"
			>
				<div class="flex items-start justify-between gap-4 border-b border-[hsl(var(--border))] p-5">
					<div class="min-w-0">
						<h2 id="recipe-view-title" class="text-lg font-semibold text-[hsl(var(--foreground))]">
							Ver receta
						</h2>
						<p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
							Consulta la receta, sus ingredientes y el producto derivado sin editar nada.
						</p>
					</div>
					<Button variant="ghost" size="icon" type="button" onclick={closeModal} aria-label="Cerrar modal">
						<X class="size-4" aria-hidden="true" />
					</Button>
				</div>

				<div class="space-y-5 p-5">
					<div class="flex flex-col gap-4 md:flex-row md:items-start">
						{#if detailRecipe.photo && !productPhotoIsBroken(detailRecipe.photo)}
							{@const detailRecipePhoto = detailRecipe.photo}
							<img
								src={productPhotoUrl(detailRecipePhoto)}
								alt={`Imagen de ${detailRecipe.name}`}
								class="h-40 w-full rounded-lg border border-[hsl(var(--border))] object-cover md:w-48"
								loading="lazy"
								decoding="async"
								onload={() => clearProductPhotoBroken(detailRecipePhoto)}
								onerror={() => markProductPhotoBroken(detailRecipePhoto)}
							/>
						{:else}
							<div class="grid h-40 w-full place-items-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] md:w-48">
								<BookOpen class="size-8" aria-hidden="true" />
							</div>
						{/if}

						<div class="min-w-0 flex-1 space-y-3">
							<div>
								<div class="flex flex-wrap items-center gap-2">
									<h3 class="text-xl font-semibold text-[hsl(var(--foreground))]">{detailRecipe.name}</h3>
									<span class="rounded-md bg-[hsl(var(--secondary))] px-1.5 py-0.5 text-xs text-[hsl(var(--muted-foreground))]">
										#{detailRecipe.id}
									</span>
								</div>
								<p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-[hsl(var(--muted-foreground))]">
									{detailRecipe.description}
								</p>
							</div>

							<div class="grid gap-3 sm:grid-cols-3">
								<div class="rounded-md border border-[hsl(var(--border))] p-3">
									<p class="text-xs text-[hsl(var(--muted-foreground))]">Ingredientes</p>
									<p class="mt-1 text-lg font-semibold tabular-nums">{detailRecipe.ingredients.length}</p>
								</div>
								<div class="rounded-md border border-[hsl(var(--border))] p-3">
									<p class="text-xs text-[hsl(var(--muted-foreground))]">Calorias</p>
									<p class="mt-1 text-lg font-semibold tabular-nums">{formatNumber(detailRecipe.nutritionalValues.calories)}</p>
								</div>
								<div class="rounded-md border border-[hsl(var(--border))] p-3">
									<p class="text-xs text-[hsl(var(--muted-foreground))]">Derivado</p>
									<p class="mt-1 text-lg font-semibold tabular-nums">
										{detailRecipe.derivedProduct ? `${formatNumber(detailRecipe.derivedProduct.unitsProduced)} u` : 'No'}
									</p>
								</div>
							</div>
						</div>
					</div>

					<section class="space-y-3">
						<div class="flex items-center justify-between gap-3">
							<h3 class="text-sm font-semibold text-[hsl(var(--foreground))]">Ingredientes</h3>
							<span class="text-xs text-[hsl(var(--muted-foreground))]">
								{detailRecipe.ingredients.length} elementos
							</span>
						</div>
						<div class="space-y-2">
							{#each detailRecipe.ingredients as ingredient (ingredient.productId)}
								<div class="rounded-md border border-[hsl(var(--border))] p-3">
									<div class="flex items-start justify-between gap-3">
										<div class="min-w-0">
											<p class="truncate font-medium text-[hsl(var(--foreground))]">{ingredient.productName}</p>
											<p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Producto #{ingredient.productId}</p>
										</div>
										<p class="shrink-0 font-medium tabular-nums">{formatNumber(ingredient.grams)} g</p>
									</div>
								</div>
							{/each}
						</div>
					</section>

					<section class="space-y-2">
						<h3 class="text-sm font-semibold text-[hsl(var(--foreground))]">Instrucciones</h3>
						<p class="whitespace-pre-wrap rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.45)] p-3 text-sm leading-6 text-[hsl(var(--foreground))]">
							{detailRecipe.instructions}
						</p>
					</section>

					<div class="flex flex-col-reverse gap-2 border-t border-[hsl(var(--border))] pt-5 sm:flex-row sm:justify-end">
						<Button variant="secondary" type="button" onclick={closeModal}>Cerrar</Button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if previewProduct?.photo}
		{@const previewPhoto = previewProduct.photo}
		<div class="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/50 p-3 backdrop-blur-sm sm:p-4" role="presentation">
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
							{productPhotoIsBroken(previewPhoto)
								? 'La imagen temporal ya no está disponible.'
								: 'Imagen temporal firmada que expira con la sesión.'}
						</p>
					</div>
					<Button variant="ghost" size="icon" type="button" onclick={closeProductPreview} aria-label="Cerrar vista previa">
						<X class="size-4" aria-hidden="true" />
					</Button>
				</div>

				<div class="grid gap-6 p-5 md:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.8fr)]">
					{#if !productPhotoIsBroken(previewPhoto)}
						<div class="overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
							<img
								src={productPhotoUrl(previewPhoto)}
								alt={`Imagen ampliada de ${previewProduct.name}`}
								class="h-full max-h-[70vh] w-full object-contain bg-[hsl(var(--background))]"
								loading="eager"
								decoding="async"
								onload={() => clearProductPhotoBroken(previewPhoto)}
								onerror={() => markProductPhotoBroken(previewPhoto)}
							/>
						</div>
					{:else}
						<div class="grid min-h-[24rem] place-items-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
							<div class="flex flex-col items-center gap-3 text-center text-[hsl(var(--muted-foreground))]">
								<span class="grid size-16 place-items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))]">
									<Package class="size-6" aria-hidden="true" />
								</span>
								<p class="text-sm">La imagen ya no está disponible.</p>
							</div>
						</div>
					{/if}
					<div class="space-y-4">
						<div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-4">
							<p class="text-sm font-medium">{previewProduct.name}</p>
							<p class="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
								{previewProduct.description}
							</p>
						</div>
						<div class="rounded-lg border border-[hsl(var(--border))] p-3">
							<p class="text-xs text-[hsl(var(--muted-foreground))]">URL temporal</p>
							<p class="mt-1 break-words font-medium">{previewPhoto}</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
