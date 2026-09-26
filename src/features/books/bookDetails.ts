import type { BookDetails } from './types';

const API_ROOT = 'https://openlibrary.org';

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        ? (value as JsonRecord)
        : {};
}

function strings(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean);
}

function firstString(value: unknown): string | null {
    return strings(value)[0] ?? null;
}

function description(value: unknown): string | null {
    const raw =
        typeof value === 'string' ? value : record(value).value;

    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

function yearFromDate(value: unknown): number | null {
    if (typeof value !== 'string') {
        return null;
    }

    const match = /\b(1\d{3}|20\d{2}|2100)\b/.exec(value);
    return match ? Number(match[1]) : null;
}

function coverId(value: unknown): number | null {
    if (!Array.isArray(value)) {
        return null;
    }

    const id = value.find(
        (item) => typeof item === 'number' && Number.isInteger(item) && item > 0
    );

    return typeof id === 'number' ? id : null;
}

function editionScore(edition: JsonRecord): number {
    let score = 0;

    if (firstString(edition.isbn_13) || firstString(edition.isbn_10)) {
        score += 2;
    }

    if (firstString(edition.publishers)) {
        score += 2;
    }

    if (coverId(edition.covers)) {
        score += 1;
    }

    return score;
}

function chooseEdition(payload: unknown): JsonRecord {
    const entries = record(payload).entries;

    if (!Array.isArray(entries)) {
        return {};
    }

    let selected: JsonRecord = {};
    let highestScore = -1;

    for (const entry of entries) {
        const candidate = record(entry);
        const score = editionScore(candidate);

        if (score > highestScore) {
            selected = candidate;
            highestScore = score;
        }
    }

    return selected;
}

export function parseBookDetails(
    workId: string,
    workPayload: unknown,
    editionsPayload: unknown,
    authorNames: string[]
): BookDetails {
    const work = record(workPayload);
    const edition = chooseEdition(editionsPayload);

    const rawTitle =
        typeof work.title === 'string'
            ? work.title
            : typeof edition.title === 'string'
                ? edition.title
                : '';

    const title = rawTitle.trim() || 'Untitled book';

    const subjects = strings(work.subjects);
    const editionSubjects = strings(edition.subjects);
    const categories = [...new Set(subjects.length ? subjects : editionSubjects)]
        .slice(0, 8);

    const id = coverId(work.covers) ?? coverId(edition.covers);
    const coverUrl = id
        ? `https://covers.openlibrary.org/b/id/${id}-L.jpg?default=false`
        : null;

    const editionKey = edition.key;
    const editionId =
        typeof editionKey === 'string' &&
            /^\/books\/OL\d+M$/.test(editionKey)
            ? editionKey
            : null;

    return {
        workId,
        title,
        authors: [...new Set(authorNames.map((name) => name.trim()).filter(Boolean))],
        firstPublishYear:
            yearFromDate(work.first_publish_date) ??
            yearFromDate(edition.publish_date),
        coverUrl,
        description:
            description(work.description) ?? description(edition.description),
        categories,
        publisher: firstString(edition.publishers),
        isbn:
            firstString(edition.isbn_13) ??
            firstString(edition.isbn_10),
        editionId,
    };
}

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
    const response = await fetch(url, { signal });

    if (!response.ok) {
        throw new Error(`Open Library request failed (${response.status})`);
    }

    return response.json() as Promise<unknown>;
}

export async function fetchBookDetails(
    workId: string,
    signal?: AbortSignal
): Promise<BookDetails> {
    if (!/^\/works\/OL\d+W$/.test(workId)) {
        throw new Error('Invalid Open Library work ID');
    }

    const workPayload = await getJson(`${API_ROOT}${workId}.json`, signal);

    // A work can still be displayed if its editions request fails.
    const editionsPayload = await getJson(
        `${API_ROOT}${workId}/editions.json?limit=20`,
        signal
    ).catch((error: unknown) => {
        if (signal?.aborted) {
            throw error;
        }

        return null;
    });

    const work = record(workPayload);
    const authors = Array.isArray(work.authors) ? work.authors : [];

    const authorKeys = authors
        .map((item) => record(record(item).author).key)
        .filter(
            (key): key is string =>
                typeof key === 'string' && /^\/authors\/OL\d+A$/.test(key)
        )
        .slice(0, 3);

    const authorNames = await Promise.all(
        authorKeys.map(async (key) => {
            try {
                const author = record(
                    await getJson(`${API_ROOT}${key}.json`, signal)
                );

                return typeof author.name === 'string' ? author.name : null;
            } catch {
                return null;
            }
        })
    );

    return parseBookDetails(
        workId,
        workPayload,
        editionsPayload,
        authorNames.filter((name): name is string => name !== null)
    );
}