import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { ChatInputBar } from '../../components/ai/ChatInputBar';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthStore } from '../../store/useAuthStore';
import { useChatStore, type ChatThread, type ChatMessage } from '../../store/useChatStore';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { useTranslation } from 'react-i18next';

interface MessageBubbleProps {
  msg: ChatMessage;
  colors: import('../../theme/ThemeContext').ThemeColors;
  s: ReturnType<typeof makeStyles>;
}

// Memoized so typing in the input box or other unrelated screen state
// doesn't re-render every message bubble in a thread (chat can grow to
// 1000 messages, see useChatStore's cap).
const MessageBubble = React.memo(function MessageBubble({ msg, colors, s }: MessageBubbleProps) {
  const isMine = msg.senderType === 'user';
  return (
    <View style={[s.messageBubble, isMine ? s.userBubble : s.agentBubble]}>
      {!isMine && (
        <View style={s.agentAvatar}>
          <Ionicons name="headset-outline" size={14} color={colors.secondary} />
        </View>
      )}
      <View style={[s.bubbleContent, isMine ? s.userBubbleContent : s.agentBubbleContent]}>
        {!isMine && msg.senderName && <Text style={s.agentName}>{msg.senderName}</Text>}
        <Text style={[s.bubbleText, isMine ? s.userBubbleText : s.agentBubbleText]}>{msg.body}</Text>
        <Text style={[s.bubbleTime, isMine ? s.userBubbleTime : s.agentBubbleTime]}>
          {format(new Date(msg.createdAt), 'h:mm a')}
        </Text>
      </View>
    </View>
  );
});

export function LiveChatScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { t } = useTranslation('settings');
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const familyId = useAuthStore((state) => state.familyId);

  const threads = useChatStore((state) => state.threads);
  const activeThreadId = useChatStore((state) => state.activeThreadId);
  const messagesByThread = useChatStore((state) => state.messages);
  const connectionStatus = useChatStore((state) => state.connectionStatus);
  const isLoadingThreads = useChatStore((state) => state.isLoadingThreads);
  const isLoadingMessages = useChatStore((state) => state.isLoadingMessages);
  const isSending = useChatStore((state) => state.isSending);
  const loadThreads = useChatStore((state) => state.loadThreads);
  const openThread = useChatStore((state) => state.openThread);
  const createThread = useChatStore((state) => state.createThread);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const setActiveThread = useChatStore((state) => state.setActiveThread);
  const disconnectSocket = useChatStore((state) => state.disconnectSocket);

  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const hasAutoOpened = useRef(false);
  const scrollRef = useRef<FlatList>(null);
  // Populates the input for review before sending, rather than auto-sending
  // like the AI Assistant's voice input — misheard words matter more in a
  // real support conversation with a person than in a one-shot AI query.
  const voice = useVoiceInput({ onResult: (text) => setInput((prev) => (prev ? `${prev} ${text}` : text)) });

  const activeThread = threads.find((th) => th.id === activeThreadId) ?? null;
  const activeMessages = activeThreadId ? messagesByThread[activeThreadId] ?? [] : [];

  useEffect(() => {
    if (!familyId) return;
    loadThreads();
    return () => disconnectSocket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

  useEffect(() => {
    if (!familyId || hasAutoOpened.current) return;
    if (threads.length > 0) {
      hasAutoOpened.current = true;
      openThread(threads[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, threads.length]);

  async function handleSend(text?: string) {
    const body = (text ?? input).trim();
    if (!body || !familyId) return;
    setInput('');

    if (activeThreadId) {
      await sendMessage(activeThreadId, body);
    } else {
      hasAutoOpened.current = true;
      await createThread({ body });
    }
  }

  function handleSelectThread(thread: ChatThread) {
    setShowHistory(false);
    if (thread.id !== activeThreadId) openThread(thread.id);
  }

  function handleNewConversation() {
    setShowHistory(false);
    setActiveThread(null);
  }

  const isOnline = connectionStatus === 'connected';

  const screenHeader = (
    <LinearGradient colors={['#0F2952', '#1E4A8A']} style={[s.header, { paddingTop: insets.top + 16 }]}>
      <View style={s.headerTopRow}>
        <TouchableOpacity accessibilityRole="button" activeOpacity={0.7} style={s.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={s.headerTitleBlock}>
          <Text style={s.headerTitle} numberOfLines={1}>
            {activeThread?.subject ?? t('settings.screens.liveChat.defaultTitle')}
          </Text>
          <View style={s.statusRow}>
            <View style={[s.statusDot, { backgroundColor: isOnline ? '#2ECC71' : '#94A3B8' }]} />
            <Text style={s.statusText}>{isOnline ? t('settings.screens.liveChat.statusConnected') : t('settings.screens.liveChat.statusConnecting')}</Text>
          </View>
        </View>
        {familyId && (
          <>
            <TouchableOpacity accessibilityRole="button" activeOpacity={0.7} style={s.iconButton} onPress={() => setShowHistory(true)}>
              <Ionicons name="time-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" activeOpacity={0.7} style={s.iconButton} onPress={handleNewConversation}>
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </LinearGradient>
  );

  const screenCompact = (
    <View style={s.compactHeader}>
      <TouchableOpacity accessibilityRole="button" activeOpacity={0.7} style={s.iconButton} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={[s.headerTitle, { flex: 1, marginLeft: 8 }]} numberOfLines={1}>
        {activeThread?.subject ?? t('settings.screens.liveChat.defaultTitle')}
      </Text>
    </View>
  );

  const renderMessageItem = useCallback(
    ({ item }: { item: ChatMessage }) => <MessageBubble msg={item} colors={colors} s={s} />,
    [colors, s]
  );

  // ── Not yet backend-linked ──────────────────────────────────────────────
  if (!familyId) {
    return (
      <View style={s.container}>
        <StatusBar style="light" />
        <LinearGradient colors={['#0F2952', '#1E4A8A']} style={[s.header, { paddingTop: insets.top + 16 }]}>
          <View style={s.headerTopRow}>
            <TouchableOpacity accessibilityRole="button" activeOpacity={0.7} style={s.iconButton} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={s.headerTitleBlock}>
              <Text style={s.headerTitle}>{t('liveChat.title')}</Text>
            </View>
          </View>
        </LinearGradient>
        <View style={s.notLinkedContainer}>
          <View style={s.notLinkedIcon}>
            <Ionicons name="cloud-offline-outline" size={36} color={colors.primary} />
          </View>
          <Text style={s.notLinkedTitle}>{t('settings.screens.liveChat.connectingAccountTitle')}</Text>
          <Text style={s.notLinkedText}>
            {t('settings.screens.liveChat.connectingAccountText')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar style="light" />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
          {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
            <FlatList
              ref={scrollRef}
              style={{ flex: 1 }}
              onScroll={onScroll}
              onScrollEndDrag={onScrollEndDrag}
              onMomentumScrollEnd={onMomentumScrollEnd}
              scrollEventThrottle={scrollEventThrottle}
              contentContainerStyle={[
                s.messages,
                { paddingTop: contentPaddingTop, paddingBottom: 16 },
                activeMessages.length === 0 && { flexGrow: 1 },
              ]}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
              showsVerticalScrollIndicator={false}
              data={activeMessages}
              keyExtractor={(msg) => msg.id}
              renderItem={renderMessageItem}
              ListEmptyComponent={
                isLoadingThreads && !activeThreadId ? (
                  <View style={s.loadingBlock}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : !activeThreadId ? (
                  <View style={s.emptyChat}>
                    <View style={s.emptyChatIcon}>
                      <Ionicons name="chatbubble-ellipses-outline" size={40} color={colors.primary} />
                    </View>
                    <Text style={s.emptyChatTitle}>{t('settings.screens.liveChat.emptyChatTitle')}</Text>
                    <Text style={s.emptyChatSubtitle}>
                      {t('settings.screens.liveChat.emptyChatSubtitle')}
                    </Text>
                  </View>
                ) : isLoadingMessages ? (
                  <View style={s.loadingBlock}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : null
              }
            />
          )}
        </CollapsibleHeader>

        {isSending && (
          <View style={s.sendingRow}>
            <ActivityIndicator size="small" color={colors.textMuted} />
            <Text style={s.sendingText}>{t('settings.screens.liveChat.sendingText')}</Text>
          </View>
        )}

        <ChatInputBar
          value={input}
          onChangeText={setInput}
          onSend={() => handleSend()}
          onMicPressIn={voice.start}
          onMicPressOut={voice.stop}
          onMicCancel={voice.cancel}
          isListening={voice.isListening}
          partialTranscript={voice.partial}
          placeholder={t('settings.screens.liveChat.placeholder')}
          disabled={isSending}
          bottomPadding={Math.max(insets.bottom, 8)}
          accentColor={colors.primary}
        />
      </KeyboardAvoidingView>

      {/* ── HISTORY MODAL ── */}
      <Modal visible={showHistory} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowHistory(false)}>
        <View style={s.modalContainer}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{t('settings.screens.liveChat.conversationsTitle')}</Text>
            <Pressable accessibilityRole="button" onPress={() => setShowHistory(false)} style={s.modalClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={s.threadList}>
            {threads.length === 0 ? (
              <Text style={s.notLinkedText}>{t('settings.screens.liveChat.noConversations')}</Text>
            ) : (
              threads.map((thread) => (
                <TouchableOpacity accessibilityRole="button"
                  key={thread.id}
                  activeOpacity={0.7}
                  style={[s.threadRow, thread.id === activeThreadId && s.threadRowActive]}
                  onPress={() => handleSelectThread(thread)}
                >
                  <View style={s.threadRowIcon}>
                    <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.threadSubject} numberOfLines={1}>
                      {thread.subject ?? t('settings.screens.liveChat.defaultSubject')}
                    </Text>
                    <Text style={s.threadMeta}>
                      {thread.status} • {format(new Date(thread.lastMessageAt), 'MMM d, h:mm a')}
                    </Text>
                  </View>
                  {thread.id === activeThreadId && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(colors: import('../../theme/ThemeContext').ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 20, paddingBottom: 14 },
    compactHeader: {
      backgroundColor: '#0F2952',
      paddingBottom: 10,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitleBlock: { flex: 1 },
    headerTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
    statusDot: { width: 7, height: 7, borderRadius: 3.5 },
    statusText: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },

    notLinkedContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    notLinkedIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: '#E8EEF9',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    notLinkedTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 8 },
    notLinkedText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },

    messages: { padding: 16, flexGrow: 1 },
    loadingBlock: { paddingVertical: 40, alignItems: 'center' },
    emptyChat: { alignItems: 'center', paddingVertical: 32 },
    emptyChatIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#E8EEF9',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyChatTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 10 },
    emptyChatSubtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 16 },

    messageBubble: { flexDirection: 'row', marginBottom: 10 },
    userBubble: { justifyContent: 'flex-end' },
    agentBubble: { justifyContent: 'flex-start', alignItems: 'flex-end', gap: 8 },
    agentAvatar: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: '#E8EEF9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    bubbleContent: { maxWidth: '78%', borderRadius: 18, padding: 12 },
    userBubbleContent: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
    agentBubbleContent: { backgroundColor: colors.card, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
    agentName: { fontSize: 11, fontWeight: '700', color: colors.secondary, marginBottom: 3 },
    bubbleText: { fontSize: 14, lineHeight: 21 },
    userBubbleText: { color: '#fff' },
    agentBubbleText: { color: colors.text },
    bubbleTime: { fontSize: 10, marginTop: 4 },
    userBubbleTime: { color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
    agentBubbleTime: { color: colors.textMuted },

    sendingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingBottom: 4 },
    sendingText: { fontSize: 12, color: colors.textMuted },

    modalContainer: { flex: 1, backgroundColor: colors.background },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    modalClose: { padding: 4 },
    threadList: { padding: 16 },
    threadRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    threadRowActive: { borderColor: colors.primary },
    threadRowIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary + '18',
      alignItems: 'center',
      justifyContent: 'center',
    },
    threadSubject: { fontSize: 14, fontWeight: '700', color: colors.text },
    threadMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
  });
}
