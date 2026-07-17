import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { Avatar } from '../../components/common/Avatar';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { FamilyMember, MemberRole } from '../../types';
import { defaultPermissionsForRole } from '../../types';

const roles: { value: MemberRole; labelKey: string; icon: string }[] = [
  { value: 'parent', labelKey: 'roleParent', icon: 'person' },
  { value: 'child', labelKey: 'roleChild', icon: 'happy' },
  { value: 'guardian', labelKey: 'roleGuardian', icon: 'shield' },
  { value: 'grandparent', labelKey: 'roleGrandparent', icon: 'people' },
];

export function MemberSetupScreen({ navigation }: any) {
  const { t } = useTranslation('onboarding');
  const authUser = useAuthStore((s) => s.user);
  const familyId = useFamilyStore((s) => s.family?.id || 'family-1');
  const addMember = useFamilyStore((s) => s.addMember);

  // Build the signed-in user's member entry once — this is always the first
  // member and cannot be removed or duplicated.
  const selfMember = useMemo<FamilyMember>(() => ({
    id: `member-self-${authUser?.id ?? 'self'}`,
    familyId,
    name: authUser?.displayName ?? authUser?.firstName ?? 'Me',
    role: (authUser?.familyRole as MemberRole) ?? 'parent',
    avatarColor: authUser?.avatarColor ?? colors.avatars[0],
    dateOfBirth: authUser?.dateOfBirth || undefined,
    email: authUser?.email || undefined,
    status: 'ACTIVE',
    points: 0,
    level: 1,
    isAdmin: true,
    isLocalProfile: false,
    linkedUserId: authUser?.id ?? null,
    isPinProtected: false,
    permissions: defaultPermissionsForRole((authUser?.familyRole as MemberRole) ?? 'parent'),
    inviteStatus: 'none',
    createdAt: new Date().toISOString(),
  }), [authUser, familyId]);

  const [additionalMembers, setAdditionalMembers] = useState<FamilyMember[]>([]);
  const [name, setName] = useState('');
  const [role, setRole] = useState<MemberRole>('parent');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');

  // All members = locked self + any additional ones added manually
  const allMembers = [selfMember, ...additionalMembers];

  const addMemberLocal = () => {
    if (!name.trim()) return;
    const newMember: FamilyMember = {
      id: `member-${Date.now()}`,
      familyId,
      name: name.trim(),
      role,
      avatarColor: colors.avatars[allMembers.length % colors.avatars.length],
      dateOfBirth: dob || undefined,
      email: email.trim() || undefined,
      status: 'ACTIVE',
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
    setAdditionalMembers([...additionalMembers, newMember]);
    setName('');
    setDob('');
    setEmail('');
  };

  // Self member (index 0) cannot be removed
  const removeMember = (id: string) => setAdditionalMembers(additionalMembers.filter((m) => m.id !== id));

  const roleLabelKeyByValue = Object.fromEntries(roles.map((r) => [r.value, r.labelKey])) as Record<MemberRole, string>;

  const handleNext = () => {
    allMembers.forEach(addMember);
    navigation.navigate('HomeSetup');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <LinearGradient colors={['#0F2952', '#1E4A8A']} style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={styles.stepBadge}><Text style={styles.stepText}>{t('onboarding.screens.memberSetup.stepBadge')}</Text></View>
          <Text style={styles.headerTitle}>{t('onboarding.screens.memberSetup.title')}</Text>
          <Text style={styles.headerSub}>{t('onboarding.screens.memberSetup.subtitle')}</Text>
        </LinearGradient>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '28%' }]} />
        </View>

        <View style={styles.membersList}>
          <Text style={styles.sectionLabel}>{t('onboarding.screens.memberSetup.addedMembersLabel', { count: allMembers.length })}</Text>
          {allMembers.map((m, index) => {
            const isSelf = index === 0;
            return (
              <Card key={m.id} style={styles.memberCard} variant="elevated">
                <View style={styles.memberRow}>
                  <Avatar name={m.name} color={m.avatarColor} size={44} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.memberName}>{m.name}</Text>
                      {isSelf && (
                        <View style={styles.youBadge}>
                          <Text style={styles.youBadgeText}>You</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.memberRole}>{t(`onboarding.screens.memberSetup.${roleLabelKeyByValue[m.role]}`)}</Text>
                  </View>
                  {isSelf ? (
                    <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                  ) : (
                    <Pressable onPress={() => removeMember(m.id)}>
                      <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    </Pressable>
                  )}
                </View>
              </Card>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>{t('onboarding.screens.memberSetup.addAMemberLabel')}</Text>

        <View style={styles.roleSelector}>
          {roles.map((r) => (
            <Pressable
              key={r.value}
              onPress={() => setRole(r.value)}
              style={[styles.roleChip, role === r.value && styles.roleChipActive]}
            >
              <Ionicons name={r.icon as any} size={16} color={role === r.value ? '#fff' : colors.textSecondary} />
              <Text style={[styles.roleText, role === r.value && styles.roleTextActive]} numberOfLines={1} adjustsFontSizeToFit>{t(`onboarding.screens.memberSetup.${r.labelKey}`)}</Text>
            </Pressable>
          ))}
        </View>

        <Input
          label={t('onboarding.screens.memberSetup.nameLabel')}
          placeholder={t('onboarding.screens.memberSetup.namePlaceholder')}
          value={name}
          onChangeText={setName}
          leftIcon="person-outline"
          autoCapitalize="words"
        />
        <Input
          label={t('onboarding.screens.memberSetup.dobLabel')}
          placeholder={t('onboarding.screens.memberSetup.dobPlaceholder')}
          value={dob}
          onChangeText={setDob}
          leftIcon="calendar-outline"
        />
        <Input
          label={t('onboarding.screens.memberSetup.emailLabel')}
          placeholder={t('onboarding.screens.memberSetup.emailPlaceholder')}
          value={email}
          onChangeText={setEmail}
          leftIcon="mail-outline"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Button
          title={name.trim() ? t('onboarding.screens.memberSetup.addMemberButton', { name: name.trim() }) : t('onboarding.screens.memberSetup.addMemberButtonDefault')}
          onPress={addMemberLocal}
          variant="secondary"
          fullWidth
          disabled={!name.trim()}
          leftIcon={<Ionicons name="add-circle-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />}
          style={{ marginBottom: 16 }}
        />

        <Button
          title={t('onboarding.screens.memberSetup.nextButton')}
          onPress={handleNext}
          fullWidth
          size="lg"
          disabled={false}
          rightIcon={<Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />}
        />

        <Pressable onPress={handleNext} style={styles.skipButton}>
          <Text style={styles.skipText}>{t('onboarding.screens.memberSetup.skipForNow')}</Text>
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
  roleChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, width: '48%' },
  roleChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  roleText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600', flexShrink: 1 },
  roleTextActive: { color: '#fff' },
  skipButton: { alignItems: 'center', paddingVertical: 16 },
  skipText: { color: colors.textMuted, fontSize: 14 },
  youBadge: { backgroundColor: colors.primary + '18', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  youBadgeText: { fontSize: 11, fontWeight: '700', color: colors.primary },
});
