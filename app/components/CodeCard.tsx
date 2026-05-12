import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import type { CodeEntry } from '../../db/queries';
import type { MetadataRow } from '../services/useSelectedCodeResult';

type Props = {
  entry: CodeEntry;
  lang: string;
  schemeColor: string;
  isSelected?: boolean;
  onPress?: (entry: CodeEntry) => void;
  metadataRows?: MetadataRow[];
};

export default function CodeCard({
  entry,
  lang,
  schemeColor,
  isSelected = false,
  onPress,
  metadataRows = [],
}: Props) {
  const primaryName = lang === 'he' && entry.name_he ? entry.name_he : entry.name_en;
  const secondaryName = lang === 'he' && entry.name_he ? entry.name_en : null;
  const showMetadata = isSelected && metadataRows.length > 0;
  const textAlign = lang === 'he' ? 'right' : 'left';

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: schemeColor }, isSelected && styles.cardSelected]}
      onPress={onPress ? () => onPress(entry) : undefined}
      activeOpacity={0.85}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `Select code ${entry.code}` : undefined}
      accessibilityState={onPress ? { selected: isSelected } : undefined}
    >
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
      {showMetadata && (
        <View style={styles.metadata}>
          {metadataRows.map(item => (
            <View key={item.key} style={styles.metadataRow}>
              <Text style={[styles.metadataLabel, { color: schemeColor }]}>{item.label}</Text>
              <Text style={styles.metadataValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
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
  cardSelected: {
    borderColor: '#cbd5e1',
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
  metadata: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    gap: 8,
  },
  metadataRow: {
    gap: 2,
  },
  metadataLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  metadataValue: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
});
