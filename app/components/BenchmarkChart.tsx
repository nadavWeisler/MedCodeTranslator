import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  BENCHMARK_GENERATED_AT,
  BENCHMARK_MEAN_LAYERED_P1,
  BENCHMARK_MEAN_SQLITE_P1,
  BENCHMARK_ROWS,
  BENCHMARK_TOTAL_FIXTURES,
} from '../constants/benchmarkSummary';
import { colors, radii, shadows, typography } from '../constants/theme';

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

type Props = {
  compact?: boolean;
};

export default function BenchmarkChart({ compact = false }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('site_benchmark_title')}</Text>
        <Text style={styles.subtitle}>{t('site_benchmark_subtitle')}</Text>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: colors.teal }]} />
          <Text style={styles.legendText}>{t('site_benchmark_layered')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: colors.textMuted }]} />
          <Text style={styles.legendText}>{t('site_benchmark_sqlite')}</Text>
        </View>
      </View>

      <View style={styles.rows}>
        {BENCHMARK_ROWS.map(row => (
          <View key={row.scheme} style={styles.row}>
            <Text style={[styles.label, compact && styles.labelCompact]} numberOfLines={1}>
              {row.label}
            </Text>
            <View style={styles.bars}>
              <View style={styles.barTrack}>
                <View style={[styles.bar, styles.barLayered, { width: `${row.layeredP1 * 100}%` }]} />
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.bar, styles.barSqlite, { width: `${row.sqliteP1 * 100}%` }]} />
              </View>
            </View>
            <View style={styles.values}>
              <Text style={styles.valueLayered}>{pct(row.layeredP1)}</Text>
              <Text style={styles.valueSqlite}>{pct(row.sqliteP1)}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {t('site_benchmark_summary', {
            fixtures: BENCHMARK_TOTAL_FIXTURES,
            layered: pct(BENCHMARK_MEAN_LAYERED_P1),
            sqlite: pct(BENCHMARK_MEAN_SQLITE_P1),
            date: BENCHMARK_GENERATED_AT,
          })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 20,
    gap: 16,
    ...shadows.card,
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.navy,
    ...(typography.fontFamily ? { fontFamily: typography.fontFamily } : {}),
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  legend: {
    flexDirection: 'row',
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  rows: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    width: 88,
    fontSize: 12,
    fontWeight: '600',
    color: colors.navy,
    ...(typography.monoFamily ? { fontFamily: typography.monoFamily } : {}),
  },
  labelCompact: {
    width: 72,
    fontSize: 11,
  },
  bars: {
    flex: 1,
    gap: 4,
  },
  barTrack: {
    height: 8,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: radii.pill,
  },
  barLayered: {
    backgroundColor: colors.teal,
  },
  barSqlite: {
    backgroundColor: colors.textMuted,
  },
  values: {
    width: 72,
    alignItems: 'flex-end',
    gap: 2,
  },
  valueLayered: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.tealDark,
  },
  valueSqlite: {
    fontSize: 11,
    color: colors.textMuted,
  },
  summary: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 12,
  },
  summaryText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
