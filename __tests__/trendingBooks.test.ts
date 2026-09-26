import { getTrendingPage } from '../src/features/books/openLibrary';

const originalFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = originalFetch;
});

test('requests trending books and reports another available page', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
            numFound: 21,
            docs: [
                {
                    key: '/works/OL123W',
                    title: 'Example Book',
                    author_name: ['Example Author'],
                    first_publish_year: 2020,
                    cover_i: 1234,
                },
            ],
        }),
    });

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const page = await getTrendingPage(1);

    expect(page.books).toHaveLength(1);
    expect(page.books[0].title).toBe('Example Book');
    expect(page.hasMore).toBe(true);

    const requestedUrl = String(fetchMock.mock.calls[0][0]);
    expect(requestedUrl).toContain('sort=trending');
    expect(requestedUrl).toContain('page=1');
});

test('stops paging when the final page is reached', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
            numFound: 21,
            docs: [],
        }),
    }) as unknown as typeof fetch;

    const page = await getTrendingPage(2);

    expect(page.hasMore).toBe(false);
});

test('rejects an invalid page number', async () => {
    await expect(getTrendingPage(0)).rejects.toThrow(
        'Page must be a positive whole number'
    );
});