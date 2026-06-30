import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { DATASET_METADATA_GENERATED_AT, DATASET_SOURCES, formatDateLabel } from './services/sourceMetadata';
import BrandMark from './components/BrandMark';
import { brand, colors, radii, shadows } from './constants/theme';

export default function AboutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/')}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        <BrandMark subtitle="About, safety, and terminology sources" />

        <Text style={styles.body}>
          {brand.fullName} is an informational reference tool for clinicians and coding professionals.
          It is not medical advice, prescribing guidance, diagnostic support, or clinical decision support.
        </Text>
        <Text style={styles.warning}>Do not enter patient-identifiable or protected health information (PHI).</Text>

        <Text style={styles.sectionTitle}>Dataset freshness</Text>
        <Text style={styles.body}>Last metadata refresh: {formatDateLabel(DATASET_METADATA_GENERATED_AT)}</Text>

        <Text style={styles.sectionTitle}>Terminology providers</Text>
        {DATASET_SOURCES.map(source => (
          <View key={source.dataset} style={styles.sourceCard}>
            <Text style={styles.sourceName}>{source.dataset.toUpperCase()} · {source.provider}</Text>
            <Text style={styles.sourceMeta}>Version: {source.dataset_version ?? 'n/a'}</Text>
            <Text style={styles.sourceMeta}>Source revision: {source.source_revision ?? 'n/a'}</Text>
            <Text style={styles.sourceMeta}>Last updated: {formatDateLabel(source.last_updated_utc ?? source.retrieved_at_utc)}</Text>
            <Text style={styles.sourceMeta}>Records: {source.record_count ?? 0}</Text>
            <Text style={styles.sourceMeta}>Attribution: {source.attribution_text ?? 'See source terms'}</Text>
            <Text style={styles.sourceMeta}>License: {source.license_text ?? 'See source terms'}</Text>
            <Text style={styles.sourceUrl}>{source.url}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.pageBg },
  page: { padding: 20, gap: 12 },
  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...shadows.card,
  },
  backBtnText: { color: colors.tealDark, fontWeight: '700', fontSize: 13 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.navy, marginTop: 8 },
  body: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  warning: { fontSize: 13, color: colors.danger, fontWeight: '600' },
  sourceCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 14,
    gap: 4,
    ...shadows.card,
  },
  sourceName: { fontSize: 13, fontWeight: '700', color: colors.navy },
  sourceMeta: { fontSize: 12, color: colors.textSecondary },
  sourceUrl: { fontSize: 11, color: colors.teal },
});