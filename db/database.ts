import * as SQLite from 'expo-sqlite';
// Crosswalk is small (~12 KB) — static import is fine
import crosswalkData from '../data/vocabularies/icd9_to_icd10_gem.json';
import type { SchemeKey } from '@medcode/core';

// Re-export so existing callers that import SchemeKey from here keep working
export type { SchemeKey } from '@medcode/core';

const DB_NAME = 'medcodes.db';
// Bumped to 6: switches from eager seedAll() to per-scheme lazy seeding.
// On upgrade the seeded_* flags are cleared so each scheme re-seeds on first access.
const SCHEMA_VERSION = 6;

// In-memory cache: avoids a meta-table query on every getAllEntries() call
const seededSchemes = new Set<SchemeKey>();

// Serialise all seeding operations — SQLite allows only one write transaction at a time.
// Concurrent calls to ensureSchemeSeeded() chain onto this promise instead of racing.
let seedingQueue: Promise<void> = Promise.resolve();

type RawEntry = { code: string; name_en: string; name_he?: string | null };

// Dynamic loaders — each JSON becomes a separate bundle chunk in the web PWA build,
// and is never parsed until the user first selects that scheme on any platform.
const VOCABULARY_LOADERS: Record<SchemeKey, () => Promise<RawEntry[]>> = {
  atc1:  () => import('../data/vocabularies/atc1.json').then(m => m.default as unknown as RawEntry[]),
  atc2:  () => import('../data/vocabularies/atc2.json').then(m => m.default as unknown as RawEntry[]),
  atc3:  () => import('../data/vocabularies/atc3.json').then(m => m.default as unknown as RawEntry[]),
  atc4:  () => import('../data/vocabularies/atc4.json').then(m => m.default as unknown as RawEntry[]),
  atc5:  () => import('../data/vocabularies/atc5.json').then(m => m.default as unknown as RawEntry[]),
  icd10: () => import('../data/vocabularies/icd10.json').then(m => m.default as unknown as RawEntry[]),
  icd9:  () => import('../data/vocabularies/icd9.json').then(m => m.default as unknown as RawEntry[]),
  icd11: () => import('../data/vocabularies/icd11.json').then(m => m.default as unknown as RawEntry[]),
  loinc: () => import('../data/vocabularies/loinc.json').then(m => m.default as unknown as RawEntry[]),
  cpt:   () => import('../data/vocabularies/cpt.json').then(m => m.default as unknown as RawEntry[]),
  hcpcs: () => import('../data/vocabularies/hcpcs.json').then(m => m.default as unknown as RawEntry[]),
  cvx:   () => import('../data/vocabularies/cvx.json').then(m => m.default as unknown as RawEntry[]),
};

let db: SQLite.SQLiteDatabase | null = null;

export async function initDB(): Promise<void> {
  db = await SQLite.openDatabaseAsync(DB_NAME);

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS atc1 (
      code TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_he TEXT
    );
    CREATE TABLE IF NOT EXISTS atc2 (
      code TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_he TEXT
    );
    CREATE TABLE IF NOT EXISTS atc3 (
      code TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_he TEXT
    );
    CREATE TABLE IF NOT EXISTS atc4 (
      code TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_he TEXT
    );
    CREATE TABLE IF NOT EXISTS atc5 (
      code TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_he TEXT
    );
    CREATE TABLE IF NOT EXISTS icd10 (
      code TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_he TEXT
    );
    CREATE TABLE IF NOT EXISTS icd9 (
      code TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_he TEXT
    );
    CREATE TABLE IF NOT EXISTS icd11 (
      code TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_he TEXT
    );
    CREATE TABLE IF NOT EXISTS loinc (
      code TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_he TEXT
    );
    CREATE TABLE IF NOT EXISTS cpt (
      code TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_he TEXT
    );
    CREATE TABLE IF NOT EXISTS hcpcs (
      code TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_he TEXT
    );
    CREATE TABLE IF NOT EXISTS cvx (
      code TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_he TEXT
    );
    CREATE TABLE IF NOT EXISTS icd9_to_icd10_gem (
      icd9_code TEXT NOT NULL,
      icd10_code TEXT NOT NULL,
      cardinality TEXT NOT NULL,
      is_one_to_one INTEGER NOT NULL DEFAULT 0,
      is_one_to_many INTEGER NOT NULL DEFAULT 0,
      is_many_to_one INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (icd9_code, icd10_code)
    );
  `);

  const stored = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM meta WHERE key = ?',
    ['schema_version']
  );

  if (!stored || parseInt(stored.value, 10) < SCHEMA_VERSION) {
    // Clear per-scheme seeded flags so each scheme lazy-seeds on first access
    await db.runAsync("DELETE FROM meta WHERE key LIKE 'seeded_%'");
    await db.runAsync(
      'INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)',
      ['schema_version', String(SCHEMA_VERSION)]
    );
    seededSchemes.clear();
    // Crosswalk is small — seed eagerly so ICD-9→ICD-10 lookups work immediately
    await seedCrosswalk(crosswalkData as CrosswalkEntry[]);
  }
}

type CrosswalkEntry = {
  icd9_code: string;
  icd10_code: string;
  cardinality: string;
  is_one_to_one: boolean;
  is_one_to_many: boolean;
  is_many_to_one: boolean;
};

async function seedTable(table: string, data: RawEntry[]): Promise<void> {
  if (!db) return;
  // Explicit BEGIN/COMMIT avoids withTransactionAsync nesting issues on web SQLite
  await db.runAsync('BEGIN');
  try {
    await db.runAsync(`DELETE FROM ${table}`);
    for (const item of data) {
      await db.runAsync(
        `INSERT OR REPLACE INTO ${table} (code, name_en, name_he) VALUES (?, ?, ?)`,
        [item.code, item.name_en, item.name_he ?? null]
      );
    }
    await db.runAsync('COMMIT');
  } catch (e) {
    await db.runAsync('ROLLBACK').catch(() => {});
    throw e;
  }
}

async function seedCrosswalk(data: CrosswalkEntry[]): Promise<void> {
  if (!db) return;
  await db.runAsync('BEGIN');
  try {
    await db.runAsync('DELETE FROM icd9_to_icd10_gem');
    for (const item of data) {
      await db.runAsync(
        `INSERT OR REPLACE INTO icd9_to_icd10_gem
           (icd9_code, icd10_code, cardinality, is_one_to_one, is_one_to_many, is_many_to_one)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          item.icd9_code,
          item.icd10_code,
          item.cardinality,
          item.is_one_to_one ? 1 : 0,
          item.is_one_to_many ? 1 : 0,
          item.is_many_to_one ? 1 : 0,
        ]
      );
    }
    await db.runAsync('COMMIT');
  } catch (e) {
    await db.runAsync('ROLLBACK').catch(() => {});
    throw e;
  }
}

/** Lazily seed a scheme on first access. Serialised via seedingQueue to prevent
 *  concurrent transactions (SQLite only allows one write transaction at a time). */
async function ensureSchemeSeeded(scheme: SchemeKey): Promise<void> {
  if (seededSchemes.has(scheme)) return;
  // Chain onto the queue — waits for any in-progress seeding to finish first
  seedingQueue = seedingQueue.then(async () => {
    if (seededSchemes.has(scheme)) return; // already seeded while we waited
    const d = getDB();
    const flag = await d.getFirstAsync<{ value: string }>(
      'SELECT value FROM meta WHERE key = ?',
      [`seeded_${scheme}`]
    );
    if (flag?.value === '1') {
      seededSchemes.add(scheme);
      return;
    }
    const data = await VOCABULARY_LOADERS[scheme]();
    await seedTable(scheme, data);
    await d.runAsync(
      'INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)',
      [`seeded_${scheme}`, '1']
    );
    seededSchemes.add(scheme);
  });
  return seedingQueue;
}

export function getDB(): SQLite.SQLiteDatabase {
  if (!db) throw new Error('DB not initialized — call initDB() first');
  return db;
}

/** Load ALL entries from a scheme (for building fuse.js index).
 *  Lazily seeds the scheme into SQLite on first call — subsequent calls are instant. */
export async function getAllEntries(scheme: SchemeKey): Promise<RawEntry[]> {
  await ensureSchemeSeeded(scheme);
  const d = getDB();
  return d.getAllAsync<RawEntry>(`SELECT code, name_en, name_he FROM ${scheme}`);
}
