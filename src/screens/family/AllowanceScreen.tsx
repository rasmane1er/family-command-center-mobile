import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, Modal, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { format, formatDistanceToNow } from 'date-fns';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import { useAllowanceStore, AllowanceTransactionType } from '../../store/useAllowanceStore';
import { useFamilyStore } from '../../store/useFamilyStore';

const TX_CONFIG: Record<AllowanceTransactionType, { icon: string; color: string; label: string }> = {
  weekly: { icon: 'calendar', color: '#2980B9', label: 'Weekly' },
  bonus: { icon: 'trophy', color: '#27AE60', label: 'Bonus' },
  deduction: { icon: 'remove-circle', color: colors.danger, label: 'Deduction' },
  manual: { icon: 'hand-left', color: '#8E44AD', label: 'Manual' },
};

export function AllowanceScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [showDeductModal, setShowDeductModal] = useState(false);
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusReason, setBonusReason] = useState('');
  const [deductAmount, setDeductAmount] = useState('');
  const [deductReason, setDeductReason] = useState('');

  const { configs, transactions, seedDemoData, payWeeklyAllowance, addBonus, addDeduction } = useAllowanceStore();
  const members = useFamilyStore((s) => s.members);

  if (configs.length === 0) seedDemoData();

  const getMember = (id: string) => members.find((m) => m.id === id);

  const totalBalance = configs.reduce((sum, c) => sum + c.balance, 0);
  const totalWeekly = configs.filter((c) => c.isActive).reduce((sum, c) => sum + c.weeklyAmount, 0);
  const configuredKids = configs.map((c) => c.memberId);

  const selectedConfig = selectedMemberId ? configs.find((c) => c.memberId === selectedMemberId) : null;
  const memberTxs = selectedMemberId
    ? transactions.filter((t) => t.memberId === selectedMemberId).slice(0, 20)
    : [];

  const handlePayAll = () => {
    Alert.alert('Pay Weekly Allowances', `Pay $${totalWeekly.toFixed(2)} to all active members?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Pay All',
        onPress: () => {
          configs.filter((c) => c.isActive).forEach((c) => payWeeklyAllowance(c.memberId));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const handleAddBonus = () => {
    if (!selectedMemberId || !bonusAmount || !bonusReason.trim()) return;
    addBonus(selectedMemberId, parseFloat(bonusAmount), bonusReason.trim());
    setBonusAmount('');
    setBonusReason('');
    setShowBonusModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleAddDeduction = () => {
    if (!selectedMemberId || !deductAmount || !deductReason.trim()) return;
    addDeduction(selectedMemberId, parseFloat(deductAmount), deductReason.trim());
    setDeductAmount('');
    setDeductReason('');
    setShowDeductModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#1A5276', '#2980B9']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Allowance Manager</Text>
            <Text style={styles.headerSub}>${totalWeekly.toFixed(2)}/week budget</Text>
          </View>
          <Pressable onPress={handlePayAll} style={styles.payBtn}>
            <Ionicons name="cash" size={16} color="#fff" />
            <Text style={styles.payBtnText}>Pay All</Text>
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroItem}>
            <Text style={styles.heroVal}>${totalBalance.toFixed(2)}</Text>
            <Text style={styles.heroLabel}>Total Balance</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroItem}>
            <Text style={styles.heroVal}>{configs.length}</Text>
            <Text style={styles.heroLabel}>Recipients</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroItem}>
            <Text style={styles.heroVal}>${totalWeekly.toFixed(0)}</Text>
            <Text style={styles.heroLabel}>Per Week</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Family Members</Text>
        {configs.map((config) => {
          const member = getMember(config.memberId);
          if (!member) return null;
          const isSelected = selectedMemberId === config.memberId;
          const weeklyGoal = config.weeklyAmount * 4;

          return (
            <Pressable key={config.id} onPress={() => setSelectedMemberId(isSelected ? null : config.memberId)}>
              <Card
                style={{ ...styles.memberCard, ...(isSelected ? styles.memberCardSelected : {}) }}
                variant="elevated"
              >
                <View style={styles.memberTop}>
                  <View style={[styles.memberAvatar, { backgroundColor: member.avatarColor + '20' }]}>
                    <Text style={[styles.memberInitial, { color: member.avatarColor }]}>{member.name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberRole}>{member.role} · ${config.weeklyAmount}/week</Text>
                  </View>
                  <View style={styles.balanceBlock}>
                    <Text style={[styles.balanceVal, { color: member.avatarColor }]}>${config.balance.toFixed(2)}</Text>
                    <Text style={styles.balanceLabel}>balance</Text>
                  </View>
                </View>

                <View style={styles.progressRow}>
                  <ProgressBar progress={Math.min(1, config.balance / weeklyGoal)} color={member.avatarColor} height={6} />
                  <Text style={styles.progressLabel}>{Math.round((config.balance / weeklyGoal) * 100)}% of monthly goal</Text>
                </View>

                {config.lastPaidDate && (
                  <Text style={styles.lastPaid}>Last paid {formatDistanceToNow(new Date(config.lastPaidDate), { addSuffix: true })}</Text>
                )}

                {isSelected && (
                  <View style={styles.actionRow}>
                    <Pressable style={styles.actionBtn} onPress={() => payWeeklyAllowance(config.memberId)}>
                      <Ionicons name="calendar" size={14} color="#2980B9" />
                      <Text style={[styles.actionBtnText, { color: '#2980B9' }]}>Pay Weekly</Text>
                    </Pressable>
                    <Pressable style={[styles.actionBtn, { backgroundColor: '#D5F5E3' }]} onPress={() => setShowBonusModal(true)}>
                      <Ionicons name="trophy" size={14} color={colors.success} />
                      <Text style={[styles.actionBtnText, { color: colors.success }]}>Add Bonus</Text>
                    </Pressable>
                    <Pressable style={[styles.actionBtn, { backgroundColor: colors.dangerLight }]} onPress={() => setShowDeductModal(true)}>
                      <Ionicons name="remove-circle" size={14} color={colors.danger} />
                      <Text style={[styles.actionBtnText, { color: colors.danger }]}>Deduct</Text>
                    </Pressable>
                  </View>
                )}
              </Card>
            </Pressable>
          );
        })}

        {selectedConfig && memberTxs.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Transaction History</Text>
            {memberTxs.map((tx) => {
              const cfg = TX_CONFIG[tx.type];
              const isPositive = tx.type !== 'deduction';
              return (
                <Card key={tx.id} style={styles.txCard} variant="elevated">
                  <View style={styles.txRow}>
                    <View style={[styles.txIcon, { backgroundColor: cfg.color + '15' }]}>
                      <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.txDesc}>{tx.description}</Text>
                      <Text style={styles.txDate}>{format(new Date(tx.date), 'MMM d, yyyy')}</Text>
                    </View>
                    <Text style={[styles.txAmount, { color: isPositive ? colors.success : colors.danger }]}>
                      {isPositive ? '+' : '-'}${tx.amount.toFixed(2)}
                    </Text>
                  </View>
                </Card>
              );
            })}
          </>
        )}

        {configs.length === 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 56 }}>💰</Text>
            <Text style={styles.emptyTitle}>No allowances set up</Text>
            <Text style={styles.emptyDesc}>Load demo data to see example allowance configurations for your kids.</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={showBonusModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowBonusModal(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Bonus</Text>
            <Pressable onPress={() => setShowBonusModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.modalLabel}>Amount ($)</Text>
            <TextInput
              style={styles.modalInput}
              value={bonusAmount}
              onChangeText={setBonusAmount}
              keyboardType="decimal-pad"
              placeholder="5.00"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.modalLabel}>Reason</Text>
            <TextInput
              style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
              value={bonusReason}
              onChangeText={setBonusReason}
              placeholder="e.g. Helped clean the garage"
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <Pressable style={[styles.saveBtn, { backgroundColor: colors.success }]} onPress={handleAddBonus}>
              <Text style={styles.saveBtnText}>Add Bonus 🎉</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showDeductModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowDeductModal(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Deduction</Text>
            <Pressable onPress={() => setShowDeductModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.modalLabel}>Amount ($)</Text>
            <TextInput
              style={styles.modalInput}
              value={deductAmount}
              onChangeText={setDeductAmount}
              keyboardType="decimal-pad"
              placeholder="2.00"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.modalLabel}>Reason</Text>
            <TextInput
              style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
              value={deductReason}
              onChangeText={setDeductReason}
              placeholder="e.g. Missed trash duty"
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <Pressable style={[styles.saveBtn, { backgroundColor: colors.danger }]} onPress={handleAddDeduction}>
              <Text style={styles.saveBtnText}>Apply Deduction</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  back: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  payBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  payBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  heroCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 16, justifyContent: 'space-around' },
  heroItem: { alignItems: 'center', gap: 4 },
  heroVal: { fontSize: 22, fontWeight: '800', color: '#fff' },
  heroLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  heroDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12, marginTop: 8 },
  memberCard: { marginBottom: 12, borderRadius: 16 },
  memberCardSelected: { borderWidth: 2, borderColor: '#2980B9' },
  memberTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  memberInitial: { fontSize: 18, fontWeight: '800' },
  memberName: { fontSize: 15, fontWeight: '700', color: colors.text },
  memberRole: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  balanceBlock: { alignItems: 'flex-end' },
  balanceVal: { fontSize: 20, fontWeight: '800' },
  balanceLabel: { fontSize: 10, color: colors.textMuted },
  progressRow: { marginBottom: 8 },
  progressLabel: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  lastPaid: { fontSize: 11, color: colors.textMuted },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#EBF5FB', borderRadius: 10, paddingVertical: 8 },
  actionBtnText: { fontSize: 12, fontWeight: '700' },
  txCard: { marginBottom: 8, borderRadius: 12 },
  txRow: { flexDirection: 'row', alignItems: 'center' },
  txIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txDesc: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 2 },
  txDate: { fontSize: 11, color: colors.textMuted },
  txAmount: { fontSize: 15, fontWeight: '800' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 16, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 32, lineHeight: 22 },
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  modalContent: { padding: 20 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 20 },
  saveBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
