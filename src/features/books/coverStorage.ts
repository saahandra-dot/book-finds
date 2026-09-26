import { Directory, File, Paths } from 'expo-file-system';

function coverFile(workId: string): File | null {
    // A work ID such as /works/OL123W becomes OL123W.jpg.
    // Checking the format also prevents an ID from becoming a file path.
    const match = /^\/works\/(OL\d+W)$/.exec(workId);

    if (!match) {
        return null;
    }

    const coversDirectory = new Directory(Paths.document, 'book-covers');
    return new File(coversDirectory, `${match[1]}.jpg`);
}

export function getOfflineCoverUri(workId: string): string | null {
    const file = coverFile(workId);
    return file?.exists ? file.uri : null;
}

export async function saveOfflineCover(
    workId: string,
    coverUrl: string | null | undefined
): Promise<string | null> {
    const file = coverFile(workId);

    if (!file || !coverUrl) {
        return null;
    }

    // An existing cover needs no network request.
    if (file.exists) {
        return file.uri;
    }

    try {
        file.parentDirectory.create({ idempotent: true });

        await File.downloadFileAsync(coverUrl, file, {
            idempotent: true,
        });

        return file.exists ? file.uri : null;
    } catch {
        // A failed download must not leave a partial file that looks cached.
        if (file.exists) {
            file.delete();
        }

        return null;
    }
}

export function deleteOfflineCover(workId: string): void {
    const file = coverFile(workId);

    if (file?.exists) {
        file.delete();
    }
}