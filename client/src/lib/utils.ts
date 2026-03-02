import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: any[]) {
	return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: 'USD' | 'EUR' | 'RWF' | 'KES' = 'USD'): string {
	const formatters: Record<string, Intl.NumberFormat> = {
		USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
		EUR: new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR' }),
		RWF: new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }),
		KES: new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }),
	};

	const formatter = formatters[currency] || formatters.USD;
	return formatter.format(amount);
}

