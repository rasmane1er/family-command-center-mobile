import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { PlaidLinkButton } from '../../components/finance/PlaidLinkButton';
import { getConnectedItems, disconnectItem, syncPlaid } from '../../services/plaidService';
import { colors } from '../../theme/colors';

interface ConnectedItem {
  id: string;
  institutionName: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
}

export function ConnectBankScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = React.useState<ConnectedItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);

  const loadItems = React.useCallback(async () => {
    try {
      const data = await getConnectedItems();
      setItems(data.items);
    } catch {
      // silently fail if no backend
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadItems(); }, [loadItems]);

  const handleDisconnect = (id: string, name: string | null) => {
    Alert.alert(
      'Disconnect Bank',
      `Remove ${name ?? 'this account'}? Your synced transactions will be kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await disconnectItem(id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              loadItems();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ],
    );
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncPlaid();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Synced', `${result.synced} new transactions imported.`);
      loadItems();
    } catch (err: any) {
      Alert.alert('Sync Error', err.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Connected Banks</Text>
        {items.length > 0 && (
          <Pressable onPress={handleSync} disabled={syncing} style={styles.syncBtn}>
            {syncing
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Ionicons name="refresh-outline" size={20} color={colors.primary} />
            }
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Info card */}
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={24} color="#10B981" />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Bank-grade security</Text>
            <Text style={styles.infoText}>
              Powered by Plaid. Your bank credentials are entered directly with your bank — we never see them. Read-only access only.
            </Text>
          </View>
        </View>

        {/* Connected accounts */}
        {loading ? (
          <ActivityIndicator style={{ marginTop: 32 }} color={colors.primary} />
        ) : items.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CONNECTED ACCOUNTS</Text>
            {items.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.bankIcon}>
                  <Ionicons name="business" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bankName}>
                    {item.institutionName ?? 'Bank Account'}
                  </Text>
                  <Text style={styles.bankSynced}>
                    {item.lastSyncedAt
                      ? `Last synced ${format(new Date(item.lastSyncedAt), 'MMM d, h:mm a')}`
                      : 'Never synced'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleDisconnect(item.id, item.institutionName)}
                  style={styles.disconnectBtn}
                >
                  <Ionicons name="unlink-outline" size={16} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={56} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No banks connected</Text>
            <Text style={styles.emptyText}>
              Connect your bank once and your transactions, balances, and accounts will sync automatically.
            </Text>
          </View>
        )}

        {/* Connect button */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ADD BANK</Text>
          <PlaidLinkButton
            onSuccess={() => loadItems()}
            style={{ marginTop: 4 }}
          />
          <Text style={styles.plaidNote}>
            Connects via Plaid · 12,000+ supported banks
          </Text>
        </View>

        {/* What we access */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>WHAT WE ACCESS</Text>
          {[
            { icon: 'card-outline', text: 'Account balances' },
            { icon: 'swap-horizontal-outline', text: 'Transaction history' },
            { icon: 'bar-chart-outline', text: 'Spending categories' },
          ].map((row) => (
            <View key={row.text} style={styles.accessRow}>
              <Ionicons name={row.icon as any} size={16} color={colors.primary} />
              <Text style={styles.accessText}>{row.text}</Text>
            </View>
          ))}
          <View style={[styles.accessRow, { marginTop: 8 }]}>
            <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
            <Text style={[styles.accessText, { color: colors.danger }]}>
              We cannot move money or make payments
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.text, marginLeft: 12 },
  syncBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 80, gap: 20 },

  infoCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#065F46', marginBottom: 4 },
  infoText: { fontSize: 13, color: '#065F46', lineHeight: 20, opacity: 0.8 },

  section: { gap: 10 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bankIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankName: { fontSize: 15, fontWeight: '700', color: colors.text },
  bankSynced: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  disconnectBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.danger + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },

  plaidNote: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 4 },

  accessRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accessText: { fontSize: 14, color: colors.text },
});
