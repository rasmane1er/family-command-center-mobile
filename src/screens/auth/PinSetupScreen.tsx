import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Animated, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuthStore } from '../../store/useAuthStore';
import { colors } from '../../theme/colors';

const DIGITS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
const PIN_LENGTH = 6;

type Step = 'create' | 'confirm' | 'biometric';

export function PinSetupScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { setupPin, setBiometricEnabled } = useAuthStore();
  const isChanging = route?.params?.isChanging ?? false;

  const [step, setStep] = useState<Step>('create');
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleDigit = (digit: string) => {
    if (digit === '⌫') {
      setPin((p) => p.slice(0, -1));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    if (digit === '') return;
    if (pin.length >= PIN_LENGTH) return;

    const newPin = pin + digit;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin(newPin);

    if (newPin.length === PIN_LENGTH) {
      setTimeout(() => advance(newPin), 150);
    }
  };

  const advance = async (entered: string) => {
    if (step === 'create') {
      setFirstPin(entered);
      setPin('');
      setStep('confirm');
    } else if (step === 'confirm') {
      if (entered !== firstPin) {
        shake();
        setPin('');
        return;
      }
      setupPin(entered);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Check if biometric is available
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (compatible && enrolled) {
        setPin('');
        setStep('biometric');
      } else {
        finish(false);
      }
    }
  };

  const finish = (biometric: boolean) => {
    setBiometricEnabled(biometric);
    navigation.replace('Main');
  };

  const handleSkip = () => {
    navigation.replace('Main');
  };

  const handleBiometric = () => {
    finish(true);
  };

  const stepTitle = step === 'create'
    ? 'Create your PIN'
    : step === 'confirm'
    ? 'Confirm your PIN'
    : 'Enable Face ID / Touch ID';

  const stepSub = step === 'create'
    ? 'Choose a 6-digit PIN to protect your family data'
    : step === 'confirm'
    ? 'Enter the same PIN again to confirm'
    : 'Use biometrics for faster, easier access';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#0F2952', '#16476E']} style={[styles.gradient, { paddingTop: insets.top + 20 }]}>

        {isChanging && (
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
        )}

        <View style={styles.iconWrap}>
          <Ionicons name="shield-checkmark" size={48} color="#fff" />
        </View>
        <Text style={styles.title}>{stepTitle}</Text>
        <Text style={styles.sub}>{stepSub}</Text>

        {step !== 'biometric' && (
          <>
            {/* PIN dots */}
            <Animated.View style={[styles.dots, { transform: [{ translateX: shakeAnim }] }]}>
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i < pin.length && styles.dotFilled,
                  ]}
                />
              ))}
            </Animated.View>

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
                  ]}
                >
                  {d === '⌫' ? (
                    <Ionicons name="backspace-outline" size={26} color="#fff" />
                  ) : (
                    <Text style={styles.keyText}>{d}</Text>
                  )}
                </Pressable>
              ))}
            </View>
          </>
        )}

        {step === 'biometric' && (
          <View style={styles.biometricWrap}>
            <Pressable style={styles.biometricBtn} onPress={handleBiometric}>
              <Ionicons name="finger-print" size={64} color="#fff" />
              <Text style={styles.biometricLabel}>Enable Biometrics</Text>
            </Pressable>
            <Pressable onPress={() => finish(false)} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip for now</Text>
            </Pressable>
          </View>
        )}

        {step === 'confirm' && pin.length === 0 && (
          <Pressable onPress={() => { setStep('create'); setFirstPin(''); setPin(''); }} style={styles.backLink}>
            <Text style={styles.backLinkText}>← Change PIN</Text>
          </Pressable>
        )}

        {step === 'create' && !isChanging && (
          <Pressable onPress={handleSkip} style={styles.skipSetup}>
            <Text style={styles.skipSetupText}>Skip for now</Text>
          </Pressable>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1, alignItems: 'center', paddingHorizontal: 24 },
  back: { alignSelf: 'flex-start', marginBottom: 16 },
  iconWrap: { marginTop: 20, marginBottom: 20, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 8, textAlign: 'center' },
  sub: { fontSize: 15, color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginBottom: 48, lineHeight: 22 },
  dots: { flexDirection: 'row', gap: 18, marginBottom: 48 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'transparent' },
  dotFilled: { backgroundColor: '#fff', borderColor: '#fff' },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 280, gap: 12 },
  key: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  keyEmpty: { backgroundColor: 'transparent' },
  keyPressed: { backgroundColor: 'rgba(255,255,255,0.28)' },
  keyText: { fontSize: 28, fontWeight: '500', color: '#fff' },
  biometricWrap: { alignItems: 'center', gap: 32, marginTop: 20 },
  biometricBtn: { width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', gap: 12 },
  biometricLabel: { fontSize: 14, fontWeight: '700', color: '#fff', textAlign: 'center' },
  skipBtn: { paddingVertical: 12, paddingHorizontal: 32 },
  skipText: { fontSize: 15, color: 'rgba(255,255,255,0.55)', textDecorationLine: 'underline' },
  backLink: { marginTop: 24 },
  backLinkText: { fontSize: 15, color: 'rgba(255,255,255,0.65)' },
  skipSetup: { marginTop: 32 },
  skipSetupText: { fontSize: 15, color: 'rgba(255,255,255,0.45)', textDecorationLine: 'underline' },
});
