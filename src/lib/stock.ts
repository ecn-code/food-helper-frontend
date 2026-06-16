export type StockEntry = {
	id: number;
	productId: number;
	productName: string;
	quantity: number;
	expirationDate: string | null;
	entryDate: string;
};

export type StockFormValues = {
	productId: string;
	quantity: string;
	expirationDate: string;
	entryDate: string;
};

export type StockFormErrors = Partial<Record<keyof StockFormValues, string>>;

export const emptyStockForm = (productId: string | number = ''): StockFormValues => ({
	productId: String(productId),
	quantity: '',
	expirationDate: '',
	entryDate: ''
});
