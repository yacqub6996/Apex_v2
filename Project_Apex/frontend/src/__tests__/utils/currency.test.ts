import { describe, it, expect } from 'vitest';
import { formatCurrencyByPreference, getCurrencySymbol } from '@/utils/currency';

describe('Currency Utilities', () => {
  describe('formatCurrencyByPreference', () => {
    it('formats USD correctly', () => {
      const result = formatCurrencyByPreference(1234.56, 'USD');
      expect(result).toMatch(/\$1,234\.56/);
    });

    it('formats EUR correctly', () => {
      const result = formatCurrencyByPreference(1234.56, 'EUR');
      // EUR uses different formatting (e.g., "1.234,56 €" or "1 234,56 €")
      expect(result).toContain('€');
      expect(result).toContain('1');
      expect(result).toContain('234');
    });

    it('formats NGN correctly', () => {
      const result = formatCurrencyByPreference(1234.56, 'NGN');
      expect(result).toContain('₦');
      expect(result).toContain('1,234');
    });

    it('formats BTC correctly with 8 decimals', () => {
      const result = formatCurrencyByPreference(0.12345678, 'BTC');
      expect(result).toContain('₿');
      expect(result).toContain('0.12345678');
    });

    it('formats BTC with minimum 2 decimals', () => {
      const result = formatCurrencyByPreference(1, 'BTC');
      expect(result).toContain('₿');
      expect(result).toContain('1.00');
    });

    it('handles zero values', () => {
      expect(formatCurrencyByPreference(0, 'USD')).toContain('0');
      expect(formatCurrencyByPreference(0, 'EUR')).toContain('0');
      expect(formatCurrencyByPreference(0, 'NGN')).toContain('0');
      expect(formatCurrencyByPreference(0, 'BTC')).toContain('0');
    });

    it('handles negative values', () => {
      expect(formatCurrencyByPreference(-100, 'USD')).toContain('-');
      expect(formatCurrencyByPreference(-100, 'EUR')).toContain('-');
      expect(formatCurrencyByPreference(-100, 'NGN')).toContain('-');
      expect(formatCurrencyByPreference(-0.5, 'BTC')).toContain('-');
    });

    it('respects custom options', () => {
      const result = formatCurrencyByPreference(1234.56, 'USD', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      expect(result).toMatch(/\$1,235/); // Rounded
    });
  });

  describe('getCurrencySymbol', () => {
    it('returns $ for USD', () => {
      const symbol = getCurrencySymbol('USD');
      expect(symbol).toBe('$');
    });

    it('returns € for EUR', () => {
      const symbol = getCurrencySymbol('EUR');
      expect(symbol).toBe('€');
    });

    it('returns ₦ for NGN', () => {
      const symbol = getCurrencySymbol('NGN');
      expect(symbol).toBe('₦');
    });

    it('returns ₿ for BTC', () => {
      const symbol = getCurrencySymbol('BTC');
      expect(symbol).toBe('₿');
    });
  });
});
