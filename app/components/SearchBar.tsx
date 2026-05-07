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

  const showDropdown = focused && suggestions.length > 0 && value.length >= 2;
  // Only show ghost text when nothing is selected yet in dropdown
  const showGhost = focused && !!ghostText && value.length >= 2 && !showDropdown;

  return (
    <View style={styles.wrapper}>
      {/* Input row */}
      <View style={[styles.container, focused && { borderColor: schemeColor }]}>
        <Text style={styles.icon}>🔍</Text>

        {/* Ghost text sits behind the real input */}
        <View style={styles.inputArea}>
          {showGhost && (
            <Text style={styles.ghost} numberOfLines={1}>
              {/* Show ghost as completion suffix */}
              <Text style={{ color: 'transparent' }}>{value}</Text>
              {ghostText.slice(value.length)}
            </Text>
          )}
          <TextInput
            ref={inputRef}
            style={styles.input}
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
    marginBottom: 12,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  inputArea: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  ghost: {
    position: 'absolute',
    fontSize: 15,
    color: '#94a3b8',
    top: 0,
    left: 0,
    right: 0,
    pointerEvents: 'none',
  },
  input: {
    fontSize: 15,
    color: '#1e293b',
    padding: 0,
    backgroundColor: 'transparent',
  },
  clearBtn: {
    padding: 4,
    marginLeft: 4,
  },
  clearIcon: {
    fontSize: 14,
    color: '#94a3b8',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
    marginTop: 4,
  },
});
