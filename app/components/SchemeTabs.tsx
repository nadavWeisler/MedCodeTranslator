import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import type { SchemeKey } from '../../db/database';
import { spacing } from '../constants/spacing';
import { colors, radii, schemeColors } from '../constants/theme';

export type SchemeConfig = {
  key: SchemeKey;
  label: string;
  shortLabel: string;
  color: string;
  group: SchemeGroupKey;
};

export type SchemeGroupKey = 'medications' | 'diagnoses' | 'labs' | 'procedures';

export type SchemeGroupConfig = {
  key: SchemeGroupKey;
  label: string;
};

/** Default visible schemes — ICD-10 for diagnoses, ATC-5 for medications. */
export const PRIMARY_SCHEME_KEYS: SchemeKey[] = ['icd10', 'atc5'];

export function isPrimaryScheme(scheme: SchemeKey): boolean {
  return PRIMARY_SCHEME_KEYS.includes(scheme);
}

/** When collapsing the tab list, map non-primary schemes to their primary counterpart. */
export function collapseToPrimaryScheme(scheme: SchemeKey): SchemeKey {
  const group = getSchemeGroup(scheme).key;
  if (group === 'diagnoses') return 'icd10';
  if (group === 'medications') return 'atc5';
  return 'icd10';
}

export const SCHEME_GROUPS: SchemeGroupConfig[] = [
  { key: 'diagnoses', label: 'Diagnoses' },
  { key: 'medications', label: 'Medications' },
  { key: 'labs', label: 'Laboratory' },
  { key: 'procedures', label: 'Procedures' },
];

export const SCHEMES: SchemeConfig[] = [
  { key: 'icd10', label: 'ICD-10-CM',      shortLabel: 'ICD-10', color: schemeColors.icd10, group: 'diagnoses' },
  { key: 'icd9',  label: 'ICD-9-CM',       shortLabel: 'ICD-9',  color: schemeColors.icd9,  group: 'diagnoses' },
  { key: 'icd11', label: 'ICD-11',         shortLabel: 'ICD-11', color: schemeColors.icd11, group: 'diagnoses' },
  { key: 'atc1',  label: 'ATC Level 1',    shortLabel: 'ATC-1',  color: schemeColors.atc1,  group: 'medications' },
  { key: 'atc2',  label: 'ATC Level 2',    shortLabel: 'ATC-2',  color: schemeColors.atc2,  group: 'medications' },
  { key: 'atc3',  label: 'ATC Level 3',    shortLabel: 'ATC-3',  color: schemeColors.atc3,  group: 'medications' },
  { key: 'atc4',  label: 'ATC Level 4',    shortLabel: 'ATC-4',  color: schemeColors.atc4,  group: 'medications' },
  { key: 'atc5',  label: 'ATC Level 5',    shortLabel: 'ATC-5',  color: schemeColors.atc5,  group: 'medications' },
  { key: 'cvx',   label: 'CVX Vaccines',   shortLabel: 'CVX',    color: schemeColors.cvx,   group: 'medications' },
  { key: 'loinc', label: 'LOINC',          shortLabel: 'LOINC',  color: schemeColors.loinc, group: 'labs' },
  { key: 'cpt',   label: 'CPT-4',          shortLabel: 'CPT',    color: schemeColors.cpt,   group: 'procedures' },
  { key: 'hcpcs', label: 'HCPCS Level II', shortLabel: 'HCPCS',  color: schemeColors.hcpcs, group: 'procedures' },
];

export function getSchemeGroup(scheme: SchemeKey): SchemeGroupConfig {
  const schemeConfig = SCHEMES.find(item => item.key === scheme)!;
  return SCHEME_GROUPS.find(group => group.key === schemeConfig.group)!;
}

function getVisibleSchemes(showAll: boolean): SchemeConfig[] {
  if (showAll) return SCHEMES;
  return SCHEMES.filter(scheme => isPrimaryScheme(scheme.key));
}

type Props = {
  active: SchemeKey;
  onChange: (scheme: SchemeKey) => void;
  hintLabel?: string;
  compact?: boolean;
  showAll?: boolean;
  onToggleShowAll?: () => void;
  showAllLabel?: string;
  showPrimaryLabel?: string;
  crossSchemeActive?: boolean;
  onCrossSchemeSelect?: () => void;
  crossSchemeLabel?: string;
  crossSchemeHint?: string;
};

function SchemeDot({ color, active }: { color: string; active: boolean }) {
  return (
    <View
      style={[
        styles.dot,
        { backgroundColor: active ? color : colors.border },
        active && { borderColor: color, backgroundColor: color },
      ]}
    />
  );
}

function SchemePill({
  scheme,
  isActive,
  onPress,
}: {
  scheme: SchemeConfig;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.pill,
        isActive && {
          backgroundColor: `${scheme.color}12`,
          borderColor: `${scheme.color}55`,
        },
      ]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
    >
      <SchemeDot color={scheme.color} active={isActive} />
      <Text style={[styles.label, isActive && { color: scheme.color, fontWeight: '700' }]}>
        {scheme.shortLabel}
      </Text>
    </TouchableOpacity>
  );
}

export default function SchemeTabs({
  active,
  onChange,
  hintLabel,
  compact = false,
  showAll = false,
  onToggleShowAll,
  showAllLabel = 'Show all systems',
  showPrimaryLabel = 'Primary systems only',
  crossSchemeActive = false,
  onCrossSchemeSelect,
  crossSchemeLabel = 'All systems',
  crossSchemeHint,
}: Props) {
  const activeScheme = SCHEMES.find(s => s.key === active)!;
  const visibleSchemes = getVisibleSchemes(showAll);
  const toggleLabel = showAll ? showPrimaryLabel : showAllLabel;
  const summaryTitle = crossSchemeActive ? crossSchemeLabel : activeScheme.label;
  const summaryColor = crossSchemeActive ? colors.teal : activeScheme.color;
  const summaryHint = crossSchemeActive ? crossSchemeHint : hintLabel;

  const crossSchemePill = onCrossSchemeSelect ? (
    <TouchableOpacity
      style={[
        styles.pill,
        styles.crossSchemePill,
        crossSchemeActive && {
          backgroundColor: `${colors.teal}12`,
          borderColor: `${colors.teal}55`,
        },
      ]}
      onPress={onCrossSchemeSelect}
      accessibilityRole="tab"
      accessibilityState={{ selected: crossSchemeActive }}
    >
      <Text style={[styles.label, crossSchemeActive && { color: colors.teal, fontWeight: '700' }]}>
        {crossSchemeLabel}
      </Text>
    </TouchableOpacity>
  ) : null;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {showAll ? (
          <View style={styles.group}>
            {crossSchemePill}
          </View>
        ) : null}
        {showAll ? (
          SCHEME_GROUPS.map(group => {
            const groupSchemes = visibleSchemes.filter(scheme => scheme.group === group.key);
            if (groupSchemes.length === 0) return null;

            return (
              <View key={group.key} style={styles.group}>
                <Text style={styles.groupLabel}>{group.label}</Text>
                <View style={styles.groupTabs}>
                  {groupSchemes.map(scheme => (
                    <SchemePill
                      key={scheme.key}
                      scheme={scheme}
                      isActive={scheme.key === active}
                      onPress={() => onChange(scheme.key)}
                    />
                  ))}
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.primaryRow}>
            {crossSchemePill}
            {visibleSchemes.map(scheme => (
              <SchemePill
                key={scheme.key}
                scheme={scheme}
                isActive={scheme.key === active}
                onPress={() => onChange(scheme.key)}
              />
            ))}
          </View>
        )}

        {onToggleShowAll ? (
          <TouchableOpacity
            style={[styles.toggleBtn, showAll && styles.toggleBtnActive]}
            onPress={onToggleShowAll}
            accessibilityRole="button"
            accessibilityState={{ expanded: showAll }}
            accessibilityLabel={toggleLabel}
          >
            <Text style={[styles.toggleText, showAll && styles.toggleTextActive]}>{toggleLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {!compact && (
        <View style={[styles.schemeSummary, { borderColor: `${summaryColor}30` }]}>
          <View style={styles.summaryRow}>
            <SchemeDot color={summaryColor} active />
            <Text style={[styles.schemeTitle, { color: summaryColor }]}>
              {summaryTitle}
            </Text>
          </View>
          {!!summaryHint && <Text style={styles.searchHint}>{summaryHint}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  scroll: {
    paddingBottom: spacing.xs,
    gap: 12,
    alignItems: 'center',
  },
  primaryRow: {
    flexDirection: 'row',
    gap: 6,
  },
  group: {
    gap: 6,
  },
  groupLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  groupTabs: {
    flexDirection: 'row',
    gap: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  crossSchemePill: {
    marginRight: 2,
  },
  toggleBtn: {
    alignSelf: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toggleBtnActive: {
    borderColor: colors.tealMuted,
    backgroundColor: colors.tealLight,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.tealDark,
    fontWeight: '700',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.1,
  },
  schemeSummary: {
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    gap: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  schemeTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  searchHint: {
    fontWeight: '500',
    color: colors.textMuted,
    fontSize: 12,
    marginLeft: 15,
  },
});
