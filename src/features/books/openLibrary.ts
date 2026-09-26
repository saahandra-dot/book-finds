import { parseSearchResults } from './parseSearchResults';
import type { BookSummary } from './types';

const SEARCH_URL = 'https://openlibrary.org/search.json';

export async function searchBooks(
    query: string,
    signal?: AbortSignal
): Promise<BookSummary[]> {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
        return [];
    }

    const fields = [
        'key',
        'title',
        'author_name',
        'first_publish_year',
        'cover_i',
    ].join(',');

    const url =
        `${SEARCH_URL}?q=${encodeURIComponent(trimmedQuery)}` +
        `&fields=${fields}&limit=20`;

    const response = await fetch(url, { signal });

    if (!response.ok) {
        throw new Error(`Book search failed (${response.status})`);
    }

    const data: unknown = await response.json();

    return parseSearchResults(data);
}

const TRENDING_PAGE_SIZE = 20;

export type TrendingPage = {
    books: BookSummary[];
    hasMore: boolean;
};

export async function getTrendingPage(
    page: number,
    signal?: AbortSignal
): Promise<TrendingPage> {
    if (!Number.isInteger(page) || page < 1) {
        throw new Error('Page must be a positive whole number');
    }

    const params = new URLSearchParams({
        q: 'trending_score_hourly_sum:[1 TO *] readinglog_count:[4 TO *]',
        sort: 'trending',
        fields: 'key,title,author_name,first_publish_year,cover_i',
        limit: String(TRENDING_PAGE_SIZE),
        page: String(page),
    });

    const response = await fetch(`${SEARCH_URL}?${params.toString()}`, {
        signal,
    });

    if (!response.ok) {
        throw new Error(`Trending books failed (${response.status})`);
    }

    const data: unknown = await response.json();
    const books = parseSearchResults(data);

    if (typeof data !== 'object' || data === null) {
        throw new Error('Invalid trending books response');
    }

    const result = data as {
        numFound?: unknown;
        num_found?: unknown;
        docs?: unknown;
    };

    const total =
        typeof result.numFound === 'number'
            ? result.numFound
            : result.num_found;

    const rawCount = Array.isArray(result.docs) ? result.docs.length : 0;

    return {
        books,
        hasMore:
            typeof total === 'number'
                ? page * TRENDING_PAGE_SIZE < total
                : rawCount === TRENDING_PAGE_SIZE,
    };
}