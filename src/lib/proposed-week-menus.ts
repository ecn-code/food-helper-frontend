import type {
	ProposedWeekMenuDayResponse,
	ProposedWeekMenuDayPartResponse,
	ProposedWeekMenuProductResponse,
	ProposedWeekMenuResponse,
	NutritionalRulesEvaluation,
	ProposedWeekMenuSectionResponse
} from '$lib/api/proposed-week-menus';
import type { NutritionalValues } from '$lib/products';

export type ProposedWeekMenuCreateFormValues = {
	startDate: string;
	endDate: string;
};

export type ProposedWeekMenuDayPartFormValues = {
	name: string;
	description: string;
	sortOrder: string;
};

export type ProposedWeekMenuDayProductFormValues = {
	productId: string;
	units: string;
	grams: string;
	sortOrder: string;
};

export type ProposedWeekMenuSectionFormValues = {
	dayPartId: string;
	products: ProposedWeekMenuDayProductFormValues[];
};

export type ProposedWeekMenuDayFormValues = {
	date: string;
	sections: ProposedWeekMenuSectionFormValues[];
};

export type ProposedWeekMenuCreateFormErrors = Partial<Record<'startDate' | 'endDate', string>>;
export type ProposedWeekMenuDayPartFormErrors = Partial<Record<'name' | 'description' | 'sortOrder', string>>;

export type ProposedWeekMenuDayProductFormErrors = Partial<
	Record<'productId' | 'units' | 'grams' | 'sortOrder', string>
>;

export type ProposedWeekMenuSectionFormErrors = Partial<Record<'dayPartId' | 'products', string>> & {
	productErrors?: ProposedWeekMenuDayProductFormErrors[];
};

export type ProposedWeekMenuDayFormErrors = {
	date?: string;
	sections?: string;
	sectionErrors?: ProposedWeekMenuSectionFormErrors[];
};

export type ProposedWeekMenuDay = {
	id: number;
	date: string;
	sections: ProposedWeekMenuSection[];
	nutritionalValues: NutritionalValues;
};

export type ProposedWeekMenuSection = {
	id: number;
	dayPartId: number;
	name: string;
	description: string;
	sortOrder: number;
	products: ProposedWeekMenuProduct[];
	nutritionalValues: NutritionalValues;
};

export type ProposedWeekMenuDayPart = {
	id: number;
	name: string;
	description: string;
	sortOrder: number;
};

export type ProposedWeekMenuProduct = {
	productId: number;
	productName: string;
	units: number;
	grams: number;
	sortOrder: number;
	nutritionalValues: NutritionalValues;
};

export type ProposedWeekMenu = {
	id: number;
	startDate: string;
	endDate: string;
	days: ProposedWeekMenuDay[];
	nutritionalValues: NutritionalValues;
	nutritionalRules?: NutritionalRulesEvaluation;
};

function sortBySortOrder<T extends { sortOrder: number }>(items: T[]) {
	return [...items].sort((left, right) => {
		if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
		return 0;
	});
}

function sortByDate<T extends { date: string }>(items: T[]) {
	return [...items].sort((left, right) => left.date.localeCompare(right.date));
}

export function emptyProposedWeekMenuCreateForm(): ProposedWeekMenuCreateFormValues {
	return {
		startDate: '',
		endDate: ''
	};
}

export function emptyProposedWeekMenuDayPartForm(): ProposedWeekMenuDayPartFormValues {
	return {
		name: '',
		description: '',
		sortOrder: '10'
	};
}

export function emptyProposedWeekMenuDayProductForm(): ProposedWeekMenuDayProductFormValues {
	return {
		productId: '',
		units: '',
		grams: '',
		sortOrder: '10'
	};
}

export function emptyProposedWeekMenuSectionForm(): ProposedWeekMenuSectionFormValues {
	return {
		dayPartId: '',
		products: [emptyProposedWeekMenuDayProductForm()]
	};
}

export function emptyProposedWeekMenuDayForm(date = ''): ProposedWeekMenuDayFormValues {
	return {
		date,
		sections: [emptyProposedWeekMenuSectionForm()]
	};
}

export function toProposedWeekMenuModel(menu: ProposedWeekMenuResponse): ProposedWeekMenu {
	return {
		id: menu.id,
		startDate: menu.startDate,
		endDate: menu.endDate,
		days: sortByDate(menu.days).map(toProposedWeekMenuDayModel),
		nutritionalValues: menu.nutritionalValues,
		nutritionalRules: menu.nutritionalRules
	};
}

export function toProposedWeekMenuDayModel(day: ProposedWeekMenuDayResponse): ProposedWeekMenuDay {
	return {
		id: day.id,
		date: day.date,
		sections: sortBySortOrder(day.sections).map(toProposedWeekMenuSectionModel),
		nutritionalValues: day.nutritionalValues
	};
}

export function toProposedWeekMenuSectionModel(
	section: ProposedWeekMenuSectionResponse
): ProposedWeekMenuSection {
	return {
		id: section.id,
		dayPartId: section.dayPartId,
		name: section.name,
		description: section.description,
		sortOrder: section.sortOrder,
		products: sortBySortOrder(section.products).map(toProposedWeekMenuProductModel),
		nutritionalValues: section.nutritionalValues
	};
}

export function toProposedWeekMenuProductModel(
	product: ProposedWeekMenuProductResponse
): ProposedWeekMenuProduct {
	return {
		productId: product.productId,
		productName: product.productName,
		units: product.units,
		grams: product.grams,
		sortOrder: product.sortOrder,
		nutritionalValues: product.nutritionalValues
	};
}

export function toProposedWeekMenuDayFormValues(day: ProposedWeekMenuDay | null | undefined) {
	if (!day) return emptyProposedWeekMenuDayForm();

	return {
		date: day.date,
		sections: sortBySortOrder(day.sections).map((section) => ({
			dayPartId: String(section.dayPartId),
			products: sortBySortOrder(section.products).map((product) => ({
				productId: String(product.productId),
				units: String(product.units ?? ''),
				grams: String(product.grams ?? ''),
				sortOrder: String(product.sortOrder)
			}))
		}))
	};
}

export function nextProposedWeekMenuProductSortOrder(products: ProposedWeekMenuDayProductFormValues[]) {
	const highestSortOrder = products.reduce((highest, product) => {
		const numericSortOrder = Number(product.sortOrder);
		if (Number.isNaN(numericSortOrder) || numericSortOrder < 0) return highest;
		return Math.max(highest, numericSortOrder);
	}, 0);

	return String(highestSortOrder + 10);
}

export function toProposedWeekMenuDayPartModel(dayPart: ProposedWeekMenuDayPartResponse): ProposedWeekMenuDayPart {
	return {
		id: dayPart.id,
		name: dayPart.name,
		description: dayPart.description,
		sortOrder: dayPart.sortOrder
	};
}

export function toProposedWeekMenuDayPartFormValues(
	dayPart: ProposedWeekMenuDayPart | null | undefined
): ProposedWeekMenuDayPartFormValues {
	if (!dayPart) return emptyProposedWeekMenuDayPartForm();

	return {
		name: dayPart.name,
		description: dayPart.description,
		sortOrder: String(dayPart.sortOrder)
	};
}
