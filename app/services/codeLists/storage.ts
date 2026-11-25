import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseProject } from './projectFile';
import { GROUPS_STORAGE_KEY, emptyProject, type CodeListProject } from './types';

export type StoredProjectResult =
  | { ok: true; project: CodeListProject }
  | { ok: false; error: 'invalid' | 'version' };

export async function loadStoredProject(): Promise<StoredProjectResult> {
  try {
    const raw = await AsyncStorage.getItem(GROUPS_STORAGE_KEY);
    if (!raw) return { ok: true, project: emptyProject() };
    const parsed = parseProject(raw);
    if (!parsed.ok) return parsed;
    return { ok: true, project: parsed.project };
  } catch {
    return { ok: false, error: 'invalid' };
  }
}

export async function saveStoredProject(project: CodeListProject): Promise<void> {
  await AsyncStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(project));
}
