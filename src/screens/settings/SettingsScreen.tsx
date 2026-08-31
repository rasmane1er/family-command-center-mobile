import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, I18nManager, Linking, Modal, Platform, Pressable, ScrollView, Share,
  StyleSheet, Switch, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as LocalAuthentication from 'expo-local-authentication';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { i18n } from '../../i18n';

import { Card } from '../../components/common/Card';
import { resetAllStores } from '../../storage/resetAllStores';
import { useAppStore } from '../../store/useAppStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useTheme } from '../../theme/ThemeContext';
import { useSubscription, SubscriptionTier, TIER_LABELS, TIER_PRICES, TIER_FEATURES } from '../../hooks/useSubscription';
import { usePurchases } from '../../hooks/usePurchases';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';

const TIER_ORDER: SubscriptionTier[] = ['free', 'premium', 'family_pro'];

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
  const { t } = useTranslation('settings');
  const { colors, isDark } = useTheme();

  const { settings, updateSettings, toggleMilitaryMode } = useAppStore();
  const { tier: currentTier, canAccess } = useSubscription();
  const { user, signOut, deleteAccount, mfaEnabled, exportMyData } = useAuthStore();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const militaryMode = settings?.militaryMode || false;

  const { restore, showPaywall, showCustomerCenter, currentPeriod, error: purchasesError } = usePurchases();
  const [purchasingTier, setPurchasingTier] = useState<SubscriptionTier | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  // Which billing period is highlighted per tier card before the user taps
  // Upgrade/Downgrade — defaults to monthly. For the tier the user is
  // currently on, currentPeriod (the real, server-confirmed period) is used
  // instead of this local guess, so the toggle can't show a period they're
  // not actually on.
  const [selectedPeriods, setSelectedPeriods] = useState<Partial<Record<SubscriptionTier, 'monthly' | 'annual'>>>({});
  const getSelectedPeriod = (tierKey: SubscriptionTier): 'monthly' | 'annual' =>
    tierKey === currentTier ? (currentPeriod ?? 'monthly') : (selectedPeriods[tierKey] ?? 'monthly');

  const family        = useFamilyStore((s) => s.family);
  const members       = useFamilyStore((s) => s.members);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);
  const activeMember  = members.find((m) => m.id === activeMemberId);
  const isParent      = activeMember?.role === 'parent' || activeMember?.role === 'guardian' || activeMember?.isAdmin === true;
  const isChild       = activeMember?.role === 'child';
  const isGrandparent = activeMember?.role === 'grandparent';
  const roleLabel     = activeMember ? activeMember.role.charAt(0).toUpperCase() + activeMember.role.slice(1) : 'Family';

  const [showLanguageModal, setShowLanguageModal]  = useState(false);
  const [biometricEnabled,  setBiometricEnabled]   = useState(settings.biometricLock ?? false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel,    setBiometricLabel]     = useState('Biometric');
  const hideBalances = settings.hideBalances ?? false;
  const autoLock     = settings.autoLock ?? true;
  const [notifState, setNotifState] = useState<Record<string, boolean>>({
    billReminders: true, taskReminders: true, lowStockAlerts: true,
    budgetAlerts: true, achievementAlerts: true, familyUpdates: true,
    birthdayReminders: true, eventReminders: true,
  });

  const currentLanguage = LANGUAGES.find((l) => l.code === (settings.language || 'en')) || LANGUAGES[0];

  // Reflect the device's actual biometric capability rather than trusting the
  // stored preference blindly — e.g. if biometrics were removed from the
  // device after the setting was turned on, don't keep claiming it's active.
  useEffect(() => {
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const available = hasHardware && isEnrolled;
      setBiometricAvailable(available);

      if (hasHardware) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricLabel('Face ID');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricLabel('Touch ID');
        }
      }

      if (!available && settings.biometricLock) {
        setBiometricEnabled(false);
        updateSettings({ biometricLock: false });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = () => {
    Alert.alert(t('settings.signOutTitle'), t('settings.signOutMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.signOutConfirm'), style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(t('settings.deleteAccountConfirm'), t('settings.deleteAccountConfirmMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.deleteAccountAction'),
        style: 'destructive',
        onPress: async () => {
          setIsDeletingAccount(true);
          const result = await deleteAccount();
          setIsDeletingAccount(false);
          if (result.success) {
            resetAllStores();
            signOut();
          } else {
            Alert.alert(t('common.error'), result.error ?? t('settings.deleteAccountFailedMsg'));
          }
        },
      },
    ]);
  };

  // Manage/cancel/change-plan and restore all live in RevenueCat's Customer
  // Center now — it's the dashboard-configured, best-practice replacement for
  // a hand-rolled "open App Store subscription settings" deep link.
  // The store's own subscription page (Play Store / App Store) is the only
  // guaranteed way to cancel — it works regardless of whether the RevenueCat
  // dashboard's Customer Center has cancellation paths configured for this
  // project. Always offering it alongside Customer Center (instead of only
  // as a silent fallback on error) means "how do I cancel" always has a
  // working answer, not one that depends on dashboard setup we can't verify
  // from here.
  const openStoreSubscriptions = () => {
    const url = Platform.OS === 'ios'
      ? 'itms-apps://apps.apple.com/account/subscriptions'
      : 'https://play.google.com/store/account/subscriptions';
    Linking.openURL(url).catch(() =>
      Alert.alert(t('common.error'), 'Unable to open subscription management.'),
    );
  };

  const handleManageSubscription = () => {
    Alert.alert(t('settings.manageSubscription'), t('settings.manageSubscriptionChooseMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.manageSubscriptionOpenCenter'), onPress: () => { showCustomerCenter().catch(openStoreSubscriptions); } },
      { text: t('settings.manageSubscriptionOpenStore'), onPress: openStoreSubscriptions },
    ]);
  };

  // Each paid tier maps to its own RevenueCat entitlement (see
  // src/config/revenuecat.ts). showPaywall() purchases the exact package for
  // the tapped tier + period directly — see usePurchases.ts for why it no
  // longer relies on RevenueCat's generic dashboard-configured Paywall UI.
  const handleUpgrade = async (tierKey: SubscriptionTier, period: 'monthly' | 'annual' = 'monthly') => {
    // Only a true no-op when it's the same tier AND the same billing period —
    // tapping "Switch to Yearly" on the tier you already own (tierKey ===
    // currentTier, period === 'annual' !== currentPeriod) must fall through
    // to a real purchase, not this alert. Free has no period to compare.
    if (tierKey === currentTier && (tierKey === 'free' || period === currentPeriod)) {
      Alert.alert(t('settings.currentPlanTitle'), t('settings.currentPlanMsg', { plan: TIER_LABELS[tierKey] }));
      return;
    }

    // Android's in-place replace (STORE_REPLACEMENT_MODE) assumes exactly one
    // currently-owned subscription to swap out. With two already active (the
    // overlap state this card warns about), Play Billing rejects the
    // replace call outright — it surfaces to JS as a bare "One or more of
    // the arguments provided are invalid", which read like a fresh bug but
    // is actually just this precondition never being checked. Block the
    // attempt here and send the user to resolve the duplicate first instead
    // of letting Play Billing throw the cryptic native error.
    if (useAppStore.getState().settings.hasOverlappingSubscriptions) {
      Alert.alert(t('settings.overlappingSubsBlockedTitle'), t('settings.overlappingSubsBlockedMsg'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('settings.overlappingSubsAction'), onPress: handleManageSubscription },
      ]);
      return;
    }

    const isDowngrade = TIER_ORDER.indexOf(tierKey) < TIER_ORDER.indexOf(currentTier);
    const isPeriodSwitch = tierKey === currentTier && period !== currentPeriod;
    // Android can replace one paid tier — or the same tier on a different
    // billing period — in-place via Play Billing (see usePurchases.showPaywall),
    // so both a paid→paid downgrade and a same-tier period switch go through
    // the same purchase path as an upgrade there. Downgrading to free isn't a
    // purchase on any platform, and iOS has no in-place replacement without an
    // App Store Connect Subscription Group for EITHER case — a plain purchase
    // there would stack a second, overlapping subscription instead of
    // replacing the first, so both still need native subscription management.
    const needsManageSubscription =
      (isDowngrade && (tierKey === 'free' || Platform.OS === 'ios')) ||
      (isPeriodSwitch && Platform.OS === 'ios');

    if (needsManageSubscription) {
      if (isPeriodSwitch) {
        Alert.alert(
          t('settings.periodSwitchTitle'),
          t('settings.periodSwitchMsg'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('settings.downgradeConfirm'), onPress: handleManageSubscription },
          ],
        );
      } else {
        Alert.alert(
          t('settings.downgradeTitle', { plan: TIER_LABELS[tierKey] }),
          t('settings.downgradeMsg'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('settings.downgradeConfirm'), onPress: handleManageSubscription },
          ],
        );
      }
      return;
    }

    setPurchasingTier(tierKey);
    try {
      const result = await showPaywall(tierKey as 'premium' | 'family_pro', period);
      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        // Only reachable on iOS now (Android replaces in-place, see above) —
        // still worth checking, since iOS can't avoid a brief overlap when
        // switching between two paid tiers without store-side product
        // grouping. Surface it immediately with a one-tap fix instead of
        // leaving the customer silently paying for both.
        if (useAppStore.getState().settings.hasOverlappingSubscriptions) {
          Alert.alert(t('settings.overlappingSubsTitle'), t('settings.overlappingSubsDesc'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('settings.overlappingSubsAction'), onPress: handleManageSubscription },
          ]);
        } else {
          Alert.alert(t('settings.upgradeSuccessTitle'), t('settings.upgradeSuccessMsg', { plan: TIER_LABELS[tierKey] }));
        }
      } else if (result === PAYWALL_RESULT.ERROR) {
        Alert.alert(t('settings.purchaseFailedTitle'), purchasesError ?? t('settings.purchaseFailedMsg'));
      }
    } catch {
      Alert.alert(t('settings.purchaseFailedTitle'), purchasesError ?? t('settings.purchaseFailedGeneric'));
    } finally {
      setPurchasingTier(null);
    }
  };

  const handleRestorePurchases = async () => {
    setIsRestoring(true);
    const result = await restore();
    setIsRestoring(false);
    if (result.success) {
      Alert.alert(t('settings.restoredTitle'), t('settings.restoredMsg'));
    } else {
      Alert.alert(t('settings.restoreFailedTitle'), result.error ?? t('settings.restoreFailedMsg'));
    }
  };

  const handleSelectLanguage = (code: string) => {
    updateSettings({ language: code });
    i18n.changeLanguage(code);
    setShowLanguageModal(false);

    const isRTL = code === 'ar';
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.forceRTL(isRTL);
      // RTL/LTR layout changes require a full process restart to take effect.
      // RCTReloadCommand triggers the same reload as shaking the device → Reload.
      Alert.alert(
        t('settings.languageUpdated'),
        t('settings.languageUpdatedMsg') + '\n\nThe app will restart to apply the layout direction.',
        [{
          text: 'OK',
          onPress: () => {
            const { DevSettings } = require('react-native');
            DevSettings?.reload?.();
          },
        }]
      );
    } else {
      Alert.alert(t('settings.languageUpdated'), t('settings.languageUpdatedMsg'));
    }
  };

  const handleHelpSupport = () => {
    navigation.navigate('HelpSupport');
  };

  const handleRateApp = () => {
    // Deliberately NOT using StoreReview.requestReview() here — that API
    // (SKStoreReviewController / Play in-app review) is designed for
    // automatic, contextual prompts, not a manually-tapped "Rate the App"
    // row. isAvailableAsync() only confirms the OS *has* the API, not that
    // tapping it will visibly do anything: Apple silently no-ops
    // requestReview() in Simulator, in non-App-Store builds, and once the
    // yearly 3-prompt quota is used up — with no error and no signal to
    // fall back on, so routing this specific, deliberate tap through it
    // meant the button could silently do nothing at all. A direct link to
    // the store's review page always does something visible.
    const appStoreUrl = 'https://apps.apple.com/app/id6792257899?action=write-review';
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

  const [exportingData, setExportingData] = useState(false);

  // Self-service GDPR/CCPA data export — writes the backend's JSON export to
  // a temp file and hands it to the OS share sheet so the user can save it
  // or send it wherever they like, rather than us guessing a destination.
  const handleExportData = async () => {
    setExportingData(true);
    const result = await exportMyData();
    setExportingData(false);
    if (!result.success) {
      Alert.alert(t('common.error'), result.error ?? 'Could not export your data.');
      return;
    }
    try {
      const path = `${FileSystem.cacheDirectory}family-command-center-export-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(path, JSON.stringify(result.data, null, 2));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Your Family Command Center data' });
      } else {
        Alert.alert('Export ready', `Saved to ${path}`);
      }
    } catch {
      Alert.alert(t('common.error'), 'Could not save the export file.');
    }
  };

  const handleShareApp = () => {
    Share.share({
      title: 'Family Command Center',
      message:
        'Check out Family Command Center — the all-in-one app to manage your family\'s life! Tasks, finance, health, AI assistant and more.\n\nhttps://myfamilycommandcenter.com',
    }).catch(() => {});
  };

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          'Biometrics Unavailable',
          !hasHardware
            ? 'This device does not support Face ID or fingerprint authentication.'
            : `No biometrics are enrolled. Set up ${biometricLabel} in your device settings first.`,
        );
        return;
      }
      // Confirm the device's biometrics actually work before committing to the setting.
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Confirm ${biometricLabel} to enable biometric lock`,
      });
      if (!result.success) {
        return;
      }
      setBiometricAvailable(true);
    }

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
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={s.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>{t('settings.title')}</Text>
        <View style={{ width: 40 }} />
      </View>
      <Pressable accessibilityRole="button" style={s.profileRow} onPress={() => navigation.navigate('Profile')}>
        <View style={s.profileAvatar}>
          <Ionicons name={isChild ? 'school' : isGrandparent ? 'heart' : 'home'} size={24} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.profileName}>{activeMember?.name || family?.name || 'Your Family'}</Text>
          <Text style={s.profilePlan}>{roleLabel} Profile • {family?.name || 'Family Command Center'}</Text>
          {user?.email && <Text style={s.profileEmail}>{user.email}</Text>}
        </View>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
      </Pressable>
    </LinearGradient>
  );

  const screenCompact = (
    <View style={{ backgroundColor: '#0F2952', paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={s.back}>
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
            {settings.hasOverlappingSubscriptions && (
              <Card style={{ ...s.roleNoticeCard, borderColor: colors.warning, borderWidth: 1 }} variant="elevated">
                <Ionicons name="warning-outline" size={20} color={colors.warning} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.roleNoticeTitle}>{t('settings.overlappingSubsTitle')}</Text>
                  <Text style={s.roleNoticeText}>{t('settings.overlappingSubsDesc')}</Text>
                  <Pressable accessibilityRole="button" onPress={handleManageSubscription} style={{ marginTop: 8 }}>
                    <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('settings.overlappingSubsAction')}</Text>
                  </Pressable>
                </View>
              </Card>
            )}
            {SUBSCRIPTION_TIERS.map((tier) => (
              <Card key={tier.key}
                style={tier.key === 'family_pro' ? { ...s.tierCard, ...s.tierCardHighlight } : s.tierCard}
                variant="elevated">
                <View style={s.tierHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.tierName, { color: colors[tier.colorKey] }]}>{tier.label}</Text>
                    {tier.key === currentTier && tier.yearlyPrice && (
                      <Text style={s.billedCaption}>
                        Current plan · Billed {currentPeriod === 'annual' ? 'yearly' : 'monthly'}
                      </Text>
                    )}
                    {tier.yearlyPrice ? (
                      <View style={s.periodToggle}>
                        {(['monthly', 'annual'] as const).map((period) => {
                          const isSelected = getSelectedPeriod(tier.key as SubscriptionTier) === period;
                          const isNoOpTap = tier.key === currentTier && period === currentPeriod;
                          return (
                            <Pressable accessibilityRole="button"
                              key={period}
                              disabled={purchasingTier !== null || isNoOpTap}
                              onPress={() => {
                                if (tier.key === currentTier) {
                                  handleUpgrade(tier.key as SubscriptionTier, period);
                                } else {
                                  setSelectedPeriods((p) => ({ ...p, [tier.key]: period }));
                                }
                              }}
                              style={[
                                s.periodChip,
                                { borderColor: colors.border },
                                isSelected && { borderColor: colors[tier.colorKey], backgroundColor: colors[tier.colorKey] + '14' },
                              ]}
                            >
                              <Text style={[s.periodChipLabel, { color: isSelected ? colors[tier.colorKey] : colors.textMuted }]}>
                                {period === 'monthly' ? 'Monthly' : 'Yearly'}
                              </Text>
                              <Text style={[s.periodChipPrice, { color: isSelected ? colors[tier.colorKey] : colors.textSecondary }]}>
                                {period === 'monthly' ? tier.price : `${tier.yearlyPrice} · -${tier.yearlySavingsPct}%`}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : (
                      <Text style={s.tierPrice}>{tier.price}</Text>
                    )}
                  </View>
                  {tier.key === currentTier ? (
                    <View style={[s.currentBadge, { backgroundColor: colors.success + '20' }]}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                      <Text style={[s.currentBadgeText, { color: colors.success }]}>Current Plan</Text>
                    </View>
                  ) : TIER_ORDER.indexOf(tier.key as SubscriptionTier) < TIER_ORDER.indexOf(currentTier) ? (
                    <Pressable accessibilityRole="button" style={s.downgradeBtnSmall} onPress={() => handleUpgrade(tier.key as SubscriptionTier)}>
                      <Text style={[s.downgradeBtnText, { color: colors.textMuted }]}>Downgrade</Text>
                    </Pressable>
                  ) : (
                    <Pressable accessibilityRole="button"
                      style={[s.upgradeBtn, { backgroundColor: colors[tier.colorKey as keyof typeof colors] as string }, purchasingTier === tier.key && s.upgradeBtnDisabled]}
                      disabled={purchasingTier !== null}
                      onPress={() => handleUpgrade(tier.key as SubscriptionTier, getSelectedPeriod(tier.key as SubscriptionTier))}
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

            <TouchableOpacity accessibilityRole="button"
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

          <Pressable accessibilityRole="button" style={[s.toggleRow, isParent ? s.toggleRowBorder : undefined]} onPress={() => setShowLanguageModal(true)}>
            <Text style={s.flagIcon}>{currentLanguage.flag}</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.toggleLabel}>{t('settings.language')}</Text>
              <Text style={s.toggleDesc}>{currentLanguage.label} ({currentLanguage.nativeLabel})</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>

          {isParent && (
            <View style={[s.toggleRow, militaryMode && s.toggleRowBorder]}>
              <Ionicons name="shield-outline" size={20} color="#4A7C59" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.toggleLabel}>{t('settings.militaryMode')}</Text>
                <Text style={s.toggleDesc}>{t('settings.militaryModeDesc')}</Text>
              </View>
              <Switch value={militaryMode} onValueChange={(v) => {
                if (v && !canAccess('militaryMode')) {
                  Alert.alert(t('settings.militaryProTitle'), t('settings.militaryProMsg'), [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('settings.upgrade'), onPress: () => handleUpgrade('family_pro') },
                  ]);
                  return;
                }
                toggleMilitaryMode();
              }}
                trackColor={{ false: colors.border, true: '#4A7C5960' }} thumbColor="#4A7C59" />
            </View>
          )}

          {isParent && militaryMode && (
            <Pressable accessibilityRole="button" style={s.toggleRow} onPress={() => navigation.navigate('MilitaryHub')}>
              <Ionicons name="ribbon-outline" size={20} color="#4A7C59" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.toggleLabel}>Military Hub</Text>
                <Text style={s.toggleDesc}>Deployment tracker, PCS checklist, and family readiness card</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </Card>

        {/* ── PRIVACY & SECURITY ── */}
        <Text style={s.sectionTitle}>{t('settings.privacy')}</Text>
        <Card style={s.settingCard} variant="elevated">
          <View style={[s.toggleRow, s.toggleRowBorder]}>
            <Ionicons name="finger-print" size={20} color={biometricAvailable ? colors.primary : colors.textMuted} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.toggleLabel}>{t('settings.biometric')}</Text>
              <Text style={s.toggleDesc}>
                {biometricAvailable ? `Use ${biometricLabel} to lock the app` : `${biometricLabel} is not set up on this device`}
              </Text>
            </View>
            <Switch value={biometricEnabled && biometricAvailable} onValueChange={handleBiometricToggle}
              trackColor={{ false: colors.border, true: colors.primary + '60' }} thumbColor={colors.primary} />
          </View>

          {!isChild && (
            <Pressable accessibilityRole="button" style={[s.toggleRow, s.toggleRowBorder]} onPress={() => navigation.navigate('MfaSettings')}>
              <Ionicons name="shield-checkmark-outline" size={20} color={mfaEnabled ? '#34C759' : colors.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.toggleLabel}>Two-Factor Authentication</Text>
                <Text style={s.toggleDesc}>{mfaEnabled ? 'On — required at sign in' : 'Off — add an extra layer of security'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          )}

          {!isChild && (
            <Pressable accessibilityRole="button" style={[s.toggleRow, s.toggleRowBorder]} onPress={handleExportData} disabled={exportingData}>
              <Ionicons name="download-outline" size={20} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.toggleLabel}>Export My Data</Text>
                <Text style={s.toggleDesc}>Download a copy of your account and family data</Text>
              </View>
              {exportingData ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
            </Pressable>
          )}

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
        </Card>

        {/* ── REFER & EARN ── */}
        <Pressable accessibilityRole="button"
          style={({ pressed }) => [s.referBanner, { opacity: pressed ? 0.88 : 1 }]}
          onPress={() => navigation.navigate('ReferAndEarn')}
        >
          <LinearGradient colors={['#0A1628', '#0B4F82']} style={s.referBannerGrad}>
            <View style={s.referBannerOrb} />
            <View style={s.referBannerLeft}>
              <Ionicons name="gift-outline" size={26} color="#60A5FA" />
              <View>
                <Text style={s.referBannerTitle}>Refer &amp; Earn</Text>
                <Text style={s.referBannerSub}>Invite 5 families → get 1 free month</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
          </LinearGradient>
        </Pressable>

        {/* ── ABOUT ── */}
        <Text style={s.sectionTitle}>{t('settings.about')}</Text>
        <Card style={s.settingCard} variant="elevated">
          {[
            { icon: 'document-text-outline' as const, label: t('settings.privacyPolicy'), onPress: () => navigation.navigate('PrivacyPolicy') },
            { icon: 'shield-checkmark-outline' as const, label: t('settings.terms'), onPress: () => navigation.navigate('TermsOfService') },
            { icon: 'help-circle-outline' as const, label: t('settings.helpSupport'), onPress: handleHelpSupport },
            { icon: 'star-outline' as const, label: t('settings.rateApp'), onPress: handleRateApp },
            { icon: 'share-outline' as const, label: t('settings.shareApp'), onPress: handleShareApp },
          ].map((item, index, arr) => (
            <Pressable accessibilityRole="button" key={item.label} style={[s.toggleRow, index < arr.length - 1 && s.toggleRowBorder]} onPress={item.onPress}>
              <Ionicons name={item.icon} size={20} color={colors.primary} />
              <Text style={[s.toggleLabel, { marginLeft: 12, flex: 1 }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          ))}
        </Card>

        {/* ── SIGN OUT / DELETE ACCOUNT ── */}
        <Text style={s.sectionTitle}>Account</Text>
        {currentTier !== 'free' && (
          <Card style={s.settingCard} variant="elevated">
            <Pressable accessibilityRole="button" onPress={handleManageSubscription} style={s.toggleRow}>
              <Ionicons name="card-outline" size={20} color={colors.primary} />
              <Text style={[s.toggleLabel, { marginLeft: 12, flex: 1 }]}>{t('settings.manageSubscription')}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          </Card>
        )}
        <Card style={s.settingCard} variant="elevated">
          <Pressable accessibilityRole="button" onPress={handleSignOut} style={s.toggleRow}>
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={[s.toggleLabel, { marginLeft: 12, flex: 1, color: colors.danger }]}>Sign Out</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        </Card>
        <Card style={s.settingCard} variant="elevated">
          <Pressable accessibilityRole="button" onPress={handleDeleteAccount} style={s.toggleRow} disabled={isDeletingAccount}>
            {isDeletingAccount ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            )}
            <Text style={[s.toggleLabel, { marginLeft: 12, flex: 1, color: colors.danger }]}>
              {t('settings.deleteAccountLabel')}
            </Text>
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
            <Pressable accessibilityRole="button" onPress={() => setShowLanguageModal(false)} style={s.modalClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={s.languageList}>
            {LANGUAGES.map((lang) => {
              const isSelected = (settings.language || 'en') === lang.code;
              return (
                <TouchableOpacity accessibilityRole="button" key={lang.code}
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
    billedCaption:   { fontSize: 12, color: colors.textMuted, marginTop: 2, fontWeight: '600' },
    periodToggle:    { flexDirection: 'row', gap: 8, marginTop: 8 },
    periodChip:      { flex: 1, borderWidth: 1.5, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10 },
    periodChipLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
    periodChipPrice: { fontSize: 13, fontWeight: '700', marginTop: 1 },
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

    referBanner:        { marginHorizontal: 16, marginBottom: 10, borderRadius: 18, overflow: 'hidden' },
    referBannerGrad:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 18 },
    referBannerOrb:     { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(56,130,255,0.14)', top: -40, right: 20 },
    referBannerLeft:    { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
    referBannerTitle:   { fontSize: 15, fontWeight: '800', color: '#fff' },
    referBannerSub:     { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  });
}
