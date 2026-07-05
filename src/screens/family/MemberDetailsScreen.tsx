import React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { Avatar } from '../../components/common/Avatar';
import { Card } from '../../components/common/Card';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useFamilyStore } from '../../store/useFamilyStore';
import { colors } from '../../theme/colors';
import { useTranslation } from 'react-i18next';

const LOVE_LANGUAGES = ['Words of Affirmation', 'Acts of Service', 'Receiving Gifts', 'Quality Time', 'Physical Touch'];

export function MemberDetailsScreen({ route, navigation: navProp }: any) {
  const navHook = useNavigation<any>();
  const navigation = navProp ?? navHook;
  const { t } = useTranslation('family');
  const insets = useSafeAreaInsets();
  const { memberId } = route.params;

  const members = useFamilyStore((s) => s.members);
  const allTasks = useFamilyStore((s) => s.tasks);
  const allEvents = useFamilyStore((s) => s.events);
  const updateMember = useFamilyStore((s) => s.updateMember);

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

  const screenHeader = (
    <LinearGradient
      colors={[member.avatarColor + 'DD', member.avatarColor + '99', colors.background]}
      style={[styles.header, { paddingTop: insets.top + 6 }]}
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
  );

  const screenCompact = (
    <View style={{ backgroundColor: member.avatarColor + 'DD', paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={() => route.params?.source === 'dashboard' ? navigation.getParent()?.navigate('Home') : navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </Pressable>
      <Text style={styles.name}>{member.name}</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  return (
    <>
      <StatusBar style="light" />
      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: contentPaddingTop }]}
          onScroll={onScroll}
          onScrollEndDrag={onScrollEndDrag}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={scrollEventThrottle}
        >
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>{t('memberDetails.overview')}</Text>
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
          <Text style={styles.cardTitle}>{t('memberDetails.loveLanguage')}</Text>
          <Text style={styles.loveLanguageHint}>
            How {member.name} best feels appreciated. Tap to set.
          </Text>
          <View style={styles.loveLanguageChips}>
            {LOVE_LANGUAGES.map((ll) => {
              const selected = member.loveLanguage === ll;
              return (
                <Pressable
                  key={ll}
                  onPress={() => updateMember(member.id, { loveLanguage: ll })}
                  style={[styles.llChip, selected && { backgroundColor: member.avatarColor + '18', borderColor: member.avatarColor }]}
                >
                  {selected && <Ionicons name="checkmark-circle" size={14} color={member.avatarColor} />}
                  <Text style={[styles.llChipText, selected && { color: member.avatarColor, fontWeight: '800' }]}>{ll}</Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>{t('memberDetails.assignedTasks')}</Text>
          {tasks.length === 0 ? (
            <Text style={styles.empty}>{t('memberDetails.noTasks')}</Text>
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
          <Text style={styles.cardTitle}>{t('memberDetails.upcomingEvents')}</Text>
          {events.length === 0 ? (
            <Text style={styles.empty}>{t('memberDetails.noEvents')}</Text>
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
        )}
      </CollapsibleHeader>
    </>
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
  name: { fontSize: 20, fontWeight: '900', color: '#fff', marginTop: 10, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
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

  loveLanguageHint: { fontSize: 12, color: colors.textSecondary, marginBottom: 12, marginTop: -6 },
  loveLanguageChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  llChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  llChipText: { fontSize: 12.5, fontWeight: '600', color: colors.textSecondary },

  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  prioDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  itemSub: { fontSize: 12, color: colors.textSecondary, marginTop: 3, textTransform: 'capitalize' },
  empty: { fontSize: 13, color: colors.textSecondary },
});
