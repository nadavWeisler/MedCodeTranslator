import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { SchemeKey } from '@medcode/core';
import { SCHEMES } from './SchemeTabs';
import { canUseFiles, pickBinaryFile, pickTextFile } from '../services/codeLists/download';
import { useCodeLists, type DialogState, type Notice } from '../services/codeLists/CodeListsProvider';
import { schemeExportLabel } from '../services/codeLists/schemes';
import type { CodeGroup, GroupRole } from '../services/codeLists/types';
import { isRTL as checkRTL } from '../services/rtl';
import { spacing } from '../constants/spacing';
import { colors, radii, typography } from '../constants/theme';

const MONO = typography.monoFamily;
const VISIBLE_CODES = 40;

type Props = {
  defaultScheme: SchemeKey;
};

export default function CodeListsPanel({ defaultScheme }: Props) {
  const { t, i18n } = useTranslation();
  const rtl = checkRTL(i18n.language);
  const align = rtl ? 'right' : 'left';
  const { height } = useWindowDimensions();
  const lists = useCodeLists();
  const [open, setOpen] = useState(true);
  const listMaxHeight = height < 900 ? 72 : Math.min(240, Math.round(height * 0.28));
  const [includeHebrew, setIncludeHebrew] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const codeCount = lists.project.groups.reduce((total, group) => total + group.items.length, 0);
  const textAlign = align;

  const toggleGroup = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const loadProject = async () => {
    if (!canUseFiles()) {
      lists.showNotice({ type: 'web-only' });
      return;
    }
    const text = await pickTextFile('.json,application/json');
    if (text == null) return;
    lists.loadProjectText(text);
  };

  return (
    <View style={styles.panel}>
      <View style={[styles.header, rtl && styles.headerRtl]}>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { textAlign }]}>{t('code_lists_title')}</Text>
          <Text style={[styles.summary, { textAlign }]}>
            {t('code_lists_summary', { lists: lists.project.groups.length, codes: codeCount })}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setOpen(prev => !prev)}
          accessibilityRole="button"
          accessibilityLabel={open ? t('code_lists_toggle_close') : t('code_lists_toggle_open')}
        >
          <Text style={styles.link}>{open ? t('code_lists_toggle_close') : t('code_lists_toggle_open')}</Text>
        </TouchableOpacity>
      </View>

      {open ? (
          <ScrollView
            style={{ maxHeight: listMaxHeight, flexGrow: 0 }}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.body}
          >
            <View style={[styles.actions, rtl && styles.headerRtl]}>
              <ActionButton label={t('code_lists_create')} onPress={lists.openCreate} primary />
              <ActionButton label={t('code_lists_export')} onPress={() => lists.exportExcel(includeHebrew)} />
              <ActionButton label={t('code_lists_project_save')} onPress={lists.saveProject} />
              <ActionButton label={t('code_lists_project_load')} onPress={loadProject} />
            </View>
            <Text style={[styles.subtitle, { textAlign }]}>{t('code_lists_subtitle')}</Text>
            <Text style={[styles.phi, { textAlign }]}>{t('code_lists_phi')}</Text>
            {lists.storageIssue === 'version' ? (
              <Text style={[styles.phi, { textAlign }]}>{t('code_lists_notice_storage_version')}</Text>
            ) : null}

            {lists.notice ? (
              <View style={styles.notice}>
                <Text style={[styles.noticeText, { textAlign }]}>{noticeMessage(lists.notice, t)}</Text>
                <TouchableOpacity onPress={lists.dismissNotice} accessibilityRole="button">
                  <Text style={styles.link}>{t('code_lists_dismiss')}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {lists.busy || !lists.ready ? (
              <View style={styles.busyRow}>
                <ActivityIndicator size="small" color={colors.teal} />
                <Text style={styles.busyText}>{t('code_lists_checking')}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.checkRow, rtl && styles.headerRtl]}
              onPress={() => setIncludeHebrew(prev => !prev)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: includeHebrew }}
            >
              <View style={[styles.checkbox, includeHebrew && styles.checkboxOn]}>
                {includeHebrew ? <Text style={styles.checkboxMark}>✓</Text> : null}
              </View>
              <View style={styles.checkCopy}>
                <Text style={[styles.checkLabel, { textAlign }]}>{t('code_lists_export_hebrew')}</Text>
                <Text style={[styles.checkHint, { textAlign }]}>{t('code_lists_export_hebrew_hint')}</Text>
              </View>
            </TouchableOpacity>

            {lists.project.groups.length === 0 ? (
              <Text style={[styles.empty, { textAlign }]}>{t('code_lists_empty')}</Text>
            ) : (
              lists.project.groups.map(group => (
                <GroupCard
                  key={group.id}
                  group={group}
                  expanded={expanded.has(group.id)}
                  rtl={rtl}
                  textAlign={textAlign}
                  t={t}
                  onToggle={() => toggleGroup(group.id)}
                  onEdit={() => lists.openEdit(group.id)}
                  onDelete={() => lists.openDelete(group.id)}
                  onImport={() => lists.openImport(group.id)}
                  onRemove={(scheme, code) => lists.removeCode(group.id, scheme, code)}
                  onNote={(scheme, code, note) => lists.setCodeNote(group.id, scheme, code, note)}
                />
              ))
            )}
          </ScrollView>
      ) : null}

      <ListsDialog
        dialog={lists.dialog}
        groups={lists.project.groups}
        defaultScheme={defaultScheme}
        rtl={rtl}
        busy={lists.busy}
      />
    </View>
  );
}

function GroupCard({
  group,
  expanded,
  rtl,
  textAlign,
  t,
  onToggle,
  onEdit,
  onDelete,
  onImport,
  onRemove,
  onNote,
}: {
  group: CodeGroup;
  expanded: boolean;
  rtl: boolean;
  textAlign: 'left' | 'right';
  t: (key: string, options?: Record<string, unknown>) => string;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onImport: () => void;
  onRemove: (scheme: SchemeKey, code: string) => void;
  onNote: (scheme: SchemeKey, code: string, note: string) => void;
}) {
  const inclusion = group.role === 'inclusion';
  const visible = group.items.slice(0, VISIBLE_CODES);
  const hidden = group.items.length - visible.length;
  return (
    <View style={styles.card}>
      <View style={[styles.cardTop, rtl && styles.headerRtl]}>
        <View style={styles.headerCopy}>
          <Text style={[styles.cardName, { textAlign }]}>{group.name}</Text>
          <View style={[styles.badge, inclusion ? styles.badgeIn : styles.badgeOut]}>
            <Text style={[styles.badgeText, inclusion ? styles.badgeInText : styles.badgeOutText]}>
              {inclusion ? t('code_lists_role_inclusion') : t('code_lists_role_exclusion')}
            </Text>
          </View>
          <Text style={[styles.cardMeta, { textAlign }]}>
            {t('code_lists_item_count', { count: group.items.length })}
          </Text>
          {group.note ? <Text style={[styles.cardNote, { textAlign }]}>{group.note}</Text> : null}
        </View>
      </View>
      <View style={[styles.actions, rtl && styles.headerRtl]}>
        <ActionButton label={expanded ? t('code_lists_hide_codes') : t('code_lists_show_codes')} onPress={onToggle} />
        <ActionButton label={t('code_lists_import')} onPress={onImport} />
        <ActionButton label={t('code_lists_edit')} onPress={onEdit} />
        <ActionButton label={t('code_lists_delete')} onPress={onDelete} />
      </View>
      {expanded ? (
        <View style={styles.codeList}>
          {group.items.length === 0 ? (
            <Text style={[styles.empty, { textAlign }]}>{t('code_lists_empty_group')}</Text>
          ) : visible.map(item => {
            const schemeLabel = SCHEMES.find(scheme => scheme.key === item.scheme)?.shortLabel ?? item.scheme;
            return (
              <View key={`${item.scheme}:${item.code}`} style={styles.codeRow}>
                <View style={[styles.codeLine, rtl && styles.headerRtl]}>
                  <Text style={[styles.codeValue, { fontFamily: MONO }]}>{item.code}</Text>
                  <Text style={styles.schemeTag}>{schemeLabel}</Text>
                  <TouchableOpacity
                    onPress={() => onRemove(item.scheme, item.code)}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('code_lists_remove')} ${item.code}`}
                  >
                    <Text style={styles.remove}>{t('code_lists_remove')}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.codeDesc, { textAlign }]}>
                  {item.description || t('code_lists_category_blank')}
                </Text>
                <NoteField
                  value={item.note ?? ''}
                  placeholder={t('code_lists_code_note')}
                  textAlign={textAlign}
                  onCommit={note => onNote(item.scheme, item.code, note)}
                />
              </View>
            );
          })}
          {hidden > 0 ? (
            <Text style={[styles.cardMeta, { textAlign }]}>
              {t('code_lists_more_hidden', { shown: visible.length, count: group.items.length })}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function NoteField({
  value,
  placeholder,
  textAlign,
  onCommit,
}: {
  value: string;
  placeholder: string;
  textAlign: 'left' | 'right';
  onCommit: (note: string) => void;
}) {
  const [text, setText] = useState(value);
  return (
    <TextInput
      value={text}
      onChangeText={setText}
      onEndEditing={() => {
        if (text.trim() !== value.trim()) onCommit(text);
      }}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      style={[styles.noteInput, { textAlign }]}
    />
  );
}

function ActionButton({ label, onPress, primary = false }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, primary && styles.actionBtnPrimary]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Text style={[styles.actionText, primary && styles.actionTextPrimary]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ListsDialog({
  dialog,
  groups,
  defaultScheme,
  rtl,
  busy,
}: {
  dialog: DialogState;
  groups: CodeGroup[];
  defaultScheme: SchemeKey;
  rtl: boolean;
  busy: boolean;
}) {
  const { t } = useTranslation();
  const lists = useCodeLists();
  if (dialog.type === 'none') return null;

  let title = '';
  let body: React.ReactNode = null;
  switch (dialog.type) {
    case 'create':
    case 'edit': {
      const group = dialog.type === 'edit' ? groups.find(item => item.id === dialog.groupId) : undefined;
      title = dialog.type === 'create' ? t('code_lists_create') : t('code_lists_edit');
      body = (
        <GroupForm
          initial={{
            name: group?.name ?? '',
            role: group?.role ?? 'inclusion',
            note: group?.note ?? '',
          }}
          error={dialog.error}
          rtl={rtl}
          onCancel={lists.closeDialog}
          onSubmit={lists.submitGroup}
        />
      );
      break;
    }
    case 'delete': {
      const group = groups.find(item => item.id === dialog.groupId);
      title = t('code_lists_delete_title');
      body = (
        <View style={styles.dialogStack}>
          <Text style={styles.dialogBody}>{t('code_lists_delete_body', { name: group?.name ?? '' })}</Text>
          <View style={styles.dialogActions}>
            <ActionButton label={t('code_lists_cancel')} onPress={lists.closeDialog} />
            <ActionButton label={t('code_lists_confirm_delete')} onPress={lists.confirmDelete} primary />
          </View>
        </View>
      );
      break;
    }
    case 'pick-group':
      title = t('code_lists_pick_title');
      body = (
        <View style={styles.dialogStack}>
          <Text style={styles.dialogBody}>{t('code_lists_pick_body', { code: dialog.resolved.item.code })}</Text>
          {groups.map(group => (
            <TouchableOpacity
              key={group.id}
              style={styles.pickRow}
              onPress={() => lists.chooseGroup(group.id)}
              accessibilityRole="button"
            >
              <Text style={styles.cardName}>{group.name}</Text>
              <Text style={styles.cardMeta}>
                {group.role === 'inclusion' ? t('code_lists_role_inclusion') : t('code_lists_role_exclusion')}
                {' · '}
                {t('code_lists_item_count', { count: group.items.length })}
              </Text>
            </TouchableOpacity>
          ))}
          <ActionButton label={t('code_lists_create')} onPress={lists.createListForPending} primary />
        </View>
      );
      break;
    case 'unknown':
      title = t('code_lists_unknown_title');
      body = (
        <View style={styles.dialogStack}>
          <Text style={styles.dialogBody}>
            {t('code_lists_unknown_body', {
              code: dialog.code,
              scheme: schemeExportLabel(dialog.scheme),
            })}
          </Text>
          <ActionButton label={t('code_lists_close')} onPress={lists.closeDialog} primary />
        </View>
      );
      break;
    case 'descendants': {
      const examples = dialog.resolved.descendants.slice(0, 8).map(item => item.code).join(', ');
      title = t('code_lists_descendants_title');
      body = (
        <View style={styles.dialogStack}>
          <Text style={styles.dialogBody}>
            {t('code_lists_descendants_body', {
              code: dialog.resolved.item.code,
              count: dialog.resolved.descendants.length,
            })}
          </Text>
          <Text style={styles.dialogBody}>{t('code_lists_descendants_examples', { codes: examples })}</Text>
          <View style={styles.dialogActions}>
            <ActionButton label={t('code_lists_descendants_only')} onPress={() => lists.confirmDescendants(false)} />
            <ActionButton label={t('code_lists_descendants_all')} onPress={() => lists.confirmDescendants(true)} primary />
          </View>
          <ActionButton label={t('code_lists_cancel')} onPress={lists.closeDialog} />
        </View>
      );
      break;
    }
    case 'import':
      title = t('code_lists_import_title');
      body = (
        <ImportForm
          defaultScheme={defaultScheme}
          rtl={rtl}
          busy={busy}
          onCancel={lists.closeDialog}
          onSubmit={lists.runImport}
          onWebOnly={() => lists.showNotice({ type: 'web-only' })}
        />
      );
      break;
    case 'import-review': {
      const descendantCount = dialog.review.categories.reduce((total, item) => total + item.descendants.length, 0);
      title = t('code_lists_import_review_title');
      body = (
        <View style={styles.dialogStack}>
          <Text style={styles.dialogBody}>{t('code_lists_import_known', { count: dialog.review.items.length })}</Text>
          {dialog.review.categories.length > 0 ? (
            <Text style={styles.dialogBody}>
              {t('code_lists_bulk_body', { parents: dialog.review.categories.length, count: descendantCount })}
            </Text>
          ) : null}
          <Text style={styles.dialogLabel}>{t('code_lists_import_unknown_heading')}</Text>
          {dialog.review.unknown.length === 0 ? (
            <Text style={styles.dialogBody}>{t('code_lists_import_no_unknown')}</Text>
          ) : (
            <ScrollView style={styles.unknownList}>
              {dialog.review.unknown.map(issue => (
                <Text key={`${issue.reason}:${issue.scheme}:${issue.code}`} style={styles.unknownLine}>
                  {issue.reason === 'invalid_scheme'
                    ? t('code_lists_import_invalid_scheme', { code: issue.code, scheme: issue.scheme })
                    : t('code_lists_import_unknown_line', { code: issue.code, scheme: schemeLabel(issue.scheme) })}
                </Text>
              ))}
            </ScrollView>
          )}
          <View style={styles.dialogActions}>
            {dialog.review.categories.length > 0 ? (
              <>
                <ActionButton label={t('code_lists_bulk_no')} onPress={() => lists.confirmImportReview(false)} />
                <ActionButton label={t('code_lists_bulk_yes')} onPress={() => lists.confirmImportReview(true)} primary />
              </>
            ) : dialog.review.items.length > 0 ? (
              <ActionButton label={t('code_lists_import_add')} onPress={() => lists.confirmImportReview(false)} primary />
            ) : null}
            <ActionButton label={t('code_lists_cancel')} onPress={lists.closeDialog} />
          </View>
        </View>
      );
      break;
    }
    default: {
      const exhaustive: never = dialog;
      return exhaustive;
    }
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={lists.closeDialog}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <Text style={[styles.modalTitle, rtl && styles.textRight]}>{title}</Text>
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.modalScroll}>
            {body}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function GroupForm({
  initial,
  error,
  rtl,
  onCancel,
  onSubmit,
}: {
  initial: { name: string; role: GroupRole; note: string };
  error?: 'name';
  rtl: boolean;
  onCancel: () => void;
  onSubmit: (input: { name: string; role: GroupRole; note: string }) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial.name);
  const [role, setRole] = useState<GroupRole>(initial.role);
  const [note, setNote] = useState(initial.note);
  const textAlign = rtl ? 'right' : 'left';
  return (
    <View style={styles.dialogStack}>
      <Text style={[styles.dialogLabel, { textAlign }]}>{t('code_lists_name_label')}</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={t('code_lists_name_placeholder')}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { textAlign }]}
      />
      {error === 'name' ? <Text style={styles.error}>{t('code_lists_name_required')}</Text> : null}
      <Text style={[styles.dialogLabel, { textAlign }]}>{t('code_lists_role_label')}</Text>
      <View style={[styles.dialogActions, rtl && styles.headerRtl]}>
        <RoleButton label={t('code_lists_role_inclusion')} selected={role === 'inclusion'} onPress={() => setRole('inclusion')} />
        <RoleButton label={t('code_lists_role_exclusion')} selected={role === 'exclusion'} onPress={() => setRole('exclusion')} />
      </View>
      <Text style={[styles.dialogLabel, { textAlign }]}>{t('code_lists_note_label')}</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder={t('code_lists_note_placeholder')}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { textAlign }]}
      />
      <View style={styles.dialogActions}>
        <ActionButton label={t('code_lists_cancel')} onPress={onCancel} />
        <ActionButton label={t('code_lists_save')} onPress={() => onSubmit({ name, role, note })} primary />
      </View>
    </View>
  );
}

function ImportForm({
  defaultScheme,
  rtl,
  busy,
  onCancel,
  onSubmit,
  onWebOnly,
}: {
  defaultScheme: SchemeKey;
  rtl: boolean;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (input: { text: string; file: { name: string; data: ArrayBuffer } | null; defaultScheme: SchemeKey }) => void;
  onWebOnly: () => void;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [scheme, setScheme] = useState<SchemeKey>(defaultScheme);
  const [file, setFile] = useState<{ name: string; data: ArrayBuffer } | null>(null);
  const textAlign = rtl ? 'right' : 'left';

  const chooseFile = async () => {
    if (!canUseFiles()) {
      onWebOnly();
      return;
    }
    const picked = await pickBinaryFile('.xlsx,.csv,.txt,text/csv,text/plain');
    if (picked) setFile(picked);
  };

  return (
    <View style={styles.dialogStack}>
      <Text style={[styles.dialogBody, { textAlign }]}>{t('code_lists_import_hint')}</Text>
      <Text style={[styles.dialogLabel, { textAlign }]}>{t('code_lists_import_scheme')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.schemeRow}>
        {SCHEMES.map(item => (
          <TouchableOpacity
            key={item.key}
            style={[styles.schemeChip, scheme === item.key && { borderColor: item.color, backgroundColor: `${item.color}14` }]}
            onPress={() => setScheme(item.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: scheme === item.key }}
          >
            <Text style={[styles.schemeChipText, scheme === item.key && { color: item.color }]}>{item.shortLabel}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Text style={[styles.dialogLabel, { textAlign }]}>{t('code_lists_import_paste')}</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        placeholder={t('code_lists_import_paste')}
        placeholderTextColor={colors.textMuted}
        style={[styles.paste, { textAlign }]}
      />
      <View style={styles.dialogActions}>
        <ActionButton label={t('code_lists_import_file')} onPress={chooseFile} />
        {file ? <ActionButton label={t('code_lists_import_clear_file')} onPress={() => setFile(null)} /> : null}
      </View>
      {file ? <Text style={styles.cardMeta}>{t('code_lists_import_file_selected', { name: file.name })}</Text> : null}
      <View style={styles.dialogActions}>
        <ActionButton label={t('code_lists_cancel')} onPress={onCancel} />
        <ActionButton
          label={busy ? t('code_lists_checking') : t('code_lists_import_submit')}
          onPress={() => onSubmit({ text, file, defaultScheme: scheme })}
          primary
        />
      </View>
    </View>
  );
}

function RoleButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, selected && styles.actionBtnPrimary]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.actionText, selected && styles.actionTextPrimary]}>{label}</Text>
    </TouchableOpacity>
  );
}

function schemeLabel(token: string): string {
  const match = SCHEMES.find(item => item.key === token);
  return match?.shortLabel ?? token;
}

function noticeMessage(notice: Notice, t: (key: string, options?: Record<string, unknown>) => string): string {
  switch (notice.type) {
    case 'added':
      return t('code_lists_notice_added', notice);
    case 'exported':
      return t('code_lists_notice_exported');
    case 'saved':
      return t('code_lists_notice_saved');
    case 'loaded':
      return t('code_lists_notice_loaded');
    case 'invalid':
      return t('code_lists_notice_invalid');
    case 'version':
      return t('code_lists_notice_version');
    case 'empty-export':
      return t('code_lists_notice_empty_export');
    case 'no-codes':
      return t('code_lists_notice_no_codes');
    case 'web-only':
      return t('code_lists_notice_web_only');
    case 'file-error':
      return t('code_lists_notice_file');
    case 'storage-version':
      return t('code_lists_notice_storage_version');
    default: {
      const exhaustive: never = notice;
      return exhaustive;
    }
  }
}

const styles = StyleSheet.create({
  panel: {
    flexShrink: 1,
    minHeight: 0,
    overflow: 'hidden',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    padding: spacing.md,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerRtl: {
    flexDirection: 'row-reverse',
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
    letterSpacing: 0.2,
  },
  summary: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  phi: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.danger,
    fontWeight: '600',
  },
  body: {
    gap: 10,
    paddingBottom: 4,
  },
  notice: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.tealMuted,
    backgroundColor: colors.tealLight,
    padding: spacing.sm,
    gap: 4,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.navy,
    fontWeight: '600',
  },
  link: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.teal,
  },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  busyText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtn: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  actionBtnPrimary: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
  },
  actionTextPrimary: {
    color: colors.textInverse,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxOn: {
    backgroundColor: colors.teal,
  },
  checkboxMark: {
    color: colors.textInverse,
    fontSize: 12,
    fontWeight: '700',
  },
  checkCopy: {
    flex: 1,
    gap: 2,
  },
  checkLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  checkHint: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.textMuted,
  },
  empty: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardMeta: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  cardNote: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  badgeIn: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
  },
  badgeOut: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeInText: {
    color: colors.success,
  },
  badgeOutText: {
    color: colors.warning,
  },
  codeList: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 8,
  },
  codeRow: {
    gap: 4,
  },
  codeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
  },
  schemeTag: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  codeDesc: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  remove: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceRaised,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modal: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '86%',
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.navy,
  },
  modalScroll: {
    flexGrow: 0,
    maxHeight: 480,
  },
  dialogStack: {
    gap: 8,
  },
  dialogBody: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  dialogLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
  },
  dialogActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  paste: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    textAlignVertical: 'top',
  },
  error: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: '600',
  },
  pickRow: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: 2,
    backgroundColor: colors.surfaceRaised,
  },
  schemeRow: {
    gap: 6,
    paddingVertical: 2,
  },
  schemeChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  schemeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  unknownList: {
    maxHeight: 140,
  },
  unknownLine: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.danger,
    fontWeight: '600',
  },
  textRight: {
    textAlign: 'right',
  },
});
