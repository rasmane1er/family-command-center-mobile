import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { useAppStore } from '../../store/useAppStore';
import { SubscriptionTier, TIER_LABELS, TIER_PRICES } from '../../hooks/useSubscription';

interface Props {
  visible: boolean;
  onClose: () => void;
  featureName: string;
  requiredTier: SubscriptionTier;
  description?: string;
}

export function UpgradePrompt({ visible, onClose, featureName, requiredTier, description }: Props) {
  const { colors } = useTheme();
  const updateSettings = useAppStore((s) => s.updateSettings);

  const handleUpgrade = () => {
    updateSettings({ subscriptionTier: requiredTier });
    onClose();
    // In production: launch in-app purchase flow here
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
            <Pressable onPress={handleUpgrade} style={styles.upgradeBtn}>
              <LinearGradient colors={['#F5A623', '#FF8C42']} style={styles.upgradeBtnGradient}>
                <Text style={styles.upgradeBtnText}>Upgrade to {TIER_LABELS[requiredTier]}</Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
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
