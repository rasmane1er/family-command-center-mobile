import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../../theme/colors';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { useAppStore } from '../../store/useAppStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useOperationsStore } from '../../store/useOperationsStore';
import { useAIStore } from '../../store/useAIStore';

const suggestedGoals = [
  { icon: 'shield', color: '#27AE60', bg: '#D5F5E3', title: 'Build Emergency Fund', desc: '3-6 months of expenses', category: 'savings' },
  { icon: 'airplane', color: '#45B7D1', bg: '#D6EAF8', title: 'Family Vacation', desc: 'Plan your next adventure', category: 'travel' },
  { icon: 'school', color: '#F5A623', bg: '#FEF3E2', title: "Kids' Education Fund", desc: '529 savings plan', category: 'education' },
  { icon: 'home', color: '#DDA0DD', bg: '#F5E6FF', title: 'Home Improvement', desc: 'Renovations & upgrades', category: 'home' },
  { icon: 'fitness', color: '#E74C3C', bg: '#FDEDEC', title: 'Family Fitness', desc: 'Health & wellness goals', category: 'health' },
  { icon: 'car', color: '#2980B9', bg: '#D6EAF8', title: 'New Vehicle Fund', desc: 'Save for your next car', category: 'other' },
];

export function GoalsSetupScreen({ navigation }: any) {
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const setOnboarded = useAppStore((s) => s.setOnboarded);
  const seedDemoFamily = useFamilyStore((s) => s.seedDemoData);
  const seedDemoFinance = useFinanceStore((s) => s.seedDemoData);
  const seedDemoOps = useOperationsStore((s) => s.seedDemoData);
  const seedDemoAI = useAIStore((s) => s.seedDemoInsights);
  const family = useFamilyStore((s) => s.family);

  const toggleGoal = (title: string) => {
    setSelectedGoals((prev) =>
      prev.includes(title) ? prev.filter((g) => g !== title) : [...prev, title]
    );
  };

  const handleFinish = () => {
    if (!family) {
      seedDemoFamily();
      seedDemoFinance();
      seedDemoOps();
      seedDemoAI();
    }
    setOnboarded(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#0F2952', '#1E4A8A']} style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <View style={styles.stepBadge}><Text style={styles.stepText}>Step 7 of 7</Text></View>
        <Text style={styles.headerTitle}>Family Goals</Text>
        <Text style={styles.headerSub}>What are you working toward?</Text>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '100%' }]} />
        </View>

        <Text style={styles.sectionLabel}>Select goals to track (pick any)</Text>

        <View style={styles.goalsGrid}>
          {suggestedGoals.map((g) => (
            <Pressable
              key={g.title}
              onPress={() => toggleGoal(g.title)}
              style={[styles.goalCard, selectedGoals.includes(g.title) && styles.goalCardActive]}
            >
              <View style={[styles.goalIcon, { backgroundColor: g.bg }]}>
                <Ionicons name={g.icon as any} size={24} color={g.color} />
              </View>
              <Text style={styles.goalTitle}>{g.title}</Text>
              <Text style={styles.goalDesc}>{g.desc}</Text>
              {selectedGoals.includes(g.title) && (
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                </View>
              )}
            </Pressable>
          ))}
        </View>

        <Card style={styles.readyCard} padding={20}>
          <View style={styles.readyRow}>
            <View style={styles.readyIcon}>
              <Ionicons name="rocket" size={28} color={colors.secondary} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.readyTitle}>You're all set!</Text>
              <Text style={styles.readyDesc}>
                Your Family Command Center is ready. The AI will learn your patterns and provide personalized insights.
              </Text>
            </View>
          </View>
        </Card>

        <Button
          title="Launch Family Command Center"
          onPress={handleFinish}
          fullWidth
          size="lg"
          style={{ marginBottom: 12 }}
          leftIcon={<Ionicons name="rocket-outline" size={20} color="#fff" style={{ marginRight: 8 }} />}
        />
        <Text style={styles.footer}>
          You can always add more details in Settings
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 56, paddingBottom: 28, paddingHorizontal: 24 },
  back: { marginBottom: 8 },
  stepBadge: { backgroundColor: 'rgba(245,166,35,0.3)', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12, alignSelf: 'flex-start', marginBottom: 6 },
  stepText: { color: colors.secondary, fontSize: 12, fontWeight: '700' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 6 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  progressBar: { height: 4, backgroundColor: colors.border, borderRadius: 2, marginBottom: 28 },
  progressFill: { height: 4, backgroundColor: colors.secondary, borderRadius: 2 },
  sectionLabel: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 16 },
  goalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  goalCard: {
    width: '47%',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  goalCardActive: { borderColor: colors.success, backgroundColor: '#F0FFF4' },
  goalIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  goalTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 4 },
  goalDesc: { fontSize: 11, color: colors.textSecondary, lineHeight: 16 },
  checkmark: { position: 'absolute', top: 10, right: 10 },
  readyCard: { backgroundColor: '#FEF3E2', borderRadius: 16, marginBottom: 24 },
  readyRow: { flexDirection: 'row', alignItems: 'flex-start' },
  readyIcon: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#FFE4A8', alignItems: 'center', justifyContent: 'center' },
  readyTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 6 },
  readyDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  footer: { textAlign: 'center', fontSize: 13, color: colors.textMuted, marginTop: 8 },
});
