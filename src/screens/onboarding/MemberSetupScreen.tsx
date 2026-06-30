import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../../theme/colors';
import { Avatar } from '../../components/common/Avatar';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { useFamilyStore } from '../../store/useFamilyStore';
import type { FamilyMember, MemberRole } from '../../types';
import { defaultPermissionsForRole } from '../../types';

const roles: { value: MemberRole; label: string; icon: string }[] = [
  { value: 'parent', label: 'Parent', icon: 'person' },
  { value: 'child', label: 'Child', icon: 'happy' },
  { value: 'guardian', label: 'Guardian', icon: 'shield' },
  { value: 'grandparent', label: 'Grandparent', icon: 'people' },
];

export function MemberSetupScreen({ navigation }: any) {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [name, setName] = useState('');
  const [role, setRole] = useState<MemberRole>('parent');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const familyId = useFamilyStore((s) => s.family?.id || 'family-1');
  const addMember = useFamilyStore((s) => s.addMember);

  const addMemberLocal = () => {
    if (!name.trim()) return;
    const newMember: FamilyMember = {
      id: `member-${Date.now()}`,
      familyId,
      name: name.trim(),
      role,
      avatarColor: colors.avatars[members.length % colors.avatars.length],
      dateOfBirth: dob || undefined,
      email: email.trim() || undefined,
      status: 'active',
      points: 0,
      level: 1,
      isAdmin: role === 'parent' || role === 'guardian',
      isLocalProfile: role === 'child',
      linkedUserId: null,
      isPinProtected: false,
      permissions: defaultPermissionsForRole(role),
      inviteStatus: 'none',
      createdAt: new Date().toISOString(),
    };
    setMembers([...members, newMember]);
    setName('');
    setDob('');
    setEmail('');
  };

  const removeMember = (id: string) => setMembers(members.filter((m) => m.id !== id));

  const handleNext = () => {
    if (members.length === 0) {
      Alert.alert('Add Members', 'Please add at least one family member to continue.');
      return;
    }
    members.forEach(addMember);
    navigation.navigate('HomeSetup');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#0F2952', '#1E4A8A']} style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <View style={styles.stepBadge}><Text style={styles.stepText}>Step 2 of 7</Text></View>
        <Text style={styles.headerTitle}>Family Members</Text>
        <Text style={styles.headerSub}>Add everyone in your household</Text>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '28%' }]} />
        </View>

        {members.length > 0 && (
          <View style={styles.membersList}>
            <Text style={styles.sectionLabel}>Added Members ({members.length})</Text>
            {members.map((m) => (
              <Card key={m.id} style={styles.memberCard} variant="elevated">
                <View style={styles.memberRow}>
                  <Avatar name={m.name} color={m.avatarColor} size={44} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.memberName}>{m.name}</Text>
                    <Text style={styles.memberRole}>{m.role.charAt(0).toUpperCase() + m.role.slice(1)}</Text>
                  </View>
                  <Pressable onPress={() => removeMember(m.id)}>
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </Pressable>
                </View>
              </Card>
            ))}
          </View>
        )}

        <Text style={styles.sectionLabel}>Add a Member</Text>

        <View style={styles.roleSelector}>
          {roles.map((r) => (
            <Pressable
              key={r.value}
              onPress={() => setRole(r.value)}
              style={[styles.roleChip, role === r.value && styles.roleChipActive]}
            >
              <Ionicons name={r.icon as any} size={16} color={role === r.value ? '#fff' : colors.textSecondary} />
              <Text style={[styles.roleText, role === r.value && styles.roleTextActive]}>{r.label}</Text>
            </Pressable>
          ))}
        </View>

        <Input
          label="Name *"
          placeholder='e.g., "Sarah"'
          value={name}
          onChangeText={setName}
          leftIcon="person-outline"
          autoCapitalize="words"
        />
        <Input
          label="Date of Birth (optional)"
          placeholder="YYYY-MM-DD"
          value={dob}
          onChangeText={setDob}
          leftIcon="calendar-outline"
        />
        <Input
          label="Email (optional)"
          placeholder="member@example.com"
          value={email}
          onChangeText={setEmail}
          leftIcon="mail-outline"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Button
          title={`Add ${name || 'Member'}`}
          onPress={addMemberLocal}
          variant="secondary"
          fullWidth
          disabled={!name.trim()}
          leftIcon={<Ionicons name="add-circle-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />}
          style={{ marginBottom: 16 }}
        />

        <Button
          title="Next: Home Setup"
          onPress={handleNext}
          fullWidth
          size="lg"
          disabled={members.length === 0}
          rightIcon={<Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />}
        />

        <Pressable onPress={handleNext} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>
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
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 6 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  progressBar: { height: 4, backgroundColor: colors.border, borderRadius: 2, marginBottom: 28 },
  progressFill: { height: 4, backgroundColor: colors.secondary, borderRadius: 2 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 12 },
  membersList: { marginBottom: 24 },
  memberCard: { marginBottom: 10 },
  memberRow: { flexDirection: 'row', alignItems: 'center' },
  memberName: { fontSize: 16, fontWeight: '600', color: colors.text },
  memberRole: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  roleSelector: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  roleChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  roleChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  roleText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  roleTextActive: { color: '#fff' },
  skipButton: { alignItems: 'center', paddingVertical: 16 },
  skipText: { color: colors.textMuted, fontSize: 14 },
});
