export const appSections = [
	'products',
	'recipes',
	'stock',
	'planning',
	'coupons',
	'menus',
	'closed-menus',
	'people-weights',
	'menus-history',
	'people-trend',
	'day-parts',
	'supermarkets',
	'money-box',
	'nutritional-rules'
] as const;

export type AppSection = (typeof appSections)[number];

const sectionPaths: Record<AppSection, string> = {
	products: '/products',
	recipes: '/recipes',
	stock: '/stock',
	planning: '/planning',
	coupons: '/coupons',
	menus: '/menus/current',
	'closed-menus': '/menus/closed',
	'people-weights': '/people/weights',
	'menus-history': '/people/history',
	'people-trend': '/people/trends',
	'day-parts': '/settings/day-parts',
	supermarkets: '/settings/supermarkets',
	'money-box': '/settings/money-boxes',
	'nutritional-rules': '/settings/nutritional-rules'
};

export function sectionPath(section: AppSection) {
	return sectionPaths[section];
}

const pathsToSections = new Map<string, AppSection>(
	appSections.map((section) => [sectionPath(section), section])
);

export function sectionFromPath(pathname: string): AppSection {
	return pathsToSections.get(pathname) ?? 'products';
}
