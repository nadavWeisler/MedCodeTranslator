import React from 'react';
import { Text, StyleSheet, type TextStyle, type StyleProp } from 'react-native';

type Props = {
  text: string;
  highlights?: [number, number][];
  style?: StyleProp<TextStyle>;
  highlightStyle?: StyleProp<TextStyle>;
  textAlign?: 'left' | 'right' | 'center';
  numberOfLines?: number;
};

/** Merge overlapping or adjacent highlight ranges (inclusive indices). */
export function mergeHighlightRanges(ranges: [number, number][]): [number, number][] {
  if (!ranges.length) return [];
  const sorted = [...ranges]
    .filter(([start, end]) => start >= 0 && end >= start)
    .sort((a, b) => a[0] - b[0]);

  const merged: [number, number][] = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (!last || start > last[1] + 1) {
      merged.push([start, end]);
    } else {
      last[1] = Math.max(last[1], end);
    }
  }
  return merged;
}

export default function HighlightedText({
  text,
  highlights,
  style,
  highlightStyle,
  textAlign,
  numberOfLines,
}: Props) {
  const merged = mergeHighlightRanges(highlights ?? []);
  const hasHighlights = merged.length > 0 && text.length > 0;

  if (!hasHighlights) {
    return (
      <Text style={[style, textAlign ? { textAlign } : null]} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  const segments: { value: string; highlighted: boolean }[] = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    const safeStart = Math.max(0, Math.min(start, text.length));
    const safeEnd = Math.max(safeStart, Math.min(end, text.length - 1));
    if (safeStart > cursor) {
      segments.push({ value: text.slice(cursor, safeStart), highlighted: false });
    }
    segments.push({ value: text.slice(safeStart, safeEnd + 1), highlighted: true });
    cursor = safeEnd + 1;
  }
  if (cursor < text.length) {
    segments.push({ value: text.slice(cursor), highlighted: false });
  }

  return (
    <Text style={[style, textAlign ? { textAlign } : null]} numberOfLines={numberOfLines}>
      {segments.map((segment, index) =>
        segment.highlighted ? (
          <Text key={index} style={[style, styles.highlight, highlightStyle]}>
            {segment.value}
          </Text>
        ) : (
          <Text key={index}>{segment.value}</Text>
        )
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  highlight: {
    backgroundColor: '#fef08a',
    color: '#0f172a',
    fontWeight: '800',
  },
});
