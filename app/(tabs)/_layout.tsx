import { Tabs } from 'expo-router';

import { colors } from '../../src/theme/colors';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
                headerShadowVisible: false,
                tabBarActiveTintColor: colors.olive,
                tabBarInactiveTintColor: colors.secondaryText,
                tabBarStyle: { backgroundColor: colors.background },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Discover',
                    tabBarLabel: 'Discover',
                }}
            />

            <Tabs.Screen
                name="catalog"
                options={{
                    title: 'My Catalog',
                    tabBarLabel: 'My Catalog',
                }}
            />
        </Tabs>
    );
}