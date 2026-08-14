import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { getReferralInfo, reportReferralShare, ReferralStats } from '../../api/referrals';

const APP_STORE_LINK = 'https://myfamilycommandcenter.com';

export function ReferAndEarnScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [data, setData] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const info = await getReferralInfo();
      setData(info);
    } catch {
      Alert.alert('Error', 'Could not load your referral info. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleShare = useCallback(async () => {
    if (!data?.referralCode) return;
    const code = data.referralCode;
    const link = `${APP_STORE_LINK}?ref=${code}`;
    try {
      const result = await Share.share({
        message: `Join me on Family Command Center — the all-in-one family management app!\n\nUse my invite code ${code} when signing up to get started:\n${link}`,
        url: link,
        title: 'Join Family Command Center',
      });
      // iOS reliably resolves with dismissedAction when the user cancels the
      // share sheet without picking an app; Android's share intent has no
      // cancel signal and always resolves with sharedAction once dispatched.
      // Either way, "not dismissed" is the closest available signal to "sent".
      if (result.action !== Share.dismissedAction) {
        setData((prev) => (prev ? { ...prev, stats: { ...prev.stats, sent: prev.stats.sent + 1 } } : prev));
        reportReferralShare().catch(() => {
          // Best-effort — the optimistic count above already reflects this
          // share; a failed report just means the next load() falls back to
          // the server's (one-lower) count instead.
        });
      }
    } catch {
      // User cancelled — no-op
    }
  }, [data]);

  const s = makeStyles(colors);
  const subscribed = data?.stats.subscribed ?? 0;
  const toNext = data?.stats.toNextReward ?? 5;
  const progressPct = Math.min(((5 - toNext) / 5) * 100, 100);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Hero banner */}
      <LinearGradient colors={['#0A1628', '#0D2D52', '#0B4F82']} style={[s.hero, { paddingTop: insets.top + 12 }]}>
        <View style={s.heroOrb} />
        {/* Back button */}
        <Pressable accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={s.backBtn}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Ionicons name="gift-outline" size={44} color="#fff" style={s.heroIcon} />
        <Text style={s.heroTitle}>Refer &amp; Earn</Text>
        <Text style={s.heroSub}>
          Invite 5 families who subscribe and get{'\n'}
          <Text style={s.heroHighlight}>1 free month</Text> of your current plan
        </Text>
      </LinearGradient>

      {/* Progress card */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Your Progress</Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
        ) : (
          <>
            <View style={s.progressRow}>
              <Text style={s.progressCount}>
                <Text style={[s.progressNum, { color: colors.primary }]}>{subscribed}</Text>
                <Text style={s.progressDen}> / 5</Text>
              </Text>
              <Text style={s.progressLabel}>families subscribed</Text>
            </View>

            {/* Progress bar */}
            <View style={s.barTrack}>
              <View style={[s.barFill, { width: `${progressPct}%`, backgroundColor: colors.primary }]} />
            </View>

            <Text style={s.progressHint}>
              {toNext === 0
                ? '🎉 You earned a free month! It has been added to your account.'
                : `${toNext} more subscription${toNext === 1 ? '' : 's'} to earn your next free month`}
            </Text>

            {(data?.creditsAvailable ?? 0) > 0 && (
              <View style={[s.creditBadge, { backgroundColor: colors.success + '18', borderColor: colors.success + '40' }]}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={[s.creditText, { color: colors.success }]}>
                  {data!.creditsAvailable} free month{data!.creditsAvailable > 1 ? 's' : ''} active on your account
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* Referral code + share */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Your Invite Code</Text>
        <View style={s.codeRow}>
          <Text style={[s.code, { color: colors.primary }]}>{data?.referralCode ?? '——'}</Text>
        </View>
        <Pressable accessibilityRole="button"
          style={({ pressed }) => [s.shareBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
          onPress={handleShare}
          disabled={!data?.referralCode}
        >
          <Ionicons name="share-social-outline" size={18} color="#fff" />
          <Text style={s.shareBtnText}>Share Invite Link</Text>
        </Pressable>
      </View>

      {/* How it works */}
      <View style={s.card}>
        <Text style={s.cardTitle}>How It Works</Text>
        {STEPS.map((step, i) => (
          <View key={i} style={s.step}>
            <View style={[s.stepNum, { backgroundColor: colors.primary + '18' }]}>
              <Text style={[s.stepNumText, { color: colors.primary }]}>{i + 1}</Text>
            </View>
            <View style={s.stepBody}>
              <Text style={s.stepTitle}>{step.title}</Text>
              <Text style={[s.stepDesc, { color: colors.textMuted }]}>{step.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Lifetime stats */}
      {data && (
        <View style={s.statsRow}>
          <StatChip icon="paper-plane-outline" label="Invites Sent" value={data.stats.sent} colors={colors} />
          <StatChip icon="people-outline" label="Subscribed" value={data.stats.subscribed} colors={colors} />
          <StatChip icon="star-outline" label="Credits Earned" value={data.stats.creditsEarned} colors={colors} />
        </View>
      )}
    </ScrollView>
  );
}

const STEPS = [
  { title: 'Share your code', desc: 'Tap the button above to send your unique invite link to friends and family.' },
  { title: 'They sign up & subscribe', desc: 'When someone registers using your code and starts a paid plan, they count.' },
  { title: 'Earn a free month', desc: 'Every 5 subscribers earns you 1 free month, automatically applied to your account.' },
];

function StatChip({ icon, label, value, colors }: { icon: any; label: string; value: number; colors: any }) {
  return (
    <View style={[chipStyles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={[chipStyles.value, { color: colors.text }]}>{value}</Text>
      <Text style={[chipStyles.label, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    gap: 4,
  },
  value: { fontSize: 22, fontWeight: '700' },
  label: { fontSize: 11, textAlign: 'center' },
});

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingBottom: 40 },

    hero: {
      paddingBottom: 36,
      paddingHorizontal: 24,
      alignItems: 'center',
      overflow: 'hidden',
    },
    backBtn: {
      position: 'absolute',
      left: 16,
      top: 14,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroOrb: {
      position: 'absolute',
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: 'rgba(56,130,255,0.14)',
      top: -60,
      right: -60,
    },
    heroIcon: { marginBottom: 14 },
    heroTitle: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 8 },
    heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 21 },
    heroHighlight: { color: '#60A5FA', fontWeight: '700' },

    card: {
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginTop: 14,
      borderRadius: 18,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 16 },

    progressRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 10 },
    progressCount: {},
    progressNum: { fontSize: 36, fontWeight: '800' },
    progressDen: { fontSize: 20, color: colors.textMuted, fontWeight: '600' },
    progressLabel: { fontSize: 13, color: colors.textMuted },
    barTrack: {
      height: 8,
      backgroundColor: colors.border,
      borderRadius: 4,
      marginBottom: 10,
      overflow: 'hidden',
    },
    barFill: { height: 8, borderRadius: 4 },
    progressHint: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
    creditBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 12,
      borderRadius: 10,
      borderWidth: 1,
      padding: 10,
    },
    creditText: { fontSize: 13, fontWeight: '600' },

    codeRow: { alignItems: 'center', marginBottom: 16 },
    code: { fontSize: 32, fontWeight: '800', letterSpacing: 6 },

    shareBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 14,
      paddingVertical: 14,
    },
    shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

    step: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 16 },
    stepNum: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepNumText: { fontSize: 14, fontWeight: '800' },
    stepBody: { flex: 1 },
    stepTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
    stepDesc: { fontSize: 12, lineHeight: 17 },

    statsRow: {
      flexDirection: 'row',
      gap: 10,
      marginHorizontal: 16,
      marginTop: 14,
    },
  });
}
