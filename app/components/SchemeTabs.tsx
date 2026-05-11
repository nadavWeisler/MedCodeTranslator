import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import type { SchemeKey } from '../../db/database';

export type SchemeConfig = {
  key: SchemeKey;
  label: string;
  shortLabel: string;
  color: string;
  icon: string;
};

export const SCHEMES: SchemeConfig[] = [
  { key: 'atc5',  label: 'Medications',  shortLabel: 'ATC5',  color: '#2563eb', icon: '💊' },
  { key: 'icd10', label: 'ICD-10',       shortLabel: 'ICD-10',color: '#059669', icon: '🩺' },
  { key: 'icd9',  label: 'ICD-9-CM',     shortLabel: 'ICD-9', color: '#7c3aed', icon: '📋' },
  { key: 'icd11', label: 'ICD-11',       shortLabel: 'ICD-11',color: '#0891b2', icon: '🔬' },
  { key: 'loinc', label: 'LOINC (Labs)', shortLabel: 'LOINC', color: '#d97706', icon: '🧪' },
  { key: 'cpt',   label: 'CPT-4 (Procs)',shortLabel: 'CPT',   color: '#dc2626', icon: '⚕️' },
];

type Props = {
  active: SchemeKey;
  onChange: (scheme: SchemeKey) => void;
  hintLabel?: string;
};

export default function SchemeTabs({ active, onChange, hintLabel }: Props) {
  const activeScheme = SCHEMES.find(s => s.key === active)!;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {SCHEMES.map(scheme => {
          const isActive = scheme.key === active;
          return (
            <TouchableOpacity
              key={scheme.key}
              style={[
                styles.pill,
                isActive && { backgroundColor: scheme.color, borderColor: scheme.color },
              ]}
              onPress={() => onChange(scheme.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={styles.icon}>{scheme.icon}</Text>
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {scheme.shortLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Active scheme full label */}
      <View style={styles.schemeSummary}>
        <Text style={[styles.schemeTitle, { color: activeScheme.color }]}>
          {activeScheme.icon} {activeScheme.label}
        </Text>
        {!!hintLabel && <Text style={styles.searchHint}>{hintLabel}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  scroll: {
    paddingBottom: 4,
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dce7ee',
    backgroundColor: '#f7fbfd',
  },
  icon: {
    fontSize: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5f7488',
  },
  labelActive: {
    color: '#fff',
  },
  schemeSummary: {
    paddingHorizontal: 14,
    paddingVertical: 12,
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
