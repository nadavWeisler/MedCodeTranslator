import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { spacing } from '../constants/spacing';
import { colors, radii, shadows } from '../constants/theme';

export type ComplianceFooterLink = {
  key: string;
  label: string;
  onPress: () => void;
};

type Props = {
  title: string;
  body: string;
  phiWarning: string;
  updatedLabel: string;
  links: ComplianceFooterLink[];
  isRTL?: boolean;
};

export default function ComplianceFooter({
  title,
  body,
  phiWarning,
  updatedLabel,
  links,
  isRTL = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const directionalText = isRTL ? styles.textRight : styles.textLeft;

  return (
    <View style={[styles.card, expanded ? styles.cardExpanded : styles.cardCollapsed]}>
      <TouchableOpacity
        onPress={() => setExpanded(prev => !prev)}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded }}
        style={[styles.header, isRTL && styles.headerRtl]}
      >
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text importantForAccessibility="no" style={styles.chevron}>
          {expanded ? '▴' : '▾'}
        </Text>
      </TouchableOpacity>
      {expanded ? (
        <View style={styles.body}>
          <Text style={[styles.bodyText, directionalText]}>{body}</Text>
          <Text style={[styles.phiText, directionalText]}>{phiWarning}</Text>
          <Text style={[styles.bodyText, directionalText]}>{updatedLabel}</Text>
          <View style={styles.actions}>
            {links.map(link => (
              <TouchableOpacity
                key={link.key}
                style={styles.linkBtn}
                onPress={link.onPress}
                accessibilityRole="link"
              >
                <Text style={styles.linkBtnText}>{link.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    borderWidth: 1,
    borderRadius: radii.lg,
    ...shadows.card,
  },
  cardCollapsed: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  cardExpanded: {
    padding: spacing.lg,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerRtl: {
    flexDirection: 'row-reverse',
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  chevron: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '700',
  },
  body: {
    gap: 8,
    marginTop: 4,
  },
  bodyText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  phiText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.danger,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  linkBtn: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.tealMuted,
    backgroundColor: colors.tealLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  linkBtnText: {
    fontSize: 12,
    color: colors.tealDark,
    fontWeight: '700',
  },
  textLeft: {
    textAlign: 'left',
  },
  textRight: {
    textAlign: 'right',
  },
});
