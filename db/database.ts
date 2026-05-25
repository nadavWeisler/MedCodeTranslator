import * as SQLite from 'expo-sqlite';
import atc5Data from '../data/vocabularies/atc5.json';
import icd10Data from '../data/vocabularies/icd10.json';
import icd9Data from '../data/vocabularies/icd9.json';
import icd11Data from '../data/vocabularies/icd11.json';
import loincData from '../data/vocabularies/loinc.json';
import cptData from '../data/vocabularies/cpt.json';
import hcpcsData from '../data/vocabularies/hcpcs.json';
import cvxData from '../data/vocabularies/cvx.json';
import crosswalkData from '../data/vocabularies/icd9_to_icd10_gem.json';
import type { SchemeKey } from '@medcode/core';

// Re-export so existing callers that import SchemeKey from here keep working
export type { SchemeKey } from '@medcode/core';

const DB_NAME = 'medcodes.db';
const SCHEMA_VERSION = 4;

let db: SQLite.SQLiteDatabase | null = null;

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

async function seedCrosswalk(data: CrosswalkEntry[]): Promise<void> {
  if (!db) return;
  await db.withTransactionAsync(async () => {
    await db!.runAsync('DELETE FROM icd9_to_icd10_gem');
    for (const item of data) {
      await db!.runAsync(
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
    ['hcpcs', hcpcsData as RawEntry[]],
    ['cvx',   cvxData   as RawEntry[]],
  ];
  for (const [table, data] of datasets) {
    await seedTable(table, data);
  }
  await seedCrosswalk(crosswalkData as CrosswalkEntry[]);
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
