import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme/colors';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { useAutomationStore } from '../../store/useAutomationStore';
import * as hueService from '../../services/hueService';
import { useTranslation } from 'react-i18next';

const PAIR_WINDOW_SECONDS = 30;
const POLL_INTERVAL_MS = 1500;

type Step = 'searching' | 'found' | 'manual' | 'pairing' | 'success' | 'error';

export function ConnectHueBridgeScreen({ navigation }: any) {
  const { t } = useTranslation('ops');
  const insets = useSafeAreaInsets();
  const connectHueBridge = useAutomationStore((s) => s.connectHueBridge);

  const [step, setStep] = useState<Step>('searching');
  const [bridgeIp, setBridgeIp] = useState<string | null>(null);
  const [manualIp, setManualIp] = useState('');
  const [countdown, setCountdown] = useState(PAIR_WINDOW_SECONDS);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const runDiscovery = async () => {
    setStep('searching');
    try {
      const bridges = await hueService.discoverBridges();
      if (bridges.length > 0) {
        setBridgeIp(bridges[0].internalipaddress);
        setStep('found');
      } else {
        setStep('manual');
      }
    } catch {
      setStep('manual');
    }
  };

  useEffect(() => {
    runDiscovery();
  }, []);

  const startPairing = (ip: string) => {
    setBridgeIp(ip);
    setErrorMsg(null);
    setCountdown(PAIR_WINDOW_SECONDS);
    setStep('pairing');
  };

  const cancelledRef = useRef(false);

  useEffect(() => {
    if (step !== 'pairing' || !bridgeIp) return;
    cancelledRef.current = false;

    const tickInterval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(tickInterval);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    const pollInterval = setInterval(async () => {
      try {
        const key = await hueService.tryRegisterApplicationKey(bridgeIp);
        if (cancelledRef.current) return;
        if (key) {
          clearInterval(tickInterval);
          clearInterval(pollInterval);
          setIsFinalizing(true);
          try {
            await connectHueBridge(bridgeIp, key);
          } catch {
            setErrorMsg('Paired, but could not load your lights yet. Pull to refresh on the Smart Home screen.');
          } finally {
            setIsFinalizing(false);
            setStep('success');
          }
        }
      } catch (err) {
        if (cancelledRef.current) return;
        clearInterval(tickInterval);
        clearInterval(pollInterval);
        setErrorMsg(err instanceof Error ? err.message : 'Could not reach the bridge.');
        setStep('error');
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelledRef.current = true;
      clearInterval(tickInterval);
      clearInterval(pollInterval);
    };
  }, [step, bridgeIp, connectHueBridge]);

  useEffect(() => {
    if (step === 'pairing' && countdown === 0) {
      setErrorMsg("Time's up — the bridge button wasn't pressed in time.");
      setStep('error');
    }
  }, [step, countdown]);

  const header = (
    <LinearGradient colors={['#1A1A2E', '#0F3460']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </Pressable>
      <Text style={styles.headerTitle}>Connect Hue Bridge</Text>
      <View style={{ width: 38 }} />
    </LinearGradient>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {header}

      <View style={styles.body}>
        {step === 'searching' && (
          <Card variant="elevated" style={styles.card}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.title}>Looking for your Hue Bridge…</Text>
            <Text style={styles.subtitle}>Make sure this device is on the same WiFi network as your bridge.</Text>
          </Card>
        )}

        {step === 'found' && bridgeIp && (
          <Card variant="elevated" style={styles.card}>
            <Ionicons name="checkmark-circle" size={40} color={colors.success} />
            <Text style={styles.title}>Bridge found</Text>
            <Text style={styles.subtitle}>{bridgeIp}</Text>
            <Button title="Continue" onPress={() => startPairing(bridgeIp)} style={{ marginTop: 16 }} />
            <Button
              title="Not your bridge? Enter IP manually"
              variant="ghost"
              onPress={() => setStep('manual')}
              style={{ marginTop: 8 }}
            />
          </Card>
        )}

        {step === 'manual' && (
          <Card variant="elevated" style={styles.card}>
            <Ionicons name="wifi-outline" size={36} color={colors.textMuted} />
            <Text style={styles.title}>Enter your bridge's IP address</Text>
            <Text style={styles.subtitle}>
              Find it in your router's device list, or the official Hue app under Settings → My Bridge.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="192.168.1.50"
              placeholderTextColor={colors.textMuted}
              value={manualIp}
              onChangeText={setManualIp}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
            />
            <Button
              title="Continue"
              onPress={() => startPairing(manualIp.trim())}
              disabled={manualIp.trim().length < 7}
              style={{ marginTop: 12 }}
            />
            <Button title="Search Again" variant="ghost" onPress={runDiscovery} style={{ marginTop: 8 }} />
          </Card>
        )}

        {step === 'pairing' && (
          <Card variant="elevated" style={styles.card}>
            <View style={styles.pulseIcon}>
              <Ionicons name="radio-button-on" size={40} color={colors.primary} />
            </View>
            <Text style={styles.title}>Press the button on your Hue Bridge</Text>
            <Text style={styles.subtitle}>It's the large round button on top of the bridge.</Text>
            <Text style={styles.countdown}>{countdown}s</Text>
            {isFinalizing && <ActivityIndicator style={{ marginTop: 8 }} color={colors.primary} />}
          </Card>
        )}

        {step === 'success' && (
          <Card variant="elevated" style={styles.card}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            <Text style={styles.title}>Bridge connected</Text>
            {errorMsg ? (
              <Text style={[styles.subtitle, { color: colors.warning }]}>{errorMsg}</Text>
            ) : (
              <Text style={styles.subtitle}>Your Hue lights are ready to control.</Text>
            )}
            <Button title="Done" onPress={() => navigation.goBack()} style={{ marginTop: 16 }} />
          </Card>
        )}

        {step === 'error' && (
          <Card variant="elevated" style={styles.card}>
            <Ionicons name="alert-circle" size={40} color={colors.danger} />
            <Text style={styles.title}>Couldn't pair</Text>
            <Text style={styles.subtitle}>{errorMsg ?? 'Something went wrong.'}</Text>
            <Button title="Try Again" onPress={() => (bridgeIp ? startPairing(bridgeIp) : setStep('manual'))} style={{ marginTop: 16 }} />
            <Button title="Search Again" variant="ghost" onPress={runDiscovery} style={{ marginTop: 8 }} />
          </Card>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  body: { flex: 1, padding: 20, justifyContent: 'center' },
  card: { borderRadius: 20, padding: 28, alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 14, textAlign: 'center' },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 6, textAlign: 'center', lineHeight: 19 },
  countdown: { fontSize: 32, fontWeight: '900', color: colors.primary, marginTop: 16 },
  pulseIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginTop: 16,
    textAlign: 'center',
  },
});
