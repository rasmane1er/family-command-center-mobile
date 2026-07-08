import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { shadows } from '../../theme/spacing';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const sizeStyles = {
  sm: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  md: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
  lg: { paddingVertical: 18, paddingHorizontal: 32, borderRadius: 14 },
};

const textSizes = {
  sm: { fontSize: 13, fontWeight: '600' as const },
  md: { fontSize: 15, fontWeight: '600' as const },
  lg: { fontSize: 17, fontWeight: '700' as const },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
}: Props) {
  const sizeStyle = sizeStyles[size];
  const textSize = textSizes[size];

  if (variant === 'primary') {
    // Disabled (not loading) swaps to a flat muted color instead of dimming
    // the gradient with opacity — opacity over a LinearGradient composites
    // inconsistently on Android (renders duller/greyer than the same
    // opacity does on iOS), so this keeps the look identical cross-platform.
    // Loading keeps the normal gradient + spinner, same as before.
    const showDisabledBg = disabled && !loading;
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.pressable,
          fullWidth && styles.fullWidth,
          pressed && !(disabled || loading) && styles.pressed,
          style,
        ]}
      >
        {showDisabledBg ? (
          <View style={[styles.gradient, styles.disabledBg, sizeStyle]}>
            <View style={styles.content}>
              {leftIcon}
              <Text style={[styles.textDisabled, textSize, textStyle, leftIcon ? { marginLeft: 8 } : null, rightIcon ? { marginRight: 8 } : null]}>
                {title}
              </Text>
              {rightIcon}
            </View>
          </View>
        ) : (
          <LinearGradient
            colors={[colors.primaryLight, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradient, sizeStyle]}
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} size="small" />
            ) : (
              <View style={styles.content}>
                {leftIcon}
                <Text style={[styles.textPrimary, textSize, textStyle, leftIcon ? { marginLeft: 8 } : null, rightIcon ? { marginRight: 8 } : null]}>
                  {title}
                </Text>
                {rightIcon}
              </View>
            )}
          </LinearGradient>
        )}
      </Pressable>
    );
  }

  if (variant === 'secondary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.pressable,
          styles.secondaryBg,
          sizeStyle,
          fullWidth && styles.fullWidth,
          (disabled || loading) && styles.disabled,
          pressed && styles.pressed,
          shadows.sm,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <View style={styles.content}>
            {leftIcon}
            <Text style={[styles.textSecondary, textSize, textStyle]}>{title}</Text>
            {rightIcon}
          </View>
        )}
      </Pressable>
    );
  }

  const variantStyles = {
    outline: { borderWidth: 2, borderColor: colors.primary, backgroundColor: 'transparent' },
    ghost: { backgroundColor: 'transparent' },
    danger: { backgroundColor: colors.danger },
    success: { backgroundColor: colors.success },
  };

  const variantTextColors = {
    outline: colors.primary,
    ghost: colors.primary,
    danger: colors.textInverse,
    success: colors.textInverse,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.pressable,
        sizeStyle,
        variantStyles[variant as keyof typeof variantStyles],
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        variant === 'danger' || variant === 'success' ? shadows.sm : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantTextColors[variant as keyof typeof variantTextColors]} size="small" />
      ) : (
        <View style={styles.content}>
          {leftIcon}
          <Text style={[textSize, { color: variantTextColors[variant as keyof typeof variantTextColors] }, textStyle]}>
            {title}
          </Text>
          {rightIcon}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: 'flex-start',
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  secondaryBg: {
    backgroundColor: colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBg: {
    backgroundColor: colors.border,
  },
  textDisabled: {
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textPrimary: {
    color: colors.textInverse,
    letterSpacing: 0.3,
  },
  textSecondary: {
    color: colors.primary,
    letterSpacing: 0.3,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
});
