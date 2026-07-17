import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Dimensions, Pressable, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { Button } from '../../components/common/Button';
import { useAIStore } from '../../store/useAIStore';
import { useAppStore } from '../../store/useAppStore';

const { width } = Dimensions.get('window');

const features = [
  { icon: 'people', color: '#4ECDC4', bg: '#E8F8F7', titleKey: 'featureDashboardTitle', descKey: 'featureDashboardDesc' },
  { icon: 'wallet', color: '#F5A623', bg: '#FEF3E2', titleKey: 'featureFinanceTitle', descKey: 'featureFinanceDesc' },
  { icon: 'grid', color: '#27AE60', bg: '#D5F5E3', titleKey: 'featureOpsTitle', descKey: 'featureOpsDesc' },
  { icon: 'sparkles', color: '#0F2952', bg: '#E8EEF9', titleKey: 'featureAiTitle', descKey: 'featureAiDesc' },
  { icon: 'trophy', color: '#FFD700', bg: '#FFFACC', titleKey: 'featureRewardsTitle', descKey: 'featureRewardsDesc' },
  { icon: 'shield-checkmark', color: '#E74C3C', bg: '#FDEDEC', titleKey: 'featureSafetyTitle', descKey: 'featureSafetyDesc' },
];

export function WelcomeScreen({ navigation }: any) {
  const { t } = useTranslation('onboarding');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const seedDemoAI = useAIStore((s) => s.seedDemoInsights);
  const setOnboarded = useAppStore((s) => s.setOnboarded);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }),
    ]).start();
  }, []);

  const handleStartSetup = () => navigation.navigate('FamilySetup');

  const handleJoinFamily = () => navigation.navigate('ChildConnect');

  const handleDemoMode = () => {
    Alert.alert(
      t('onboarding.screens.welcome.demoAlertTitle'),
      t('onboarding.screens.welcome.demoAlertMsg'),
      [
        { text: t('onboarding.screens.welcome.demoAlertCancel'), style: 'cancel' },
        {
          text: t('onboarding.screens.welcome.demoAlertContinue'),
          onPress: () => {
            seedDemoAI();
            setOnboarded(true);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#0F2952', '#1E4A8A']} style={styles.header}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <Text style={styles.headerGreeting}>{t('onboarding.screens.welcome.headerGreeting')}</Text>
            <Text style={styles.headerTitle}>{t('onboarding.screens.welcome.headerTitle')}</Text>
            <Text style={styles.headerSub}>{t('onboarding.screens.welcome.headerSub')}</Text>
          </Animated.View>
        </LinearGradient>
        <Text style={styles.sectionTitle}>{t('onboarding.screens.welcome.sectionTitle')}</Text>

        <View style={styles.featuresGrid}>
          {features.map((f, i) => (
            <Animated.View
              key={i}
              style={[
                styles.featureCard,
                shadows.card,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: Animated.add(slideAnim, new Animated.Value(i * 5)) }],
                },
              ]}
            >
              <View style={[styles.featureIcon, { backgroundColor: f.bg }]}>
                <Ionicons name={f.icon as any} size={22} color={f.color} />
              </View>
              <Text style={styles.featureTitle}>{t(`onboarding.screens.welcome.${f.titleKey}`)}</Text>
              <Text style={styles.featureDesc}>{t(`onboarding.screens.welcome.${f.descKey}`)}</Text>
            </Animated.View>
          ))}
        </View>

        <View style={styles.ctaArea}>
          <Button title={t('onboarding.screens.welcome.setupButton')} onPress={handleStartSetup} fullWidth size="lg" />
          <Pressable onPress={handleJoinFamily} style={[styles.demoButton, styles.joinButton]}>
            <Ionicons name="people-outline" size={20} color={colors.primary} />
            <Text style={styles.demoText}>Join an Existing Family</Text>
          </Pressable>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('onboarding.screens.welcome.orDivider')}</Text>
            <View style={styles.dividerLine} />
          </View>
          <Pressable onPress={handleDemoMode} style={styles.demoButton}>
            <Ionicons name="play-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.demoText}>{t('onboarding.screens.welcome.demoButton')}</Text>
          </Pressable>
        </View>

        <View style={styles.tierBadges}>
          {[t('onboarding.screens.welcome.tierFree'), t('onboarding.screens.welcome.tierPremium'), t('onboarding.screens.welcome.tierFamilyPro')].map((tier, i) => (
            <View key={i} style={[styles.tierBadge, i === 1 && styles.tierBadgeHighlight]}>
              <Text style={[styles.tierText, i === 1 && styles.tierTextHighlight]}>{tier}</Text>
              {i === 1 && <Text style={styles.popularTag}>{t('onboarding.screens.welcome.popularTag')}</Text>}
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          {t('onboarding.screens.welcome.footer')}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 60, paddingBottom: 32, paddingHorizontal: 24 },
  headerGreeting: { fontSize: 16, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: 4 },
  headerTitle: { fontSize: 34, fontWeight: '800', color: '#fff', lineHeight: 42, letterSpacing: -0.5, marginBottom: 8 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 22 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 48 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 16 },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  featureCard: {
    width: Math.min((width - 52) / 2, 180),
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featureTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 6 },
  featureDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  ctaArea: { marginBottom: 28 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { marginHorizontal: 16, color: colors.textMuted, fontSize: 13 },
  joinButton: { marginTop: 10, borderColor: colors.primary },
  demoButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border },
  demoText: { fontSize: 15, color: colors.primary, fontWeight: '600' },
  tierBadges: { flexDirection: 'row', gap: 8, marginBottom: 20, justifyContent: 'center' },
  tierBadge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: colors.border },
  tierBadgeHighlight: { backgroundColor: colors.primary },
  tierText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  tierTextHighlight: { color: '#fff' },
  popularTag: { fontSize: 9, color: colors.secondary, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  footer: { textAlign: 'center', fontSize: 12, color: colors.textMuted, lineHeight: 20 },
});
