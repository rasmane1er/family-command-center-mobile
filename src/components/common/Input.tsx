import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, ViewStyle, TextInputProps, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  /** Screen-reader label for the rightIcon button — its meaning varies per
   * call site (clear, calendar picker, etc.), so there's no safe default. */
  rightIconAccessibilityLabel?: string;
  containerStyle?: ViewStyle;
  isPassword?: boolean;
}

export function Input({ label, error, hint, leftIcon, rightIcon, onRightIconPress, rightIconAccessibilityLabel, containerStyle, isPassword, style, ...props }: Props) {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[
        styles.inputWrapper,
        focused && styles.focused,
        error ? styles.errorBorder : null,
        shadows.sm,
      ]}>
        {leftIcon && (
          <Ionicons name={leftIcon} size={20} color={focused ? colors.primary : colors.textMuted} style={styles.leftIcon} />
        )}
        <TextInput
          {...props}
          secureTextEntry={isPassword && !showPassword}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          accessibilityLabel={label ?? props.placeholder}
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeft : null,
            (rightIcon || isPassword) ? styles.inputWithRight : null,
            style,
          ]}
          placeholderTextColor={colors.textMuted}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setShowPassword(!showPassword)}
            style={styles.rightIcon}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? t('screens.shared.hidePassword') : t('screens.shared.showPassword')}
          >
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
          </Pressable>
        ) : rightIcon ? (
          <Pressable
            onPress={onRightIconPress}
            style={styles.rightIcon}
            accessibilityRole="button"
            accessibilityLabel={rightIconAccessibilityLabel}
          >
            <Ionicons name={rightIcon} size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  focused: { borderColor: colors.primary, borderWidth: 2 },
  errorBorder: { borderColor: colors.danger },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.text,
  },
  inputWithLeft: { paddingLeft: 8 },
  inputWithRight: { paddingRight: 8 },
  leftIcon: { marginLeft: 14 },
  rightIcon: { padding: 12 },
  error: { fontSize: 12, color: colors.danger, marginTop: 6 },
  hint: { fontSize: 12, color: colors.textSecondary, marginTop: 6 },
});
