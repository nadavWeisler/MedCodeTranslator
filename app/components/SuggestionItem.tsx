import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ScoredEntry } from '@medcode/core';
import { isRTL } from '../services/rtl';
import HighlightedText from './HighlightedText';

type Props = {
  item: ScoredEntry;
  lang: string;
  onPress: (item: ScoredEntry) => void;
  schemeColor: string;
  t: (key: string, options?: Record<string, unknown>) => string;
};

export default function SuggestionItem({ item, lang, onPress, schemeColor, t }: Props) {
  const rtl = isRTL(lang);
  const showHebrewPrimary = lang === 'he' && !!item.name_he;
  const name = showHebrewPrimary ? item.name_he! : item.name_en;
  const highlights = !showHebrewPrimary ? item.highlights : undefined;

  return (
    <TouchableOpacity
      style={[styles.row, rtl && styles.rowRTL]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.codePill, { backgroundColor: schemeColor + '22' }]}>
        <Text style={[styles.code, { color: schemeColor }]}>{item.code}</Text>
      </View>
      <View style={styles.nameCol}>
        <HighlightedText
          text={name}
          highlights={highlights}
          style={styles.name}
          textAlign={rtl ? 'right' : 'left'}
          numberOfLines={1}
        />
        {lang !== 'en' && !item.name_he ? (
          <Text style={styles.englishOnlyChip}>{t('terminology_english_only')}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  codePill: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 72,
    alignItems: 'center',
  },
  code: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  nameCol: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 14,
    color: '#183247',
    fontWeight: '600',
  },
  englishOnlyChip: {
    alignSelf: 'flex-start',
    fontSize: 9,
    fontWeight: '700',
    color: '#92400e',
  },
});
