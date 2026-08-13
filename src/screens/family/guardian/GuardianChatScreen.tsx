import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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

import {
  fetchMessages,
  sendMessage,
  type GuardianMessage,
} from '../../../services/guardianService';
import { useGuardianStore } from '../../../store/useGuardianStore';
import { useFamilyStore } from '../../../store/useFamilyStore';
import { colors } from '../../../theme/colors';
import * as Notifications from 'expo-notifications';

const POLL_INTERVAL = 10_000;

export function GuardianChatScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { deviceId } = route.params ?? {};

  const devices = useGuardianStore((s) => s.devices);
  const members = useFamilyStore((s) => s.members);

  const device = devices.find((d) => d.id === deviceId);
  const member = members.find((m) => m.id === device?.memberId);

  const [messages, setMessages] = useState<GuardianMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList<Row>>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    if (!deviceId) { setLoading(false); return; }
    try {
      const { messages: msgs } = await fetchMessages(deviceId);
      setMessages(msgs);
    } catch {
      // silently ignore polling errors
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  // Hydrate guardian store on mount so device name & status are available
  // even when the screen is opened cold via a push notification tap.
  useEffect(() => {
    useGuardianStore.getState().hydrate();
  }, []);

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL);

    // Re-fetch immediately when child sends a message push so the guardian
    // doesn't wait up to 10s for the next poll.
    const pushSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, unknown> | undefined;
      if (data?.type === 'message') poll();
    });

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pushSub.remove();
    };
  }, [poll]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length]);

  async function handleSend() {
    const text = inputText.trim();
    if (!text || sending || !deviceId) return;

    const optimistic: GuardianMessage = {
      id: `opt-${Date.now()}`,
      role: 'parent',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInputText('');
    setSending(true);

    try {
      await sendMessage(deviceId, text, 'parent');
      await poll();
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInputText(text);
    } finally {
      setSending(false);
    }
  }

  function formatTime(iso: string): string {
    const d = new Date(iso);
    const h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h % 12 || 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
  }

  function formatDateSeparator(iso: string): string {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Insert date separators between messages from different days
  type Row = { type: 'msg'; item: GuardianMessage } | { type: 'sep'; label: string; key: string };
  const rows: Row[] = [];
  let lastDate = '';
  for (const msg of messages) {
    const dateLabel = formatDateSeparator(msg.timestamp);
    if (dateLabel !== lastDate) {
      rows.push({ type: 'sep', label: dateLabel, key: `sep-${msg.id}` });
      lastDate = dateLabel;
    }
    rows.push({ type: 'msg', item: msg });
  }

  const childName = member?.name ?? device?.deviceName ?? 'Child';
  const isOnline = device?.status === 'online';

  function renderRow({ item: row }: { item: Row }) {
    if (row.type === 'sep') {
      return (
        <View style={styles.dateSepRow}>
          <View style={styles.dateSepLine} />
          <Text style={styles.dateSepText}>{row.label}</Text>
          <View style={styles.dateSepLine} />
        </View>
      );
    }

    const { item } = row;
    const isParent = item.role === 'parent';
    const isOpt = item.id.startsWith('opt-');

    return (
      <View style={[styles.msgRow, isParent ? styles.msgRowRight : styles.msgRowLeft]}>
        {!isParent && (
          <View style={styles.childAvatar}>
            <Text style={styles.childAvatarText}>{childName.charAt(0).toUpperCase()}</Text>
          </View>
        )}

        <View style={[styles.bubble, isParent ? styles.bubbleParent : styles.bubbleChild, isOpt && styles.bubbleOpt]}>
          {!isParent && (
            <Text style={styles.bubbleSenderName}>{childName}</Text>
          )}
          <Text style={[styles.bubbleText, isParent && styles.bubbleTextParent]}>
            {item.content}
          </Text>
          <Text style={[styles.bubbleTime, isParent ? styles.bubbleTimeParent : styles.bubbleTimeChild]}>
            {isOpt ? 'Sending…' : formatTime(item.timestamp)}
            {isParent && !isOpt && (
              <Text>  <Ionicons name="checkmark-done" size={10} color="rgba(255,255,255,0.55)" /></Text>
            )}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient colors={['#081B33', '#0F2952', '#1E4A8A']} style={styles.header}>
        <Pressable
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.getParent()?.navigate('Home')}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>

        <View style={styles.headerCenter}>
          <View style={styles.headerAvatarRow}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>{childName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={[styles.onlineDot, { backgroundColor: isOnline ? '#22C55E' : '#6B7280' }]} />
          </View>
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerName}>{childName}</Text>
            <Text style={styles.headerStatus}>
              {isOnline ? 'Online' : device?.status?.replace('_', ' ') ?? 'Offline'}
            </Text>
          </View>
        </View>

        <Pressable style={styles.headerAction}>
          <Ionicons name="ellipsis-vertical" size={20} color="rgba(255,255,255,0.7)" />
        </Pressable>
      </LinearGradient>

      {/* Messages */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading messages…</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={rows}
          keyExtractor={(row) => row.type === 'sep' ? row.key : row.item.id}
          renderItem={renderRow}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 90 }]}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="chatbubbles-outline" size={40} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySub}>Send {childName} a message to get started</Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top}
      >
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={`Message ${childName}…`}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <Pressable
            style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={16} color="#fff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },

  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  headerAvatarRow: { position: 'relative' },

  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  headerAvatarText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },

  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#081B33',
  },

  headerTextBlock: { flex: 1 },

  headerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  headerStatus: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 1,
    textTransform: 'capitalize',
  },

  headerAction: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
  },

  list: {
    padding: 16,
    gap: 2,
    flexGrow: 1,
  },

  dateSepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 14,
  },

  dateSepLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },

  dateSepText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  msgRow: {
    flexDirection: 'row',
    marginBottom: 6,
    gap: 8,
    maxWidth: '85%',
  },

  msgRowLeft: {
    alignSelf: 'flex-start',
    alignItems: 'flex-end',
  },

  msgRowRight: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },

  childAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary + '33',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  childAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },

  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '100%',
  },

  bubbleChild: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },

  bubbleParent: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },

  bubbleOpt: { opacity: 0.65 },

  bubbleSenderName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 3,
  },

  bubbleText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },

  bubbleTextParent: {
    color: '#fff',
  },

  bubbleTime: {
    fontSize: 10,
    marginTop: 4,
  },

  bubbleTimeChild: {
    color: colors.textMuted,
  },

  bubbleTimeParent: {
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'right',
  },

  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 10,
  },

  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },

  emptySub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 10,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10,
    color: colors.text,
    fontSize: 15,
    maxHeight: 110,
    borderWidth: 1,
    borderColor: colors.border,
  },

  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sendBtnDisabled: {
    backgroundColor: colors.border,
  },
});
