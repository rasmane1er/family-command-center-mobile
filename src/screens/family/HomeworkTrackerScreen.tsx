import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import {
  useHomeworkStore,
  type Assignment,
  type SubjectColor,
  type AssignmentPriority,
} from '../../store/useHomeworkStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useTranslation } from 'react-i18next';

const SUBJECT_COLORS: SubjectColor[] = [
  '#E74C3C',
  '#2980B9',
  '#27AE60',
  '#F5A623',
  '#8E44AD',
  '#16A085',
  '#E67E22',
  '#C0392B',
];

function getDueLabel(dueDate: string): { label: string; color: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: `Overdue ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`, color: colors.danger };
  }
  if (diffDays === 0) {
    return { label: 'Due today', color: '#F39C12' };
  }
  if (diffDays === 1) {
    return { label: 'Due tomorrow', color: colors.warning };
  }
  if (diffDays <= 7) {
    return { label: `${diffDays} days left`, color: '#E67E22' };
  }
  return { label: `${diffDays} days left`, color: colors.textSecondary };
}

function gradeColor(grade: number): string {
  if (grade >= 90) return colors.success;
  if (grade >= 70) return '#F39C12';
  return colors.danger;
}

const STATUS_LABELS: Record<Assignment['status'], string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  graded: 'Graded',
};

const STATUS_VARIANTS: Record<Assignment['status'], 'neutral' | 'warning' | 'info' | 'success'> = {
  todo: 'neutral',
  in_progress: 'warning',
  submitted: 'info',
  graded: 'success',
};

const PRIORITY_VARIANTS: Record<AssignmentPriority, 'success' | 'warning' | 'danger'> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
};

export function HomeworkTrackerScreen({ navigation, route }: any) {
  const { t } = useTranslation('family');
  const insets = useSafeAreaInsets();
  const members = useFamilyStore((s) => s.members);
  const memberId = route?.params?.memberId;
  const role = route?.params?.role;
  const children = members.filter((m) => m.role === 'child');

const visibleChildren =
  role === 'child' && memberId
    ? children.filter((child) => child.id === memberId)
    : children;

  const {
    assignments,
    addAssignment,
    updateStatus,
    setGrade,
    deleteAssignment,
    getGPAForMember,
    getOverdueCount,
    isLoaded,
    fetchFromServer,
  } = useHomeworkStore();

  useEffect(() => {
    if (!isLoaded) fetchFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [selectedMemberId, setSelectedMemberId] = useState<string>(
  memberId ?? visibleChildren[0]?.id ?? 'member-3'
);
  const [activeTab, setActiveTab] = useState<'due_soon' | 'all' | 'grades'>('due_soon');
  const [showAddModal, setShowAddModal] = useState(false);

  // Modal state
  const [modalMemberId, setModalMemberId] = useState<string>(children[0]?.id ?? 'member-3');
  const [modalSubject, setModalSubject] = useState('');
  const [modalSubjectColor, setModalSubjectColor] = useState<SubjectColor>('#2980B9');
  const [modalTitle, setModalTitle] = useState('');
  const [modalDescription, setModalDescription] = useState('');
  const [modalDueDate, setModalDueDate] = useState('');
  const [modalPriority, setModalPriority] = useState<AssignmentPriority>('medium');
  const [modalMinutes, setModalMinutes] = useState('');

  const memberAssignments = useMemo(
    () => assignments.filter((a) => a.memberId === selectedMemberId),
    [assignments, selectedMemberId]
  );

  const today = new Date().toISOString().split('T')[0];

  const dueSoonAssignments = useMemo(() => {
    return [...memberAssignments]
      .filter((a) => a.status !== 'graded' && a.status !== 'submitted')
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [memberAssignments]);

  const groupedBySubject = useMemo(() => {
    const groups: Record<string, Assignment[]> = {};
    memberAssignments.forEach((a) => {
      if (!groups[a.subject]) groups[a.subject] = [];
      groups[a.subject].push(a);
    });
    return groups;
  }, [memberAssignments]);

  const gradedAssignments = useMemo(
    () => memberAssignments.filter((a) => a.status === 'graded'),
    [memberAssignments]
  );

  const totalAssignments = memberAssignments.length;
  const overdueCount = getOverdueCount(selectedMemberId);
  const avgGrade = getGPAForMember(selectedMemberId);

  const handleAssignmentPress = (a: Assignment) => {
    const { label: dueLabel } = getDueLabel(a.dueDate);
    Alert.alert(
      a.title,
      `Subject: ${a.subject}\nDue: ${a.dueDate} (${dueLabel})\nStatus: ${STATUS_LABELS[a.status]}\nPriority: ${a.priority}${a.description ? '\n\n' + a.description : ''}${a.grade !== undefined ? `\nGrade: ${a.grade}/${a.maxGrade ?? 100}` : ''}`,
      [
        { text: 'Mark In Progress', onPress: () => { updateStatus(a.id, 'in_progress'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } },
        { text: 'Mark Submitted', onPress: () => { updateStatus(a.id, 'submitted'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } },
        {
          text: 'Set Grade',
          onPress: () => {
            Alert.prompt(
              'Enter Grade',
              'Enter a grade from 0 to 100:',
              (val) => {
                const n = parseInt(val ?? '', 10);
                if (!isNaN(n) && n >= 0 && n <= 100) {
                  setGrade(a.id, n);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
              },
              'plain-text',
              a.grade?.toString() ?? ''
            );
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => { deleteAssignment(a.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); },
        },
        { text: 'Close', style: 'cancel' },
      ]
    );
  };

  const handleAddAssignment = () => {
    if (!modalTitle.trim() || !modalSubject.trim() || !modalDueDate.trim()) return;
    addAssignment({
      familyId: 'demo-family',
      memberId: modalMemberId,
      subject: modalSubject.trim(),
      subjectColor: modalSubjectColor,
      title: modalTitle.trim(),
      description: modalDescription.trim() || undefined,
      dueDate: modalDueDate.trim(),
      status: 'todo',
      priority: modalPriority,
      estimatedMinutes: modalMinutes ? parseInt(modalMinutes, 10) : undefined,
      maxGrade: 100,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalSubject('');
    setModalTitle('');
    setModalDescription('');
    setModalDueDate('');
    setModalPriority('medium');
    setModalMinutes('');
    setShowModal(false);
  };

  const setShowModal = (v: boolean) => setShowAddModal(v);

  const renderAssignmentCard = (a: Assignment) => {
    const { label: dueLabel, color: dueColor } = getDueLabel(a.dueDate);
    const isOverdue = a.dueDate < today && a.status !== 'submitted' && a.status !== 'graded';
    return (
      <Card
        key={a.id}
        style={{ ...styles.assignCard, ...(isOverdue ? styles.overdueCard : {}) }}
        variant="elevated"
        onPress={() => { handleAssignmentPress(a); Haptics.selectionAsync(); }}
      >
        <View style={styles.cardTop}>
          <View style={[styles.subjectDot, { backgroundColor: a.subjectColor }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.assignTitle}>{a.title}</Text>
            <Text style={[styles.subjectLabel, { color: a.subjectColor }]}>{a.subject}</Text>
          </View>
          <Badge label={STATUS_LABELS[a.status]} variant={STATUS_VARIANTS[a.status]} />
        </View>
        <View style={styles.cardBottom}>
          <Text style={[styles.dueLabel, { color: dueColor }]}>{dueLabel}</Text>
          <View style={styles.cardBadges}>
            <Badge label={a.priority.charAt(0).toUpperCase() + a.priority.slice(1)} variant={PRIORITY_VARIANTS[a.priority]} />
          </View>
        </View>
        {a.estimatedMinutes && (
          <Text style={styles.estimateLabel}>Est. {a.estimatedMinutes} min</Text>
        )}
      </Card>
    );
  };

  const renderGradeCircle = (grade: number, maxGrade: number = 100) => {
    const pct = Math.round((grade / maxGrade) * 100);
    const c = gradeColor(pct);
    return (
      <View style={[styles.gradeCircle, { borderColor: c }]}>
        <Text style={[styles.gradeCircleText, { color: c }]}>{pct}</Text>
      </View>
    );
  };

  const isEmpty = assignments.length === 0;

  const screenHeader = (
    <LinearGradient
      colors={['#1A237E', '#283593', '#3949AB']}
      style={[styles.header, { paddingTop: insets.top + 6 }]}
    >
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('homework.title')}</Text>
        <Pressable onPress={() => setShowAddModal(true)} style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalAssignments}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statItem, styles.statBorder]}>
          <Text style={[styles.statValue, overdueCount > 0 ? styles.overdueValue : {}]}>
            {overdueCount}
          </Text>
          <Text style={styles.statLabel}>Overdue</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{avgGrade > 0 ? `${avgGrade}%` : '--'}</Text>
          <Text style={styles.statLabel}>Avg Grade</Text>
        </View>
      </View>

      {role !== 'child' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memberScroll} contentContainerStyle={styles.memberScrollContent}>
          {visibleChildren.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => { setSelectedMemberId(m.id); Haptics.selectionAsync(); }}
              style={[styles.memberTab, selectedMemberId === m.id && { borderBottomColor: '#3949AB', borderBottomWidth: 2.5 }]}
            >
              <Avatar name={m.name} color={m.avatarColor} size={30} />
              <Text style={[styles.memberTabText, selectedMemberId === m.id && styles.memberTabTextActive]}>
                {m.name.split(' ')[0]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    
    <View style={styles.tabs}>
            {(['due_soon', 'all', 'grades'] as const).map((t) => (
              <Pressable key={t} onPress={() => setActiveTab(t)} style={[styles.tab, activeTab === t && styles.tabActive]}>
                <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
                  {t === 'due_soon' ? 'Due Soon' : t === 'all' ? 'All' : 'Grades'}
                </Text>
              </Pressable>
            ))}
          </View>
</LinearGradient>
  );

  const screenCompact = (
    <LinearGradient colors={['#1A237E', '#283593']} style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Text style={styles.headerTitle}>{t('homework.title')}</Text>
      <Pressable onPress={() => setShowAddModal(true)} style={styles.addBtn}>
        <Ionicons name="add" size={22} color="#fff" />
      </Pressable>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Tabs */}
      

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
      <ScrollView
        onScroll={onScroll}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={[styles.content, { paddingBottom: 100, paddingTop: contentPaddingTop }]}
      >
        {isEmpty && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text style={styles.emptyTitle}>No assignments yet</Text>
            <Text style={styles.emptyDesc}>Tap + to add an assignment.</Text>
          </View>
        )}

        {!isEmpty && activeTab === 'due_soon' && (
          <>
            {dueSoonAssignments.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>✅</Text>
                <Text style={styles.emptyTitle}>All caught up!</Text>
                <Text style={styles.emptyDesc}>No pending assignments due soon.</Text>
              </View>
            ) : (
              dueSoonAssignments.map(renderAssignmentCard)
            )}
          </>
        )}

        {!isEmpty && activeTab === 'all' && (
          <>
            {Object.entries(groupedBySubject).map(([subject, subjectAssignments]) => (
              <View key={subject} style={styles.subjectGroup}>
                <View style={styles.subjectHeader}>
                  <View style={[styles.subjectHeaderDot, { backgroundColor: subjectAssignments[0].subjectColor }]} />
                  <Text style={styles.subjectHeaderText}>{subject}</Text>
                  <Text style={styles.subjectCount}>{subjectAssignments.length}</Text>
                </View>
                {subjectAssignments.map(renderAssignmentCard)}
              </View>
            ))}
          </>
        )}

        {!isEmpty && activeTab === 'grades' && (
          <>
            {gradedAssignments.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>📝</Text>
                <Text style={styles.emptyTitle}>No graded assignments</Text>
                <Text style={styles.emptyDesc}>Grades will appear here once assignments are graded.</Text>
              </View>
            ) : (
              <>
                {avgGrade > 0 && (
                  <Card variant="elevated" style={styles.gpaCard}>
                    <Text style={styles.gpaLabel}>Current GPA</Text>
                    <Text style={[styles.gpaValue, { color: gradeColor(avgGrade) }]}>{avgGrade}%</Text>
                    <Text style={styles.gpaSubLabel}>Average across {gradedAssignments.length} graded assignment{gradedAssignments.length !== 1 ? 's' : ''}</Text>
                  </Card>
                )}
                {gradedAssignments.map((a) => (
                  <Card key={a.id} variant="elevated" style={styles.gradeCard} onPress={() => handleAssignmentPress(a)}>
                    <View style={styles.gradeCardRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.assignTitle}>{a.title}</Text>
                        <Text style={[styles.subjectLabel, { color: a.subjectColor }]}>{a.subject}</Text>
                        <Text style={styles.gradeDateLabel}>{a.dueDate}</Text>
                      </View>
                      {a.grade !== undefined && renderGradeCircle(a.grade, a.maxGrade)}
                    </View>
                  </Card>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
        )}
      </CollapsibleHeader>

      {/* Add Assignment Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 60 }}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{t('homework.addAssignment')}</Text>

          <Text style={styles.modalLabel}>Member</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
           {visibleChildren.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => setModalMemberId(m.id)}
                style={[styles.memberChip, modalMemberId === m.id && styles.memberChipActive]}
              >
                <Avatar name={m.name} color={m.avatarColor} size={26} />
                <Text style={styles.memberChipText}>{m.name.split(' ')[0]}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.modalLabel}>Subject</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="e.g. Math, Science, English..."
            value={modalSubject}
            onChangeText={setModalSubject}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.modalLabel}>Subject Color</Text>
          <View style={styles.colorRow}>
            {SUBJECT_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setModalSubjectColor(c)}
                style={[styles.colorSwatch, { backgroundColor: c }, modalSubjectColor === c && styles.colorSwatchSelected]}
              />
            ))}
          </View>

          <Text style={styles.modalLabel}>Assignment Title</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Assignment title..."
            value={modalTitle}
            onChangeText={setModalTitle}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.modalLabel}>Description (optional)</Text>
          <TextInput
            style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Additional details..."
            value={modalDescription}
            onChangeText={setModalDescription}
            multiline
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.modalLabel}>Due Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="2026-07-01"
            value={modalDueDate}
            onChangeText={setModalDueDate}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.modalLabel}>Priority</Text>
          <View style={styles.chipRow}>
            {(['low', 'medium', 'high'] as AssignmentPriority[]).map((p) => (
              <Pressable
                key={p}
                onPress={() => setModalPriority(p)}
                style={[styles.priorityChip, modalPriority === p && styles.priorityChipActive]}
              >
                <Text style={[styles.priorityChipText, modalPriority === p && styles.priorityChipTextActive]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.modalLabel}>Estimated Minutes (optional)</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="e.g. 45"
            value={modalMinutes}
            onChangeText={setModalMinutes}
            keyboardType="numeric"
            placeholderTextColor={colors.textMuted}
          />

          <Button
            title="Add Assignment"
            onPress={handleAddAssignment}
            fullWidth
            size="lg"
            disabled={!modalTitle.trim() || !modalSubject.trim() || !modalDueDate.trim()}
          />
          <Button
            title="Cancel"
            onPress={() => setShowAddModal(false)}
            variant="ghost"
            fullWidth
            style={{ marginTop: 8 }}
          />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  backBtn: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row' },
  statItem: { flex: 1, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  overdueValue: { color: '#FF6B6B' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  memberScroll: { marginTop: 8 },
  memberScrollContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  memberTab: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, gap: 4, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  memberTabText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  memberTabTextActive: { color: '#3949AB', fontWeight: '700' },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: '#3949AB' },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: '#3949AB' },
  content: { padding: 16 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 12, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 32, lineHeight: 22 },
  assignCard: { marginBottom: 12, borderRadius: 14 },
  overdueCard: { borderLeftWidth: 3, borderLeftColor: colors.danger },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  subjectDot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  assignTitle: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  subjectLabel: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dueLabel: { fontSize: 12, fontWeight: '600' },
  cardBadges: { flexDirection: 'row', gap: 6 },
  estimateLabel: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
  subjectGroup: { marginBottom: 12 },
  subjectHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, paddingHorizontal: 4 },
  subjectHeaderDot: { width: 10, height: 10, borderRadius: 5 },
  subjectHeaderText: { fontSize: 14, fontWeight: '700', color: colors.text, flex: 1 },
  subjectCount: { fontSize: 12, color: colors.textSecondary, backgroundColor: colors.border, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  gpaCard: { borderRadius: 16, marginBottom: 16, alignItems: 'center', paddingVertical: 24 },
  gpaLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  gpaValue: { fontSize: 48, fontWeight: '800', marginTop: 4 },
  gpaSubLabel: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  gradeCard: { marginBottom: 12, borderRadius: 14 },
  gradeCardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gradeDateLabel: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  gradeCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  gradeCircleText: { fontSize: 16, fontWeight: '800' },
  modal: { flex: 1, padding: 24, backgroundColor: colors.background },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 20 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1.5, borderColor: colors.border, marginBottom: 16, ...shadows.sm },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  colorSwatch: { width: 34, height: 34, borderRadius: 17 },
  colorSwatchSelected: { borderWidth: 3, borderColor: colors.text },
  chipRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  priorityChip: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center' },
  priorityChipActive: { backgroundColor: '#E8EEF9', borderColor: '#3949AB' },
  priorityChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  priorityChipTextActive: { color: '#3949AB' },
  memberChip: { alignItems: 'center', marginRight: 12, padding: 10, borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent', gap: 4 },
  memberChipActive: { borderColor: '#3949AB', backgroundColor: '#E8EEF9' },
  memberChipText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
});
