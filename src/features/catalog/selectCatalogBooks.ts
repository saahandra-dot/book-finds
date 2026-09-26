import type { ReadingStatus, SavedBook } from './types';

export const UNKNOWN_AUTHOR = '__unknown_author__';

export type CatalogSort =
    | 'saved_newest'
    | 'saved_oldest'
    | 'author_az'
    | 'rating_high';

export type CatalogFilters = {
    query: string;
    status: ReadingStatus | 'all';
    author: string | null;
    minRating: number | null;
    sort: CatalogSort;
};

export function catalogAuthors(books: SavedBook[]): string[] {
    const authors = new Set<string>();
    let hasUnknownAuthor = false;

    for (const book of books) {
        const names = book.authors.map((name) => name.trim()).filter(Boolean);

        if (names.length === 0) {
            hasUnknownAuthor = true;
        }

        names.forEach((name) => authors.add(name));
    }

    const sorted = [...authors].sort((a, b) => a.localeCompare(b));

    return hasUnknownAuthor ? [...sorted, UNKNOWN_AUTHOR] : sorted;
}

export function selectCatalogBooks(
    books: SavedBook[],
    filters: CatalogFilters
): SavedBook[] {
    const query = filters.query.trim().toLowerCase();

    const selected = books.filter((book) => {
        if (
            filters.status !== 'all' &&
            book.status !== filters.status
        ) {
            return false;
        }

        if (filters.author === UNKNOWN_AUTHOR) {
            if (book.authors.some((name) => name.trim())) {
                return false;
            }
        } else if (
            filters.author !== null &&
            !book.authors.some((name) => name.trim() === filters.author)
        ) {
            return false;
        }

        if (
            filters.minRating !== null &&
            (book.rating === null || book.rating < filters.minRating)
        ) {
            return false;
        }

        if (query) {
            const searchable = [
                book.title,
                ...book.authors,
                book.isbn ?? '',
                book.notes,
                book.foundAt,
            ]
                .join(' ')
                .toLowerCase();

            if (!searchable.includes(query)) {
                return false;
            }
        }

        return true;
    });

    // Array.sort mutates its array. "selected" is a new array, so the
    // original list from SQLite remains in its original order.
    return selected.sort((a, b) => {
        switch (filters.sort) {
            case 'saved_oldest':
                return (
                    a.savedAt.localeCompare(b.savedAt) ||
                    a.title.localeCompare(b.title)
                );

            case 'author_az':
                return (
                    (a.authors[0] ?? 'Unknown author').localeCompare(
                        b.authors[0] ?? 'Unknown author'
                    ) ||
                    a.title.localeCompare(b.title)
                );

            case 'rating_high':
                return (
                    (b.rating ?? -1) - (a.rating ?? -1) ||
                    b.savedAt.localeCompare(a.savedAt)
                );

            case 'saved_newest':
            default:
                return (
                    b.savedAt.localeCompare(a.savedAt) ||
                    a.title.localeCompare(b.title)
                );
        }
    });
}