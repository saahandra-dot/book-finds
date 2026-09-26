# Book Finds

Book Finds is a React Native and Expo app for discovering books and keeping a personal reading catalog. It is built with TypeScript.

## What it does

- Search Open Library by title, author, or ISBN.
- Browse featured books in a swipeable carousel and explore books by mood.
- View a book's available description, categories, publisher, ISBN, and cover.
- Save books as Want to read, Reading, Finished, or Did not finish.
- Record a personal rating, notes, date found, and where the book was found.
- Edit or remove saved books.
- Browse and search the catalog offline.
- Filter saved books by status, author, and minimum rating; sort by date saved, author, or rating.
- Browse reading-status shelves on a wide tablet screen.


## Tech stack

- Expo and React Native
- TypeScript
- Expo Router for navigation
- Open Library Search, Works, and Editions APIs
- Expo SQLite for the personal catalog
- Expo FileSystem for offline copies of available covers
- Jest for parsing, persistence, date validation, and catalog logic tests

## How book data is stored

Open Library provides book information. The user supplies reading status, rating, notes, date found, and the source of the discovery. These are stored separately in the local SQLite database.

Each saved book is identified by its Open Library work ID, such as `/works/OL123W`. Editions can have different ISBNs, and some results have no ISBN, so ISBN is not used as the catalog's unique key. Saving the same work again does not create a second catalog entry.

Saved book details and personal entries remain available offline. When a cover download succeeds, its image is also stored locally. Searching Open Library requires an internet connection.

## Run locally

Use a Node.js version supported by the installed Expo SDK.

```bash
npm install
npx expo start