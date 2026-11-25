import { addItems, createGroup, deleteGroup, removeItem, updateGroup, updateItemNote } from '../app/services/codeLists/logic';
import { emptyProject, type GroupItem } from '../app/services/codeLists/types';

const metformin: GroupItem = {
  scheme: 'atc5',
  code: 'A10BA02',
  description: 'metformin',
};

const diabetes: GroupItem = {
  scheme: 'icd10',
  code: 'E11.9',
  description: 'Type 2 diabetes mellitus without complications',
};

describe('code list groups', () => {
  it('creates inclusion and exclusion lists with an optional note', () => {
    const inclusion = createGroup(emptyProject(), { name: '  Diabetes cohort  ', role: 'inclusion', note: '  adults  ' }, 'g1');
    expect(inclusion.ok).toBe(true);
    if (!inclusion.ok) return;
    expect(inclusion.group).toMatchObject({
      id: 'g1',
      name: 'Diabetes cohort',
      role: 'inclusion',
      note: 'adults',
      items: [],
    });

    const exclusion = createGroup(inclusion.project, { name: 'Pregnancy', role: 'exclusion' }, 'g2');
    expect(exclusion.ok).toBe(true);
    if (!exclusion.ok) return;
    expect(exclusion.project.groups.map(group => group.role)).toEqual(['inclusion', 'exclusion']);
  });

  it('rejects a blank list name', () => {
    expect(createGroup(emptyProject(), { name: '   ', role: 'inclusion' }).ok).toBe(false);
  });

  it('adds codes, blocks duplicates in one list, and allows the same code in another list', () => {
    const first = createGroup(emptyProject(), { name: 'Inclusion', role: 'inclusion' }, 'in');
    const second = first.ok
      ? createGroup(first.project, { name: 'Exclusion', role: 'exclusion' }, 'ex')
      : first;
    if (!first.ok || !second.ok) throw new Error('setup failed');

    const added = addItems(second.project, 'in', [diabetes, diabetes, { ...diabetes, note: 'ignored' }]);
    expect(added.added).toBe(1);
    expect(added.skipped).toBe(2);
    expect(added.project.groups.find(group => group.id === 'in')?.items).toEqual([diabetes]);

    const other = addItems(added.project, 'ex', [diabetes]);
    expect(other.added).toBe(1);
    expect(other.project.groups.find(group => group.id === 'ex')?.items).toEqual([diabetes]);
  });

  it('removes a code, edits its note, and updates the list', () => {
    const created = createGroup(emptyProject(), { name: 'Meds', role: 'inclusion', note: 'draft' }, 'meds');
    if (!created.ok) throw new Error('setup failed');
    const withCode = addItems(created.project, 'meds', [{ ...metformin, note: '  first line  ' }]);
    expect(withCode.project.groups[0].items[0].note).toBe('first line');

    const noted = updateItemNote(withCode.project, 'meds', 'atc5', 'A10BA02', '   ');
    expect(noted.groups[0].items[0].note).toBeUndefined();

    const renamed = updateGroup(noted, 'meds', { name: 'Drugs', role: 'exclusion', note: '' });
    expect(renamed.ok).toBe(true);
    if (!renamed.ok) return;
    expect(renamed.group).toMatchObject({ name: 'Drugs', role: 'exclusion', note: undefined });

    const removed = removeItem(renamed.project, 'meds', 'atc5', 'A10BA02');
    expect(removed.groups[0].items).toEqual([]);
    expect(deleteGroup(removed, 'meds').groups).toEqual([]);
  });
});
