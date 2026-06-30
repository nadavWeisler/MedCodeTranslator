import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radii } from '../constants/theme';

type IconName = 'search' | 'codes' | 'empty';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
};

export default function ClinicalIcon({ name, size = 40, color = colors.teal }: Props) {
  const scale = size / 40;

  if (name === 'search') {
    return (
      <View style={[styles.searchRing, { width: size, height: size, borderColor: color, borderWidth: 2 * scale }]}>
        <View style={[styles.searchHandle, { backgroundColor: color, width: 10 * scale, height: 2 * scale, bottom: 4 * scale, right: 2 * scale }]} />
      </View>
    );
  }

  if (name === 'codes' || name === 'empty') {
    return (
      <View style={[styles.codesWrap, { width: size, height: size, borderRadius: radii.lg }]}>
        <View style={[styles.codeLine, { backgroundColor: color, width: 18 * scale }]} />
        <View style={[styles.codeLine, styles.codeLineMid, { backgroundColor: color, width: 24 * scale, opacity: 0.7 }]} />
        <View style={[styles.codeLine, { backgroundColor: color, width: 14 * scale, opacity: 0.5 }]} />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  searchRing: {
    borderRadius: 999,
    position: 'relative',
  },
  searchHandle: {
    position: 'absolute',
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
  },
  codesWrap: {
    backgroundColor: colors.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.tealMuted,
  },
  codeLine: {
    height: 3,
    borderRadius: 2,
  },
  codeLineMid: {
    marginVertical: 1,
  },
});
