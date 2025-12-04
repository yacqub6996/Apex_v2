import type { PreferredCurrency } from '@/stores/dashboard-store';

// Export the type for convenience
export type { PreferredCurrency } from '@/stores/dashboard-store';

/**
 * Currency configuration for different formats
 */
const CURRENCY_CONFIG: Record<PreferredCurrency, { locale: string; currency?: string; symbol?: string }> = {
  USD: { locale: 'en-US', currency: 'USD' },
  EUR: { locale: 'de-DE', currency: 'EUR' },
  NGN: { locale: 'en-NG', currency: 'NGN' },
  BTC: { locale: 'en-US', symbol: '₿' },
};

/**
 * Format a number as currency based on the preferred currency setting
 * 
 * @param value - The numeric value to format
 * @param preferredCurrency - The currency format to use
 * @param options - Optional Intl.NumberFormat options to override defaults
 * @returns Formatted currency string
 * 
 * @example
 * formatCurrencyByPreference(1234.56, 'USD') // "$1,234.56"
 * formatCurrencyByPreference(1234.56, 'EUR') // "1.234,56 €"
 * formatCurrencyByPreference(1234.56, 'NGN') // "₦1,234.56"
 * formatCurrencyByPreference(0.05, 'BTC') // "₿0.05000000"
 */
export const formatCurrencyByPreference = (
  value: number,
  preferredCurrency: PreferredCurrency,
  options?: Intl.NumberFormatOptions
): string => {
  const config = CURRENCY_CONFIG[preferredCurrency];
  
  if (preferredCurrency === 'BTC') {
    // BTC uses 8 decimal places by convention
    const formatted = new Intl.NumberFormat(config.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
      ...options,
    }).format(value);
    return `${config.symbol}${formatted}`;
  }
  
  // Standard currency formatting
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    ...options,
  }).format(value);
};

/**
 * Get the currency symbol for a given preferred currency
 * 
 * @param preferredCurrency - The currency to get the symbol for
 * @returns The currency symbol
 */
export const getCurrencySymbol = (preferredCurrency: PreferredCurrency): string => {
  const config = CURRENCY_CONFIG[preferredCurrency];
  
  if (config.symbol) {
    return config.symbol;
  }
  
  // Get symbol from formatter
  const parts = new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
  }).formatToParts(0);
  
  const symbolPart = parts.find(part => part.type === 'currency');
  return symbolPart?.value ?? config.currency ?? '';
};
