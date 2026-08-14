import React, { useRef, useState } from 'react';
import {
  Animated,
  GestureResponderEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface Props {
  value: string;
  onChangeText: (t: string) => void;
  onSend: () => void;
  onMicPressIn: () => void;
  onMicPressOut: () => void;
  onMicCancel: () => void;
  isListening: boolean;
  partialTranscript?: string;
  placeholder?: string;
  disabled?: boolean;
  bottomPadding?: number;
  accentColor?: string;
}

const CANCEL_THRESHOLD = 80;
const WA_GREEN = '#25D366';
const WA_BG = '#F0F2F5';
const WA_PILL = '#FFFFFF';
const WA_BORDER = '#E9EDEF';
const WA_ICON = '#54656F';
const WA_TEXT = '#111B21';
const WA_PLACEHOLDER = '#8696A0';

export function ChatInputBar({
  value,
  onChangeText,
  onSend,
  onMicPressIn,
  onMicPressOut,
  onMicCancel,
  isListening,
  partialTranscript = '',
  placeholder,
  disabled = false,
  bottomPadding = 8,
  accentColor = WA_GREEN,
}: Props) {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t('screens.shared.chatMessagePlaceholder');
  const hasText = value.trim().length > 0;
  const [cancelled, setCancelled] = useState(false);
  const startX = useRef(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  function startPulse() {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  }

  function stopPulse() {
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
  }

  function handleMicPressIn(e: GestureResponderEvent) {
    startX.current = e.nativeEvent.pageX;
    setCancelled(false);
    slideAnim.setValue(0);
    startPulse();
    onMicPressIn();
  }

  function handleMicMove(e: GestureResponderEvent) {
    const dx = startX.current - e.nativeEvent.pageX;
    if (dx > 0) {
      slideAnim.setValue(Math.min(dx, CANCEL_THRESHOLD + 20));
      if (dx >= CANCEL_THRESHOLD && !cancelled) setCancelled(true);
      else if (dx < CANCEL_THRESHOLD && cancelled) setCancelled(false);
    }
  }

  function handleMicPressOut() {
    stopPulse();
    slideAnim.setValue(0);
    if (cancelled) {
      setCancelled(false);
      onMicCancel();
    } else {
      onMicPressOut();
    }
  }

  /* ── Recording state ── */
  if (isListening) {
    return (
      <View style={[styles.wrapper, { paddingBottom: bottomPadding }]}>
        <View
          style={styles.row}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderMove={handleMicMove}
          onResponderRelease={handleMicPressOut}
        >
          {/* Left: slide-to-cancel */}
          <Animated.View
            style={[
              styles.cancelArea,
              {
                opacity: slideAnim.interpolate({
                  inputRange: [0, CANCEL_THRESHOLD],
                  outputRange: [0.5, 1],
                  extrapolate: 'clamp',
                }),
                transform: [{
                  translateX: slideAnim.interpolate({
                    inputRange: [0, CANCEL_THRESHOLD],
                    outputRange: [0, -14],
                    extrapolate: 'clamp',
                  }),
                }],
              },
            ]}
          >
            <Ionicons name="chevron-back" size={15} color={cancelled ? '#EF4444' : WA_PLACEHOLDER} />
            <Text style={[styles.cancelText, cancelled && styles.cancelActive]}>
              {cancelled ? t('screens.shared.chatReleaseToCancel') : t('screens.shared.chatSlideToCancel')}
            </Text>
          </Animated.View>

          {/* Center: pulsing dot + transcript */}
          <View style={styles.recordCenter}>
            <Animated.View style={[styles.recDot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={styles.recLabel} numberOfLines={1}>
              {partialTranscript || t('screens.shared.chatListening')}
            </Text>
          </View>

          {/* Right: pulsing mic button */}
          <Animated.View style={[styles.sendBtn, { backgroundColor: '#EF4444', transform: [{ scale: pulseAnim }] }]}>
            <Ionicons name="mic" size={22} color="#fff" />
          </Animated.View>
        </View>
      </View>
    );
  }

  /* ── Normal state ── */
  return (
    <View style={[styles.wrapper, { paddingBottom: bottomPadding }]}>
      <View style={styles.row}>
        {/* Input pill */}
        <View style={styles.pill}>
          <TextInput accessibilityLabel={resolvedPlaceholder}
            style={styles.textInput}
            value={value}
            onChangeText={onChangeText}
            placeholder={resolvedPlaceholder}
            placeholderTextColor={WA_PLACEHOLDER}
            multiline
            maxLength={2000}
            returnKeyType="default"
            editable={!disabled}
          />
        </View>

        {/* Mic or Send button */}
        {hasText ? (
          <Pressable accessibilityRole="button"
            style={[styles.sendBtn, { backgroundColor: accentColor }]}
            onPress={() => { onChangeText(''); onSend(); }}
            disabled={disabled}
          >
            <Ionicons name="send" size={19} color="#fff" style={{ marginLeft: 2 }} />
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button"
            style={[styles.sendBtn, { backgroundColor: accentColor }]}
            onPressIn={handleMicPressIn}
            onPressOut={handleMicPressOut}
            delayLongPress={0}
          >
            <Ionicons name="mic" size={22} color="#fff" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: WA_BG,
    paddingHorizontal: 8,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: WA_BORDER,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    minHeight: 52,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: WA_PILL,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: WA_BORDER,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    paddingHorizontal: 16,
    minHeight: 48,
    maxHeight: 130,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: WA_TEXT,
    lineHeight: 20,
    padding: 0,
    margin: 0,
    maxHeight: 110,
  },
  sendBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },

  /* Recording */
  cancelArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  cancelText: {
    fontSize: 13,
    color: WA_PLACEHOLDER,
  },
  cancelActive: {
    color: '#EF4444',
    fontWeight: '600',
  },
  recordCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  recLabel: {
    fontSize: 14,
    color: WA_TEXT,
    flexShrink: 1,
  },
});
