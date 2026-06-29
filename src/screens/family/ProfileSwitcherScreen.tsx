import React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../../components/common/Card';
import { Avatar } from '../../components/common/Avatar';
import { useFamilyStore } from '../../store/useFamilyStore';
import { colors } from '../../theme/colors';

export function ProfileSwitcherScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const members = useFamilyStore((s) => s.members);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);
  const setActiveMember = useFamilyStore((s) => s.setActiveMember);

  const handleSwitch = (memberId: string) => {
    setActiveMember(memberId);
    // Navigate to the Home tab via the parent Tab Navigator so the whole app reflects the new profile
    navigation.getParent()?.navigate('Home');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F2952', '#1E4A8A']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Switch Profile</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Select who is using the app right now</Text>

        {members.map((member) => {
          const isActive = member.id === activeMemberId;
          return (
            <Card
              key={member.id}
              style={isActive ? { ...styles.card, ...styles.activeCard } : styles.card}
              onPress={() => handleSwitch(member.id)}
            >
              <Avatar name={member.name} color={member.avatarColor} size={52} />
              <View style={styles.cardText}>
                <Text style={styles.name}>{member.name}</Text>
                <Text style={styles.role}>
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                </Text>
              </View>
              {isActive ? (
                <View style={styles.activeBadge}>
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  <Text style={styles.activeLabel}>Active</Text>
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              )}
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 18 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center' },
  content: { padding: 16, paddingBottom: 100 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 20, marginTop: 4 },
  card: { marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 14 },
  activeCard: { borderWidth: 2, borderColor: colors.primary, backgroundColor: '#EEF3FB' },
  cardText: { flex: 1 },
  name: { fontSize: 16, fontWeight: '800', color: colors.text },
  role: { fontSize: 12, color: colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  activeLabel: { fontSize: 12, fontWeight: '800', color: colors.primary },
});