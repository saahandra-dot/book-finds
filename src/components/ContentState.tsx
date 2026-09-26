import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { bookUi } from '../theme/colors';

type ContentStateKind = 'loading' | 'empty' | 'offline' | 'error';

type ContentStateProps = {
    kind: ContentStateKind;
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
};

export function ContentState({
    kind,
    title,
    message,
    actionLabel,
    onAction,
}: ContentStateProps) {
    return (
        <View style={styles.container}>
            {kind === 'loading' ? (
                <ActivityIndicator
                    size="large"
                    color={bookUi.green}
                    style={styles.spinner}
                />
            ) : null}

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            {actionLabel && onAction ? (
                <Pressable
                    onPress={onAction}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                        styles.action,
                        pressed && styles.pressed,
                    ]}
                >
                    <Text style={styles.actionText}>{actionLabel}</Text>
                </Pressable>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 28,
        paddingVertical: 36,
    },
    spinner: {
        marginBottom: 18,
    },
    title: {
        color: bookUi.ink,
        fontSize: 19,
        fontWeight: '700',
        textAlign: 'center',
    },
    message: {
        color: bookUi.muted,
        fontSize: 14,
        lineHeight: 21,
        marginTop: 8,
        textAlign: 'center',
    },
    action: {
        backgroundColor: bookUi.green,
        borderRadius: 22,
        marginTop: 18,
        paddingHorizontal: 22,
        paddingVertical: 11,
    },
    pressed: {
        opacity: 0.7,
    },
    actionText: {
        color: bookUi.background,
        fontSize: 14,
        fontWeight: '700',
    },
});