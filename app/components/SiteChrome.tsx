import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import BrandMark from './BrandMark';
import { brand, colors, radii, shadows, typography } from '../constants/theme';
import { DATASET_METADATA_GENERATED_AT, formatDateLabel } from '../services/sourceMetadata';

const GITHUB_URL = 'https://github.com/nadavWeisler/MedCodeTranslator';

type Props = {
  children: React.ReactNode;
  maxWidth?: number;
};

type NavKey = 'home' | 'app' | 'about';

const NAV: { key: NavKey; href: string; labelKey: string }[] = [
  { key: 'home', href: '/', labelKey: 'site_nav_home' },
  { key: 'app', href: '/app', labelKey: 'site_nav_app' },
  { key: 'about', href: '/about', labelKey: 'site_nav_about' },
];

function activeNav(pathname: string): NavKey {
  if (pathname.startsWith('/app')) return 'app';
  if (pathname.startsWith('/about')) return 'about';
  return 'home';
}

function openGithub() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(GITHUB_URL, '_blank', 'noopener,noreferrer');
  }
}

export default function SiteChrome({ children, maxWidth = 1080 }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const current = activeNav(pathname);
  const isWide = width >= 768;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={[styles.headerInner, { maxWidth }]}>
          <TouchableOpacity onPress={() => router.push('/')} accessibilityRole="link">
            <BrandMark compact hideSubtitle />
          </TouchableOpacity>
          <View style={[styles.nav, !isWide && styles.navCompact]}>
            {NAV.map(item => {
              const active = current === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.navItem, active && styles.navItemActive]}
                  onPress={() => router.push(item.href as '/')}
                  accessibilityRole="link"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.navText, active && styles.navTextActive]}>{t(item.labelKey)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.main}>{children}</View>

      <View style={styles.footer}>
        <View style={[styles.footerInner, { maxWidth }]}>
          <Text style={styles.footerBrand}>{brand.fullName}</Text>
          <Text style={styles.footerTagline}>{t('site_footer_tagline')}</Text>
          <Text style={styles.footerMeta}>
            {t('footer_updated', { date: formatDateLabel(DATASET_METADATA_GENERATED_AT) })}
          </Text>
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => router.push('/app')}>
              <Text style={styles.footerLink}>{t('site_cta_launch')}</Text>
            </TouchableOpacity>
            {Platform.OS === 'web' ? (
              <TouchableOpacity onPress={openGithub}>
                <Text style={styles.footerLink}>{t('site_cta_github')}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={() => router.push('/about')}>
              <Text style={styles.footerLink}>{t('site_nav_about')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/legal/terms')}>
              <Text style={styles.footerLink}>{t('footer_terms')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/legal/privacy')}>
              <Text style={styles.footerLink}>{t('footer_privacy')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.footerDisclaimer}>{t('footer_phi_warning')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.pageBg,
    ...(Platform.OS === 'web' ? ({ minHeight: '100vh' } as object) : {}),
  },
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    ...shadows.card,
    zIndex: 10,
  },
  headerInner: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  nav: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
  },
  navCompact: {
    gap: 4,
  },
  navItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  navItemActive: {
    backgroundColor: colors.tealLight,
  },
  navText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    ...(typography.fontFamily ? { fontFamily: typography.fontFamily } : {}),
  },
  navTextActive: {
    color: colors.tealDark,
  },
  main: {
    flex: 1,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.navy,
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  footerInner: {
    width: '100%',
    alignSelf: 'center',
    gap: 8,
  },
  footerBrand: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
    ...(typography.fontFamily ? { fontFamily: typography.fontFamily } : {}),
  },
  footerTagline: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    lineHeight: 20,
  },
  footerMeta: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
  },
  footerLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 8,
  },
  footerLink: {
    color: colors.tealMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  footerDisclaimer: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    marginTop: 8,
  },
});
