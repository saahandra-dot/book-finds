import { useEffect, useState } from 'react';
import {
    Image,
    StyleProp,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from 'react-native';

import { bookUi } from '../theme/colors';

type BookCoverProps = {
    title: string;
    uri: string | null | undefined;
    width?: number;
    height?: number;
    style?: StyleProp<ViewStyle>;
};

export function BookCover({
    title,
    uri,
    width = 88,
    height = 132,
    style,
}: BookCoverProps) {
    const [imageFailed, setImageFailed] = useState(false);

    useEffect(() => {
        setImageFailed(false);
    }, [uri]);

    const showImage = Boolean(uri) && !imageFailed;

    return (
        <View style={[styles.container, { width, height }, style]}>
            {showImage ? (
                <Image
                    source={{ uri: uri! }}
                    style={styles.image}
                    resizeMode="contain"
                    accessibilityLabel={`Cover of ${title}`}
                    onError={() => setImageFailed(true)}
                />
            ) : (
                <View style={styles.placeholder}>
                    <Text style={styles.placeholderSymbol} accessibilityElementsHidden>
                        ◇
                    </Text>
                    <Text style={styles.placeholderText}>No cover</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        borderRadius: 8,
        backgroundColor: bookUi.paleGreen,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 6,
    },
    placeholderSymbol: {
        color: bookUi.green,
        fontSize: 30,
        lineHeight: 36,
    },
    placeholderText: {
        color: bookUi.ink,
        fontSize: 11,
        textAlign: 'center',
    },
});