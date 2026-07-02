import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { brand, colors, radii } from '../constants/theme';

type Props = {
  compact?: boolean;
  /** Hides the subtitle line — use on mobile toolbars. */
  hideSubtitle?: boolean;
  subtitle?: string;
  align?: 'left' | 'right';
};

export default function BrandMark({
  compact = false,
  hideSubtitle = false,
  subtitle,
  align = 'left',
}: Props) {
  const textAlign = align === 'right' ? 'right' : 'left';

  return (
    <View style={[styles.wrap, align === 'right' && styles.wrapRight]}>
      <View style={[styles.markRow, align === 'right' && styles.markRowRight]}>
        <View style={styles.glyph}>
          <View style={styles.glyphBarH} />
          <View style={styles.glyphBarV} />
        </View>
        <View style={styles.wordmark}>
          <Text style={[styles.name, compact && styles.nameCompact]}>
            {brand.name}
            <Text style={styles.suffix}> {brand.suffix}</Text>
          </Text>
        </View>
      </View>
      {subtitle && !hideSubtitle ? (
        <Text style={[styles.subtitle, compact && styles.subtitleCompact, { textAlign }]} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  wrapRight: {
    alignItems: 'flex-end',
  },
  markRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  markRowRight: {
    flexDirection: 'row-reverse',
  },
  glyph: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphBarH: {
    position: 'absolute',
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.textInverse,
  },
  glyphBarV: {
    position: 'absolute',
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: colors.textInverse,
  },
  wordmark: {
    gap: 0,
  },
  name: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
    color: colors.navy,
    letterSpacing: -0.4,
  },
  nameCompact: {
    fontSize: 18,
    lineHeight: 22,
  },
  suffix: {
    fontWeight: '500',
    color: colors.teal,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontWeight: '500',
    maxWidth: 420,
  },
  subtitleCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
});
