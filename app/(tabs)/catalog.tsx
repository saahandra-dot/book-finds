import { router } from 'expo-router';

import { RoutePreview } from '../../src/components/RoutePreview';

export default function CatalogScreen() {
    return (
        <RoutePreview
            title="My Catalog"
            description="Your saved books, filters, and sorting will go here."
            buttonLabel="Preview Book Details"
            onButtonPress={() => router.push('/book-details')}
        />
    );
}