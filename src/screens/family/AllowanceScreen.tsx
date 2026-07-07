import React, { useState, useEffect } from 'react';
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
import { useAuthStore } from '../../store/useAuthStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useTranslation } from 'react-i18next';

const TX_CONFIG: Record<AllowanceTransactionType, { icon: string; color: string; label: string }> = {
  weekly: { icon: 'calendar', color: '#2980B9', label: 'Weekly' },
  bonus: { icon: 'trophy', color: '#27AE60', label: 'Bonus' },
  deduction: { icon: 'remove-circle', color: colors.danger, label: 'Deduction' },
  manual: { icon: 'hand-left', color: '#8E44AD', label: 'Manual' },
};

export function AllowanceScreen({ navigation }: any) {
  const { t } = useTranslation('family');
  const insets = useSafeAreaInsets();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [showDeductModal, setShowDeductModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusReason, setBonusReason] = useState('');
  const [deductAmount, setDeductAmount] = useState('');
  const [deductReason, setDeductReason] = useState('');
  const [newMemberId, setNewMemberId] = useState('');
  const [newWeeklyAmount, setNewWeeklyAmount] = useState('');

  const { configs: allConfigs, transactions, fetchFromServer, addConfig, deleteConfig, payWeeklyAllowance, addBonus, addDeduction } = useAllowanceStore();
  const members = useFamilyStore((s) => s.members);
  const family = useFamilyStore((s) => s.family);

  useEffect(() => {
    fetchFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getMember = (id: string) => members.find((m) => m.id === id);

  // Configs seeded for a demo family (or a previous real family) whose
  // member IDs no longer exist in this family's member list would otherwise
  // count toward "Recipients"/"Total Balance" in the header while silently
  // rendering nothing in the body below — filtering here up front keeps the
  // header stats and the list it summarizes always in agreement.
  const configs = allConfigs.filter((c) => getMember(c.memberId));
  const unconfiguredMembers = members.filter((m) => !configs.some((c) => c.memberId === m.id));

  const totalBalance = configs.reduce((sum, c) => sum + c.balance, 0);
  const totalWeekly = configs.filter((c) => c.isActive).reduce((sum, c) => sum + c.weeklyAmount, 0);

  const selectedConfig = selectedMemberId ? configs.find((c) => c.memberId === selectedMemberId) : null;
  const memberTxs = selectedMemberId
    ? transactions.filter((t) => t.memberId === selectedMemberId).slice(0, 20)
    : [];

  const handleAddConfig = () => {
    const amount = parseFloat(newWeeklyAmount);
    if (!newMemberId || isNaN(amount) || amount <= 0) return;
    addConfig({
      familyId: useAuthStore.getState().familyId ?? family?.id ?? '',
      memberId: newMemberId,
      weeklyAmount: amount,
      bonusPerChore: 0,
      isActive: true,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNewMemberId('');
    setNewWeeklyAmount('');
    setShowAddModal(false);
  };

  const handleDeleteConfig = (config: typeof configs[number]) => {
    const member = getMember(config.memberId);
    Alert.alert(t('allowance.removeTitle', { name: member?.name ?? 'this' }), t('allowance.removeMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => { deleteConfig(config.id); if (selectedMemberId === config.memberId) setSelectedMemberId(null); } },
    ]);
  };

  const handlePayAll = () => {
    Alert.alert(t('allowance.payWeeklyTitle'), t('allowance.payWeeklyMsg', { amount: totalWeekly.toFixed(2) }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('allowance.payAll'),
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

  const screenHeader = (
    <LinearGradient colors={['#1A5276', '#2980B9']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('allowance.title')}</Text>
          <Text style={styles.headerSub}>${totalWeekly.toFixed(2)}/week budget</Text>
        </View>
        <Pressable onPress={handlePayAll} style={styles.payBtn}>
          <Ionicons name="cash" size={16} color="#fff" />
          <Text style={styles.payBtnText}>{t('allowance.payAll')}</Text>
        </Pressable>
        <Pressable onPress={() => setShowAddModal(true)} style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroItem}>
          <Text style={styles.heroVal}>${totalBalance.toFixed(2)}</Text>
          <Text style={styles.heroLabel}>{t('allowance.totalBalance')}</Text>
        </View>
        <View style={styles.heroDivider} />
        <View style={styles.heroItem}>
          <Text style={styles.heroVal}>{configs.length}</Text>
          <Text style={styles.heroLabel}>{t('allowance.recipients')}</Text>
        </View>
        <View style={styles.heroDivider} />
        <View style={styles.heroItem}>
          <Text style={styles.heroVal}>${totalWeekly.toFixed(0)}</Text>
          <Text style={styles.heroLabel}>{t('allowance.perWeek')}</Text>
        </View>
      </View>
    </LinearGradient>
  );

  const screenCompact = (
    <LinearGradient colors={['#1A5276', '#2980B9']} style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>{t('allowance.title')}</Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.8)' }}>${totalBalance.toFixed(0)}</Text>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
      <ScrollView
        onScroll={onScroll}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={[styles.content, { paddingBottom: 100, paddingTop: contentPaddingTop }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>{t('allowance.familyMembers')}</Text>
        {configs.map((config) => {
          const member = getMember(config.memberId);
          if (!member) return null;
          const isSelected = selectedMemberId === config.memberId;
          const weeklyGoal = config.weeklyAmount * 4;

          return (
            <Pressable key={config.id} onPress={() => setSelectedMemberId(isSelected ? null : config.memberId)} onLongPress={() => handleDeleteConfig(config)}>
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
                  <Text style={styles.lastPaid}>{t('allowance.lastPaid', { time: formatDistanceToNow(new Date(config.lastPaidDate), { addSuffix: true }) })}</Text>
                )}

                {isSelected && (
                  <View style={styles.actionRow}>
                    <Pressable style={styles.actionBtn} onPress={() => payWeeklyAllowance(config.memberId)}>
                      <Ionicons name="calendar" size={14} color="#2980B9" />
                      <Text style={[styles.actionBtnText, { color: '#2980B9' }]}>{t('allowance.payWeekly')}</Text>
                    </Pressable>
                    <Pressable style={[styles.actionBtn, { backgroundColor: '#D5F5E3' }]} onPress={() => setShowBonusModal(true)}>
                      <Ionicons name="trophy" size={14} color={colors.success} />
                      <Text style={[styles.actionBtnText, { color: colors.success }]}>{t('allowance.addBonus')}</Text>
                    </Pressable>
                    <Pressable style={[styles.actionBtn, { backgroundColor: colors.dangerLight }]} onPress={() => setShowDeductModal(true)}>
                      <Ionicons name="remove-circle" size={14} color={colors.danger} />
                      <Text style={[styles.actionBtnText, { color: colors.danger }]}>{t('allowance.deduct')}</Text>
                    </Pressable>
                  </View>
                )}
              </Card>
            </Pressable>
          );
        })}

        {selectedConfig && memberTxs.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t('allowance.transactionHistory')}</Text>
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
            <Text style={styles.emptyTitle}>{t('allowance.emptyTitle')}</Text>
            <Text style={styles.emptyDesc}>{t('allowance.emptyDesc')}</Text>
          </View>
        )}

        {unconfiguredMembers.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: configs.length > 0 ? 20 : 0 }]}>{t('allowance.notSetUpYet')}</Text>
            <View style={styles.unconfiguredRow}>
              {unconfiguredMembers.map((m) => (
                <Pressable key={m.id} style={styles.unconfiguredChip} onPress={() => { setNewMemberId(m.id); setShowAddModal(true); }}>
                  <View style={[styles.memberAvatar, { width: 32, height: 32, borderRadius: 16, backgroundColor: m.avatarColor + '20' }]}>
                    <Text style={[styles.memberInitial, { fontSize: 14, color: m.avatarColor }]}>{m.name.charAt(0)}</Text>
                  </View>
                  <Text style={styles.unconfiguredName}>{m.name.split(' ')[0]}</Text>
                  <Ionicons name="add-circle" size={16} color={colors.primary} />
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
        )}
      </CollapsibleHeader>

      <Modal visible={showBonusModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowBonusModal(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('allowance.bonusTitle')}</Text>
            <Pressable onPress={() => setShowBonusModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.modalLabel}>{t('allowance.bonusAmount')}</Text>
            <TextInput
              style={styles.modalInput}
              value={bonusAmount}
              onChangeText={setBonusAmount}
              keyboardType="decimal-pad"
              placeholder="5.00"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.modalLabel}>{t('allowance.bonusReason')}</Text>
            <TextInput
              style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
              value={bonusReason}
              onChangeText={setBonusReason}
              placeholder="e.g. Helped clean the garage"
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <Pressable style={[styles.saveBtn, { backgroundColor: colors.success }]} onPress={handleAddBonus}>
              <Text style={styles.saveBtnText}>{t('allowance.bonusButton')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showDeductModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowDeductModal(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('allowance.deductTitle')}</Text>
            <Pressable onPress={() => setShowDeductModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.modalLabel}>{t('allowance.deductAmount')}</Text>
            <TextInput
              style={styles.modalInput}
              value={deductAmount}
              onChangeText={setDeductAmount}
              keyboardType="decimal-pad"
              placeholder="2.00"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.modalLabel}>{t('allowance.deductReason')}</Text>
            <TextInput
              style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
              value={deductReason}
              onChangeText={setDeductReason}
              placeholder="e.g. Missed trash duty"
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <Pressable style={[styles.saveBtn, { backgroundColor: colors.danger }]} onPress={handleAddDeduction}>
              <Text style={styles.saveBtnText}>{t('allowance.deductButton')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('allowance.setupTitle')}</Text>
            <Pressable onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.modalLabel}>{t('allowance.setupMember')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              {members.filter((m) => !configs.some((c) => c.memberId === m.id) || m.id === newMemberId).map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setNewMemberId(m.id)}
                  style={[styles.memberPickChip, newMemberId === m.id && { borderColor: m.avatarColor, backgroundColor: m.avatarColor + '15' }]}
                >
                  <View style={[styles.memberAvatar, { width: 32, height: 32, borderRadius: 16, backgroundColor: m.avatarColor + '20' }]}>
                    <Text style={[styles.memberInitial, { fontSize: 14, color: m.avatarColor }]}>{m.name.charAt(0)}</Text>
                  </View>
                  <Text style={styles.unconfiguredName}>{m.name.split(' ')[0]}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {members.every((m) => configs.some((c) => c.memberId === m.id)) && (
              <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 20 }}>{t('allowance.allSetUp')}</Text>
            )}

            <Text style={styles.modalLabel}>{t('allowance.setupWeeklyAmount')}</Text>
            <TextInput
              style={styles.modalInput}
              value={newWeeklyAmount}
              onChangeText={setNewWeeklyAmount}
              keyboardType="decimal-pad"
              placeholder="10.00"
              placeholderTextColor={colors.textMuted}
            />
            <Pressable
              style={[styles.saveBtn, { backgroundColor: colors.primary }, (!newMemberId || !newWeeklyAmount) && { opacity: 0.4 }]}
              onPress={handleAddConfig}
              disabled={!newMemberId || !newWeeklyAmount}
            >
              <Text style={styles.saveBtnText}>{t('allowance.setupButton')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  back: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  payBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  addBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  payBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  heroCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 16, justifyContent: 'space-around' },
  heroItem: { alignItems: 'center', gap: 4 },
  heroVal: { fontSize: 18, fontWeight: '800', color: '#fff' },
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
  unconfiguredRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  unconfiguredChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.border },
  unconfiguredName: { fontSize: 13, fontWeight: '600', color: colors.text },
  memberPickChip: { alignItems: 'center', flexDirection: 'row', gap: 8, marginRight: 10, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border },
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  modalContent: { padding: 20 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 20 },
  saveBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
