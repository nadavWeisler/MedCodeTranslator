import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Head from 'expo-router/head';
import { DATASET_METADATA_GENERATED_AT, DATASET_SOURCES, formatDateLabel } from './services/sourceMetadata';
import SiteChrome from './components/SiteChrome';
import { colors, radii, shadows } from './constants/theme';

const GITHUB_URL = 'https://github.com/nadavWeisler/MedCodeTranslator';

function openGithub() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(GITHUB_URL, '_blank', 'noopener,noreferrer');
  }
}

export default function AboutScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <Head>
        <title>About — MedCode Clinical</title>
      </Head>
      <SiteChrome maxWidth={900}>
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{t('about_title')}</Text>
          <Text style={styles.subtitle}>{t('about_subtitle')}</Text>

          <Text style={styles.body}>{t('about_body')}</Text>
          <Text style={styles.warning}>{t('footer_phi_warning')}</Text>

          {Platform.OS === 'web' ? (
            <TouchableOpacity style={styles.githubLink} onPress={openGithub}>
              <Text style={styles.githubLinkText}>{t('about_github_link')} →</Text>
            </TouchableOpacity>
          ) : null}

          <Text style={styles.sectionTitle}>{t('about_dataset_heading')}</Text>
          <Text style={styles.body}>{t('footer_updated', { date: formatDateLabel(DATASET_METADATA_GENERATED_AT) })}</Text>

          <Text style={styles.sectionTitle}>{t('about_sources_heading')}</Text>
          {DATASET_SOURCES.map(source => (
            <View key={source.dataset} style={styles.sourceCard}>
              <Text style={styles.sourceName}>{source.dataset.toUpperCase()} · {source.provider}</Text>
              <Text style={styles.sourceMeta}>Version: {source.dataset_version ?? 'n/a'}</Text>
              <Text style={styles.sourceMeta}>Source revision: {source.source_revision ?? 'n/a'}</Text>
              <Text style={styles.sourceMeta}>Last updated: {formatDateLabel(source.last_updated_utc ?? source.retrieved_at_utc)}</Text>
              <Text style={styles.sourceMeta}>Records: {source.record_count ?? 0}</Text>
              {source.coverage ? (
                <Text style={styles.sourceMeta}>Coverage: {source.coverage}</Text>
              ) : null}
              <Text style={styles.sourceMeta}>Attribution: {source.attribution_text ?? 'See source terms'}</Text>
              <Text style={styles.sourceMeta}>License: {source.license_text ?? 'See source terms'}</Text>
              <Text style={styles.sourceUrl}>{source.url}</Text>
            </View>
          ))}
        </ScrollView>
      </SiteChrome>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.pageBg },
  page: { padding: 20, gap: 12, paddingBottom: 32 },
  title: { fontSize: 26, fontWeight: '700', color: colors.navy },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.navy, marginTop: 8 },
  body: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  warning: { fontSize: 13, color: colors.danger, fontWeight: '600' },
  githubLink: {
    alignSelf: 'flex-start',
    backgroundColor: colors.tealLight,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
  },
  githubLinkText: { fontSize: 13, fontWeight: '700', color: colors.tealDark },
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
