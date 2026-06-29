import React, { useState, useCallback, useEffect } from 'react';
import { Text, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { createLinkToken, exchangeToken } from '../../services/plaidService';
import { colors } from '../../theme/colors';
import * as Haptics from 'expo-haptics';

interface Props {
  onSuccess?: (institutionName: string) => void;
  onExit?: () => void;
  style?: object;
}

const PLAID_LINK_URL = 'https://cdn.plaid.com/link/v2/stable/link.html';

// Set in app.json "scheme". For production, also set PLAID_REDIRECT_URI on the server
// pointing to https://your-api.com/plaid/oauth-redirect
const APP_SCHEME = 'familycommandcenter';
const OAUTH_DEEP_LINK = `${APP_SCHEME}://plaid-oauth`;

export function PlaidLinkButton({ onSuccess, onExit, style }: Props) {
  const [loading, setLoading] = useState(false);

  // Handle Plaid returning via deep link after OAuth bank login (production)
  useEffect(() => {
    const subscription = Linking.addEventListener('url', async ({ url }) => {
      if (!url.startsWith(OAUTH_DEEP_LINK)) return;
      setLoading(true);
      try {
        const parsed = Linking.parse(url);
        const publicToken = parsed.queryParams?.['public_token'] as string | undefined;
        const institutionId = parsed.queryParams?.['institution_id'] as string | undefined;
        const institutionName = parsed.queryParams?.['institution_name'] as string | undefined;

        if (!publicToken) return; // oauth_state_id redirect (intermediate) — ignore

        const result = await exchangeToken(publicToken, institutionId, institutionName);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Connected!', `${result.institutionName} is now linked. Syncing transactions…`);
        onSuccess?.(result.institutionName);
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to finalize bank connection.');
      } finally {
        setLoading(false);
      }
    });
    return () => subscription.remove();
  }, [onSuccess]);

  const handlePress = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Pass the deep-link as redirect so the backend includes it in the link_token.
      // In sandbox this is a no-op (ignored by Plaid for non-OAuth institutions).
      // In production PLAID_REDIRECT_URI on the server overrides this with the HTTPS bridge.
      const token = await createLinkToken(OAUTH_DEEP_LINK);
      const url = `${PLAID_LINK_URL}?token=${token}`;

      const result = await WebBrowser.openAuthSessionAsync(url, OAUTH_DEEP_LINK);

      if (result.type === 'success') {
        // Non-OAuth flow: public_token comes back in the redirect URL immediately
        const parsed = Linking.parse(result.url);
        const publicToken = parsed.queryParams?.['public_token'] as string | undefined;
        const institutionId = parsed.queryParams?.['institution_id'] as string | undefined;
        const institutionName = parsed.queryParams?.['institution_name'] as string | undefined;

        if (publicToken) {
          const exchanged = await exchangeToken(publicToken, institutionId, institutionName);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Connected!', `${exchanged.institutionName} is now linked. Syncing transactions…`);
          onSuccess?.(exchanged.institutionName);
          return;
        }
        // Otherwise it's the OAuth intermediate redirect — deep-link listener above takes over
      } else {
        onExit?.();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to open bank connection.');
    } finally {
      setLoading(false);
    }
  }, [loading, onSuccess, onExit]);

  return (
    <Pressable onPress={handlePress} disabled={loading} style={[styles.btn, style]}>
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Ionicons name="link-outline" size={18} color="#fff" />
      )}
      <Text style={styles.btnText}>
        {loading ? 'Connecting…' : 'Connect Bank Account'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    justifyContent: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
