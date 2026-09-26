import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useShelvesAvailability } from '../../src/hooks/useShelvesAvailability';
import { colors } from '../../src/theme/colors';

export default function TabLayout() {
    const shelvesAvailable = useShelvesAvailability();

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
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons
                            name={focused ? 'search' : 'search-outline'}
                            size={size}
                            color={color}
                        />
                    ),

                }}
            />

            <Tabs.Screen
                name="catalog"
                options={{
                    title: 'My Catalog',
                    tabBarLabel: 'My Catalog',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons
                            name={focused ? 'library' : 'library-outline'}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="shelves"
                options={{
                    title: 'Shelves',
                    tabBarLabel: 'Shelves',
                    href: shelvesAvailable === true ? '/shelves' : null,
                }}
            />
        </Tabs>
    );
}