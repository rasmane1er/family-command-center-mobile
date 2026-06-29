import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'outlined' | 'elevated' | 'ghost';
  radius?: number;
  padding?: number;
  accentColor?: string;
}

export function Card({
  children, style, onPress,
  variant = 'default', radius = 16, padding = 16, accentColor,
}: Props) {
  const { colors } = useTheme();

  const cardStyle: ViewStyle[] = [
    { backgroundColor: colors.card, borderRadius: radius, padding },
    variant === 'elevated' ? styles.elevated
      : variant === 'outlined' ? { ...styles.outlined, borderColor: colors.border }
      : variant === 'ghost' ? styles.ghost
      : styles.shadow,
    accentColor ? { borderLeftWidth: 4, borderLeftColor: accentColor } : {},
    style ?? {},
  ];

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [...cardStyle, pressed ? styles.pressed : {}]}>
        {children}
      </Pressable>
    );
  }
  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  shadow: { shadowColor: '#0F2952', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
  elevated: { shadowColor: '#0F2952', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 18, elevation: 6 },
  outlined: { borderWidth: 1.5, shadowColor: '#0F2952', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  ghost: { backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0 },
  pressed: { opacity: 0.93, transform: [{ scale: 0.985 }] },
});
