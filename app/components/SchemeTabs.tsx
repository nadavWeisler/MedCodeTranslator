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

type Props = {
  active: SchemeKey;
  onChange: (scheme: SchemeKey) => void;
  hintLabel?: string;
  compact?: boolean;
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

export default function SchemeTabs({ active, onChange, hintLabel, compact = false }: Props) {
  const activeScheme = SCHEMES.find(s => s.key === active)!;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {SCHEME_GROUPS.map(group => (
          <View key={group.key} style={styles.group}>
            <Text style={styles.groupLabel}>{group.label}</Text>
            <View style={styles.groupTabs}>
              {SCHEMES.filter(scheme => scheme.group === group.key).map(scheme => {
                const isActive = scheme.key === active;
                return (
                  <TouchableOpacity
                    key={scheme.key}
                    style={[
                      styles.pill,
                      isActive && {
                        backgroundColor: `${scheme.color}12`,
                        borderColor: `${scheme.color}55`,
                      },
                    ]}
                    onPress={() => onChange(scheme.key)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                  >
                    <SchemeDot color={scheme.color} active={isActive} />
                    <Text style={[styles.label, isActive && { color: scheme.color, fontWeight: '700' }]}>
                      {scheme.shortLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {!compact && (
        <View style={[styles.schemeSummary, { borderColor: `${activeScheme.color}30` }]}>
          <View style={styles.summaryRow}>
            <SchemeDot color={activeScheme.color} active />
            <Text style={[styles.schemeTitle, { color: activeScheme.color }]}>
              {activeScheme.label}
            </Text>
          </View>
          {!!hintLabel && <Text style={styles.searchHint}>{hintLabel}</Text>}
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
