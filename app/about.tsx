import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { DATASET_METADATA_GENERATED_AT, DATASET_SOURCES, formatDateLabel } from './services/sourceMetadata';

export default function AboutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/')}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>About, Safety, and Data Sources</Text>
        <Text style={styles.body}>
          MedCodeTranslator is an informational reference tool only. It is not medical advice, prescribing guidance,
          diagnostic support, or clinical decision support.
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
  safeArea: { flex: 1, backgroundColor: '#f6f7f9' },
  page: { padding: 16, gap: 10 },
  backBtn: { alignSelf: 'flex-start', backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  backBtnText: { color: '#0f172a', fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginTop: 8 },
  body: { fontSize: 13, color: '#334155', lineHeight: 19 },
  warning: { fontSize: 13, color: '#b91c1c', fontWeight: '700' },
  sourceCard: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, gap: 4 },
  sourceName: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  sourceMeta: { fontSize: 12, color: '#475569' },
  sourceUrl: { fontSize: 11, color: '#1d4ed8' },
});
