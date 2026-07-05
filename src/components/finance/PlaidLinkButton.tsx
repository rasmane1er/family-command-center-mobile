import React, { useState, useCallback } from 'react';
import { Text, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  create,
  open,
  type LinkSuccess,
  type LinkExit,
} from 'react-native-plaid-link-sdk';
import { createLinkToken, exchangeToken } from '../../services/plaidService';
import { colors } from '../../theme/colors';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

interface Props {
  onSuccess?: (institutionName: string) => void;
  onExit?: () => void;
  style?: object;
}

// Set in app.json "scheme". For production, also set PLAID_REDIRECT_URI on the
// server pointing to https://your-api.com/plaid/oauth-redirect — the native
// SDK handles the OAuth bank-login redirect back into the app automatically
// once the link token was created with a matching redirect_uri.
const APP_SCHEME = 'familycommandcenter';
const OAUTH_DEEP_LINK = `${APP_SCHEME}://plaid-oauth`;

export function PlaidLinkButton({ onSuccess, onExit, style }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleSuccess = useCallback(
    async (success: LinkSuccess) => {
      try {
        const institutionId = success.metadata.institution?.id;
        const institutionName = success.metadata.institution?.name;
        const exchanged = await exchangeToken(success.publicToken, institutionId, institutionName);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          t('screens.shared.plaidConnectedTitle'),
          t('screens.shared.plaidConnectedMsg', { institutionName: exchanged.institutionName })
        );
        onSuccess?.(exchanged.institutionName);
      } catch (err: any) {
        Alert.alert(t('screens.shared.plaidErrorTitle'), err.message || t('screens.shared.plaidFinalizeErrorMsg'));
      } finally {
        setLoading(false);
      }
    },
    [onSuccess, t],
  );

  const handleExit = useCallback(
    (exit: LinkExit) => {
      setLoading(false);
      if (exit.error) {
        Alert.alert(t('screens.shared.plaidConnectionFailedTitle'), exit.error.displayMessage || exit.error.errorMessage);
      }
      onExit?.();
    },
    [onExit, t],
  );

  const handlePress = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const token = await createLinkToken(OAUTH_DEEP_LINK);
      create({ token });
      open({ onSuccess: handleSuccess, onExit: handleExit });
    } catch (err: any) {
      setLoading(false);
      Alert.alert(t('screens.shared.plaidErrorTitle'), err.message || t('screens.shared.plaidOpenErrorMsg'));
    }
  }, [loading, handleSuccess, handleExit, t]);

  return (
    <Pressable onPress={handlePress} disabled={loading} style={[styles.btn, style]}>
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Ionicons name="link-outline" size={18} color="#fff" />
      )}
      <Text style={styles.btnText}>
        {loading ? t('screens.shared.plaidConnecting') : t('screens.shared.plaidConnectBank')}
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
