import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { spacing } from '../constants/spacing';

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
              { borderColor: `${schemeColor}40`, backgroundColor: `${schemeColor}10` },
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
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.2,
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
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  textLeft: {
    textAlign: 'left',
  },
  textRight: {
    textAlign: 'right',
  },
});
