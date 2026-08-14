import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/useAuthStore';
import { awsConfig } from '../../config/aws';
import { apiRequest } from '../../api/client';
import { secureStorage } from '../../storage/secureStorage';

const POLL_INTERVAL = 4000;

export function EmailVerificationScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const email = useAuthStore((s) => s.pendingVerificationEmail) ?? '';
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [checking, setChecking] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll every 4 seconds to detect when user clicks the link in their email
  useEffect(() => {
    if (!email) return;

    const poll = async () => {
      try {
        const res = await fetch(`${awsConfig.apiBaseUrl}/auth/check-verification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        if (!res.ok) return;
        const { emailVerified } = await res.json();
        if (emailVerified) {
          clearInterval(pollRef.current!);
          // Re-login to get a fresh session now that the account is verified
          await completeSignIn();
        }
      } catch {}
    };

    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [email]);

  async function completeSignIn() {
    // The user verified. Read the stored access token — if one exists from
    // registration, fetch from server to populate stores. Otherwise navigate
    // to SignIn so they enter their password again (token may have expired).
    const token = await secureStorage.getToken('access_token').catch(() => null);
    if (token) {
      useAuthStore.setState({ isAuthenticated: true, pendingVerificationEmail: null });
    } else {
      // AuthNavigator renders either EmailVerification or the SignIn stack
      // based on pendingVerificationEmail (never both), so clearing it here
      // is what swaps the navigator over — an explicit navigation.reset()
      // to 'SignIn' fails because that route isn't registered yet in the
      // same tick this state change is made.
      useAuthStore.setState({ pendingVerificationEmail: null });
    }
  }

  async function handleResend() {
    if (resending || !email) return;
    setResending(true);
    try {
      await fetch(`${awsConfig.apiBaseUrl}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch {}
    setResending(false);
  }

  async function handleCheckNow() {
    setChecking(true);
    try {
      const res = await fetch(`${awsConfig.apiBaseUrl}/auth/check-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const { emailVerified } = await res.json();
      if (emailVerified) {
        if (pollRef.current) clearInterval(pollRef.current);
        await completeSignIn();
      }
    } catch {}
    setChecking(false);
  }

  return (
    <LinearGradient colors={['#0F2952', '#1E4A8A', '#2563EB']} style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="mail" size={48} color="#fff" />
        </View>

        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a verification link to
        </Text>
        <Text style={styles.email}>{email}</Text>
        <Text style={styles.hint}>
          Click the link in the email to activate your account. This page will update automatically once verified.
        </Text>

        <View style={styles.pulseWrap}>
          <ActivityIndicator color="rgba(255,255,255,0.6)" size="small" />
          <Text style={styles.pulseText}>Waiting for verification…</Text>
        </View>

        <Pressable accessibilityRole="button"
          style={[styles.checkBtn, checking && styles.checkBtnDisabled]}
          onPress={handleCheckNow}
          disabled={checking}
        >
          {checking
            ? <ActivityIndicator color="#1E4A8A" size="small" />
            : <Text style={styles.checkBtnText}>I've verified my email</Text>}
        </Pressable>

        <Pressable accessibilityRole="button"
          style={styles.resendBtn}
          onPress={handleResend}
          disabled={resending}
        >
          {resending
            ? <ActivityIndicator color="rgba(255,255,255,0.8)" size="small" />
            : <Text style={styles.resendText}>
                {resent ? '✅ Verification email resent!' : "Didn't get it? Resend email"}
              </Text>}
        </Pressable>

        <Pressable accessibilityRole="button"
          onPress={() => useAuthStore.setState({ pendingVerificationEmail: null })}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>← Back to Sign In</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 12,
  },
  iconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginTop: 4,
  },
  email: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
  },
  pulseWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  pulseText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  checkBtn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  checkBtnDisabled: { opacity: 0.7 },
  checkBtnText: {
    color: '#1E4A8A',
    fontSize: 16,
    fontWeight: '800',
  },
  resendBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  resendText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  backBtn: {
    paddingVertical: 8,
    marginTop: 4,
  },
  backText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
});
