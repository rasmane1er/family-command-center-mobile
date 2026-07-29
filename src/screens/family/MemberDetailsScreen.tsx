import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { Avatar } from '../../components/common/Avatar';
import { Card } from '../../components/common/Card';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useHasPermission } from '../../hooks/usePermissions';
import { colors } from '../../theme/colors';
import { useTranslation } from 'react-i18next';

// Blends a hex color towards black (negative amount) or white (positive amount) —
// used to derive the header gradient's second stop from the member's avatar color
// so every member gets a header that's on-brand for them, not one fixed palette.
function shadeColor(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  const blend = (channel: number) => {
    const target = amount < 0 ? 0 : 255;
    return Math.round(channel + (target - channel) * Math.abs(amount));
  };
  const r = blend((num >> 16) & 0xff);
  const g = blend((num >> 8) & 0xff);
  const b = blend(num & 0xff);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

const LOVE_LANGUAGES = ['Words of Affirmation', 'Acts of Service', 'Receiving Gifts', 'Quality Time', 'Physical Touch'];
const LOVE_LANGUAGE_ICONS: Record<string, string> = {
  'Words of Affirmation': 'chatbubble-ellipses-outline',
  'Acts of Service': 'hand-left-outline',
  'Receiving Gifts': 'gift-outline',
  'Quality Time': 'time-outline',
  'Physical Touch': 'heart-outline',
};

function SectionTitle({ icon, color, children }: { icon: keyof typeof Ionicons.glyphMap; color?: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={[styles.sectionTitleIcon, { backgroundColor: (color ?? colors.primary) + '14' }]}>
        <Ionicons name={icon} size={15} color={color ?? colors.primary} />
      </View>
      <Text style={[styles.cardTitle, color ? { color } : null]}>{children}</Text>
    </View>
  );
}

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
  const removeMember = useFamilyStore((s) => s.removeMember);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);
  const canManageFamily = useHasPermission('manageFamily');
  const [isDeleting, setIsDeleting] = useState(false);

  const member = members.find((m) => m.id === memberId);
  const tasks = allTasks.filter((t) => t.assignedTo?.includes(memberId));
  const events = allEvents.filter((e) => e.attendees?.includes(memberId));

  const goBackToList = () =>
    route.params?.source === 'dashboard' ? navigation.getParent()?.navigate('Home') : navigation.goBack();

  const handleDeleteMember = () => {
    if (!member) return;
    Alert.alert(
      t('memberDetails.deleteMemberConfirmTitle', { name: member.name }),
      t('memberDetails.deleteMemberConfirmMsg', { name: member.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('memberDetails.deleteMember'),
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            const success = await removeMember(member.id);
            setIsDeleting(false);
            if (success) {
              goBackToList();
            } else {
              Alert.alert(t('common.error'), t('memberDetails.deleteMemberFailedMsg'));
            }
          },
        },
      ]
    );
  };

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
      colors={[member.avatarColor, shadeColor(member.avatarColor, -0.32)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + 6 }]}
    >
      <Pressable onPress={goBackToList} style={styles.backBtn} hitSlop={8}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </Pressable>

      <View style={styles.headerContent}>
        <View style={styles.avatarRing}>
          <Avatar name={member.name} color={member.avatarColor} size={84} />
        </View>
        <Text style={styles.name}>{member.name}</Text>
        <View style={styles.rolePill}>
          <Ionicons name="person" size={12} color="#fff" style={{ marginRight: 5 }} />
          <Text style={styles.roleText}>{roleLabel}</Text>
        </View>
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Ionicons name="trophy-outline" size={16} color="rgba(255,255,255,0.85)" />
            <Text style={styles.statValue}>{member.points.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="ribbon-outline" size={16} color="rgba(255,255,255,0.85)" />
            <Text style={styles.statValue}>Lv {member.level ?? 1}</Text>
            <Text style={styles.statLabel}>Level</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: member.status === 'ACTIVE' ? colors.accentLight : colors.secondaryLight },
              ]}
            />
            <Text style={styles.statValue}>
              {member.status === 'ACTIVE' ? 'Active' : member.status === 'PENDING' ? 'Pending' : 'Inactive'}
            </Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );

  const screenCompact = (
    <View style={[styles.compactBar, { backgroundColor: shadeColor(member.avatarColor, -0.15), paddingTop: insets.top }]}>
      <Pressable onPress={goBackToList} style={styles.backBtn} hitSlop={8}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </Pressable>
      <Text style={[styles.name, styles.compactName]} numberOfLines={1}>{member.name}</Text>
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
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 100 }]}>
        <Card style={styles.card} variant="outlined">
          <SectionTitle icon="stats-chart-outline">{t('memberDetails.overview')}</SectionTitle>
          <View style={styles.overviewGrid}>
            {[
              { icon: 'checkbox-outline', label: 'Pending Tasks', value: pendingTasks, color: colors.primary },
              { icon: 'warning-outline', label: 'Overdue', value: overdueTasks, color: overdueTasks > 0 ? colors.danger : colors.success },
              { icon: 'calendar-outline', label: 'Events', value: events.length, color: colors.secondary },
              { icon: 'list-outline', label: 'Total Tasks', value: tasks.length, color: '#8E44AD' },
            ].map((item) => (
              <View key={item.label} style={styles.overviewItem}>
                <View style={[styles.overviewIcon, { backgroundColor: item.color + '16' }]}>
                  <Ionicons name={item.icon as any} size={19} color={item.color} />
                </View>
                <Text style={[styles.overviewValue, { color: item.color }]}>{item.value}</Text>
                <Text style={styles.overviewLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card style={styles.card} variant="outlined">
          <SectionTitle icon="heart-outline" color={member.avatarColor}>{t('memberDetails.loveLanguage')}</SectionTitle>
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
                  style={[styles.llChip, selected && { backgroundColor: member.avatarColor + '16', borderColor: member.avatarColor }]}
                >
                  <Ionicons
                    name={selected ? 'checkmark-circle' : (LOVE_LANGUAGE_ICONS[ll] as any)}
                    size={15}
                    color={selected ? member.avatarColor : colors.textMuted}
                  />
                  <Text style={[styles.llChipText, selected && { color: member.avatarColor, fontWeight: '800' }]}>{ll}</Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card style={styles.card} variant="outlined">
          <SectionTitle icon="checkbox-outline">{t('memberDetails.assignedTasks')}</SectionTitle>
          {tasks.length === 0 ? (
            <Text style={styles.empty}>{t('memberDetails.noTasks')}</Text>
          ) : (
            tasks.slice(0, 5).map((task, idx) => {
              const prioColor =
                task.priority === 'urgent' || task.priority === 'high'
                  ? colors.danger
                  : task.priority === 'medium'
                    ? colors.warning
                    : colors.success;
              return (
                <View key={task.id} style={[styles.item, idx === Math.min(tasks.length, 5) - 1 && styles.itemLast]}>
                  <View style={[styles.prioDotWrap, { backgroundColor: prioColor + '16' }]}>
                    <View style={[styles.prioDot, { backgroundColor: prioColor }]} />
                  </View>
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

        <Card style={styles.card} variant="outlined">
          <SectionTitle icon="calendar-outline" color={colors.secondary}>{t('memberDetails.upcomingEvents')}</SectionTitle>
          {events.length === 0 ? (
            <Text style={styles.empty}>{t('memberDetails.noEvents')}</Text>
          ) : (
            events.slice(0, 5).map((event, idx) => (
              <View key={event.id} style={[styles.item, idx === Math.min(events.length, 5) - 1 && styles.itemLast]}>
                <View style={[styles.prioDotWrap, { backgroundColor: (event.color ?? colors.primary) + '16' }]}>
                  <View style={[styles.prioDot, { backgroundColor: event.color ?? colors.primary }]} />
                </View>
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

        {canManageFamily && member.id !== activeMemberId && (
          <Card style={styles.card} variant="outlined">
            <SectionTitle icon="warning-outline" color={colors.danger}>{t('memberDetails.dangerZone')}</SectionTitle>
            <Pressable onPress={handleDeleteMember} style={styles.deleteRow} disabled={isDeleting}>
              {isDeleting ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              )}
              <Text style={styles.deleteRowText}>{t('memberDetails.deleteMember')}</Text>
            </Pressable>
          </Card>
        )}
        </View>
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

  header: { paddingBottom: 40 },
  backBtn: {
    marginLeft: 16,
    marginBottom: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactBar: {
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactName: { marginTop: 0, fontSize: 16 },
  headerContent: { alignItems: 'center', paddingHorizontal: 20 },
  avatarRing: {
    padding: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  name: { fontSize: 21, fontWeight: '900', color: '#fff', marginTop: 12, letterSpacing: 0.2, textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 5 },
  rolePill: { marginTop: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  roleText: { fontSize: 12.5, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  statsCard: {
    flexDirection: 'row',
    marginTop: 22,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    paddingVertical: 14,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.35)', marginVertical: 2 },
  statValue: { fontSize: 17, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 10.5, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 0.4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },

  content: { paddingBottom: 0 },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -22,
    paddingTop: 22,
    paddingHorizontal: 16,
    shadowColor: '#0F2952',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  card: { marginBottom: 14 },
  cardTitle: { fontSize: 15.5, fontWeight: '800', color: colors.text },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 14 },
  sectionTitleIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  overviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  overviewItem: {
    flexBasis: '47%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overviewIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  overviewValue: { fontSize: 22, fontWeight: '800' },
  overviewLabel: { fontSize: 11.5, fontWeight: '600', color: colors.textSecondary, marginTop: 3, textAlign: 'center' },

  loveLanguageHint: { fontSize: 12.5, color: colors.textSecondary, marginBottom: 14, marginTop: -6, lineHeight: 17 },
  loveLanguageChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  llChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 18,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  llChipText: { fontSize: 12.5, fontWeight: '600', color: colors.textSecondary },

  deleteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  deleteRowText: { fontSize: 14, fontWeight: '700', color: colors.danger },

  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemLast: { borderBottomWidth: 0, paddingBottom: 2 },
  prioDotWrap: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  prioDot: { width: 7, height: 7, borderRadius: 4 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  itemSub: { fontSize: 12, color: colors.textSecondary, marginTop: 3, textTransform: 'capitalize' },
  empty: { fontSize: 13, color: colors.textSecondary },
});
