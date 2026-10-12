import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Dimensions, Pressable, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { Button } from '../../components/common/Button';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useOperationsStore } from '../../store/useOperationsStore';
import { useAIStore } from '../../store/useAIStore';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { OAuthProfile } from '../../store/useAuthStore';

// Replace with your Google OAuth client IDs from Google Cloud Console
const GOOGLE_IOS_CLIENT_ID = '';
const GOOGLE_ANDROID_CLIENT_ID = '';
const GOOGLE_WEB_CLIENT_ID = '';

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get('window');

const features = [
  { icon: 'people', color: '#4ECDC4', bg: '#E8F8F7', title: 'Family Dashboard', desc: 'Track every member\'s schedule, health, and goals in one place.' },
  { icon: 'wallet', color: '#F5A623', bg: '#FEF3E2', title: 'Finance Center', desc: 'Budget, bills, subscriptions, and investments — all unified.' },
  { icon: 'grid', color: '#27AE60', bg: '#D5F5E3', title: 'Home Operations', desc: 'Pantry, meals, vehicles, and documents — always organized.' },
  { icon: 'sparkles', color: '#0F2952', bg: '#E8EEF9', title: 'AI Chief of Staff', desc: 'Your personal AI that manages the household and gives smart insights.' },
  { icon: 'trophy', color: '#FFD700', bg: '#FFFACC', title: 'Rewards System', desc: 'Motivate kids with points, badges, and custom rewards.' },
  { icon: 'shield-checkmark', color: '#E74C3C', bg: '#FDEDEC', title: 'Safety & Emergency', desc: 'Emergency contacts, medical info, and safety protocols ready.' },
];

export function WelcomeScreen({ navigation }: any) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const seedDemoFamily = useFamilyStore((s) => s.seedDemoData);
  const seedDemoFinance = useFinanceStore((s) => s.seedDemoData);
  const seedDemoOps = useOperationsStore((s) => s.seedDemoData);
  const seedDemoAI = useAIStore((s) => s.seedDemoInsights);
  const setOnboarded = useAppStore((s) => s.setOnboarded);
  const setOAuthProfile = useAuthStore((s) => s.setOAuthProfile);

  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }),
    ]).start();
  }, []);

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { authentication } = googleResponse;
      if (authentication?.accessToken) {
        fetchGoogleProfile(authentication.accessToken);
      }
    }
  }, [googleResponse]);

  const fetchGoogleProfile = async (accessToken: string) => {
    try {
      const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      const profile: OAuthProfile = {
        provider: 'google',
        userId: data.id,
        givenName: data.given_name ?? '',
        familyName: data.family_name ?? '',
        email: data.email ?? '',
        photo: data.picture,
      };
      setOAuthProfile(profile);
      navigation.navigate('FamilySetup');
    } catch {
      Alert.alert('Sign In Failed', 'Could not retrieve Google profile. Please try again.');
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const profile: OAuthProfile = {
        provider: 'apple',
        userId: credential.user,
        // Apple only sends name on first sign-in — save it immediately
        givenName: credential.fullName?.givenName ?? '',
        familyName: credential.fullName?.familyName ?? '',
        email: credential.email ?? '',
      };
      setOAuthProfile(profile);
      navigation.navigate('FamilySetup');
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Sign In Failed', 'Apple Sign In failed. Please try again.');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    if (!GOOGLE_IOS_CLIENT_ID && !GOOGLE_ANDROID_CLIENT_ID && !GOOGLE_WEB_CLIENT_ID) {
      Alert.alert('Not Configured', 'Google Sign In requires a Client ID. Please configure it in WelcomeScreen.tsx.');
      return;
    }
    await promptGoogleAsync();
  };

  const handleStartSetup = () => navigation.navigate('FamilySetup');

  const handleDemoMode = () => {
    seedDemoFamily();
    seedDemoFinance();
    seedDemoOps();
    seedDemoAI();
    setOnboarded(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#0F2952', '#1E4A8A']} style={styles.header}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={styles.headerGreeting}>Welcome to</Text>
          <Text style={styles.headerTitle}>Family Command{'\n'}Center™</Text>
          <Text style={styles.headerSub}>The all-in-one household operating system</Text>
        </Animated.View>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Everything your family needs</Text>

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
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </Animated.View>
          ))}
        </View>

        <View style={styles.ctaArea}>
          <Button title="Set Up My Family" onPress={handleStartSetup} fullWidth size="lg" />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            {Platform.OS === 'ios' && (
              <Pressable onPress={handleAppleSignIn} style={[styles.socialBtn, styles.appleBtn]}>
                <Ionicons name="logo-apple" size={20} color="#fff" />
                <Text style={[styles.socialBtnText, { color: '#fff' }]}>Apple</Text>
              </Pressable>
            )}
            <Pressable onPress={handleGoogleSignIn} style={[styles.socialBtn, styles.googleBtn]}>
              <Ionicons name="logo-google" size={18} color="#4285F4" />
              <Text style={[styles.socialBtnText, { color: '#3c4043' }]}>Google</Text>
            </Pressable>
          </View>

          <View style={[styles.divider, { marginTop: 4 }]}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable onPress={handleDemoMode} style={styles.demoButton}>
            <Ionicons name="play-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.demoText}>Explore with Demo Data</Text>
          </Pressable>
        </View>

        <View style={styles.tierBadges}>
          {['Free Tier', 'Premium $9.99/mo', 'Family Pro $19.99/mo'].map((t, i) => (
            <View key={i} style={[styles.tierBadge, i === 1 && styles.tierBadgeHighlight]}>
              <Text style={[styles.tierText, i === 1 && styles.tierTextHighlight]}>{t}</Text>
              {i === 1 && <Text style={styles.popularTag}>Popular</Text>}
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          No credit card required  •  Setup takes 3 minutes{'\n'}
          Your data stays private and secure
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
  headerSub: { fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 22 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 48 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 16 },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  featureCard: {
    width: (width - 52) / 2,
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
  demoButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary },
  demoText: { fontSize: 15, color: colors.primary, fontWeight: '600' },
  socialRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  socialBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5 },
  appleBtn: { backgroundColor: '#000', borderColor: '#000' },
  googleBtn: { backgroundColor: '#fff', borderColor: '#dadce0' },
  socialBtnText: { fontSize: 15, fontWeight: '600' },
  tierBadges: { flexDirection: 'row', gap: 8, marginBottom: 20, justifyContent: 'center' },
  tierBadge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: colors.border },
  tierBadgeHighlight: { backgroundColor: colors.primary },
  tierText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  tierTextHighlight: { color: '#fff' },
  popularTag: { fontSize: 9, color: colors.secondary, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  footer: { textAlign: 'center', fontSize: 12, color: colors.textMuted, lineHeight: 20 },
});
