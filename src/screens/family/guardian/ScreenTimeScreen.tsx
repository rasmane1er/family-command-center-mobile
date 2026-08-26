import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GuardianNative } from '../../../native/GuardianNative';
import { useGuardianStore } from '../../../store/useGuardianStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { useFamilyStore } from '../../../store/useFamilyStore';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/spacing';
import { CollapsibleHeader } from '../../../components/common/CollapsibleHeader';
import type { DayOfWeek, ScheduledDowntime, ScreenTimeRule } from '../../../types';
import { useTranslation } from 'react-i18next';
import { fetchInstalledApps } from '../../../services/guardianService';

const ALL_DAYS: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: 'M',
  tue: 'T',
  wed: 'W',
  thu: 'T',
  fri: 'F',
  sat: 'S',
  sun: 'S',
};

const LIMIT_STEPS = [0, 30, 60, 90, 120, 150, 180, 240, 300, 360, 420, 480];

// Map common app display names → Android package names so the guardian can
// type a friendly name and the child's AppBlockerService gets the right package.
const COMMON_APP_PACKAGES: Record<string, string> = {
  'gmail': 'com.google.android.gm',
  'youtube': 'com.google.android.youtube',
  'chrome': 'com.android.chrome',
  'maps': 'com.google.android.apps.maps',
  'google maps': 'com.google.android.apps.maps',
  'photos': 'com.google.android.apps.photos',
  'google photos': 'com.google.android.apps.photos',
  'instagram': 'com.instagram.android',
  'tiktok': 'com.zhiliaoapp.musically',
  'snapchat': 'com.snapchat.android',
  'facebook': 'com.facebook.katana',
  'messenger': 'com.facebook.orca',
  'whatsapp': 'com.whatsapp',
  'twitter': 'com.twitter.android',
  'x': 'com.twitter.android',
  'netflix': 'com.netflix.mediaclient',
  'spotify': 'com.spotify.music',
  'discord': 'com.discord',
  'roblox': 'com.roblox.client',
  'minecraft': 'com.mojang.minecraftpe',
  'settings': 'com.android.settings',
  'play store': 'com.android.vending',
  'camera': 'com.android.camera2',
  'messages': 'com.google.android.apps.messaging',
  'phone': 'com.android.dialer',
  'contacts': 'com.android.contacts',
  'calculator': 'com.android.calculator2',
  'clock': 'com.android.deskclock',
  'reddit': 'com.reddit.frontpage',
  'pinterest': 'com.pinterest',
  'twitch': 'tv.twitch.android.app',
  'amazon': 'com.amazon.mShop.android.shopping',
  'ebay': 'com.ebay.mobile',
  'zoom': 'us.zoom.videomeetings',
  'teams': 'com.microsoft.teams',
  'outlook': 'com.microsoft.office.outlook',
  'word': 'com.microsoft.office.word',
  'excel': 'com.microsoft.office.excel',
  'chrome music lab': 'com.google.android.apps.chromecast.app',
};

function resolvePackageName(input: string): string {
  const lower = input.trim().toLowerCase();
  return COMMON_APP_PACKAGES[lower] ?? input.trim();
}

function formatLimit(mins: number) {
  if (mins === 0) return 'No Limit';
  if (mins < 60) return `${mins} min`;

  const h = Math.floor(mins / 60);
  const m = mins % 60;

  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function ScreenTimeScreen({ navigation }: any) {
  const { t } = useTranslation('family');
  const insets = useSafeAreaInsets();

  const rules = useGuardianStore((s) => s.screenTimeRules);
  const addScreenTimeRule = useGuardianStore((s) => s.addScreenTimeRule);
  const updateScreenTimeRule = useGuardianStore((s) => s.updateScreenTimeRule);
  const removeScreenTimeRule = useGuardianStore((s) => s.removeScreenTimeRule);
  const devices = useGuardianStore((s) => s.devices);

  const members = useFamilyStore((s) => s.members);
  const family = useFamilyStore((s) => s.family);

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showAddDowntime, setShowAddDowntime] = useState(false);
  const [showAddApp, setShowAddApp] = useState(false);

  const [dtLabel, setDtLabel] = useState('');
  const [dtStart, setDtStart] = useState('22:00');
  const [dtEnd, setDtEnd] = useState('07:00');
  const [dtDays, setDtDays] = useState<DayOfWeek[]>(ALL_DAYS);

  const [appInput, setAppInput] = useState('');
  const [blockedMode, setBlockedMode] = useState(true);

  // Installed apps picker state
  const [installedApps, setInstalledApps] = useState<{ packageName: string; label: string }[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsSearch, setAppsSearch] = useState('');

  const [iosPickerResult, setIosPickerResult] = useState<{
    applicationCount: number;
    categoryCount: number;
  } | null>(null);
  const [iosPickerLoading, setIosPickerLoading] = useState(false);

  const childMembers = members.filter((m) => m.role === 'child');
  const activeMemberId = selectedMemberId ?? childMembers[0]?.id ?? null;
  const activeMember = members.find((m) => m.id === activeMemberId);
  // A member can accumulate multiple ChildDevice/ScreenTimeRule rows over
  // time (re-pairing, retried rule creation — same non-uniqueness the
  // backend guards against with orderBy: lastSeen/createdAt desc, see
  // guardian.ts). Picking the plain first match here would silently target
  // a stale device or a superseded rule, so pick the most-recent one
  // client-side too instead of relying on array order.
  const memberRule = rules
    .filter((r) => r.memberId === activeMemberId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  const activeDevice = devices
    .filter((d) => d.memberId === activeMemberId)
    .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())[0];

  // Load installed apps from the child's device when the picker opens.
  const loadInstalledApps = useCallback(async () => {
    if (!activeDevice) return;
    setAppsLoading(true);
    try {
      const { apps } = await fetchInstalledApps(activeDevice.id);
      setInstalledApps(apps.sort((a, b) => a.label.localeCompare(b.label)));
    } catch {
      setInstalledApps([]);
    } finally {
      setAppsLoading(false);
    }
  }, [activeDevice]);

  const handleToggleApp = (pkg: string, currentlyBlocked: boolean) => {
    const rid = ensureRule();
    if (blockedMode) {
      const existing = memberRule?.blockedApps ?? [];
      const next = currentlyBlocked
        ? existing.filter((a) => a !== pkg)
        : [...existing, pkg];
      updateScreenTimeRule(rid, { blockedApps: next });
    } else {
      const existing = memberRule?.allowedApps ?? [];
      const next = currentlyBlocked
        ? existing.filter((a) => a !== pkg)
        : [...existing, pkg];
      updateScreenTimeRule(rid, { allowedApps: next });
    }
  };

  const ensureRule = (): string => {
    if (memberRule) return memberRule.id;

    const id = `str-${Date.now()}`;

    const newRule: ScreenTimeRule = {
      id,
      familyId: useAuthStore.getState().familyId ?? family?.id ?? '',
      memberId: activeMemberId!,
      label: `${members.find((m) => m.id === activeMemberId)?.name ?? 'Child'}'s Screen Time`,
      dailyLimitMinutes: 0,
      scheduledDowntime: [],
      blockedApps: [],
      allowedApps: [],
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    addScreenTimeRule(newRule);

    return id;
  };

  const handleLimitChange = (delta: number) => {
    if (!activeMemberId) return;

    const rid = ensureRule();
    const current = memberRule?.dailyLimitMinutes ?? 0;
    const currentIdx = LIMIT_STEPS.indexOf(current);
    const safeCurrentIdx = currentIdx >= 0 ? currentIdx : 0;
    const nextIdx = Math.max(
      0,
      Math.min(LIMIT_STEPS.length - 1, safeCurrentIdx + delta)
    );

    updateScreenTimeRule(rid, {
      dailyLimitMinutes: LIMIT_STEPS[nextIdx],
    });
  };

  const toggleDay = (day: DayOfWeek) => {
    setDtDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleAddDowntime = () => {
    if (!activeMemberId) return;

    if (!dtLabel.trim()) {
      Alert.alert(t('common.validationTitle'), t('common.validationMsg'));
      return;
    }

    const rid = ensureRule();

    const dt: ScheduledDowntime = {
      id: `dt-${Date.now()}`,
      label: dtLabel.trim(),
      days: dtDays,
      startTime: dtStart,
      endTime: dtEnd,
      isActive: true,
    };

    const existing = memberRule?.scheduledDowntime ?? [];

    updateScreenTimeRule(rid, {
      scheduledDowntime: [...existing, dt],
    });

    setDtLabel('');
    setDtStart('22:00');
    setDtEnd('07:00');
    setDtDays(ALL_DAYS);
    setShowAddDowntime(false);
  };

  const handleToggleDowntime = (dtId: string, val: boolean) => {
    if (!memberRule) return;

    updateScreenTimeRule(memberRule.id, {
      scheduledDowntime: memberRule.scheduledDowntime.map((d) =>
        d.id === dtId ? { ...d, isActive: val } : d
      ),
    });
  };

  const handleDeleteDowntime = (dtId: string) => {
    if (!memberRule) return;

    Alert.alert(t('common.removeTitle'), t('common.removeConfirmMsg'), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () =>
          updateScreenTimeRule(memberRule.id, {
            scheduledDowntime: memberRule.scheduledDowntime.filter(
              (d) => d.id !== dtId
            ),
          }),
      },
    ]);
  };

  const handleAddApp = () => {
    if (!activeMemberId || !appInput.trim()) return;

    const rid = ensureRule();
    const pkg = resolvePackageName(appInput);

    if (blockedMode) {
      const existing = memberRule?.blockedApps ?? [];
      if (existing.includes(pkg)) { setAppInput(''); setShowAddApp(false); return; }
      updateScreenTimeRule(rid, {
        blockedApps: [...existing, pkg],
      });
    } else {
      const existing = memberRule?.allowedApps ?? [];
      updateScreenTimeRule(rid, {
        allowedApps: [...existing, pkg],
      });
    }

    setAppInput('');
    setShowAddApp(false);
  };

  const handleRemoveApp = (pkg: string, type: 'blocked' | 'allowed') => {
    if (!memberRule) return;

    if (type === 'blocked') {
      updateScreenTimeRule(memberRule.id, {
        blockedApps: memberRule.blockedApps.filter((a) => a !== pkg),
      });
    } else {
      updateScreenTimeRule(memberRule.id, {
        allowedApps: memberRule.allowedApps.filter((a) => a !== pkg),
      });
    }
  };

  const handleIOSPickApps = async () => {
    setIosPickerLoading(true);

    try {
      const result = await GuardianNative.presentAppPicker();

      if (!result.cancelled) {
        setIosPickerResult({
          applicationCount: result.applicationCount,
          categoryCount: result.categoryCount,
        });
      }
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('common.errorOpeningApp'));
    } finally {
      setIosPickerLoading(false);
    }
  };

  const handleIOSClearRestrictions = async () => {
    Alert.alert(t('common.clearTitle'), t('common.clearConfirmMsg'), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await GuardianNative.clearRestrictions();
          setIosPickerResult(null);
        },
      },
    ]);
  };

  const limitIdx = LIMIT_STEPS.indexOf(memberRule?.dailyLimitMinutes ?? 0);
  const limitProgress = limitIdx >= 0 ? limitIdx / (LIMIT_STEPS.length - 1) : 0;

  const activeDowntimeCount =
    memberRule?.scheduledDowntime.filter((d) => d.isActive).length ?? 0;

  const blockedCount = memberRule?.blockedApps.length ?? 0;
  const allowedCount = memberRule?.allowedApps.length ?? 0;

  const screenHeader = (
    <LinearGradient
      colors={['#190A33', '#44206F', '#8E44AD']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + 6 }]}
    >
      <View style={styles.headerGlow} />

      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>

        <View style={styles.headerTextBlock}>
          <Text style={styles.headerEyebrow}>Guardian Controls</Text>
          <Text style={styles.headerTitle}>{t('guardian.screenTime')}</Text>
          <Text style={styles.headerSubtitle}>
            {activeMember
              ? `Manage limits for ${activeMember.name}`
              : 'Configure daily limits and restrictions'}
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Ionicons name="time" size={22} color="#fff" />
        </View>
      </View>

      <View style={styles.headerStats}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {formatLimit(memberRule?.dailyLimitMinutes ?? 0)}
          </Text>
          <Text style={styles.statLabel}>Daily Limit</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{activeDowntimeCount}</Text>
          <Text style={styles.statLabel}>Downtime</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>{blockedCount}</Text>
          <Text style={styles.statLabel}>Blocked</Text>
        </View>
      </View>

      {childMembers.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.memberScroll}
          contentContainerStyle={styles.memberScrollContent}
        >
          {childMembers.map((m) => (
            <Pressable accessibilityRole="button"
              key={m.id}
              onPress={() => setSelectedMemberId(m.id)}
              style={[
                styles.memberTab,
                activeMemberId === m.id && styles.memberTabActive,
              ]}
            >
              <View
                style={[
                  styles.memberDot,
                  { backgroundColor: m.avatarColor ?? colors.primary },
                ]}
              />
              <Text
                style={[
                  styles.memberTabText,
                  activeMemberId === m.id && styles.memberTabTextActive,
                ]}
              >
                {m.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </LinearGradient>
  );

  const screenCompact = (
    <LinearGradient
      colors={['#190A33', '#44206F']}
      style={[styles.compactHeader, { paddingTop: insets.top }]}
    >
      <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </Pressable>

      <View style={styles.compactTitleBlock}>
        <Text style={styles.compactTitle}>{t('guardian.screenTime')}</Text>
        <Text style={styles.compactSubtitle}>
          {activeMember?.name ?? 'Guardian rules'}
        </Text>
      </View>

      <View style={styles.compactBadge}>
        <Text style={styles.compactBadgeText}>{blockedCount}</Text>
      </View>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      {childMembers.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No child members</Text>
          <Text style={styles.emptyDesc}>
            Add child members to configure screen time rules.
          </Text>
        </View>
      ) : (
        <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
          {({
            onScroll,
            onScrollEndDrag,
            onMomentumScrollEnd,
            scrollEventThrottle,
            contentPaddingTop,
          }) => (
            <ScrollView
              onScroll={onScroll}
              onScrollEndDrag={onScrollEndDrag}
              onMomentumScrollEnd={onMomentumScrollEnd}
              scrollEventThrottle={scrollEventThrottle}
              contentContainerStyle={[
                styles.content,
                {
                  paddingBottom: 100,
                  paddingTop: contentPaddingTop,
                },
              ]}
            >
              {memberRule && (
                <View style={[styles.card, shadows.card]}>
                  <View style={styles.rowBetween}>
                    <View style={styles.rowLeft}>
                      <Ionicons
                        name="shield-checkmark"
                        size={18}
                        color={memberRule.isActive ? colors.success : colors.textMuted}
                      />
                      <Text style={styles.rowTitle}>Rules Active</Text>
                    </View>

                    <Switch
                      value={memberRule.isActive}
                      onValueChange={(v) =>
                        updateScreenTimeRule(memberRule.id, { isActive: v })
                      }
                      trackColor={{ false: colors.border, true: colors.success }}
                      thumbColor="#fff"
                    />
                  </View>
                </View>
              )}

              <View style={[styles.card, shadows.card]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="time" size={18} color="#8E44AD" />
                  <Text style={styles.cardTitle}>Daily Screen Time Limit</Text>
                </View>

                <Text style={styles.limitValue}>
                  {formatLimit(memberRule?.dailyLimitMinutes ?? 0)}
                </Text>

                <View style={styles.limitBarOuter}>
                  <View
                    style={[
                      styles.limitBarFill,
                      {
                        width: `${limitProgress * 100}%`,
                      },
                    ]}
                  />
                </View>

                <View style={styles.limitControls}>
                  <Pressable accessibilityRole="button"
                    style={styles.limitBtn}
                    onPress={() => handleLimitChange(-1)}
                  >
                    <Ionicons name="remove" size={20} color={colors.primary} />
                  </Pressable>

                  <Text style={styles.limitHint}>
                    Adjust in 30-minute increments · 0 = No Limit
                  </Text>

                  <Pressable accessibilityRole="button"
                    style={styles.limitBtn}
                    onPress={() => handleLimitChange(1)}
                  >
                    <Ionicons name="add" size={20} color={colors.primary} />
                  </Pressable>
                </View>
              </View>

              <View style={[styles.card, shadows.card]}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="moon" size={18} color="#6A1B9A" />
                    <Text style={styles.cardTitle}>Scheduled Downtime</Text>
                  </View>

                  <Pressable accessibilityRole="button"
                    onPress={() => setShowAddDowntime(true)}
                    style={styles.smallAddBtn}
                  >
                    <Ionicons name="add" size={18} color={colors.primary} />
                  </Pressable>
                </View>

                {(memberRule?.scheduledDowntime ?? []).length === 0 && (
                  <Text style={styles.emptyHint}>
                    No downtime windows. Tap + to add Bedtime, School Hours, etc.
                  </Text>
                )}

                {(memberRule?.scheduledDowntime ?? []).map((dt) => (
                  <View key={dt.id} style={styles.downtimeRow}>
                    <View style={styles.downtimeInfo}>
                      <Text style={styles.downtimeLabel}>{dt.label}</Text>
                      <Text style={styles.downtimeMeta}>
                        {dt.startTime} – {dt.endTime} ·{' '}
                        {dt.days.map((d) => DAY_LABELS[d]).join('')}
                      </Text>
                    </View>

                    <Switch
                      value={dt.isActive}
                      onValueChange={(v) => handleToggleDowntime(dt.id, v)}
                      trackColor={{ false: colors.border, true: '#6A1B9A' }}
                      thumbColor="#fff"
                    />

                    <Pressable accessibilityRole="button"
                      onPress={() => handleDeleteDowntime(dt.id)}
                      style={styles.deleteBtn}
                    >
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={colors.danger}
                      />
                    </Pressable>
                  </View>
                ))}
              </View>

              <View style={[styles.card, shadows.card]}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="ban" size={18} color={colors.danger} />
                    <Text style={styles.cardTitle}>Blocked Apps</Text>
                  </View>

                  <Pressable accessibilityRole="button"
                    onPress={() => {
                      setBlockedMode(true);
                      setAppsSearch('');
                      setShowAddApp(true);
                      loadInstalledApps();
                    }}
                    style={styles.smallAddBtn}
                  >
                    <Ionicons name="add" size={18} color={colors.primary} />
                  </Pressable>
                </View>

                {(memberRule?.blockedApps ?? []).length === 0 && (
                  <Text style={styles.emptyHint}>
                    No blocked apps. Add package names, for example
                    com.example.app.
                  </Text>
                )}

                {(memberRule?.blockedApps ?? []).map((pkg) => (
                  <View key={pkg} style={styles.appChipRow}>
                    <Ionicons
                      name="ban-outline"
                      size={14}
                      color={colors.danger}
                    />
                    <Text style={styles.appChipText} numberOfLines={1}>
                      {pkg}
                    </Text>
                    <Pressable accessibilityRole="button" onPress={() => handleRemoveApp(pkg, 'blocked')}>
                      <Ionicons
                        name="close-circle"
                        size={16}
                        color={colors.danger}
                      />
                    </Pressable>
                  </View>
                ))}
              </View>

              {Platform.OS === 'ios' && (
                <View style={[styles.card, shadows.card]}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="phone-portrait" size={18} color="#007AFF" />
                    <Text style={styles.cardTitle}>iOS App Restrictions</Text>
                  </View>

                  <Text style={styles.emptyHint}>
                    Use Apple's Screen Time picker to visually select apps to block.
                    Requires Family Controls authorization.
                  </Text>

                  {iosPickerResult &&
                  (iosPickerResult.applicationCount > 0 ||
                    iosPickerResult.categoryCount > 0) ? (
                    <View style={styles.iosResultRow}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={colors.success}
                      />
                      <Text style={styles.iosResultText}>
                        {iosPickerResult.applicationCount} app
                        {iosPickerResult.applicationCount !== 1 ? 's' : ''}{' '}
                        selected
                        {iosPickerResult.categoryCount > 0
                          ? `, ${iosPickerResult.categoryCount} categor${
                              iosPickerResult.categoryCount !== 1 ? 'ies' : 'y'
                            }`
                          : ''}
                      </Text>
                    </View>
                  ) : null}

                  <Pressable accessibilityRole="button"
                    style={[
                      styles.saveBtn,
                      styles.iosPickerBtn,
                      iosPickerLoading && { opacity: 0.6 },
                    ]}
                    onPress={handleIOSPickApps}
                    disabled={iosPickerLoading}
                  >
                    <Text style={styles.saveBtnText}>
                      {iosPickerLoading ? 'Opening Picker…' : 'Choose Apps to Block'}
                    </Text>
                  </Pressable>

                  {iosPickerResult && (
                    <Pressable accessibilityRole="button"
                      style={[styles.cancelBtn, { marginTop: 10 }]}
                      onPress={handleIOSClearRestrictions}
                    >
                      <Text style={styles.cancelBtnText}>Clear Restrictions</Text>
                    </Pressable>
                  )}
                </View>
              )}

              <View style={[styles.card, shadows.card]}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeader}>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={colors.success}
                    />
                    <Text style={styles.cardTitle}>Allowed Apps Only</Text>
                  </View>

                  <Pressable accessibilityRole="button"
                    onPress={() => {
                      setBlockedMode(false);
                      setAppsSearch('');
                      setShowAddApp(true);
                      loadInstalledApps();
                    }}
                    style={styles.smallAddBtn}
                  >
                    <Ionicons name="add" size={18} color={colors.primary} />
                  </Pressable>
                </View>

                <Text style={styles.emptyHint}>
                  {(memberRule?.allowedApps ?? []).length === 0
                    ? 'Empty = all apps allowed. Add package names to restrict to specific apps only.'
                    : `${allowedCount} apps on allowlist`}
                </Text>

                {(memberRule?.allowedApps ?? []).map((pkg) => (
                  <View key={pkg} style={styles.appChipRow}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={14}
                      color={colors.success}
                    />
                    <Text style={styles.appChipText} numberOfLines={1}>
                      {pkg}
                    </Text>
                    <Pressable accessibilityRole="button" onPress={() => handleRemoveApp(pkg, 'allowed')}>
                      <Ionicons
                        name="close-circle"
                        size={16}
                        color={colors.danger}
                      />
                    </Pressable>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </CollapsibleHeader>
      )}

      <Modal
        visible={showAddDowntime}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddDowntime(false)}
      >
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Downtime Window</Text>

          <Text style={styles.fieldLabel}>Label *</Text>
          <TextInput accessibilityLabel="e.g. Bedtime, School Hours"
            style={styles.input}
            placeholder="e.g. Bedtime, School Hours"
            value={dtLabel}
            onChangeText={setDtLabel}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.fieldLabel}>Start Time (HH:mm)</Text>
          <TextInput accessibilityLabel="22:00"
            style={styles.input}
            placeholder="22:00"
            value={dtStart}
            onChangeText={setDtStart}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.fieldLabel}>End Time (HH:mm)</Text>
          <TextInput accessibilityLabel="07:00"
            style={styles.input}
            placeholder="07:00"
            value={dtEnd}
            onChangeText={setDtEnd}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.fieldLabel}>Active Days</Text>
          <View style={styles.daysRow}>
            {ALL_DAYS.map((d) => (
              <Pressable accessibilityRole="button"
                key={d}
                onPress={() => toggleDay(d)}
                style={[styles.dayBtn, dtDays.includes(d) && styles.dayBtnActive]}
              >
                <Text
                  style={[
                    styles.dayBtnText,
                    dtDays.includes(d) && styles.dayBtnTextActive,
                  ]}
                >
                  {DAY_LABELS[d]}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable accessibilityRole="button" style={styles.saveBtn} onPress={handleAddDowntime}>
            <Text style={styles.saveBtnText}>Add Downtime</Text>
          </Pressable>

          <Pressable accessibilityRole="button"
            style={styles.cancelBtn}
            onPress={() => setShowAddDowntime(false)}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </Modal>

      <Modal
        visible={showAddApp}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddApp(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHandle} />
          <View style={styles.pickerHeader}>
            <Text style={styles.modalTitle}>
              {blockedMode ? 'Block Apps' : 'Allow Apps'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => setShowAddApp(false)} style={styles.pickerClose}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <TextInput accessibilityLabel="Search apps…"
            style={[styles.input, { marginHorizontal: 16, marginTop: 4 }]}
            placeholder="Search apps…"
            value={appsSearch}
            onChangeText={setAppsSearch}
            autoCapitalize="none"
            placeholderTextColor={colors.textMuted}
            clearButtonMode="while-editing"
          />

          {appsLoading ? (
            <View style={styles.pickerLoading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.pickerLoadingText}>Loading apps from child device…</Text>
            </View>
          ) : installedApps.length === 0 ? (
            <View style={styles.pickerLoading}>
              <Ionicons name="phone-portrait-outline" size={40} color={colors.textMuted} />
              <Text style={styles.pickerLoadingText}>
                No app list available yet.{'\n'}The child device syncs its app list on startup.
              </Text>
              {/* Fallback: manual entry */}
              <Text style={[styles.fieldLabel, { marginTop: 20, marginHorizontal: 16 }]}>Or enter manually:</Text>
              <TextInput accessibilityLabel="Gmail or com.example.app"
                style={[styles.input, { marginHorizontal: 16, marginTop: 4 }]}
                placeholder="Gmail or com.example.app"
                value={appInput}
                onChangeText={setAppInput}
                autoCapitalize="none"
                placeholderTextColor={colors.textMuted}
              />
              <Pressable accessibilityRole="button" style={[styles.saveBtn, { marginHorizontal: 16, marginTop: 12 }]} onPress={handleAddApp}>
                <Text style={styles.saveBtnText}>{blockedMode ? 'Block App' : 'Add to Allowlist'}</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={installedApps.filter((a) =>
                appsSearch.trim() === '' ||
                a.label.toLowerCase().includes(appsSearch.toLowerCase()) ||
                a.packageName.toLowerCase().includes(appsSearch.toLowerCase())
              )}
              keyExtractor={(item) => item.packageName}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 40 }}
              renderItem={({ item }) => {
                const isBlocked = blockedMode
                  ? (memberRule?.blockedApps ?? []).includes(item.packageName)
                  : (memberRule?.allowedApps ?? []).includes(item.packageName);
                return (
                  <Pressable accessibilityRole="button"
                    style={styles.appPickerRow}
                    onPress={() => handleToggleApp(item.packageName, isBlocked)}
                  >
                    <View style={[styles.appPickerIcon, { backgroundColor: isBlocked ? (blockedMode ? '#fef2f2' : '#f0fdf4') : '#f5f5f5' }]}>
                      <Ionicons
                        name={isBlocked ? (blockedMode ? 'ban' : 'checkmark-circle') : 'apps-outline'}
                        size={20}
                        color={isBlocked ? (blockedMode ? colors.danger : colors.success) : colors.textMuted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.appPickerLabel}>{item.label}</Text>
                      <Text style={styles.appPickerPkg} numberOfLines={1}>{item.packageName}</Text>
                    </View>
                    {isBlocked && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={blockedMode ? colors.danger : colors.success}
                      />
                    )}
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    position: 'relative',
    overflow: 'hidden',
  },

  headerGlow: {
    position: 'absolute',
    top: -70,
    right: -50,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },

  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTextBlock: { flex: 1 },

  headerEyebrow: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.58)',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 2,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.4,
  },

  headerSubtitle: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 3,
    fontWeight: '600',
  },

  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },

  headerStats: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },

  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  statValue: {
    fontSize: 8,
    fontWeight: '700',
    color: '#fff',
  },

  statLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.68)',
    marginTop: 3,
  },

  memberScroll: {
    marginTop: 2,
  },

  memberScrollContent: {
    paddingRight: 20,
  },

  memberTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  memberTabActive: {
    backgroundColor: '#fff',
  },

  memberDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  memberTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.78)',
  },

  memberTabTextActive: {
    color: '#44206F',
  },

  compactHeader: {
    paddingBottom: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  compactTitleBlock: {
    flex: 1,
    alignItems: 'center',
  },

  compactTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },

  compactSubtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 10,
    marginTop: 1,
  },

  compactBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  compactBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },

  content: { padding: 16 },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
  },

  emptyDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },

  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },

  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },

  limitValue: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },

  limitBarOuter: {
    height: 10,
    backgroundColor: colors.border,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 12,
  },

  limitBarFill: {
    height: '100%',
    backgroundColor: '#8E44AD',
    borderRadius: 5,
  },

  limitControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  limitBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  limitHint: {
    flex: 1,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },

  smallAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },

  emptyHint: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 19,
  },

  downtimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  downtimeInfo: { flex: 1 },

  downtimeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },

  downtimeMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  deleteBtn: { padding: 4 },

  appChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  appChipText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    fontFamily: 'monospace' as any,
  },

  iosPickerBtn: {
    marginTop: 14,
  },

  iosResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },

  iosResultText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.success,
  },

  modal: {
    flex: 1,
    padding: 24,
    backgroundColor: colors.background,
  },

  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },

  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 19,
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: 16,
  },

  daysRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },

  dayBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dayBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  dayBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },

  dayBtnTextActive: { color: '#fff' },

  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
  },

  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },

  cancelBtn: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },

  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  pickerClose: {
    padding: 4,
  },
  pickerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  pickerLoadingText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  appPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  appPickerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appPickerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  appPickerPkg: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
});