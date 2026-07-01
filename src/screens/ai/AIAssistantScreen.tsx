import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { format } from 'date-fns';
import { ChatInputBar } from '../../components/ai/ChatInputBar';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { useTheme } from '../../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/common/Card';
import { useAIStore } from '../../store/useAIStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useOperationsStore } from '../../store/useOperationsStore';
import { useGuardianStore } from '../../store/useGuardianStore';
import { useMemoryStore } from '../../store/useMemoryStore';
import { useSubscription } from '../../hooks/useSubscription';
import { UpgradePrompt } from '../../components/common/UpgradePrompt';
import { useFamilyContextString } from '../../utils/buildFamilyContext';

const AI_FEATURES = [
  { label: 'Memory', icon: 'albums', color: '#6A1B9A', screen: 'AIMemory' },
  { label: 'Coach', icon: 'school', color: '#1A6B3C', screen: 'ParentingCoach' },
  { label: 'Negotiate', icon: 'briefcase', color: '#0F2952', screen: 'Negotiator' },
  { label: 'Digital Twin', icon: 'git-network', color: '#2D2D8F', screen: 'DigitalTwin' },
  { label: 'Family Safety', icon: 'shield-checkmark', color: '#8E44AD', screen: 'FamilySafetyAssistant' },
];

function getActionDescription(action: { type: string; payload: Record<string, unknown> }): string {
  switch (action.type) {
    case 'add_task': {
      const title = typeof action.payload.title === 'string' ? action.payload.title : 'task';
      return `add task "${title}"`;
    }
    case 'add_bill': {
      const name = typeof action.payload.name === 'string' ? action.payload.name : 'bill';
      const amount = typeof action.payload.amount === 'number' ? ` ($${action.payload.amount})` : '';
      return `add bill "${name}"${amount}`;
    }
    case 'add_expense': {
      const desc = typeof action.payload.description === 'string' ? action.payload.description : 'expense';
      const amount = typeof action.payload.amount === 'number' ? ` ($${action.payload.amount})` : '';
      return `add expense "${desc}"${amount}`;
    }
    case 'add_memory': {
      const title = typeof action.payload.title === 'string' ? action.payload.title : 'memory';
      return `save memory "${title}"`;
    }
    default:
      return 'perform this action';
  }
}

export function AIAssistantScreen({ navigation }: { navigation: { navigate: (screen: string) => void } }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const tabBarHeight = Math.max(insets.bottom, 34) + 72;
  const [input, setInput] = useState('');
  const voice = useVoiceInput({ onResult: (text) => handleSend(text) });
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [confirmedActions, setConfirmedActions] = useState<Set<string>>(new Set());
  const scrollRef = useRef<ScrollView>(null);
  const { messages, insights, isTyping, sendMessage, clearMessages } = useAIStore();
  const { features } = useSubscription();
  const aiQueryCount = useAIStore((s) => s.messages?.filter((m) => m.role === 'user').length ?? 0);
  const members = useFamilyStore((s) => s.members);
  const { accounts, bills } = useFinanceStore();
  const { pantryItems, vehicles } = useOperationsStore();
  const sosAlerts = useGuardianStore((s) => s.sosAlerts);
  const addTask = useFamilyStore((s) => s.addTask);
  const addBill = useFinanceStore((s) => s.addBill);
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const addMemory = useMemoryStore((s) => s.addMemory);

  const familyContext = useFamilyContextString();
  const netWorth = accounts.reduce((sum, a) => sum + a.balance, 0);

  // Dynamic suggestion chips based on context
  const today = new Date();
  const chips: Array<{ label: string; prompt: string; icon: string }> = [];

  const overdueBills = bills.filter((b) => b.status !== 'paid' && new Date(b.dueDate) < today);
  if (overdueBills.length > 0) {
    chips.push({ label: 'Bills overdue', prompt: 'What bills are overdue and need attention?', icon: 'warning-outline' });
  }
  const in14Days = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  const billsDue = bills.filter((b) => b.status !== 'paid' && new Date(b.dueDate) >= today && new Date(b.dueDate) <= in14Days);
  if (billsDue.length > 0 && chips.length < 2) {
    chips.push({ label: 'Bills due soon', prompt: 'What bills are due soon?', icon: 'calendar-outline' });
  }
  const lowPantry = pantryItems.filter((p) => p.minQuantity !== undefined && p.quantity <= p.minQuantity);
  if (lowPantry.length > 0 && chips.length < 3) {
    chips.push({ label: 'Shopping list', prompt: 'What should I buy? My pantry is running low.', icon: 'cart-outline' });
  }
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const vehiclesDue = vehicles.filter((v) => v.nextService && new Date(v.nextService) <= in30Days);
  if (vehiclesDue.length > 0 && chips.length < 3) {
    chips.push({ label: 'Vehicle service', prompt: 'When should I service my car?', icon: 'car-outline' });
  }
  const unresolvedSOS = sosAlerts.filter((a) => !a.isResolved).length;
  if (unresolvedSOS > 0 && chips.length < 3) {
    chips.push({ label: 'Safety alerts', prompt: 'What safety alerts need my attention?', icon: 'shield-outline' });
  }
  chips.push({ label: 'Plan this week', prompt: 'Help me plan this week for my family.', icon: 'calendar-outline' });
  if (chips.length < 4) {
    chips.push({ label: 'Family summary', prompt: 'Give me a complete family status summary.', icon: 'people-outline' });
  }
  const quickChips = chips.slice(0, 4);

  useEffect(() => {
    // scroll handled by onContentSizeChange to fire after layout
  }, [messages, isTyping]);

  const handleSend = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;
    if (!features.unlimitedAI && aiQueryCount >= features.aiQueriesPerMonth) {
      setShowUpgradePrompt(true);
      return;
    }
    setInput('');
    await sendMessage(msg, familyContext);
  };

  const executeAction = (
    msgId: string,
    action: { type: string; payload: Record<string, unknown> },
  ) => {
    try {
      if (action.type === 'add_task') {
        const p = action.payload;
        addTask({
          id: Math.random().toString(36).substring(2),
          familyId: 'demo-family',
          title: typeof p.title === 'string' ? p.title : 'New Task',
          dueDate: typeof p.dueDate === 'string' ? p.dueDate : new Date().toISOString(),
          priority: (p.priority as 'high' | 'medium' | 'low') ?? 'medium',
          status: 'pending',
          category: typeof p.category === 'string' ? p.category : 'General',
          recurrence: 'none',
          points: 20,
          assignedTo: [],
          createdAt: new Date().toISOString(),
          createdBy: 'ai-assistant',
        });
      } else if (action.type === 'add_bill') {
        const p = action.payload;
        addBill({
          id: Math.random().toString(36).substring(2),
          familyId: 'demo-family',
          name: typeof p.name === 'string' ? p.name : 'New Bill',
          amount: typeof p.amount === 'number' ? p.amount : 0,
          dueDate: typeof p.dueDate === 'string' ? p.dueDate : new Date().toISOString(),
          category: typeof p.category === 'string' ? p.category : 'Other',
          status: 'upcoming',
          isAutoPay: false,
          isRecurring: false,
          recurrence: 'monthly',
          icon: 'receipt',
        });
      } else if (action.type === 'add_expense') {
        const p = action.payload;
        addTransaction({
          id: Math.random().toString(36).substring(2),
          familyId: 'demo-family',
          amount: typeof p.amount === 'number' ? p.amount : 0,
          type: 'expense',
          category: typeof p.category === 'string' ? p.category : 'Other',
          description: typeof p.description === 'string' ? p.description : 'Expense',
          date: typeof p.date === 'string' ? p.date : new Date().toISOString(),
          isRecurring: false,
          createdAt: new Date().toISOString(),
        });
      } else if (action.type === 'add_memory') {
        const p = action.payload;
        addMemory({
          familyId: 'demo-family',
          type: (p.type as 'milestone' | 'preference' | 'habit' | 'insight' | 'conflict' | 'health') ?? 'milestone',
          title: typeof p.title === 'string' ? p.title : 'Memory',
          content: typeof p.content === 'string' ? p.content : '',
          tags: [],
          isPinned: false,
          sentiment: 'positive',
        });
      }
      setConfirmedActions((prev) => new Set(prev).add(msgId));
      Alert.alert('Done!', `Successfully added: ${getActionDescription(action)}`);
    } catch {
      Alert.alert('Error', 'Could not complete the action. Please try manually.');
    }
  };

  const unreadInsights = insights.filter((i) => !i.isRead);
  const dynStyles = makeStyles(colors);

  const screenHeader = (
    <LinearGradient colors={['#0F2952', '#1a3a70']} style={[dynStyles.header, { paddingTop: insets.top + 6 }]}>
      <View style={dynStyles.headerRow}>
        <View style={dynStyles.aiAvatar}>
          <Ionicons name="sparkles" size={22} color={colors.secondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={dynStyles.headerTitle}>{t('ai.title')}</Text>
          <View style={dynStyles.statusRow}>
            <View style={dynStyles.statusDot} />
            <Text style={dynStyles.statusText}>Online • Powered by Gemini</Text>
          </View>
        </View>
        <Pressable onPress={clearMessages} style={dynStyles.clearBtn}>
          <Ionicons name="refresh-outline" size={20} color="rgba(255,255,255,0.6)" />
        </Pressable>
      </View>

      <View style={dynStyles.contextRow}>
        <View style={dynStyles.contextChip}>
          <Ionicons name="people-outline" size={12} color="rgba(255,255,255,0.7)" />
          <Text style={dynStyles.contextChipText}>{members.length} members</Text>
        </View>
        <View style={dynStyles.contextChip}>
          <Ionicons name="wallet-outline" size={12} color="rgba(255,255,255,0.7)" />
          <Text style={dynStyles.contextChipText}>${(netWorth / 1000).toFixed(0)}k net worth</Text>
        </View>
        <View style={dynStyles.contextChip}>
          <Ionicons name="nutrition-outline" size={12} color="rgba(255,255,255,0.7)" />
          <Text style={dynStyles.contextChipText}>{pantryItems.length} pantry items</Text>
        </View>
      </View>

      <View style={dynStyles.featuresRow}>
        {AI_FEATURES.map((f) => (
          <Pressable key={f.screen} onPress={() => navigation.navigate(f.screen)} style={[dynStyles.featureBtn, { backgroundColor: f.color + '30', borderColor: f.color + '60' }]}>
            <Ionicons name={f.icon as keyof typeof Ionicons.glyphMap} size={14} color={f.color === '#0F2952' ? '#7FAAFF' : f.color === '#2D2D8F' ? '#8888FF' : '#fff'} />
            <Text style={dynStyles.featureBtnText}>{f.label}</Text>
          </Pressable>
        ))}
      </View>
      {unreadInsights.length > 0 && (
        <View style={dynStyles.insightsBar}>
          <Ionicons name="bulb-outline" size={16} color={colors.secondary} />
          <Text style={dynStyles.insightsText} numberOfLines={1}>
            {unreadInsights[0].title}: {unreadInsights[0].summary}
          </Text>
          <Text style={dynStyles.insightsCount}>{unreadInsights.length}</Text>
        </View>
      )}
    </LinearGradient>
  );

  const screenCompact = (
    <View style={{ backgroundColor: '#0F2952', paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={dynStyles.aiAvatar}>
        <Ionicons name="sparkles" size={18} color={colors.secondary} />
      </View>
      <Text style={[dynStyles.headerTitle, { flex: 1, marginLeft: 10 }]}>{t('ai.title')}</Text>
      <Pressable onPress={clearMessages} style={dynStyles.clearBtn}>
        <Ionicons name="refresh-outline" size={20} color="rgba(255,255,255,0.6)" />
      </Pressable>
    </View>
  );

  return (
    <View style={[dynStyles.container, { paddingBottom: tabBarHeight }]}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
          {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          onScroll={onScroll}
          onScrollEndDrag={onScrollEndDrag}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={scrollEventThrottle}
          contentContainerStyle={[dynStyles.messages, { paddingBottom: 16, paddingTop: contentPaddingTop }]}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && (
            <View style={dynStyles.emptyChat}>
              <View style={dynStyles.emptyChatIcon}>
                <Ionicons name="sparkles" size={40} color={colors.primary} />
              </View>
              <Text style={dynStyles.emptyChatTitle}>Hi there!</Text>
              <Text style={dynStyles.emptyChatSubtitle}>
                I'm your AI Household Chief of Staff. I have full context of your family's finances, tasks, pantry, vehicles, and goals. Ask me anything!
              </Text>
            </View>
          )}

          {messages.map((msg) => (
            <View key={msg.id}>
              <View style={[dynStyles.messageBubble, msg.role === 'user' ? dynStyles.userBubble : dynStyles.aiBubble]}>
                {msg.role === 'assistant' && (
                  <View style={dynStyles.aiAvatarSmall}>
                    <Ionicons name="sparkles" size={14} color={colors.secondary} />
                  </View>
                )}
                <View style={[dynStyles.bubbleContent, msg.role === 'user' ? dynStyles.userBubbleContent : dynStyles.aiBubbleContent]}>
                  <Text style={[dynStyles.bubbleText, msg.role === 'user' ? dynStyles.userBubbleText : dynStyles.aiBubbleText]}>
                    {msg.content}
                  </Text>
                  <Text style={[dynStyles.bubbleTime, msg.role === 'user' ? dynStyles.userBubbleTime : dynStyles.aiBubbleTime]}>
                    {format(new Date(msg.timestamp), 'h:mm a')}
                  </Text>
                </View>
              </View>

              {msg.role === 'assistant' && msg.pendingAction && !confirmedActions.has(msg.id) && (
                <View style={dynStyles.actionBanner}>
                  <Ionicons name="sparkles" size={16} color="#fff" />
                  <Text style={dynStyles.actionBannerText} numberOfLines={2}>
                    I can do that — {getActionDescription(msg.pendingAction)}
                  </Text>
                  <Pressable
                    style={dynStyles.actionConfirmBtn}
                    onPress={() => executeAction(msg.id, msg.pendingAction!)}
                  >
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </Pressable>
                  <Pressable
                    style={dynStyles.actionCancelBtn}
                    onPress={() => setConfirmedActions((prev) => new Set(prev).add(msg.id))}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </Pressable>
                </View>
              )}

              {msg.role === 'assistant' && msg.pendingAction && confirmedActions.has(msg.id) && (
                <View style={dynStyles.actionDoneBanner}>
                  <Ionicons name="checkmark-circle" size={16} color="#27AE60" />
                  <Text style={dynStyles.actionDoneText}>Action completed</Text>
                </View>
              )}
            </View>
          ))}

          {isTyping && (
            <View style={[dynStyles.messageBubble, dynStyles.aiBubble]}>
              <View style={dynStyles.aiAvatarSmall}>
                <Ionicons name="sparkles" size={14} color={colors.secondary} />
              </View>
              <View style={dynStyles.typingBubble}>
                <View style={dynStyles.typingDots}>
                  <View style={[dynStyles.dot, dynStyles.dot1]} />
                  <View style={[dynStyles.dot, dynStyles.dot2]} />
                  <View style={[dynStyles.dot, dynStyles.dot3]} />
                </View>
              </View>
            </View>
          )}

          {messages.length === 0 && (
            <View style={dynStyles.suggestions}>
              <Text style={dynStyles.suggestionsTitle}>{t('ai.suggestions')}</Text>
              <View style={dynStyles.suggestionsGrid}>
                {quickChips.map((s) => (
                  <Pressable key={s.label} onPress={() => handleSend(s.prompt)} style={dynStyles.suggestionChip}>
                    <Ionicons name={s.icon as keyof typeof Ionicons.glyphMap} size={16} color={colors.primary} />
                    <Text style={dynStyles.suggestionText}>{s.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
          )}
        </CollapsibleHeader>

        {messages.length > 0 && !isTyping && (
          <View style={dynStyles.quickSuggestions}>
            {quickChips.map((s) => (
              <Pressable key={s.label} onPress={() => handleSend(s.prompt)} style={dynStyles.quickChip}>
                <Text style={dynStyles.quickChipText}>{s.label}</Text>
              </Pressable>
            ))}
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
          placeholder={t('ai.placeholder')}
          disabled={isTyping}
          bottomPadding={8}
        />
      </KeyboardAvoidingView>

      <UpgradePrompt
        visible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        featureName="Unlimited AI Queries"
        requiredTier="premium"
        description="You've used your monthly AI queries. Upgrade to Premium for 50 queries/month or Family Pro for unlimited access."
      />
    </View>
  );
}

function makeStyles(colors: import('../../theme/ThemeContext').ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 20, paddingBottom: 8 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 6 },
    aiAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.secondary },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    statusDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#2ECC71' },
    statusText: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
    clearBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    contextRow: { flexDirection: 'row', gap: 8 },
    contextChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10 },
    contextChipText: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
    featuresRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
    featureBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 10, paddingVertical: 7, borderWidth: 1 },
    featureBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
    insightsBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3E2', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    insightsText: { flex: 1, fontSize: 12, color: colors.text, fontWeight: '500' },
    insightsCount: { fontSize: 11, color: '#fff', backgroundColor: colors.secondary, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, fontWeight: '700' },
    messages: { padding: 16 },
    emptyChat: { alignItems: 'center', paddingVertical: 32 },
    emptyChatIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E8EEF9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyChatTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 10 },
    emptyChatSubtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 16 },
    messageBubble: { flexDirection: 'row', marginBottom: 4 },
    userBubble: { justifyContent: 'flex-end' },
    aiBubble: { justifyContent: 'flex-start', alignItems: 'flex-end', gap: 8 },
    aiAvatarSmall: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#E8EEF9', alignItems: 'center', justifyContent: 'center' },
    bubbleContent: { maxWidth: '78%', borderRadius: 18, padding: 12 },
    userBubbleContent: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
    aiBubbleContent: { backgroundColor: colors.card, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
    bubbleText: { fontSize: 14, lineHeight: 21 },
    userBubbleText: { color: '#fff' },
    aiBubbleText: { color: colors.text },
    bubbleTime: { fontSize: 10, marginTop: 4 },
    userBubbleTime: { color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
    aiBubbleTime: { color: colors.textMuted },
    typingBubble: { backgroundColor: colors.card, borderRadius: 18, borderBottomLeftRadius: 4, padding: 14, borderWidth: 1, borderColor: colors.border },
    typingDots: { flexDirection: 'row', gap: 5, alignItems: 'center', height: 18 },
    dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.textMuted },
    dot1: {},
    dot2: { opacity: 0.7 },
    dot3: { opacity: 0.4 },
    actionBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#3730A3', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 10, marginLeft: 38 },
    actionBannerText: { flex: 1, fontSize: 12, color: '#fff', fontWeight: '600' },
    actionConfirmBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#27AE60', alignItems: 'center', justifyContent: 'center' },
    actionCancelBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    actionDoneBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginLeft: 38 },
    actionDoneText: { fontSize: 12, color: '#27AE60', fontWeight: '600' },
    suggestions: { marginTop: 24 },
    suggestionsTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
    suggestionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    suggestionChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, width: '47%' },
    suggestionText: { fontSize: 13, fontWeight: '600', color: colors.text, flex: 1 },
    quickSuggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
    quickChip: { backgroundColor: '#E8EEF9', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
    quickChipText: { fontSize: 12, fontWeight: '600', color: colors.primary },
    inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
    input: { flex: 1, backgroundColor: colors.card, borderRadius: 22, paddingVertical: 10, paddingHorizontal: 16, fontSize: 14, color: colors.text, maxHeight: 100, borderWidth: 1, borderColor: colors.border },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    sendBtnDisabled: { backgroundColor: colors.textMuted },
  });
}
