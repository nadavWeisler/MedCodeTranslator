import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { SchemeKey } from '@medcode/core';
import { canUseFiles, downloadBytes, downloadText, XLSX_MIME } from './download';
import { buildExportSheets, sheetsToWorkbook } from './exportWorkbook';
import { parseImportFile, parseImportText, resolveImportRows, schemesToLoad, type ImportReview } from './importCodes';
import { loadVocabIndex } from './loadVocabulary';
import { addItems, countItems, createGroup, createId, deleteGroup, removeItem, updateGroup, updateItemNote } from './logic';
import { parseProject, serializeProject } from './projectFile';
import { schemesForExpansion } from './schemes';
import { loadStoredProject, saveStoredProject } from './storage';
import { emptyProject, type CodeListProject, type GroupItem, type GroupRole, type ResolvedCode } from './types';
import { hebrewFor, resolveCode } from './vocabulary';

export type Notice =
  | { type: 'added'; name: string; added: number; skipped: number; unknown: number }
  | { type: 'exported' }
  | { type: 'saved' }
  | { type: 'loaded' }
  | { type: 'invalid' }
  | { type: 'version' }
  | { type: 'empty-export' }
  | { type: 'no-codes' }
  | { type: 'web-only' }
  | { type: 'file-error' }
  | { type: 'storage-version' };

export type DialogState =
  | { type: 'none' }
  | { type: 'create'; error?: 'name' }
  | { type: 'edit'; groupId: string; error?: 'name' }
  | { type: 'delete'; groupId: string }
  | { type: 'pick-group'; resolved: ResolvedCode }
  | { type: 'descendants'; groupId: string; resolved: ResolvedCode }
  | { type: 'unknown'; scheme: SchemeKey; code: string }
  | { type: 'import'; groupId: string }
  | { type: 'import-review'; groupId: string; review: ImportReview };

type GroupForm = {
  name: string;
  role: GroupRole;
  note: string;
};

type ImportRequest = {
  text: string;
  file: { name: string; data: ArrayBuffer } | null;
  defaultScheme: SchemeKey;
};

export type CodeListsContextValue = {
  ready: boolean;
  busy: boolean;
  project: CodeListProject;
  notice: Notice | null;
  storageIssue: 'version' | null;
  dialog: DialogState;
  dismissNotice: () => void;
  closeDialog: () => void;
  openCreate: () => void;
  openEdit: (groupId: string) => void;
  openDelete: (groupId: string) => void;
  openImport: (groupId: string) => void;
  submitGroup: (input: GroupForm) => void;
  confirmDelete: () => void;
  removeCode: (groupId: string, scheme: SchemeKey, code: string) => void;
  setCodeNote: (groupId: string, scheme: SchemeKey, code: string, note: string) => void;
  requestAdd: (input: { scheme: SchemeKey; code: string }) => void;
  chooseGroup: (groupId: string) => void;
  createListForPending: () => void;
  confirmDescendants: (include: boolean) => void;
  confirmImportReview: (includeDescendants: boolean) => void;
  runImport: (input: ImportRequest) => void;
  exportExcel: (includeHebrew: boolean) => void;
  saveProject: () => void;
  loadProjectText: (text: string) => void;
  showNotice: (notice: Notice) => void;
};

const CodeListsContext = createContext<CodeListsContextValue | null>(null);

export function useCodeLists(): CodeListsContextValue {
  const value = useContext(CodeListsContext);
  if (!value) throw new Error('useCodeLists must be used within CodeListsProvider');
  return value;
}

export function CodeListsProvider({ children }: { children: React.ReactNode }) {
  const [project, setProject] = useState<CodeListProject>(emptyProject);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [storageIssue, setStorageIssue] = useState<'version' | null>(null);
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' });
  const projectRef = useRef(project);
  const persistRef = useRef(false);
  const pendingAfterCreate = useRef<ResolvedCode | null>(null);
  projectRef.current = project;

  useEffect(() => {
    let cancelled = false;
    loadStoredProject()
      .then(result => {
        if (cancelled) return;
        if (result.ok) {
          projectRef.current = result.project;
          setProject(result.project);
          persistRef.current = true;
          setStorageIssue(null);
        } else if (result.error === 'version') {
          setStorageIssue('version');
          setNotice({ type: 'storage-version' });
          persistRef.current = false;
        } else {
          persistRef.current = true;
        }
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        persistRef.current = true;
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !persistRef.current) return;
    saveStoredProject(project).catch(() => {});
  }, [project, ready]);

  const replaceProject = useCallback((next: CodeListProject) => {
    projectRef.current = next;
    setProject(next);
  }, []);

  const commitItems = useCallback((groupId: string, items: GroupItem[], unknown = 0) => {
    const result = addItems(projectRef.current, groupId, items);
    replaceProject(result.project);
    const name = result.project.groups.find(group => group.id === groupId)?.name ?? '';
    setNotice({ type: 'added', name, added: result.added, skipped: result.skipped, unknown });
    setDialog({ type: 'none' });
  }, [replaceProject]);

  const offerDescendants = useCallback((groupId: string, resolved: ResolvedCode) => {
    if (resolved.descendants.length > 0) {
      setDialog({ type: 'descendants', groupId, resolved });
      return;
    }
    commitItems(groupId, [resolved.item]);
  }, [commitItems]);

  const closeDialog = useCallback(() => {
    pendingAfterCreate.current = null;
    setDialog({ type: 'none' });
  }, []);

  const openCreate = useCallback(() => {
    pendingAfterCreate.current = null;
    setDialog({ type: 'create' });
  }, []);

  const openEdit = useCallback((groupId: string) => {
    setDialog({ type: 'edit', groupId });
  }, []);

  const openDelete = useCallback((groupId: string) => {
    setDialog({ type: 'delete', groupId });
  }, []);

  const openImport = useCallback((groupId: string) => {
    setDialog({ type: 'import', groupId });
  }, []);

  const submitGroup = useCallback((input: GroupForm) => {
    if (dialog.type === 'edit') {
      const result = updateGroup(projectRef.current, dialog.groupId, input);
      if (!result.ok) {
        setDialog({ type: 'edit', groupId: dialog.groupId, error: 'name' });
        return;
      }
      replaceProject(result.project);
      setDialog({ type: 'none' });
      return;
    }

    if (dialog.type !== 'create') return;
    const result = createGroup(projectRef.current, input, createId());
    if (!result.ok) {
      setDialog({ type: 'create', error: 'name' });
      return;
    }
    replaceProject(result.project);
    const pending = pendingAfterCreate.current;
    pendingAfterCreate.current = null;
    if (pending) {
      offerDescendants(result.group.id, pending);
      return;
    }
    setDialog({ type: 'none' });
  }, [dialog, offerDescendants, replaceProject]);

  const confirmDelete = useCallback(() => {
    if (dialog.type !== 'delete') return;
    replaceProject(deleteGroup(projectRef.current, dialog.groupId));
    setDialog({ type: 'none' });
  }, [dialog, replaceProject]);

  const removeCode = useCallback((groupId: string, scheme: SchemeKey, code: string) => {
    replaceProject(removeItem(projectRef.current, groupId, scheme, code));
  }, [replaceProject]);

  const setCodeNote = useCallback((groupId: string, scheme: SchemeKey, code: string, note: string) => {
    replaceProject(updateItemNote(projectRef.current, groupId, scheme, code, note));
  }, [replaceProject]);

  const requestAdd = useCallback((input: { scheme: SchemeKey; code: string }) => {
    if (!ready || busy) return;
    setBusy(true);
    loadVocabIndex(schemesForExpansion(input.scheme))
      .then(index => {
        const resolved = resolveCode(index, input.scheme, input.code);
        if (!resolved) {
          setDialog({ type: 'unknown', scheme: input.scheme, code: input.code.trim() });
          return;
        }
        const groups = projectRef.current.groups;
        if (groups.length === 0) {
          pendingAfterCreate.current = resolved;
          setDialog({ type: 'create' });
          return;
        }
        if (groups.length === 1) {
          offerDescendants(groups[0].id, resolved);
          return;
        }
        setDialog({ type: 'pick-group', resolved });
      })
      .catch(() => setNotice({ type: 'file-error' }))
      .finally(() => setBusy(false));
  }, [busy, offerDescendants, ready]);

  const chooseGroup = useCallback((groupId: string) => {
    if (dialog.type !== 'pick-group') return;
    offerDescendants(groupId, dialog.resolved);
  }, [dialog, offerDescendants]);

  const createListForPending = useCallback(() => {
    if (dialog.type !== 'pick-group') return;
    pendingAfterCreate.current = dialog.resolved;
    setDialog({ type: 'create' });
  }, [dialog]);

  const confirmDescendants = useCallback((include: boolean) => {
    if (dialog.type !== 'descendants') return;
    const items = include
      ? [dialog.resolved.item, ...dialog.resolved.descendants]
      : [dialog.resolved.item];
    commitItems(dialog.groupId, items);
  }, [commitItems, dialog]);

  const finishImport = useCallback((groupId: string, review: ImportReview, includeDescendants: boolean) => {
    const items = [...review.items];
    if (includeDescendants) {
      for (const category of review.categories) items.push(...category.descendants);
    }
    commitItems(groupId, items, review.unknown.length);
  }, [commitItems]);

  const confirmImportReview = useCallback((includeDescendants: boolean) => {
    if (dialog.type !== 'import-review') return;
    finishImport(dialog.groupId, dialog.review, includeDescendants);
  }, [dialog, finishImport]);

  const runImport = useCallback((input: ImportRequest) => {
    if (!ready || busy) return;
    setBusy(true);
    const task = Promise.resolve().then(() => {
      const rows = input.file
        ? parseImportFile(input.file.name, input.file.data)
        : parseImportText(input.text);
      return loadVocabIndex(schemesToLoad(rows, input.defaultScheme)).then(index => ({
        rows,
        index,
      }));
    });

    task
      .then(({ rows, index }) => {
        const review = resolveImportRows(rows, input.defaultScheme, index);
        const groupId = importGroupId(dialog);
        if (!groupId) return;
        if (review.items.length === 0 && review.unknown.length === 0) {
          setNotice({ type: 'no-codes' });
          return;
        }
        if (review.unknown.length > 0 || review.categories.length > 0) {
          setDialog({ type: 'import-review', groupId, review });
          return;
        }
        finishImport(groupId, review, false);
      })
      .catch(() => setNotice({ type: 'file-error' }))
      .finally(() => setBusy(false));
  }, [busy, dialog, finishImport, ready]);

  const exportExcel = useCallback((includeHebrew: boolean) => {
    if (countItems(projectRef.current) === 0) {
      setNotice({ type: 'empty-export' });
      return;
    }
    if (!canUseFiles()) {
      setNotice({ type: 'web-only' });
      return;
    }
    setBusy(true);
    const current = projectRef.current;
    const schemes = [...new Set(current.groups.flatMap(group => group.items.map(item => item.scheme)))];
    const lookup = includeHebrew
      ? loadVocabIndex(schemes).then(index => (scheme: SchemeKey, code: string) => hebrewFor(index, scheme, code))
      : Promise.resolve(undefined);

    lookup
      .then(hebrew => {
        const sheets = buildExportSheets(current, { includeHebrew, hebrew });
        const bytes = sheetsToWorkbook(sheets);
        const stamp = new Date().toISOString().slice(0, 10);
        const ok = downloadBytes(`code-lists-${stamp}.xlsx`, bytes, XLSX_MIME);
        setNotice({ type: ok ? 'exported' : 'web-only' });
      })
      .catch(() => setNotice({ type: 'file-error' }))
      .finally(() => setBusy(false));
  }, []);

  const saveProject = useCallback(() => {
    if (!canUseFiles()) {
      setNotice({ type: 'web-only' });
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    const ok = downloadText(
      `code-lists-${stamp}.json`,
      serializeProject(projectRef.current),
      'application/json'
    );
    setNotice({ type: ok ? 'saved' : 'web-only' });
  }, []);

  const loadProjectText = useCallback((text: string) => {
    const parsed = parseProject(text);
    if (!parsed.ok) {
      setNotice({ type: parsed.error === 'version' ? 'version' : 'invalid' });
      return;
    }
    persistRef.current = true;
    setStorageIssue(null);
    replaceProject(parsed.project);
    setNotice({ type: 'loaded' });
    setDialog({ type: 'none' });
  }, [replaceProject]);

  const value = useMemo<CodeListsContextValue>(() => ({
    ready,
    busy,
    project,
    notice,
    storageIssue,
    dialog,
    dismissNotice: () => setNotice(null),
    closeDialog,
    openCreate,
    openEdit,
    openDelete,
    openImport,
    submitGroup,
    confirmDelete,
    removeCode,
    setCodeNote,
    requestAdd,
    chooseGroup,
    createListForPending,
    confirmDescendants,
    confirmImportReview,
    runImport,
    exportExcel,
    saveProject,
    loadProjectText,
    showNotice: setNotice,
  }), [
    ready,
    busy,
    project,
    notice,
    storageIssue,
    dialog,
    closeDialog,
    openCreate,
    openEdit,
    openDelete,
    openImport,
    submitGroup,
    confirmDelete,
    removeCode,
    setCodeNote,
    requestAdd,
    chooseGroup,
    createListForPending,
    confirmDescendants,
    confirmImportReview,
    runImport,
    exportExcel,
    saveProject,
    loadProjectText,
  ]);

  return (
    <CodeListsContext.Provider value={value}>
      {children}
    </CodeListsContext.Provider>
  );
}

function importGroupId(dialog: DialogState): string | null {
  if (dialog.type === 'import' || dialog.type === 'import-review') return dialog.groupId;
  return null;
}
