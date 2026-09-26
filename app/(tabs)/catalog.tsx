import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
    FlatList,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { BookListItem } from '../../src/components/BookListItem';
import { ContentState } from '../../src/components/ContentState';
import { getOfflineCoverUri } from '../../src/features/books/coverStorage';
import { openCatalogDatabase } from '../../src/features/catalog/database';
import { listSavedBooks } from '../../src/features/catalog/repository';
import {
    catalogAuthors,
    selectCatalogBooks,
    UNKNOWN_AUTHOR,
    type CatalogSort,
} from '../../src/features/catalog/selectCatalogBooks';
import type {
    ReadingStatus,
    SavedBook,
} from '../../src/features/catalog/types';
import { colors } from '../../src/theme/colors';

type LoadState = 'loading' | 'ready' | 'error';

const STATUS_OPTIONS: {
    value: ReadingStatus | 'all';
    label: string;
}[] = [
        { value: 'all', label: 'All' },
        { value: 'want_to_read', label: 'Want to read' },
        { value: 'reading', label: 'Reading' },
        { value: 'finished', label: 'Finished' },
        { value: 'did_not_finish', label: 'Did not finish' },
    ];

const STATUS_LABELS: Record<ReadingStatus, string> = {
    want_to_read: 'Want to read',
    reading: 'Reading',
    finished: 'Finished',
    did_not_finish: 'Did not finish',
};

const SORT_OPTIONS: { value: CatalogSort; label: string }[] = [
    { value: 'saved_newest', label: 'Recently saved' },
    { value: 'saved_oldest', label: 'Oldest saved' },
    { value: 'author_az', label: 'Author A–Z' },
    { value: 'rating_high', label: 'Top rated' },
];

function FilterChip({
    label,
    selected,
    onPress,
}: {
    label: string;
    selected: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[
                styles.chip,
                selected && styles.selectedChip,
            ]}
        >
            <Text
                style={[
                    styles.chipText,
                    selected && styles.selectedChipText,
                ]}
            >
                {label}
            </Text>
        </Pressable>
    );
}

export default function CatalogScreen() {
    const [books, setBooks] = useState<SavedBook[]>([]);
    const [loadState, setLoadState] = useState<LoadState>('loading');
    const [loadAttempt, setLoadAttempt] = useState(0);

    const [query, setQuery] = useState('');
    const [status, setStatus] = useState<ReadingStatus | 'all'>('all');
    const [author, setAuthor] = useState<string | null>(null);
    const [minRating, setMinRating] = useState<number | null>(null);
    const [sort, setSort] = useState<CatalogSort>('saved_newest');

    // Reload when returning from a book. Edits and removals then appear
    // without an internet request or a manual refresh.
    useFocusEffect(
        useCallback(() => {
            let active = true;

            async function loadCatalog() {
                setLoadState('loading');

                try {
                    const db = await openCatalogDatabase();
                    let saved: SavedBook[];

                    try {
                        saved = await listSavedBooks(db);
                    } finally {
                        await db.closeAsync();
                    }

                    if (active) {
                        setBooks(saved);
                        setLoadState('ready');
                    }
                } catch {
                    if (active) {
                        setLoadState('error');
                    }
                }
            }

            void loadCatalog();

            return () => {
                active = false;
            };
        }, [loadAttempt])
    );

    const authors = useMemo(() => catalogAuthors(books), [books]);

    const visibleBooks = useMemo(
        () =>
            selectCatalogBooks(books, {
                query,
                status,
                author,
                minRating,
                sort,
            }),
        [books, query, status, author, minRating, sort]
    );

    const hasFilters =
        query.trim() !== '' ||
        status !== 'all' ||
        author !== null ||
        minRating !== null ||
        sort !== 'saved_newest';

    function clearFilters() {
        setQuery('');
        setStatus('all');
        setAuthor(null);
        setMinRating(null);
        setSort('saved_newest');
    }

    function openBook(book: SavedBook) {
        router.push({
            pathname: '/book-details',
            params: { workId: book.workId },
        });
    }

    return (
        <FlatList
            style={styles.screen}
            contentContainerStyle={styles.page}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            data={loadState === 'ready' ? visibleBooks : []}
            keyExtractor={(book) => book.workId}
            renderItem={({ item }) => (
                <View style={styles.bookRow}>
                    <BookListItem
                        title={item.title}
                        authors={item.authors}
                        publicationYear={item.firstPublishYear}
                        coverUri={
                            getOfflineCoverUri(item.workId) ?? item.coverUrl
                        }
                        label={`${STATUS_LABELS[item.status]}${item.rating === null ? '' : ` · ${item.rating}/5`
                            }`}
                        onPress={() => openBook(item)}
                    />
                </View>
            )}
            ListHeaderComponent={
                <View>
                    <View style={styles.header}>
                        <Text style={styles.title}>My Catalog</Text>
                        <Text style={styles.subtitle}>
                            Your books, your reading story.
                        </Text>
                    </View>

                    {loadState === 'ready' && books.length > 0 ? (
                        <View style={styles.controls}>
                            <TextInput
                                value={query}
                                onChangeText={setQuery}
                                placeholder="Search your books"
                                placeholderTextColor={colors.secondaryText}
                                accessibilityLabel="Search saved books"
                                style={styles.searchInput}
                            />

                            <Text style={styles.count}>
                                {visibleBooks.length} of {books.length} saved{' '}
                                {books.length === 1 ? 'book' : 'books'}
                            </Text>

                            <Text style={styles.filterHeading}>Reading status</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.chipRow}
                            >
                                {STATUS_OPTIONS.map((option) => (
                                    <FilterChip
                                        key={option.value}
                                        label={option.label}
                                        selected={status === option.value}
                                        onPress={() => setStatus(option.value)}
                                    />
                                ))}
                            </ScrollView>

                            <Text style={styles.filterHeading}>Author</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.chipRow}
                            >
                                <FilterChip
                                    label="All authors"
                                    selected={author === null}
                                    onPress={() => setAuthor(null)}
                                />

                                {authors.map((name) => (
                                    <FilterChip
                                        key={name}
                                        label={
                                            name === UNKNOWN_AUTHOR
                                                ? 'Unknown author'
                                                : name
                                        }
                                        selected={author === name}
                                        onPress={() => setAuthor(name)}
                                    />
                                ))}
                            </ScrollView>

                            <Text style={styles.filterHeading}>Minimum rating</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.chipRow}
                            >
                                <FilterChip
                                    label="Any rating"
                                    selected={minRating === null}
                                    onPress={() => setMinRating(null)}
                                />

                                {[1, 2, 3, 4, 5].map((rating) => (
                                    <FilterChip
                                        key={rating}
                                        label={`${rating}+`}
                                        selected={minRating === rating}
                                        onPress={() => setMinRating(rating)}
                                    />
                                ))}
                            </ScrollView>

                            <Text style={styles.filterHeading}>Sort by</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.chipRow}
                            >
                                {SORT_OPTIONS.map((option) => (
                                    <FilterChip
                                        key={option.value}
                                        label={option.label}
                                        selected={sort === option.value}
                                        onPress={() => setSort(option.value)}
                                    />
                                ))}
                            </ScrollView>

                            {hasFilters ? (
                                <Pressable
                                    onPress={clearFilters}
                                    accessibilityRole="button"
                                    style={styles.clearButton}
                                >
                                    <Text style={styles.clearText}>
                                        Clear search and filters
                                    </Text>
                                </Pressable>
                            ) : null}
                        </View>
                    ) : null}
                </View>
            }
            ListEmptyComponent={
                loadState === 'loading' ? (
                    <ContentState
                        kind="loading"
                        title="Opening your catalog"
                        message="Loading books saved on this device."
                    />
                ) : loadState === 'error' ? (
                    <ContentState
                        kind="error"
                        title="Could not open your catalog"
                        message="Your saved books could not be loaded. Please try again."
                        actionLabel="Try again"
                        onAction={() => setLoadAttempt((value) => value + 1)}
                    />
                ) : books.length === 0 ? (
                    <ContentState
                        kind="empty"
                        title="Your catalog is empty"
                        message="Find a book in Discover and save it here."
                        actionLabel="Discover books"
                        onAction={() => router.push('/')}
                    />
                ) : (
                    <ContentState
                        kind="empty"
                        title="No matching books"
                        message="Try another search or change the filters."
                        actionLabel="Clear filters"
                        onAction={clearFilters}
                    />
                )
            }
        />
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
        paddingBottom: 35,
        flexGrow: 1,
    },
    header: {
        backgroundColor: colors.teal,
        paddingHorizontal: 24,
        paddingTop: 30,
        paddingBottom: 26,
    },
    title: {
        color: colors.white,
        fontFamily: 'Georgia',
        fontSize: 36,
        fontWeight: '700',
    },
    subtitle: {
        color: colors.white,
        fontSize: 15,
        marginTop: 5,
    },
    controls: {
        paddingTop: 21,
        paddingBottom: 8,
    },
    searchInput: {
        borderColor: colors.secondaryText,
        borderRadius: 15,
        borderWidth: 1,
        color: colors.text,
        fontSize: 15,
        marginHorizontal: 22,
        minHeight: 50,
        paddingHorizontal: 15,
    },
    count: {
        color: colors.secondaryText,
        fontSize: 13,
        marginHorizontal: 22,
        marginTop: 10,
    },
    filterHeading: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '700',
        marginHorizontal: 22,
        marginTop: 19,
        marginBottom: 9,
    },
    chipRow: {
        gap: 8,
        paddingHorizontal: 22,
    },
    chip: {
        backgroundColor: colors.paleBlue,
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 9,
    },
    selectedChip: {
        backgroundColor: colors.olive,
    },
    chipText: {
        color: colors.text,
        fontSize: 13,
    },
    selectedChipText: {
        color: colors.white,
        fontWeight: '700',
    },
    clearButton: {
        alignSelf: 'flex-start',
        marginHorizontal: 22,
        marginTop: 17,
    },
    clearText: {
        color: colors.olive,
        fontSize: 13,
        fontWeight: '700',
    },
    bookRow: {
        paddingHorizontal: 22,
    },
});