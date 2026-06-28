import React, { useState } from 'react';
import {
  Alert,
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
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '../../components/common/Card';
import { clearLocalAppData } from '../../storage/resetLocalData';
import { useAIStore } from '../../store/useAIStore';
import { useAllowanceStore } from '../../store/useAllowanceStore';
import { useAppStore } from '../../store/useAppStore';
import { useAutomationStore } from '../../store/useAutomationStore';
import { useChoreStore } from '../../store/useChoreStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useHabitsStore } from '../../store/useHabitsStore';
import { useHealthStore } from '../../store/useHealthStore';
import { useJournalStore } from '../../store/useJournalStore';
import { useLegacyStore } from '../../store/useLegacyStore';
import { useMemoryStore } from '../../store/useMemoryStore';
import { useMoodStore } from '../../store/useMoodStore';
import { useNotificationsStore } from '../../store/useNotificationsStore';
import { useOperationsStore } from '../../store/useOperationsStore';
import { usePollsStore } from '../../store/usePollsStore';
import { useRecipesStore } from '../../store/useRecipesStore';
import { useSchoolStore } from '../../store/useSchoolStore';
import { useShoppingStore } from '../../store/useShoppingStore';
import { useTimelineStore } from '../../store/useTimelineStore';
import { useTravelStore } from '../../store/useTravelStore';
import { useWealthStore } from '../../store/useWealthStore';
import { colors } from '../../theme/colors';

const SUBSCRIPTION_TIERS = [
  {
    key: 'free',
    label: 'Free',
    price: '$0',
    color: colors.textSecondary,
    features: ['5 family members', 'Basic tasks & calendar', 'Limited AI queries'],
  },
  {
    key: 'premium',
    label: 'Premium',
    price: '$9.99/mo',
    color: colors.primary,
    features: ['Unlimited members', 'All finance tools', '50 AI queries/mo', 'Document vault'],
  },
  {
    key: 'family_pro',
    label: 'Family Pro',
    price: '$19.99/mo',
    color: colors.secondary,
    features: [
      'Everything in Premium',
      'Unlimited AI',
      'Military mode',
      'Priority support',
      'Family Digital Twin',
    ],
  },
];

export function SettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  const { settings, updateSettings, setOnboarded, toggleMilitaryMode } = useAppStore();
  const militaryMode = settings?.militaryMode || false;

  const family = useFamilyStore((s) => s.family);
  const members = useFamilyStore((s) => s.members);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);

  const activeMember = members.find((member) => member.id === activeMemberId);

  const isParent =
    activeMember?.role === 'parent' ||
    activeMember?.role === 'guardian' ||
    activeMember?.isAdmin === true;

  const isChild = activeMember?.role === 'child';
  const isGrandparent = activeMember?.role === 'grandparent';

  const roleLabel = activeMember
    ? activeMember.role.charAt(0).toUpperCase() + activeMember.role.slice(1)
    : 'Family';

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const setAIKey = useAIStore((s) => s.setApiKey);

  const { seedDemoData: seedFamily } = useFamilyStore();
  const { seedDemoData: seedFinance } = useFinanceStore();
  const { seedDemoData: seedOps } = useOperationsStore();
  const { seedDemoInsights } = useAIStore();
  const { seedDemoData: seedMemory } = useMemoryStore();
  const { seedDemoData: seedLegacy } = useLegacyStore();
  const { seedDemoData: seedHealth } = useHealthStore();
  const { seedDemoData: seedAutomation } = useAutomationStore();
  const { seedDemoData: seedWealth } = useWealthStore();
  const { seedDemoData: seedNotifications } = useNotificationsStore();
  const { seedDemoData: seedMood } = useMoodStore();
  const { seedDemoData: seedHabits } = useHabitsStore();
  const { seedDemoData: seedShopping } = useShoppingStore();
  const { seedDemoData: seedRecipes } = useRecipesStore();
  const { seedDemoData: seedTimeline } = useTimelineStore();
  const { seedDemoData: seedPolls } = usePollsStore();
  const { seedDemoData: seedChores } = useChoreStore();
  const { seedDemoData: seedAllowance } = useAllowanceStore();
  const { seedDemoData: seedTravel } = useTravelStore();
  const { seedDemoData: seedJournal } = useJournalStore();
  const { seedDemoData: seedSchool } = useSchoolStore();

  const handleSaveApiKey = () => {
    setAIKey(apiKeyInput.trim());
    Alert.alert('API Key Saved', 'Your AI API key has been saved for this device.');
  };

  const handleResetLocalData = () => {
    Alert.alert(
      'Reset Local Data?',
      'This will clear onboarding, cached family data, finance data, activities, notifications, AI history, and the offline sync queue.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            clearLocalAppData();
            setOnboarded(false);
            Alert.alert('Local Data Reset', 'Close and reopen the app to start fresh.');
          },
        },
      ]
    );
  };

  const handleResetOnboarding = () => {
    Alert.alert('Reset App', 'This will restart onboarding. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => setOnboarded(false),
      },
    ]);
  };

  const handleLoadDemo = () => {
    seedFamily();
    seedFinance();
    seedOps();
    seedDemoInsights();
    seedMemory();
    seedLegacy();
    seedHealth();
    seedAutomation();
    seedWealth();
    seedNotifications();
    seedMood();
    seedHabits();
    seedShopping();
    seedRecipes();
    seedTimeline();
    seedPolls();
    seedChores();
    seedAllowance();
    seedTravel();
    seedJournal();
    seedSchool();

    Alert.alert(
      'Demo Data Loaded',
      'The Johnson Family demo data has been loaded — including all advanced features!'
    );
  };

  const notificationSettings = isChild
    ? [
        {
          key: 'taskReminders',
          label: 'Task Reminders',
          desc: 'Reminders for your chores and tasks',
          icon: 'checkbox-outline',
        },
        {
          key: 'achievementAlerts',
          label: 'Achievement Alerts',
          desc: 'Alerts when you earn rewards or points',
          icon: 'trophy-outline',
        },
        {
          key: 'familyUpdates',
          label: 'Family Updates',
          desc: 'Important family announcements',
          icon: 'people-outline',
        },
      ]
    : isGrandparent
      ? [
          {
            key: 'familyUpdates',
            label: 'Family Updates',
            desc: 'Important family announcements',
            icon: 'people-outline',
          },
          {
            key: 'birthdayReminders',
            label: 'Birthday Reminders',
            desc: 'Reminders for birthdays and celebrations',
            icon: 'gift-outline',
          },
          {
            key: 'eventReminders',
            label: 'Event Reminders',
            desc: 'Family calendar event alerts',
            icon: 'calendar-outline',
          },
        ]
      : [
          {
            key: 'billReminders',
            label: 'Bill Reminders',
            desc: 'Alerts before bills are due',
            icon: 'receipt-outline',
          },
          {
            key: 'taskReminders',
            label: 'Task Reminders',
            desc: 'Daily task summary',
            icon: 'checkbox-outline',
          },
          {
            key: 'lowStockAlerts',
            label: 'Low Stock Alerts',
            desc: 'When pantry items run low',
            icon: 'nutrition-outline',
          },
          {
            key: 'budgetAlerts',
            label: 'Budget Alerts',
            desc: 'When spending approaches limits',
            icon: 'wallet-outline',
          },
        ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['#0F2952', '#16476E']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.profileRow}>
          <View style={styles.profileAvatar}>
            <Ionicons name={isChild ? 'school' : isGrandparent ? 'heart' : 'home'} size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{activeMember?.name || family?.name || 'Your Family'}</Text>
            <Text style={styles.profilePlan}>
              {roleLabel} Profile • {family?.name || 'Family Command Center'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {isChild && (
          <Card style={styles.roleNoticeCard} variant="elevated">
            <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.roleNoticeTitle}>Child Settings Mode</Text>
              <Text style={styles.roleNoticeText}>
                Some family management, billing, AI, and developer controls are hidden.
              </Text>
            </View>
          </Card>
        )}

        {isGrandparent && (
          <Card style={styles.roleNoticeCard} variant="elevated">
            <Ionicons name="heart-outline" size={20} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.roleNoticeTitle}>Grandparent Settings Mode</Text>
              <Text style={styles.roleNoticeText}>
                Showing family updates, notifications, appearance, and support options.
              </Text>
            </View>
          </Card>
        )}

        {isParent && (
          <>
            <Text style={styles.sectionTitle}>Subscription</Text>

            {SUBSCRIPTION_TIERS.map((tier) => (
              <Card
                key={tier.key}
                style={
                  tier.key === 'family_pro'
                    ? { ...styles.tierCard, ...styles.tierCardHighlight }
                    : styles.tierCard
                }
                variant="elevated"
              >
                <View style={styles.tierHeader}>
                  <View>
                    <Text style={[styles.tierName, { color: tier.color }]}>{tier.label}</Text>
                    <Text style={styles.tierPrice}>{tier.price}</Text>
                  </View>

                  {tier.key === 'free' ? (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>Current</Text>
                    </View>
                  ) : (
                    <Pressable style={[styles.upgradeBtn, { backgroundColor: tier.color }]}>
                      <Text style={styles.upgradeBtnText}>Upgrade</Text>
                    </Pressable>
                  )}
                </View>

                {tier.features.map((feature) => (
                  <View key={feature} style={styles.featureRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color={tier.key === 'free' ? colors.success : tier.color}
                    />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </Card>
            ))}

            <Text style={styles.sectionTitle}>AI Configuration</Text>

            <Card style={styles.settingCard} variant="elevated">
              <Text style={styles.settingLabel}>Anthropic API Key</Text>
              <Text style={styles.settingDesc}>Add your own API key for unlimited AI queries</Text>

              <View style={styles.apiKeyRow}>
                <TextInput
                  style={styles.apiKeyInput}
                  value={apiKeyInput}
                  onChangeText={setApiKeyInput}
                  placeholder="sk-ant-..."
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showApiKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Pressable onPress={() => setShowApiKey((v) => !v)} style={styles.apiToggle}>
                  <Ionicons
                    name={showApiKey ? 'eye-off' : 'eye'}
                    size={18}
                    color={colors.textMuted}
                  />
                </Pressable>
              </View>

              <Pressable onPress={handleSaveApiKey} style={styles.saveKeyBtn}>
                <Text style={styles.saveKeyText}>Save API Key</Text>
              </Pressable>
            </Card>
          </>
        )}

        <Text style={styles.sectionTitle}>Notifications</Text>

        <Card style={styles.settingCard} variant="elevated">
          {notificationSettings.map((setting, index, arr) => (
            <View
              key={setting.key}
              style={[styles.toggleRow, index < arr.length - 1 && styles.toggleRowBorder]}
            >
              <Ionicons name={setting.icon as any} size={20} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.toggleLabel}>{setting.label}</Text>
                <Text style={styles.toggleDesc}>{setting.desc}</Text>
              </View>
              <Switch
                value
                onValueChange={() => {}}
                trackColor={{ false: colors.border, true: colors.primary + '60' }}
                thumbColor={colors.primary}
              />
            </View>
          ))}
        </Card>

        <Text style={styles.sectionTitle}>Appearance</Text>

        <Card style={styles.settingCard} variant="elevated">
          <View style={styles.toggleRow}>
            <Ionicons name="moon-outline" size={20} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.toggleLabel}>Dark Mode</Text>
              <Text style={styles.toggleDesc}>Switch to dark theme</Text>
            </View>
            <Switch
              value={settings.theme === 'dark'}
              onValueChange={(value) => updateSettings({ theme: value ? 'dark' : 'light' })}
              trackColor={{ false: colors.border, true: colors.primary + '60' }}
              thumbColor={colors.primary}
            />
          </View>

          {isParent && (
            <View style={[styles.toggleRow, styles.toggleRowBorder]}>
              <Ionicons name="shield-outline" size={20} color="#4A7C59" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.toggleLabel}>Military Mode</Text>
                <Text style={styles.toggleDesc}>Enhanced tools for military families</Text>
              </View>
              <Switch
                value={militaryMode}
                onValueChange={toggleMilitaryMode}
                trackColor={{ false: colors.border, true: '#4A7C5960' }}
                thumbColor="#4A7C59"
              />
            </View>
          )}
        </Card>

        <Text style={styles.sectionTitle}>Privacy & Security</Text>

        <Card style={styles.settingCard} variant="elevated">
          {(isChild
            ? [
                {
                  icon: 'finger-print',
                  label: 'Biometric Lock',
                  desc: 'Use Face ID or fingerprint to lock app',
                },
                {
                  icon: 'lock-closed-outline',
                  label: 'Auto-Lock',
                  desc: 'Lock app after 5 minutes of inactivity',
                },
              ]
            : [
                {
                  icon: 'finger-print',
                  label: 'Biometric Lock',
                  desc: 'Use Face ID or fingerprint to lock app',
                },
                {
                  icon: 'eye-off-outline',
                  label: 'Hide Balances',
                  desc: 'Hide financial balances on dashboard',
                },
                {
                  icon: 'lock-closed-outline',
                  label: 'Auto-Lock',
                  desc: 'Lock app after 5 minutes of inactivity',
                },
                {
                  icon: 'cloud-upload-outline',
                  label: 'Cloud Backup',
                  desc: 'Automatically back up your data',
                },
              ]).map((item, index, arr) => (
            <Pressable
              key={item.label}
              style={[styles.toggleRow, index < arr.length - 1 && styles.toggleRowBorder]}
            >
              <Ionicons name={item.icon as any} size={20} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.toggleLabel}>{item.label}</Text>
                <Text style={styles.toggleDesc}>{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          ))}
        </Card>

        <Text style={styles.sectionTitle}>About</Text>

        <Card style={styles.settingCard} variant="elevated">
          {[
            { icon: 'document-text-outline', label: 'Privacy Policy' },
            { icon: 'shield-checkmark-outline', label: 'Terms of Service' },
            { icon: 'help-circle-outline', label: 'Help & Support' },
            { icon: 'star-outline', label: 'Rate the App' },
            { icon: 'share-outline', label: 'Share with Friends' },
          ].map((item, index, arr) => (
            <Pressable
              key={item.label}
              style={[styles.toggleRow, index < arr.length - 1 && styles.toggleRowBorder]}
            >
              <Ionicons name={item.icon as any} size={20} color={colors.primary} />
              <Text style={[styles.toggleLabel, { marginLeft: 12, flex: 1 }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          ))}
        </Card>

        {isParent && (
          <>
            <Text style={styles.sectionTitle}>Developer</Text>

            <Card style={styles.settingCard} variant="elevated">
              <Pressable onPress={handleLoadDemo} style={[styles.toggleRow, styles.toggleRowBorder]}>
                <Ionicons name="flask-outline" size={20} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.toggleLabel}>Load Demo Data</Text>
                  <Text style={styles.toggleDesc}>Populate with Johnson Family data</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>

              <Pressable onPress={handleResetLocalData} style={[styles.toggleRow, styles.toggleRowBorder]}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.toggleLabel, { color: colors.danger }]}>Reset Local Data</Text>
                  <Text style={styles.toggleDesc}>Clear MMKV cache and restart onboarding</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>

              <Pressable onPress={handleResetOnboarding} style={styles.toggleRow}>
                <Ionicons name="refresh-outline" size={20} color={colors.danger} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.toggleLabel, { color: colors.danger }]}>Reset & Re-onboard</Text>
                  <Text style={styles.toggleDesc}>Restart onboarding only</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            </Card>
          </>
        )}

        <Text style={styles.version}>Family Command Center v1.0.0</Text>
        <Text style={styles.versionSub}>Built with ❤️ for families everywhere</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#fff' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: { fontSize: 18, fontWeight: '800', color: '#fff' },
  profilePlan: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  content: { padding: 16 },
  roleNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    marginBottom: 4,
  },
  roleNoticeTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  roleNoticeText: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 20,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tierCard: { marginBottom: 10, borderRadius: 14 },
  tierCardHighlight: { borderWidth: 2, borderColor: colors.secondary },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  tierName: { fontSize: 16, fontWeight: '800' },
  tierPrice: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  currentBadge: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  currentBadgeText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  upgradeBtn: { borderRadius: 10, paddingVertical: 7, paddingHorizontal: 16 },
  upgradeBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  featureText: { fontSize: 13, color: colors.textSecondary },
  settingCard: { borderRadius: 14, marginBottom: 4 },
  settingLabel: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  settingDesc: { fontSize: 12, color: colors.textSecondary, marginBottom: 10 },
  apiKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  apiKeyInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.text,
  },
  apiToggle: { padding: 10 },
  saveKeyBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveKeyText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  toggleRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  toggleDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  version: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 24 },
  versionSub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
});