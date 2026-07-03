export type StockEntry = {
	id: number;
	productId: number;
	productName: string;
	quantity: number;
	price: number;
	expirationDate: string | null;
	entryDate: string;
};

export type StockFormValues = {
	productId: string;
	quantity: string;
	price: string;
	expirationDate: string;
	entryDate: string;
};

export type StockFormErrors = Partial<Record<keyof StockFormValues, string>>;

function todayDateInput() {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export const emptyStockForm = (productId: string | number = ''): StockFormValues => ({
	productId: String(productId),
	quantity: '',
	price: '',
	expirationDate: '',
	entryDate: todayDateInput()
});
