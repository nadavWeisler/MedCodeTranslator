import React, { useRef, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import { isRTL } from '../services/rtl';
import { spacing, radius } from '../constants/spacing';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  ghostText?: string;            // inline completion hint
  schemeColor: string;
  lang: string;
};

export default function SearchBar({
  value,
  onChangeText,
  placeholder,
  ghostText,
  schemeColor,
  lang,
}: Props) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const rtl = isRTL(lang);

  const showGhost = focused && !!ghostText && value.length >= 2;

  const handleBlur = () => {
    setFocused(false);
  };

  return (
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 2,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? 14 : spacing.md,
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
  textLeft: {
    textAlign: 'left',
  },
  textRight: {
    textAlign: 'right',
  },
});
