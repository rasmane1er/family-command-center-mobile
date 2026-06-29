import React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { Avatar } from '../../components/common/Avatar';
import { Card } from '../../components/common/Card';
import { useFamilyStore } from '../../store/useFamilyStore';
import { colors } from '../../theme/colors';

export function MemberDetailsScreen({ route, navigation: navProp }: any) {
  const navHook = useNavigation<any>();
  const navigation = navProp ?? navHook;
  const insets = useSafeAreaInsets();
  const { memberId } = route.params;

  const members = useFamilyStore((s) => s.members);
  const allTasks = useFamilyStore((s) => s.tasks);
  const allEvents = useFamilyStore((s) => s.events);

  const member = members.find((m) => m.id === memberId);
  const tasks = allTasks.filter((t) => t.assignedTo?.includes(memberId));
  const events = allEvents.filter((e) => e.attendees?.includes(memberId));

  if (!member) {
    return (
      <View style={styles.center}>
        <StatusBar style="dark" />
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtnLight}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.notFound}>Member not found</Text>
      </View>
    );
  }

  const roleLabel = member.role.charAt(0).toUpperCase() + member.role.slice(1);
  const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
  const overdueTasks = tasks.filter((t) => t.status === 'overdue').length;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={[member.avatarColor + 'DD', member.avatarColor + '99', colors.background]}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <Pressable onPress={() => route.params?.source === 'dashboard' ? navigation.getParent()?.navigate('Home') : navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>

        <View style={styles.headerContent}>
          <Avatar name={member.name} color={member.avatarColor} size={80} />
          <Text style={styles.name}>{member.name}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>{roleLabel}</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{member.points.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>Lv {member.level ?? 1}</Text>
              <Text style={styles.statLabel}>Level</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: member.status === 'active' ? colors.success : colors.warning }]}>
                {member.status ?? 'active'}
              </Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Overview</Text>
          <View style={styles.overviewGrid}>
            {[
              { icon: 'checkbox-outline', label: 'Pending Tasks', value: pendingTasks, color: colors.primary },
              { icon: 'warning-outline', label: 'Overdue', value: overdueTasks, color: overdueTasks > 0 ? colors.danger : colors.success },
              { icon: 'calendar-outline', label: 'Events', value: events.length, color: '#F5A623' },
              { icon: 'list-outline', label: 'Total Tasks', value: tasks.length, color: '#8E44AD' },
            ].map((item) => (
              <View key={item.label} style={styles.overviewItem}>
                <View style={[styles.overviewIcon, { backgroundColor: item.color + '18' }]}>
                  <Ionicons name={item.icon as any} size={18} color={item.color} />
                </View>
                <Text style={[styles.overviewValue, { color: item.color }]}>{item.value}</Text>
                <Text style={styles.overviewLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Assigned Tasks</Text>
          {tasks.length === 0 ? (
            <Text style={styles.empty}>No tasks assigned.</Text>
          ) : (
            tasks.slice(0, 5).map((task) => {
              const prioColor =
                task.priority === 'urgent' || task.priority === 'high'
                  ? colors.danger
                  : task.priority === 'medium'
                    ? colors.warning
                    : colors.success;
              return (
                <View key={task.id} style={styles.item}>
                  <View style={[styles.prioDot, { backgroundColor: prioColor }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{task.title}</Text>
                    <Text style={styles.itemSub}>
                      {task.priority} priority • {task.status}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Upcoming Events</Text>
          {events.length === 0 ? (
            <Text style={styles.empty}>No events scheduled.</Text>
          ) : (
            events.slice(0, 5).map((event) => (
              <View key={event.id} style={styles.item}>
                <View style={[styles.prioDot, { backgroundColor: event.color ?? colors.primary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{event.title}</Text>
                  <Text style={styles.itemSub}>
                    {new Date(event.startDate).toLocaleDateString()}
                    {event.location ? ` • ${event.location}` : ''}
                  </Text>
                </View>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  notFound: { fontSize: 16, color: colors.textSecondary, marginTop: 16 },
  backBtnLight: { position: 'absolute', top: 56, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },

  header: { paddingBottom: 28 },
  backBtn: {
    marginLeft: 16,
    marginBottom: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: { alignItems: 'center', paddingHorizontal: 20 },
  name: { fontSize: 26, fontWeight: '900', color: '#fff', marginTop: 10, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  rolePill: { marginTop: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4 },
  roleText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  statsRow: { flexDirection: 'row', marginTop: 18, gap: 0 },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginVertical: 4 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2, textTransform: 'capitalize' },

  content: { padding: 16, paddingBottom: 100 },
  card: { marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 14 },

  overviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  overviewItem: { width: '47%', alignItems: 'center', padding: 12, borderRadius: 14, backgroundColor: colors.background },
  overviewIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  overviewValue: { fontSize: 20, fontWeight: '800' },
  overviewLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2, textAlign: 'center' },

  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  prioDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  itemSub: { fontSize: 12, color: colors.textSecondary, marginTop: 3, textTransform: 'capitalize' },
  empty: { fontSize: 13, color: colors.textSecondary },
});
