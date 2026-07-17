import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

interface SOSAlarmOverlayProps {
  visible: boolean;
  childName: string;
  message?: string;
  onDismiss: () => void;
}

export function SOSAlarmOverlay({ visible, childName, message, onDismiss }: SOSAlarmOverlayProps) {
  const pulse = useRef(new Animated.Value(1)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    if (!visible) {
      animRef.current?.stop();
      Vibration.cancel();
      soundRef.current?.stopAsync().catch(() => {});
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
      return;
    }

    // Vibrate in SOS morse code pattern: ... --- ...
    Vibration.vibrate(
      [0, 200, 100, 200, 100, 200, 300, 600, 100, 600, 100, 600, 300, 200, 100, 200, 100, 200, 1000],
      true,
    );

    // Play alarm sound — works on real devices AND simulators, bypasses silent mode
    // via Audio.setAudioModeAsync with staysActiveInBackground + playsInSilentMode.
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,   // override iOS silent switch
          staysActiveInBackground: true,
          shouldDuckAndroid: false,
        });
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/sos_alarm.wav'),
          { shouldPlay: true, isLooping: true, volume: 1.0 },
        );
        soundRef.current = sound;
      } catch { /* non-fatal — vibration is the fallback */ }
    })();

    animRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 350, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
    );
    animRef.current.start();

    return () => {
      animRef.current?.stop();
      Vibration.cancel();
      soundRef.current?.stopAsync().catch(() => {});
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.container}>
        {/* Pulsing icon */}
        <Animated.View style={[styles.iconWrap, { transform: [{ scale: pulse }] }]}>
          <Ionicons name="warning" size={90} color="#fff" />
        </Animated.View>

        <Text style={styles.sosLabel}>🚨 SOS EMERGENCY 🚨</Text>
        <Text style={styles.childName}>{childName}</Text>
        <Text style={styles.message}>
          {message?.trim() || `${childName} needs help immediately!`}
        </Text>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.acknowledgeBtn} onPress={onDismiss} activeOpacity={0.8}>
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
          <Text style={styles.acknowledgeBtnText}>I'm Responding</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>Tap to acknowledge — check on {childName} immediately</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#8b0000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  sosLabel: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 16,
  },
  childName: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 36,
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
    marginBottom: 36,
  },
  acknowledgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 32,
    paddingHorizontal: 36,
    paddingVertical: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    marginBottom: 20,
  },
  acknowledgeBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 260,
  },
});
