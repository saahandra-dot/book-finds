export function parseDateFound(value: string): string | null {
    const trimmed = value.trim();

    if (!trimmed) {
        return null;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed) || trimmed.startsWith('0000')) {
        throw new Error('Use a real date in YYYY-MM-DD format.');
    }

    const date = new Date(`${trimmed}T00:00:00.000Z`);

    if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== trimmed
    ) {
        throw new Error('Use a real date in YYYY-MM-DD format.');
    }

    return trimmed;
}