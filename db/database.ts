import * as SQLite from 'expo-sqlite';
import atc5Data from '../assets/data/atc5.json';
import icd10Data from '../assets/data/icd10.json';
import icd9Data from '../assets/data/icd9.json';
import icd11Data from '../assets/data/icd11.json';
import loincData from '../assets/data/loinc.json';
import cptData from '../assets/data/cpt.json';

const DB_NAME = 'medcodes.db';
const SCHEMA_VERSION = 3;

let db: SQLite.SQLiteDatabase | null = null;

export const SCHEME_KEYS = ['atc5', 'icd10', 'icd9', 'icd11', 'loinc', 'cpt'] as const;
export type SchemeKey = (typeof SCHEME_KEYS)[number];
const SCHEME_CHECK_SQL = SCHEME_KEYS.map((scheme) => `'${scheme}'`).join(', ');

export type DetailedCodeMetadata = {
  ncci_procedure_notes?: string[];
  anatomical_parts?: string[];
  coding_guidelines?: string[];
  [key: string]: unknown;
};

export type CodeMetadataIdentifier = {
  scheme: SchemeKey;
  code: string;
};

export type CodeMetadataRecord = CodeMetadataIdentifier & {
  metadata: DetailedCodeMetadata;
};

export type MetadataFetchErrorCode =
  | 'METADATA_ENDPOINT_NOT_INITIALIZED'
  | 'METADATA_NOT_FOUND'
  | 'INVALID_METADATA_PAYLOAD';

export class MetadataFetchError extends Error {
  constructor(
    public readonly code: MetadataFetchErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'MetadataFetchError';
  }
}

export interface CodeMetadataFetcher {
  fetchDetailedMetadata(identifier: CodeMetadataIdentifier): Promise<CodeMetadataRecord>;
}

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

    CREATE TABLE IF NOT EXISTS code_metadata (
      scheme TEXT NOT NULL,
      code TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      PRIMARY KEY (scheme, code),
      CHECK (scheme IN (${SCHEME_CHECK_SQL}))
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

export function validateMetadataPayload(metadata: DetailedCodeMetadata): DetailedCodeMetadata {
  if (metadata == null || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new MetadataFetchError(
      'INVALID_METADATA_PAYLOAD',
      'Detailed metadata must be a plain object.'
    );
  }
  return metadata;
}

export async function upsertDetailedMetadata(record: CodeMetadataRecord): Promise<void> {
  const d = getDB();
  const metadata = validateMetadataPayload(record.metadata);
  await d.runAsync(
    `INSERT OR REPLACE INTO code_metadata (scheme, code, metadata_json) VALUES (?, ?, ?)`,
    [record.scheme, record.code, JSON.stringify(metadata)]
  );
}

export async function fetchDetailedMetadata(
  identifier: CodeMetadataIdentifier
): Promise<CodeMetadataRecord> {
  const d = getDB();
  const row = await d.getFirstAsync<{ metadata_json: string }>(
    `SELECT metadata_json FROM code_metadata WHERE scheme = ? AND code = ?`,
    [identifier.scheme, identifier.code]
  );

  if (!row) {
    throw new MetadataFetchError(
      'METADATA_NOT_FOUND',
      `No detailed metadata found for ${identifier.scheme}:${identifier.code}.`
    );
  }

  return {
    ...identifier,
    metadata: parseDetailedMetadataPayload(row.metadata_json, identifier),
  };
}

export const sqliteCodeMetadataFetcher: CodeMetadataFetcher = {
  async fetchDetailedMetadata(identifier: CodeMetadataIdentifier): Promise<CodeMetadataRecord> {
    if (!db) {
      throw new MetadataFetchError(
        'METADATA_ENDPOINT_NOT_INITIALIZED',
        'Metadata store not initialized — call initDB() first.'
      );
    }
    return fetchDetailedMetadata(identifier);
  },
};

export function parseDetailedMetadataPayload(
  metadataJson: string,
  identifier: CodeMetadataIdentifier
): DetailedCodeMetadata {
  let parsed: DetailedCodeMetadata;
  try {
    parsed = JSON.parse(metadataJson) as DetailedCodeMetadata;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new MetadataFetchError(
      'INVALID_METADATA_PAYLOAD',
      `Stored detailed metadata JSON is invalid for ${identifier.scheme}:${identifier.code}. ${reason}`
    );
  }

  try {
    return validateMetadataPayload(parsed);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new MetadataFetchError(
      'INVALID_METADATA_PAYLOAD',
      `Stored detailed metadata structure is invalid for ${identifier.scheme}:${identifier.code}. ${reason}`
    );
  }
}
