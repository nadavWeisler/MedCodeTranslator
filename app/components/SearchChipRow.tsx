import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { colors, radii } from '../constants/theme';

type Props = {
  title: string;
  queries: string[];
  schemeColor: string;
  isRTL: boolean;
  onSelect: (query: string) => void;
  accessibilityLabelPrefix?: string;
};

export default function SearchChipRow({
  title,
  queries,
  schemeColor,
  isRTL,
  onSelect,
  accessibilityLabelPrefix = 'Search',
}: Props) {
  if (!queries.length) return null;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, isRTL ? styles.textRight : styles.textLeft]}>
        {title}
      </Text>
      <View style={[styles.chipRow, isRTL && styles.chipRowRtl]}>
        {queries.map(query => (
          <TouchableOpacity
            key={query}
            style={[
              styles.chip,
              { borderColor: `${schemeColor}35`, backgroundColor: colors.surface },
            ]}
            onPress={() => onSelect(query)}
            accessibilityRole="button"
            accessibilityLabel={`${accessibilityLabelPrefix}: ${query}`}
          >
            <Text style={[styles.chipText, { color: schemeColor }]}>{query}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: '100%',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
  },
  chipRowRtl: {
    flexDirection: 'row-reverse',
  },
  chip: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  textLeft: {
    textAlign: 'left',
  },
  textRight: {
    textAlign: 'right',
  },
});
