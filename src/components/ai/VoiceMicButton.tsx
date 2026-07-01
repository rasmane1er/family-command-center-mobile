import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  isListening: boolean;
  onPress: () => void;
  size?: number;
  activeColor?: string;
  idleColor?: string;
}

export function VoiceMicButton({
  isListening,
  onPress,
  size = 44,
  activeColor = '#EF4444',
  idleColor = '#6366F1',
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(scale, { toValue: 1.5, duration: 700, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 700, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
          ]),
        ])
      ).start();
    } else {
      scale.setValue(1);
      opacity.setValue(0);
    }
  }, [isListening, scale, opacity]);

  const color = isListening ? activeColor : idleColor;

  return (
    <Pressable onPress={onPress} hitSlop={8} style={[styles.wrapper, { width: size, height: size }]}>
      {/* Pulse ring */}
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: activeColor,
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
      {/* Mic button */}
      <View
        style={[
          styles.btn,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: isListening ? activeColor + '33' : idleColor + '22',
            borderColor: color,
          },
        ]}
      >
        <Ionicons
          name={isListening ? 'stop-circle' : 'mic'}
          size={size * 0.45}
          color={color}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
  btn: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
});
