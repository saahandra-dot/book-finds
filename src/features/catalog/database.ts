import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'book-finds.db';

export async function initializeCatalogDatabase(
    db: SQLite.SQLiteDatabase
): Promise<void> {
    await db.execAsync(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS books (
      work_id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      authors_json TEXT NOT NULL,
      first_publish_year INTEGER,
      cover_url TEXT,
      description TEXT,
      categories_json TEXT NOT NULL,
      publisher TEXT,
      isbn TEXT,
      edition_id TEXT
    );

    CREATE TABLE IF NOT EXISTS catalog_entries (
      work_id TEXT PRIMARY KEY NOT NULL,
      status TEXT NOT NULL CHECK (
        status IN (
          'want_to_read',
          'reading',
          'finished',
          'did_not_finish'
        )
      ),
      rating INTEGER CHECK (
        rating IS NULL OR rating BETWEEN 1 AND 5
      ),
      notes TEXT NOT NULL DEFAULT '',
      date_found TEXT,
      found_at TEXT NOT NULL DEFAULT '',
      saved_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (work_id)
        REFERENCES books(work_id)
        ON DELETE CASCADE
    );
  `);
}

export async function openCatalogDatabase(): Promise<SQLite.SQLiteDatabase> {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await initializeCatalogDatabase(db);
    return db;
}