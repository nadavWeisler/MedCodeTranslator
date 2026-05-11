import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { CodeEntry } from '../../db/queries';

type Props = {
  item: CodeEntry;
  lang: string;
  onPress: (item: CodeEntry) => void;
  schemeColor: string;
};

export default function SuggestionItem({ item, lang, onPress, schemeColor }: Props) {
  const name = lang === 'he' && item.name_he ? item.name_he : item.name_en;
  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(item)} activeOpacity={0.7}>
      <View style={[styles.codePill, { backgroundColor: schemeColor + '22' }]}>
        <Text style={[styles.code, { color: schemeColor }]}>{item.code}</Text>
      </View>
      <Text style={[styles.name, { textAlign: lang === 'he' ? 'right' : 'left' }]} numberOfLines={1}>
        {name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eef4f8',
  },
  codePill: {
    borderRadius: 999,
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
  name: {
    flex: 1,
    fontSize: 14,
    color: '#183247',
    fontWeight: '600',
  },
});
