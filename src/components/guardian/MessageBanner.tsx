import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface MessageBannerData {
  deviceId: string;
  deviceName: string;
  content: string;
}

interface Props {
  banner: MessageBannerData | null;
  onDismiss: () => void;
  onPress: (deviceId: string) => void;
}

const AUTO_DISMISS_MS = 5000;

export function MessageBanner({ banner, onDismiss, onPress }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (banner) {
      // Slide in
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();

      // Auto-dismiss after 5s
      timerRef.current = setTimeout(() => {
        dismiss();
      }, AUTO_DISMISS_MS);
    } else {
      dismiss(false);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [banner]);

  function dismiss(animate = true) {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (animate) {
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        // Defer state update out of the animation callback to avoid
        // triggering a React update inside useInsertionEffect (useSafeAreaInsets).
        setTimeout(onDismiss, 0);
      });
    } else {
      translateY.setValue(-120);
    }
  }

  if (!banner) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { top: insets.top + 8, transform: [{ translateY }] },
      ]}
    >
      <Pressable
        style={styles.inner}
        onPress={() => {
          const id = banner.deviceId;
          dismiss();
          setTimeout(() => onPress(id), 260);
        }}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="chatbubble-ellipses" size={22} color="#fff" />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={1}>
            💬 {banner.deviceName}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {banner.content}
          </Text>
        </View>
        <Pressable onPress={() => dismiss()} style={styles.closeBtn} hitSlop={8}>
          <Ionicons name="close" size={18} color="rgba(255,255,255,0.7)" />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 20,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2E4A',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  body: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    lineHeight: 18,
  },
  closeBtn: {
    padding: 2,
    flexShrink: 0,
  },
});
