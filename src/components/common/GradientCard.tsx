import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { shadows } from '../../theme/spacing';

interface Props {
  colors: readonly [string, string, ...string[]];
  style?: ViewStyle;
  children: React.ReactNode;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  radius?: number;
}

export function GradientCard({ colors: gradientColors, style, children, start, end, radius = 16 }: Props) {
  return (
    <LinearGradient
      colors={gradientColors}
      start={start ?? { x: 0, y: 0 }}
      end={end ?? { x: 1, y: 1 }}
      style={[styles.card, { borderRadius: radius }, shadows.md, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});
