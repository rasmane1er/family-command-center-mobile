import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PremiumHeader } from '../../../components/common/PremiumHeader';
import { Card } from '../../../components/common/Card';
import { colors } from '../../../theme/colors';
import { useMilitaryStore } from '../../../store/useMilitaryStore';
import { useTranslation } from 'react-i18next';

const MILITARY_GREEN = '#4A7C59';
const MILITARY_GREEN_LIGHT = '#E7F0EA';

const MODULES = [
  {
    key: 'DeploymentTracker',
    icon: 'airplane',
    title: 'Deployment & TDY Tracker',
    desc: 'Countdown, milestones, and calendar sync for deployments and temporary duty.',
  },
  {
    key: 'PCSMove',
    icon: 'clipboard',
    title: 'PCS Move Planner',
    desc: 'A real checklist of tasks timed to your move date, from DEERS to final walkthrough.',
  },
  {
    key: 'FamilyReadiness',
    icon: 'id-card',
    title: 'Family Readiness Card',
    desc: 'Rank, unit, DEERS/TRICARE info, and chain-of-command contacts in one place.',
  },
  {
    key: 'Geofence',
    icon: 'location',
    title: 'Duty Station Geofence',
    desc: 'Set up safe-zone alerts for base housing or a large installation.',
  },
] as const;

export function MilitaryHubScreen({ navigation }: any) {
  const { t } = useTranslation('family');
  const deployments = useMilitaryStore((s) => s.deployments);
  const pcsMoves = useMilitaryStore((s) => s.pcsMoves);

  const now = Date.now();
  const activeDeployment = deployments.find(
    (d) => new Date(d.startDate).getTime() <= now && (!d.endDate || new Date(d.endDate).getTime() >= now)
  );
  const upcomingMove = pcsMoves
    .filter((m) => new Date(m.moveDate).getTime() >= now)
    .sort((a, b) => new Date(a.moveDate).getTime() - new Date(b.moveDate).getTime())[0];

  return (
    <View style={styles.container}>
      <PremiumHeader
        title="Military Hub"
        subtitle="Tools built for service member families"
        onBack={() => navigation.goBack()}
        colors={['#0F2952', MILITARY_GREEN]}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {(activeDeployment || upcomingMove) && (
          <View style={styles.statusRow}>
            {activeDeployment && (
              <View style={styles.statusPill}>
                <Ionicons name="airplane" size={14} color={MILITARY_GREEN} />
                <Text style={styles.statusPillText} numberOfLines={1}>
                  Deployed — {activeDeployment.location}
                </Text>
              </View>
            )}
            {upcomingMove && (
              <View style={styles.statusPill}>
                <Ionicons name="clipboard" size={14} color={MILITARY_GREEN} />
                <Text style={styles.statusPillText} numberOfLines={1}>
                  PCS to {upcomingMove.toLocation}
                </Text>
              </View>
            )}
          </View>
        )}

        {MODULES.map((mod) => (
          <Pressable key={mod.key} onPress={() => navigation.navigate(mod.key)}>
            <Card style={styles.moduleCard} variant="elevated">
              <View style={styles.moduleIcon}>
                <Ionicons name={mod.icon as any} size={24} color={MILITARY_GREEN} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.moduleTitle}>{mod.title}</Text>
                <Text style={styles.moduleDesc}>{mod.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 48 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: MILITARY_GREEN_LIGHT, borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 14,
  },
  statusPillText: { fontSize: 12, fontWeight: '700', color: MILITARY_GREEN },
  moduleCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, marginBottom: 12 },
  moduleIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: MILITARY_GREEN_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  moduleTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  moduleDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
});
