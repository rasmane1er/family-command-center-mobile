import React, { useState, useMemo, useEffect } from 'react';
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
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useTranslation } from 'react-i18next';
import {
  useSchoolStore, computeGPA, computeAverage, scoreToLetter,
  type SchoolAssignment, type AssignmentStatus, type SchoolSubject, type GradeType,
} from '../../store/useSchoolStore';
import { useAuthStore } from '../../store/useAuthStore';

const SUBJECT_ICONS = ['calculator', 'flask', 'book', 'time', 'laptop', 'fitness', 'book-outline', 'color-palette', 'leaf', 'globe', 'language', 'musical-notes'];
const SUBJECT_COLORS = ['#2980B9', '#27AE60', '#8E44AD', '#E67E22', '#16A085', '#E74C3C', '#E91E63', '#F5A623', '#7F8C8D', '#1E4A8A'];
const GRADE_TYPES: GradeType[] = ['quiz', 'test', 'homework', 'project', 'exam'];

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
  const { t } = useTranslation('family');
  const insets = useSafeAreaInsets();
  const members = useFamilyStore((s) => s.members);
  const family = useFamilyStore((s) => s.family);
  const children = members.filter((m) => m.role === 'child');
  const {
    subjects, assignments, toggleAssignmentComplete, addAssignment, deleteAssignment,
    addSubject, deleteSubject, addGradeEntry, fetchFromServer,
  } = useSchoolStore();

  useEffect(() => {
    fetchFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [selectedChild, setSelectedChild] = useState(children[0]?.id ?? null);
  const [activeTab, setActiveTab] = useState<'grades' | 'assignments' | 'overview'>('overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newDays, setNewDays] = useState('7');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState(SUBJECT_COLORS[0]);
  const [newSubjectIcon, setNewSubjectIcon] = useState(SUBJECT_ICONS[0]);
  const [gradeModalSubject, setGradeModalSubject] = useState<SchoolSubject | null>(null);
  const [newGradeType, setNewGradeType] = useState<GradeType>('test');
  const [newGradeScore, setNewGradeScore] = useState('');
  const [newGradeMax, setNewGradeMax] = useState('100');
  const [newGradeNotes, setNewGradeNotes] = useState('');


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

  const handleDeleteAssignment = (a: SchoolAssignment) => {
    Alert.alert(`Remove "${a.title}"?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteAssignment(a.id) },
    ]);
  };

  const handleDeleteSubject = (s: SchoolSubject) => {
    Alert.alert(`Remove "${s.name}"?`, 'This also removes its grade history.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteSubject(s.id) },
    ]);
  };

  const handleAddAssignment = () => {
    if (!newTitle.trim() || !newSubject.trim() || !selectedChild) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const dueDate = new Date(Date.now() + parseInt(newDays || '7') * 86400000).toISOString();
    addAssignment({
      id: Math.random().toString(36).substring(2),
      familyId: useAuthStore.getState().familyId ?? family?.id ?? '',
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

  const handleAddSubject = () => {
    if (!newSubjectName.trim() || !selectedChild) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addSubject({
      id: Math.random().toString(36).substring(2),
      familyId: useAuthStore.getState().familyId ?? family?.id ?? '',
      memberId: selectedChild,
      name: newSubjectName.trim(),
      teacherName: newTeacherName.trim(),
      color: newSubjectColor,
      icon: newSubjectIcon,
      gradeEntries: [],
    });
    setNewSubjectName('');
    setNewTeacherName('');
    setNewSubjectColor(SUBJECT_COLORS[0]);
    setNewSubjectIcon(SUBJECT_ICONS[0]);
    setShowAddSubject(false);
  };

  const handleAddGrade = () => {
    const score = parseFloat(newGradeScore);
    const maxScore = parseFloat(newGradeMax) || 100;
    if (!gradeModalSubject || isNaN(score)) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addGradeEntry(gradeModalSubject.id, {
      type: newGradeType,
      score,
      maxScore,
      date: new Date().toISOString(),
      notes: newGradeNotes.trim() || undefined,
    });
    setNewGradeType('test');
    setNewGradeScore('');
    setNewGradeMax('100');
    setNewGradeNotes('');
    setGradeModalSubject(null);
  };

  const activeMember = members.find((m) => m.id === selectedChild);

  const handleAddPress = () => {
    if (activeTab === 'assignments') setShowAddModal(true);
    else setShowAddSubject(true);
  };

  const overdueCount = pendingAssignments.filter((a) => differenceInDays(new Date(a.dueDate), new Date()) < 0).length;

  const screenHeader = (
        <LinearGradient colors={['#1E4A8A', '#45B7D1']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
          <View style={styles.headerTop}>
            <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.back}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>
            <Text style={styles.headerTitle}>School Center</Text>
            <Pressable accessibilityRole="button" onPress={handleAddPress} style={styles.addBtn}>
              <Ionicons name="add" size={24} color="#fff" />
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {children.map((child) => (
              <Pressable accessibilityRole="button"
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

          {activeMember && (
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
                  <Text style={[styles.gpaStatVal, { color: '#FF8080' }]}>{overdueCount}</Text>
                  <Text style={styles.gpaStatLabel}>Overdue</Text>
                </View>
                <View style={styles.gpaStat}>
                  <Text style={styles.gpaStatVal}>{pendingAssignments.length}</Text>
                  <Text style={styles.gpaStatLabel}>Pending</Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.tabs}>
            {(['overview', 'grades', 'assignments'] as const).map((tab) => (
              <Pressable accessibilityRole="button" key={tab} onPress={() => setActiveTab(tab)} style={[styles.tabChip, activeTab === tab && styles.tabChipActive]}>
                <Text style={[styles.tabChipText, activeTab === tab && styles.tabChipTextActive]}>
                  {tab === 'overview' ? 'Overview' : tab === 'grades' ? 'Grades' : 'Assignments'}
                </Text>
              </Pressable>
            ))}
          </View>
        </LinearGradient>
  );
  const screenCompact = (
    <LinearGradient
      colors={['#1E4A8A', '#45B7D1']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
    >
      <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={{ padding: 8, marginRight: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20 }}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </Pressable>
      <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 }}>School Center</Text>
      {activeMember ? (
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>{gpa.toFixed(2)} GPA</Text>
      ) : <View style={{ width: 22 }} />}
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
          <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100, paddingTop: contentPaddingTop }]} onScroll={onScroll} onScrollEndDrag={onScrollEndDrag} onMomentumScrollEnd={onMomentumScrollEnd} scrollEventThrottle={scrollEventThrottle}>
        {activeTab === 'overview' && (
          <>
            <Text style={styles.sectionTitle}>Subject Snapshot</Text>
            {memberSubjects.map((sub) => {
              const avg = computeAverage(sub);
              const letter = scoreToLetter(avg);
              return (
                <Pressable accessibilityRole="button" key={sub.id} onLongPress={() => handleDeleteSubject(sub)}>
                  <Card style={styles.subjectCard} variant="elevated">
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
                </Pressable>
              );
            })}
            {memberSubjects.length === 0 && (
              <View style={styles.empty}>
                <Ionicons name="school-outline" size={50} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No subjects yet</Text>
                <Text style={styles.emptyDesc}>Tap + to add {activeMember?.name ?? 'a child'}'s first subject.</Text>
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
                  <Pressable accessibilityRole="button" key={a.id} onLongPress={() => handleDeleteAssignment(a)}>
                    <Card style={styles.assignmentCard} variant="elevated">
                      <View style={styles.assignmentRow}>
                        <Pressable accessibilityRole="button" onPress={() => handleToggle(a.id)} style={[styles.statusIcon, { backgroundColor: cfg.bg }]}>
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
                  </Pressable>
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
                <Pressable accessibilityRole="button" key={sub.id} onLongPress={() => handleDeleteSubject(sub)}>
                  <Card style={styles.gradeCard} variant="elevated">
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
                      <Pressable accessibilityRole="button" onPress={() => setGradeModalSubject(sub)} style={styles.addGradeBtn} hitSlop={8}>
                        <Ionicons name="add-circle" size={26} color={sub.color} />
                      </Pressable>
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
                      {sub.gradeEntries.length === 0 && (
                        <Text style={styles.noGradesText}>No grades yet — tap + to add one</Text>
                      )}
                    </View>
                  </Card>
                </Pressable>
              );
            })}
            {memberSubjects.length === 0 && (
              <View style={styles.empty}>
                <Ionicons name="ribbon-outline" size={50} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No subjects yet</Text>
                <Text style={styles.emptyDesc}>Tap + to add {activeMember?.name ?? 'a child'}'s first subject.</Text>
              </View>
            )}
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
                  <Pressable accessibilityRole="button" key={a.id} onLongPress={() => handleDeleteAssignment(a)}>
                    <Card style={styles.assignmentCard} variant="elevated">
                      <View style={styles.assignmentRow}>
                        <Pressable accessibilityRole="button" onPress={() => handleToggle(a.id)} style={[styles.statusIcon, { backgroundColor: cfg.bg }]}>
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
                  </Pressable>
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
        )}
      </CollapsibleHeader>

      {/* Add Assignment Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Assignment</Text>
              <Pressable accessibilityRole="button" onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <Text style={styles.modalLabel}>Title</Text>
            <TextInput accessibilityLabel="e.g. Math Chapter 10 Problems"
              style={styles.modalInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="e.g. Math Chapter 10 Problems"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>Subject</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {memberSubjects.map((s) => (
                <Pressable accessibilityRole="button"
                  key={s.id}
                  onPress={() => setNewSubject(s.name)}
                  style={[styles.subjectChip, newSubject === s.name && { backgroundColor: s.color, borderColor: s.color }]}
                >
                  <Text style={[styles.subjectChipText, newSubject === s.name && { color: '#fff' }]}>{s.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {newSubject === '' && (
              <TextInput accessibilityLabel="Or type subject name"
                style={[styles.modalInput, { marginTop: 0 }]}
                value={newSubject}
                onChangeText={setNewSubject}
                placeholder="Or type subject name"
                placeholderTextColor={colors.textMuted}
              />
            )}

            <Text style={styles.modalLabel}>Due in (days)</Text>
            <TextInput accessibilityLabel="7"
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
                <Pressable accessibilityRole="button"
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

            <Pressable accessibilityRole="button"
              onPress={handleAddAssignment}
              style={[styles.modalSubmit, (!newTitle.trim() || !newSubject.trim()) && styles.modalSubmitDisabled]}
            >
              <Ionicons name="add-circle" size={18} color="#fff" />
              <Text style={styles.modalSubmitText}>Add Assignment</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Add Subject Modal */}
      <Modal visible={showAddSubject} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Subject</Text>
              <Pressable accessibilityRole="button" onPress={() => setShowAddSubject(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <Text style={styles.modalLabel}>Subject Name</Text>
            <TextInput accessibilityLabel="e.g. Mathematics"
              style={styles.modalInput}
              value={newSubjectName}
              onChangeText={setNewSubjectName}
              placeholder="e.g. Mathematics"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />

            <Text style={styles.modalLabel}>Teacher (optional)</Text>
            <TextInput accessibilityLabel="e.g. Ms. Rodriguez"
              style={styles.modalInput}
              value={newTeacherName}
              onChangeText={setNewTeacherName}
              placeholder="e.g. Ms. Rodriguez"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>Icon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {SUBJECT_ICONS.map((icon) => (
                <Pressable accessibilityRole="button"
                  key={icon}
                  onPress={() => setNewSubjectIcon(icon)}
                  style={[styles.iconChip, newSubjectIcon === icon && { backgroundColor: newSubjectColor, borderColor: newSubjectColor }]}
                >
                  <Ionicons name={icon as any} size={18} color={newSubjectIcon === icon ? '#fff' : colors.textSecondary} />
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>Color</Text>
            <View style={styles.colorRow}>
              {SUBJECT_COLORS.map((c) => (
                <Pressable accessibilityRole="button" key={c} onPress={() => setNewSubjectColor(c)} style={[styles.colorSwatch, { backgroundColor: c }, newSubjectColor === c && styles.colorSwatchSelected]} />
              ))}
            </View>

            <Pressable accessibilityRole="button"
              onPress={handleAddSubject}
              style={[styles.modalSubmit, !newSubjectName.trim() && styles.modalSubmitDisabled]}
            >
              <Ionicons name="add-circle" size={18} color="#fff" />
              <Text style={styles.modalSubmitText}>Add Subject</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Add Grade Modal */}
      <Modal visible={!!gradeModalSubject} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Grade{gradeModalSubject ? ` — ${gradeModalSubject.name}` : ''}</Text>
              <Pressable accessibilityRole="button" onPress={() => setGradeModalSubject(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <Text style={styles.modalLabel}>Type</Text>
            <View style={styles.priorityRow}>
              {GRADE_TYPES.map((t) => (
                <Pressable accessibilityRole="button"
                  key={t}
                  onPress={() => setNewGradeType(t)}
                  style={[styles.priorityBtn, newGradeType === t && { backgroundColor: gradeModalSubject?.color ?? colors.primary }]}
                >
                  <Text style={[styles.priorityBtnText, newGradeType === t && { color: '#fff' }]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>Score</Text>
                <TextInput accessibilityLabel="92"
                  style={styles.modalInput}
                  value={newGradeScore}
                  onChangeText={setNewGradeScore}
                  keyboardType="numeric"
                  placeholder="92"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>Out of</Text>
                <TextInput accessibilityLabel="100"
                  style={styles.modalInput}
                  value={newGradeMax}
                  onChangeText={setNewGradeMax}
                  keyboardType="numeric"
                  placeholder="100"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <Text style={styles.modalLabel}>Notes (optional)</Text>
            <TextInput accessibilityLabel="e.g. Chapter 5 test"
              style={styles.modalInput}
              value={newGradeNotes}
              onChangeText={setNewGradeNotes}
              placeholder="e.g. Chapter 5 test"
              placeholderTextColor={colors.textMuted}
            />

            <Pressable accessibilityRole="button"
              onPress={handleAddGrade}
              style={[styles.modalSubmit, !newGradeScore.trim() && styles.modalSubmitDisabled]}
            >
              <Ionicons name="add-circle" size={18} color="#fff" />
              <Text style={styles.modalSubmitText}>Add Grade</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
  addBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  childChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, marginRight: 8, backgroundColor: 'rgba(255,255,255,0.15)' },
  childChipActive: { backgroundColor: '#fff' },
  childDot: { width: 8, height: 8, borderRadius: 4 },
  childChipText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  childChipTextActive: { color: '#1E4A8A' },
  noChildText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', paddingVertical: 8 },
  gpaRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 14, marginBottom: 12 },
  gpaLeft: { alignItems: 'center', paddingRight: 16, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.25)' },
  gpaLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  gpaValue: { fontSize: 36, fontWeight: '900', color: '#fff', marginBottom: 6 },
  gpaStats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  gpaStat: { alignItems: 'center' },
  gpaStatVal: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 2 },
  gpaStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  tabs: { flexDirection: 'row', gap: 8 },
  tabChip: { flex: 1, paddingVertical: 9, borderRadius: 20, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  tabChipActive: { backgroundColor: '#fff' },
  tabChipText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  tabChipTextActive: { color: '#1E4A8A' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  subjectCard: { marginBottom: 8, borderRadius: 14, padding: 0, overflow: 'hidden' },
  subjectRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  subjectColorBar: { width: 4, height: 56, borderRadius: 2, marginRight: 10 },
  subjectIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  subjectName: { fontSize: 14, fontWeight: '700', color: colors.text },
  subjectTeacher: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  subjectGrade: { fontSize: 18, fontWeight: '900' },
  subjectScore: { fontSize: 11, color: colors.textMuted, textAlign: 'right', marginTop: 2 },
  gradeCard: { marginBottom: 12, borderRadius: 14 },
  gradeHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  gradeColorBar: { width: 4, borderRadius: 2, alignSelf: 'stretch', marginRight: 10, minHeight: 50 },
  gradeTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  gradeName: { fontSize: 15, fontWeight: '700', color: colors.text },
  gradeLetter: { fontSize: 18, fontWeight: '900' },
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
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
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
  addGradeBtn: { paddingLeft: 8 },
  noGradesText: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic', paddingVertical: 4 },
  iconChip: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.border, marginRight: 8 },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  colorSwatch: { width: 32, height: 32, borderRadius: 16 },
  colorSwatchSelected: { borderWidth: 3, borderColor: colors.text },
});
