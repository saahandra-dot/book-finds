import type { BookDetails } from '../books/types';

export const READING_STATUSES = [
    'want_to_read',
    'reading',
    'finished',
    'did_not_finish',
] as const;

export type ReadingStatus = (typeof READING_STATUSES)[number];

export type CatalogInput = {
    status: ReadingStatus;
    rating: number | null;
    notes: string;
    dateFound: string | null; // YYYY-MM-DD, or null
    foundAt: string;           // Store, recommendation, URL, etc.
};

export type CatalogEntry = CatalogInput & {
    workId: string;
    savedAt: string;
    updatedAt: string;
};

export type SavedBook = BookDetails & CatalogEntry;