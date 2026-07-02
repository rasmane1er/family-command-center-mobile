import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { SubscriptionTier, TIER_LABELS, TIER_PRICES } from '../../hooks/useSubscription';
import { usePurchases } from '../../hooks/usePurchases';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';

interface Props {
  visible: boolean;
  onClose: () => void;
  featureName: string;
  requiredTier: SubscriptionTier;
  description?: string;
}

export function UpgradePrompt({ visible, onClose, featureName, requiredTier, description }: Props) {
  const { colors } = useTheme();
  const { showPaywall } = usePurchases();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    setIsLoading(true);
    const result = await showPaywall(requiredTier === 'family_pro' ? 'family_pro' : 'premium');
    setIsLoading(false);
    if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
      onClose();
    }
    // CANCELLED / NOT_PRESENTED / ERROR: leave the prompt open so the user can
    // retry — usePurchases() surfaces the specific error elsewhere if needed.
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <LinearGradient colors={['#0F2952', '#1E4A8A']} style={styles.cardHeader}>
            <Ionicons name="star" size={32} color="#FFD700" />
            <Text style={styles.headerTitle}>Upgrade Required</Text>
            <Text style={styles.headerSub}>{featureName} is a {TIER_LABELS[requiredTier]} feature</Text>
          </LinearGradient>
          <View style={styles.body}>
            {description && <Text style={[styles.desc, { color: colors.textSecondary }]}>{description}</Text>}
            <View style={[styles.priceBadge, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.priceLabel, { color: colors.primary }]}>
                {TIER_LABELS[requiredTier]} — {TIER_PRICES[requiredTier]}
              </Text>
            </View>
            <Pressable onPress={handleUpgrade} style={styles.upgradeBtn} disabled={isLoading}>
              <LinearGradient colors={['#F5A623', '#FF8C42']} style={styles.upgradeBtnGradient}>
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.upgradeBtnText}>Upgrade to {TIER_LABELS[requiredTier]}</Text>
                )}
              </LinearGradient>
            </Pressable>
            <Pressable onPress={onClose} style={styles.cancelBtn} disabled={isLoading}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Maybe later</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { borderRadius: 24, overflow: 'hidden', width: '100%', maxWidth: 360 },
  cardHeader: { alignItems: 'center', padding: 28, gap: 8 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 14, textAlign: 'center' },
  body: { padding: 24, gap: 16 },
  desc: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  priceBadge: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  priceLabel: { fontWeight: '700', fontSize: 16 },
  upgradeBtn: { borderRadius: 14, overflow: 'hidden' },
  upgradeBtnGradient: { paddingVertical: 15, alignItems: 'center' },
  upgradeBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelText: { fontSize: 14 },
});
