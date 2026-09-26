/** @jest-environment node */

jest.mock('expo-file-system', () => {
    const files = new Set();
    let shouldFailDownload = false;

    class Directory {
        constructor(parent, name) {
            this.uri = `${parent.uri}/${name}`;
        }

        create() { }
    }

    class File {
        constructor(directory, name) {
            this.parentDirectory = directory;
            this.uri = `${directory.uri}/${name}`;
        }

        get exists() {
            return files.has(this.uri);
        }

        delete() {
            files.delete(this.uri);
        }
    }

    File.downloadFileAsync = jest.fn(async (_url, destination) => {
        files.add(destination.uri);

        if (shouldFailDownload) {
            throw new Error('Download interrupted');
        }

        return destination;
    });

    return {
        Directory,
        File,
        Paths: { document: { uri: 'file:///documents' } },
        __test: {
            files,
            download: File.downloadFileAsync,
            setDownloadFailure(value) {
                shouldFailDownload = value;
            },
        },
    };
});

const { __test } = require('expo-file-system');
const {
    getOfflineCoverUri,
    saveOfflineCover,
    deleteOfflineCover,
} = require('../src/features/books/coverStorage');

const workId = '/works/OL123W';
const coverUrl = 'https://covers.openlibrary.org/b/id/123-M.jpg';
const localUri = 'file:///documents/book-covers/OL123W.jpg';

beforeEach(() => {
    __test.files.clear();
    __test.download.mockClear();
    __test.setDownloadFailure(false);
});

test('a downloaded cover remains available through offline lookup', async () => {
    expect(getOfflineCoverUri(workId)).toBeNull();

    expect(await saveOfflineCover(workId, coverUrl)).toBe(localUri);
    expect(getOfflineCoverUri(workId)).toBe(localUri);
    expect(__test.download).toHaveBeenCalledTimes(1);
});

test('saving the same cover again does not download it again', async () => {
    await saveOfflineCover(workId, coverUrl);
    await saveOfflineCover(workId, coverUrl);

    expect(__test.download).toHaveBeenCalledTimes(1);
});

test('missing covers and invalid work IDs do not create files', async () => {
    expect(await saveOfflineCover(workId, null)).toBeNull();
    expect(await saveOfflineCover('../other-book', coverUrl)).toBeNull();
    expect(__test.download).not.toHaveBeenCalled();
});

test('a failed download removes its partial file', async () => {
    __test.setDownloadFailure(true);

    expect(await saveOfflineCover(workId, coverUrl)).toBeNull();
    expect(getOfflineCoverUri(workId)).toBeNull();
});

test('removing a cover makes it unavailable offline', async () => {
    await saveOfflineCover(workId, coverUrl);

    deleteOfflineCover(workId);

    expect(getOfflineCoverUri(workId)).toBeNull();
});