import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../../theme/colors';
import { FamilyIllustration } from '../../assets/illustrations/FamilyIllustration';

const { width, height } = Dimensions.get('window');

export function SplashScreen({ navigation }: any) {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const illustrationY = useRef(new Animated.Value(60)).current;
  const illustrationOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8, delay: 200 }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true, delay: 200 }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(illustrationY, { toValue: 0, useNativeDriver: true, tension: 50, friction: 9 }),
        Animated.timing(illustrationOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    ]).start();

    const timer = setTimeout(() => {
      navigation.replace('Welcome');
    }, 3200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={['#0D1B2A', '#0F2952', '#1E4A8A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar style="light" />

      {/* Background decorations */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />
      <View style={styles.circle3} />

      {/* Logo area */}
      <Animated.View style={[styles.logoArea, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>⌂</Text>
        </View>
        <Animated.Text style={[styles.appName, { opacity: logoOpacity }]}>
          Family Command Center
        </Animated.Text>
        <Animated.Text style={[styles.tagline, { opacity: textOpacity }]}>
          The Operating System for Your Household
        </Animated.Text>
      </Animated.View>

      {/* Illustration */}
      <Animated.View
        style={[styles.illustration, { opacity: illustrationOpacity, transform: [{ translateY: illustrationY }] }]}
      >
        <FamilyIllustration width={width * 0.85} height={240} />
      </Animated.View>

      {/* Version */}
      <Animated.Text style={[styles.version, { opacity: textOpacity }]}>
        Version 1.0  •  Your Family, Empowered
      </Animated.Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  circle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#F5A623',
    opacity: 0.05,
    top: -80,
    right: -80,
  },
  circle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#00D4AA',
    opacity: 0.07,
    bottom: 100,
    left: -60,
  },
  circle3: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#F5A623',
    opacity: 0.04,
    bottom: -40,
    right: 40,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: 'rgba(245, 166, 35, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(245, 166, 35, 0.4)',
  },
  logoIcon: {
    fontSize: 44,
    color: colors.secondary,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  illustration: {
    marginTop: -20,
  },
  version: {
    position: 'absolute',
    bottom: 50,
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.5,
  },
});
