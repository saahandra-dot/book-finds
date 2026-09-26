import { router, useLocalSearchParams } from 'expo-router';
import * as Network from 'expo-network';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { BookCover } from '../src/components/BookCover';
import { ContentState } from '../src/components/ContentState';
import { fetchBookDetails } from '../src/features/books/bookDetails';
import {
    deleteOfflineCover,
    getOfflineCoverUri,
    saveOfflineCover,
} from '../src/features/books/coverStorage';
import type { BookDetails } from '../src/features/books/types';
import { openCatalogDatabase } from '../src/features/catalog/database';
import { parseDateFound } from '../src/features/catalog/parseDateFound';
import {
    getSavedBook,
    removeSavedBook,
    saveBook,
    updateCatalogEntry,
} from '../src/features/catalog/repository';
import type {
    CatalogInput,
    ReadingStatus,
    SavedBook,
} from '../src/features/catalog/types';
import { colors } from '../src/theme/colors';

type LoadState = 'loading' | 'ready' | 'offline' | 'error';

const STATUS_OPTIONS: {
    value: ReadingStatus;
    label: string;
}[] = [
        { value: 'want_to_read', label: 'Want to read' },
        { value: 'reading', label: 'Reading' },
        { value: 'finished', label: 'Finished' },
        { value: 'did_not_finish', label: 'Did not finish' },
    ];

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
        // A general error is still useful if network status is unavailable.
    }

    return 'error';
}

function leaveForm() {
    if (router.canGoBack()) {
        router.back();
    } else {
        router.replace('/catalog');
    }
}

export default function SaveEditScreen() {
    const { workId } = useLocalSearchParams<{ workId?: string }>();

    const [loadAttempt, setLoadAttempt] = useState(0);
    const [loadState, setLoadState] = useState<LoadState>('loading');
    const [book, setBook] = useState<BookDetails | null>(null);
    const [existing, setExisting] = useState<SavedBook | null>(null);

    const [status, setStatus] = useState<ReadingStatus>('want_to_read');
    const [rating, setRating] = useState<number | null>(null);
    const [notes, setNotes] = useState('');
    const [dateFoundText, setDateFoundText] = useState('');
    const [foundAt, setFoundAt] = useState('');
    const [formError, setFormError] = useState('');

    const [busy, setBusy] = useState(false);
    const busyRef = useRef(false);

    useEffect(() => {
        let active = true;
        const controller = new AbortController();

        async function load() {
            setLoadState('loading');
            setFormError('');

            if (
                typeof workId !== 'string' ||
                !/^\/works\/OL\d+W$/.test(workId)
            ) {
                setLoadState('error');
                return;
            }

            let saved: SavedBook | null;

            try {
                const db = await openCatalogDatabase();

                try {
                    saved = await getSavedBook(db, workId);
                } finally {
                    await db.closeAsync();
                }
            } catch {
                if (active) {
                    setLoadState('error');
                }
                return;
            }

            if (!active) {
                return;
            }

            if (saved) {
                setExisting(saved);
                setBook(saved);
                setStatus(saved.status);
                setRating(saved.rating);
                setNotes(saved.notes);
                setDateFoundText(saved.dateFound ?? '');
                setFoundAt(saved.foundAt);
                setLoadState('ready');
                return;
            }

            try {
                const remoteBook = await fetchBookDetails(
                    workId,
                    controller.signal
                );

                if (active) {
                    setExisting(null);
                    setBook(remoteBook);
                    setStatus('want_to_read');
                    setRating(null);
                    setNotes('');
                    setDateFoundText('');
                    setFoundAt('');
                    setLoadState('ready');
                }
            } catch {
                if (!active || controller.signal.aborted) {
                    return;
                }

                const errorState = await connectionError();

                if (active) {
                    setLoadState(errorState);
                }
            }
        }

        void load();

        return () => {
            active = false;
            controller.abort();
        };
    }, [workId, loadAttempt]);

    async function handleSave() {
        if (!book || busyRef.current) {
            return;
        }

        let dateFound: string | null;

        try {
            dateFound = parseDateFound(dateFoundText);
        } catch {
            setFormError('Enter a real date as YYYY-MM-DD, or leave it empty.');
            return;
        }

        const input: CatalogInput = {
            status,
            rating,
            notes: notes.trim(),
            dateFound,
            foundAt: foundAt.trim(),
        };

        setFormError('');
        busyRef.current = true;
        setBusy(true);

        try {
            const db = await openCatalogDatabase();
            let savedSuccessfully = false;
            let alreadyExists: SavedBook | null = null;

            try {
                if (existing) {
                    savedSuccessfully = await updateCatalogEntry(
                        db,
                        book.workId,
                        input
                    );
                } else {
                    savedSuccessfully = await saveBook(db, book, input);

                    if (!savedSuccessfully) {
                        alreadyExists = await getSavedBook(db, book.workId);
                    }
                }
            } finally {
                await db.closeAsync();
            }

            if (!savedSuccessfully) {
                if (alreadyExists) {
                    setExisting(alreadyExists);
                    setBook(alreadyExists);
                    setStatus(alreadyExists.status);
                    setRating(alreadyExists.rating);
                    setNotes(alreadyExists.notes);
                    setDateFoundText(alreadyExists.dateFound ?? '');
                    setFoundAt(alreadyExists.foundAt);
                    setFormError(
                        'This book is already in your catalog. Its saved entry is shown.'
                    );
                } else {
                    setFormError(
                        'This entry could not be updated. Please reopen the book.'
                    );
                }

                return;
            }

            // Cover download is best effort. The catalog entry is saved even if
            // the cover server is unavailable.
            await saveOfflineCover(book.workId, book.coverUrl).catch(() => null);

            leaveForm();
        } catch {
            setFormError('Could not save this book. Please try again.');
        } finally {
            busyRef.current = false;
            setBusy(false);
        }
    }

    async function removeBook() {
        if (!existing || busyRef.current) {
            return;
        }

        busyRef.current = true;
        setBusy(true);
        setFormError('');

        try {
            const db = await openCatalogDatabase();
            let removed: boolean;

            try {
                removed = await removeSavedBook(db, existing.workId);
            } finally {
                await db.closeAsync();
            }

            if (!removed) {
                setFormError('This book is no longer in your catalog.');
                return;
            }

            try {
                deleteOfflineCover(existing.workId);
            } catch {
                // The catalog entry is already removed. An unused cover file must
                // not turn a successful removal into a failed one.
            }

            router.replace('/catalog');
        } catch {
            setFormError('Could not remove this book. Please try again.');
        } finally {
            busyRef.current = false;
            setBusy(false);
        }
    }

    function confirmRemove() {
        if (!existing || busyRef.current) {
            return;
        }

        Alert.alert(
            'Remove this book?',
            'This removes its status, rating, and notes from this device.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => {
                        void removeBook();
                    },
                },
            ]
        );
    }

    if (loadState !== 'ready' || !book) {
        const isLoading = loadState === 'loading';

        return (
            <View style={styles.screen}>
                <ContentState
                    kind={
                        loadState === 'loading'
                            ? 'loading'
                            : loadState === 'offline'
                                ? 'offline'
                                : 'error'
                    }
                    title={
                        isLoading
                            ? 'Opening catalog form'
                            : loadState === 'offline'
                                ? 'This book needs internet'
                                : 'Could not open this book'
                    }
                    message={
                        isLoading
                            ? 'Checking your saved books.'
                            : loadState === 'offline'
                                ? 'Previously saved books can still be edited offline.'
                                : 'Please try opening the book again.'
                    }
                    actionLabel={isLoading ? undefined : 'Try again'}
                    onAction={
                        isLoading
                            ? undefined
                            : () => setLoadAttempt((attempt) => attempt + 1)
                    }
                />
            </View>
        );
    }

    const coverUri = existing
        ? (getOfflineCoverUri(book.workId) ?? book.coverUrl)
        : book.coverUrl;

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.page}
            keyboardShouldPersistTaps="handled"
        >
            <View style={styles.bookHeading}>
                <BookCover
                    title={book.title}
                    uri={coverUri}
                    width={86}
                    height={128}
                />

                <View style={styles.bookHeadingText}>
                    <Text style={styles.bookTitle} numberOfLines={3}>
                        {book.title}
                    </Text>
                    <Text style={styles.bookAuthor} numberOfLines={2}>
                        {book.authors.length
                            ? book.authors.join(', ')
                            : 'Unknown author'}
                    </Text>
                </View>
            </View>

            <View style={styles.form}>
                <Text style={styles.heading}>
                    {existing ? 'Edit my book' : 'Add to my catalog'}
                </Text>

                <Text style={styles.fieldLabel}>Reading status</Text>
                <View style={styles.statusOptions}>
                    {STATUS_OPTIONS.map((option) => {
                        const selected = status === option.value;

                        return (
                            <Pressable
                                key={option.value}
                                accessibilityRole="button"
                                accessibilityState={{ selected }}
                                onPress={() => setStatus(option.value)}
                                style={[
                                    styles.option,
                                    selected && styles.selectedOption,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.optionText,
                                        selected && styles.selectedOptionText,
                                    ]}
                                >
                                    {option.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                <Text style={styles.fieldLabel}>My rating</Text>
                <View style={styles.ratingOptions}>
                    {[1, 2, 3, 4, 5].map((value) => {
                        const selected = rating === value;

                        return (
                            <Pressable
                                key={value}
                                onPress={() =>
                                    setRating(selected ? null : value)
                                }
                                accessibilityRole="button"
                                accessibilityLabel={`${value} out of 5 stars`}
                                accessibilityState={{ selected }}
                                style={[
                                    styles.ratingOption,
                                    selected && styles.selectedRating,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.ratingText,
                                        selected && styles.selectedOptionText,
                                    ]}
                                >
                                    {value}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
                <Text style={styles.hint}>
                    Optional. Tap a selected number to clear your rating.
                </Text>

                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="What would you like to remember?"
                    placeholderTextColor={colors.secondaryText}
                    multiline
                    textAlignVertical="top"
                    maxLength={2000}
                    accessibilityLabel="Personal notes"
                    style={[styles.input, styles.notesInput]}
                />

                <Text style={styles.fieldLabel}>
                    Date found (optional)
                </Text>
                <TextInput
                    value={dateFoundText}
                    onChangeText={setDateFoundText}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.secondaryText}
                    autoCapitalize="none"
                    maxLength={10}
                    accessibilityLabel="Date found in YYYY-MM-DD format"
                    style={styles.input}
                />

                <Text style={styles.fieldLabel}>
                    Where you found it (optional)
                </Text>
                <TextInput
                    value={foundAt}
                    onChangeText={setFoundAt}
                    placeholder="Bookstore, recommendation, or link"
                    placeholderTextColor={colors.secondaryText}
                    autoCapitalize="sentences"
                    maxLength={240}
                    accessibilityLabel="Where you found the book"
                    style={styles.input}
                />

                {formError ? (
                    <Text style={styles.errorText} accessibilityRole="alert">
                        {formError}
                    </Text>
                ) : null}

                <Pressable
                    onPress={() => {
                        void handleSave();
                    }}
                    disabled={busy}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                        styles.saveButton,
                        (pressed || busy) && styles.dimmed,
                    ]}
                >
                    <Text style={styles.saveButtonText}>
                        {busy
                            ? 'Saving…'
                            : existing
                                ? 'Save changes'
                                : 'Save book'}
                    </Text>
                </Pressable>

                {existing ? (
                    <Pressable
                        onPress={confirmRemove}
                        disabled={busy}
                        accessibilityRole="button"
                        style={styles.removeButton}
                    >
                        <Text style={styles.removeText}>
                            Remove from My Catalog
                        </Text>
                    </Pressable>
                ) : null}
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
        paddingBottom: 40,
    },
    bookHeading: {
        backgroundColor: colors.teal,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 18,
        paddingHorizontal: 24,
        paddingVertical: 22,
    },
    bookHeadingText: {
        flex: 1,
    },
    bookTitle: {
        color: colors.white,
        fontFamily: 'Georgia',
        fontSize: 24,
        fontWeight: '700',
    },
    bookAuthor: {
        color: colors.white,
        fontSize: 15,
        marginTop: 7,
    },
    form: {
        paddingHorizontal: 24,
        paddingTop: 24,
    },
    heading: {
        color: colors.text,
        fontFamily: 'Georgia',
        fontSize: 25,
        fontWeight: '700',
        marginBottom: 22,
    },
    fieldLabel: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 10,
        marginTop: 16,
    },
    statusOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 9,
    },
    option: {
        backgroundColor: colors.paleBlue,
        borderRadius: 18,
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    selectedOption: {
        backgroundColor: colors.olive,
    },
    optionText: {
        color: colors.text,
        fontSize: 13,
    },
    selectedOptionText: {
        color: colors.white,
        fontWeight: '700',
    },
    ratingOptions: {
        flexDirection: 'row',
        gap: 10,
    },
    ratingOption: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.paleBlue,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectedRating: {
        backgroundColor: colors.olive,
    },
    ratingText: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '700',
    },
    hint: {
        color: colors.secondaryText,
        fontSize: 12,
        marginTop: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.secondaryText,
        borderRadius: 13,
        color: colors.text,
        fontSize: 15,
        minHeight: 48,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    notesInput: {
        minHeight: 110,
    },
    errorText: {
        color: '#A33333',
        fontSize: 14,
        marginTop: 18,
    },
    saveButton: {
        backgroundColor: colors.olive,
        borderRadius: 22,
        alignItems: 'center',
        paddingVertical: 15,
        marginTop: 25,
    },
    saveButtonText: {
        color: colors.white,
        fontSize: 15,
        fontWeight: '700',
    },
    dimmed: {
        opacity: 0.6,
    },
    removeButton: {
        alignItems: 'center',
        paddingVertical: 18,
        marginTop: 7,
    },
    removeText: {
        color: '#A33333',
        fontSize: 14,
        fontWeight: '700',
    },
});