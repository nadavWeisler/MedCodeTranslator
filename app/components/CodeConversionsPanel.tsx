import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import type { SchemeKey } from '@medcode/core';
import { SCHEMES } from './SchemeTabs';
import type { ConversionGroup } from '../services/conversionConfig';
import { spacing } from '../constants/spacing';

const MONOSPACE_FONT = Platform.OS === 'web' ? 'monospace' : undefined;

type Props = {
  groups: ConversionGroup[];
  loading?: boolean;
  schemeColor: string;
  sourceCode: string;
  t: (key: string, options?: Record<string, unknown>) => string;
  onOpenConversion: (targetScheme: SchemeKey, targetCode: string) => void;
};

function ConversionRow({
  targetCode,
  targetName,
  cardinality,
  targetColor,
  mappingSource,
  onPress,
  t,
}: {
  targetCode: string;
  targetName: string | null;
  cardinality?: string;
  targetColor: string;
  mappingSource: string;
  onPress: () => void;
  t: Props['t'];
}) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('conversion_open_a11y', { code: targetCode })}
    >
      <View style={styles.rowCodes}>
        <Text style={[styles.rowCode, { color: targetColor, fontFamily: MONOSPACE_FONT }]}>
          {targetCode}
        </Text>
        {cardinality && cardinality !== '1:1' ? (
          <Text style={[styles.cardinality, { borderColor: `${targetColor}40`, color: targetColor }]}>
            {cardinality}
          </Text>
        ) : null}
      </View>
      {targetName ? (
        <Text style={styles.rowName} numberOfLines={2}>{targetName}</Text>
      ) : null}
      <Text style={styles.rowSource}>{mappingSource}</Text>
    </TouchableOpacity>
  );
}

export default function CodeConversionsPanel({
  groups,
  loading = false,
  schemeColor,
  sourceCode,
  t,
  onOpenConversion,
}: Props) {
  const [expandedGroups, setExpandedGroups] = useState<Set<SchemeKey>>(new Set());

  if (loading) {
    return (
      <View style={[styles.panel, { borderColor: `${schemeColor}30` }]}>
        <ActivityIndicator size="small" color={schemeColor} />
        <Text style={styles.loadingText}>{t('conversions_loading')}</Text>
      </View>
    );
  }

  if (groups.length === 0) return null;

  const toggleGroup = (scheme: SchemeKey) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(scheme)) next.delete(scheme);
      else next.add(scheme);
      return next;
    });
  };

  return (
    <View style={[styles.panel, { borderColor: `${schemeColor}30` }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: schemeColor }]}>{t('conversions_title')}</Text>
        <Text style={styles.subtitle}>
          {t('conversions_subtitle', { code: sourceCode })}
        </Text>
      </View>

      {groups.map(group => {
        const targetScheme = SCHEMES.find(s => s.key === group.targetScheme);
        const targetColor = targetScheme?.color ?? schemeColor;
        const isExpanded = expandedGroups.has(group.targetScheme);
        const visibleRows = isExpanded ? group.conversions : group.commonConversions;

        return (
          <View key={group.targetScheme} style={styles.group}>
            <View style={styles.groupHeader}>
              <Text style={[styles.groupLabel, { color: targetColor }]}>
                {group.targetLabel}
              </Text>
              <Text style={styles.groupCount}>
                {t('conversions_count', { count: group.conversions.length })}
              </Text>
            </View>

            {visibleRows.map(row => (
              <ConversionRow
                key={`${row.targetScheme}:${row.targetCode}`}
                targetCode={row.targetCode}
                targetName={row.targetName}
                cardinality={row.cardinality}
                targetColor={targetColor}
                mappingSource={row.mappingSource}
                onPress={() => onOpenConversion(row.targetScheme, row.targetCode)}
                t={t}
              />
            ))}

            {group.hiddenCount > 0 ? (
              <TouchableOpacity
                style={styles.moreButton}
                onPress={() => toggleGroup(group.targetScheme)}
                accessibilityRole="button"
                accessibilityLabel={
                  isExpanded
                    ? t('conversions_show_less')
                    : t('conversions_show_more', { count: group.hiddenCount })
                }
              >
                <Text style={[styles.moreButtonText, { color: targetColor }]}>
                  {isExpanded
                    ? t('conversions_show_less')
                    : t('conversions_show_more', { count: group.hiddenCount })}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: '#f8fafc',
    padding: spacing.md,
    gap: 12,
  },
  header: {
    gap: 2,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  group: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  groupCount: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
  },
  row: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  rowCodes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowCode: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  cardinality: {
    fontSize: 10,
    fontWeight: '600',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  rowName: {
    fontSize: 12,
    lineHeight: 17,
    color: '#475569',
  },
  rowSource: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  moreButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  moreButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
