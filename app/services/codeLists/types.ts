import type { SchemeKey } from '@medcode/core';

/** Persisted and shared project schema. Bump only with a reader for the old shape. */
export const PROJECT_SCHEMA_VERSION = 1;

export const PROJECT_KIND = 'medcodetranslator.codeLists';

/** AsyncStorage key for the on-device project. Versioned so a future shape can coexist. */
export const GROUPS_STORAGE_KEY = 'medcodetranslator:groups:v1';

export type GroupRole = 'inclusion' | 'exclusion';

/** One vocabulary code inside a research code list. Hebrew is not stored. */
export type GroupItem = {
  scheme: SchemeKey;
  code: string;
  /** English description from the local vocabulary. Empty when the vocabulary has no row. */
  description: string;
  note?: string;
};

export type CodeGroup = {
  id: string;
  name: string;
  role: GroupRole;
  note?: string;
  items: GroupItem[];
};

export type CodeListProject = {
  schemaVersion: number;
  kind: typeof PROJECT_KIND;
  groups: CodeGroup[];
};

export type VocabEntry = {
  scheme: SchemeKey;
  code: string;
  name_en: string;
  name_he: string | null;
};

export type ResolvedCode = {
  item: GroupItem;
  descendants: GroupItem[];
  kind: 'entry' | 'category';
};

export function emptyProject(): CodeListProject {
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    kind: PROJECT_KIND,
    groups: [],
  };
}

export function itemKey(item: Pick<GroupItem, 'scheme' | 'code'>): string {
  return `${item.scheme}:${item.code}`;
}

export function cleanNote(note: string | undefined | null): string | undefined {
  const trimmed = note?.trim();
  return trimmed ? trimmed : undefined;
}
