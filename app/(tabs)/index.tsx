import { router } from 'expo-router';
import * as Network from 'expo-network';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    useWindowDimensions,
} from 'react-native';

import { BookCover } from '../../src/components/BookCover';
import { BookListItem } from '../../src/components/BookListItem';
import { ContentState } from '../../src/components/ContentState';
import {
    getTrendingPage,
    searchBooks,
} from '../../src/features/books/openLibrary';
import type { BookSummary } from '../../src/features/books/types';
import { colors } from '../../src/theme/colors';

type LoadState = 'loading' | 'ready' | 'empty' | 'offline' | 'error';
type SearchState = 'idle' | 'loading' | 'ready' | 'offline' | 'error';

type FeaturedSlide = {
    book: BookSummary;
    writeUp: string;
};

const TRENDING_WRITE_UP = 'Explore this trending find and add it to your catalog.';

const MOODS = [
    { label: 'Cozy', subject: 'cozy' },
    { label: 'Mystery', subject: 'mystery' },
    { label: 'Fantasy', subject: 'fantasy' },
    { label: 'Historical', subject: 'historical fiction' },
    { label: 'Romance', subject: 'romance' },
] as const;

async function failureState(): Promise<'offline' | 'error'> {
    try {
        const network = await Network.getNetworkStateAsync();

        if (
            network.isConnected === false ||
            network.isInternetReachable === false
        ) {
            return 'offline';
        }
    } catch {
        // The API error can still be shown if network status is unavailable.
    }

    return 'error';
}

function openBook(book: BookSummary) {
    router.push({
        pathname: '/book-details',
        params: { workId: book.workId },
    });
}

export default function DiscoverScreen() {
    const { width: windowWidth } = useWindowDimensions();
    const contentWidth = Math.min(windowWidth, 680);
    const slideWidth = Math.min(230, Math.round(contentWidth * 0.66));

    const scrollX = useRef(new Animated.Value(0)).current;

    const homeControllerRef = useRef<AbortController | null>(null);
    const nextPageRef = useRef(2);
    const hasMoreRef = useRef(false);
    const loadingMoreRef = useRef(false);
    const seenWorkIdsRef = useRef(new Set<string>());

    const [loadingMore, setLoadingMore] = useState(false);
    const [loadMoreError, setLoadMoreError] = useState(false);

    const [query, setQuery] = useState('');
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [searchAttempt, setSearchAttempt] = useState(0);
    const [searchState, setSearchState] = useState<SearchState>('idle');
    const [searchResults, setSearchResults] = useState<BookSummary[]>([]);

    const [homeAttempt, setHomeAttempt] = useState(0);
    const [homeState, setHomeState] = useState<LoadState>('loading');
    const [featured, setFeatured] = useState<FeaturedSlide[]>([]);
    const [moreBooks, setMoreBooks] = useState<BookSummary[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);

    const isSearching = query.trim().length > 0;
    const activeSlide = featured[activeIndex];

    // Load real books for the home view. One failed featured search does not
    // prevent the other featured books from appearing.
    useEffect(() => {
        let active = true;
        const controller = new AbortController();

        homeControllerRef.current = controller;
        nextPageRef.current = 2;
        hasMoreRef.current = false;
        loadingMoreRef.current = false;
        seenWorkIdsRef.current = new Set();
        setLoadingMore(false);
        setLoadMoreError(false);

        async function loadHome() {
            setHomeState('loading');

            try {
                const firstPage = await getTrendingPage(1, controller.signal);

                if (!active) return;

                seenWorkIdsRef.current = new Set(
                    firstPage.books.map((book) => book.workId)
                );
                hasMoreRef.current = firstPage.hasMore;

                setFeatured(
                    firstPage.books.map((book) => ({
                        book,
                        writeUp: TRENDING_WRITE_UP,
                    }))
                );

                setMoreBooks(firstPage.books.slice(3, 13));
                setActiveIndex(0);
                scrollX.setValue(0);

                setHomeState(firstPage.books.length ? 'ready' : 'empty');
            } catch {
                if (!active || controller.signal.aborted) return;

                const state = await failureState();
                if (active) setHomeState(state);
            }
        }

        void loadHome();

        return () => {
            active = false;
            controller.abort();

            if (homeControllerRef.current === controller) {
                homeControllerRef.current = null;
            }
        };
    }, [homeAttempt, scrollX]);

    async function loadMore() {
        const controller = homeControllerRef.current;

        if (
            homeState !== 'ready' ||
            !controller ||
            controller.signal.aborted ||
            !hasMoreRef.current ||
            loadingMoreRef.current
        ) {
            return;
        }

        loadingMoreRef.current = true;
        setLoadingMore(true);
        setLoadMoreError(false);

        try {
            const page = await getTrendingPage(
                nextPageRef.current,
                controller.signal
            );

            if (
                controller.signal.aborted ||
                homeControllerRef.current !== controller
            ) {
                return;
            }

            nextPageRef.current += 1;
            hasMoreRef.current = page.hasMore;

            const newBooks = page.books.filter((book) => {
                if (seenWorkIdsRef.current.has(book.workId)) return false;
                seenWorkIdsRef.current.add(book.workId);
                return true;
            });

            setFeatured((current) => [
                ...current,
                ...newBooks.map((book) => ({
                    book,
                    writeUp: TRENDING_WRITE_UP,
                })),
            ]);
        } catch {
            if (!controller.signal.aborted) {
                setLoadMoreError(true);
            }
        } finally {
            if (homeControllerRef.current === controller) {
                loadingMoreRef.current = false;
                setLoadingMore(false);
            }
        }
    }


    // Typing starts a 450 ms timer. Changing the text cancels both the timer
    // and any request that was already in progress.
    useEffect(() => {
        const trimmed = query.trim();

        if (trimmed.length < 2) {
            setSearchResults([]);
            setSearchState('idle');
            return;
        }

        let active = true;
        const controller = new AbortController();

        setSearchState('loading');

        const timer = setTimeout(async () => {
            try {
                const apiQuery = selectedSubject
                    ? `subject:"${selectedSubject}"`
                    : trimmed;

                const books = await searchBooks(apiQuery, controller.signal);

                if (active) {
                    setSearchResults(books);
                    setSearchState('ready');
                }
            } catch {
                if (!active || controller.signal.aborted) {
                    return;
                }

                const state = await failureState();

                if (active) {
                    setSearchState(state);
                }
            }
        }, 450);

        return () => {
            active = false;
            clearTimeout(timer);
            controller.abort();
        };
    }, [query, selectedSubject, searchAttempt]);

    function changeQuery(text: string) {
        setSelectedSubject(null);
        setQuery(text);
    }

    function searchMood(label: string, subject: string) {
        setSelectedSubject(subject);
        setQuery(label);
    }

    function clearSearch() {
        setSelectedSubject(null);
        setQuery('');
    }

    function searchAll() {
        setSelectedSubject('fiction');
        setQuery('Fiction');
    }

    function renderHome() {
        if (homeState === 'loading') {
            return (
                <ContentState
                    kind="loading"
                    title="Finding books"
                    message="Gathering a few books to explore."
                />
            );
        }

        if (homeState === 'offline' || homeState === 'error') {
            return (
                <ContentState
                    kind={homeState}
                    title={
                        homeState === 'offline'
                            ? 'Discover needs internet'
                            : 'Could not load books'
                    }
                    message={
                        homeState === 'offline'
                            ? 'Your saved catalog is still available offline.'
                            : 'Please try loading Discover again.'
                    }
                    actionLabel={
                        homeState === 'offline' ? 'Open My Catalog' : 'Try again'
                    }
                    onAction={
                        homeState === 'offline'
                            ? () => router.push('/catalog')
                            : () => setHomeAttempt((attempt) => attempt + 1)
                    }
                />
            );
        }

        if (homeState === 'empty') {
            return (
                <ContentState
                    kind="empty"
                    title="No books to show yet"
                    message="Try loading the featured books again."
                    actionLabel="Try again"
                    onAction={() => setHomeAttempt((attempt) => attempt + 1)}
                />
            );
        }

        return (
            <>
                {featured.length > 0 ? (
                    <View style={styles.featuredSection}>
                        <Text style={styles.featuredEyebrow}>TRENDING</Text>

                        <Animated.FlatList
                            horizontal
                            data={featured}
                            keyExtractor={(slide) => slide.book.workId}
                            showsHorizontalScrollIndicator={false}
                            snapToInterval={slideWidth}
                            decelerationRate="fast"
                            scrollEventThrottle={16}
                            contentContainerStyle={{
                                paddingHorizontal: (contentWidth - slideWidth) / 2,
                            }}
                            onScroll={Animated.event(
                                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                                { useNativeDriver: true }
                            )}
                            onMomentumScrollEnd={(event) => {
                                const index = Math.round(
                                    event.nativeEvent.contentOffset.x / slideWidth
                                );

                                setActiveIndex(
                                    Math.max(0, Math.min(index, featured.length - 1))
                                );
                                if (index >= featured.length - 4) {
                                    void loadMore();
                                }
                            }}
                            renderItem={({ item, index }) => {
                                const scale = scrollX.interpolate({
                                    inputRange: [
                                        (index - 1) * slideWidth,
                                        index * slideWidth,
                                        (index + 1) * slideWidth,
                                    ],
                                    outputRange: [0.83, 1, 0.83],
                                    extrapolate: 'clamp',
                                });

                                const lift = scrollX.interpolate({
                                    inputRange: [
                                        (index - 1) * slideWidth,
                                        index * slideWidth,
                                        (index + 1) * slideWidth,
                                    ],
                                    outputRange: [12, 0, 12],
                                    extrapolate: 'clamp',
                                });

                                return (
                                    <Animated.View
                                        style={[
                                            styles.slide,
                                            {
                                                width: slideWidth,
                                                transform: [{ scale }, { translateY: lift }],
                                            },
                                        ]}
                                    >
                                        <Pressable
                                            onPress={() => openBook(item.book)}
                                            accessibilityRole="button"
                                            accessibilityLabel={`Open ${item.book.title}`}
                                        >
                                            <BookCover
                                                title={item.book.title}
                                                uri={item.book.coverUrl}
                                                width={Math.min(178, slideWidth - 36)}
                                                height={250}
                                                style={styles.featuredCover}
                                            />
                                        </Pressable>
                                    </Animated.View>
                                );
                            }}
                        />

                        {activeSlide ? (
                            <Pressable
                                onPress={() => openBook(activeSlide.book)}
                                accessibilityRole="button"
                                accessibilityLabel={`Read about ${activeSlide.book.title}`}
                                style={styles.activeDescription}
                            >
                                <Text style={styles.featuredTitle} numberOfLines={2}>
                                    {activeSlide.book.title}
                                </Text>

                                <Text style={styles.featuredAuthor} numberOfLines={1}>
                                    {activeSlide.book.authors.length
                                        ? activeSlide.book.authors.join(', ')
                                        : 'Unknown author'}
                                </Text>

                                <Text style={styles.featuredWriteUp} numberOfLines={2}>
                                    {activeSlide.writeUp}
                                </Text>
                            </Pressable>
                        ) : null}

                        <Text style={styles.swipeHint}>
                            {activeIndex + 1} of {featured.length}
                            {hasMoreRef.current ? '+' : ''}
                        </Text>

                        {loadingMore ? (
                            <Text style={styles.swipeHint}>Loading more books…</Text>
                        ) : null}

                        {loadMoreError ? (
                            <Pressable onPress={() => void loadMore()}>
                                <Text style={styles.swipeHint}>Could not load more. Tap to retry.</Text>
                            </Pressable>
                        ) : null}

                        <Text style={styles.swipeHint}>Swipe to explore</Text>
                    </View>
                ) : null}

                <View style={styles.belowCarousel}>
                    <View style={styles.sectionHeading}>
                        <Text style={styles.sectionTitle}>Explore by mood</Text>
                        <Pressable onPress={searchAll} accessibilityRole="button">
                            <Text style={styles.seeAll}>See all</Text>
                        </Pressable>
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.moods}
                    >
                        {MOODS.map((mood, index) => (
                            <Pressable
                                key={mood.label}
                                onPress={() => searchMood(mood.label, mood.subject)}
                                accessibilityRole="button"
                                style={[
                                    styles.moodChip,
                                    index === 0 && styles.firstMoodChip,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.moodText,
                                        index === 0 && styles.firstMoodText,
                                    ]}
                                >
                                    {mood.label}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>

                    <View style={styles.sectionHeading}>
                        <Text style={styles.sectionTitle}>More to discover</Text>
                        <Pressable onPress={searchAll} accessibilityRole="button">
                            <Text style={styles.seeAll}>See all</Text>
                        </Pressable>
                    </View>

                    {moreBooks.length ? (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.moreBooks}
                        >
                            {moreBooks.map((book) => (
                                <Pressable
                                    key={book.workId}
                                    onPress={() => openBook(book)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Open ${book.title}`}
                                >
                                    <BookCover
                                        title={book.title}
                                        uri={book.coverUrl}
                                        width={94}
                                        height={136}
                                    />
                                </Pressable>
                            ))}
                        </ScrollView>
                    ) : (
                        <Text style={styles.sectionMessage}>
                            Search above to find more books.
                        </Text>
                    )}
                </View>
            </>
        );
    }

    function renderSearch() {
        if (query.trim().length < 2) {
            return (
                <ContentState
                    kind="empty"
                    title="Start discovering"
                    message="Enter at least two characters of a title, author, or ISBN."
                />
            );
        }

        if (searchState === 'loading') {
            return (
                <ContentState
                    kind="loading"
                    title="Searching books"
                    message="Looking through Open Library."
                />
            );
        }

        if (searchState === 'offline' || searchState === 'error') {
            return (
                <ContentState
                    kind={searchState}
                    title={
                        searchState === 'offline'
                            ? 'Search needs internet'
                            : 'Search did not work'
                    }
                    message={
                        searchState === 'offline'
                            ? 'You can still browse your saved catalog.'
                            : 'Please check your connection and try again.'
                    }
                    actionLabel="Try again"
                    onAction={() => setSearchAttempt((attempt) => attempt + 1)}
                />
            );
        }

        if (searchState === 'ready' && searchResults.length === 0) {
            return (
                <ContentState
                    kind="empty"
                    title="No books found"
                    message="Try a different title, author, or ISBN."
                />
            );
        }

        return (
            <View style={styles.results}>
                <Text style={styles.resultsHeading}>
                    {selectedSubject ? `${query} books` : 'Search results'}
                </Text>

                {searchResults.map((book) => (
                    <BookListItem
                        key={book.workId}
                        title={book.title}
                        authors={book.authors}
                        publicationYear={book.firstPublishYear}
                        coverUri={book.coverUrl}
                        onPress={() => openBook(book)}
                    />
                ))}
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.page}
            keyboardShouldPersistTaps="handled"
        >
            <View style={styles.header}>
                <Text style={styles.brand}>Book Finds</Text>
                <Text style={styles.subtitle}>
                    Discover books. Build your story.
                </Text>

                <View style={styles.searchBox}>
                    <Text style={styles.searchSymbol} accessibilityElementsHidden>
                        ⌕
                    </Text>

                    <TextInput
                        value={query}
                        onChangeText={changeQuery}
                        placeholder="Search title, author, or ISBN"
                        placeholderTextColor={colors.secondaryText}
                        returnKeyType="search"
                        style={styles.searchInput}
                        accessibilityLabel="Search title, author, or ISBN"
                    />

                    {isSearching ? (
                        <Pressable
                            onPress={clearSearch}
                            accessibilityRole="button"
                            accessibilityLabel="Clear search"
                            hitSlop={10}
                        >
                            <Text style={styles.clearSymbol}>×</Text>
                        </Pressable>
                    ) : null}
                </View>

            </View>

            {isSearching ? renderSearch() : renderHome()}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.background,
    },
    page: {
        width: '100%',
        maxWidth: 680,
        alignSelf: 'center',
        paddingBottom: 32,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 26,
        paddingBottom: 22,
        alignItems: 'center',
    },
    brand: {
        color: colors.text,
        fontFamily: 'Georgia',
        fontSize: 42,
        fontWeight: '700',
    },
    subtitle: {
        color: colors.secondaryText,
        fontFamily: 'Georgia',
        fontSize: 16,
        marginTop: 2,
    },
    searchBox: {
        width: '100%',
        minHeight: 52,
        borderWidth: 1,
        borderColor: colors.secondaryText,
        borderRadius: 17,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginTop: 23,
    },
    searchSymbol: {
        color: colors.secondaryText,
        fontSize: 26,
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        color: colors.text,
        fontSize: 15,
        paddingVertical: 10,
    },
    clearSymbol: {
        color: colors.secondaryText,
        fontSize: 24,
        marginLeft: 8,
    },
    featuredSection: {
        backgroundColor: colors.teal,
        paddingTop: 18,
        paddingBottom: 20,
        alignItems: 'center',
        overflow: 'hidden',
    },
    featuredEyebrow: {
        color: colors.white,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 2,
        marginBottom: 8,
    },
    slide: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 276,
    },
    featuredCover: {
        borderRadius: 9,
    },
    activeDescription: {
        alignItems: 'center',
        paddingHorizontal: 32,
        minHeight: 110,
        justifyContent: 'center',
    },
    featuredTitle: {
        color: colors.white,
        fontFamily: 'Georgia',
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
    },
    featuredAuthor: {
        color: colors.white,
        fontSize: 15,
        marginTop: 3,
        textAlign: 'center',
    },
    featuredWriteUp: {
        color: colors.white,
        fontSize: 13,
        lineHeight: 18,
        marginTop: 9,
        maxWidth: 340,
        textAlign: 'center',
    },

    swipeHint: {
        color: colors.white,
        fontSize: 12,
        marginTop: 8,
    },
    belowCarousel: {
        paddingTop: 22,
    },
    sectionHeading: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingHorizontal: 22,
        marginBottom: 13,
    },
    sectionTitle: {
        color: colors.text,
        fontFamily: 'Georgia',
        fontSize: 23,
        fontWeight: '700',
    },
    seeAll: {
        color: colors.text,
        fontSize: 13,
    },
    moods: {
        gap: 8,
        paddingHorizontal: 22,
        paddingBottom: 25,
    },
    moodChip: {
        backgroundColor: colors.paleBlue,
        borderRadius: 19,
        paddingHorizontal: 17,
        paddingVertical: 10,
    },
    firstMoodChip: {
        backgroundColor: colors.olive,
    },
    moodText: {
        color: colors.text,
        fontSize: 13,
    },
    firstMoodText: {
        color: colors.white,
    },
    moreBooks: {
        gap: 11,
        paddingHorizontal: 22,
    },
    sectionMessage: {
        color: colors.secondaryText,
        paddingHorizontal: 22,
        paddingBottom: 20,
    },
    results: {
        paddingHorizontal: 22,
    },
    resultsHeading: {
        color: colors.text,
        fontFamily: 'Georgia',
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 8,
    },
});