
import { parseBookDetails } from '../src/features/books/bookDetails';

const workId = '/works/OL123W';

describe('parseBookDetails', () => {
    test('combines work information with one useful edition', () => {
        const book = parseBookDetails(
            workId,
            {
                title: 'The Example Book',
                description: { value: '  A story about discovery.  ' },
                subjects: ['Fiction', 'Adventure', 'Fiction'],
                first_publish_date: 'March 2011',
                covers: [123],
            },
            {
                entries: [
                    { key: '/books/OL1M', title: 'The Example Book' },
                    {
                        key: '/books/OL2M',
                        publishers: ['Example Press'],
                        isbn_13: ['9781234567890'],
                        covers: [456],
                    },
                ],
            },
            ['A. Writer']
        );

        expect(book).toMatchObject({
            workId,
            title: 'The Example Book',
            authors: ['A. Writer'],
            firstPublishYear: 2011,
            description: 'A story about discovery.',
            categories: ['Fiction', 'Adventure'],
            publisher: 'Example Press',
            isbn: '9781234567890',
            editionId: '/books/OL2M',
            coverUrl:
                'https://covers.openlibrary.org/b/id/123-L.jpg?default=false',
        });
    });

    test('accepts a plain-text description and ISBN-10', () => {
        const book = parseBookDetails(
            workId,
            {
                title: 'Another Book',
                description: 'Plain text description',
            },
            {
                entries: [
                    {
                        key: '/books/OL3M',
                        isbn_10: ['123456789X'],
                        publishers: ['Small Press'],
                    },
                ],
            },
            ['  Lee Reader  ', 'Lee Reader']
        );

        expect(book.description).toBe('Plain text description');
        expect(book.isbn).toBe('123456789X');
        expect(book.authors).toEqual(['Lee Reader']);
    });

    test('uses an edition date and cover when the work lacks them', () => {
        const book = parseBookDetails(
            workId,
            { title: 'Undated Work' },
            {
                entries: [
                    {
                        key: '/books/OL4M',
                        publish_date: '12 June 1998',
                        covers: [789],
                    },
                ],
            },
            []
        );

        expect(book.firstPublishYear).toBe(1998);
        expect(book.coverUrl).toContain('/789-L.jpg');
        expect(book.authors).toEqual([]);
    });

    test('handles absent descriptions, authors, ISBNs, and covers', () => {
        const book = parseBookDetails(workId, {}, null, []);

        expect(book).toEqual({
            workId,
            title: 'Untitled book',
            authors: [],
            firstPublishYear: null,
            coverUrl: null,
            description: null,
            categories: [],
            publisher: null,
            isbn: null,
            editionId: null,
        });
    });

    test('keeps publisher and ISBN from the same edition', () => {
        const book = parseBookDetails(
            workId,
            { title: 'Collected Stories' },
            {
                entries: [
                    { key: '/books/OL5M', publishers: ['First Publisher'] },
                    {
                        key: '/books/OL6M',
                        publishers: ['Second Publisher'],
                        isbn_13: ['9780000000002'],
                    },
                ],
            },
            []
        );

        expect(book.publisher).toBe('Second Publisher');
        expect(book.isbn).toBe('9780000000002');
        expect(book.editionId).toBe('/books/OL6M');
    });
});