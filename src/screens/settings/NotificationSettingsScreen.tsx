import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, Pressable, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotificationSettingsStore } from '../../store/useNotificationSettingsStore';
import { requestPermissions } from '../../services/NotificationService';
import { colors } from '../../theme/colors';

const ADVANCE_DAYS_OPTIONS = [1, 2, 3, 5, 7];
const ADVANCE_MINUTES_OPTIONS = [15, 30, 60, 120];

export function NotificationSettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const settings = useNotificationSettingsStore();
  const [testing, setTesting] = useState(false);

  const handleTestNotification = async () => {
    setTesting(true);
    const granted = await requestPermissions();
    if (!granted) {
      Alert.alert('Permission Required', 'Please enable notifications in your device settings.');
      setTesting(false);
      return;
    }
    const { scheduleAt } = await import('../../services/NotificationService');
    const { SchedulableTriggerInputTypes } = await import('expo-notifications');
    await scheduleAt(
      'test-notification',
      '🔔 Test Notification',
      'Family Command Center notifications are working!',
      { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3, repeats: false },
    );
    Alert.alert('Test Sent', 'You should receive a notification in 3 seconds.');
    setTesting(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#1A237E', '#283593']} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <Text style={styles.headerSub}>Control what alerts you receive</Text>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Master toggle */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBg, { backgroundColor: '#E8EAF6' }]}>
                <Ionicons name="notifications" size={22} color="#1A237E" />
              </View>
              <View>
                <Text style={styles.rowTitle}>All Notifications</Text>
                <Text style={styles.rowSub}>Master on/off switch</Text>
              </View>
            </View>
            <Switch
              value={settings.masterEnabled}
              onValueChange={settings.setMasterEnabled}
              trackColor={{ false: colors.border, true: '#1A237E' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {!settings.masterEnabled && (
          <View style={styles.disabledBanner}>
            <Ionicons name="notifications-off-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.disabledText}>All notifications are currently disabled</Text>
          </View>
        )}

        {/* Category toggles */}
        <Text style={styles.sectionLabel}>CATEGORIES</Text>

        <View style={styles.section}>
          <CategoryRow
            icon="card" iconBg="#E8F5E9" iconColor="#27AE60"
            title="Bill Reminders"
            sub={`${settings.billsAdvanceDays} days before due`}
            value={settings.bills && settings.masterEnabled}
            disabled={!settings.masterEnabled}
            onToggle={(v) => settings.setSetting('bills', v)}
          />
          <Divider />
          {settings.bills && settings.masterEnabled && (
            <>
              <AdvanceDaysPicker
                label="Remind me"
                options={ADVANCE_DAYS_OPTIONS}
                selected={settings.billsAdvanceDays}
                unit="days before"
                onSelect={(v) => settings.setSetting('billsAdvanceDays', v)}
              />
              <Divider />
            </>
          )}

          <CategoryRow
            icon="basket" iconBg="#FFF8E1" iconColor="#F5A623"
            title="Pantry Alerts"
            sub="Low stock warnings"
            value={settings.pantry && settings.masterEnabled}
            disabled={!settings.masterEnabled}
            onToggle={(v) => settings.setSetting('pantry', v)}
          />
          <Divider />

          <CategoryRow
            icon="medical" iconBg="#FCE4EC" iconColor="#E91E63"
            title="Medication Reminders"
            sub="Daily scheduled reminders"
            value={settings.medications && settings.masterEnabled}
            disabled={!settings.masterEnabled}
            onToggle={(v) => settings.setSetting('medications', v)}
          />
          <Divider />

          <CategoryRow
            icon="gift" iconBg="#F3E5F5" iconColor="#9C27B0"
            title="Birthday Reminders"
            sub={`${settings.birthdaysAdvanceDays} days in advance`}
            value={settings.birthdays && settings.masterEnabled}
            disabled={!settings.masterEnabled}
            onToggle={(v) => settings.setSetting('birthdays', v)}
          />
          <Divider />
          {settings.birthdays && settings.masterEnabled && (
            <>
              <AdvanceDaysPicker
                label="Remind me"
                options={ADVANCE_DAYS_OPTIONS}
                selected={settings.birthdaysAdvanceDays}
                unit="days before"
                onSelect={(v) => settings.setSetting('birthdaysAdvanceDays', v)}
              />
              <Divider />
            </>
          )}

          <CategoryRow
            icon="leaf" iconBg="#E8F5E9" iconColor="#4CAF50"
            title="Garden Reminders"
            sub="Daily 8:00 AM watering alerts"
            value={settings.garden && settings.masterEnabled}
            disabled={!settings.masterEnabled}
            onToggle={(v) => settings.setSetting('garden', v)}
          />
          <Divider />

          <CategoryRow
            icon="calendar" iconBg="#E3F2FD" iconColor="#1565C0"
            title="Calendar Events"
            sub={`${settings.calendarAdvanceMinutes >= 60 ? `${settings.calendarAdvanceMinutes / 60}h` : `${settings.calendarAdvanceMinutes}min`} before events`}
            value={settings.calendar && settings.masterEnabled}
            disabled={!settings.masterEnabled}
            onToggle={(v) => settings.setSetting('calendar', v)}
          />
          <Divider />
          {settings.calendar && settings.masterEnabled && (
            <>
              <AdvanceDaysPicker
                label="Remind me"
                options={ADVANCE_MINUTES_OPTIONS}
                selected={settings.calendarAdvanceMinutes}
                unit="min before"
                format={(v) => v >= 60 ? `${v / 60}h` : `${v}m`}
                onSelect={(v) => settings.setSetting('calendarAdvanceMinutes', v)}
              />
              <Divider />
            </>
          )}

          <CategoryRow
            icon="car" iconBg="#E8EAF6" iconColor="#3F51B5"
            title="Vehicle Alerts"
            sub="Service & insurance reminders"
            value={settings.vehicles && settings.masterEnabled}
            disabled={!settings.masterEnabled}
            onToggle={(v) => settings.setSetting('vehicles', v)}
          />
        </View>

        {/* Test button */}
        <Text style={styles.sectionLabel}>TEST</Text>
        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [styles.testRow, pressed && styles.testRowPressed]}
            onPress={handleTestNotification}
            disabled={testing}
          >
            <View style={[styles.iconBg, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="flask" size={22} color="#E65100" />
            </View>
            <View style={styles.testTextWrap}>
              <Text style={styles.rowTitle}>Send Test Notification</Text>
              <Text style={styles.rowSub}>Fires in 3 seconds</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
}

function CategoryRow({ icon, iconBg, iconColor, title, sub, value, disabled, onToggle }: {
  icon: string; iconBg: string; iconColor: string;
  title: string; sub: string; value: boolean; disabled: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconBg, { backgroundColor: iconBg }]}>
          <Ionicons name={icon as any} size={22} color={iconColor} />
        </View>
        <View>
          <Text style={[styles.rowTitle, disabled && styles.textDisabled]}>{title}</Text>
          <Text style={styles.rowSub}>{sub}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: colors.border, true: '#1A237E' }}
        thumbColor="#fff"
      />
    </View>
  );
}

function AdvanceDaysPicker({ label, options, selected, unit, format, onSelect }: {
  label: string; options: number[]; selected: number; unit: string;
  format?: (v: number) => string;
  onSelect: (v: number) => void;
}) {
  return (
    <View style={styles.pickerRow}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <View style={styles.pickerOptions}>
        {options.map((o) => (
          <Pressable
            key={o}
            onPress={() => onSelect(o)}
            style={[styles.pickerBtn, o === selected && styles.pickerBtnActive]}
          >
            <Text style={[styles.pickerBtnText, o === selected && styles.pickerBtnTextActive]}>
              {format ? format(o) : `${o} ${unit}`}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingBottom: 24, paddingHorizontal: 20 },
  back: { marginBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.65)' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8, marginBottom: 8, marginTop: 20, marginLeft: 4 },
  section: { backgroundColor: colors.card, borderRadius: 16, overflow: 'hidden', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16 },
  rowDisabled: { opacity: 0.5 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconBg: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  rowSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  textDisabled: { color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 70 },
  pickerRow: { paddingHorizontal: 16, paddingBottom: 14 },
  pickerLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  pickerOptions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pickerBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  pickerBtnActive: { backgroundColor: '#1A237E', borderColor: '#1A237E' },
  pickerBtnText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  pickerBtnTextActive: { color: '#fff' },
  testRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  testRowPressed: { backgroundColor: colors.background },
  testTextWrap: { flex: 1 },
  disabledBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 4 },
  disabledText: { fontSize: 13, color: colors.textSecondary },
});
