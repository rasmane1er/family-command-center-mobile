import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert, Modal, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuthStore, type LockTimeout } from '../../store/useAuthStore';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';

const TIMEOUT_OPTIONS: { label: string; value: LockTimeout }[] = [
  { label: 'Immediately', value: 'immediate' },
  { label: '1 minute', value: '1min' },
  { label: '5 minutes', value: '5min' },
  { label: '15 minutes', value: '15min' },
  { label: '1 hour', value: '1hour' },
  { label: 'Never', value: 'never' },
];

export function SecurityScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const {
    hasPinSet, biometricEnabled, lockTimeout,
    setBiometricEnabled, setLockTimeout, removePin, changePin,
  } = useAuthStore();

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    (async () => {
      const hw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(hw && enrolled);
    })();
  }, []);

  const handleToggleBiometric = (val: boolean) => {
    if (val && !biometricAvailable) {
      Alert.alert('Not Available', 'Biometric authentication is not set up on this device. Please enable Face ID or Touch ID in device Settings.');
      return;
    }
    setBiometricEnabled(val);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleRemovePin = () => {
    Alert.alert(
      'Remove PIN',
      'This will remove all PIN and biometric protection from the app. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removePin();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleChangePin = () => {
    setPinError('');
    if (!oldPin || oldPin.length < 4) { setPinError('Enter your current PIN'); return; }
    if (!newPin || newPin.length < 4) { setPinError('New PIN must be at least 4 digits'); return; }
    if (newPin !== confirmPin) { setPinError('New PINs do not match'); return; }
    const ok = changePin(oldPin, newPin);
    if (!ok) {
      setPinError('Current PIN is incorrect');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setOldPin(''); setNewPin(''); setConfirmPin('');
    setShowChangePinModal(false);
    Alert.alert('PIN Changed', 'Your PIN has been updated successfully.');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#1A237E', '#283593']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Security & Privacy</Text>
        </View>
        <Text style={styles.headerSub}>Protect your family's data</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 60 }]}>

        {/* PIN status card */}
        <View style={[styles.statusCard, shadows.card]}>
          <View style={[styles.statusIcon, { backgroundColor: hasPinSet ? '#E8F5E9' : '#FFF3E0' }]}>
            <Ionicons name={hasPinSet ? 'shield-checkmark' : 'shield-outline'} size={28} color={hasPinSet ? '#2E7D32' : '#E65100'} />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.statusTitle}>{hasPinSet ? 'PIN Protection Active' : 'No PIN Set'}</Text>
            <Text style={styles.statusSub}>{hasPinSet ? 'Your app is protected' : 'Set a PIN to protect your data'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: hasPinSet ? '#E8F5E9' : '#FFF3E0' }]}>
            <Text style={[styles.statusBadgeText, { color: hasPinSet ? '#2E7D32' : '#E65100' }]}>
              {hasPinSet ? 'ON' : 'OFF'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>PIN SETTINGS</Text>

        {!hasPinSet && (
          <Pressable style={[styles.row, shadows.sm]} onPress={() => navigation.navigate('PinSetup', { isChanging: true })}>
            <View style={[styles.rowIcon, { backgroundColor: '#E8EAF6' }]}>
              <Ionicons name="keypad" size={20} color="#3F51B5" />
            </View>
            <Text style={styles.rowLabel}>Set Up PIN</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        )}

        {hasPinSet && (
          <>
            <Pressable style={[styles.row, shadows.sm]} onPress={() => setShowChangePinModal(true)}>
              <View style={[styles.rowIcon, { backgroundColor: '#E8EAF6' }]}>
                <Ionicons name="create-outline" size={20} color="#3F51B5" />
              </View>
              <Text style={styles.rowLabel}>Change PIN</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>

            <View style={[styles.row, shadows.sm]}>
              <View style={[styles.rowIcon, { backgroundColor: biometricEnabled ? '#E8F5E9' : '#ECEFF1' }]}>
                <Ionicons name="finger-print" size={20} color={biometricEnabled ? '#2E7D32' : colors.textMuted} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.rowLabel}>Face ID / Touch ID</Text>
                {!biometricAvailable && (
                  <Text style={styles.rowSub}>Not available on this device</Text>
                )}
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleToggleBiometric}
                trackColor={{ true: '#27AE60', false: colors.border }}
                thumbColor="#fff"
                disabled={!biometricAvailable}
              />
            </View>

            <Text style={styles.sectionLabel}>AUTO-LOCK</Text>
            {TIMEOUT_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[styles.row, shadows.sm]}
                onPress={() => {
                  setLockTimeout(opt.value);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <View style={[styles.rowIcon, { backgroundColor: lockTimeout === opt.value ? '#E3F2FD' : '#F5F5F5' }]}>
                  <Ionicons name="time-outline" size={20} color={lockTimeout === opt.value ? '#1565C0' : colors.textMuted} />
                </View>
                <Text style={[styles.rowLabel, lockTimeout === opt.value && { color: '#1565C0', fontWeight: '700' }]}>
                  {opt.label}
                </Text>
                {lockTimeout === opt.value && (
                  <Ionicons name="checkmark-circle" size={22} color="#1565C0" />
                )}
              </Pressable>
            ))}

            <Text style={styles.sectionLabel}>DANGER ZONE</Text>
            <Pressable style={[styles.row, styles.dangerRow, shadows.sm]} onPress={handleRemovePin}>
              <View style={[styles.rowIcon, { backgroundColor: '#FFEBEE' }]}>
                <Ionicons name="trash-outline" size={20} color="#C62828" />
              </View>
              <Text style={[styles.rowLabel, { color: '#C62828' }]}>Remove PIN Protection</Text>
              <Ionicons name="chevron-forward" size={18} color="#C62828" />
            </Pressable>
          </>
        )}
      </ScrollView>

      {/* Change PIN Modal */}
      <Modal visible={showChangePinModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowChangePinModal(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Change PIN</Text>

          <Text style={styles.modalLabel}>Current PIN</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Enter current PIN"
            value={oldPin}
            onChangeText={setOldPin}
            secureTextEntry
            keyboardType="number-pad"
            maxLength={8}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.modalLabel}>New PIN</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Enter new PIN (min 4 digits)"
            value={newPin}
            onChangeText={setNewPin}
            secureTextEntry
            keyboardType="number-pad"
            maxLength={8}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.modalLabel}>Confirm New PIN</Text>
          <TextInput
            style={[styles.modalInput, { marginBottom: pinError ? 8 : 24 }]}
            placeholder="Repeat new PIN"
            value={confirmPin}
            onChangeText={setConfirmPin}
            secureTextEntry
            keyboardType="number-pad"
            maxLength={8}
            placeholderTextColor={colors.textMuted}
          />

          {!!pinError && <Text style={styles.pinError}>{pinError}</Text>}

          <Pressable style={styles.saveBtn} onPress={handleChangePin}>
            <Text style={styles.saveBtnText}>Update PIN</Text>
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={() => setShowChangePinModal(false)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  back: { marginRight: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  content: { padding: 16 },
  statusCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 24 },
  statusIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statusTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  statusSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { borderRadius: 10, paddingVertical: 4, paddingHorizontal: 10 },
  statusBadgeText: { fontSize: 12, fontWeight: '800' },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 10 },
  rowIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  rowSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  dangerRow: { borderWidth: 1.5, borderColor: '#FFCDD2' },
  modal: { flex: 1, padding: 24, backgroundColor: colors.background },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 24 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase' },
  modalInput: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1.5, borderColor: colors.border, marginBottom: 16 },
  pinError: { fontSize: 13, color: colors.danger, marginBottom: 16, fontWeight: '600' },
  saveBtn: { backgroundColor: '#1A237E', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10 },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  cancelBtn: { padding: 14, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, color: colors.textSecondary },
});
