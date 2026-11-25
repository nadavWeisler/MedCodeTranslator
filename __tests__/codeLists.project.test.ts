jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createGroup, addItems } from '../app/services/codeLists/logic';
import { parseProject, serializeProject } from '../app/services/codeLists/projectFile';
import { loadStoredProject, saveStoredProject } from '../app/services/codeLists/storage';
import {
  GROUPS_STORAGE_KEY,
  PROJECT_KIND,
  PROJECT_SCHEMA_VERSION,
  emptyProject,
  type CodeListProject,
} from '../app/services/codeLists/types';

function sampleProject(): CodeListProject {
  const created = createGroup(emptyProject(), { name: 'Cohort', role: 'inclusion', note: 'shared' }, 'g1');
  if (!created.ok) throw new Error('setup failed');
  const exclusion = createGroup(created.project, { name: 'Exclude', role: 'exclusion' }, 'g2');
  if (!exclusion.ok) throw new Error('setup failed');
  return addItems(exclusion.project, 'g1', [{
    scheme: 'icd10',
    code: 'F32.0',
    description: 'Mild depressive episode',
    note: 'primary',
  }]).project;
}

describe('code list project files', () => {
  it('round-trips a project and keeps the schema version', () => {
    const project = sampleProject();
    const text = serializeProject(project);
    expect(text).toContain(`"schemaVersion": ${PROJECT_SCHEMA_VERSION}`);
    expect(text).toContain(`"kind": "${PROJECT_KIND}"`);
    expect(parseProject(text)).toEqual({ ok: true, project });
  });

  it('rejects an unsupported version, a wrong kind, and malformed JSON', () => {
    expect(parseProject('{"schemaVersion":2,"kind":"medcodetranslator.codeLists","groups":[]}')).toEqual({
      ok: false,
      error: 'version',
    });
    expect(parseProject('{"schemaVersion":1,"kind":"other","groups":[]}')).toEqual({
      ok: false,
      error: 'invalid',
    });
    expect(parseProject('{"groups":[]}')).toEqual({ ok: false, error: 'invalid' });
    expect(parseProject('{')).toEqual({ ok: false, error: 'invalid' });
  });

  it('accepts a file without kind and drops a duplicated code inside one list', () => {
    const parsed = parseProject(JSON.stringify({
      schemaVersion: 1,
      groups: [{
        id: 'g1',
        name: 'Cohort',
        role: 'inclusion',
        items: [
          { scheme: 'icd10', code: 'F32.0', description: 'Mild', note: 'keep' },
          { scheme: 'icd10', code: 'F32.0', description: 'Mild again', note: 'drop' },
        ],
      }],
    }));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.project.kind).toBe(PROJECT_KIND);
    expect(parsed.project.groups[0].items).toEqual([
      { scheme: 'icd10', code: 'F32.0', description: 'Mild', note: 'keep' },
    ]);
  });

  it('saves and loads the whole project under the versioned storage key', async () => {
    const project = sampleProject();
    await saveStoredProject(project);
    const raw = await AsyncStorage.getItem(GROUPS_STORAGE_KEY);
    expect(GROUPS_STORAGE_KEY).toBe('medcodetranslator:groups:v1');
    expect(raw).toContain('"schemaVersion":1');
    await expect(loadStoredProject()).resolves.toEqual({ ok: true, project });
  });
});