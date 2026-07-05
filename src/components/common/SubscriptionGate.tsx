import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../../theme/colors';
import { useSubscription } from '../../hooks/useSubscription';
import type { SubscriptionTier } from '../../hooks/useSubscription';
import { TIER_LABELS, TIER_PRICES } from '../../hooks/useSubscription';
import { UpgradePrompt } from './UpgradePrompt';

interface SubscriptionGateProps {
  children: React.ReactNode;
  requiredTier: 'premium' | 'family_pro';
  featureName: string;
  description?: string;
}

// Subscription-tier equivalent of RoleGuard (src/components/auth/RoleGuard.tsx)
// — same "static denial screen, wrap the screen in the navigator" pattern,
// gating on plan instead of family role.
export function SubscriptionGate({ children, requiredTier, featureName, description }: SubscriptionGateProps) {
  const { t } = useTranslation();
  const { isAtLeast } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (isAtLeast(requiredTier)) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0F2952', '#1E4A8A']} style={styles.iconCircle}>
        <Ionicons name="lock-closed" size={28} color="#fff" />
      </LinearGradient>
      <Text style={styles.title}>{featureName}</Text>
      <Text style={styles.subtitle}>
        {description ?? t('screens.shared.upgradeIncludedInPlan', { tier: TIER_LABELS[requiredTier] })}
      </Text>
      <Pressable style={styles.upgradeBtn} onPress={() => setShowUpgrade(true)}>
        <LinearGradient colors={['#F5A623', '#FF8C42']} style={styles.upgradeBtnGradient}>
          <Text style={styles.upgradeBtnText}>
            {t('screens.shared.upgradeToTierWithPrice', { tier: TIER_LABELS[requiredTier], price: TIER_PRICES[requiredTier] })}
          </Text>
        </LinearGradient>
      </Pressable>

      <UpgradePrompt
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        featureName={featureName}
        requiredTier={requiredTier as SubscriptionTier}
        description={description}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  upgradeBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  upgradeBtnGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  upgradeBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
});
