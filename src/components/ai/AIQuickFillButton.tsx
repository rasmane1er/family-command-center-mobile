import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { extractFieldsFromPhoto, type QuickFillField, type QuickFillResult } from '../../services/aiService';

interface Props {
  fields: QuickFillField[];
  context?: string;
  onExtracted: (result: QuickFillResult) => void;
  label?: string;
}

// Snap a photo of a physical document (registration, bill, insurance card,
// invoice) and have AI read the printed fields into the form instead of
// retyping them by hand. Mirrors ScanItemScreen's camera-capture pattern —
// same launchCameraAsync options — but generic over any field schema.
export function AIQuickFillButton({ fields, context, onExtracted, label = 'Scan with camera' }: Props) {
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    let result: ImagePicker.ImagePickerResult;
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Camera Access Needed',
          perm.canAskAgain
            ? 'Allow camera access to scan a document.'
            : 'Camera access is blocked. Enable it in Settings to scan a document.',
        );
        return;
      }
      // launchCameraAsync rejects (rather than just returning canceled) when
      // there's no real camera to open — every iOS/Android simulator, plus
      // rarer real-device cases (hardware busy, OS-level restriction). This
      // previously had no try/catch at all, so the promise rejection was
      // unhandled and the button silently did nothing — indistinguishable
      // from "broken" with zero feedback.
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'] as ImagePicker.MediaType[],
        quality: 0.8,
      });
    } catch {
      Alert.alert('Camera Unavailable', 'Could not open the camera on this device.');
      return;
    }
    if (result.canceled || !result.assets[0]?.uri) return;

    setLoading(true);
    try {
      // ImagePicker's `quality` only controls JPEG compression, not pixel
      // dimensions — a modern phone camera photo stays at its full native
      // resolution (often 4000px+ per side) regardless of that setting, and
      // its base64 form can easily exceed the backend's request body limit,
      // failing with an opaque "Scan failed" that looked like a network
      // issue. Documents don't need more than ~1600px on the long edge to
      // stay legible for OCR, so resize+recompress here instead of trusting
      // the camera's raw output.
      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 1600 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      if (!manipulated.base64) {
        Alert.alert('Scan failed', 'Could not process the photo. Try again, or enter the fields manually.');
        return;
      }
      const extracted = await extractFieldsFromPhoto(manipulated.base64, fields, context);
      const filledCount = Object.values(extracted).filter((v) => v !== null).length;
      if (filledCount === 0) {
        Alert.alert("Couldn't read that", 'No fields were recognized in the photo. Try again with better lighting, or enter them manually.');
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onExtracted(extracted);
    } catch {
      Alert.alert('Scan failed', 'Could not analyze the photo. Check your connection and try again, or enter the fields manually.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable onPress={handlePress} disabled={loading} style={styles.button} accessibilityRole="button">
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Ionicons name="camera" size={16} color={colors.primary} />
      )}
      <Text style={styles.text}>{loading ? 'Reading photo…' : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.primary + '14',
    borderWidth: 1,
    borderColor: colors.primary + '33',
    marginBottom: 12,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
});
