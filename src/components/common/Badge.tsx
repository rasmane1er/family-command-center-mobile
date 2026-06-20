import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface Props {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  style?: ViewStyle;
  dot?: boolean;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  primary: { bg: '#E8EEF9', text: colors.primary },
  secondary: { bg: '#FEF3E2', text: '#B85C00' },
  success: { bg: colors.successLight, text: colors.success },
  warning: { bg: colors.warningLight, text: colors.warning },
  danger: { bg: colors.dangerLight, text: colors.danger },
  info: { bg: colors.infoLight, text: colors.info },
  neutral: { bg: colors.border, text: colors.textSecondary },
};

export function Badge({ label, variant = 'primary', size = 'sm', style, dot = false }: Props) {
  const vc = variantColors[variant];
  const textSize = size === 'sm' ? 11 : 13;
  const padding = size === 'sm' ? { paddingVertical: 3, paddingHorizontal: 8 } : { paddingVertical: 5, paddingHorizontal: 12 };

  return (
    <View style={[styles.base, padding, { backgroundColor: vc.bg }, style]}>
      {dot && <View style={[styles.dot, { backgroundColor: vc.text }]} />}
      <Text style={[styles.text, { color: vc.text, fontSize: textSize }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
