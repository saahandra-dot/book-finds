import {
    catalogAuthors,
    selectCatalogBooks,
    UNKNOWN_AUTHOR,
    type CatalogFilters,
} from '../src/features/catalog/selectCatalogBooks';
import type { SavedBook } from '../src/features/catalog/types';

function book(
    workId: string,
    changes: Partial<SavedBook> = {}
): SavedBook {
    return {
        workId,
        title: 'Example',
        authors: ['A. Writer'],
        firstPublishYear: 2020,
        coverUrl: null,
        description: null,
        categories: [],
        publisher: null,
        isbn: null,
        editionId: null,
        status: 'want_to_read',
        rating: null,
        notes: '',
        dateFound: null,
        foundAt: '',
        savedAt: '2026-09-01T12:00:00.000Z',
        updatedAt: '2026-09-01T12:00:00.000Z',
        ...changes,
    };
}

const defaults: CatalogFilters = {
    query: '',
    status: 'all',
    author: null,
    minRating: null,
    sort: 'saved_newest',
};

const books = [
    book('/works/OL1W', {
        title: 'Garden Stories',
        authors: ['Maya Green'],
        status: 'reading',
        rating: 4,
        notes: 'Recommended by Ana',
        savedAt: '2026-09-01T12:00:00.000Z',
    }),
    book('/works/OL2W', {
        title: 'Night Sky',
        authors: ['L. Stone'],
        status: 'finished',
        rating: 5,
        isbn: '9781234567890',
        savedAt: '2026-09-10T12:00:00.000Z',
    }),
    book('/works/OL3W', {
        title: 'Quiet Places',
        authors: [],
        status: 'reading',
        savedAt: '2026-09-20T12:00:00.000Z',
    }),
];

describe('catalog selection', () => {
    test('searches titles, authors, ISBNs, and personal notes', () => {
        for (const query of ['garden', 'MAYA', 'recommended']) {
            expect(
                selectCatalogBooks(books, { ...defaults, query }).map(
                    (item) => item.workId
                )
            ).toEqual(['/works/OL1W']);
        }

        expect(
            selectCatalogBooks(books, {
                ...defaults,
                query: '9781234567890',
            }).map((item) => item.workId)
        ).toEqual(['/works/OL2W']);
    });

    test('combines status, author, and minimum rating filters', () => {
        const result = selectCatalogBooks(books, {
            ...defaults,
            status: 'reading',
            author: 'Maya Green',
            minRating: 4,
        });

        expect(result.map((item) => item.workId)).toEqual(['/works/OL1W']);
    });

    test('lists and filters books without an author', () => {
        expect(catalogAuthors(books)).toEqual([
            'L. Stone',
            'Maya Green',
            UNKNOWN_AUTHOR,
        ]);

        expect(
            selectCatalogBooks(books, {
                ...defaults,
                author: UNKNOWN_AUTHOR,
            }).map((item) => item.workId)
        ).toEqual(['/works/OL3W']);
    });

    test('sorts by saved date in both directions', () => {
        expect(
            selectCatalogBooks(books, defaults).map((item) => item.workId)
        ).toEqual(['/works/OL3W', '/works/OL2W', '/works/OL1W']);

        expect(
            selectCatalogBooks(books, {
                ...defaults,
                sort: 'saved_oldest',
            }).map((item) => item.workId)
        ).toEqual(['/works/OL1W', '/works/OL2W', '/works/OL3W']);
    });

    test('sorts by rating with unrated books last without changing input', () => {
        const originalOrder = books.map((item) => item.workId);

        expect(
            selectCatalogBooks(books, {
                ...defaults,
                sort: 'rating_high',
            }).map((item) => item.workId)
        ).toEqual(['/works/OL2W', '/works/OL1W', '/works/OL3W']);

        expect(books.map((item) => item.workId)).toEqual(originalOrder);
    });

    test('sorts authors alphabetically', () => {
        expect(
            selectCatalogBooks(books, {
                ...defaults,
                sort: 'author_az',
            }).map((item) => item.workId)
        ).toEqual(['/works/OL2W', '/works/OL1W', '/works/OL3W']);
    });
});