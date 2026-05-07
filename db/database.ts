import * as SQLite from 'expo-sqlite';
import atc5Data from '../assets/data/atc5.json';
import icd10Data from '../assets/data/icd10.json';
import icd9Data from '../assets/data/icd9.json';
import icd11Data from '../assets/data/icd11.json';
import loincData from '../assets/data/loinc.json';
import cptData from '../assets/data/cpt.json';

const DB_NAME = 'medcodes.db';
const SCHEMA_VERSION = 2;

let db: SQLite.SQLiteDatabase | null = null;

export type SchemeKey = 'atc5' | 'icd10' | 'icd9' | 'icd11' | 'loinc' | 'cpt';

export async function initDB(): Promise<void> {
  db = await SQLite.openDatabaseAsync(DB_NAME);

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
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
  `);

  const seeded = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM meta WHERE key = ?',
    ['schema_version']
  );

  if (!seeded || parseInt(seeded.value, 10) < SCHEMA_VERSION) {
    await seedAll();
    await db.runAsync(
      'INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)',
      ['schema_version', String(SCHEMA_VERSION)]
    );
  }
}

type RawEntry = { code: string; name_en: string; name_he?: string };

async function seedTable(table: string, data: RawEntry[]): Promise<void> {
  if (!db) return;
  await db.withTransactionAsync(async () => {
    await db!.runAsync(`DELETE FROM ${table}`);
    for (const item of data) {
      await db!.runAsync(
        `INSERT OR REPLACE INTO ${table} (code, name_en, name_he) VALUES (?, ?, ?)`,
        [item.code, item.name_en, item.name_he ?? null]
      );
    }
  });
}

async function seedAll(): Promise<void> {
  const datasets: [string, RawEntry[]][] = [
    ['atc5',  atc5Data  as RawEntry[]],
    ['icd10', icd10Data as RawEntry[]],
    ['icd9',  icd9Data  as RawEntry[]],
    ['icd11', icd11Data as RawEntry[]],
    ['loinc', loincData as RawEntry[]],
    ['cpt',   cptData   as RawEntry[]],
  ];
  for (const [table, data] of datasets) {
    await seedTable(table, data);
  }
}

export function getDB(): SQLite.SQLiteDatabase {
  if (!db) throw new Error('DB not initialized — call initDB() first');
  return db;
}

/** Load ALL entries from a scheme (for building fuse.js index) */
export async function getAllEntries(scheme: SchemeKey): Promise<RawEntry[]> {
  const d = getDB();
  return d.getAllAsync<RawEntry>(`SELECT code, name_en, name_he FROM ${scheme}`);
}
