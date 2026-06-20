import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { useAppStore } from '../../store/useAppStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useOperationsStore } from '../../store/useOperationsStore';
import { useAIStore } from '../../store/useAIStore';

const SUBSCRIPTION_TIERS = [
  { key: 'free', label: 'Free', price: '$0', color: colors.textSecondary, features: ['5 family members', 'Basic tasks & calendar', 'Limited AI queries'] },
  { key: 'premium', label: 'Premium', price: '$9.99/mo', color: colors.primary, features: ['Unlimited members', 'All finance tools', '50 AI queries/mo', 'Document vault'] },
  { key: 'family_pro', label: 'Family Pro', price: '$19.99/mo', color: colors.secondary, features: ['Everything in Premium', 'Unlimited AI', 'Military mode', 'Priority support', 'Family Digital Twin'] },
];

export function SettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, setOnboarded } = useAppStore();
  const militaryMode = useAppStore((s) => s.settings?.militaryMode || false);
  const { toggleMilitaryMode } = useAppStore();
  const family = useFamilyStore((s) => s.family);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const { seedDemoData: seedFamily } = useFamilyStore();
  const { seedDemoData: seedFinance } = useFinanceStore();
  const { seedDemoData: seedOps } = useOperationsStore();
  const { seedDemoInsights } = useAIStore();

  const handleResetOnboarding = () => {
    Alert.alert(
      'Reset App',
      'This will clear all data and restart onboarding. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => setOnboarded(false),
        },
      ]
    );
  };

  const handleLoadDemo = () => {
    seedFamily();
    seedFinance();
    seedOps();
    seedDemoInsights();
    Alert.alert('Demo Data Loaded', 'The Johnson Family demo data has been loaded!');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#0F2952', '#16476E']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.profileRow}>
          <View style={styles.profileAvatar}>
            <Ionicons name="home" size={24} color="#fff" />
          </View>
          <View>
            <Text style={styles.profileName}>{family?.name || 'Your Family'}</Text>
            <Text style={styles.profilePlan}>Free Plan • Upgrade for more</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {/* Subscription */}
        <Text style={styles.sectionTitle}>Subscription</Text>
        {SUBSCRIPTION_TIERS.map((tier) => (
          <Card key={tier.key} style={tier.key === 'family_pro' ? { ...styles.tierCard, ...styles.tierCardHighlight } : styles.tierCard} variant="elevated">
            <View style={styles.tierHeader}>
              <View>
                <Text style={[styles.tierName, { color: tier.color }]}>{tier.label}</Text>
                <Text style={styles.tierPrice}>{tier.price}</Text>
              </View>
              {tier.key === 'free' ? (
                <View style={styles.currentBadge}><Text style={styles.currentBadgeText}>Current</Text></View>
              ) : (
                <Pressable style={[styles.upgradeBtn, { backgroundColor: tier.color }]}>
                  <Text style={styles.upgradeBtnText}>Upgrade</Text>
                </Pressable>
              )}
            </View>
            {tier.features.map((f) => (
              <View key={f} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={14} color={tier.key === 'free' ? colors.success : tier.color} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </Card>
        ))}

        {/* AI Settings */}
        <Text style={styles.sectionTitle}>AI Configuration</Text>
        <Card style={styles.settingCard} variant="elevated">
          <Text style={styles.settingLabel}>Anthropic API Key</Text>
          <Text style={styles.settingDesc}>Add your own API key for unlimited AI queries</Text>
          <View style={styles.apiKeyRow}>
            <TextInput
              style={styles.apiKeyInput}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="sk-ant-..."
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showApiKey}
              autoCapitalize="none"
            />
            <Pressable onPress={() => setShowApiKey(!showApiKey)} style={styles.apiToggle}>
              <Ionicons name={showApiKey ? 'eye-off' : 'eye'} size={18} color={colors.textMuted} />
            </Pressable>
          </View>
          <Pressable style={styles.saveKeyBtn}>
            <Text style={styles.saveKeyText}>Save API Key</Text>
          </Pressable>
        </Card>

        {/* Notifications */}
        <Text style={styles.sectionTitle}>Notifications</Text>
        <Card style={styles.settingCard} variant="elevated">
          {[
            { key: 'billReminders', label: 'Bill Reminders', desc: 'Alerts before bills are due', icon: 'receipt-outline' },
            { key: 'taskReminders', label: 'Task Reminders', desc: 'Daily task summary', icon: 'checkbox-outline' },
            { key: 'lowStockAlerts', label: 'Low Stock Alerts', desc: 'When pantry items run low', icon: 'nutrition-outline' },
            { key: 'budgetAlerts', label: 'Budget Alerts', desc: 'When spending approaches limits', icon: 'wallet-outline' },
          ].map((setting, i, arr) => (
            <View key={setting.key} style={[styles.toggleRow, i < arr.length - 1 && styles.toggleRowBorder]}>
              <Ionicons name={setting.icon as any} size={20} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.toggleLabel}>{setting.label}</Text>
                <Text style={styles.toggleDesc}>{setting.desc}</Text>
              </View>
              <Switch
                value={true}
                onValueChange={() => {}}
                trackColor={{ false: colors.border, true: colors.primary + '60' }}
                thumbColor={colors.primary}
              />
            </View>
          ))}
        </Card>

        {/* Appearance */}
        <Text style={styles.sectionTitle}>Appearance</Text>
        <Card style={styles.settingCard} variant="elevated">
          <View style={styles.toggleRow}>
            <Ionicons name="moon-outline" size={20} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.toggleLabel}>Dark Mode</Text>
              <Text style={styles.toggleDesc}>Switch to dark theme</Text>
            </View>
            <Switch
              value={false}
              onValueChange={() => {}}
              trackColor={{ false: colors.border, true: colors.primary + '60' }}
              thumbColor={colors.primary}
            />
          </View>
          <View style={[styles.toggleRow, styles.toggleRowBorder]}>
            <Ionicons name="shield-outline" size={20} color={'#4A7C59'} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.toggleLabel}>Military Mode</Text>
              <Text style={styles.toggleDesc}>Enhanced tools for military families</Text>
            </View>
            <Switch
              value={militaryMode}
              onValueChange={toggleMilitaryMode}
              trackColor={{ false: colors.border, true: '#4A7C59' + '60' }}
              thumbColor={'#4A7C59'}
            />
          </View>
        </Card>

        {/* Security */}
        <Text style={styles.sectionTitle}>Privacy & Security</Text>
        <Card style={styles.settingCard} variant="elevated">
          {[
            { icon: 'finger-print', label: 'Biometric Lock', desc: 'Use Face ID or fingerprint to lock app' },
            { icon: 'eye-off-outline', label: 'Hide Balances', desc: 'Hide financial balances on dashboard' },
            { icon: 'lock-closed-outline', label: 'Auto-Lock', desc: 'Lock app after 5 minutes of inactivity' },
            { icon: 'cloud-upload-outline', label: 'Cloud Backup', desc: 'Automatically back up your data' },
          ].map((item, i, arr) => (
            <Pressable key={item.label} style={[styles.toggleRow, i < arr.length - 1 && styles.toggleRowBorder]}>
              <Ionicons name={item.icon as any} size={20} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.toggleLabel}>{item.label}</Text>
                <Text style={styles.toggleDesc}>{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          ))}
        </Card>

        {/* About */}
        <Text style={styles.sectionTitle}>About</Text>
        <Card style={styles.settingCard} variant="elevated">
          {[
            { icon: 'document-text-outline', label: 'Privacy Policy' },
            { icon: 'shield-checkmark-outline', label: 'Terms of Service' },
            { icon: 'help-circle-outline', label: 'Help & Support' },
            { icon: 'star-outline', label: 'Rate the App' },
            { icon: 'share-outline', label: 'Share with Friends' },
          ].map((item, i, arr) => (
            <Pressable key={item.label} style={[styles.toggleRow, i < arr.length - 1 && styles.toggleRowBorder]}>
              <Ionicons name={item.icon as any} size={20} color={colors.primary} />
              <Text style={[styles.toggleLabel, { marginLeft: 12, flex: 1 }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          ))}
        </Card>

        <Text style={styles.sectionTitle}>Developer</Text>
        <Card style={styles.settingCard} variant="elevated">
          <Pressable onPress={handleLoadDemo} style={[styles.toggleRow, styles.toggleRowBorder]}>
            <Ionicons name="flask-outline" size={20} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.toggleLabel}>Load Demo Data</Text>
              <Text style={styles.toggleDesc}>Populate with Johnson Family data</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
          <Pressable onPress={handleResetOnboarding} style={styles.toggleRow}>
            <Ionicons name="refresh-outline" size={20} color={colors.danger} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.toggleLabel, { color: colors.danger }]}>Reset & Re-onboard</Text>
              <Text style={styles.toggleDesc}>Clear all data and restart</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        </Card>

        <Text style={styles.version}>Family Command Center v1.0.0</Text>
        <Text style={styles.versionSub}>Built with ❤️ for families everywhere</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#fff' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  profileAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  profileName: { fontSize: 18, fontWeight: '800', color: '#fff' },
  profilePlan: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  content: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textSecondary, marginTop: 20, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  tierCard: { marginBottom: 10, borderRadius: 14 },
  tierCardHighlight: { borderWidth: 2, borderColor: colors.secondary },
  tierHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  tierName: { fontSize: 16, fontWeight: '800' },
  tierPrice: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  currentBadge: { backgroundColor: colors.background, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
  currentBadgeText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  upgradeBtn: { borderRadius: 10, paddingVertical: 7, paddingHorizontal: 16 },
  upgradeBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  featureText: { fontSize: 13, color: colors.textSecondary },
  settingCard: { borderRadius: 14, marginBottom: 4 },
  settingLabel: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  settingDesc: { fontSize: 12, color: colors.textSecondary, marginBottom: 10 },
  apiKeyRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
  apiKeyInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, fontSize: 14, color: colors.text },
  apiToggle: { padding: 10 },
  saveKeyBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  saveKeyText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  toggleRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  toggleDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  version: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 24 },
  versionSub: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 4, marginBottom: 8 },
});
