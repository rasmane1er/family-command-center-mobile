import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Switch } from 'react-native';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { useAutomationStore } from '../../store/useAutomationStore';

const TRIGGER_LABELS: Record<string, string> = {
  time: 'Time-based',
  location: 'Location',
  event: 'Event',
  condition: 'Condition',
  manual: 'Manual',
};

const ACTION_ICONS: Record<string, string> = {
  notify: 'notifications',
  task: 'checkbox',
  message: 'chatbubble',
  device: 'bulb',
  reminder: 'alarm',
};

const TEMPLATES = [
  { name: 'School Morning Routine', desc: 'Alerts + reminders every school day at 7am', icon: 'school', color: '#2980B9' },
  { name: 'Bill Payment Reminder', desc: 'Auto-remind 3 days before each bill is due', icon: 'card', color: '#E74C3C' },
  { name: 'Weekly Chore Assignment', desc: 'Auto-assign and notify kids every Friday', icon: 'checkbox', color: '#27AE60' },
  { name: 'Pantry Low Alert', desc: 'Alert when grocery items run below minimum', icon: 'nutrition', color: '#F5A623' },
  { name: 'Bedtime Wind-Down', desc: 'Dim lights and screen-off alerts at bedtime', icon: 'moon', color: '#8E44AD' },
  { name: 'Family Weekly Report', desc: 'AI-generated family health summary on Sundays', icon: 'document-text', color: '#16A085' },
];

export function AutomationScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'rules' | 'templates'>('rules');
  const { rules, toggleRule, deleteRule, seedDemoData } = useAutomationStore();

  if (rules.length === 0) seedDemoData();

  const activeRules = rules.filter((r) => r.isActive);
  const totalRuns = rules.reduce((s, r) => s + r.runCount, 0);

  const handleDelete = (id: string, name: string) => {
    Alert.alert(`Delete "${name}"?`, 'This automation will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteRule(id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#1A1A2E', '#16213E']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Automation Engine</Text>
          <Pressable
            onPress={() => Alert.alert('Add Automation', 'Switch to the Templates tab to quickly add pre-built automations to your family rules.', [{ text: 'Got It' }])}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{activeRules.length}</Text>
            <Text style={styles.statLabel}>Active Rules</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statVal}>{totalRuns}</Text>
            <Text style={styles.statLabel}>Total Runs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statVal}>{Math.round(totalRuns * 4.2)}m</Text>
            <Text style={styles.statLabel}>Time Saved</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.tabs}>
        {(['rules', 'templates'] as const).map((tab) => (
          <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'rules' ? `My Rules (${rules.length})` : 'Templates'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {activeTab === 'rules' && rules.map((rule) => (
          <Card key={rule.id} style={styles.ruleCard} variant="elevated">
            <View style={styles.ruleHeader}>
              <View style={[styles.ruleIcon, { backgroundColor: rule.color + '20' }]}>
                <Ionicons name={rule.icon as any} size={20} color={rule.color} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.ruleName}>{rule.name}</Text>
                <Text style={styles.ruleDesc}>{rule.description}</Text>
              </View>
              <Switch
                value={rule.isActive}
                onValueChange={() => toggleRule(rule.id)}
                trackColor={{ false: colors.border, true: rule.color + '60' }}
                thumbColor={rule.color}
              />
            </View>

            <View style={styles.ruleMeta}>
              <View style={styles.ruleFlow}>
                <View style={styles.triggerBadge}>
                  <Ionicons name="flash" size={11} color={colors.primary} />
                  <Text style={styles.triggerText}>{TRIGGER_LABELS[rule.trigger.type]}: {rule.trigger.value}</Text>
                </View>
                <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
                <View style={styles.actionBadge}>
                  <Ionicons name={ACTION_ICONS[rule.action.type] as any} size={11} color={colors.success} />
                  <Text style={styles.actionText}>{rule.action.value.substring(0, 20)}{rule.action.value.length > 20 ? '…' : ''}</Text>
                </View>
              </View>
              <View style={styles.ruleStats}>
                <Text style={styles.runCount}>Ran {rule.runCount}x</Text>
                <Pressable onPress={() => handleDelete(rule.id, rule.name)}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </Pressable>
              </View>
            </View>
          </Card>
        ))}

        {activeTab === 'templates' && TEMPLATES.map((t, i) => (
          <Pressable key={i} onPress={() => Alert.alert('Add Automation', `Add "${t.name}" to your automation rules?`)}>
            <Card style={styles.templateCard} variant="elevated">
              <View style={[styles.templateIcon, { backgroundColor: t.color + '15' }]}>
                <Ionicons name={t.icon as any} size={24} color={t.color} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.templateName}>{t.name}</Text>
                <Text style={styles.templateDesc}>{t.desc}</Text>
              </View>
              <View style={[styles.addTemplate, { backgroundColor: t.color + '15' }]}>
                <Ionicons name="add" size={20} color={t.color} />
              </View>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#fff' },
  addBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statVal: { fontSize: 28, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  statDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.15)' },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.primary },
  content: { padding: 16 },
  ruleCard: { marginBottom: 10, borderRadius: 14 },
  ruleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  ruleIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ruleName: { fontSize: 14, fontWeight: '700', color: colors.text },
  ruleDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 16 },
  ruleMeta: { gap: 8 },
  ruleFlow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  triggerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary + '10', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 },
  triggerText: { fontSize: 10, fontWeight: '700', color: colors.primary },
  actionBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.success + '10', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 },
  actionText: { fontSize: 10, fontWeight: '700', color: colors.success },
  ruleStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  runCount: { fontSize: 11, color: colors.textMuted },
  templateCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderRadius: 14 },
  templateIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  templateName: { fontSize: 14, fontWeight: '700', color: colors.text },
  templateDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  addTemplate: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
