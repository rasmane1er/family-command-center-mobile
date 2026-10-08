import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuthStore } from '../../store/useAuthStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { colors } from '../../theme/colors';

const DIGITS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
const PIN_LENGTH = 6;

export function LockScreen() {
  const insets = useSafeAreaInsets();
  const { verifyPin, biometricEnabled, failedAttempts, lockedUntil, setAuthenticated } = useAuthStore();
  const familyName = useFamilyStore((s) => s.family?.name ?? 'Your Family');

  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');
  const [lockCountdown, setLockCountdown] = useState(0);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Auto-trigger biometric on mount
  useEffect(() => {
    if (biometricEnabled) {
      setTimeout(tryBiometric, 400);
    }
  }, []);

  // Countdown timer when locked out
  useEffect(() => {
    if (!lockedUntil) return;
    const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
    if (remaining <= 0) return;
    setLockCountdown(remaining);
    const interval = setInterval(() => {
      const r = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (r <= 0) {
        setLockCountdown(0);
        clearInterval(interval);
      } else {
        setLockCountdown(r);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const shake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 14, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -14, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 9, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -9, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const successPulse = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.08, duration: 120, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  const handleDigit = (digit: string) => {
    if (lockedUntil && Date.now() < lockedUntil) {
      setMessage(`Too many attempts. Try again in ${lockCountdown}s`);
      shake();
      return;
    }

    if (digit === '⌫') {
      setPin((p) => p.slice(0, -1));
      setMessage('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    if (digit === '') return;
    if (pin.length >= PIN_LENGTH) return;

    const newPin = pin + digit;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin(newPin);

    if (newPin.length === PIN_LENGTH) {
      setTimeout(() => checkPin(newPin), 150);
    }
  };

  const checkPin = (entered: string) => {
    const ok = verifyPin(entered);
    if (ok) {
      successPulse();
      setMessage('');
    } else {
      shake();
      setPin('');
      const remaining = 5 - ((failedAttempts + 1) % 5);
      if (failedAttempts + 1 >= 5) {
        setMessage('Too many attempts — locked temporarily');
      } else {
        setMessage(`Incorrect PIN. ${remaining} attempt${remaining !== 1 ? 's' : ''} left`);
      }
    }
  };

  const tryBiometric = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Unlock ${familyName}`,
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
      });
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setAuthenticated(true);
      }
    } catch {
      // Biometric not available; fall back to PIN silently
    }
  };

  const isLocked = !!lockedUntil && Date.now() < lockedUntil;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#0F2952', '#16476E']} style={[styles.gradient, { paddingTop: insets.top + 24 }]}>

        <View style={styles.top}>
          <View style={styles.iconRing}>
            <Ionicons name="lock-closed" size={36} color="#fff" />
          </View>
          <Text style={styles.familyName}>{familyName}</Text>
          <Text style={styles.subtitle}>Enter your PIN to unlock</Text>
        </View>

        {/* PIN dots */}
        <Animated.View style={[styles.dots, { transform: [{ translateX: shakeAnim }, { scale: scaleAnim }] }]}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
          ))}
        </Animated.View>

        {/* Error message */}
        {!!message && (
          <View style={styles.messageRow}>
            <Ionicons name="warning" size={14} color="#FF6B6B" />
            <Text style={styles.message}>{message}</Text>
          </View>
        )}
        {isLocked && lockCountdown > 0 && !message && (
          <Text style={styles.message}>Locked for {lockCountdown}s</Text>
        )}

        {/* Keypad */}
        <View style={styles.keypad}>
          {DIGITS.map((d, i) => (
            <Pressable
              key={i}
              onPress={() => handleDigit(d)}
              style={({ pressed }) => [
                styles.key,
                d === '' && styles.keyEmpty,
                pressed && d !== '' && styles.keyPressed,
                isLocked && d !== '' && d !== '⌫' && styles.keyDisabled,
              ]}
              disabled={isLocked && d !== '' && d !== '⌫'}
            >
              {d === '⌫' ? (
                <Ionicons name="backspace-outline" size={26} color="#fff" />
              ) : (
                <Text style={styles.keyText}>{d}</Text>
              )}
            </Pressable>
          ))}
        </View>

        {/* Biometric button */}
        {biometricEnabled && !isLocked && (
          <Pressable onPress={tryBiometric} style={styles.biometricRow}>
            <Ionicons name="finger-print" size={32} color="rgba(255,255,255,0.7)" />
            <Text style={styles.biometricText}>Use Face ID / Touch ID</Text>
          </Pressable>
        )}

        <Text style={styles.footer}>Family Command Center</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  top: { alignItems: 'center', marginBottom: 40 },
  iconRing: { width: 86, height: 86, borderRadius: 43, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  familyName: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 6 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.55)' },
  dots: { flexDirection: 'row', gap: 18, marginBottom: 16 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', backgroundColor: 'transparent' },
  dotFilled: { backgroundColor: '#fff', borderColor: '#fff' },
  messageRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  message: { fontSize: 13, color: '#FF6B6B', fontWeight: '600', marginBottom: 24, textAlign: 'center' },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 280, gap: 12, marginBottom: 32 },
  key: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  keyEmpty: { backgroundColor: 'transparent' },
  keyPressed: { backgroundColor: 'rgba(255,255,255,0.26)' },
  keyDisabled: { opacity: 0.3 },
  keyText: { fontSize: 28, fontWeight: '400', color: '#fff' },
  biometricRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 24 },
  biometricText: { fontSize: 14, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
  footer: { position: 'absolute', bottom: 32, fontSize: 12, color: 'rgba(255,255,255,0.25)', letterSpacing: 1 },
});
