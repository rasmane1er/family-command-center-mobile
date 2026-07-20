import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../theme/ThemeContext';
import { useFamilyStore } from '../../store/useFamilyStore';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { UpgradePrompt } from '../../components/common/UpgradePrompt';
import { useSubscription } from '../../hooks/useSubscription';
import { defaultPermissionsForRole } from '../../types';
import type { FamilyMember, MemberRole } from '../../types';
import { useTranslation } from 'react-i18next';

type MemberType = 'local' | 'linked';
type Step = 1 | 2;

const LOCAL_ROLES: MemberRole[] = ['child', 'grandparent', 'caregiver'];
const LINKED_ROLES: MemberRole[] = ['parent', 'guardian', 'caregiver'];

const AVATAR_COLORS = [
  '#4A8FD9', '#E74C3C', '#27AE60', '#F39C12', '#9B59B6',
  '#1ABC9C', '#E91E63', '#FF5722', '#607D8B', '#795548',
];

import { generateId } from '../../utils/generateId';

export function AddMemberScreen({ navigation }: any) {
  const { colors } = useTheme();
  const dynStyles = makeStyles(colors);
  const { t } = useTranslation('family');
  const insets = useSafeAreaInsets();
  const family = useFamilyStore((s) => s.family);
  const addMember = useFamilyStore((s) => s.addMember);
  const members = useFamilyStore((s) => s.members);
  const { features } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const [step, setStep] = useState<Step>(1);
  const [memberType, setMemberType] = useState<MemberType>('local');

  // Step 2 fields
  const [name, setName] = useState('');
  const [role, setRole] = useState<MemberRole>('child');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [nameError, setNameError] = useState('');
  const [pinError, setPinError] = useState('');

  const availableRoles = memberType === 'local' ? LOCAL_ROLES : LINKED_ROLES;

  const handleSelectType = (type: MemberType) => {
    setMemberType(type);
    setRole(type === 'local' ? 'child' : 'parent');
    setStep(2);
  };

  const validate = (): boolean => {
    let valid = true;
    if (!name.trim()) {
      setNameError('Name is required');
      valid = false;
    } else {
      setNameError('');
    }
    if (pinEnabled && (pin.length < 4 || pin.length > 6)) {
      setPinError('PIN must be 4–6 digits');
      valid = false;
    } else {
      setPinError('');
    }
    return valid;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (!family) return;

    if (members.length >= features.maxFamilyMembers) {
      setShowUpgrade(true);
      return;
    }

    const now = new Date().toISOString();
    const member: FamilyMember = {
      id: `member-${generateId()}`,
      familyId: family.id,
      name: name.trim(),
      role,
      avatarColor,
      status: 'ACTIVE',
      points: 0,
      level: 1,
      isAdmin: false,
      createdAt: now,
      isLocalProfile: memberType === 'local',
      linkedUserId: null,
      isPinProtected: memberType === 'local' && pinEnabled,
      pin: memberType === 'local' && pinEnabled ? pin : undefined,
      permissions: defaultPermissionsForRole(role),
      inviteStatus: memberType === 'linked' ? 'pending' : 'accepted',
      ...(dateOfBirth.trim() ? { dateOfBirth: dateOfBirth.trim() } : {}),
      ...(email.trim() ? { email: email.trim() } : {}),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
    };

    try {
      await addMember(member);
      navigation.goBack();
    } catch {
      // Server-side member cap rejected this (client-side check above was
      // stale or bypassed) — same upgrade prompt as the client-side gate.
      setShowUpgrade(true);
    }
  };

  const roleLabel = (r: MemberRole) =>
    r.charAt(0).toUpperCase() + r.slice(1);

  return (
    <View style={dynStyles.container}>

      {step === 1 && (() => {
        const step1Header = (
          <LinearGradient
            colors={['#0F2952', '#1E4A8A']}
            style={[dynStyles.header, { paddingTop: insets.top + 6 }]}
          >
            <Pressable onPress={() => navigation.goBack()} style={dynStyles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </Pressable>
            <Text style={dynStyles.headerTitle}>{t('addMember.title')}</Text>
            <View style={{ width: 40 }} />
          </LinearGradient>
        );
        const step1Compact = (
          <LinearGradient colors={['#0F2952', '#1E4A8A']} style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable onPress={() => navigation.goBack()} style={dynStyles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </Pressable>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>{t('addMember.title')}</Text>
            <View style={{ width: 40 }} />
          </LinearGradient>
        );
        return (
        <CollapsibleHeader fullHeader={step1Header} compactHeader={step1Compact}>
          {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
        <ScrollView
          onScroll={onScroll}
          onScrollEndDrag={onScrollEndDrag}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={scrollEventThrottle}
          contentContainerStyle={[dynStyles.content, { paddingTop: contentPaddingTop }]}
        >
          <Text style={dynStyles.sectionTitle}>How will this person use the app?</Text>

          <Pressable style={dynStyles.typeCard} onPress={() => handleSelectType('local')}>
            <View style={[dynStyles.typeIconBox, { backgroundColor: '#E8F4FD' }]}>
              <Ionicons name="person-outline" size={28} color={colors.primary} />
            </View>
            <View style={dynStyles.typeText}>
              <Text style={dynStyles.typeTitle}>Local Profile</Text>
              <Text style={dynStyles.typeDesc}>
                No email or password needed. Great for children, grandparents, or caregivers sharing this device. Switch with a PIN if desired.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>

          <Pressable style={dynStyles.typeCard} onPress={() => handleSelectType('linked')}>
            <View style={[dynStyles.typeIconBox, { backgroundColor: '#E8F7EE' }]}>
              <Ionicons name="mail-outline" size={28} color={colors.success} />
            </View>
            <View style={dynStyles.typeText}>
              <Text style={dynStyles.typeTitle}>Linked Account</Text>
              <Text style={dynStyles.typeDesc}>
                Invite a spouse, co-parent, or caregiver via email or phone. They sign in on their own device with their own account.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
        </ScrollView>
          )}
        </CollapsibleHeader>
        );
      })()}

      {step === 2 && (
        <ScrollView contentContainerStyle={dynStyles.content} keyboardShouldPersistTaps="handled">
          {/* Name */}
          <Text style={dynStyles.label}>Name *</Text>
          <TextInput
            style={[dynStyles.input, nameError ? dynStyles.inputError : undefined]}
            placeholder="Enter full name"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={(t) => { setName(t); setNameError(''); }}
          />
          {nameError ? <Text style={dynStyles.errorText}>{nameError}</Text> : null}

          {/* Role */}
          <Text style={dynStyles.label}>Role</Text>
          <View style={dynStyles.chipRow}>
            {availableRoles.map((r) => (
              <Pressable
                key={r}
                style={[dynStyles.chip, role === r && dynStyles.chipActive]}
                onPress={() => setRole(r)}
              >
                <Text style={[dynStyles.chipText, role === r && dynStyles.chipTextActive]}>
                  {roleLabel(r)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* DOB */}
          <Text style={dynStyles.label}>Date of Birth (optional)</Text>
          <TextInput
            style={dynStyles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
          />

          {/* Avatar color */}
          <Text style={dynStyles.label}>Avatar Color</Text>
          <View style={dynStyles.colorRow}>
            {AVATAR_COLORS.map((c) => (
              <Pressable
                key={c}
                style={[dynStyles.colorDot, { backgroundColor: c }, avatarColor === c && dynStyles.colorDotActive]}
                onPress={() => setAvatarColor(c)}
              >
                {avatarColor === c && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </Pressable>
            ))}
          </View>

          {/* Local-only: PIN */}
          {memberType === 'local' && (
            <>
              <View style={dynStyles.toggleRow}>
                <View style={dynStyles.toggleText}>
                  <Text style={dynStyles.toggleTitle}>PIN Protection</Text>
                  <Text style={dynStyles.toggleDesc}>Require a PIN to switch to this profile</Text>
                </View>
                <Switch
                  value={pinEnabled}
                  onValueChange={setPinEnabled}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>
              {pinEnabled && (
                <>
                  <TextInput
                    style={[dynStyles.input, pinError ? dynStyles.inputError : undefined]}
                    placeholder="Enter 4–6 digit PIN"
                    placeholderTextColor={colors.textMuted}
                    value={pin}
                    onChangeText={(t) => { setPin(t.replace(/\D/g, '').slice(0, 6)); setPinError(''); }}
                    keyboardType="number-pad"
                    secureTextEntry
                    maxLength={6}
                  />
                  {pinError ? <Text style={dynStyles.errorText}>{pinError}</Text> : null}
                </>
              )}
            </>
          )}

          {/* Linked: email/phone */}
          {memberType === 'linked' && (
            <>
              <Text style={dynStyles.label}>Email (optional)</Text>
              <TextInput
                style={dynStyles.input}
                placeholder="their@email.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={dynStyles.label}>Phone (optional)</Text>
              <TextInput
                style={dynStyles.input}
                placeholder="+1 (555) 000-0000"
                placeholderTextColor={colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              <View style={dynStyles.inviteNote}>
                <Ionicons name="information-circle-outline" size={16} color={colors.info} />
                <Text style={dynStyles.inviteNoteText}>
                  An invite will be sent when you save. The member will show as "Pending" until they join.
                </Text>
              </View>
            </>
          )}

          {/* Save button */}
          <Pressable style={dynStyles.saveBtn} onPress={handleSave}>
            <LinearGradient
              colors={['#1E4A8A', '#0F2952']}
              style={dynStyles.saveBtnGrad}
            >
              <Text style={dynStyles.saveBtnText}>
                {memberType === 'linked' ? 'Send Invite' : 'Add Member'}
              </Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>
      )}

      <UpgradePrompt
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        featureName="Additional family members"
        requiredTier="premium"
        description={`The Free plan supports up to ${features.maxFamilyMembers} family members. Upgrade to Premium for unlimited members.`}
      />
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: '#fff', textAlign: 'center' },
    content: { padding: 20, paddingBottom: 120 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 20 },
    typeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 18,
      marginBottom: 16,
      gap: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    typeIconBox: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    typeText: { flex: 1 },
    typeTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
    typeDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    label: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 8, marginTop: 16 },
    input: {
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inputError: { borderColor: colors.danger },
    errorText: { fontSize: 12, color: colors.danger, marginTop: 4 },
    chipRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    chipTextActive: { color: '#fff' },
    colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    colorDot: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorDotActive: { borderWidth: 3, borderColor: colors.text },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 20,
      marginBottom: 12,
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      gap: 12,
    },
    toggleText: { flex: 1 },
    toggleTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
    toggleDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    inviteNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      marginTop: 8,
    },
    inviteNoteText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    saveBtn: { marginTop: 32 },
    saveBtnGrad: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
    saveBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  });
}
