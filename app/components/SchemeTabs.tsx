import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import type { SchemeKey } from '../../db/database';
import { spacing, radius } from '../constants/spacing';

export type SchemeConfig = {
  key: SchemeKey;
  label: string;
  shortLabel: string;
  color: string;
  icon: string;
  group: SchemeGroupKey;
};

export type SchemeGroupKey = 'medications' | 'diagnoses' | 'labs' | 'procedures';

export type SchemeGroupConfig = {
  key: SchemeGroupKey;
  label: string;
};

export const SCHEME_GROUPS: SchemeGroupConfig[] = [
  { key: 'diagnoses', label: 'Diagnoses' },
  { key: 'medications', label: 'Drugs & vaccines' },
  { key: 'labs', label: 'Labs' },
  { key: 'procedures', label: 'Procedures' },
];

export const SCHEMES: SchemeConfig[] = [
  { key: 'icd10', label: 'ICD-10',        shortLabel: 'ICD-10', color: '#059669', icon: '🩺', group: 'diagnoses' },
  { key: 'icd9',  label: 'ICD-9-CM',      shortLabel: 'ICD-9',  color: '#7c3aed', icon: '📋', group: 'diagnoses' },
  { key: 'icd11', label: 'ICD-11',        shortLabel: 'ICD-11', color: '#0891b2', icon: '🔬', group: 'diagnoses' },
  { key: 'atc1',  label: 'ATC-1',         shortLabel: 'ATC-1',  color: '#1d4ed8', icon: '🧭', group: 'medications' },
  { key: 'atc2',  label: 'ATC-2',         shortLabel: 'ATC-2',  color: '#2563eb', icon: '🧪', group: 'medications' },
  { key: 'atc3',  label: 'ATC-3',         shortLabel: 'ATC-3',  color: '#3b82f6', icon: '🧬', group: 'medications' },
  { key: 'atc4',  label: 'ATC-4',         shortLabel: 'ATC-4',  color: '#60a5fa', icon: '💊', group: 'medications' },
  { key: 'atc5',  label: 'ATC-5',         shortLabel: 'ATC-5',  color: '#1e40af', icon: '💉', group: 'medications' },
  { key: 'cvx',   label: 'CVX (Vaccines)',shortLabel: 'CVX',    color: '#7e22ce', icon: '💉', group: 'medications' },
  { key: 'loinc', label: 'LOINC (Labs)',  shortLabel: 'LOINC',  color: '#d97706', icon: '🧪', group: 'labs' },
  { key: 'cpt',   label: 'CPT-4 (Procs)', shortLabel: 'CPT',    color: '#dc2626', icon: '⚕️', group: 'procedures' },
  { key: 'hcpcs', label: 'HCPCS Level II',shortLabel: 'HCPCS',  color: '#0f766e', icon: '🏥', group: 'procedures' },
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
                      isActive && (compact
                        ? { backgroundColor: `${scheme.color}14`, borderColor: `${scheme.color}50` }
                        : { backgroundColor: scheme.color, borderColor: scheme.color }),
                    ]}
                    onPress={() => onChange(scheme.key)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                  >
                    {!compact && <Text style={styles.icon}>{scheme.icon}</Text>}
                    <Text style={[styles.label, isActive && (compact ? { color: scheme.color } : styles.labelActive)]}>
                      {scheme.shortLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Active scheme full label */}
      {!compact && (
        <View style={styles.schemeSummary}>
          <Text style={[styles.schemeTitle, { color: activeScheme.color }]}>
            {activeScheme.icon} {activeScheme.label}
          </Text>
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
    gap: 8,
  },
  group: {
    gap: 5,
  },
  groupLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  groupTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  icon: {
    fontSize: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  labelActive: {
    color: '#fff',
  },
  schemeSummary: {
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    borderRadius: 18,
    backgroundColor: '#f4f9fb',
    borderWidth: 1,
    borderColor: '#dce7ee',
    gap: 4,
  },
  schemeTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  searchHint: {
    fontWeight: '500',
    color: '#708495',
    fontSize: 12,
  },
});
