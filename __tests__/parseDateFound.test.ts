import { parseDateFound } from '../src/features/catalog/parseDateFound';

describe('parseDateFound', () => {
    test('accepts a valid date and trims spaces', () => {
        expect(parseDateFound(' 2026-09-25 ')).toBe('2026-09-25');
    });

    test('allows an empty optional date', () => {
        expect(parseDateFound('   ')).toBeNull();
    });

    test('accepts February 29 in a leap year', () => {
        expect(parseDateFound('2024-02-29')).toBe('2024-02-29');
    });

    test('rejects February 29 outside a leap year', () => {
        expect(() => parseDateFound('2025-02-29')).toThrow();
    });

    test('rejects impossible and incorrectly formatted dates', () => {
        expect(() => parseDateFound('2026-02-30')).toThrow();
        expect(() => parseDateFound('25/09/2026')).toThrow();
        expect(() => parseDateFound('2026-13-01')).toThrow();
    });
});