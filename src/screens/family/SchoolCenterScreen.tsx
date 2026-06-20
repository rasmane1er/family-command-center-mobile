import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { ProgressBar } from '../../components/common/ProgressBar';
import { useFamilyStore } from '../../store/useFamilyStore';

const grades = [
  { subject: 'Mathematics', grade: 'A', score: 94, teacher: 'Ms. Rodriguez', color: '#4ECDC4' },
  { subject: 'English', grade: 'B+', score: 88, teacher: 'Mr. Thompson', color: '#45B7D1' },
  { subject: 'Science', grade: 'A-', score: 91, teacher: 'Dr. Patel', color: '#27AE60' },
  { subject: 'History', grade: 'B', score: 84, teacher: 'Ms. Johnson', color: '#F5A623' },
  { subject: 'Art', grade: 'A+', score: 98, teacher: 'Mr. Garcia', color: '#DDA0DD' },
];

const assignments = [
  { title: 'Science Project: Solar System', dueDate: 'Tomorrow', subject: 'Science', status: 'in_progress' },
  { title: 'Math Chapter 7 Problems', dueDate: 'Friday', subject: 'Math', status: 'pending' },
  { title: 'History Essay - Civil War', dueDate: 'Next Week', subject: 'History', status: 'not_started' },
  { title: 'Book Report: Charlotte\'s Web', dueDate: 'Completed', subject: 'English', status: 'completed' },
];

export function SchoolCenterScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const members = useFamilyStore((s) => s.members);
  const children = members.filter((m) => m.role === 'child');
  const [selectedChild, setSelectedChild] = React.useState(children[0]?.id || null);

  const gpa = (grades.reduce((sum, g) => sum + g.score, 0) / grades.length / 100 * 4).toFixed(2);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#1E4A8A', '#45B7D1']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>School Center</Text>
          <Ionicons name="school" size={24} color="rgba(255,255,255,0.7)" />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 0 }}>
          {children.map((child) => (
            <Pressable
              key={child.id}
              onPress={() => setSelectedChild(child.id)}
              style={[styles.childChip, selectedChild === child.id && styles.childChipActive]}
            >
              <Text style={[styles.childChipText, selectedChild === child.id && styles.childChipTextActive]}>
                {child.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {/* GPA Card */}
        <Card style={styles.gpaCard} padding={0} variant="elevated">
          <LinearGradient colors={['#1E4A8A', '#45B7D1']} style={styles.gpaGradient}>
            <View style={styles.gpaRow}>
              <View style={styles.gpaLeft}>
                <Text style={styles.gpaLabel}>Current GPA</Text>
                <Text style={styles.gpaValue}>{gpa}</Text>
                <Badge label="Honor Roll" variant="success" size="sm" />
              </View>
              <View style={styles.gpaRight}>
                {['A', 'A-', 'B+', 'B'].map((g, i) => (
                  <View key={i} style={styles.gpaItem}>
                    <Text style={styles.gpaItemGrade}>{g}</Text>
                    <Text style={styles.gpaItemLabel}>{['Math', 'Science', 'English', 'History'][i]}</Text>
                  </View>
                ))}
              </View>
            </View>
          </LinearGradient>
        </Card>

        {/* Grades */}
        <Text style={styles.sectionTitle}>Grades by Subject</Text>
        {grades.map((g, i) => (
          <Card key={i} style={styles.gradeCard} variant="elevated">
            <View style={styles.gradeRow}>
              <View style={[styles.gradeColor, { backgroundColor: g.color }]} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.gradeHeader}>
                  <Text style={styles.gradeSubject}>{g.subject}</Text>
                  <Text style={[styles.gradeLetterGrade, { color: g.color }]}>{g.grade}</Text>
                </View>
                <Text style={styles.gradeTeacher}>{g.teacher}</Text>
                <ProgressBar progress={g.score / 100} color={g.color} height={6} style={{ marginTop: 8 }} />
                <Text style={styles.gradeScore}>{g.score}%</Text>
              </View>
            </View>
          </Card>
        ))}

        {/* Assignments */}
        <Text style={styles.sectionTitle}>Upcoming Assignments</Text>
        {assignments.map((a, i) => (
          <Card key={i} style={styles.assignmentCard} variant="elevated">
            <View style={styles.assignmentRow}>
              <View style={[
                styles.assignmentStatus,
                { backgroundColor: a.status === 'completed' ? colors.successLight : a.status === 'in_progress' ? '#FEF3E2' : '#FDEDEC' }
              ]}>
                <Ionicons
                  name={a.status === 'completed' ? 'checkmark-circle' : a.status === 'in_progress' ? 'time' : 'alert-circle'}
                  size={20}
                  color={a.status === 'completed' ? colors.success : a.status === 'in_progress' ? colors.warning : colors.danger}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.assignmentTitle, a.status === 'completed' && styles.assignmentDone]}>
                  {a.title}
                </Text>
                <View style={styles.assignmentMeta}>
                  <Badge label={a.subject} variant="primary" size="sm" />
                  <Text style={styles.assignmentDue}>Due: {a.dueDate}</Text>
                </View>
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#fff' },
  childChip: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, marginRight: 8, backgroundColor: 'rgba(255,255,255,0.15)' },
  childChipActive: { backgroundColor: '#fff' },
  childChipText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  childChipTextActive: { color: colors.primary },
  content: { padding: 16 },
  gpaCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 20 },
  gpaGradient: { padding: 20 },
  gpaRow: { flexDirection: 'row', alignItems: 'center' },
  gpaLeft: { flex: 1, alignItems: 'center', paddingRight: 20, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.2)' },
  gpaLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginBottom: 6 },
  gpaValue: { fontSize: 48, fontWeight: '800', color: '#fff', marginBottom: 8 },
  gpaRight: { flex: 1, paddingLeft: 20, gap: 8 },
  gpaItem: { flexDirection: 'row', justifyContent: 'space-between' },
  gpaItemGrade: { fontSize: 14, fontWeight: '700', color: '#fff' },
  gpaItemLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12, marginTop: 8 },
  gradeCard: { marginBottom: 10, borderRadius: 14 },
  gradeRow: { flexDirection: 'row', alignItems: 'center' },
  gradeColor: { width: 4, height: 60, borderRadius: 2 },
  gradeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  gradeSubject: { fontSize: 15, fontWeight: '700', color: colors.text },
  gradeLetterGrade: { fontSize: 20, fontWeight: '800' },
  gradeTeacher: { fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
  gradeScore: { fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: 'right' },
  assignmentCard: { marginBottom: 10, borderRadius: 14 },
  assignmentRow: { flexDirection: 'row', alignItems: 'center' },
  assignmentStatus: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  assignmentTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  assignmentDone: { textDecorationLine: 'line-through', color: colors.textSecondary },
  assignmentMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  assignmentDue: { fontSize: 12, color: colors.textSecondary },
});
