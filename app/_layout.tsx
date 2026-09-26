import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '../src/theme/colors';

export default function RootLayout() {
    return (
        <>
            <StatusBar style="dark" />

            <Stack
                screenOptions={{
                    contentStyle: { backgroundColor: colors.background },
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.text,
                    headerShadowVisible: false,
                }}
            >
                <Stack.Screen
                    name="(tabs)"
                    options={{ headerShown: false }}
                />

                <Stack.Screen
                    name="book-details"
                    options={{
                        title: 'Book Details',
                        headerBackButtonDisplayMode: 'minimal',
                    }}
                />

                <Stack.Screen
                    name="save-edit"
                    options={{
                        title: 'Save / Edit',
                        headerBackButtonDisplayMode: 'minimal',
                    }}
                />
            </Stack>
        </>
    );
}