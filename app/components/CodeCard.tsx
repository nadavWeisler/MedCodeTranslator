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

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.codeBadge, { backgroundColor: schemeColor + '18' }]}>
          <Text style={[styles.codeText, { color: schemeColor, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }]}>
            {entry.code}
          </Text>
        </View>
        <Text style={styles.name} numberOfLines={2}>{primaryName}</Text>
      </View>
      {secondaryName && (
        <Text style={styles.altName} numberOfLines={1}>{secondaryName}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  codeBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  codeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  name: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '500',
  },
  altName: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    marginLeft: 4,
    fontStyle: 'italic',
  },
});
