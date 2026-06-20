import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { Avatar } from '../../components/common/Avatar';
import { Badge } from '../../components/common/Badge';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useFamilyStore } from '../../store/useFamilyStore';

export function SubscriptionsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { subscriptions, deleteSubscription, updateSubscription } = useFinanceStore();
  const members = useFamilyStore((s) => s.members);

  const active = subscriptions.filter((s) => s.isActive);
  const totalMonthly = active.reduce((sum, s) => sum + (s.billingCycle === 'annual' ? s.amount / 12 : s.billingCycle === 'quarterly' ? s.amount / 3 : s.amount), 0);
  const totalAnnual = totalMonthly * 12;

  const grouped = active.reduce((acc, sub) => {
    const cat = sub.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(sub);
    return acc;
  }, {} as Record<string, typeof active>);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#8E44AD', '#9B59B6']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Subscriptions</Text>
          <Pressable style={styles.addBtn}><Ionicons name="add" size={26} color="#fff" /></Pressable>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>${totalMonthly.toFixed(2)}</Text>
            <Text style={styles.summaryLabel}>Per Month</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>${totalAnnual.toFixed(0)}</Text>
            <Text style={styles.summaryLabel}>Per Year</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{active.length}</Text>
            <Text style={styles.summaryLabel}>Active</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {/* AI Insight */}
        <View style={styles.aiInsight}>
          <Ionicons name="bulb" size={18} color={colors.secondary} />
          <Text style={styles.aiInsightText}>
            You're spending ${totalAnnual.toFixed(0)}/year on subscriptions. Consider if you use all of them — canceling 2 unused ones could save ~$600/year.
          </Text>
        </View>

        {Object.entries(grouped).map(([category, subs]) => (
          <View key={category}>
            <Text style={styles.categoryTitle}>{category}</Text>
            {subs.map((sub) => {
              const monthlyAmount = sub.billingCycle === 'annual' ? sub.amount / 12 : sub.billingCycle === 'quarterly' ? sub.amount / 3 : sub.amount;
              const subscribedMembers = members.filter((m) => sub.sharedMembers.includes(m.id));
              return (
                <Card key={sub.id} style={styles.subCard} variant="elevated">
                  <View style={styles.subRow}>
                    <View style={[styles.subIcon, { backgroundColor: (sub.color || colors.primary) + '22' }]}>
                      <Ionicons name={(sub.icon || 'apps-outline') as any} size={24} color={sub.color || colors.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <View style={styles.subHeader}>
                        <Text style={styles.subName}>{sub.name}</Text>
                        <View style={styles.subPrice}>
                          <Text style={styles.subAmount}>${sub.amount}</Text>
                          <Text style={styles.subCycle}>/{sub.billingCycle === 'monthly' ? 'mo' : sub.billingCycle === 'annual' ? 'yr' : 'qtr'}</Text>
                        </View>
                      </View>
                      {sub.billingCycle !== 'monthly' && (
                        <Text style={styles.subMonthly}>${monthlyAmount.toFixed(2)}/month equivalent</Text>
                      )}
                      <Text style={styles.subNextBilling}>
                        Next billing: {format(new Date(sub.nextBillingDate), 'MMM d, yyyy')}
                      </Text>
                      {subscribedMembers.length > 0 && (
                        <View style={styles.subMembers}>
                          {subscribedMembers.slice(0, 4).map((m, i) => (
                            <Avatar key={m.id} name={m.name} color={m.avatarColor} size={24} style={{ marginLeft: i > 0 ? -6 : 0 }} />
                          ))}
                          <Text style={styles.subMembersText}>{subscribedMembers.length} members</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.subActions}>
                    <Pressable
                      onPress={() => updateSubscription(sub.id, { isActive: false })}
                      style={styles.cancelBtn}
                    >
                      <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
                      <Text style={styles.cancelText}>Cancel</Text>
                    </Pressable>
                    <Badge label={sub.billingCycle} variant="primary" size="sm" />
                  </View>
                </Card>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#fff' },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  summaryCard: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 16, padding: 16 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  summaryValue: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 3 },
  summaryLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  content: { padding: 16 },
  aiInsight: { flexDirection: 'row', gap: 10, backgroundColor: '#FEF3E2', borderRadius: 12, padding: 14, marginBottom: 20, alignItems: 'flex-start' },
  aiInsightText: { flex: 1, fontSize: 13, color: '#8B5E00', lineHeight: 20 },
  categoryTitle: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, marginBottom: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  subCard: { marginBottom: 10, borderRadius: 16 },
  subRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  subIcon: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  subHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 },
  subName: { fontSize: 17, fontWeight: '700', color: colors.text, flex: 1 },
  subPrice: { flexDirection: 'row', alignItems: 'baseline' },
  subAmount: { fontSize: 18, fontWeight: '800', color: colors.text },
  subCycle: { fontSize: 13, color: colors.textSecondary },
  subMonthly: { fontSize: 12, color: colors.textSecondary, marginBottom: 3 },
  subNextBilling: { fontSize: 12, color: colors.textMuted, marginBottom: 8 },
  subMembers: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  subMembersText: { fontSize: 11, color: colors.textSecondary },
  subActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cancelText: { fontSize: 13, color: colors.danger, fontWeight: '600' },
});
