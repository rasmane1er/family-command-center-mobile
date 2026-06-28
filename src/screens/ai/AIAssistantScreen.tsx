import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { useAIStore } from '../../store/useAIStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useOperationsStore } from '../../store/useOperationsStore';

const QUICK_SUGGESTIONS = [
  { label: 'Budget check', prompt: 'How are we doing with our budget this month?', icon: 'wallet-outline' },
  { label: 'Meal ideas', prompt: 'What meals can I make with chicken breast tonight?', icon: 'restaurant-outline' },
  { label: 'Task summary', prompt: 'What tasks need attention this week?', icon: 'checkbox-outline' },
  { label: 'Savings tips', prompt: 'Give me tips to save more money this month', icon: 'trending-up-outline' },
  { label: 'Vehicle check', prompt: 'Do any vehicles need service soon?', icon: 'car-outline' },
  { label: 'Family goals', prompt: "How are we progressing on our family goals?", icon: 'flag-outline' },
];

const AI_FEATURES = [
  { label: 'Memory', icon: 'albums', color: '#6A1B9A', screen: 'AIMemory' },
  { label: 'Coach', icon: 'school', color: '#1A6B3C', screen: 'ParentingCoach' },
  { label: 'Negotiate', icon: 'briefcase', color: '#0F2952', screen: 'Negotiator' },
  { label: 'Digital Twin', icon: 'git-network', color: '#2D2D8F', screen: 'DigitalTwin' },
  { label: 'Family Safety', icon: 'shield-checkmark', color: '#8E44AD', screen: 'FamilySafetyAssistant' },
];

export function AIAssistantScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const { messages, insights, isTyping, sendMessage, clearMessages } = useAIStore();
  const family = useFamilyStore((s) => s.family);
  const members = useFamilyStore((s) => s.members);
  const { accounts } = useFinanceStore();
  const { pantryItems, vehicles } = useOperationsStore();

  const netWorth = accounts.reduce((sum, a) => sum + a.balance, 0);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, isTyping]);

  const handleSend = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');
    await sendMessage(msg, '');
  };

  const unreadInsights = insights.filter((i) => !i.isRead);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#0F2952', '#1a3a70']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <View style={styles.aiAvatar}>
            <Ionicons name="sparkles" size={22} color={colors.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>AI Chief of Staff</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Online • Powered by Claude</Text>
            </View>
          </View>
          <Pressable onPress={clearMessages} style={styles.clearBtn}>
            <Ionicons name="refresh-outline" size={20} color="rgba(255,255,255,0.6)" />
          </Pressable>
        </View>

        <View style={styles.contextRow}>
          <View style={styles.contextChip}>
            <Ionicons name="people-outline" size={12} color="rgba(255,255,255,0.7)" />
            <Text style={styles.contextChipText}>{members.length} members</Text>
          </View>
          <View style={styles.contextChip}>
            <Ionicons name="wallet-outline" size={12} color="rgba(255,255,255,0.7)" />
            <Text style={styles.contextChipText}>${(netWorth / 1000).toFixed(0)}k net worth</Text>
          </View>
          <View style={styles.contextChip}>
            <Ionicons name="nutrition-outline" size={12} color="rgba(255,255,255,0.7)" />
            <Text style={styles.contextChipText}>{pantryItems.length} pantry items</Text>
          </View>
        </View>

        {/* AI Feature shortcuts */}
        <View style={styles.featuresRow}>
          {AI_FEATURES.map((f) => (
            <Pressable key={f.screen} onPress={() => navigation.navigate(f.screen)} style={[styles.featureBtn, { backgroundColor: f.color + '30', borderColor: f.color + '60' }]}>
              <Ionicons name={f.icon as any} size={14} color={f.color === '#0F2952' ? '#7FAAFF' : f.color === '#2D2D8F' ? '#8888FF' : '#fff'} />
              <Text style={styles.featureBtnText}>{f.label}</Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      {unreadInsights.length > 0 && (
        <View style={styles.insightsBar}>
          <Ionicons name="bulb-outline" size={16} color={colors.secondary} />
          <Text style={styles.insightsText} numberOfLines={1}>
            {unreadInsights[0].title}: {unreadInsights[0].summary}
          </Text>
          <Text style={styles.insightsCount}>{unreadInsights.length}</Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.bottom + 60}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.messages, { paddingBottom: 16 }]}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && (
            <View style={styles.emptyChat}>
              <View style={styles.emptyChatIcon}>
                <Ionicons name="sparkles" size={40} color={colors.primary} />
              </View>
              <Text style={styles.emptyChatTitle}>Hi{family?.name ? `, ${family.name} family` : ''}!</Text>
              <Text style={styles.emptyChatSubtitle}>
                I'm your AI Household Chief of Staff. I have full context of your family's finances, tasks, pantry, vehicles, and goals. Ask me anything!
              </Text>
            </View>
          )}

          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[styles.messageBubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}
            >
              {msg.role === 'assistant' && (
                <View style={styles.aiAvatarSmall}>
                  <Ionicons name="sparkles" size={14} color={colors.secondary} />
                </View>
              )}
              <View style={[styles.bubbleContent, msg.role === 'user' ? styles.userBubbleContent : styles.aiBubbleContent]}>
                <Text style={[styles.bubbleText, msg.role === 'user' ? styles.userBubbleText : styles.aiBubbleText]}>
                  {msg.content}
                </Text>
                <Text style={[styles.bubbleTime, msg.role === 'user' ? styles.userBubbleTime : styles.aiBubbleTime]}>
                  {format(new Date(msg.timestamp), 'h:mm a')}
                </Text>
              </View>
            </View>
          ))}

          {isTyping && (
            <View style={[styles.messageBubble, styles.aiBubble]}>
              <View style={styles.aiAvatarSmall}>
                <Ionicons name="sparkles" size={14} color={colors.secondary} />
              </View>
              <View style={styles.typingBubble}>
                <View style={styles.typingDots}>
                  <View style={[styles.dot, styles.dot1]} />
                  <View style={[styles.dot, styles.dot2]} />
                  <View style={[styles.dot, styles.dot3]} />
                </View>
              </View>
            </View>
          )}

          {messages.length === 0 && (
            <View style={styles.suggestions}>
              <Text style={styles.suggestionsTitle}>Quick questions</Text>
              <View style={styles.suggestionsGrid}>
                {QUICK_SUGGESTIONS.map((s) => (
                  <Pressable key={s.label} onPress={() => handleSend(s.prompt)} style={styles.suggestionChip}>
                    <Ionicons name={s.icon as any} size={16} color={colors.primary} />
                    <Text style={styles.suggestionText}>{s.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {messages.length > 0 && !isTyping && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickSuggestions} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {QUICK_SUGGESTIONS.slice(0, 4).map((s) => (
              <Pressable key={s.label} onPress={() => handleSend(s.prompt)} style={styles.quickChip}>
                <Text style={styles.quickChipText}>{s.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TextInput
            style={styles.input}
            placeholder="Ask about your family, finances, tasks..."
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => handleSend()}
          />
          <Pressable
            onPress={() => handleSend()}
            style={[styles.sendBtn, (!input.trim() || isTyping) && styles.sendBtnDisabled]}
            disabled={!input.trim() || isTyping}
          >
            {isTyping ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
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
  emptyChatTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 10 },
  emptyChatSubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 16 },
  messageBubble: { flexDirection: 'row', marginBottom: 12 },
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
  suggestions: { marginTop: 24 },
  suggestionsTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  suggestionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  suggestionChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, width: '47%' },
  suggestionText: { fontSize: 13, fontWeight: '600', color: colors.text, flex: 1 },
  quickSuggestions: { maxHeight: 44, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  quickChip: { backgroundColor: '#E8EEF9', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  quickChipText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  input: { flex: 1, backgroundColor: colors.card, borderRadius: 22, paddingVertical: 10, paddingHorizontal: 16, fontSize: 14, color: colors.text, maxHeight: 100, borderWidth: 1, borderColor: colors.border },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: colors.textMuted },
});
