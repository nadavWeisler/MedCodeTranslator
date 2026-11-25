import { SCHEME_KEYS, type SchemeKey } from '@medcode/core';
import {
  PROJECT_KIND,
  PROJECT_SCHEMA_VERSION,
  emptyProject,
  type CodeGroup,
  type CodeListProject,
  type GroupItem,
  type GroupRole,
} from './types';

export type ProjectParseResult =
  | { ok: true; project: CodeListProject }
  | { ok: false; error: 'invalid' | 'version' };

export function serializeProject(project: CodeListProject): string {
  return JSON.stringify(project, null, 2);
}

export function parseProject(raw: string): ProjectParseResult {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'invalid' };
  }
  return parseProjectValue(value);
}

export function parseProjectValue(value: unknown): ProjectParseResult {
  if (!isRecord(value)) return { ok: false, error: 'invalid' };
  if (typeof value.schemaVersion !== 'number' || !Number.isInteger(value.schemaVersion)) {
    return { ok: false, error: 'invalid' };
  }
  if (value.schemaVersion !== PROJECT_SCHEMA_VERSION) {
    return { ok: false, error: 'version' };
  }
  if (value.kind !== undefined && value.kind !== PROJECT_KIND) {
    return { ok: false, error: 'invalid' };
  }
  if (!Array.isArray(value.groups)) return { ok: false, error: 'invalid' };

  const groups: CodeGroup[] = [];
  for (const groupValue of value.groups) {
    const group = parseGroup(groupValue);
    if (!group) return { ok: false, error: 'invalid' };
    groups.push(group);
  }

  return {
    ok: true,
    project: {
      ...emptyProject(),
      groups,
    },
  };
}

function parseGroup(value: unknown): CodeGroup | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string' || !value.id.trim()) return null;
  if (typeof value.name !== 'string' || !value.name.trim()) return null;
  if (!isRole(value.role)) return null;
  if (value.note !== undefined && typeof value.note !== 'string') return null;
  if (!Array.isArray(value.items)) return null;

  const items: GroupItem[] = [];
  const seen = new Set<string>();
  for (const itemValue of value.items) {
    const item = parseItem(itemValue);
    if (!item) return null;
    const key = `${item.scheme}:${item.code}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }

  const note = typeof value.note === 'string' ? value.note.trim() : '';
  return {
    id: value.id,
    name: value.name.trim(),
    role: value.role,
    note: note || undefined,
    items,
  };
}

function parseItem(value: unknown): GroupItem | null {
  if (!isRecord(value)) return null;
  if (!isScheme(value.scheme)) return null;
  if (typeof value.code !== 'string' || !value.code.trim()) return null;
  if (typeof value.description !== 'string') return null;
  if (value.note !== undefined && typeof value.note !== 'string') return null;
  const note = typeof value.note === 'string' ? value.note.trim() : '';
  return {
    scheme: value.scheme,
    code: value.code.trim(),
    description: value.description,
    note: note || undefined,
  };
}

function isRole(value: unknown): value is GroupRole {
  return value === 'inclusion' || value === 'exclusion';
}

function isScheme(value: unknown): value is SchemeKey {
  return typeof value === 'string' && (SCHEME_KEYS as string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
