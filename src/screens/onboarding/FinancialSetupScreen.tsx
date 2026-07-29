import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useFinanceStore } from '../../store/useFinanceStore';
import type { FinancialAccount } from '../../types';

const accountTypes = [
  { type: 'checking', labelKey: 'accountTypeChecking', icon: 'card-outline' },
  { type: 'savings', labelKey: 'accountTypeSavings', icon: 'save-outline' },
  { type: 'investment', labelKey: 'accountTypeInvestment', icon: 'trending-up-outline' },
  { type: 'credit', labelKey: 'accountTypeCredit', icon: 'card' },
] as const;

export function FinancialSetupScreen({ navigation }: any) {
  const { t } = useTranslation('onboarding');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [monthlyExpenses, setMonthlyExpenses] = useState('');
  const [hasEmergencyFund, setHasEmergencyFund] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [accountBalance, setAccountBalance] = useState('');
  const [selectedType, setSelectedType] = useState<'checking' | 'savings' | 'investment' | 'credit'>('checking');
  const addAccount = useFinanceStore((s) => s.addAccount);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);

  const addAccountLocal = () => {
    if (!accountName.trim()) return;
    const openingBalance = parseFloat(accountBalance) || 0;
    const now = new Date().toISOString();
    const acc: FinancialAccount = {
      id: `acc-${Date.now()}`,
      familyId: 'family-1',
      name: accountName.trim(),
      type: selectedType,
      balance: openingBalance,
      lastUpdated: now,
      isShared: true,
      openingBalance,
      openingBalanceDate: now,
    };
    setAccounts([...accounts, acc]);
    setAccountName('');
    setAccountBalance('');
  };

  const handleNext = () => {
    accounts.forEach(addAccount);
    navigation.navigate('GoalsSetup');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <LinearGradient colors={['#0F2952', '#1E4A8A']} style={styles.header}>
          <View style={styles.headerTopRow}>
            <Pressable onPress={() => navigation.goBack()} style={styles.back}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>
            <Pressable onPress={handleNext} style={styles.skipBtn}>
              <Text style={styles.skipBtnText}>{t('onboarding.screens.financialSetup.skipBadge')}</Text>
            </Pressable>
          </View>
          <View style={styles.stepBadge}><Text style={styles.stepText}>{t('onboarding.screens.financialSetup.stepBadge')}</Text></View>
          <Text style={styles.headerTitle}>{t('onboarding.screens.financialSetup.title')}</Text>
          <Text style={styles.headerSub}>{t('onboarding.screens.financialSetup.subtitle')}</Text>
        </LinearGradient>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '71%' }]} />
        </View>

        <Input label={t('onboarding.screens.financialSetup.incomeLabel')} placeholder={t('onboarding.screens.financialSetup.incomePlaceholder')} value={monthlyIncome} onChangeText={setMonthlyIncome} leftIcon="cash-outline" keyboardType="numeric" />
        <Input label={t('onboarding.screens.financialSetup.expensesLabel')} placeholder={t('onboarding.screens.financialSetup.expensesPlaceholder')} value={monthlyExpenses} onChangeText={setMonthlyExpenses} leftIcon="trending-down-outline" keyboardType="numeric" />

        <Pressable
          onPress={() => setHasEmergencyFund(!hasEmergencyFund)}
          style={[styles.emergencyToggle, hasEmergencyFund && styles.emergencyToggleActive]}
        >
          <Ionicons name={hasEmergencyFund ? 'checkmark-circle' : 'radio-button-off'} size={22} color={hasEmergencyFund ? colors.success : colors.textMuted} />
          <Text style={[styles.emergencyText, hasEmergencyFund && { color: colors.success }]}>
            {t('onboarding.screens.financialSetup.emergencyFundText')}
          </Text>
        </Pressable>

        <Text style={styles.sectionLabel}>{t('onboarding.screens.financialSetup.addAccountsLabel')}</Text>
        <View style={styles.typeRow}>
          {accountTypes.map((at) => (
            <Pressable key={at.type} onPress={() => setSelectedType(at.type)} style={[styles.typeChip, selectedType === at.type && styles.typeChipActive]}>
              <Ionicons name={at.icon as any} size={16} color={selectedType === at.type ? '#fff' : colors.textSecondary} />
              <Text style={[styles.typeText, selectedType === at.type && styles.typeTextActive]}>{t(`onboarding.screens.financialSetup.${at.labelKey}`)}</Text>
            </Pressable>
          ))}
        </View>

        {accounts.map((a, i) => (
          <View key={i} style={styles.accountRow}>
            <Ionicons name="wallet-outline" size={20} color={colors.primary} />
            <Text style={styles.accountText}>{t('onboarding.screens.financialSetup.accountRowText', { name: a.name, balance: a.balance.toLocaleString() })}</Text>
            <Pressable onPress={() => setAccounts(accounts.filter((_, ai) => ai !== i))}>
              <Ionicons name="close-circle" size={20} color={colors.danger} />
            </Pressable>
          </View>
        ))}

        <View style={styles.accountInputRow}>
          <Input label={t('onboarding.screens.financialSetup.accountNameLabel')} placeholder={t('onboarding.screens.financialSetup.accountNamePlaceholder')} value={accountName} onChangeText={setAccountName} containerStyle={{ flex: 1, marginRight: 8 }} />
          <Input label={t('onboarding.screens.financialSetup.balanceLabel')} placeholder={t('onboarding.screens.financialSetup.balancePlaceholder')} value={accountBalance} onChangeText={setAccountBalance} keyboardType="numeric" containerStyle={{ flex: 1 }} />
        </View>

        <Button title={t('onboarding.screens.financialSetup.addAccountButton')} onPress={addAccountLocal} variant="secondary" fullWidth disabled={!accountName.trim()} leftIcon={<Ionicons name="add-circle-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />} style={{ marginBottom: 16 }} />
        <Button title={t('onboarding.screens.financialSetup.nextButton')} onPress={handleNext} fullWidth size="lg" rightIcon={<Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />} />
        <Pressable onPress={handleNext} style={styles.skipButton}><Text style={styles.skipText}>{t('onboarding.screens.financialSetup.skipForNow')}</Text></Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 56, paddingBottom: 28, paddingHorizontal: 24 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  back: {},
  skipBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  skipBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  stepBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12, alignSelf: 'flex-start', marginBottom: 6 },
  stepText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 6 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  progressBar: { height: 4, backgroundColor: colors.border, borderRadius: 2, marginBottom: 28 },
  progressFill: { height: 4, backgroundColor: colors.secondary, borderRadius: 2 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 12 },
  emergencyToggle: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 24, borderWidth: 1.5, borderColor: colors.border },
  emergencyToggleActive: { borderColor: colors.success, backgroundColor: colors.successLight },
  emergencyText: { flex: 1, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  typeChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  typeText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  typeTextActive: { color: '#fff' },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#E8EEF9', borderRadius: 10, padding: 12, marginBottom: 8 },
  accountText: { flex: 1, fontSize: 14, color: colors.primary, fontWeight: '500' },
  accountInputRow: { flexDirection: 'row' },
  skipButton: { alignItems: 'center', paddingVertical: 16 },
  skipText: { color: colors.textMuted, fontSize: 14 },
});
