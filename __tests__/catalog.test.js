/** @jest-environment node */

jest.mock('expo-sqlite', () => ({}));
const { DatabaseSync } = process.getBuiltinModule('node:sqlite');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const {
    initializeCatalogDatabase,
} = require('../src/features/catalog/database');

const {
    getSavedBook,
    listSavedBooks,
    removeSavedBook,
    saveBook,
    updateCatalogEntry,
} = require('../src/features/catalog/repository');

function makeAdapter(database) {
    const adapter = {
        async execAsync(sql) {
            database.exec(sql);
        },

        async runAsync(sql, ...params) {
            const result = database.prepare(sql).run(...params);

            return {
                changes: Number(result.changes),
                lastInsertRowId: Number(result.lastInsertRowid),
            };
        },

        async getFirstAsync(sql, ...params) {
            return database.prepare(sql).get(...params) ?? null;
        },

        async getAllAsync(sql, ...params) {
            return database.prepare(sql).all(...params);
        },

        async withExclusiveTransactionAsync(task) {
            database.exec('BEGIN IMMEDIATE');

            try {
                await task(adapter);
                database.exec('COMMIT');
            } catch (error) {
                database.exec('ROLLBACK');
                throw error;
            }
        },
    };

    return adapter;
}

const book = {
    workId: '/works/OL123W',
    title: "A Reader's Book",
    authors: ['Example Author'],
    firstPublishYear: 2020,
    coverUrl: null,
    description: 'A sample description.',
    categories: ['Fiction'],
    publisher: null,
    isbn: null,
    editionId: null,
};

const originalInput = {
    status: 'want_to_read',
    rating: null,
    notes: "A friend's recommendation",
    dateFound: '2026-09-24',
    foundAt: 'Bookstore',
};

let directory;
let filePath;
let database;
let adapter;

beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), 'book-finds-test-'));
    filePath = join(directory, 'catalog.db');
    database = new DatabaseSync(filePath);
    adapter = makeAdapter(database);

    await initializeCatalogDatabase(adapter);
});

afterEach(() => {
    database.close();
    rmSync(directory, { recursive: true, force: true });
});

test('saves a book and reloads its personal and book data', async () => {
    expect(await saveBook(adapter, book, originalInput)).toBe(true);

    const saved = await getSavedBook(adapter, book.workId);

    expect(saved).toMatchObject({
        ...book,
        ...originalInput,
    });
    expect(saved.savedAt).toEqual(expect.any(String));
    expect(saved.updatedAt).toEqual(expect.any(String));
});

test('prevents a second save from replacing the first entry', async () => {
    await saveBook(adapter, book, originalInput);

    const duplicate = await saveBook(adapter, book, {
        ...originalInput,
        status: 'finished',
        notes: 'This must not replace my first note',
    });

    expect(duplicate).toBe(false);
    expect((await listSavedBooks(adapter))).toHaveLength(1);
    expect((await getSavedBook(adapter, book.workId)).notes).toBe(
        originalInput.notes
    );
});

test('updates personal fields without changing book metadata', async () => {
    await saveBook(adapter, book, originalInput);

    expect(
        await updateCatalogEntry(adapter, book.workId, {
            status: 'finished',
            rating: 5,
            notes: 'Loved it',
            dateFound: '2026-09-24',
            foundAt: 'A friend',
        })
    ).toBe(true);

    expect(await getSavedBook(adapter, book.workId)).toMatchObject({
        title: book.title,
        authors: book.authors,
        status: 'finished',
        rating: 5,
        notes: 'Loved it',
        foundAt: 'A friend',
    });
});

test('persists the book when the database is closed and reopened', async () => {
    await saveBook(adapter, book, originalInput);

    database.close();
    database = new DatabaseSync(filePath);
    adapter = makeAdapter(database);
    await initializeCatalogDatabase(adapter);

    expect(await getSavedBook(adapter, book.workId)).toMatchObject({
        title: book.title,
        notes: originalInput.notes,
        isbn: null,
    });
});

test('deletes the book and its catalog entry', async () => {
    await saveBook(adapter, book, originalInput);

    expect(await removeSavedBook(adapter, book.workId)).toBe(true);
    expect(await getSavedBook(adapter, book.workId)).toBeNull();

    const entries = database
        .prepare('SELECT COUNT(*) AS count FROM catalog_entries')
        .get();

    expect(entries.count).toBe(0);
});

test('rejects an invalid rating without saving the book', async () => {
    await expect(
        saveBook(adapter, book, { ...originalInput, rating: 7 })
    ).rejects.toThrow('Rating must be a whole number from 1 to 5');

    expect(await listSavedBooks(adapter)).toHaveLength(0);
});