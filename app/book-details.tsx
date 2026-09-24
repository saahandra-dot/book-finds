import { router } from 'expo-router';

import { RoutePreview } from '../src/components/RoutePreview';

export default function BookDetailsScreen() {
    return (
        <RoutePreview
            title="Book Details"
            description="A book's cover, description, and publication information will go here."
            buttonLabel="Preview Save / Edit"
            onButtonPress={() => router.push('/save-edit')}
        />
    );
}