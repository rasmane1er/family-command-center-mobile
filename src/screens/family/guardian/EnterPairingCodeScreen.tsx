import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGuardianStore } from '../../../store/useGuardianStore';
import { Button } from '../../../components/common/Button';
import { colors } from '../../../theme/colors';

// Shown on a PARENT's device: scans or manually enters the pairing code a
// child's device generated on RegisterChildDeviceScreen, then calls
// POST /guardian/devices/pair to link it to this family.
export function EnterPairingCodeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [isPairing, setIsPairing] = useState(false);

  const pairWithCode = useGuardianStore((s) => s.pairWithCode);

  const submitCode = async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (code.length < 4) {
      Alert.alert('Enter a Code', "Enter the pairing code shown on the child's device.");
      setScanned(false);
      return;
    }

    setIsPairing(true);
    try {
      await pairWithCode(code);
      Alert.alert('Device Paired', 'The device is now connected to your family.', [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert(
        'Pairing Failed',
        'That code is invalid, expired, or already paired. Ask the child to generate a new one and try again.'
      );
      setScanned(false);
    } finally {
      setIsPairing(false);
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned || isPairing) return;
    setScanned(true);

    try {
      const parsed = JSON.parse(data);
      if (parsed?.type !== 'device-pair' || !parsed?.pairingCode) {
        Alert.alert('Invalid QR Code', 'This is not a valid device pairing code.');
        setScanned(false);
        return;
      }
      submitCode(parsed.pairingCode);
    } catch {
      Alert.alert('Invalid QR Code', 'This QR code could not be read.');
      setScanned(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Add Device</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.cameraWrap}>
        {permission?.granted ? (
          <>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanned || isPairing ? undefined : handleBarcodeScanned}
            />
            <View style={styles.scanOverlay}>
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.cornerTopLeft]} />
                <View style={[styles.corner, styles.cornerTopRight]} />
                <View style={[styles.corner, styles.cornerBottomLeft]} />
                <View style={[styles.corner, styles.cornerBottomRight]} />
              </View>
              <Text style={styles.scanHint}>Scan the QR code on the child's device</Text>

              {(scanned || isPairing) && (
                <Pressable
                  style={styles.scanAgainBtn}
                  onPress={() => {
                    setScanned(false);
                  }}
                  disabled={isPairing}
                >
                  {isPairing ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.scanAgainText}>Scan Again</Text>
                  )}
                </Pressable>
              )}
            </View>
          </>
        ) : (
          <View style={styles.permissionPlaceholder}>
            <Ionicons name="camera-outline" size={40} color={colors.textMuted} />
            <Text style={styles.permissionText}>
              Allow camera access to scan a pairing QR code, or enter the code manually below.
            </Text>
            <Button title="Allow Camera" onPress={requestPermission} />
          </View>
        )}
      </View>

      <View style={styles.manualCard}>
        <Text style={styles.manualLabel}>Or enter the code manually</Text>
        <View style={styles.manualRow}>
          <TextInput
            style={styles.manualInput}
            placeholder="ABC123"
            placeholderTextColor={colors.textMuted}
            value={manualCode}
            onChangeText={setManualCode}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
          />
          <Button
            title="Pair"
            onPress={() => submitCode(manualCode)}
            disabled={manualCode.trim().length < 4 || isPairing}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },

  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },

  cameraWrap: {
    flex: 1,
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
  },

  scanOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 20,
  },

  scanFrame: {
    width: 220,
    height: 220,
    position: 'relative',
  },

  corner: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderColor: '#fff',
  },

  cornerTopLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 20 },
  cornerTopRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 20 },
  cornerBottomLeft: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 20 },
  cornerBottomRight: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 20 },

  scanHint: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },

  scanAgainBtn: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    minWidth: 100,
    alignItems: 'center',
  },

  scanAgainText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  permissionPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },

  permissionText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  manualCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    margin: 16,
    marginTop: 0,
  },

  manualLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  manualRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },

  manualInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 3,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
    fontFamily: 'monospace' as any,
  },
});
