import { describe, it, expect } from 'vitest';
import { formatCurrency, parseNumber, formatPhoneNumber } from '../utils/common';

describe('Common Utils', () => {
    describe('formatCurrency', () => {
        it('properly formats numbers for ko-KR locale', () => {
            expect(formatCurrency(1234567)).toBe('1,234,567');
            expect(formatCurrency(0)).toBe('0');
            expect(formatCurrency(100)).toBe('100');
        });

        it('handles null and undefined', () => {
            expect(formatCurrency(null)).toBe('0');
            expect(formatCurrency(undefined)).toBe('0');
        });

        it('handles string input with currency symbols', () => {
            expect(formatCurrency('₩1,234')).toBe('1,234');
        });
    });

    describe('parseNumber', () => {
        it('removes commas and converts to number', () => {
            expect(parseNumber('1,234,567')).toBe(1234567);
        });

        it('handles empty strings', () => {
            expect(parseNumber('')).toBe(0);
            expect(parseNumber(null)).toBe(0);
        });
    });

    describe('formatPhoneNumber', () => {
        it('formats 11 digit mobile numbers', () => {
            expect(formatPhoneNumber('01012345678')).toBe('010-1234-5678');
        });

        it('formats 10 digit phone numbers', () => {
            expect(formatPhoneNumber('0212345678')).toBe('021-234-5678');
        });
    });
});
