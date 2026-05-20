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
import { isRTL } from '../services/rtl';

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
  // Bug fix #2: guard against blur firing before suggestion onPress completes
  const suggestionPressedRef = useRef(false);
  const rtl = isRTL(lang);

  const showDropdown = focused && suggestions.length > 0 && value.length >= 2;
  // Only show ghost text when nothing is selected yet in dropdown
  const showGhost = focused && !!ghostText && value.length >= 2 && !showDropdown;

  const handleBlur = () => {
    // Bug fix #2: wait 250ms (Android tap takes 200-300ms); skip close if suggestion was pressed
    setTimeout(() => {
      if (!suggestionPressedRef.current) {
        setFocused(false);
      }
      suggestionPressedRef.current = false;
    }, 250);
  };

  const handleSuggestionPress = (item: CodeEntry) => {
    suggestionPressedRef.current = true;
    onSuggestionSelect(item);
    setFocused(false);
  };

  return (
    // Bug fix #3: elevate zIndex so dropdown paints above sibling Views
    <View style={styles.wrapper}>
      {/* Input row */}
      <View style={[styles.container, focused && [styles.containerFocused, { borderColor: schemeColor }]]}>
        <Text style={styles.icon}>🔍</Text>

        {/* Ghost text sits behind the real input */}
        <View style={styles.inputArea}>
          {/* Bug fix #4: pointerEvents must be a prop on View, not a style on Text */}
          {showGhost && (
            <View style={styles.ghostContainer} pointerEvents="none">
              <Text style={[styles.ghost, rtl ? styles.textRight : styles.textLeft]} numberOfLines={1}>
                <Text style={{ color: 'transparent' }}>{value}</Text>
                {ghostText.slice(value.length)}
              </Text>
            </View>
          )}
          <TextInput
            ref={inputRef}
            style={[styles.input, rtl ? styles.textRight : styles.textLeft]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="never"
            onFocus={() => setFocused(true)}
            onBlur={handleBlur}
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

      {/* Bug fix #1: use marginTop instead of top:'100%' — RN StyleSheet doesn't support string percentages for position */}
      {showDropdown && (
        <View style={styles.dropdown}>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 220 }}>
            {suggestions.map(item => (
              <SuggestionItem
                key={item.code}
                item={item}
                lang={lang}
                schemeColor={schemeColor}
                onPress={handleSuggestionPress}
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
    zIndex: 20,          // Bug fix #3: high enough to paint above sibling Views
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
  ghostContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  ghost: {
    fontSize: 16,
    lineHeight: 20,
    color: '#9aaabc',
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
  // Bug fix #1: removed top:'100%' — use marginTop to position below the input container
  dropdown: {
    position: 'absolute',
    top: 52,             // matches minHeight of the input container
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    marginTop: 4,
    // Shadow for web/iOS
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  textLeft: {
    textAlign: 'left',
  },
  textRight: {
    textAlign: 'right',
  },
});
