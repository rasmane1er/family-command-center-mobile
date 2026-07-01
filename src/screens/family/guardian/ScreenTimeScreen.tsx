import React, { useState } from 'react';
import {
  Alert,
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
import { useFamilyStore } from '../../../store/useFamilyStore';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/spacing';
import { CollapsibleHeader } from '../../../components/common/CollapsibleHeader';
import type { DayOfWeek, ScheduledDowntime, ScreenTimeRule } from '../../../types';

const ALL_DAYS: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: 'M', tue: 'T', wed: 'W', thu: 'T', fri: 'F', sat: 'S', sun: 'S',
};

const LIMIT_STEPS = [0, 30, 60, 90, 120, 150, 180, 240, 300, 360, 420, 480];

function formatLimit(mins: number) {
  if (mins === 0) return 'No Limit';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function ScreenTimeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const rules = useGuardianStore((s) => s.screenTimeRules);
  const addScreenTimeRule = useGuardianStore((s) => s.addScreenTimeRule);
  const updateScreenTimeRule = useGuardianStore((s) => s.updateScreenTimeRule);
  const removeScreenTimeRule = useGuardianStore((s) => s.removeScreenTimeRule);
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
  const [iosPickerResult, setIosPickerResult] = useState<{ applicationCount: number; categoryCount: number } | null>(null);
  const [iosPickerLoading, setIosPickerLoading] = useState(false);

  const childMembers = members.filter((m) => m.role === 'child');
  const activeMemberId = selectedMemberId ?? childMembers[0]?.id ?? null;
  const memberRule = rules.find((r) => r.memberId === activeMemberId);

  const ensureRule = (): string => {
    if (memberRule) return memberRule.id;
    const id = `str-${Date.now()}`;
    const newRule: ScreenTimeRule = {
      id,
      familyId: family?.id ?? 'demo-family',
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
    const nextIdx = Math.max(0, Math.min(LIMIT_STEPS.length - 1, currentIdx + delta));
    updateScreenTimeRule(rid, { dailyLimitMinutes: LIMIT_STEPS[nextIdx] });
  };

  const toggleDay = (day: DayOfWeek) => {
    setDtDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleAddDowntime = () => {
    if (!dtLabel.trim()) {
      Alert.alert('Validation', 'Please enter a label for this downtime window.');
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
    updateScreenTimeRule(rid, { scheduledDowntime: [...existing, dt] });
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
    Alert.alert('Remove', 'Remove this downtime window?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => updateScreenTimeRule(memberRule.id, {
          scheduledDowntime: memberRule.scheduledDowntime.filter((d) => d.id !== dtId),
        }),
      },
    ]);
  };

  const handleAddApp = () => {
    if (!appInput.trim()) return;
    const rid = ensureRule();
    if (blockedMode) {
      const existing = memberRule?.blockedApps ?? [];
      updateScreenTimeRule(rid, { blockedApps: [...existing, appInput.trim()] });
    } else {
      const existing = memberRule?.allowedApps ?? [];
      updateScreenTimeRule(rid, { allowedApps: [...existing, appInput.trim()] });
    }
    setAppInput('');
    setShowAddApp(false);
  };

  const handleRemoveApp = (pkg: string, type: 'blocked' | 'allowed') => {
    if (!memberRule) return;
    if (type === 'blocked') {
      updateScreenTimeRule(memberRule.id, { blockedApps: memberRule.blockedApps.filter((a) => a !== pkg) });
    } else {
      updateScreenTimeRule(memberRule.id, { allowedApps: memberRule.allowedApps.filter((a) => a !== pkg) });
    }
  };

  const handleIOSPickApps = async () => {
    setIosPickerLoading(true);
    try {
      const result = await GuardianNative.presentAppPicker();
      if (!result.cancelled) {
        setIosPickerResult({ applicationCount: result.applicationCount, categoryCount: result.categoryCount });
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to open app picker');
    } finally {
      setIosPickerLoading(false);
    }
  };

  const handleIOSClearRestrictions = async () => {
    Alert.alert('Clear Restrictions', 'Remove all iOS app restrictions?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive',
        onPress: async () => {
          await GuardianNative.clearRestrictions();
          setIosPickerResult(null);
        },
      },
    ]);
  };

  const limitIdx = LIMIT_STEPS.indexOf(memberRule?.dailyLimitMinutes ?? 0);
  const limitProgress = limitIdx >= 0 ? limitIdx / (LIMIT_STEPS.length - 1) : 0;

  return (
    <View style={styles.container}>

      {childMembers.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No child members</Text>
          <Text style={styles.emptyDesc}>Add child members to configure screen time rules</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        <LinearGradient
          colors={['#0F2952', '#1E4A8A']}
          style={[styles.header, { paddingTop: insets.top + 6 }]}
        >
          <View style={styles.headerRow}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </Pressable>
            <Text style={styles.headerTitle}>Screen Time</Text>
          </View>

          {/* Member picker */}
          {childMembers.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memberScroll}>
              {childMembers.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setSelectedMemberId(m.id)}
                  style={[
                    styles.memberTab,
                    activeMemberId === m.id && styles.memberTabActive,
                  ]}
                >
                  <Text style={[styles.memberTabText, activeMemberId === m.id && styles.memberTabTextActive]}>
                    {m.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </LinearGradient>
          {/* Active toggle */}
          {memberRule && (
            <View style={[styles.card, shadows.card]}>
              <View style={styles.rowBetween}>
                <View style={styles.rowLeft}>
                  <Ionicons name="shield-checkmark" size={18} color={memberRule.isActive ? colors.success : colors.textMuted} />
                  <Text style={styles.rowTitle}>Rules Active</Text>
                </View>
                <Switch
                  value={memberRule.isActive}
                  onValueChange={(v) => updateScreenTimeRule(memberRule.id, { isActive: v })}
                  trackColor={{ false: colors.border, true: colors.success }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          )}

          {/* Daily limit */}
          <View style={[styles.card, shadows.card]}>
            <View style={styles.cardHeader}>
              <Ionicons name="time" size={18} color="#8E44AD" />
              <Text style={styles.cardTitle}>Daily Screen Time Limit</Text>
            </View>
            <Text style={styles.limitValue}>{formatLimit(memberRule?.dailyLimitMinutes ?? 0)}</Text>
            <View style={styles.limitBarOuter}>
              <View style={[styles.limitBarFill, { width: `${limitProgress * 100}%` }]} />
            </View>
            <View style={styles.limitControls}>
              <Pressable style={styles.limitBtn} onPress={() => handleLimitChange(-1)}>
                <Ionicons name="remove" size={20} color={colors.primary} />
              </Pressable>
              <Text style={styles.limitHint}>Tap to adjust in 30-min increments · 0 = No Limit</Text>
              <Pressable style={styles.limitBtn} onPress={() => handleLimitChange(1)}>
                <Ionicons name="add" size={20} color={colors.primary} />
              </Pressable>
            </View>
          </View>

          {/* Scheduled downtime */}
          <View style={[styles.card, shadows.card]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeader}>
                <Ionicons name="moon" size={18} color="#6A1B9A" />
                <Text style={styles.cardTitle}>Scheduled Downtime</Text>
              </View>
              <Pressable onPress={() => setShowAddDowntime(true)} style={styles.smallAddBtn}>
                <Ionicons name="add" size={18} color={colors.primary} />
              </Pressable>
            </View>

            {(memberRule?.scheduledDowntime ?? []).length === 0 && (
              <Text style={styles.emptyHint}>No downtime windows. Tap + to add Bedtime, School Hours, etc.</Text>
            )}

            {(memberRule?.scheduledDowntime ?? []).map((dt) => (
              <View key={dt.id} style={styles.downtimeRow}>
                <View style={styles.downtimeInfo}>
                  <Text style={styles.downtimeLabel}>{dt.label}</Text>
                  <Text style={styles.downtimeMeta}>
                    {dt.startTime} – {dt.endTime} · {dt.days.map((d) => DAY_LABELS[d]).join('')}
                  </Text>
                </View>
                <Switch
                  value={dt.isActive}
                  onValueChange={(v) => handleToggleDowntime(dt.id, v)}
                  trackColor={{ false: colors.border, true: '#6A1B9A' }}
                  thumbColor="#fff"
                />
                <Pressable onPress={() => handleDeleteDowntime(dt.id)} style={styles.deleteBtn}>
                  <Ionicons name="close-circle" size={18} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </View>

          {/* Blocked apps */}
          <View style={[styles.card, shadows.card]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeader}>
                <Ionicons name="ban" size={18} color={colors.danger} />
                <Text style={styles.cardTitle}>Blocked Apps</Text>
              </View>
              <Pressable
                onPress={() => { setBlockedMode(true); setShowAddApp(true); }}
                style={styles.smallAddBtn}
              >
                <Ionicons name="add" size={18} color={colors.primary} />
              </Pressable>
            </View>
            {(memberRule?.blockedApps ?? []).length === 0 && (
              <Text style={styles.emptyHint}>No blocked apps. Add package names (e.g. com.example.app)</Text>
            )}
            {(memberRule?.blockedApps ?? []).map((pkg) => (
              <View key={pkg} style={styles.appChipRow}>
                <Ionicons name="ban-outline" size={14} color={colors.danger} />
                <Text style={styles.appChipText} numberOfLines={1}>{pkg}</Text>
                <Pressable onPress={() => handleRemoveApp(pkg, 'blocked')}>
                  <Ionicons name="close-circle" size={16} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </View>

          {/* iOS App Restrictions (FamilyActivityPicker) */}
          {Platform.OS === 'ios' && (
            <View style={[styles.card, shadows.card]}>
              <View style={styles.cardHeader}>
                <Ionicons name="phone-portrait" size={18} color="#007AFF" />
                <Text style={styles.cardTitle}>iOS App Restrictions</Text>
              </View>
              <Text style={styles.emptyHint}>
                Use Apple's Screen Time picker to visually select apps to block. Requires Family Controls authorization.
              </Text>
              {iosPickerResult && !iosPickerResult.applicationCount && !iosPickerResult.categoryCount ? null : iosPickerResult ? (
                <View style={styles.iosResultRow}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.iosResultText}>
                    {iosPickerResult.applicationCount} app{iosPickerResult.applicationCount !== 1 ? 's' : ''} selected
                    {iosPickerResult.categoryCount > 0 ? `, ${iosPickerResult.categoryCount} categor${iosPickerResult.categoryCount !== 1 ? 'ies' : 'y'}` : ''}
                  </Text>
                </View>
              ) : null}
              <Pressable
                style={[styles.saveBtn, { marginTop: 14 }, iosPickerLoading && { opacity: 0.6 }]}
                onPress={handleIOSPickApps}
                disabled={iosPickerLoading}
              >
                <Text style={styles.saveBtnText}>
                  {iosPickerLoading ? 'Opening Picker…' : 'Choose Apps to Block'}
                </Text>
              </Pressable>
              {iosPickerResult && (
                <Pressable style={[styles.cancelBtn, { marginTop: 10 }]} onPress={handleIOSClearRestrictions}>
                  <Text style={styles.cancelBtnText}>Clear Restrictions</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Allowed apps (allowlist) */}
          <View style={[styles.card, shadows.card]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeader}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={styles.cardTitle}>Allowed Apps Only</Text>
              </View>
              <Pressable
                onPress={() => { setBlockedMode(false); setShowAddApp(true); }}
                style={styles.smallAddBtn}
              >
                <Ionicons name="add" size={18} color={colors.primary} />
              </Pressable>
            </View>
            <Text style={styles.emptyHint}>
              {(memberRule?.allowedApps ?? []).length === 0
                ? 'Empty = all apps allowed. Add package names to restrict to specific apps only.'
                : `${memberRule!.allowedApps.length} apps on allowlist`}
            </Text>
            {(memberRule?.allowedApps ?? []).map((pkg) => (
              <View key={pkg} style={styles.appChipRow}>
                <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
                <Text style={styles.appChipText} numberOfLines={1}>{pkg}</Text>
                <Pressable onPress={() => handleRemoveApp(pkg, 'allowed')}>
                  <Ionicons name="close-circle" size={16} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Add Downtime Modal */}
      <Modal visible={showAddDowntime} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddDowntime(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Downtime Window</Text>

          <Text style={styles.fieldLabel}>Label *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Bedtime, School Hours"
            value={dtLabel}
            onChangeText={setDtLabel}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.fieldLabel}>Start Time (HH:mm)</Text>
          <TextInput
            style={styles.input}
            placeholder="22:00"
            value={dtStart}
            onChangeText={setDtStart}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.fieldLabel}>End Time (HH:mm)</Text>
          <TextInput
            style={styles.input}
            placeholder="07:00"
            value={dtEnd}
            onChangeText={setDtEnd}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.fieldLabel}>Active Days</Text>
          <View style={styles.daysRow}>
            {ALL_DAYS.map((d) => (
              <Pressable
                key={d}
                onPress={() => toggleDay(d)}
                style={[styles.dayBtn, dtDays.includes(d) && styles.dayBtnActive]}
              >
                <Text style={[styles.dayBtnText, dtDays.includes(d) && styles.dayBtnTextActive]}>
                  {DAY_LABELS[d]}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={styles.saveBtn} onPress={handleAddDowntime}>
            <Text style={styles.saveBtnText}>Add Downtime</Text>
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={() => setShowAddDowntime(false)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </Modal>

      {/* Add App Modal */}
      <Modal visible={showAddApp} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddApp(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{blockedMode ? 'Block App' : 'Allow App'}</Text>
          <Text style={styles.modalSubtitle}>
            Enter the package name (Android) or bundle ID (iOS), e.g. com.instagram.android
          </Text>
          <TextInput
            style={styles.input}
            placeholder="com.example.app"
            value={appInput}
            onChangeText={setAppInput}
            autoCapitalize="none"
            placeholderTextColor={colors.textMuted}
            autoFocus
          />
          <Pressable style={styles.saveBtn} onPress={handleAddApp}>
            <Text style={styles.saveBtnText}>{blockedMode ? 'Block App' : 'Add to Allowlist'}</Text>
          </Pressable>
          <Pressable style={[styles.cancelBtn, { marginTop: 10 }]} onPress={() => setShowAddApp(false)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: { paddingHorizontal: 20, paddingBottom: 8 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },

  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: '#fff' },

  memberScroll: { marginTop: 4 },

  memberTab: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
    marginRight: 8, borderTopLeftRadius: 10, borderTopRightRadius: 10,
  },

  memberTabActive: { backgroundColor: colors.background },

  memberTabText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },

  memberTabTextActive: { color: colors.primary },

  content: { padding: 16 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 16 },

  emptyDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 6, textAlign: 'center' },

  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 14 },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.text },

  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },

  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },

  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },

  limitValue: { fontSize: 32, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 12 },

  limitBarOuter: { height: 10, backgroundColor: colors.border, borderRadius: 5, overflow: 'hidden', marginBottom: 12 },

  limitBarFill: { height: '100%', backgroundColor: '#8E44AD', borderRadius: 5 },

  limitControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  limitBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },

  limitHint: { flex: 1, fontSize: 11, color: colors.textMuted, textAlign: 'center' },

  smallAddBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.border,
  },

  emptyHint: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },

  downtimeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border,
  },

  downtimeInfo: { flex: 1 },

  downtimeLabel: { fontSize: 14, fontWeight: '600', color: colors.text },

  downtimeMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  deleteBtn: { padding: 4 },

  appChipRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border,
  },

  appChipText: { flex: 1, fontSize: 13, color: colors.text, fontFamily: 'monospace' as any },

  modal: { flex: 1, padding: 24, backgroundColor: colors.background },

  modalHandle: {
    width: 40, height: 4, backgroundColor: colors.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 24,
  },

  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 6 },

  modalSubtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 20 },

  fieldLabel: {
    fontSize: 12, fontWeight: '700', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },

  input: {
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    fontSize: 15, color: colors.text, borderWidth: 1.5, borderColor: colors.border,
    marginBottom: 16,
  },

  daysRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },

  dayBtn: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
  },

  dayBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },

  dayBtnText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },

  dayBtnTextActive: { color: '#fff' },

  saveBtn: {
    backgroundColor: colors.primary, borderRadius: 14, padding: 16,
    alignItems: 'center', marginBottom: 10,
  },

  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  cancelBtn: {
    backgroundColor: colors.card, borderRadius: 14, padding: 16,
    alignItems: 'center', borderWidth: 1.5, borderColor: colors.border,
  },

  cancelBtnText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },

  iosResultRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },

  iosResultText: { fontSize: 13, fontWeight: '600', color: colors.success },
});
