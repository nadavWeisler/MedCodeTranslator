import React, { useRef, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
  ScrollView,
} from 'react-native';
import type { CodeEntry } from '../../db/queries';
import SuggestionItem from './SuggestionItem';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  suggestions: CodeEntry[];
  ghostText?: string;            // inline completion hint
  onSuggestionSelect: (item: CodeEntry) => void;
  schemeColor: string;
  lang: string;
};

export default function SearchBar({
  value,
  onChangeText,
  placeholder,
  suggestions,
  ghostText,
  onSuggestionSelect,
  schemeColor,
  lang,
}: Props) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const isRTL = lang === 'he' || lang === 'ar';

  const showDropdown = focused && suggestions.length > 0 && value.length >= 2;
  // Only show ghost text when nothing is selected yet in dropdown
  const showGhost = focused && !!ghostText && value.length >= 2 && !showDropdown;

  return (
    <View style={styles.wrapper}>
      {/* Input row */}
      <View style={[styles.container, focused && [styles.containerFocused, { borderColor: schemeColor }]]}>
        <Text style={styles.icon}>🔍</Text>

        {/* Ghost text sits behind the real input */}
        <View style={styles.inputArea}>
          {showGhost && (
            <Text style={[styles.ghost, isRTL ? styles.textRight : styles.textLeft]} numberOfLines={1}>
              {/* Show ghost as completion suffix */}
              <Text style={{ color: 'transparent' }}>{value}</Text>
              {ghostText.slice(value.length)}
            </Text>
          )}
          <TextInput
            ref={inputRef}
            style={[styles.input, isRTL ? styles.textRight : styles.textLeft]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="never"
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            accessibilityLabel="Search input"
          />
        </View>

        {value.length > 0 && (
          <TouchableOpacity
            onPress={() => { onChangeText(''); inputRef.current?.focus(); }}
            style={styles.clearBtn}
            accessibilityLabel="Clear search"
          >
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Autocomplete dropdown */}
      {showDropdown && (
        <View style={styles.dropdown}>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 220 }}>
            {suggestions.map(item => (
              <SuggestionItem
                key={item.code}
                item={item}
                lang={lang}
                schemeColor={schemeColor}
                onPress={s => {
                  onSuggestionSelect(s);
                  setFocused(false);
                }}
              />
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 10,
    marginBottom: 2,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  containerFocused: {
    borderWidth: 1.5,
  },
  icon: {
    fontSize: 17,
    marginRight: 10,
  },
  inputArea: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  ghost: {
    position: 'absolute',
    fontSize: 16,
    lineHeight: 20,
    color: '#9aaabc',
    top: 0,
    left: 0,
    right: 0,
    pointerEvents: 'none',
  },
  input: {
    fontSize: 16,
    lineHeight: 20,
    color: '#102a3f',
    padding: 0,
    backgroundColor: 'transparent',
  },
  clearBtn: {
    padding: 6,
    marginLeft: 6,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
  },
  clearIcon: {
    fontSize: 13,
    color: '#6f8395',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    marginTop: 10,
  },
  textLeft: {
    textAlign: 'left',
  },
  textRight: {
    textAlign: 'right',
  },
});
