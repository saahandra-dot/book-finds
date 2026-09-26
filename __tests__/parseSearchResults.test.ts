import { parseSearchResults } from '../src/features/books/parseSearchResults';

describe('parseSearchResults', () => {
    test('parses a result with its available fields', () => {
        const books = parseSearchResults({
            docs: [
                {
                    key: '/works/OL123W',
                    title: '  A Book  ',
                    author_name: ['  First Author  ', 'Second Author'],
                    first_publish_year: 2011,
                    cover_i: 456,
                },
            ],
        });

        expect(books).toEqual([
            {
                workId: '/works/OL123W',
                title: 'A Book',
                authors: ['First Author', 'Second Author'],
                firstPublishYear: 2011,
                coverUrl: 'https://covers.openlibrary.org/b/id/456-M.jpg',
            },
        ]);
    });

    test('keeps books with missing author, year, and cover', () => {
        const books = parseSearchResults({
            docs: [{ key: 'OL789W', title: 'No Metadata' }],
        });

        expect(books).toEqual([
            {
                workId: '/works/OL789W',
                title: 'No Metadata',
                authors: [],
                firstPublishYear: null,
                coverUrl: null,
            },
        ]);
    });

    test('ignores malformed fields and unusable results', () => {
        const books = parseSearchResults({
            docs: [
                {
                    key: '/works/OL10W',
                    title: 'Still Valid',
                    author_name: [null, ' Writer ', 42, ' '],
                    first_publish_year: '2001',
                    cover_i: -5,
                },
                { key: '/works/OL11W', title: '   ' },
                { key: 'invalid', title: 'Missing a usable ID' },
                null,
            ],
        });

        expect(books).toEqual([
            {
                workId: '/works/OL10W',
                title: 'Still Valid',
                authors: ['Writer'],
                firstPublishYear: null,
                coverUrl: null,
            },
        ]);
    });

    test('returns one book when the same work appears twice', () => {
        const books = parseSearchResults({
            docs: [
                { key: 'OL42W', title: 'First Appearance' },
                { key: '/works/OL42W', title: 'Second Appearance' },
            ],
        });

        expect(books).toHaveLength(1);
        expect(books[0].title).toBe('First Appearance');
    });

    test('rejects a malformed overall response', () => {
        expect(() => parseSearchResults({ message: 'error' })).toThrow(
            'Invalid book search response'
        );
    });
});