import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  colors?: readonly [string, string, ...string[]];
  children?: React.ReactNode;
  style?: ViewStyle;
  titleSize?: number;
}

export function PremiumHeader({
  title,
  subtitle,
  onBack,
  rightAction,
  colors: gradColors = ['#0F2952', '#1E4A8A'],
  children,
  style,
  titleSize = 24,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <>
      <StatusBar style="light" />
      <LinearGradient
        colors={gradColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.container, { paddingTop: insets.top + 12 }, style]}
      >
        <View style={styles.topRow}>
          {onBack ? (
            <Pressable accessibilityRole="button" onPress={onBack} style={styles.backBtn} hitSlop={8}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </Pressable>
          ) : (
            <View style={styles.backPlaceholder} />
          )}

          <View style={styles.titleBlock}>
            <Text style={[styles.title, { fontSize: titleSize }]} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
            ) : null}
          </View>

          <View style={styles.rightSlot}>
            {rightAction ?? null}
          </View>
        </View>

        {children}
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backPlaceholder: {
    width: 40,
    marginRight: 12,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
    marginTop: 2,
  },
  rightSlot: {
    marginLeft: 12,
    alignItems: 'flex-end',
  },
});
