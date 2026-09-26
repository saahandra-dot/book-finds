import type { BookSummary } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
    );
}

function parseWorkId(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    // Open Library examples show both "OL123W" and "/works/OL123W".
    const match = value.match(/^(?:\/works\/)?(OL\d+W)$/);

    return match ? `/works/${match[1]}` : null;
}

function parseAuthors(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter((author): author is string => typeof author === 'string')
        .map((author) => author.trim())
        .filter((author) => author.length > 0);
}

function parseBook(value: unknown): BookSummary | null {
    if (!isRecord(value)) {
        return null;
    }

    const workId = parseWorkId(value.key);
    const title =
        typeof value.title === 'string' ? value.title.trim() : '';

    // Without an ID and title, this result cannot be shown or saved reliably.
    if (!workId || !title) {
        return null;
    }

    const year = value.first_publish_year;
    const coverId = value.cover_i;

    return {
        workId,
        title,
        authors: parseAuthors(value.author_name),
        firstPublishYear:
            typeof year === 'number' &&
                Number.isInteger(year) &&
                year > 0
                ? year
                : null,
        coverUrl:
            typeof coverId === 'number' &&
                Number.isInteger(coverId) &&
                coverId > 0
                ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
                : null,
    };
}

export function parseSearchResults(response: unknown): BookSummary[] {
    if (!isRecord(response) || !Array.isArray(response.docs)) {
        throw new Error('Invalid book search response');
    }

    const books: BookSummary[] = [];
    const seenWorkIds = new Set<string>();

    for (const document of response.docs) {
        const book = parseBook(document);

        if (!book || seenWorkIds.has(book.workId)) {
            continue;
        }

        seenWorkIds.add(book.workId);
        books.push(book);
    }

    return books;
}