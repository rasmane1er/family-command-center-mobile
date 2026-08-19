import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'] as ImagePicker.MediaType[],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;

    setLoading(true);
    try {
      const extracted = await extractFieldsFromPhoto(result.assets[0].base64, fields, context);
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
