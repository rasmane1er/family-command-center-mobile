import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { AIResetMenu } from '../../components/ai/AIResetMenu';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useTheme } from '../../theme/ThemeContext';
import { shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { useMemoryStore } from '../../store/useMemoryStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { chatWithMemoryAI, AIMessage } from '../../services/aiService';
import type { MemoryType } from '../../types';

const TYPE_CONFIG: Record<MemoryType, { icon: string; color: string; label: string }> = {
  preference: { icon: 'heart', color: '#E74C3C', label: 'Preference' },
  habit: { icon: 'repeat', color: '#2980B9', label: 'Habit' },
  milestone: { icon: 'trophy', color: '#F5A623', label: 'Milestone' },
  insight: { icon: 'bulb', color: '#8E44AD', label: 'AI Insight' },
  conflict: { icon: 'alert-circle', color: '#E67E22', label: 'Conflict' },
  health: { icon: 'heart-half', color: '#27AE60', label: 'Health' },
};

const FILTER_TABS: { key: 'all' | MemoryType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'milestone', label: 'Milestones' },
  { key: 'preference', label: 'Prefs' },
  { key: 'habit', label: 'Habits' },
  { key: 'insight', label: 'Insights' },
];

export function AIMemoryScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [filter, setFilter] = useState<'all' | MemoryType>('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<MemoryType>('milestone');
  const [newMemberId, setNewMemberId] = useState('');
  const [newSentiment, setNewSentiment] = useState<'positive' | 'negative' | 'neutral'>('positive');
  const [newTags, setNewTags] = useState('');

  const [showAIChat, setShowAIChat] = useState(false);
  const [aiInput, setAIInput] = useState('');
  const [aiHistory, setAIHistory] = useState<AIMessage[]>([]);
  const [aiLoading, setAILoading] = useState(false);
  const [aiSuggestions, setAISuggestions] = useState<string[]>([]);
  const aiScrollRef = useRef<ScrollView>(null);

  const { memories, pinMemory, addMemory, seedDemoData, clearMemories, deleteMemory } = useMemoryStore();
  const members = useFamilyStore((s) => s.members);
  const financialGoals = useFinanceStore((s) => s.financialGoals);

  if (memories.length === 0) seedDemoData();

  // Auto-generate memories from milestones
  useEffect(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    let autoAdded = 0;

    // Completed financial goals
    financialGoals.forEach((goal) => {
      if (!goal.isCompleted) return;
      const prefix = `Goal achieved: ${goal.name}`;
      const alreadyExists = memories.some((m) => m.title.startsWith(prefix));
      if (!alreadyExists) {
        addMemory({
          familyId: 'demo-family',
          type: 'milestone',
          title: prefix,
          content: `Family reached financial goal: ${goal.name} of $${goal.targetAmount}`,
          tags: ['finance', 'milestone', 'goal'],
          isPinned: false,
          sentiment: 'positive',
        });
        autoAdded++;
      }
    });

    // Birthdays today
    members.forEach((m) => {
      if (!m.dateOfBirth) return;
      const dob = new Date(m.dateOfBirth);
      if (dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate()) {
        const prefix = `${m.name}'s Birthday!`;
        const alreadyExists = memories.some(
          (mem) => mem.title === prefix && mem.createdAt.startsWith(todayStr),
        );
        if (!alreadyExists) {
          addMemory({
            familyId: 'demo-family',
            memberId: m.id,
            type: 'milestone',
            title: prefix,
            content: `Today is ${m.name}'s birthday!`,
            tags: ['birthday', 'milestone', m.name.toLowerCase()],
            isPinned: false,
            sentiment: 'positive',
          });
          autoAdded++;
        }
      }
    });

    if (autoAdded > 0) {
      Alert.alert('Auto-added memories', `${autoAdded} memory${autoAdded !== 1 ? 'ies' : ''} auto-generated from milestones.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getMemberName = (id?: string) => members.find((m) => m.id === id)?.name;

  const handleAISend = async (text?: string) => {
    const msg = text ?? aiInput.trim();
    if (!msg || aiLoading) return;
    setAIInput('');
    const newHistory: AIMessage[] = [...aiHistory, { role: 'user', content: msg }];
    setAIHistory(newHistory);
    setAILoading(true);
    setAISuggestions([]);
    setTimeout(() => aiScrollRef.current?.scrollToEnd({ animated: true }), 100);
    const memoryList = memories.slice(0, 20).map((m) => ({ title: m.title, content: m.content, tags: m.tags }));
    const result = await chatWithMemoryAI({ message: msg, history: aiHistory, memories: memoryList });
    setAIHistory([...newHistory, { role: 'model', content: result.reply }]);
    setAISuggestions(result.suggestions);
    setAILoading(false);
    setTimeout(() => aiScrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleAddMemory = () => {
    if (!newTitle.trim() || !newContent.trim()) {
      Alert.alert('Required', 'Please enter a title and content.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addMemory({
      familyId: 'demo-family',
      memberId: newMemberId || undefined,
      type: newType,
      title: newTitle.trim(),
      content: newContent.trim(),
      tags: newTags.split(',').map((t) => t.trim()).filter(Boolean),
      isPinned: false,
      sentiment: newSentiment,
    });
    setShowModal(false);
    setNewTitle('');
    setNewContent('');
    setNewType('milestone');
    setNewMemberId('');
    setNewTags('');
    setNewSentiment('positive');
  };

  const filtered = memories
    .filter((m) => filter === 'all' || m.type === filter)
    .filter((m) =>
      search === '' ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.content.toLowerCase().includes(search.toLowerCase()) ||
      m.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

  const pinned = filtered.filter((m) => m.isPinned);
  const unpinned = filtered.filter((m) => !m.isPinned);

  const dynStyles = makeStyles(colors);

  const screenHeader = (
    <LinearGradient colors={['#2D1B69', '#6A1B9A']} style={[dynStyles.header, { paddingTop: insets.top + 6 }]}>
      <View style={dynStyles.headerTop}>
        <Pressable onPress={() => navigation.goBack()} style={dynStyles.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={dynStyles.headerTitle}>AI Memory Engine</Text>
          <Text style={dynStyles.headerSub}>{memories.length} memories stored</Text>
        </View>
        <Pressable style={dynStyles.aiBtn} onPress={() => setShowAIChat(true)}>
          <Ionicons name="sparkles" size={18} color="#fff" />
        </Pressable>
        <Pressable style={dynStyles.addBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowModal(true); }}>
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
        <AIResetMenu actions={[
          { label: 'Load Demo Data', description: 'Populate with sample memories', icon: 'sparkles-outline', onPress: () => seedDemoData() },
          { label: 'Delete Pinned', description: 'Remove all pinned memories', icon: 'bookmark-outline', danger: true, onPress: () => memories.filter((m) => m.isPinned).forEach((m) => deleteMemory(m.id)) },
          { label: 'Clear All Memories', description: 'Permanently delete every memory', icon: 'trash-outline', danger: true, onPress: () => clearMemories() },
        ]} />
      </View>
      <View style={dynStyles.searchBar}>
        <Ionicons name="search" size={16} color="rgba(255,255,255,0.6)" />
        <TextInput
          style={dynStyles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search memories, tags..."
          placeholderTextColor="rgba(255,255,255,0.4)"
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={dynStyles.filterScroll}>
        {FILTER_TABS.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setFilter(tab.key)}
            style={[dynStyles.filterChip, filter === tab.key && dynStyles.filterChipActive]}
          >
            <Text style={[dynStyles.filterChipText, filter === tab.key && dynStyles.filterChipTextActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </LinearGradient>
  );

  const screenCompact = (
    <View style={{ backgroundColor: '#2D1B69', paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={() => navigation.goBack()} style={dynStyles.back}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Text style={[dynStyles.headerTitle, { flex: 1, marginLeft: 8 }]}>AI Memory Engine</Text>
      <Pressable style={dynStyles.aiBtn} onPress={() => setShowAIChat(true)}>
        <Ionicons name="sparkles" size={18} color="#fff" />
      </Pressable>
      <Pressable style={dynStyles.addBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowModal(true); }}>
        <Ionicons name="add" size={24} color="#fff" />
      </Pressable>
    </View>
  );

  return (
    <View style={dynStyles.container}>
      <StatusBar style="light" />

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
      <ScrollView
        onScroll={onScroll}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={[dynStyles.content, { paddingBottom: 100, paddingTop: contentPaddingTop }]}>
        {pinned.length > 0 && (
          <>
            <View style={dynStyles.sectionHeader}>
              <Ionicons name="pin" size={14} color={colors.secondary} />
              <Text style={dynStyles.sectionTitle}>Pinned</Text>
            </View>
            {pinned.map((mem) => {
              const cfg = TYPE_CONFIG[mem.type];
              return (
                <Card key={mem.id} style={dynStyles.memoryCard} variant="elevated">
                  <View style={dynStyles.memoryHeader}>
                    <View style={[dynStyles.typeIcon, { backgroundColor: cfg.color + '20' }]}>
                      <Ionicons name={cfg.icon as any} size={16} color={cfg.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={dynStyles.memoryTitle}>{mem.title}</Text>
                      {getMemberName(mem.memberId) && (
                        <Text style={dynStyles.memoryMember}>{getMemberName(mem.memberId)}</Text>
                      )}
                    </View>
                    <Pressable onPress={() => pinMemory(mem.id)}>
                      <Ionicons name="pin" size={18} color={colors.secondary} />
                    </Pressable>
                  </View>
                  <Text style={dynStyles.memoryContent} numberOfLines={3}>{mem.content}</Text>
                  <View style={dynStyles.memoryFooter}>
                    <View style={dynStyles.tagsRow}>
                      {mem.tags.slice(0, 3).map((tag) => (
                        <View key={tag} style={dynStyles.tag}><Text style={dynStyles.tagText}>#{tag}</Text></View>
                      ))}
                    </View>
                    <Badge
                      label={cfg.label}
                      variant={mem.sentiment === 'positive' ? 'success' : mem.sentiment === 'negative' ? 'danger' : 'neutral'}
                      size="sm"
                    />
                  </View>
                </Card>
              );
            })}
          </>
        )}

        {unpinned.length > 0 && (
          <>
            <View style={dynStyles.sectionHeader}>
              <Ionicons name="albums" size={14} color={colors.textSecondary} />
              <Text style={dynStyles.sectionTitle}>All Memories</Text>
            </View>
            {unpinned.map((mem) => {
              const cfg = TYPE_CONFIG[mem.type];
              return (
                <Card key={mem.id} style={dynStyles.memoryCard} variant="elevated">
                  <View style={dynStyles.memoryHeader}>
                    <View style={[dynStyles.typeIcon, { backgroundColor: cfg.color + '20' }]}>
                      <Ionicons name={cfg.icon as any} size={16} color={cfg.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={dynStyles.memoryTitle}>{mem.title}</Text>
                      {getMemberName(mem.memberId) && (
                        <Text style={dynStyles.memoryMember}>{getMemberName(mem.memberId)}</Text>
                      )}
                    </View>
                    <Pressable onPress={() => pinMemory(mem.id)}>
                      <Ionicons name="pin-outline" size={18} color={colors.textMuted} />
                    </Pressable>
                  </View>
                  <Text style={dynStyles.memoryContent} numberOfLines={2}>{mem.content}</Text>
                  <View style={dynStyles.memoryFooter}>
                    <View style={dynStyles.tagsRow}>
                      {mem.tags.slice(0, 2).map((tag) => (
                        <View key={tag} style={dynStyles.tag}><Text style={dynStyles.tagText}>#{tag}</Text></View>
                      ))}
                    </View>
                    <Badge label={cfg.label} variant="neutral" size="sm" />
                  </View>
                </Card>
              );
            })}
          </>
        )}

        {filtered.length === 0 && (
          <View style={dynStyles.emptyState}>
            <Ionicons name="albums-outline" size={60} color={colors.textMuted} />
            <Text style={dynStyles.emptyTitle}>No memories found</Text>
            <Text style={dynStyles.emptyDesc}>The AI Memory Engine learns from your family's conversations, habits, and milestones.</Text>
          </View>
        )}
      </ScrollView>

        )}
      </CollapsibleHeader>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={dynStyles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={dynStyles.modalHandle} />
          <Text style={dynStyles.modalTitle}>Add Memory</Text>

          <Text style={dynStyles.modalLabel}>Type</Text>
          <View style={dynStyles.typeGrid}>
            {(Object.keys(TYPE_CONFIG) as MemoryType[]).map((t) => {
              const cfg = TYPE_CONFIG[t];
              return (
                <Pressable key={t} onPress={() => setNewType(t)} style={[dynStyles.typeChip, newType === t && { backgroundColor: cfg.color, borderColor: cfg.color }]}>
                  <Ionicons name={cfg.icon as any} size={14} color={newType === t ? '#fff' : cfg.color} />
                  <Text style={[dynStyles.typeChipText, newType === t && { color: '#fff' }]}>{cfg.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={dynStyles.modalLabel}>Title</Text>
          <TextInput style={dynStyles.modalInput} value={newTitle} onChangeText={setNewTitle} placeholder="Give this memory a title..." placeholderTextColor={colors.textMuted} />

          <Text style={dynStyles.modalLabel}>Content</Text>
          <TextInput style={[dynStyles.modalInput, dynStyles.modalTextarea]} value={newContent} onChangeText={setNewContent} placeholder="What happened? What should be remembered?" placeholderTextColor={colors.textMuted} multiline numberOfLines={4} />

          <Text style={dynStyles.modalLabel}>Member (Optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <Pressable onPress={() => setNewMemberId('')} style={[dynStyles.memberChip, !newMemberId && dynStyles.memberChipActive]}>
              <Text style={[dynStyles.memberChipText, !newMemberId && dynStyles.memberChipTextActive]}>Family</Text>
            </Pressable>
            {members.map((m) => (
              <Pressable key={m.id} onPress={() => setNewMemberId(m.id)} style={[dynStyles.memberChip, newMemberId === m.id && dynStyles.memberChipActive]}>
                <View style={[dynStyles.memberDot, { backgroundColor: m.avatarColor }]} />
                <Text style={[dynStyles.memberChipText, newMemberId === m.id && dynStyles.memberChipTextActive]}>{m.name.split(' ')[0]}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={dynStyles.modalLabel}>Sentiment</Text>
          <View style={dynStyles.sentimentRow}>
            {(['positive', 'neutral', 'negative'] as const).map((s) => (
              <Pressable key={s} onPress={() => setNewSentiment(s)} style={[dynStyles.sentimentChip, newSentiment === s && dynStyles.sentimentChipActive]}>
                <Text style={[dynStyles.sentimentText, newSentiment === s && dynStyles.sentimentTextActive]}>
                  {s === 'positive' ? '😊 Positive' : s === 'neutral' ? '😐 Neutral' : '😔 Negative'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={dynStyles.modalLabel}>Tags (comma-separated)</Text>
          <TextInput style={dynStyles.modalInput} value={newTags} onChangeText={setNewTags} placeholder="family, milestone, finance..." placeholderTextColor={colors.textMuted} />

          <Button title="Save Memory" onPress={handleAddMemory} />
          <Button title="Cancel" onPress={() => setShowModal(false)} variant="ghost" style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>

      {/* AI Chat Modal */}
      <Modal visible={showAIChat} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAIChat(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={dynStyles.aiModal}>
          <View style={dynStyles.aiModalHeader}>
            <Text style={dynStyles.aiModalTitle}>✨ Ask AI about your memories</Text>
            <Pressable onPress={() => setShowAIChat(false)} style={dynStyles.aiModalClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView ref={aiScrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 20 }}>
            {aiHistory.length === 0 && (
              <View style={dynStyles.chatEmpty}>
                <Text style={dynStyles.chatEmptyDesc}>Ask the AI to search, analyze, or find patterns in your family memories</Text>
                {['What are our biggest family milestones?', 'Find memories about our vacation', 'What habits has the family built?'].map((q) => (
                  <Pressable key={q} style={dynStyles.chatStarter} onPress={() => handleAISend(q)}>
                    <Text style={dynStyles.chatStarterText}>{q}</Text>
                    <Ionicons name="arrow-forward" size={14} color="#6A1B9A" />
                  </Pressable>
                ))}
              </View>
            )}
            {aiHistory.map((m, i) => (
              <View key={i} style={[dynStyles.chatBubble, m.role === 'user' ? dynStyles.chatBubbleUser : dynStyles.chatBubbleAI]}>
                <Text style={m.role === 'user' ? dynStyles.chatBubbleUserText : dynStyles.chatBubbleAIText}>{m.content}</Text>
              </View>
            ))}
            {aiLoading && <View style={dynStyles.chatBubbleAI}><ActivityIndicator size="small" color="#6A1B9A" /></View>}
            {aiSuggestions.map((s) => (
              <Pressable key={s} style={dynStyles.chatSuggestion} onPress={() => handleAISend(s)}>
                <Text style={dynStyles.chatSuggestionText}>{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={dynStyles.chatInputRow}>
            <TextInput style={dynStyles.chatInput} value={aiInput} onChangeText={setAIInput} placeholder="Ask about your memories..." placeholderTextColor={colors.textMuted} onSubmitEditing={() => handleAISend()} returnKeyType="send" multiline />
            <Pressable style={[dynStyles.chatSendBtn, !aiInput.trim() && { opacity: 0.4 }]} onPress={() => handleAISend()} disabled={!aiInput.trim()}>
              <Ionicons name="send" size={18} color="#fff" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function makeStyles(colors: import('../../theme/ThemeContext').ThemeColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  back: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  addBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  aiBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  aiModal: { flex: 1, backgroundColor: colors.background },
  aiModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  aiModalTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  aiModalClose: { padding: 4 },
  chatEmpty: { alignItems: 'center', paddingTop: 10, paddingBottom: 8 },
  chatEmptyDesc: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  chatStarter: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F5EEF8', borderRadius: 12, padding: 14, marginBottom: 8, width: '100%' },
  chatStarterText: { flex: 1, fontSize: 14, color: '#6A1B9A', fontWeight: '500' },
  chatBubble: { borderRadius: 16, padding: 12, marginBottom: 10, maxWidth: '85%' },
  chatBubbleUser: { backgroundColor: '#6A1B9A', alignSelf: 'flex-end' },
  chatBubbleAI: { backgroundColor: colors.card, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.border },
  chatBubbleUserText: { fontSize: 14, color: '#fff', lineHeight: 20 },
  chatBubbleAIText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  chatSuggestion: { backgroundColor: '#F5EEF8', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, marginBottom: 6, alignSelf: 'flex-start' },
  chatSuggestionText: { fontSize: 13, color: '#6A1B9A', fontWeight: '500' },
  chatInputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background, gap: 10 },
  chatInput: { flex: 1, backgroundColor: colors.card, borderRadius: 22, paddingVertical: 10, paddingHorizontal: 16, fontSize: 14, color: colors.text, maxHeight: 100, borderWidth: 1, borderColor: colors.border },
  chatSendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#6A1B9A', alignItems: 'center', justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#fff' },
  filterScroll: { marginBottom: 4 },
  filterChip: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, marginRight: 8 },
  filterChipActive: { backgroundColor: '#fff' },
  filterChipText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  filterChipTextActive: { color: '#6A1B9A' },
  content: { padding: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  memoryCard: { marginBottom: 10, borderRadius: 14 },
  memoryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  typeIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  memoryTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  memoryMember: { fontSize: 11, color: colors.primary, fontWeight: '600', marginTop: 2 },
  memoryContent: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: 10 },
  memoryFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tagsRow: { flexDirection: 'row', gap: 6 },
  tag: { backgroundColor: colors.background, borderRadius: 8, paddingVertical: 2, paddingHorizontal: 8 },
  tagText: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 16 },
  emptyDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
  modal: { flex: 1, padding: 24, backgroundColor: colors.background },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 20 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1.5, borderColor: colors.border, marginBottom: 16, ...shadows.sm },
  modalTextarea: { minHeight: 80, textAlignVertical: 'top' as const },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  typeChipText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  memberChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, marginRight: 8 },
  memberChipActive: { borderColor: '#6A1B9A', backgroundColor: '#F3E5F5' },
  memberChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  memberChipTextActive: { color: '#6A1B9A' },
  memberDot: { width: 8, height: 8, borderRadius: 4 },
  sentimentRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  sentimentChip: { flex: 1, borderRadius: 12, paddingVertical: 9, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  sentimentChipActive: { borderColor: '#6A1B9A', backgroundColor: '#F3E5F5' },
  sentimentText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  sentimentTextActive: { color: '#6A1B9A' },
  });
}
