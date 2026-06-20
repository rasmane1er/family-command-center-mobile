import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle, Text } from 'react-native';
import { colors } from '../../theme/colors';

interface Props {
  progress: number;
  color?: string | string[];
  backgroundColor?: string;
  height?: number;
  style?: ViewStyle;
  showLabel?: boolean;
  animated?: boolean;
  radius?: number;
}

export function ProgressBar({
  progress,
  color = colors.primary,
  backgroundColor = colors.border,
  height = 8,
  style,
  showLabel = false,
  animated = true,
  radius,
}: Props) {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.spring(animatedWidth, {
        toValue: clampedProgress,
        useNativeDriver: false,
        tension: 60,
        friction: 8,
      }).start();
    } else {
      animatedWidth.setValue(clampedProgress);
    }
  }, [clampedProgress]);

  const barRadius = radius ?? height / 2;
  const barColor = Array.isArray(color) ? color[0] : color;

  const progressColor =
    clampedProgress < 0.5
      ? colors.success
      : clampedProgress < 0.8
      ? colors.warning
      : colors.danger;

  const fillColor = Array.isArray(color) ? color[0] : color === colors.primary ? colors.primary : barColor;

  return (
    <View style={style}>
      <View style={[styles.track, { height, borderRadius: barRadius, backgroundColor }]}>
        <Animated.View
          style={[
            styles.fill,
            {
              height,
              borderRadius: barRadius,
              backgroundColor: fillColor,
              width: animatedWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      {showLabel && (
        <Text style={styles.label}>{Math.round(clampedProgress * 100)}%</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  label: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'right',
  },
});
