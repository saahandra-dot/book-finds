import { router } from 'expo-router';

import { RoutePreview } from '../src/components/RoutePreview';

export default function SaveEditScreen() {
    return (
        <RoutePreview
            title="Save / Edit"
            description="Reading status, rating, notes, and where you found the book will go here."
            buttonLabel="Back to Book Details"
            onButtonPress={() => router.back()}
        />
    );
}