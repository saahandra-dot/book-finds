import type { ReadingStatus, SavedBook } from './types';

export const SHELF_ORDER: {
    status: ReadingStatus;
    title: string;
}[] = [
        { status: 'reading', title: 'Currently reading' },
        { status: 'want_to_read', title: 'Next up' },
        { status: 'finished', title: 'Finished' },
        { status: 'did_not_finish', title: 'Did not finish' },
    ];

export type BookShelf = {
    status: ReadingStatus;
    title: string;
    books: SavedBook[];
};

export function groupShelves(books: SavedBook[]): BookShelf[] {
    return SHELF_ORDER.map((shelf) => ({
        ...shelf,
        books: books
            .filter((book) => book.status === shelf.status)
            .sort((a, b) => b.savedAt.localeCompare(a.savedAt)),
    }));
}