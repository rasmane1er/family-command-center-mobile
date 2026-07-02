import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, Linking, Modal, Platform, Pressable, ScrollView, Share, StyleSheet,
  Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as StoreReview from 'expo-store-review';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { i18n } from '../../i18n';

import { Card } from '../../components/common/Card';
import { clearLocalAppData } from '../../storage/resetLocalData';
import { resetAllStores } from '../../storage/resetAllStores';
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
import { useAuthStore } from '../../store/useAuthStore';
import { useTheme } from '../../theme/ThemeContext';
import { useSubscription, SubscriptionTier, TIER_LABELS, TIER_PRICES, TIER_FEATURES } from '../../hooks/useSubscription';
import { usePurchases } from '../../hooks/usePurchases';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';

const SUBSCRIPTION_TIERS = [
  {
    key: 'free', label: 'Free', price: '$0', yearlyPrice: null, yearlySavingsPct: 0,
    colorKey: 'textSecondary' as const,
    features: ['Up to 2 family members', 'Basic tasks & calendar', 'Limited AI queries'],
  },
  {
    key: 'premium', label: 'Premium', price: '$12.99/mo', yearlyPrice: '$99/yr', yearlySavingsPct: 36,
    colorKey: 'primary' as const,
    features: [
      'Unlimited members', 'All finance tools', '100 AI queries/mo', 'Document vault',
      'Pet tracker', 'Shopping intelligence', 'Home inventory', 'Meal planning',
    ],
  },
  {
    key: 'family_pro', label: 'Family Pro', price: '$19.99/mo', yearlyPrice: '$179/yr', yearlySavingsPct: 25,
    colorKey: 'secondary' as const,
    features: [
      'Everything in Premium', 'Unlimited AI', 'Military mode', 'Emergency mode',
      'Family Digital Twin', 'Predictive budgeting', 'Smart automation',
      'Childcare manager', 'Travel planning', 'Priority support', 'Advanced analytics',
    ],
  },
];

const LANGUAGES = [
  { code: 'en', label: 'English',    flag: '🇺🇸', nativeLabel: 'English'   },
  { code: 'fr', label: 'French',     flag: '🇫🇷', nativeLabel: 'Français'  },
  { code: 'es', label: 'Spanish',    flag: '🇪🇸', nativeLabel: 'Español'   },
  { code: 'ar', label: 'Arabic',     flag: '🇸🇦', nativeLabel: 'العربية'   },
  { code: 'zh', label: 'Chinese',    flag: '🇨🇳', nativeLabel: '中文'      },
  { code: 'pt', label: 'Portuguese', flag: '🇧🇷', nativeLabel: 'Português' },
  { code: 'de', label: 'German',     flag: '🇩🇪', nativeLabel: 'Deutsch'   },
  { code: 'it', label: 'Italian',    flag: '🇮🇹', nativeLabel: 'Italiano'  },
  { code: 'ja', label: 'Japanese',   flag: '🇯🇵', nativeLabel: '日本語'    },
  { code: 'ko', label: 'Korean',     flag: '🇰🇷', nativeLabel: '한국어'    },
];

export function SettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const { settings, updateSettings, setOnboarded, toggleMilitaryMode } = useAppStore();
  const { tier: currentTier, canAccess } = useSubscription();
  const { user, signOut } = useAuthStore();
  const militaryMode = settings?.militaryMode || false;

  const { restore, showPaywall, showCustomerCenter, error: purchasesError } = usePurchases();
  const [purchasingTier, setPurchasingTier] = useState<SubscriptionTier | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const family        = useFamilyStore((s) => s.family);
  const members       = useFamilyStore((s) => s.members);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);
  const activeMember  = members.find((m) => m.id === activeMemberId);
  const isParent      = activeMember?.role === 'parent' || activeMember?.role === 'guardian' || activeMember?.isAdmin === true;
  const isChild       = activeMember?.role === 'child';
  const isGrandparent = activeMember?.role === 'grandparent';
  const roleLabel     = activeMember ? activeMember.role.charAt(0).toUpperCase() + activeMember.role.slice(1) : 'Family';

  const [apiKeyInput,       setApiKeyInput]       = useState('');
  const [showApiKey,        setShowApiKey]         = useState(false);
  const [showLanguageModal, setShowLanguageModal]  = useState(false);
  const [biometricEnabled,  setBiometricEnabled]   = useState(settings.biometricLock ?? false);
  const hideBalances = settings.hideBalances ?? false;
  const autoLock     = settings.autoLock ?? true;
  const cloudBackup  = settings.cloudBackup ?? true;
  const [notifState, setNotifState] = useState<Record<string, boolean>>({
    billReminders: true, taskReminders: true, lowStockAlerts: true,
    budgetAlerts: true, achievementAlerts: true, familyUpdates: true,
    birthdayReminders: true, eventReminders: true,
  });

  const setAIKey = useAIStore((s) => s.setApiKey);
  const { seedDemoData: seedFamily }        = useFamilyStore();
  const { seedDemoData: seedFinance }       = useFinanceStore();
  const { seedDemoData: seedOps }           = useOperationsStore();
  const { seedDemoInsights }                = useAIStore();
  const { seedDemoData: seedMemory }        = useMemoryStore();
  const { seedDemoData: seedLegacy }        = useLegacyStore();
  const { seedDemoData: seedHealth }        = useHealthStore();
  const { seedDemoData: seedAutomation }    = useAutomationStore();
  const { seedDemoData: seedWealth }        = useWealthStore();
  const { seedDemoData: seedNotifications, clearAll: clearNotifications } = useNotificationsStore();
  const { seedDemoData: seedMood }          = useMoodStore();
  const { seedDemoData: seedHabits }        = useHabitsStore();
  const { seedDemoData: seedShopping }      = useShoppingStore();
  const { seedDemoData: seedRecipes }       = useRecipesStore();
  const { seedDemoData: seedTimeline }      = useTimelineStore();
  const { seedDemoData: seedPolls }         = usePollsStore();
  const { seedDemoData: seedChores }        = useChoreStore();
  const { seedDemoData: seedAllowance }     = useAllowanceStore();
  const { seedDemoData: seedTravel }        = useTravelStore();
  const { seedDemoData: seedJournal }       = useJournalStore();
  const { seedDemoData: seedSchool }        = useSchoolStore();

  const currentLanguage = LANGUAGES.find((l) => l.code === (settings.language || 'en')) || LANGUAGES[0];

  const handleSaveApiKey = () => {
    if (!apiKeyInput.trim()) { Alert.alert(t('common.error'), 'Please enter a valid API key.'); return; }
    setAIKey(apiKeyInput.trim());
    Alert.alert(t('settings.apiKeySaved'), t('settings.apiKeySavedMsg'));
    setApiKeyInput('');
  };

  const handleResetLocalData = () => {
    Alert.alert(t('settings.resetConfirm'), t('settings.resetConfirmMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => { clearLocalAppData(); resetAllStores(); setOnboarded(false); Alert.alert(t('settings.resetDone'), t('settings.resetDoneMsg')); } },
    ]);
  };

  const handleResetOnboarding = () => {
    Alert.alert(t('settings.resetOnboardingConfirm'), t('settings.resetOnboardingConfirmMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.confirm'), style: 'destructive', onPress: () => setOnboarded(false) },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const handleLoadDemo = () => {
    seedFamily(); seedFinance(); seedOps(); seedDemoInsights();
    seedMemory(); seedLegacy(); seedHealth(); seedAutomation();
    seedWealth(); seedNotifications(); seedMood(); seedHabits();
    seedShopping(); seedRecipes(); seedTimeline(); seedPolls();
    seedChores(); seedAllowance(); seedTravel(); seedJournal(); seedSchool();
    Alert.alert(t('settings.demoLoaded'), t('settings.demoLoadedMsg'));
  };

  // Manage/cancel/change-plan and restore all live in RevenueCat's Customer
  // Center now — it's the dashboard-configured, best-practice replacement for
  // a hand-rolled "open App Store subscription settings" deep link.
  const handleManageSubscription = async () => {
    try {
      await showCustomerCenter();
    } catch {
      // Fallback if Customer Center isn't reachable (e.g. RevenueCat not yet
      // configured for this account) — still gets the user to a working flow.
      const url = Platform.OS === 'ios'
        ? 'itms-apps://apps.apple.com/account/subscriptions'
        : 'https://play.google.com/store/account/subscriptions';
      Linking.openURL(url).catch(() =>
        Alert.alert(t('common.error'), 'Unable to open subscription management.'),
      );
    }
  };

  // Each paid tier maps to its own RevenueCat entitlement (see
  // src/config/revenuecat.ts) — RevenueCat's dashboard-configured Paywall UI
  // handles tier + billing period (monthly/yearly) selection, pricing, and
  // the purchase itself.
  const handleUpgrade = async (tierKey: SubscriptionTier) => {
    if (tierKey === currentTier) {
      Alert.alert('Current Plan', `You are already on the ${TIER_LABELS[tierKey]} plan.`);
      return;
    }
    if (tierKey === 'free') {
      Alert.alert(
        'Downgrade to Free',
        'To cancel your subscription, you\'ll be taken to subscription management. You will keep access to premium features until the end of your current billing period.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Manage Subscription', style: 'destructive', onPress: handleManageSubscription },
        ],
      );
      return;
    }

    setPurchasingTier(tierKey);
    try {
      const result = await showPaywall(tierKey as 'premium' | 'family_pro');
      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        Alert.alert('Success', `You are now on the ${TIER_LABELS[tierKey]} plan!`);
      } else if (result === PAYWALL_RESULT.ERROR) {
        Alert.alert('Purchase Failed', purchasesError ?? 'Something went wrong loading the paywall. Please try again.');
      }
      // CANCELLED / NOT_PRESENTED: user closed the paywall or already has Pro — no alert needed.
    } catch {
      // Defense in depth — showPaywall() already catches internally and
      // resolves to PAYWALL_RESULT.ERROR rather than throwing, but never let
      // a purchase-flow exception escape an onPress handler unhandled.
      Alert.alert('Purchase Failed', purchasesError ?? 'Something went wrong. Please try again.');
    } finally {
      setPurchasingTier(null);
    }
  };

  const handleRestorePurchases = async () => {
    setIsRestoring(true);
    const result = await restore();
    setIsRestoring(false);
    if (result.success) {
      Alert.alert('Restored', 'Your purchases have been restored.');
    } else {
      Alert.alert('Restore Failed', result.error ?? 'No purchases found to restore.');
    }
  };

  const handleSelectLanguage = (code: string) => {
    updateSettings({ language: code });
    i18n.changeLanguage(code);
    setShowLanguageModal(false);
    Alert.alert(t('settings.languageUpdated'), t('settings.languageUpdatedMsg'));
  };

  const handleOpenLink = (url: string, title: string) => {
    Alert.alert(title, `Open ${title} in your browser?`, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.ok'), onPress: () => Linking.openURL(url).catch(() => Alert.alert(t('common.error'), 'Unable to open link.')) },
    ]);
  };

  const handleHelpSupport = () => {
    navigation.navigate('HelpSupport');
  };

  const handleRateApp = async () => {
    // Prefer the native in-app review prompt (SKStoreReviewController / Play in-app review).
    // The OS throttles how often this can actually appear — that's expected platform behavior.
    try {
      if (await StoreReview.isAvailableAsync()) {
        await StoreReview.requestReview();
        return;
      }
    } catch {
      // fall through to a direct store link
    }

    const appStoreUrl = 'https://apps.apple.com/app/id000000000?action=write-review';
    const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.familycommandcenter.app';
    const url = Platform.OS === 'ios' ? appStoreUrl : playStoreUrl;
    Linking.openURL(url).catch(() => {
      Alert.alert(
        'Rate Family Command Center',
        'Thank you for your support! Rating will be available once the app is published on the app stores.',
        [{ text: 'OK' }],
      );
    });
  };

  const handleShareApp = () => {
    Share.share({
      title: 'Family Command Center',
      message:
        'Check out Family Command Center — the all-in-one app to manage your family\'s life! Tasks, finance, health, AI assistant and more.\n\nhttps://familycommandcenter.app',
    }).catch(() => {});
  };

  const handleBiometricToggle = (value: boolean) => {
    setBiometricEnabled(value);
    updateSettings({ biometricLock: value });
    Alert.alert(
      value ? t('settings.biometricEnabled') : t('settings.biometricDisabled'),
      value ? t('settings.biometricEnabledMsg') : t('settings.biometricDisabledMsg'),
    );
  };

  const handleDarkModeToggle = (v: boolean) => {
    updateSettings({ theme: v ? 'dark' : 'light' });
  };

  const notificationSettings = isChild
    ? [
        { key: 'taskReminders',    label: t('settings.taskReminders'),    desc: t('settings.taskRemindersDesc'),    icon: 'checkbox-outline' },
        { key: 'achievementAlerts',label: t('settings.achievementAlerts'), desc: t('settings.achievementAlertsDesc'),icon: 'trophy-outline'   },
        { key: 'familyUpdates',    label: t('settings.familyUpdates'),    desc: t('settings.familyUpdatesDesc'),    icon: 'people-outline'   },
      ]
    : isGrandparent
    ? [
        { key: 'familyUpdates',     label: t('settings.familyUpdates'),     desc: t('settings.familyUpdatesDesc'),     icon: 'people-outline'   },
        { key: 'birthdayReminders', label: t('settings.birthdayReminders'), desc: t('settings.birthdayRemindersDesc'), icon: 'gift-outline'    },
        { key: 'eventReminders',    label: t('settings.eventReminders'),    desc: t('settings.eventRemindersDesc'),    icon: 'calendar-outline' },
      ]
    : [
        { key: 'billReminders',  label: t('settings.billReminders'),  desc: t('settings.billRemindersDesc'),  icon: 'receipt-outline'   },
        { key: 'taskReminders',  label: t('settings.taskReminders'),  desc: t('settings.taskRemindersDesc'),  icon: 'checkbox-outline'  },
        { key: 'lowStockAlerts', label: t('settings.lowStockAlerts'), desc: t('settings.lowStockAlertsDesc'), icon: 'nutrition-outline' },
        { key: 'budgetAlerts',   label: t('settings.budgetAlerts'),   desc: t('settings.budgetAlertsDesc'),   icon: 'wallet-outline'    },
      ];

  const s = makeStyles(colors, isDark);

  const screenHeader = (
    <LinearGradient colors={['#0F2952', '#16476E']} style={[s.header, { paddingTop: insets.top + 12 }]}>
      <View style={s.headerTop}>
        <Pressable onPress={() => navigation.goBack()} style={s.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>{t('settings.title')}</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={s.profileRow}>
        <View style={s.profileAvatar}>
          <Ionicons name={isChild ? 'school' : isGrandparent ? 'heart' : 'home'} size={24} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.profileName}>{activeMember?.name || family?.name || 'Your Family'}</Text>
          <Text style={s.profilePlan}>{roleLabel} Profile • {family?.name || 'Family Command Center'}</Text>
          {user?.email && <Text style={s.profileEmail}>{user.email}</Text>}
        </View>
      </View>
    </LinearGradient>
  );

  const screenCompact = (
    <View style={{ backgroundColor: '#0F2952', paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={() => navigation.goBack()} style={s.back}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Text style={[s.headerTitle, { flex: 1, marginLeft: 12 }]}>{t('settings.title')}</Text>
    </View>
  );

  return (
    <View style={s.container}>
      <StatusBar style="light" />

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
      <ScrollView
        onScroll={onScroll}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={[s.content, { paddingBottom: 100, paddingTop: contentPaddingTop }]}
        showsVerticalScrollIndicator={false}>
        {isChild && (
          <Card style={s.roleNoticeCard} variant="elevated">
            <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.roleNoticeTitle}>{t('settings.childMode')}</Text>
              <Text style={s.roleNoticeText}>{t('settings.childModeDesc')}</Text>
            </View>
          </Card>
        )}
        {isGrandparent && (
          <Card style={s.roleNoticeCard} variant="elevated">
            <Ionicons name="heart-outline" size={20} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.roleNoticeTitle}>{t('settings.grandparentMode')}</Text>
              <Text style={s.roleNoticeText}>{t('settings.grandparentModeDesc')}</Text>
            </View>
          </Card>
        )}

        {/* ── SUBSCRIPTION ── */}
        <>
            <Text style={s.sectionTitle}>{t('settings.subscription')}</Text>
            {SUBSCRIPTION_TIERS.map((tier) => (
              <Card key={tier.key}
                style={tier.key === 'family_pro' ? { ...s.tierCard, ...s.tierCardHighlight } : s.tierCard}
                variant="elevated">
                <View style={s.tierHeader}>
                  <View>
                    <Text style={[s.tierName, { color: colors[tier.colorKey] }]}>{tier.label}</Text>
                    <Text style={s.tierPrice}>{tier.price}</Text>
                    {tier.yearlyPrice && (
                      <View style={s.yearlyRow}>
                        <Text style={s.yearlyPriceText}>or {tier.yearlyPrice}</Text>
                        <View style={[s.savingsBadge, { backgroundColor: colors[tier.colorKey] + '18' }]}>
                          <Text style={[s.savingsBadgeText, { color: colors[tier.colorKey] }]}>
                            Save {tier.yearlySavingsPct}%
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                  {tier.key === currentTier ? (
                    <View style={[s.currentBadge, { backgroundColor: colors.success + '20' }]}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                      <Text style={[s.currentBadgeText, { color: colors.success }]}>Current Plan</Text>
                    </View>
                  ) : tier.key === 'free' ? (
                    <Pressable style={s.downgradeBtnSmall} onPress={() => handleUpgrade('free' as SubscriptionTier)}>
                      <Text style={[s.downgradeBtnText, { color: colors.textMuted }]}>Downgrade</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[s.upgradeBtn, { backgroundColor: colors[tier.colorKey as keyof typeof colors] as string }, purchasingTier === tier.key && s.upgradeBtnDisabled]}
                      disabled={purchasingTier !== null}
                      onPress={() => handleUpgrade(tier.key as SubscriptionTier)}
                    >
                      {purchasingTier === tier.key ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={s.upgradeBtnText}>{t('settings.upgrade')}</Text>
                      )}
                    </Pressable>
                  )}
                </View>
                {tier.features.map((f) => (
                  <View key={f} style={s.featureRow}>
                    <Ionicons name="checkmark-circle" size={14} color={tier.key === 'free' ? colors.success : colors[tier.colorKey]} />
                    <Text style={s.featureText}>{f}</Text>
                  </View>
                ))}
              </Card>
            ))}

            <TouchableOpacity
              style={s.restoreBtn}
              activeOpacity={0.7}
              disabled={isRestoring}
              onPress={handleRestorePurchases}
            >
              {isRestoring ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="refresh-outline" size={16} color={colors.primary} />
              )}
              <Text style={s.restoreBtnText}>{isRestoring ? 'Restoring…' : 'Restore Purchases'}</Text>
            </TouchableOpacity>

            {/* ── AI CONFIG ── */}
            <Text style={s.sectionTitle}>{t('settings.aiConfig')}</Text>
            <Card style={s.settingCard} variant="elevated">
              <Text style={s.settingLabel}>{t('settings.apiKey')}</Text>
              <Text style={s.settingDesc}>{t('settings.apiKeyDesc')}</Text>
              <View style={s.apiKeyRow}>
                <TextInput style={s.apiKeyInput} value={apiKeyInput} onChangeText={setApiKeyInput}
                  placeholder={t('settings.apiKeyPlaceholder')} placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showApiKey} autoCapitalize="none" autoCorrect={false} />
                <Pressable onPress={() => setShowApiKey((v) => !v)} style={s.apiToggle}>
                  <Ionicons name={showApiKey ? 'eye-off' : 'eye'} size={18} color={colors.textMuted} />
                </Pressable>
              </View>
              <Pressable onPress={handleSaveApiKey} style={s.saveKeyBtn}>
                <Text style={s.saveKeyText}>{t('settings.saveApiKey')}</Text>
              </Pressable>
            </Card>
        </>

        {/* ── NOTIFICATIONS ── */}
        <Text style={s.sectionTitle}>{t('settings.notifications')}</Text>
        <Card style={s.settingCard} variant="elevated">
          {notificationSettings.map((setting, index, arr) => (
            <View key={setting.key} style={[s.toggleRow, index < arr.length - 1 && s.toggleRowBorder]}>
              <Ionicons name={setting.icon as any} size={20} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.toggleLabel}>{setting.label}</Text>
                <Text style={s.toggleDesc}>{setting.desc}</Text>
              </View>
              <Switch
                value={notifState[setting.key] ?? true}
                onValueChange={(v) => setNotifState((prev) => ({ ...prev, [setting.key]: v }))}
                trackColor={{ false: colors.border, true: colors.primary + '60' }}
                thumbColor={colors.primary}
              />
            </View>
          ))}
        </Card>

        {/* ── APPEARANCE ── */}
        <Text style={s.sectionTitle}>{t('settings.appearance')}</Text>
        <Card style={s.settingCard} variant="elevated">
          <View style={[s.toggleRow, s.toggleRowBorder]}>
            <Ionicons name="moon-outline" size={20} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.toggleLabel}>{t('settings.darkMode')}</Text>
              <Text style={s.toggleDesc}>{t('settings.darkModeDesc')}</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={handleDarkModeToggle}
              trackColor={{ false: colors.border, true: colors.primary + '60' }}
              thumbColor={colors.primary}
            />
          </View>

          <Pressable style={[s.toggleRow, isParent ? s.toggleRowBorder : undefined]} onPress={() => setShowLanguageModal(true)}>
            <Text style={s.flagIcon}>{currentLanguage.flag}</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.toggleLabel}>{t('settings.language')}</Text>
              <Text style={s.toggleDesc}>{currentLanguage.label} ({currentLanguage.nativeLabel})</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>

          {isParent && (
            <View style={s.toggleRow}>
              <Ionicons name="shield-outline" size={20} color="#4A7C59" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.toggleLabel}>{t('settings.militaryMode')}</Text>
                <Text style={s.toggleDesc}>{t('settings.militaryModeDesc')}</Text>
              </View>
              <Switch value={militaryMode} onValueChange={(v) => {
                if (v && !canAccess('militaryMode')) {
                  Alert.alert('Family Pro Feature', 'Military Mode is available on the Family Pro plan.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Upgrade', onPress: () => handleUpgrade('family_pro') },
                  ]);
                  return;
                }
                toggleMilitaryMode();
              }}
                trackColor={{ false: colors.border, true: '#4A7C5960' }} thumbColor="#4A7C59" />
            </View>
          )}
        </Card>

        {/* ── PRIVACY & SECURITY ── */}
        <Text style={s.sectionTitle}>{t('settings.privacy')}</Text>
        <Card style={s.settingCard} variant="elevated">
          <View style={[s.toggleRow, s.toggleRowBorder]}>
            <Ionicons name="finger-print" size={20} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.toggleLabel}>{t('settings.biometric')}</Text>
              <Text style={s.toggleDesc}>{t('settings.biometricDesc')}</Text>
            </View>
            <Switch value={biometricEnabled} onValueChange={handleBiometricToggle}
              trackColor={{ false: colors.border, true: colors.primary + '60' }} thumbColor={colors.primary} />
          </View>

          {!isChild && (
            <View style={[s.toggleRow, s.toggleRowBorder]}>
              <Ionicons name="eye-off-outline" size={20} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.toggleLabel}>{t('settings.hideBalances')}</Text>
                <Text style={s.toggleDesc}>{t('settings.hideBalancesDesc')}</Text>
              </View>
              <Switch value={hideBalances} onValueChange={(v) => updateSettings({ hideBalances: v })}
                trackColor={{ false: colors.border, true: colors.primary + '60' }} thumbColor={colors.primary} />
            </View>
          )}

          <View style={[s.toggleRow, s.toggleRowBorder]}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.toggleLabel}>{t('settings.autoLock')}</Text>
              <Text style={s.toggleDesc}>{t('settings.autoLockDesc')}</Text>
            </View>
            <Switch value={autoLock} onValueChange={(v) => updateSettings({ autoLock: v })}
              trackColor={{ false: colors.border, true: colors.primary + '60' }} thumbColor={colors.primary} />
          </View>

          {!isChild && (
            <View style={s.toggleRow}>
              <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.toggleLabel}>{t('settings.cloudBackup')}</Text>
                <Text style={s.toggleDesc}>{t('settings.cloudBackupDesc')}</Text>
              </View>
              <Switch value={cloudBackup} onValueChange={(v) => updateSettings({ cloudBackup: v })}
                trackColor={{ false: colors.border, true: colors.primary + '60' }} thumbColor={colors.primary} />
            </View>
          )}
        </Card>

        {/* ── ABOUT ── */}
        <Text style={s.sectionTitle}>{t('settings.about')}</Text>
        <Card style={s.settingCard} variant="elevated">
          {[
            { icon: 'document-text-outline' as const, label: t('settings.privacyPolicy'), onPress: () => handleOpenLink('https://familycommandcenter.app/privacy', 'Privacy Policy') },
            { icon: 'shield-checkmark-outline' as const, label: t('settings.terms'), onPress: () => handleOpenLink('https://familycommandcenter.app/terms', 'Terms of Service') },
            { icon: 'help-circle-outline' as const, label: t('settings.helpSupport'), onPress: handleHelpSupport },
            { icon: 'star-outline' as const, label: t('settings.rateApp'), onPress: handleRateApp },
            { icon: 'share-outline' as const, label: t('settings.shareApp'), onPress: handleShareApp },
          ].map((item, index, arr) => (
            <Pressable key={item.label} style={[s.toggleRow, index < arr.length - 1 && s.toggleRowBorder]} onPress={item.onPress}>
              <Ionicons name={item.icon} size={20} color={colors.primary} />
              <Text style={[s.toggleLabel, { marginLeft: 12, flex: 1 }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          ))}
        </Card>

        {/* ── DEVELOPER ── */}
        {isParent && (
          <>
            <Text style={s.sectionTitle}>{t('settings.developer')}</Text>
            <Card style={s.settingCard} variant="elevated">
              <Pressable onPress={handleLoadDemo} style={[s.toggleRow, s.toggleRowBorder]}>
                <Ionicons name="flask-outline" size={20} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.toggleLabel}>{t('settings.loadDemo')}</Text>
                  <Text style={s.toggleDesc}>{t('settings.loadDemoDesc')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
              <Pressable onPress={handleResetLocalData} style={[s.toggleRow, s.toggleRowBorder]}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[s.toggleLabel, { color: colors.danger }]}>{t('settings.resetData')}</Text>
                  <Text style={s.toggleDesc}>{t('settings.resetDataDesc')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
              <Pressable onPress={handleResetOnboarding} style={s.toggleRow}>
                <Ionicons name="refresh-outline" size={20} color={colors.danger} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[s.toggleLabel, { color: colors.danger }]}>{t('settings.resetOnboarding')}</Text>
                  <Text style={s.toggleDesc}>{t('settings.resetOnboardingDesc')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            </Card>
          </>
        )}

        {/* ── SIGN OUT ── */}
        <Text style={s.sectionTitle}>Account</Text>
        <Card style={s.settingCard} variant="elevated">
          <Pressable onPress={handleSignOut} style={s.toggleRow}>
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={[s.toggleLabel, { marginLeft: 12, flex: 1, color: colors.danger }]}>Sign Out</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        </Card>

        <Text style={s.version}>{t('settings.version')}</Text>
        <Text style={s.versionSub}>{t('settings.tagline')}</Text>
      </ScrollView>
        )}
      </CollapsibleHeader>

      {/* ── LANGUAGE MODAL ── */}
      <Modal visible={showLanguageModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowLanguageModal(false)}>
        <View style={s.modalContainer}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{t('settings.selectLanguage')}</Text>
            <Pressable onPress={() => setShowLanguageModal(false)} style={s.modalClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={s.languageList}>
            {LANGUAGES.map((lang) => {
              const isSelected = (settings.language || 'en') === lang.code;
              return (
                <TouchableOpacity key={lang.code}
                  style={[s.languageRow, isSelected && s.languageRowActive]}
                  onPress={() => handleSelectLanguage(lang.code)} activeOpacity={0.7}>
                  <Text style={s.languageFlag}>{lang.flag}</Text>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={[s.languageName, isSelected && s.languageNameActive]}>{lang.label}</Text>
                    <Text style={s.languageNative}>{lang.nativeLabel}</Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) {
  return StyleSheet.create({
    container:       { flex: 1, backgroundColor: colors.background },
    header:          { paddingHorizontal: 20, paddingBottom: 8 },
    headerTop:       { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    back:            { marginRight: 12 },
    headerTitle:     { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
    profileRow:      { flexDirection: 'row', alignItems: 'center', gap: 14 },
    profileAvatar:   { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    profileName:     { fontSize: 18, fontWeight: '800', color: '#fff' },
    profilePlan:     { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
    profileEmail:    { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 1 },
    content:         { padding: 16 },
    roleNoticeCard:  { flexDirection: 'row', alignItems: 'center', borderRadius: 14, marginBottom: 4 },
    roleNoticeTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
    roleNoticeText:  { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
    sectionTitle:    { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: 24, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
    tierCard:            { marginBottom: 10, borderRadius: 14, backgroundColor: colors.card },
    tierCardHighlight:   { borderWidth: 2, borderColor: colors.secondary },
    tierHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    tierName:        { fontSize: 16, fontWeight: '800' },
    tierPrice:       { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    yearlyRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
    yearlyPriceText: { fontSize: 12, color: colors.textMuted },
    savingsBadge:    { borderRadius: 6, paddingVertical: 2, paddingHorizontal: 6 },
    savingsBadgeText:{ fontSize: 11, fontWeight: '700' },
    currentBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.background, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
    currentBadgeText:{ fontSize: 12, fontWeight: '700', color: colors.textSecondary },
    upgradeBtn:      { borderRadius: 10, paddingVertical: 7, paddingHorizontal: 16, minWidth: 64, alignItems: 'center', justifyContent: 'center' },
    upgradeBtnDisabled: { opacity: 0.6 },
    upgradeBtnText:  { fontSize: 13, fontWeight: '700', color: '#fff' },
    downgradeBtnSmall: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
    restoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, marginTop: 4, marginBottom: 4 },
    restoreBtnText: { fontSize: 14, fontWeight: '700', color: colors.primary },
    downgradeBtnText: { fontSize: 12, fontWeight: '600' },
    featureRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    featureText:     { fontSize: 13, color: colors.textSecondary },
    settingCard:     { borderRadius: 14, marginBottom: 4, backgroundColor: colors.card },
    settingLabel:    { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
    settingDesc:     { fontSize: 12, color: colors.textSecondary, marginBottom: 10 },
    apiKeyRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
    apiKeyInput:     { flex: 1, paddingVertical: 10, paddingHorizontal: 12, fontSize: 14, color: colors.text },
    apiToggle:       { padding: 10 },
    saveKeyBtn:      { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
    saveKeyText:     { fontSize: 14, fontWeight: '700', color: '#fff' },
    toggleRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
    toggleRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    toggleLabel:     { fontSize: 14, fontWeight: '600', color: colors.text },
    toggleDesc:      { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    flagIcon:        { fontSize: 18 },
    version:         { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 24 },
    versionSub:      { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 4, marginBottom: 8 },
    modalContainer:     { flex: 1, backgroundColor: colors.background },
    modalHeader:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    modalTitle:         { fontSize: 20, fontWeight: '800', color: colors.text },
    modalClose:         { padding: 4 },
    languageList:       { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
    languageRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, marginBottom: 4, backgroundColor: 'transparent' },
    languageRowActive:  { backgroundColor: colors.primary + '18', borderWidth: 1.5, borderColor: colors.primary + '40' },
    languageFlag:       { fontSize: 20 },
    languageName:       { fontSize: 16, fontWeight: '600', color: colors.text },
    languageNameActive: { color: colors.primary, fontWeight: '700' },
    languageNative:     { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  });
}
