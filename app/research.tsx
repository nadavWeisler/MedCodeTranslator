import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Head from 'expo-router/head';
import SiteChrome from './components/SiteChrome';
import BenchmarkChart from './components/BenchmarkChart';
import { colors, radii, shadows, typography } from './constants/theme';

const GITHUB_URL = 'https://github.com/nadavWeisler/MedCodeTranslator';
const MANUSCRIPT_PATH = 'docs/papers/04-unified-manuscript.md';

const CITATION =
  '[Authors TBD]. MedCode Clinical: An Offline, Explainable Multi-Vocabulary Terminology Retrieval Platform and Benchmark Evaluation. Manuscript in preparation, 2026.';

export default function ResearchPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const copyCitation = async () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(CITATION);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Head>
        <title>Research — MedCode Clinical</title>
        <meta
          name="description"
          content="Evaluation of offline multi-vocabulary clinical terminology retrieval with reproducible benchmarks."
        />
        <meta name="citation_title" content="MedCode Clinical: An Offline, Explainable Multi-Vocabulary Terminology Retrieval Platform and Benchmark Evaluation" />
        <meta name="citation_publication_date" content="2026" />
        <meta name="citation_technical_report_institution" content="MedCodeTranslator Open Source Project" />
      </Head>
      <SiteChrome>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{t('research_status_badge')}</Text>
            </View>
            <Text style={styles.title}>{t('research_title')}</Text>
            <Text style={styles.subtitle}>{t('research_subtitle')}</Text>
            <Text style={styles.target}>{t('research_target_journal')}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('research_abstract_heading')}</Text>
            <View style={styles.card}>
              <Text style={styles.abstractLabel}>{t('research_background_label')}</Text>
              <Text style={styles.body}>{t('research_abstract_background')}</Text>
              <Text style={styles.abstractLabel}>{t('research_objective_label')}</Text>
              <Text style={styles.body}>{t('research_abstract_objective')}</Text>
              <Text style={styles.abstractLabel}>{t('research_methods_label')}</Text>
              <Text style={styles.body}>{t('research_abstract_methods')}</Text>
              <Text style={styles.abstractLabel}>{t('research_results_label')}</Text>
              <Text style={styles.body}>{t('research_abstract_results')}</Text>
              <Text style={styles.abstractLabel}>{t('research_conclusions_label')}</Text>
              <Text style={styles.body}>{t('research_abstract_conclusions')}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <BenchmarkChart />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('research_cite_heading')}</Text>
            <View style={styles.card}>
              <Text style={styles.citation}>{CITATION}</Text>
              {Platform.OS === 'web' ? (
                <TouchableOpacity style={styles.copyBtn} onPress={copyCitation}>
                  <Text style={styles.copyBtnText}>{t('research_copy_citation')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('research_resources_heading')}</Text>
            <View style={styles.links}>
              <TouchableOpacity style={styles.linkCard} onPress={() => router.push('/app')}>
                <Text style={styles.linkTitle}>{t('site_cta_launch')}</Text>
                <Text style={styles.linkBody}>{t('research_resource_app')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.linkCard}
                onPress={() => {
                  if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    window.open(`${GITHUB_URL}/blob/dev/${MANUSCRIPT_PATH}`, '_blank', 'noopener,noreferrer');
                  }
                }}
              >
                <Text style={styles.linkTitle}>{t('research_resource_manuscript')}</Text>
                <Text style={styles.linkBody}>{MANUSCRIPT_PATH}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.linkCard}
                onPress={() => {
                  if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    window.open(GITHUB_URL, '_blank', 'noopener,noreferrer');
                  }
                }}
              >
                <Text style={styles.linkTitle}>{t('research_resource_repo')}</Text>
                <Text style={styles.linkBody}>{GITHUB_URL}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SiteChrome>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.pageBg },
  scroll: {
    paddingBottom: 40,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 28,
    paddingBottom: 8,
    gap: 10,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.demoBg,
    borderColor: colors.demoBorder,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.demo,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: colors.navy,
    ...(typography.fontFamily ? { fontFamily: typography.fontFamily } : {}),
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  target: {
    fontSize: 13,
    color: colors.tealDark,
    fontWeight: '600',
  },
  section: {
    paddingVertical: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.navy,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 18,
    gap: 10,
    ...shadows.card,
  },
  abstractLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.tealDark,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 4,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  citation: {
    fontSize: 13,
    lineHeight: 21,
    color: colors.navy,
    ...(typography.monoFamily ? { fontFamily: typography.monoFamily } : {}),
  },
  copyBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: colors.tealLight,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  copyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.tealDark,
  },
  links: {
    gap: 10,
  },
  linkCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 16,
    gap: 4,
    ...shadows.card,
  },
  linkTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
  },
  linkBody: {
    fontSize: 12,
    color: colors.teal,
  },
});
