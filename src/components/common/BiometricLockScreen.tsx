import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

interface BiometricLockScreenProps {
  onUnlock: () => void;
}

export function BiometricLockScreen({ onUnlock }: BiometricLockScreenProps) {
  const { t } = useTranslation();
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={['#0F2952', '#16476E']} style={styles.container}>
        <View style={styles.iconCircle}>
          <Ionicons name="finger-print" size={48} color="#fff" />
        </View>
        <Text style={styles.title}>{t('screens.shared.biometricLockedTitle')}</Text>
        <Text style={styles.subtitle}>{t('screens.shared.biometricLockedSubtitle')}</Text>
        <Pressable accessibilityRole="button" style={styles.button} onPress={onUnlock}>
          <Text style={styles.buttonText}>{t('screens.shared.unlock')}</Text>
        </Pressable>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconCircle: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 8, marginBottom: 28 },
  button: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32 },
  buttonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
