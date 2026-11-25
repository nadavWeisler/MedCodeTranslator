import type { SchemeKey } from '@medcode/core';
import { cleanNote, itemKey, type CodeGroup, type CodeListProject, type GroupItem, type GroupRole } from './types';

export type GroupInput = {
  name: string;
  role: GroupRole;
  note?: string;
};

export type GroupWriteResult =
  | { ok: true; project: CodeListProject; group: CodeGroup }
  | { ok: false; error: 'name' | 'missing' };

export function createId(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  return `cl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createGroup(project: CodeListProject, input: GroupInput, id: string = createId()): GroupWriteResult {
  const name = input.name.trim();
  if (!name) return { ok: false, error: 'name' };
  const group: CodeGroup = {
    id,
    name,
    role: input.role,
    note: cleanNote(input.note),
    items: [],
  };
  return {
    ok: true,
    group,
    project: { ...project, groups: [...project.groups, group] },
  };
}

export function updateGroup(project: CodeListProject, groupId: string, input: GroupInput): GroupWriteResult {
  const name = input.name.trim();
  if (!name) return { ok: false, error: 'name' };
  const current = project.groups.find(group => group.id === groupId);
  if (!current) return { ok: false, error: 'missing' };
  const group: CodeGroup = {
    ...current,
    name,
    role: input.role,
    note: cleanNote(input.note),
  };
  return {
    ok: true,
    group,
    project: replaceGroup(project, group),
  };
}

export function deleteGroup(project: CodeListProject, groupId: string): CodeListProject {
  return {
    ...project,
    groups: project.groups.filter(group => group.id !== groupId),
  };
}

export type AddItemsResult = {
  project: CodeListProject;
  added: number;
  skipped: number;
};

/**
 * Append codes to one group. The same scheme+code cannot appear twice in that
 * group. The same code may still exist in a different group.
 */
export function addItems(project: CodeListProject, groupId: string, items: GroupItem[]): AddItemsResult {
  const current = project.groups.find(group => group.id === groupId);
  if (!current) return { project, added: 0, skipped: items.length };

  const seen = new Set(current.items.map(itemKey));
  const nextItems = [...current.items];
  let added = 0;
  let skipped = 0;

  for (const item of items) {
    const key = itemKey(item);
    if (seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.add(key);
    nextItems.push({
      scheme: item.scheme,
      code: item.code,
      description: item.description,
      note: cleanNote(item.note),
    });
    added += 1;
  }

  return {
    added,
    skipped,
    project: replaceGroup(project, { ...current, items: nextItems }),
  };
}

export function removeItem(
  project: CodeListProject,
  groupId: string,
  scheme: SchemeKey,
  code: string
): CodeListProject {
  const current = project.groups.find(group => group.id === groupId);
  if (!current) return project;
  const key = itemKey({ scheme, code });
  return replaceGroup(project, {
    ...current,
    items: current.items.filter(item => itemKey(item) !== key),
  });
}

export function updateItemNote(
  project: CodeListProject,
  groupId: string,
  scheme: SchemeKey,
  code: string,
  note: string
): CodeListProject {
  const current = project.groups.find(group => group.id === groupId);
  if (!current) return project;
  const key = itemKey({ scheme, code });
  return replaceGroup(project, {
    ...current,
    items: current.items.map(item => (
      itemKey(item) === key ? { ...item, note: cleanNote(note) } : item
    )),
  });
}

export function countItems(project: CodeListProject): number {
  return project.groups.reduce((total, group) => total + group.items.length, 0);
}

function replaceGroup(project: CodeListProject, group: CodeGroup): CodeListProject {
  return {
    ...project,
    groups: project.groups.map(current => (current.id === group.id ? group : current)),
  };
}
