import React from 'react';
import { Linking, Platform, StyleSheet, Text, type TextProps } from 'react-native';
import type { ProvenanceChip } from '../../scripts/lib/provenance';
import { isRTL } from '../services/rtl';
import { colors, radii } from '../constants/theme';

type Props = {
  chip: ProvenanceChip;
  lang: string;
  t: (key: string, options?: Record<string, unknown>) => string;
};

type WebLinkProps = TextProps & {
  href?: string;
  hrefAttrs?: { target?: string; rel?: string };
};

const LinkText = Text as React.ComponentType<WebLinkProps>;

function accessibilityText(
  chip: ProvenanceChip,
  label: string,
  t: Props['t']
): string {
  if (!chip.href) return t('source_chip_a11y', { label });
  if (chip.translated) return t('source_chip_translation_link_a11y', { label });
  if (chip.authoritative) return t('source_chip_link_a11y', { label });
  return t('source_chip_browser_a11y', { label });
}

export default function SourceChip({ chip, lang, t }: Props) {
  const rtl = isRTL(lang);
  const label = t(chip.labelKey);
  const a11y = accessibilityText(chip, label, t);
  const tone = chip.translated
    ? styles.translated
    : chip.authoritative
      ? styles.authoritative
      : styles.unverified;
  const style = [styles.chip, tone, chip.href ? styles.link : null, rtl ? styles.rtl : null];

  if (chip.href && Platform.OS === 'web') {
    return (
      <LinkText
        accessibilityRole="link"
        accessibilityLabel={a11y}
        href={chip.href}
        hrefAttrs={{ target: '_blank', rel: 'noopener noreferrer' }}
        style={style}
      >
        {label}
      </LinkText>
    );
  }

  if (chip.href) {
    return (
      <Text
        accessibilityRole="link"
        accessibilityLabel={a11y}
        onPress={() => {
          void Linking.openURL(chip.href as string);
        }}
        style={style}
      >
        {label}
      </Text>
    );
  }

  return (
    <Text accessibilityLabel={a11y} style={style}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderRadius: radii.sm,
    borderWidth: 1,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 24,
  },
  authoritative: {
    backgroundColor: colors.tealLight,
    borderColor: colors.tealMuted,
    color: colors.tealDark,
  },
  unverified: {
    backgroundColor: colors.demoBg,
    borderColor: colors.demoBorder,
    color: colors.demo,
  },
  translated: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder,
    color: colors.warning,
  },
  link: {
    textDecorationLine: 'underline',
  },
  rtl: {
    alignSelf: 'flex-end',
    textAlign: 'right',
  },
});
