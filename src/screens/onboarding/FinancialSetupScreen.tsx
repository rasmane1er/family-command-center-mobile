import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../../theme/colors';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useFinanceStore } from '../../store/useFinanceStore';
import type { FinancialAccount } from '../../types';

const accountTypes = [
  { type: 'checking', label: 'Checking', icon: 'card-outline' },
  { type: 'savings', label: 'Savings', icon: 'save-outline' },
  { type: 'investment', label: 'Investment', icon: 'trending-up-outline' },
  { type: 'credit', label: 'Credit Card', icon: 'card' },
] as const;

export function FinancialSetupScreen({ navigation }: any) {
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
    const acc: FinancialAccount = {
      id: `acc-${Date.now()}`,
      familyId: 'family-1',
      name: accountName.trim(),
      type: selectedType,
      balance: parseFloat(accountBalance) || 0,
      lastUpdated: new Date().toISOString(),
      isShared: true,
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
      <LinearGradient colors={['#0F2952', '#1E4A8A']} style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <View style={styles.stepBadge}><Text style={styles.stepText}>Step 5 of 7</Text></View>
        <Text style={styles.headerTitle}>Financial Setup</Text>
        <Text style={styles.headerSub}>Connect your financial picture</Text>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '71%' }]} />
        </View>

        <Input label="Estimated Monthly Household Income" placeholder="$8,000" value={monthlyIncome} onChangeText={setMonthlyIncome} leftIcon="cash-outline" keyboardType="numeric" />
        <Input label="Estimated Monthly Expenses" placeholder="$5,500" value={monthlyExpenses} onChangeText={setMonthlyExpenses} leftIcon="trending-down-outline" keyboardType="numeric" />

        <Pressable
          onPress={() => setHasEmergencyFund(!hasEmergencyFund)}
          style={[styles.emergencyToggle, hasEmergencyFund && styles.emergencyToggleActive]}
        >
          <Ionicons name={hasEmergencyFund ? 'checkmark-circle' : 'radio-button-off'} size={22} color={hasEmergencyFund ? colors.success : colors.textMuted} />
          <Text style={[styles.emergencyText, hasEmergencyFund && { color: colors.success }]}>
            I have an emergency fund (3-6 months of expenses)
          </Text>
        </Pressable>

        <Text style={styles.sectionLabel}>Add Accounts (optional)</Text>
        <View style={styles.typeRow}>
          {accountTypes.map((t) => (
            <Pressable key={t.type} onPress={() => setSelectedType(t.type)} style={[styles.typeChip, selectedType === t.type && styles.typeChipActive]}>
              <Ionicons name={t.icon as any} size={16} color={selectedType === t.type ? '#fff' : colors.textSecondary} />
              <Text style={[styles.typeText, selectedType === t.type && styles.typeTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {accounts.map((a, i) => (
          <View key={i} style={styles.accountRow}>
            <Ionicons name="wallet-outline" size={20} color={colors.primary} />
            <Text style={styles.accountText}>{a.name} — ${a.balance.toLocaleString()}</Text>
            <Pressable onPress={() => setAccounts(accounts.filter((_, ai) => ai !== i))}>
              <Ionicons name="close-circle" size={20} color={colors.danger} />
            </Pressable>
          </View>
        ))}

        <View style={styles.accountInputRow}>
          <Input label="Account Name" placeholder="Family Checking" value={accountName} onChangeText={setAccountName} containerStyle={{ flex: 1, marginRight: 8 }} />
          <Input label="Balance" placeholder="8,000" value={accountBalance} onChangeText={setAccountBalance} keyboardType="numeric" containerStyle={{ flex: 1 }} />
        </View>

        <Button title="Add Account" onPress={addAccountLocal} variant="secondary" fullWidth disabled={!accountName.trim()} leftIcon={<Ionicons name="add-circle-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />} style={{ marginBottom: 16 }} />
        <Button title="Next: Set Goals" onPress={handleNext} fullWidth size="lg" rightIcon={<Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />} />
        <Pressable onPress={handleNext} style={styles.skipButton}><Text style={styles.skipText}>Skip for now</Text></Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 56, paddingBottom: 28, paddingHorizontal: 24 },
  back: { marginBottom: 16 },
  stepBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12, alignSelf: 'flex-start', marginBottom: 12 },
  stepText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 6 },
  headerSub: { fontSize: 15, color: 'rgba(255,255,255,0.7)' },
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
