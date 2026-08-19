import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { VoiceMicButton } from './VoiceMicButton';
import { parseFieldsFromText, type QuickFillField, type QuickFillResult } from '../../services/aiService';

interface Props {
  fields: QuickFillField[];
  context?: string;
  onExtracted: (result: QuickFillResult) => void;
  prompt?: string;
}

// Press-and-hold to dictate a natural-language description ("Emma's dentist
// checkup next Tuesday at 3, Dr. Patel"), release to have AI parse it into
// the form's fields. Reuses the same useVoiceInput/VoiceMicButton the AI
// Assistant chat already uses — transcription happens fully on-device, only
// the resulting text is sent to the AI-parse endpoint.
export function AIVoiceQuickFillButton({ fields, context, onExtracted, prompt = 'Hold to dictate' }: Props) {
  const [parsing, setParsing] = useState(false);

  const handleResult = async (text: string) => {
    setParsing(true);
    try {
      const extracted = await parseFieldsFromText(text, fields, context);
      const filledCount = Object.values(extracted).filter((v) => v !== null).length;
      if (filledCount === 0) {
        Alert.alert("Didn't catch that", 'No fields were recognized from what you said. Try again, or enter them manually.');
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onExtracted(extracted);
    } catch {
      Alert.alert('Parse failed', 'Could not process that. Check your connection and try again, or enter the fields manually.');
    } finally {
      setParsing(false);
    }
  };

  const voice = useVoiceInput({ onResult: handleResult });

  return (
    <View style={styles.row}>
      {parsing ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Pressable accessibilityRole="button" onPressIn={voice.start} onPressOut={voice.stop}>
          <VoiceMicButton isListening={voice.isListening} onPress={() => {}} size={36} />
        </Pressable>
      )}
      <Text style={styles.label}>
        {parsing ? 'Filling in fields…' : voice.isListening ? (voice.partial || 'Listening…') : prompt}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.primary + '14',
    borderWidth: 1,
    borderColor: colors.primary + '33',
    marginBottom: 12,
  },
  label: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
});
