import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatInputBar } from '../../components/ai/ChatInputBar';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { AIResetMenu } from '../../components/ai/AIResetMenu';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGuardianStore } from '../../store/useGuardianStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import type { ChatMessage } from '../../types';
import { useTabBarInset } from '../../hooks/useTabBarInset';
import { chatWithSafetyAssistant } from '../../services/aiService';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { SubscriptionGate } from '../../components/common/SubscriptionGate';

const PURPLE = '#8E44AD';
const PURPLE_LIGHT = '#F3E8FA';
const PURPLE_MID = '#C39BD3';

type ContextMode = 'general' | 'location' | 'screentime' | 'alerts';

const NS = 'ai.screens.familySafetyAssistant';

const CONTEXT_TABS: { key: ContextMode; labelKey: string }[] = [
  { key: 'general', labelKey: 'tabGeneral' },
  { key: 'location', labelKey: 'tabLocation' },
  { key: 'screentime', labelKey: 'tabScreenTime' },
  { key: 'alerts', labelKey: 'tabAlerts' },
];

const STARTER_MESSAGE_KEYS: Record<ContextMode, string> = {
  general: 'starterGeneral',
  location: 'starterLocation',
  screentime: 'starterScreenTime',
  alerts: 'starterAlerts',
};

const QUICK_PROMPT_KEYS = [
  'quickPrompt1',
  'quickPrompt2',
  'quickPrompt3',
  'quickPrompt4',
  'quickPrompt5',
  'quickPrompt6',
];

const generateId = () => Math.random().toString(36).substring(2, 11);

function buildStarterMessage(mode: ContextMode, t: TFunction): ChatMessage {
  return {
    id: generateId(),
    role: 'assistant',
    content: t(`${NS}.${STARTER_MESSAGE_KEYS[mode]}`),
    timestamp: new Date().toISOString(),
  };
}

export function FamilySafetyAssistantScreen({ navigation }: any) {
  const { t } = useTranslation('ai');
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const devices = useGuardianStore((s) => s.devices);
  const sosAlerts = useGuardianStore((s) => s.sosAlerts);
  const approvalRequests = useGuardianStore((s) => s.approvalRequests);
  const screenTimeRules = useGuardianStore((s) => s.screenTimeRules);
  const members = useFamilyStore((s) => s.members);
  const childMembers = members.filter((m) => m.role === 'child');

  const [contextMode, setContextMode] = useState<ContextMode>('general');
  const [messages, setMessages] = useState<ChatMessage[]>([buildStarterMessage('general', t)]);
  const [input, setInput] = useState('');
  const voice = useVoiceInput({ onResult: (text) => sendMessage(text) });
  const [isLoading, setIsLoading] = useState(false);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [messages, scrollToEnd]);

  const switchTab = (mode: ContextMode) => {
    setContextMode(mode);
    setMessages([buildStarterMessage(mode, t)]);
  };

  const buildContextString = () => {
    const unresolvedSOS = sosAlerts.filter((a) => !a.isResolved);
    const pendingApprovals = approvalRequests.filter((r) => r.status === 'pending');
    const now = new Date();

    const childNames = childMembers.map((c) => c.name).join(', ');

    const deviceDetails = devices.map((d) => {
      const child = childMembers.find((c) => c.id === d.memberId);
      const lastSeenMins = d.lastSeen
        ? Math.floor((now.getTime() - new Date(d.lastSeen).getTime()) / 60000)
        : null;
      return `${d.deviceName} (${child?.name ?? 'unknown'}, last seen ${lastSeenMins !== null ? `${lastSeenMins} min ago` : 'unknown'})`;
    }).join('; ');

    const ruleDetails = childMembers.map((c) => {
      const rule = screenTimeRules.find((r) => r.memberId === c.id);
      if (!rule) return null;
      const blockedApps = rule.blockedApps?.length ?? 0;
      return `${c.name}: ${rule.dailyLimitMinutes}min/day${blockedApps > 0 ? `, ${blockedApps} blocked apps` : ''}`;
    }).filter((r): r is string => r !== null).join('; ');

    return [
      childNames ? `Children: ${childNames}` : null,
      `Monitored devices: ${devices.length}${deviceDetails ? ` (${deviceDetails})` : ''}`,
      `Unresolved SOS alerts: ${unresolvedSOS.length}`,
      `Pending approval requests: ${pendingApprovals.length}`,
      `Active screen time rules: ${screenTimeRules.length}${ruleDetails ? ` (${ruleDetails})` : ''}`,
      `Current mode: ${contextMode}`,
    ].filter((p): p is string => p !== null).join('. ');
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    setInput('');

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const loadingMsg: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '...',
      timestamp: new Date().toISOString(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setIsLoading(true);

    const contextString = buildContextString();
    // Backend expects Gemini's 'user' | 'model' roles, not this screen's
    // local 'user' | 'assistant' ChatMessage convention — sending
    // 'assistant' directly (as the previous raw-fetch version did) failed
    // the backend's zod validation regardless of auth.
    const history = messages
      .filter((m) => !m.isLoading)
      .slice(-5)
      .map((m) => ({ role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model', content: m.content }));

    try {
      const result = await chatWithSafetyAssistant({
        message: trimmed,
        context: contextString,
        history,
        mode: contextMode,
      });

      let reply = result.reply;
      let suggestions = result.suggestions;

      if (result.error) {
        reply = getFallbackResponse(trimmed, contextMode, t);
        suggestions = getFallbackSuggestions(contextMode, t);
      }

      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
        suggestions,
      };

      setMessages((prev) => [...prev.filter((m) => !m.isLoading), assistantMsg]);
    } catch {
      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: getFallbackResponse(trimmed, contextMode, t),
        timestamp: new Date().toISOString(),
        suggestions: getFallbackSuggestions(contextMode, t),
      };
      setMessages((prev) => [...prev.filter((m) => !m.isLoading), assistantMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAssistant]}>
        {!isUser && (
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>🛡️</Text>
          </View>
        )}
        <View style={styles.msgBubbleWrap}>
          <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
            {item.isLoading ? (
              <ActivityIndicator size="small" color={PURPLE} />
            ) : (
              <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant]}>
                {item.content}
              </Text>
            )}
          </View>
          {!isUser && item.suggestions && item.suggestions.length > 0 && (
            <View style={styles.suggestionsRow}>
              {item.suggestions.map((s, i) => (
                <Pressable key={i} style={styles.suggestionChip} onPress={() => setInput(s)}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  const tabBarHeight = useTabBarInset();

  return (
    <SubscriptionGate requiredTier="premium" featureName="Family Safety AI">
    <View style={[styles.container, { paddingBottom: tabBarHeight }]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <View style={styles.headerIcon}>
            <Ionicons name="shield-checkmark" size={22} color={PURPLE_MID} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{t('familySafety.title')}</Text>
            <Text style={styles.headerSubtitle}>{t('familySafety.powered')}</Text>
          </View>
          <AIResetMenu actions={[
            { label: t(`${NS}.resetLabel`), description: t(`${NS}.resetDesc`), icon: 'refresh-outline', danger: true, onPress: () => { setMessages([buildStarterMessage(contextMode, t)]); setInput(''); } },
          ]} />
        </View>

        {/* Context Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {CONTEXT_TABS.map((tab) => (
            <Pressable
              key={tab.key}
              style={[styles.tab, contextMode === tab.key && styles.tabActive]}
              onPress={() => switchTab(tab.key)}
            >
              <Text style={[styles.tabText, contextMode === tab.key && styles.tabTextActive]}>
                {t(`${NS}.${tab.labelKey}`)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Quick prompts */}
        {messages.length <= 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.quickPromptsScroll}
            contentContainerStyle={styles.quickPromptsRow}
          >
            {QUICK_PROMPT_KEYS.map((k) => {
              const p = t(`${NS}.${k}`);
              return (
                <Pressable key={k} style={styles.quickChip} onPress={() => sendMessage(p)}>
                  <Text style={styles.quickChipText} numberOfLines={1}>{p}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={scrollToEnd}
          showsVerticalScrollIndicator={false}
        />

        <ChatInputBar
          value={input}
          onChangeText={setInput}
          onSend={() => sendMessage(input)}
          onMicPressIn={voice.start}
          onMicPressOut={voice.stop}
          onMicCancel={voice.cancel}
          isListening={voice.isListening}
          partialTranscript={voice.partial}
          placeholder={t(`${NS}.placeholder`)}
          disabled={isLoading}
          bottomPadding={8}
          accentColor="#8E44AD"
        />
      </KeyboardAvoidingView>
    </View>
    </SubscriptionGate>
  );
}

function getFallbackResponse(input: string, mode: ContextMode, t: TFunction): string {
  const lower = input.toLowerCase();
  if (lower.includes('location') || lower.includes('where')) {
    return t(`${NS}.fallbackLocation`);
  }
  if (lower.includes('screen time') || lower.includes('screen')) {
    return t(`${NS}.fallbackScreenTime`);
  }
  if (lower.includes('alert') || lower.includes('sos')) {
    return t(`${NS}.fallbackAlerts`);
  }
  if (lower.includes('bedtime') || lower.includes('rules')) {
    return t(`${NS}.fallbackBedtime`);
  }
  const modeDefaultKeys: Record<ContextMode, string> = {
    general: 'fallbackDefaultGeneral',
    location: 'fallbackDefaultLocation',
    screentime: 'fallbackDefaultScreenTime',
    alerts: 'fallbackDefaultAlerts',
  };
  return t(`${NS}.${modeDefaultKeys[mode]}`);
}

function getFallbackSuggestions(mode: ContextMode, t: TFunction): string[] {
  const map: Record<ContextMode, string[]> = {
    general: [t(`${NS}.fallbackSuggestionGeneral1`), t(`${NS}.fallbackSuggestionGeneral2`), t(`${NS}.fallbackSuggestionGeneral3`)],
    location: [t(`${NS}.fallbackSuggestionLocation1`), t(`${NS}.fallbackSuggestionLocation2`), t(`${NS}.fallbackSuggestionLocation3`)],
    screentime: [t(`${NS}.fallbackSuggestionScreenTime1`), t(`${NS}.fallbackSuggestionScreenTime2`), t(`${NS}.fallbackSuggestionScreenTime3`)],
    alerts: [t(`${NS}.fallbackSuggestionAlerts1`), t(`${NS}.fallbackSuggestionAlerts2`), t(`${NS}.fallbackSuggestionAlerts3`)],
  };
  return map[mode];
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F7F8FA' },

  header: {
    backgroundColor: '#5B2C8D',
    paddingHorizontal: 16,
    paddingBottom: 8,
    ...shadows.md,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  backBtn: { padding: 4 },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  headerSubtitle: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 1 },
  clearBtn: { padding: 6 },

  tabsRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  tabActive: { backgroundColor: '#fff' },
  tabText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: PURPLE, fontWeight: '700' },

  quickPromptsScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  quickPromptsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  quickChip: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: PURPLE_MID,
    ...shadows.sm,
    flexShrink: 1,
  },
  quickChipText: { color: PURPLE, fontSize: 12, fontWeight: '500' },

  messagesList: { padding: 16, gap: 12, flexGrow: 1 },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAssistant: { justifyContent: 'flex-start' },

  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PURPLE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 16 },

  msgBubbleWrap: { maxWidth: '78%' },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 38,
    justifyContent: 'center',
  },
  bubbleUser: {
    backgroundColor: PURPLE,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E8E0F0',
    borderBottomLeftRadius: 4,
    ...shadows.sm,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: '#fff' },
  bubbleTextAssistant: { color: colors.text ?? '#1A1A2E' },

  suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  suggestionChip: {
    backgroundColor: PURPLE_LIGHT,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: PURPLE_MID,
  },
  suggestionText: { color: PURPLE, fontSize: 12, fontWeight: '500' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#EDE7F6',
    ...shadows.sm,
  },
  input: {
    flex: 1,
    backgroundColor: '#F3E8FA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    color: colors.text ?? '#1A1A2E',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#DDD0EE',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  sendBtnDisabled: { backgroundColor: PURPLE_MID },
});
