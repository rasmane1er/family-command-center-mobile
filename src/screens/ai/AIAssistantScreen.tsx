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
import { useAuthStore } from '../../store/useAuthStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useOperationsStore } from '../../store/useOperationsStore';
import { useGuardianStore } from '../../store/useGuardianStore';
import { useMemoryStore } from '../../store/useMemoryStore';
import { useSubscription } from '../../hooks/useSubscription';
import { UpgradePrompt } from '../../components/common/UpgradePrompt';
import { useFamilyContextString } from '../../utils/buildFamilyContext';
import { useTabBarDockOffset } from '../../hooks/useTabBarInset';
import { useTotalNetWorth } from '../../hooks/useTotalNetWorth';

const SUGGESTION_TONES = ['#8B5CF6', '#14B8A6', '#F59E0B', '#3B82F6'];

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

export function AIAssistantScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useTranslation('ai');
  const tabBarDockOffset = useTabBarDockOffset();
  const [input, setInput] = useState('');
  const voice = useVoiceInput({ onResult: (text) => handleSend(text) });
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [confirmedActions, setConfirmedActions] = useState<Set<string>>(new Set());
  const scrollRef = useRef<ScrollView>(null);
  const { messages, insights, isTyping, sendMessage, clearMessages } = useAIStore();
  const { features } = useSubscription();
  const aiQueryCount = useAIStore((s) => s.messages?.filter((m) => m.role === 'user').length ?? 0);
  const serverQuotaExceeded = useAIStore((s) => s.quotaExceeded);
  const dismissQuotaExceeded = useAIStore((s) => s.dismissQuotaExceeded);
  const members = useFamilyStore((s) => s.members);
  const { bills } = useFinanceStore();
  const { pantryItems, vehicles } = useOperationsStore();
  const sosAlerts = useGuardianStore((s) => s.sosAlerts);
  const addTask = useFamilyStore((s) => s.addTask);
  const addBill = useFinanceStore((s) => s.addBill);
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const addMemory = useMemoryStore((s) => s.addMemory);

  const familyContext = useFamilyContextString();
  // Same unified figure FinanceDashboardScreen shows (accounts + wealth
  // entries + physical assets − debts) — this chip navigates straight
  // there, so a locally-computed accounts-only subtotal would show a
  // different number the moment you land on that screen.
  const netWorth = useTotalNetWorth();

  // initial: false tells the target tab's stack "don't treat this as your
  // root route" — without it, jumping straight to a non-root screen (like
  // Pantry) in a tab that's never been opened this session replaces that
  // tab's whole stack with just that screen, leaving no dashboard
  // underneath and permanently stuck there (even the "reset tab to root on
  // tap" logic in CustomTabBar.tsx can't recover from it, since as far as
  // that stack is concerned, Pantry already IS the root).
  const goToMembers = () => navigation.navigate('Family', { screen: 'FamilyProfiles', initial: false });
  const goToNetWorth = () => navigation.navigate('Finance', { screen: 'FinanceDashboard', initial: false });
  const goToPantry = () => navigation.navigate('Operations', { screen: 'Pantry', initial: false });

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
          familyId: useAuthStore.getState().familyId ?? '',
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
          familyId: useAuthStore.getState().familyId ?? '',
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
          familyId: useAuthStore.getState().familyId ?? '',
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
          familyId: useAuthStore.getState().familyId ?? '',
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

  const aiToday = format(new Date(), 'EEEE, MMM d');
  const aiHour = new Date().getHours();
  const aiGreeting = aiHour < 12 ? 'Good morning' : aiHour < 17 ? 'Good afternoon' : 'Good evening';

  const screenHeader = (
    <LinearGradient
      colors={['#06091A', '#0C1333', '#101A44', '#0F2952']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[dynStyles.header, { paddingTop: insets.top + 10 }]}
    >
      {/* Decorative orbs */}
      <View style={dynStyles.orbPurple} pointerEvents="none" />
      <View style={dynStyles.orbBlue} pointerEvents="none" />

      {/* Top row: avatar + title + actions */}
      <View style={dynStyles.headerRow}>
        <View style={dynStyles.aiAvatarWrap}>
          <View style={dynStyles.aiAvatarRing} />
          <View style={dynStyles.aiAvatar}>
            <Ionicons name="sparkles" size={22} color={colors.secondary} />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={dynStyles.headerGreeting}>{aiGreeting}</Text>
          <Text style={dynStyles.headerTitle}>{t('ai.title')}</Text>
          <View style={dynStyles.statusRow}>
            <View style={dynStyles.statusDot} />
            <Text style={dynStyles.statusText}>Online · Powered by Gemini</Text>
            <View style={dynStyles.datePill}>
              <Ionicons name="calendar-outline" size={9} color="rgba(255,255,255,0.55)" />
              <Text style={dynStyles.datePillText}>{aiToday}</Text>
            </View>
          </View>
        </View>
        <Pressable accessibilityRole="button" onPress={clearMessages} style={({ pressed }) => [dynStyles.clearBtn, pressed && dynStyles.clearBtnPressed]}>
          <Ionicons name="refresh-outline" size={18} color="rgba(255,255,255,0.75)" />
        </Pressable>
      </View>

      {/* Divider */}
      <View style={dynStyles.headerDivider} />

      {/* Context chips */}
      <View style={dynStyles.contextRow}>
        <Pressable accessibilityRole="button" onPress={goToMembers} style={({ pressed }) => [dynStyles.contextChip, pressed && dynStyles.contextChipPressed]}>
          <Ionicons name="people-outline" size={11} color="rgba(255,255,255,0.7)" />
          <Text style={dynStyles.contextChipText}>{members.length} members</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={goToNetWorth} style={({ pressed }) => [dynStyles.contextChip, pressed && dynStyles.contextChipPressed]}>
          <Ionicons name="wallet-outline" size={11} color="rgba(255,255,255,0.7)" />
          <Text style={dynStyles.contextChipText}>${(netWorth / 1000).toFixed(0)}k net worth</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={goToPantry} style={({ pressed }) => [dynStyles.contextChip, pressed && dynStyles.contextChipPressed]}>
          <Ionicons name="nutrition-outline" size={11} color="rgba(255,255,255,0.7)" />
          <Text style={dynStyles.contextChipText}>{pantryItems.length} pantry</Text>
        </Pressable>
      </View>

      {/* Feature shortcuts */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={dynStyles.featuresRow}
        contentContainerStyle={dynStyles.featuresRowContent}
      >
        {AI_FEATURES.map((f) => (
          <Pressable accessibilityRole="button"
            key={f.screen}
            onPress={() => navigation.navigate(f.screen)}
            style={({ pressed }) => [dynStyles.featureBtn, pressed && dynStyles.featureBtnPressed]}
          >
            <LinearGradient
              colors={[f.color + 'CC', f.color + '88']}
              style={dynStyles.featureBtnGrad}
            >
              <Ionicons name={f.icon as keyof typeof Ionicons.glyphMap} size={14} color="#fff" />
              <Text style={dynStyles.featureBtnText} numberOfLines={1}>{f.label}</Text>
            </LinearGradient>
          </Pressable>
        ))}
      </ScrollView>

      {unreadInsights.length > 0 && (
        <View style={dynStyles.insightsBar}>
          <Ionicons name="bulb-outline" size={15} color={colors.secondary} />
          <Text style={dynStyles.insightsText} numberOfLines={1}>
            {unreadInsights[0].title}: {unreadInsights[0].summary}
          </Text>
          <Text style={dynStyles.insightsCount}>{unreadInsights.length}</Text>
        </View>
      )}
    </LinearGradient>
  );

  const screenCompact = (
    <LinearGradient
      colors={['#06091A', '#0F2952']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={dynStyles.aiAvatar}>
          <Ionicons name="sparkles" size={16} color={colors.secondary} />
        </View>
        <Text style={[dynStyles.headerTitle, { fontSize: 17 }]}>{t('ai.title')}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={dynStyles.statusDot} />
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600' }}>Online</Text>
        <Pressable accessibilityRole="button" onPress={clearMessages} style={dynStyles.clearBtn}>
          <Ionicons name="refresh-outline" size={16} color="rgba(255,255,255,0.7)" />
        </Pressable>
      </View>
    </LinearGradient>
  );

  return (
    <View style={[dynStyles.container, { paddingBottom: tabBarDockOffset }]}>
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
              <LinearGradient colors={['#EDE9FE', '#DBEAFE']} style={dynStyles.emptyChatIcon}>
                <Ionicons name="sparkles" size={44} color="#7C3AED" />
              </LinearGradient>
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
                  <Pressable accessibilityRole="button"
                    style={dynStyles.actionConfirmBtn}
                    onPress={() => executeAction(msg.id, msg.pendingAction!)}
                  >
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </Pressable>
                  <Pressable accessibilityRole="button"
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
                {quickChips.map((s, idx) => (
                  <Pressable accessibilityRole="button" key={s.label} onPress={() => handleSend(s.prompt)} style={dynStyles.suggestionChip}>
                    <View style={[dynStyles.suggestionIcon, { backgroundColor: SUGGESTION_TONES[idx % SUGGESTION_TONES.length] + '1F' }]}>
                      <Ionicons name={s.icon as keyof typeof Ionicons.glyphMap} size={18} color={SUGGESTION_TONES[idx % SUGGESTION_TONES.length]} />
                    </View>
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
              <Pressable accessibilityRole="button" key={s.label} onPress={() => handleSend(s.prompt)} style={dynStyles.quickChip}>
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
        visible={showUpgradePrompt || serverQuotaExceeded}
        onClose={() => {
          setShowUpgradePrompt(false);
          dismissQuotaExceeded();
        }}
        featureName="Unlimited AI Queries"
        requiredTier="premium"
        description="You've used your monthly AI queries. Upgrade to Premium for 100 queries/month or Family Pro for unlimited access."
      />
    </View>
  );
}

function makeStyles(colors: import('../../theme/ThemeContext').ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 18, paddingBottom: 12, overflow: 'hidden' },
    orbPurple: { position: 'absolute', top: -70, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(139,92,246,0.22)' },
    orbBlue: { position: 'absolute', bottom: 0, left: -50, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(56,130,255,0.14)' },
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
    aiAvatarWrap: { position: 'relative', width: 52, height: 52 },
    aiAvatarRing: { position: 'absolute', inset: -3, borderRadius: 29, borderWidth: 1.5, borderColor: colors.secondary + '60', borderStyle: 'dashed' },
    aiAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.secondary, margin: 3 },
    headerGreeting: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.72)', letterSpacing: 0.3, marginBottom: 2 },
    headerTitle: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.8, lineHeight: 34 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap' },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2ECC71' },
    statusText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
    datePill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 7, paddingVertical: 2 },
    datePillText: { fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: '600', letterSpacing: 0.2 },
    headerDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 12 },
    clearBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
    clearBtnPressed: { backgroundColor: 'rgba(255,255,255,0.18)' },
    contextRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
    contextChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
    contextChipPressed: { backgroundColor: 'rgba(255,255,255,0.18)' },
    contextChipText: { fontSize: 11.5, color: 'rgba(255,255,255,0.88)', fontWeight: '700' },
    featuresRow: { flexGrow: 0 },
    featuresRowContent: { flexDirection: 'row', gap: 9, paddingRight: 4 },
    featureBtn: { borderRadius: 18, overflow: 'hidden' },
    featureBtnPressed: { opacity: 0.75 },
    featureBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, paddingHorizontal: 15, borderRadius: 18 },
    featureBtnText: { fontSize: 12.5, fontWeight: '800', color: '#fff', letterSpacing: 0.1 },
    insightsBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,193,7,0.14)', marginTop: 14, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,193,7,0.28)' },
    insightsText: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.92)', fontWeight: '600' },
    insightsCount: { fontSize: 10, color: '#fff', backgroundColor: colors.secondary, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, fontWeight: '800' },
    messages: { padding: 16 },
    emptyChat: { alignItems: 'center', paddingVertical: 28 },
    emptyChatIcon: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 18, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 6 },
    emptyChatTitle: { fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 10, letterSpacing: -0.5 },
    emptyChatSubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
    messageBubble: { flexDirection: 'row', marginBottom: 8 },
    userBubble: { justifyContent: 'flex-end' },
    aiBubble: { justifyContent: 'flex-start', alignItems: 'flex-end', gap: 8 },
    aiAvatarSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
    bubbleContent: { maxWidth: '80%', borderRadius: 22, paddingVertical: 12, paddingHorizontal: 15 },
    userBubbleContent: { backgroundColor: colors.primary, borderBottomRightRadius: 6, shadowColor: '#0F2952', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 3 },
    aiBubbleContent: { backgroundColor: colors.card, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: colors.border, shadowColor: '#0F2952', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
    bubbleText: { fontSize: 15, lineHeight: 22 },
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
    actionBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#5B21B6', borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 12, marginLeft: 40 },
    actionBannerText: { flex: 1, fontSize: 13, color: '#fff', fontWeight: '700' },
    actionConfirmBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#27AE60', alignItems: 'center', justifyContent: 'center' },
    actionCancelBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
    actionDoneBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginLeft: 38 },
    actionDoneText: { fontSize: 12, color: '#27AE60', fontWeight: '600' },
    suggestions: { marginTop: 22 },
    suggestionsTitle: { fontSize: 12, fontWeight: '800', color: colors.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
    suggestionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    suggestionChip: { alignItems: 'flex-start', gap: 12, backgroundColor: colors.card, borderRadius: 22, padding: 14, borderWidth: 1, borderColor: colors.border, width: '47.5%', minHeight: 100, shadowColor: '#0F2952', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
    suggestionIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    suggestionText: { fontSize: 14, fontWeight: '800', color: colors.text },
    quickSuggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
    quickChip: { backgroundColor: '#EDE9FE', borderRadius: 20, paddingVertical: 9, paddingHorizontal: 15 },
    quickChipText: { fontSize: 12.5, fontWeight: '800', color: '#5B21B6' },
    inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
    input: { flex: 1, backgroundColor: colors.card, borderRadius: 22, paddingVertical: 10, paddingHorizontal: 16, fontSize: 14, color: colors.text, maxHeight: 100, borderWidth: 1, borderColor: colors.border },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    sendBtnDisabled: { backgroundColor: colors.textMuted },
  });
}
