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
import { spacing } from '../constants/spacing';
import { colors, radii, shadows } from '../constants/theme';
import ClinicalIcon from './ClinicalIcon';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  ghostText?: string;
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
  const accent = focused ? schemeColor : colors.border;

  const handleBlur = () => {
    setFocused(false);
  };

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.container,
          focused && styles.containerFocused,
          { borderColor: accent },
          focused && shadows.card,
        ]}
      >
        <View style={styles.iconWrap}>
          <ClinicalIcon name="search" size={18} color={focused ? schemeColor : colors.textMuted} />
        </View>

        <View style={styles.inputArea}>
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
            placeholderTextColor={colors.textMuted}
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
            <Text style={styles.clearIcon}>×</Text>
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
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 13 : 11,
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
  },
  containerFocused: {
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  iconWrap: {
    marginRight: 10,
    width: 22,
    alignItems: 'center',
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
    lineHeight: 22,
    color: colors.textMuted,
  },
  input: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
    padding: 0,
    backgroundColor: 'transparent',
  },
  clearBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
  },
  clearIcon: {
    fontSize: 18,
    lineHeight: 20,
    color: colors.textMuted,
    fontWeight: '500',
  },
  textLeft: {
    textAlign: 'left',
  },
  textRight: {
    textAlign: 'right',
  },
});
