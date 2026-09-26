import {
    router,
    useFocusEffect,
    useLocalSearchParams,
} from 'expo-router';
import * as Network from 'expo-network';
import { useCallback, useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { BookCover } from '../src/components/BookCover';
import { ContentState } from '../src/components/ContentState';
import { getOfflineCoverUri } from '../src/features/books/coverStorage';
import { fetchBookDetails } from '../src/features/books/bookDetails';
import type { BookDetails } from '../src/features/books/types';
import { openCatalogDatabase } from '../src/features/catalog/database';
import { getSavedBook } from '../src/features/catalog/repository';
import type {
    ReadingStatus,
    SavedBook,
} from '../src/features/catalog/types';
import { colors } from '../src/theme/colors';

type ScreenState = 'loading' | 'ready' | 'offline' | 'error';

const STATUS_LABELS: Record<ReadingStatus, string> = {
    want_to_read: 'Want to read',
    reading: 'Reading',
    finished: 'Finished',
    did_not_finish: 'Did not finish',
};

async function connectionError(): Promise<'offline' | 'error'> {
    try {
        const network = await Network.getNetworkStateAsync();

        if (
            network.isConnected === false ||
            network.isInternetReachable === false
        ) {
            return 'offline';
        }
    } catch {
        // If network status is unavailable, show the general error.
    }

    return 'error';
}

function DetailField({
    label,
    value,
}: {
    label: string;
    value: string | null;
}) {
    return (
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <Text style={styles.fieldValue}>{value || 'Not listed'}</Text>
        </View>
    );
}

export default function BookDetailsScreen() {
    const { workId } = useLocalSearchParams<{ workId?: string }>();

    const [attempt, setAttempt] = useState(0);
    const [state, setState] = useState<ScreenState>('loading');
    const [book, setBook] = useState<BookDetails | null>(null);
    const [savedBook, setSavedBook] = useState<SavedBook | null>(null);

    useFocusEffect(
        useCallback(() => {
            let active = true;
            const controller = new AbortController();

            async function loadBook() {
                setState('loading');
                setBook(null);
                setSavedBook(null);

                if (
                    typeof workId !== 'string' ||
                    !/^\/works\/OL\d+W$/.test(workId)
                ) {
                    setState('error');
                    return;
                }

                // Always check local storage first. This also refreshes the Save/Edit
                // button after returning from that screen.
                let localBook: SavedBook | null;

                try {
                    const db = await openCatalogDatabase();

                    try {
                        localBook = await getSavedBook(db, workId);
                    } finally {
                        await db.closeAsync();
                    }
                } catch {
                    if (active) {
                        setState('error');
                    }
                    return;
                }

                if (!active) {
                    return;
                }

                if (localBook) {
                    setSavedBook(localBook);
                    setBook(localBook);
                    setState('ready');
                    return;
                }

                try {
                    const remoteBook = await fetchBookDetails(
                        workId,
                        controller.signal
                    );

                    if (active) {
                        setBook(remoteBook);
                        setState('ready');
                    }
                } catch {
                    if (!active || controller.signal.aborted) {
                        return;
                    }

                    const errorState = await connectionError();

                    if (active) {
                        setState(errorState);
                    }
                }
            }

            void loadBook();

            return () => {
                active = false;
                controller.abort();
            };
        }, [workId, attempt])
    );

    if (state !== 'ready' || !book) {
        const isLoading = state === 'loading';

        return (
            <View style={styles.screen}>
                <ContentState
                    kind={state === 'loading' ? 'loading' : state === 'offline' ? 'offline' : 'error'}
                    title={
                        isLoading
                            ? 'Opening book'
                            : state === 'offline'
                                ? 'Book unavailable offline'
                                : 'Could not open book'
                    }
                    message={
                        isLoading
                            ? 'Loading book details.'
                            : state === 'offline'
                                ? 'Books already saved to your catalog remain available offline.'
                                : 'Please try opening this book again.'
                    }
                    actionLabel={isLoading ? undefined : 'Try again'}
                    onAction={
                        isLoading ? undefined : () => setAttempt((value) => value + 1)
                    }
                />
            </View>
        );
    }

    const coverUri = savedBook
        ? (getOfflineCoverUri(book.workId) ?? book.coverUrl)
        : book.coverUrl;

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.page}
        >
            <View style={styles.hero}>
                <BookCover
                    title={book.title}
                    uri={coverUri}
                    width={172}
                    height={250}
                />

                <Text style={styles.title}>{book.title}</Text>

                <Text style={styles.author}>
                    {book.authors.length
                        ? book.authors.join(', ')
                        : 'Unknown author'}
                </Text>

                {book.firstPublishYear ? (
                    <Text style={styles.year}>
                        First published {book.firstPublishYear}
                    </Text>
                ) : null}
            </View>

            <View style={styles.content}>
                <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                        router.push({
                            pathname: '/save-edit',
                            params: { workId: book.workId },
                        })
                    }
                    style={({ pressed }) => [
                        styles.primaryButton,
                        pressed && styles.pressed,
                    ]}
                >
                    <Text style={styles.primaryButtonText}>
                        {savedBook ? 'Edit in My Catalog' : 'Save to My Catalog'}
                    </Text>
                </Pressable>

                {savedBook ? (
                    <View style={styles.personalSection}>
                        <Text style={styles.heading}>My reading record</Text>

                        <DetailField
                            label="Status"
                            value={STATUS_LABELS[savedBook.status]}
                        />
                        <DetailField
                            label="My rating"
                            value={
                                savedBook.rating === null
                                    ? null
                                    : `${savedBook.rating} / 5`
                            }
                        />

                        {savedBook.notes ? (
                            <DetailField label="Notes" value={savedBook.notes} />
                        ) : null}

                        {savedBook.dateFound ? (
                            <DetailField
                                label="Date found"
                                value={savedBook.dateFound}
                            />
                        ) : null}

                        {savedBook.foundAt ? (
                            <DetailField
                                label="Found through"
                                value={savedBook.foundAt}
                            />
                        ) : null}
                    </View>
                ) : null}

                <Text style={styles.heading}>About this book</Text>
                <Text style={styles.description}>
                    {book.description || 'No description is available for this book.'}
                </Text>

                <View style={styles.metadata}>
                    <DetailField
                        label="Categories"
                        value={
                            book.categories.length
                                ? book.categories.join(', ')
                                : null
                        }
                    />
                    <DetailField label="Publisher" value={book.publisher} />
                    <DetailField label="ISBN" value={book.isbn} />
                </View>
            </View>
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
        paddingBottom: 38,
    },
    hero: {
        backgroundColor: colors.teal,
        alignItems: 'center',
        paddingHorizontal: 26,
        paddingTop: 28,
        paddingBottom: 29,
    },
    title: {
        color: colors.white,
        fontFamily: 'Georgia',
        fontSize: 27,
        fontWeight: '700',
        marginTop: 18,
        textAlign: 'center',
    },
    author: {
        color: colors.white,
        fontSize: 16,
        marginTop: 6,
        textAlign: 'center',
    },
    year: {
        color: colors.white,
        fontSize: 13,
        marginTop: 9,
    },
    content: {
        paddingHorizontal: 24,
        paddingTop: 22,
    },
    primaryButton: {
        alignItems: 'center',
        backgroundColor: colors.olive,
        borderRadius: 22,
        paddingVertical: 14,
        marginBottom: 25,
    },
    pressed: {
        opacity: 0.7,
    },
    primaryButtonText: {
        color: colors.white,
        fontSize: 15,
        fontWeight: '700',
    },
    heading: {
        color: colors.text,
        fontFamily: 'Georgia',
        fontSize: 23,
        fontWeight: '700',
        marginBottom: 12,
    },
    description: {
        color: colors.text,
        fontSize: 15,
        lineHeight: 23,
        marginBottom: 26,
    },
    personalSection: {
        borderBottomColor: colors.paleGreen,
        borderBottomWidth: 1,
        marginBottom: 24,
        paddingBottom: 12,
    },
    metadata: {
        gap: 15,
    },
    field: {
        marginBottom: 12,
    },
    fieldLabel: {
        color: colors.secondaryText,
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    fieldValue: {
        color: colors.text,
        fontSize: 15,
        lineHeight: 21,
    },
});