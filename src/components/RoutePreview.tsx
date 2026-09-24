import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

type RoutePreviewProps = {
    title: string;
    description: string;
    buttonLabel: string;
    onButtonPress: () => void;
};

export function RoutePreview({
    title,
    description,
    buttonLabel,
    onButtonPress,
}: RoutePreviewProps) {
    return (
        <View style={styles.screen}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>

            <Pressable
                accessibilityRole="button"
                onPress={onButtonPress}
                style={styles.button}
            >
                <Text style={styles.buttonText}>{buttonLabel}</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 28,
        backgroundColor: colors.background,
    },
    title: {
        color: colors.text,
        fontSize: 34,
        fontWeight: '700',
    },
    description: {
        marginTop: 12,
        color: colors.secondaryText,
        fontSize: 16,
        lineHeight: 24,
    },
    button: {
        alignItems: 'center',
        marginTop: 28,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 12,
        backgroundColor: colors.olive,
    },
    buttonText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: '700',
    },
});