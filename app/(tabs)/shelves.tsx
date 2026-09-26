import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { BookCover } from '../../src/components/BookCover';
import { ContentState } from '../../src/components/ContentState';
import { getOfflineCoverUri } from '../../src/features/books/coverStorage';
import { openCatalogDatabase } from '../../src/features/catalog/database';
import { groupShelves } from '../../src/features/catalog/groupShelves';
import { listSavedBooks } from '../../src/features/catalog/repository';
import { selectCatalogBooks } from '../../src/features/catalog/selectCatalogBooks';
import type { SavedBook } from '../../src/features/catalog/types';
import { useShelvesAvailability } from '../../src/hooks/useShelvesAvailability';
import { colors } from '../../src/theme/colors';

type LoadState = 'loading' | 'ready' | 'error';

export default function ShelvesScreen() {
    const shelvesAvailable = useShelvesAvailability();

    const [books, setBooks] = useState<SavedBook[]>([]);
    const [loadState, setLoadState] = useState<LoadState>('loading');
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [query, setQuery] = useState('');

    // The hidden tab is not a security boundary: a route can also be opened
    // directly. Send phones and narrow tablet windows to My Catalog.
    useEffect(() => {
        if (shelvesAvailable === false) {
            router.replace('/catalog');
        }
    }, [shelvesAvailable]);

    useFocusEffect(
        useCallback(() => {
            if (shelvesAvailable !== true) {
                return;
            }

            let active = true;

            async function load() {
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

            void load();

            return () => {
                active = false;
            };
        }, [shelvesAvailable, loadAttempt])
    );

    const matchingBooks = useMemo(
        () =>
            selectCatalogBooks(books, {
                query,
                status: 'all',
                author: null,
                minRating: null,
                sort: 'saved_newest',
            }),
        [books, query]
    );

    const shelves = useMemo(
        () => groupShelves(matchingBooks),
        [matchingBooks]
    );

    if (shelvesAvailable === null) {
        return (
            <View style={styles.screen}>
                <ContentState
                    kind="loading"
                    title="Opening Shelves"
                    message="Checking the available screen size."
                />
            </View>
        );
    }

    if (shelvesAvailable === false) {
        return null;
    }

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.page}
            keyboardShouldPersistTaps="handled"
        >
            <View style={styles.header}>
                <View>
                    <Text style={styles.eyebrow}>BOOK FINDS</Text>
                    <Text style={styles.title}>My Shelves</Text>
                </View>

                <Pressable
                    onPress={() => router.push('/catalog')}
                    accessibilityRole="button"
                    style={styles.allBooksButton}
                >
                    <Text style={styles.allBooksText}>All books</Text>
                </Pressable>
            </View>

            <View style={styles.toolbar}>
                <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search in my library"
                    placeholderTextColor={colors.secondaryText}
                    accessibilityLabel="Search books on shelves"
                    style={styles.searchInput}
                />
            </View>

            {loadState === 'loading' ? (
                <ContentState
                    kind="loading"
                    title="Arranging your shelves"
                    message="Loading saved books from this device."
                />
            ) : loadState === 'error' ? (
                <ContentState
                    kind="error"
                    title="Could not load Shelves"
                    message="Please try reading your saved books again."
                    actionLabel="Try again"
                    onAction={() => setLoadAttempt((attempt) => attempt + 1)}
                />
            ) : books.length === 0 ? (
                <ContentState
                    kind="empty"
                    title="Your shelves are empty"
                    message="Save a book from Discover to place it on a shelf."
                    actionLabel="Discover books"
                    onAction={() => router.push('/')}
                />
            ) : matchingBooks.length === 0 ? (
                <ContentState
                    kind="empty"
                    title="No matching books"
                    message="Try another title, author, ISBN, or note."
                    actionLabel="Clear search"
                    onAction={() => setQuery('')}
                />
            ) : (
                <View style={styles.shelfCollection}>
                    {shelves.map((shelf) => (
                        <View key={shelf.status} style={styles.shelfSection}>
                            <View style={styles.shelfHeading}>
                                <Text style={styles.shelfTitle}>
                                    {shelf.title}
                                </Text>
                                <Text style={styles.shelfCount}>
                                    {shelf.books.length}
                                </Text>
                            </View>

                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.bookPositions}
                            >
                                {shelf.books.length ? (
                                    shelf.books.map((book) => (
                                        <Pressable
                                            key={book.workId}
                                            onPress={() =>
                                                router.push({
                                                    pathname: '/book-details',
                                                    params: { workId: book.workId },
                                                })
                                            }
                                            accessibilityRole="button"
                                            accessibilityLabel={`Open ${book.title}`}
                                            style={styles.bookPosition}
                                        >
                                            <BookCover
                                                title={book.title}
                                                uri={
                                                    getOfflineCoverUri(book.workId) ??
                                                    book.coverUrl
                                                }
                                                width={112}
                                                height={166}
                                            />
                                        </Pressable>
                                    ))
                                ) : (
                                    <Text style={styles.emptyShelfText}>
                                        No books here yet
                                    </Text>
                                )}
                            </ScrollView>

                            <View style={styles.shelfPlank} />
                        </View>
                    ))}
                </View>
            )}
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
        maxWidth: 1280,
        alignSelf: 'center',
        paddingBottom: 45,
        flexGrow: 1,
    },
    header: {
        backgroundColor: colors.teal,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 34,
        paddingVertical: 24,
    },
    eyebrow: {
        color: colors.white,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 2,
    },
    title: {
        color: colors.white,
        fontFamily: 'Georgia',
        fontSize: 34,
        fontWeight: '700',
        marginTop: 4,
    },
    allBooksButton: {
        backgroundColor: colors.paleGreen,
        borderRadius: 17,
        paddingHorizontal: 17,
        paddingVertical: 10,
    },
    allBooksText: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '700',
    },
    toolbar: {
        paddingHorizontal: 34,
        paddingTop: 20,
        paddingBottom: 4,
    },
    searchInput: {
        backgroundColor: colors.paleBlue,
        borderRadius: 16,
        color: colors.text,
        fontSize: 15,
        minHeight: 49,
        paddingHorizontal: 17,
    },
    shelfCollection: {
        paddingHorizontal: 34,
        paddingTop: 10,
    },
    shelfSection: {
        marginTop: 25,
    },
    shelfHeading: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 10,
        marginBottom: 16,
        paddingHorizontal: 5,
    },
    shelfTitle: {
        color: colors.text,
        fontFamily: 'Georgia',
        fontSize: 23,
        fontWeight: '700',
    },
    shelfCount: {
        color: colors.secondaryText,
        fontSize: 14,
    },
    bookPositions: {
        alignItems: 'flex-end',
        gap: 29,
        minHeight: 178,
        paddingHorizontal: 14,
        paddingBottom: 3,
    },
    bookPosition: {
        justifyContent: 'flex-end',
    },
    emptyShelfText: {
        alignSelf: 'center',
        color: colors.secondaryText,
        fontSize: 14,
        paddingVertical: 25,
    },
    shelfPlank: {
        height: 13,
        borderRadius: 7,
        backgroundColor: colors.paleGreen,
    },
});