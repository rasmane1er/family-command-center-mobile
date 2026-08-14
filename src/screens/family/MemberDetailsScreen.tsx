import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
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
import type { MemberRole } from '../../types';

const ROLE_OPTIONS: MemberRole[] = ['parent', 'guardian', 'grandparent', 'caregiver', 'child'];

// Header — dark, glowing "profile card" look, independent of the member's
// own brand color (which is used only for the avatar/pill accent).
const HEADER_BG_TOP = '#181234';
const HEADER_BG_BOTTOM = '#100C29';
const GLOW_COLOR = '#7C6CF0';
const ROLE_PILL_BG = '#5B4FE0';
const STAT_TINTS = {
  points: { bg: 'rgba(139,109,246,0.18)', icon: '#8B6DF6' },
  level: { bg: 'rgba(74,110,246,0.18)', icon: '#4A6EF6' },
  statusActive: { bg: 'rgba(34,197,148,0.16)', icon: '#22C594' },
  statusInactive: { bg: 'rgba(148,163,184,0.16)', icon: '#94A3B8' },
};

// Overview tiles — vivid, saturated icon-badge colors (deliberately more
// vivid than colors.primary, which is a very dark navy unsuited to a small
// icon chip).
const OVERVIEW_COLORS = {
  pending: '#4F6EF7',
  overdueClear: '#1FAA6D',
  overdueActive: '#EF4444',
  events: '#F5A623',
  total: '#8B5CF6',
};

// Names are sometimes stored ALL CAPS (however the user typed them at
// signup) — displaying that verbatim in a large bold header reads as
// shouting, so the header always shows a normalized title-case form.
function titleCase(name: string): string {
  return name
    .toLowerCase()
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
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

// Small dot-grid decoration for the header's top-right corner.
function DotGrid() {
  const rows = 5;
  const cols = 6;
  return (
    <View style={styles.dotGrid} pointerEvents="none">
      {Array.from({ length: rows }).map((_, r) => (
        <View key={r} style={styles.dotGridRow}>
          {Array.from({ length: cols }).map((_, c) => (
            <View key={c} style={styles.dotGridDot} />
          ))}
        </View>
      ))}
    </View>
  );
}

// A soft "liquid pool" wave hugging the bottom edge of a stat/overview card,
// tinted to match that card's accent color.
function CardWave({ color, opacity = 0.5 }: { color: string; opacity?: number }) {
  return (
    <Svg width="100%" height={46} viewBox="0 0 200 46" style={styles.cardWave} pointerEvents="none">
      <Path
        d="M0 22 C 40 4, 80 40, 120 20 S 180 4, 200 18 V 46 H 0 Z"
        fill={color}
        opacity={opacity}
      />
    </Svg>
  );
}

// Oversized, near-invisible copy of a tile's own icon bleeding off its edge —
// a background watermark rather than a functional element.
function Watermark({ icon, color }: { icon: keyof typeof Ionicons.glyphMap; color: string }) {
  return (
    <View style={styles.watermarkWrap} pointerEvents="none">
      <Ionicons name={icon} size={92} color={color} style={{ opacity: 0.08 }} />
    </View>
  );
}

function Sparkle({ top, left, size = 10, opacity = 0.35 }: { top: number; left: number; size?: number; opacity?: number }) {
  return (
    <Ionicons
      name="sparkles"
      size={size}
      color={colors.textMuted}
      style={{ position: 'absolute', top, left, opacity }}
    />
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

  const handleChangeRole = () => {
    if (!member || !canManageFamily || member.id === activeMemberId) return;
    Alert.alert(
      'Change Role',
      `Select a new role for ${titleCase(member.name)}`,
      [
        ...ROLE_OPTIONS.filter((r) => r !== member.role).map((r) => ({
          text: r.charAt(0).toUpperCase() + r.slice(1),
          onPress: () => updateMember(member.id, { role: r }),
        })),
        { text: t('common.cancel'), style: 'cancel' as const },
      ],
    );
  };

  if (!member) {
    return (
      <View style={styles.center}>
        <StatusBar style="dark" />
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backBtnLight}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.notFound}>Member not found</Text>
      </View>
    );
  }

  const roleLabel = member.role.charAt(0).toUpperCase() + member.role.slice(1);
  const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
  const overdueTasks = tasks.filter((t) => t.status === 'overdue').length;

  const isActive = member.status === 'ACTIVE';
  const statusTint = isActive ? STAT_TINTS.statusActive : STAT_TINTS.statusInactive;
  const statusLabel = member.status === 'ACTIVE' ? 'Active' : member.status === 'PENDING' ? 'Pending' : 'Inactive';

  const screenHeader = (
    <LinearGradient
      colors={[HEADER_BG_TOP, HEADER_BG_BOTTOM]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + 6 }]}
    >
      {/* Decoration layer — glow blooms behind the avatar, dot grid top-right,
          a soft darker swoosh bottom-left. All non-interactive. */}
      <View style={styles.glowOuter} pointerEvents="none" />
      <View style={styles.glowMid} pointerEvents="none" />
      <View style={styles.glowInner} pointerEvents="none" />
      <View style={styles.swoosh} pointerEvents="none" />
      <DotGrid />

      <Pressable accessibilityRole="button" onPress={goBackToList} style={styles.backBtn} hitSlop={8}>
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </Pressable>

      <View style={styles.headerContent}>
        <View style={styles.avatarRing}>
          <Avatar name={member.name} color={member.avatarColor} size={104} />
        </View>
        <Text style={styles.name}>{titleCase(member.name)}</Text>
        <Pressable accessibilityRole="button"
          style={styles.rolePill}
          onPress={canManageFamily && member.id !== activeMemberId ? handleChangeRole : undefined}
          hitSlop={6}
        >
          <Ionicons name="people" size={14} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.roleText}>{roleLabel}</Text>
          {canManageFamily && member.id !== activeMemberId && <Ionicons name="chevron-down" size={14} color="#fff" style={{ marginLeft: 4 }} />}
        </Pressable>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: STAT_TINTS.points.bg }]}>
            <View style={[styles.statIconWrap, { backgroundColor: STAT_TINTS.points.icon + '33' }]}>
              <Ionicons name="trophy" size={18} color={STAT_TINTS.points.icon} />
            </View>
            <View>
              <Text style={styles.statValue}>{member.points.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: STAT_TINTS.level.bg }]}>
            <View style={[styles.statIconWrap, { backgroundColor: STAT_TINTS.level.icon + '33' }]}>
              <Ionicons name="ribbon" size={18} color={STAT_TINTS.level.icon} />
            </View>
            <View>
              <Text style={styles.statValue}>Lv {member.level ?? 1}</Text>
              <Text style={styles.statLabel}>Level</Text>
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: statusTint.bg }]}>
            <View style={[styles.statIconWrap, { backgroundColor: statusTint.icon + '33' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusTint.icon }]} />
            </View>
            <View>
              <Text style={[styles.statValue, { color: statusTint.icon }]}>{statusLabel}</Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
          </View>
        </View>
      </View>
    </LinearGradient>
  );

  const screenCompact = (
    <View style={[styles.compactBar, { backgroundColor: HEADER_BG_BOTTOM, paddingTop: insets.top }]}>
      <Pressable accessibilityRole="button" onPress={goBackToList} style={styles.backBtn} hitSlop={8}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </Pressable>
      <Text style={[styles.name, styles.compactName]} numberOfLines={1}>{titleCase(member.name)}</Text>
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
              { icon: 'checkmark-done' as const, label: 'Pending Tasks', value: pendingTasks, color: OVERVIEW_COLORS.pending },
              { icon: 'alert-circle' as const, label: 'Overdue', value: overdueTasks, color: overdueTasks > 0 ? OVERVIEW_COLORS.overdueActive : OVERVIEW_COLORS.overdueClear },
              { icon: 'calendar' as const, label: 'Events', value: events.length, color: OVERVIEW_COLORS.events },
              { icon: 'list' as const, label: 'Total Tasks', value: tasks.length, color: OVERVIEW_COLORS.total },
            ].map((item) => (
              <View key={item.label} style={styles.overviewItem}>
                <Watermark icon={item.icon} color={item.color} />
                <Sparkle top={14} left={130} />
                <Sparkle top={44} left={148} size={7} opacity={0.25} />
                <View style={[styles.overviewIcon, { backgroundColor: item.color }]}>
                  <Ionicons name={item.icon} size={20} color="#fff" />
                </View>
                <Text style={styles.overviewValue}>{item.value}</Text>
                <Text style={styles.overviewLabel}>{item.label}</Text>
                <CardWave color={item.color} opacity={0.1} />
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
                <Pressable accessibilityRole="button"
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
            <Pressable accessibilityRole="button" onPress={handleDeleteMember} style={styles.deleteRow} disabled={isDeleting}>
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

  header: { paddingBottom: 30, overflow: 'hidden' },
  glowOuter: {
    position: 'absolute',
    top: -50,
    alignSelf: 'center',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: GLOW_COLOR,
    opacity: 0.12,
  },
  glowMid: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: GLOW_COLOR,
    opacity: 0.16,
  },
  glowInner: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: GLOW_COLOR,
    opacity: 0.24,
  },
  swoosh: {
    position: 'absolute',
    bottom: -30,
    left: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#000',
    opacity: 0.16,
    transform: [{ rotate: '18deg' }],
  },
  dotGrid: { position: 'absolute', top: 14, right: 14 },
  dotGridRow: { flexDirection: 'row' },
  dotGridDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.25)', margin: 2.5 },
  backBtn: {
    marginLeft: 16,
    marginBottom: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
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
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
  name: { fontSize: 21, fontWeight: '800', color: '#fff', marginTop: 12, letterSpacing: -0.2 },
  rolePill: {
    marginTop: 8, flexDirection: 'row', alignItems: 'center',
    backgroundColor: ROLE_PILL_BG, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 4, elevation: 2,
  },
  roleText: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.3, color: '#fff' },
  statsRow: {
    flexDirection: 'row',
    marginTop: 22,
    width: '100%',
    gap: 10,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 15, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 9.5, fontWeight: '600', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5 },
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
    paddingVertical: 18,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0F2952',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  overviewIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    zIndex: 2,
  },
  overviewValue: { fontSize: 23, fontWeight: '900', color: colors.text, zIndex: 2 },
  overviewLabel: { fontSize: 11.5, fontWeight: '600', color: colors.textSecondary, marginTop: 4, textAlign: 'center', zIndex: 2 },
  cardWave: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  watermarkWrap: { position: 'absolute', bottom: -18, right: -18 },

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
