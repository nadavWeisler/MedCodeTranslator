import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import type { CodeEntry } from '../../db/queries';

type Props = {
  entry: CodeEntry;
  lang: string;
  schemeColor: string;
};

export default function CodeCard({ entry, lang, schemeColor }: Props) {
  const primaryName = lang === 'he' && entry.name_he ? entry.name_he : entry.name_en;
  const secondaryName = lang === 'he' && entry.name_he ? entry.name_en : null;
  const textAlign = lang === 'he' ? 'right' : 'left';

  return (
    <View style={[styles.card, { borderLeftColor: schemeColor }]}>
      <View style={styles.row}>
        <View style={[styles.codeBadge, { backgroundColor: schemeColor + '18' }]}>
          <Text style={[styles.codeText, { color: schemeColor, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }]}>
            {entry.code}
          </Text>
        </View>
        <Text style={[styles.name, { textAlign }]} numberOfLines={2}>{primaryName}</Text>
      </View>
      {secondaryName && (
        <Text style={[styles.altName, { textAlign }]} numberOfLines={1}>{secondaryName}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    marginBottom: 10,
    shadowColor: '#12344d',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2ebf1',
    borderLeftWidth: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  codeBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  codeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  name: {
    flex: 1,
    fontSize: 16,
    lineHeight: 23,
    color: '#102a3f',
    fontWeight: '700',
  },
  altName: {
    fontSize: 13,
    color: '#708495',
    marginTop: 10,
    marginLeft: 4,
  },
});
