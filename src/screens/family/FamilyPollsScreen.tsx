import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { usePollsStore, Poll, PollOption } from '../../store/usePollsStore';
import { useFamilyStore } from '../../store/useFamilyStore';

const CAT_CONFIG = {
  food:     { emoji: '🍽️', color: '#E67E22' },
  activity: { emoji: '🎯', color: '#2980B9' },
  decision: { emoji: '🤔', color: '#8E44AD' },
  fun:      { emoji: '🎉', color: '#E91E63' },
  other:    { emoji: '💬', color: '#7F8C8D' },
};

function VoteBar({ option, total, myVote }: { option: PollOption; total: number; myVote: boolean }) {
  const pct = total > 0 ? (option.votes.length / total) * 100 : 0;
  const isLeading = total > 0 && option.votes.length === Math.max(...[option.votes.length]);
  return (
    <View style={rStyles.optionResult}>
      <View style={rStyles.optionRow}>
        <Text style={rStyles.optionEmoji}>{option.emoji}</Text>
        <Text style={[rStyles.optionText, myVote && rStyles.optionTextMine]}>{option.text}</Text>
        <Text style={rStyles.optionPct}>{Math.round(pct)}%</Text>
        <Text style={rStyles.optionCount}>{option.votes.length}</Text>
      </View>
      <View style={rStyles.barBg}>
        <View style={[rStyles.barFill, { width: `${pct}%`, backgroundColor: myVote ? '#2980B9' : '#27AE60' }]} />
      </View>
    </View>
  );
}

function PollCard({ poll, memberId, onVote, onClose, onDelete }: {
  poll: Poll;
  memberId: string;
  onVote: (optionId: string) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const totalVotes = poll.options.reduce((s, o) => s + o.votes.length, 0);
  const myVotedOption = poll.options.find((o) => o.votes.includes(memberId));
  const catCfg = CAT_CONFIG[poll.category];

  return (
    <Card style={styles.pollCard} variant="elevated">
      <View style={styles.pollHeader}>
        <Text style={styles.pollEmoji}>{poll.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.pollQuestion}>{poll.question}</Text>
          <View style={styles.pollMeta}>
            <View style={[styles.catBadge, { backgroundColor: catCfg.color + '15' }]}>
              <Text style={[styles.catText, { color: catCfg.color }]}>{catCfg.emoji} {poll.category}</Text>
            </View>
            <Text style={styles.pollAge}>
              {formatDistanceToNow(new Date(poll.createdAt), { addSuffix: true })}
            </Text>
          </View>
        </View>
        <Pressable onPress={onDelete} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
        </Pressable>
      </View>

      {poll.isActive && !myVotedOption ? (
        <View style={styles.votingSection}>
          {poll.options.map((opt) => (
            <Pressable key={opt.id} onPress={() => onVote(opt.id)} style={styles.voteBtn}>
              <Text style={styles.voteBtnEmoji}>{opt.emoji}</Text>
              <Text style={styles.voteBtnText}>{opt.text}</Text>
              <Text style={styles.voteBtnCount}>{opt.votes.length}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.resultsSection}>
          {poll.options.map((opt) => (
            <VoteBar
              key={opt.id}
              option={opt}
              total={totalVotes}
              myVote={opt.id === myVotedOption?.id}
            />
          ))}
          <View style={styles.resultFooter}>
            <Text style={styles.totalVotes}>{totalVotes} vote{totalVotes !== 1 ? 's' : ''} total</Text>
            {myVotedOption && <Text style={styles.myVote}>You voted: {myVotedOption.emoji} {myVotedOption.text}</Text>}
          </View>
        </View>
      )}

      {poll.isActive && (
        <Pressable onPress={onClose} style={styles.closeVotingBtn}>
          <Text style={styles.closeVotingText}>Close Poll</Text>
        </Pressable>
      )}
    </Card>
  );
}

export function FamilyPollsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { polls, castVote, closePoll, addPoll, deletePoll, seedDemoData } = usePollsStore();
  const members = useFamilyStore((s) => s.members);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'closed'>('active');
  const me = members[0];

  // Create poll form
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '']);
  const [emoji, setEmoji] = useState('🗳️');

  if (polls.length === 0) seedDemoData();

  const activePolls = polls.filter((p) => p.isActive);
  const closedPolls = polls.filter((p) => !p.isActive);
  const displayed = activeTab === 'active' ? activePolls : closedPolls;

  const handleVote = (pollId: string, optionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    castVote(pollId, optionId, me?.id || 'member-1');
  };

  const handleDelete = (pollId: string, question: string) => {
    Alert.alert('Delete Poll', `Remove "${question}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); deletePoll(pollId); } },
    ]);
  };

  const handleCreatePoll = () => {
    const validOptions = options.filter((o) => o.trim());
    if (!question.trim() || validOptions.length < 2) return;
    const OPTION_EMOJIS = ['🅰️', '🅱️', '🅲', '🅳'];
    addPoll({
      question: question.trim(),
      emoji,
      options: validOptions.map((text, i) => ({
        id: `opt-${Date.now()}-${i}`,
        text: text.trim(),
        emoji: OPTION_EMOJIS[i] || '•',
        votes: [],
      })),
      createdBy: me?.id || 'member-1',
      isAnonymous: false,
      isActive: true,
      category: 'other',
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setQuestion(''); setOptions(['', '', '']); setEmoji('🗳️');
    setShowCreate(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#1565C0', '#2980B9']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Family Polls</Text>
            <Text style={styles.headerSub}>{activePolls.length} active · {closedPolls.length} closed</Text>
          </View>
          <Pressable onPress={() => setShowCreate(true)} style={styles.addBtn}>
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          {[
            { label: 'Active Polls', value: activePolls.length, icon: 'radio-button-on' },
            { label: 'Total Votes', value: polls.reduce((s, p) => s + p.options.reduce((os, o) => os + o.votes.length, 0), 0), icon: 'hand-left' },
            { label: 'Decisions Made', value: closedPolls.length, icon: 'checkmark-circle' },
          ].map((s, i) => (
            <View key={i} style={[styles.statItem, i < 2 && styles.statBorder]}>
              <Text style={styles.statVal}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <View style={styles.tabs}>
        {(['active', 'closed'] as const).map((tab) => (
          <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'active' ? `Active (${activePolls.length})` : `Closed (${closedPolls.length})`}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
        {displayed.map((poll) => (
          <PollCard
            key={poll.id}
            poll={poll}
            memberId={me?.id || 'member-1'}
            onVote={(optId) => handleVote(poll.id, optId)}
            onClose={() => { Alert.alert('Close Poll', 'Stop accepting votes?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Close', onPress: () => closePoll(poll.id) }]); }}
            onDelete={() => handleDelete(poll.id, poll.question)}
          />
        ))}
        {displayed.length === 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>🗳️</Text>
            <Text style={styles.emptyTitle}>{activeTab === 'active' ? 'No active polls' : 'No closed polls yet'}</Text>
            <Text style={styles.emptyDesc}>{activeTab === 'active' ? 'Tap + to start a family vote!' : 'Close active polls to see results here.'}</Text>
          </View>
        )}
      </ScrollView>

      {/* Create Poll Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create a Poll</Text>
              <Pressable onPress={() => setShowCreate(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalLabel}>Question *</Text>
              <TextInput
                style={styles.modalInput}
                value={question}
                onChangeText={setQuestion}
                placeholder="e.g. Where should we go this weekend?"
                placeholderTextColor={colors.textMuted}
                multiline
                autoFocus
              />
              <Text style={styles.modalLabel}>Options (at least 2)</Text>
              {options.map((opt, i) => (
                <View key={i} style={styles.optionInput}>
                  <Text style={styles.optionNum}>{i + 1}.</Text>
                  <TextInput
                    style={[styles.modalInput, { flex: 1 }]}
                    value={opt}
                    onChangeText={(v) => setOptions(options.map((o, idx) => idx === i ? v : o))}
                    placeholder={`Option ${i + 1}`}
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              ))}
              {options.length < 4 && (
                <Pressable onPress={() => setOptions([...options, ''])} style={styles.addOptionBtn}>
                  <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                  <Text style={styles.addOptionText}>Add another option</Text>
                </Pressable>
              )}
              <Pressable
                onPress={handleCreatePoll}
                disabled={!question.trim() || options.filter((o) => o.trim()).length < 2}
                style={[styles.createBtn, (!question.trim() || options.filter((o) => o.trim()).length < 2) && styles.createBtnDisabled]}
              >
                <Ionicons name="radio-button-on" size={18} color="#fff" />
                <Text style={styles.createBtnText}>Start Poll</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  back: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  addBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  statBorder: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.2)' },
  statVal: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2, textAlign: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: '#2980B9' },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: '#2980B9' },
  content: { padding: 16 },
  pollCard: { borderRadius: 18, marginBottom: 14 },
  pollHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  pollEmoji: { fontSize: 20 },
  pollQuestion: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6, lineHeight: 22 },
  pollMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catBadge: { borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
  catText: { fontSize: 11, fontWeight: '700' },
  pollAge: { fontSize: 11, color: colors.textMuted },
  deleteBtn: { padding: 6 },
  votingSection: { gap: 8 },
  voteBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.background, borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: colors.border },
  voteBtnEmoji: { fontSize: 18 },
  voteBtnText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  voteBtnCount: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  resultsSection: { gap: 6 },
  resultFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  totalVotes: { fontSize: 12, color: colors.textMuted },
  myVote: { fontSize: 12, color: '#2980B9', fontWeight: '600' },
  closeVotingBtn: { marginTop: 12, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10 },
  closeVotingText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 14, marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  modalContent: { padding: 20 },
  modalLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border },
  optionInput: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  optionNum: { fontSize: 15, fontWeight: '700', color: colors.textSecondary, width: 20 },
  addOptionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, marginTop: 4 },
  addOptionText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2980B9', borderRadius: 14, paddingVertical: 16, marginTop: 24 },
  createBtnDisabled: { opacity: 0.4 },
  createBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

const rStyles = StyleSheet.create({
  optionResult: { marginBottom: 10 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  optionEmoji: { fontSize: 18 },
  optionText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  optionTextMine: { color: '#2980B9' },
  optionPct: { fontSize: 13, fontWeight: '700', color: colors.text, minWidth: 36, textAlign: 'right' },
  optionCount: { fontSize: 11, color: colors.textMuted, minWidth: 20, textAlign: 'right' },
  barBg: { height: 6, backgroundColor: colors.border, borderRadius: 3 },
  barFill: { height: 6, borderRadius: 3 },
});
