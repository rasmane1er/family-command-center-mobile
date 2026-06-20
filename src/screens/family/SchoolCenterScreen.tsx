import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal,
  TextInput, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, differenceInDays } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { ProgressBar } from '../../components/common/ProgressBar';
import { useFamilyStore } from '../../store/useFamilyStore';
import {
  useSchoolStore, computeGPA, computeAverage, scoreToLetter,
  type SchoolAssignment, type AssignmentStatus,
} from '../../store/useSchoolStore';

const PRIORITY_CONFIG = {
  high: { color: colors.danger, label: 'High' },
  medium: { color: colors.warning, label: 'Medium' },
  low: { color: colors.success, label: 'Low' },
} as const;

const STATUS_CONFIG: Record<AssignmentStatus, { icon: string; color: string; bg: string }> = {
  completed: { icon: 'checkmark-circle', color: colors.success, bg: colors.successLight },
  in_progress: { icon: 'time', color: colors.warning, bg: '#FEF3E2' },
  not_started: { icon: 'alert-circle', color: colors.danger, bg: colors.dangerLight },
};

function getDueLabel(dueDate: string, status: AssignmentStatus): string {
  if (status === 'completed') return 'Completed';
  const days = differenceInDays(new Date(dueDate), new Date());
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due TODAY';
  if (days === 1) return 'Due tomorrow';
  return `Due ${format(new Date(dueDate), 'MMM d')}`;
}

export function SchoolCenterScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const members = useFamilyStore((s) => s.members);
  const children = members.filter((m) => m.role === 'child');
  const { subjects, assignments, toggleAssignmentComplete, addAssignment, seedDemoData } = useSchoolStore();

  const [selectedChild, setSelectedChild] = useState(children[0]?.id ?? null);
  const [activeTab, setActiveTab] = useState<'grades' | 'assignments' | 'overview'>('overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newDays, setNewDays] = useState('7');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');

  if (subjects.length === 0) seedDemoData();

  const memberSubjects = useMemo(
    () => subjects.filter((s) => s.memberId === selectedChild),
    [subjects, selectedChild]
  );

  const memberAssignments = useMemo(
    () => assignments.filter((a) => a.memberId === selectedChild),
    [assignments, selectedChild]
  );

  const pendingAssignments = memberAssignments.filter((a) => a.status !== 'completed');
  const gpa = computeGPA(memberSubjects);

  const handleToggle = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleAssignmentComplete(id);
  };

  const handleAddAssignment = () => {
    if (!newTitle.trim() || !newSubject.trim() || !selectedChild) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const dueDate = new Date(Date.now() + parseInt(newDays || '7') * 86400000).toISOString();
    addAssignment({
      id: Math.random().toString(36).substring(2),
      memberId: selectedChild,
      title: newTitle.trim(),
      subject: newSubject.trim(),
      dueDate,
      status: 'not_started',
      priority: newPriority,
    });
    setNewTitle('');
    setNewSubject('');
    setNewDays('7');
    setShowAddModal(false);
  };

  const activeMember = members.find((m) => m.id === selectedChild);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#1E4A8A', '#45B7D1']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>School Center</Text>
          <Pressable onPress={() => setShowAddModal(true)} style={styles.addBtn}>
            <Ionicons name="add" size={24} color="#fff" />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
          {children.map((child) => (
            <Pressable
              key={child.id}
              onPress={() => setSelectedChild(child.id)}
              style={[styles.childChip, selectedChild === child.id && styles.childChipActive]}
            >
              <View style={[styles.childDot, { backgroundColor: child.avatarColor }]} />
              <Text style={[styles.childChipText, selectedChild === child.id && styles.childChipTextActive]}>
                {child.name}
              </Text>
            </Pressable>
          ))}
          {children.length === 0 && (
            <Text style={styles.noChildText}>No children in family profile</Text>
          )}
        </ScrollView>
      </LinearGradient>

      {/* GPA Hero */}
      {activeMember && (
        <Card style={styles.gpaCard} padding={0} variant="elevated">
          <LinearGradient colors={['#1E4A8A', '#45B7D1']} style={styles.gpaGradient}>
            <View style={styles.gpaRow}>
              <View style={styles.gpaLeft}>
                <Text style={styles.gpaLabel}>GPA</Text>
                <Text style={styles.gpaValue}>{gpa.toFixed(2)}</Text>
                <Badge
                  label={gpa >= 3.7 ? 'Honor Roll' : gpa >= 3.0 ? 'Good Standing' : 'Needs Focus'}
                  variant={gpa >= 3.7 ? 'success' : gpa >= 3.0 ? 'warning' : 'danger'}
                  size="sm"
                />
              </View>
              <View style={styles.gpaStats}>
                <View style={styles.gpaStat}>
                  <Text style={styles.gpaStatVal}>{memberSubjects.length}</Text>
                  <Text style={styles.gpaStatLabel}>Subjects</Text>
                </View>
                <View style={styles.gpaStat}>
                  <Text style={[styles.gpaStatVal, { color: '#FF8080' }]}>{pendingAssignments.filter((a) => differenceInDays(new Date(a.dueDate), new Date()) < 0 && a.status !== 'completed').length}</Text>
                  <Text style={styles.gpaStatLabel}>Overdue</Text>
                </View>
                <View style={styles.gpaStat}>
                  <Text style={styles.gpaStatVal}>{pendingAssignments.length}</Text>
                  <Text style={styles.gpaStatLabel}>Pending</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Card>
      )}

      <View style={styles.tabs}>
        {(['overview', 'grades', 'assignments'] as const).map((tab) => (
          <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'overview' ? 'Overview' : tab === 'grades' ? 'Grades' : 'Assignments'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {activeTab === 'overview' && (
          <>
            <Text style={styles.sectionTitle}>Subject Snapshot</Text>
            {memberSubjects.map((sub) => {
              const avg = computeAverage(sub);
              const letter = scoreToLetter(avg);
              return (
                <Card key={sub.id} style={styles.subjectCard} variant="elevated">
                  <View style={styles.subjectRow}>
                    <View style={[styles.subjectColorBar, { backgroundColor: sub.color }]} />
                    <View style={[styles.subjectIcon, { backgroundColor: sub.color + '15' }]}>
                      <Ionicons name={sub.icon as any} size={18} color={sub.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.subjectName}>{sub.name}</Text>
                      <Text style={styles.subjectTeacher}>{sub.teacherName}</Text>
                      <ProgressBar progress={avg / 100} color={sub.color} height={5} style={{ marginTop: 6 }} />
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.subjectGrade, { color: sub.color }]}>{letter}</Text>
                      <Text style={styles.subjectScore}>{avg.toFixed(0)}%</Text>
                    </View>
                  </View>
                </Card>
              );
            })}
            {memberSubjects.length === 0 && (
              <View style={styles.empty}>
                <Ionicons name="school-outline" size={50} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No subjects yet</Text>
                <Text style={styles.emptyDesc}>Subjects will appear once demo data is loaded.</Text>
              </View>
            )}

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Due Soon</Text>
            {pendingAssignments
              .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
              .slice(0, 4)
              .map((a) => {
                const cfg = STATUS_CONFIG[a.status];
                const overdue = differenceInDays(new Date(a.dueDate), new Date()) < 0;
                return (
                  <Card key={a.id} style={styles.assignmentCard} variant="elevated">
                    <View style={styles.assignmentRow}>
                      <Pressable onPress={() => handleToggle(a.id)} style={[styles.statusIcon, { backgroundColor: cfg.bg }]}>
                        <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
                      </Pressable>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.assignmentTitle}>{a.title}</Text>
                        <View style={styles.assignmentMeta}>
                          <Badge label={a.subject} variant="primary" size="sm" />
                          <Text style={[styles.assignmentDue, overdue && { color: colors.danger }]}>
                            {getDueLabel(a.dueDate, a.status)}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.priorityDot, { backgroundColor: PRIORITY_CONFIG[a.priority].color }]} />
                    </View>
                  </Card>
                );
              })}
          </>
        )}

        {activeTab === 'grades' && (
          <>
            <Text style={styles.sectionTitle}>Grades by Subject</Text>
            {memberSubjects.map((sub) => {
              const avg = computeAverage(sub);
              const letter = scoreToLetter(avg);
              return (
                <Card key={sub.id} style={styles.gradeCard} variant="elevated">
                  <View style={styles.gradeHeader}>
                    <View style={[styles.gradeColorBar, { backgroundColor: sub.color }]} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <View style={styles.gradeTitleRow}>
                        <Text style={styles.gradeName}>{sub.name}</Text>
                        <Text style={[styles.gradeLetter, { color: sub.color }]}>{letter}</Text>
                      </View>
                      <Text style={styles.gradeTeacher}>{sub.teacherName}</Text>
                      <ProgressBar progress={avg / 100} color={sub.color} height={6} style={{ marginTop: 6 }} />
                      <Text style={styles.gradeAvg}>{avg.toFixed(1)}% average • {sub.gradeEntries.length} grades</Text>
                    </View>
                  </View>
                  <View style={styles.gradeEntries}>
                    {sub.gradeEntries.slice(-3).reverse().map((g) => (
                      <View key={g.id} style={styles.gradeEntry}>
                        <Text style={styles.gradeType}>{g.type.charAt(0).toUpperCase() + g.type.slice(1)}</Text>
                        <Text style={styles.gradeDate}>{format(new Date(g.date), 'MMM d')}</Text>
                        <Text style={[styles.gradeScore, { color: (g.score / g.maxScore) >= 0.9 ? colors.success : (g.score / g.maxScore) >= 0.7 ? colors.warning : colors.danger }]}>
                          {g.score}/{g.maxScore}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Card>
              );
            })}
          </>
        )}

        {activeTab === 'assignments' && (
          <>
            <Text style={styles.sectionTitle}>All Assignments</Text>
            {memberAssignments
              .sort((a, b) => {
                if (a.status === 'completed' && b.status !== 'completed') return 1;
                if (a.status !== 'completed' && b.status === 'completed') return -1;
                return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
              })
              .map((a) => {
                const cfg = STATUS_CONFIG[a.status];
                const overdue = differenceInDays(new Date(a.dueDate), new Date()) < 0 && a.status !== 'completed';
                return (
                  <Card key={a.id} style={styles.assignmentCard} variant="elevated">
                    <View style={styles.assignmentRow}>
                      <Pressable onPress={() => handleToggle(a.id)} style={[styles.statusIcon, { backgroundColor: cfg.bg }]}>
                        <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
                      </Pressable>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[styles.assignmentTitle, a.status === 'completed' && styles.completedText]}>
                          {a.title}
                        </Text>
                        <View style={styles.assignmentMeta}>
                          <Badge label={a.subject} variant="primary" size="sm" />
                          <Text style={[styles.assignmentDue, overdue && { color: colors.danger }]}>
                            {getDueLabel(a.dueDate, a.status)}
                          </Text>
                        </View>
                      </View>
                      <Badge
                        label={PRIORITY_CONFIG[a.priority].label}
                        variant={a.priority === 'high' ? 'danger' : a.priority === 'medium' ? 'warning' : 'success'}
                        size="sm"
                      />
                    </View>
                  </Card>
                );
              })}
            {memberAssignments.length === 0 && (
              <View style={styles.empty}>
                <Ionicons name="checkbox-outline" size={50} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No assignments</Text>
                <Text style={styles.emptyDesc}>Tap + to add a new assignment.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Add Assignment Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Assignment</Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <Text style={styles.modalLabel}>Title</Text>
            <TextInput
              style={styles.modalInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="e.g. Math Chapter 10 Problems"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>Subject</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {memberSubjects.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => setNewSubject(s.name)}
                  style={[styles.subjectChip, newSubject === s.name && { backgroundColor: s.color, borderColor: s.color }]}
                >
                  <Text style={[styles.subjectChipText, newSubject === s.name && { color: '#fff' }]}>{s.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {newSubject === '' && (
              <TextInput
                style={[styles.modalInput, { marginTop: 0 }]}
                value={newSubject}
                onChangeText={setNewSubject}
                placeholder="Or type subject name"
                placeholderTextColor={colors.textMuted}
              />
            )}

            <Text style={styles.modalLabel}>Due in (days)</Text>
            <TextInput
              style={styles.modalInput}
              value={newDays}
              onChangeText={setNewDays}
              keyboardType="numeric"
              placeholder="7"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>Priority</Text>
            <View style={styles.priorityRow}>
              {(['low', 'medium', 'high'] as const).map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setNewPriority(p)}
                  style={[styles.priorityBtn, newPriority === p && { backgroundColor: PRIORITY_CONFIG[p].color }]}
                >
                  <Text style={[styles.priorityBtnText, newPriority === p && { color: '#fff' }]}>
                    {PRIORITY_CONFIG[p].label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={handleAddAssignment}
              style={[styles.modalSubmit, (!newTitle.trim() || !newSubject.trim()) && styles.modalSubmitDisabled]}
            >
              <Ionicons name="add-circle" size={18} color="#fff" />
              <Text style={styles.modalSubmitText}>Add Assignment</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 14 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#fff' },
  addBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  childChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, marginRight: 8, backgroundColor: 'rgba(255,255,255,0.15)' },
  childChipActive: { backgroundColor: '#fff' },
  childDot: { width: 8, height: 8, borderRadius: 4 },
  childChipText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  childChipTextActive: { color: '#1E4A8A' },
  noChildText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', paddingVertical: 8 },
  gpaCard: { borderRadius: 0, marginBottom: 0 },
  gpaGradient: { padding: 18 },
  gpaRow: { flexDirection: 'row', alignItems: 'center' },
  gpaLeft: { alignItems: 'center', paddingRight: 20, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.25)' },
  gpaLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  gpaValue: { fontSize: 44, fontWeight: '900', color: '#fff', marginBottom: 6 },
  gpaStats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  gpaStat: { alignItems: 'center' },
  gpaStatVal: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 2 },
  gpaStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: '#1E4A8A' },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: '#1E4A8A' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  subjectCard: { marginBottom: 8, borderRadius: 14, padding: 0, overflow: 'hidden' },
  subjectRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  subjectColorBar: { width: 4, height: 56, borderRadius: 2, marginRight: 10 },
  subjectIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  subjectName: { fontSize: 14, fontWeight: '700', color: colors.text },
  subjectTeacher: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  subjectGrade: { fontSize: 22, fontWeight: '900' },
  subjectScore: { fontSize: 11, color: colors.textMuted, textAlign: 'right', marginTop: 2 },
  gradeCard: { marginBottom: 12, borderRadius: 14 },
  gradeHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  gradeColorBar: { width: 4, borderRadius: 2, alignSelf: 'stretch', marginRight: 10, minHeight: 50 },
  gradeTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  gradeName: { fontSize: 15, fontWeight: '700', color: colors.text },
  gradeLetter: { fontSize: 22, fontWeight: '900' },
  gradeTeacher: { fontSize: 11, color: colors.textSecondary, marginBottom: 2 },
  gradeAvg: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
  gradeEntries: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, gap: 6 },
  gradeEntry: { flexDirection: 'row', alignItems: 'center' },
  gradeType: { flex: 1, fontSize: 12, color: colors.text, fontWeight: '600', textTransform: 'capitalize' },
  gradeDate: { fontSize: 11, color: colors.textMuted, marginRight: 10 },
  gradeScore: { fontSize: 13, fontWeight: '700', width: 50, textAlign: 'right' },
  assignmentCard: { marginBottom: 8, borderRadius: 14 },
  assignmentRow: { flexDirection: 'row', alignItems: 'center' },
  statusIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  assignmentTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 5 },
  completedText: { textDecorationLine: 'line-through', color: colors.textSecondary },
  assignmentMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  assignmentDue: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 12 },
  emptyDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  modalLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  modalInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: colors.text, marginBottom: 16 },
  subjectChip: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, marginRight: 8 },
  subjectChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  priorityRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  priorityBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  priorityBtnText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  modalSubmit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1E4A8A', borderRadius: 14, paddingVertical: 14 },
  modalSubmitDisabled: { opacity: 0.5 },
  modalSubmitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
