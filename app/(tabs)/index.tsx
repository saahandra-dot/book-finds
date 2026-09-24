import { router } from 'expo-router';

import { RoutePreview } from '../../src/components/RoutePreview';

export default function DiscoverScreen() {
    return (
        <RoutePreview
            title="Discover"
            description="Book search and the featured-books carousel will go here."
            buttonLabel="Preview Book Details"
            onButtonPress={() => router.push('/book-details')}
        />
    );
}