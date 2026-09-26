import type { SQLiteDatabase } from 'expo-sqlite';

import type { BookDetails } from '../books/types';
import { READING_STATUSES } from './types';
import type {
    CatalogInput,
    ReadingStatus,
    SavedBook,
} from './types';

type SavedBookRow = {
    work_id: string;
    title: string;
    authors_json: string;
    first_publish_year: number | null;
    cover_url: string | null;
    description: string | null;
    categories_json: string;
    publisher: string | null;
    isbn: string | null;
    edition_id: string | null;
    status: ReadingStatus;
    rating: number | null;
    notes: string;
    date_found: string | null;
    found_at: string;
    saved_at: string;
    updated_at: string;
};

const SELECT_SAVED_BOOKS = `
  SELECT
    b.work_id,
    b.title,
    b.authors_json,
    b.first_publish_year,
    b.cover_url,
    b.description,
    b.categories_json,
    b.publisher,
    b.isbn,
    b.edition_id,
    c.status,
    c.rating,
    c.notes,
    c.date_found,
    c.found_at,
    c.saved_at,
    c.updated_at
  FROM books AS b
  INNER JOIN catalog_entries AS c
    ON c.work_id = b.work_id
`;

function validateInput(input: CatalogInput): void {
    if (!READING_STATUSES.includes(input.status)) {
        throw new Error('Invalid reading status');
    }

    if (
        input.rating !== null &&
        (!Number.isInteger(input.rating) ||
            input.rating < 1 ||
            input.rating > 5)
    ) {
        throw new Error('Rating must be a whole number from 1 to 5');
    }
}

function rowToSavedBook(row: SavedBookRow): SavedBook {
    return {
        workId: row.work_id,
        title: row.title,
        authors: JSON.parse(row.authors_json) as string[],
        firstPublishYear: row.first_publish_year,
        coverUrl: row.cover_url,
        description: row.description,
        categories: JSON.parse(row.categories_json) as string[],
        publisher: row.publisher,
        isbn: row.isbn,
        editionId: row.edition_id,
        status: row.status,
        rating: row.rating,
        notes: row.notes,
        dateFound: row.date_found,
        foundAt: row.found_at,
        savedAt: row.saved_at,
        updatedAt: row.updated_at,
    };
}

export async function saveBook(
    db: SQLiteDatabase,
    book: BookDetails,
    input: CatalogInput
): Promise<boolean> {
    validateInput(input);

    const now = new Date().toISOString();
    let wasInserted = false;

    await db.withExclusiveTransactionAsync(async (transaction) => {
        await transaction.runAsync(
            `INSERT OR IGNORE INTO books (
        work_id,
        title,
        authors_json,
        first_publish_year,
        cover_url,
        description,
        categories_json,
        publisher,
        isbn,
        edition_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            book.workId,
            book.title,
            JSON.stringify(book.authors),
            book.firstPublishYear,
            book.coverUrl,
            book.description,
            JSON.stringify(book.categories),
            book.publisher,
            book.isbn,
            book.editionId
        );

        const result = await transaction.runAsync(
            `INSERT OR IGNORE INTO catalog_entries (
        work_id,
        status,
        rating,
        notes,
        date_found,
        found_at,
        saved_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            book.workId,
            input.status,
            input.rating,
            input.notes,
            input.dateFound,
            input.foundAt,
            now,
            now
        );

        wasInserted = result.changes === 1;
    });

    return wasInserted;
}

export async function getSavedBook(
    db: SQLiteDatabase,
    workId: string
): Promise<SavedBook | null> {
    const row = await db.getFirstAsync<SavedBookRow>(
        `${SELECT_SAVED_BOOKS} WHERE b.work_id = ?`,
        workId
    );

    return row ? rowToSavedBook(row) : null;
}

export async function listSavedBooks(
    db: SQLiteDatabase
): Promise<SavedBook[]> {
    const rows = await db.getAllAsync<SavedBookRow>(
        `${SELECT_SAVED_BOOKS}
     ORDER BY c.saved_at DESC, b.title COLLATE NOCASE ASC`
    );

    return rows.map(rowToSavedBook);
}

export async function updateCatalogEntry(
    db: SQLiteDatabase,
    workId: string,
    input: CatalogInput
): Promise<boolean> {
    validateInput(input);

    const result = await db.runAsync(
        `UPDATE catalog_entries
     SET status = ?,
         rating = ?,
         notes = ?,
         date_found = ?,
         found_at = ?,
         updated_at = ?
     WHERE work_id = ?`,
        input.status,
        input.rating,
        input.notes,
        input.dateFound,
        input.foundAt,
        new Date().toISOString(),
        workId
    );

    return result.changes === 1;
}

export async function removeSavedBook(
    db: SQLiteDatabase,
    workId: string
): Promise<boolean> {
    // ON DELETE CASCADE removes its catalog entry as well.
    const result = await db.runAsync(
        'DELETE FROM books WHERE work_id = ?',
        workId
    );

    return result.changes === 1;
}