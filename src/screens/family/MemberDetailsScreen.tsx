import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../components/common/Avatar';
import { Card } from '../../components/common/Card';
import { useFamilyStore } from '../../store/useFamilyStore';
import { colors } from '../../theme/colors';

export function MemberDetailsScreen({ route }: any) {
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
        <Text>Member not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Avatar name={member.name} color={member.avatarColor} size={72} />
        <Text style={styles.name}>{member.name}</Text>
        <Text style={styles.role}>{member.role}</Text>
        <Text style={styles.points}>
          {member.points.toLocaleString()} points
        </Text>
      </View>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Today</Text>

        <View style={styles.row}>
          <Ionicons name="checkbox-outline" size={20} color={colors.primary} />
          <Text style={styles.rowText}>{tasks.length} assigned tasks</Text>
        </View>

        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          <Text style={styles.rowText}>{events.length} upcoming events</Text>
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Assigned Tasks</Text>

        {tasks.length === 0 ? (
          <Text style={styles.empty}>No tasks assigned.</Text>
        ) : (
          tasks.map((task) => (
            <View key={task.id} style={styles.item}>
              <Text style={styles.itemTitle}>{task.title}</Text>
              <Text style={styles.itemSub}>
                {task.priority} • {task.status}
              </Text>
            </View>
          ))
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Schedule</Text>

        {events.length === 0 ? (
          <Text style={styles.empty}>No events scheduled.</Text>
        ) : (
          events.map((event) => (
            <View key={event.id} style={styles.item}>
              <Text style={styles.itemTitle}>{event.title}</Text>
              <Text style={styles.itemSub}>
                {new Date(event.startDate).toLocaleDateString()}
              </Text>
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    alignItems: 'center',
    paddingVertical: 24,
  },

  name: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginTop: 12,
  },

  role: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },

  points: {
    fontSize: 13,
    color: colors.primary,
    marginTop: 6,
    fontWeight: '700',
  },

  card: {
    marginBottom: 14,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },

  rowText: {
    fontSize: 14,
    color: colors.text,
  },

  item: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },

  itemSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },

  empty: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});