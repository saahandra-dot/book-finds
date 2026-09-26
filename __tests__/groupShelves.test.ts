import { groupShelves } from '../src/features/catalog/groupShelves';
import type { SavedBook } from '../src/features/catalog/types';

function book(
    workId: string,
    changes: Partial<SavedBook> = {}
): SavedBook {
    return {
        workId,
        title: 'Example book',
        authors: ['A. Writer'],
        firstPublishYear: null,
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

test('puts each saved book on the correct shelf', () => {
    const shelves = groupShelves([
        book('/works/OL1W', { status: 'reading' }),
        book('/works/OL2W', { status: 'want_to_read' }),
        book('/works/OL3W', { status: 'finished' }),
        book('/works/OL4W', { status: 'did_not_finish' }),
    ]);

    expect(shelves.map((shelf) => shelf.title)).toEqual([
        'Currently reading',
        'Next up',
        'Finished',
        'Did not finish',
    ]);

    expect(shelves.map((shelf) => shelf.books[0].workId)).toEqual([
        '/works/OL1W',
        '/works/OL2W',
        '/works/OL3W',
        '/works/OL4W',
    ]);
});

test('sorts a shelf by date saved without changing the input array', () => {
    const earlier = book('/works/OL1W', {
        status: 'reading',
        savedAt: '2026-09-01T12:00:00.000Z',
    });
    const later = book('/works/OL2W', {
        status: 'reading',
        savedAt: '2026-09-20T12:00:00.000Z',
    });
    const input = [earlier, later];

    const readingShelf = groupShelves(input)[0];

    expect(readingShelf.books.map((item) => item.workId)).toEqual([
        later.workId,
        earlier.workId,
    ]);
    expect(input).toEqual([earlier, later]);
});

test('keeps empty shelves visible', () => {
    const shelves = groupShelves([
        book('/works/OL1W', { status: 'finished' }),
    ]);

    expect(shelves).toHaveLength(4);
    expect(shelves[0].books).toEqual([]);
    expect(shelves[1].books).toEqual([]);
});