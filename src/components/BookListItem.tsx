import { Pressable, StyleSheet, Text, View } from 'react-native';

import { bookUi } from '../theme/colors';
import { BookCover } from './BookCover';

type BookListItemProps = {
    title: string;
    authors: string[] | null | undefined;
    publicationYear: number | null | undefined;
    coverUri: string | null | undefined;
    onPress: () => void;
    label?: string;
};

export function BookListItem({
    title,
    authors,
    publicationYear,
    coverUri,
    onPress,
    label,
}: BookListItemProps) {
    const displayTitle = title.trim() || 'Untitled book';
    const authorText = authors?.length ? authors.join(', ') : 'Unknown author';
    const yearText = publicationYear ? String(publicationYear) : null;

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`Open ${displayTitle}`}
            style={({ pressed }) => [
                styles.row,
                pressed && styles.pressed,
            ]}
        >
            <BookCover title={displayTitle} uri={coverUri} />

            <View style={styles.text}>
                {label ? (
                    <Text style={styles.label} numberOfLines={1}>
                        {label}
                    </Text>
                ) : null}

                <Text style={styles.title} numberOfLines={2}>
                    {displayTitle}
                </Text>

                <Text style={styles.author} numberOfLines={2}>
                    {authorText}
                </Text>

                {yearText ? <Text style={styles.year}>{yearText}</Text> : null}
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: bookUi.border,
    },
    pressed: {
        opacity: 0.65,
    },
    text: {
        flex: 1,
        gap: 4,
    },
    label: {
        color: bookUi.green,
        fontSize: 12,
        fontWeight: '700',
    },
    title: {
        color: bookUi.ink,
        fontSize: 18,
        fontWeight: '700',
    },
    author: {
        color: bookUi.muted,
        fontSize: 14,
    },
    year: {
        color: bookUi.muted,
        fontSize: 13,
    },
});