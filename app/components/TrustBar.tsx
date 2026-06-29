import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii } from '../constants/theme';

type Props = {
  items: string[];
};

export default function TrustBar({ items }: Props) {
  return (
    <View style={styles.bar}>
      {items.map((item, index) => (
        <React.Fragment key={item}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <View style={styles.item}>
            <View style={styles.dot} />
            <Text style={styles.label}>{item}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.trustBg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.tealMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.teal,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.tealDark,
    letterSpacing: 0.15,
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: colors.tealMuted,
  },
});
