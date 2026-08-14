import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/useAuthStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { uploadImageToR2, getSignedDownloadUrl, isR2Key } from '../../services/uploadService';
import { useTranslation } from 'react-i18next';
import type { MemberRole } from '../../types';

const ROLE_ICONS: Record<MemberRole, string> = {
  parent: 'home', guardian: 'shield-checkmark', grandparent: 'heart',
  caregiver: 'medkit', child: 'school',
};

const AVATAR_COLORS = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6',
];

export function ProfileScreen({ navigation }: any) {
  const { t } = useTranslation('settings');
  const insets = useSafeAreaInsets();
  const { user, familyId, updateProfile } = useAuthStore();
  const { members, activeMemberId, updateMember } = useFamilyStore();
  const activeMember = members.find((m) => m.id === activeMemberId);

  const isChild = activeMember?.role === 'child';
  const isAdmin = activeMember?.isAdmin === true;
  // Anyone with an active auth session IS the account holder — their login
  // email is the auth credential and cannot be changed here. A dedicated
  // verified email-change flow is needed for that.
  const isAccountHolder = !!user;
  // Name and date of birth are identity fields. The account holder can always
  // edit their own data; admins can edit any profile they manage. Everyone
  // else (children, non-admin members) sees these fields as read-only.
  const canEditIdentity = isAccountHolder || isAdmin;

  const [name, setName]               = useState('');
  const [email, setEmail]             = useState('');
  const [phone, setPhone]             = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [role, setRole]               = useState<MemberRole>('parent');
  const [avatarColor, setAvatarColor] = useState('#6366f1');
  const [avatarKey, setAvatarKey]     = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(null);
  const [seeded, setSeeded]           = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [saving, setSaving]           = useState(false);

  // Seed form whenever activeMember becomes available (store may hydrate after mount).
  // Only seed once so user edits aren't wiped by a background store refresh.
  React.useEffect(() => {
    if (!activeMember || seeded) return;
    setName(activeMember.name ?? '');
    setEmail(activeMember.email ?? user?.email ?? '');
    setPhone(activeMember.phone ?? '');
    setDateOfBirth(activeMember.dateOfBirth ?? '');
    setRole(activeMember.role ?? 'parent');
    setAvatarColor(activeMember.avatarColor ?? '#6366f1');
    const key = activeMember.avatar ?? null;
    setAvatarKey(key);
    if (key && isR2Key(key)) {
      getSignedDownloadUrl(key).then(setAvatarUrl).catch(() => {});
    }
    setSeeded(true);
  }, [activeMember, seeded]);

  const pickPhoto = useCallback(() => {
    Alert.alert(t('profile.pickPhotoTitle'), '', [
      {
        text: t('profile.pickPhotoCamera'),
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            Alert.alert(t('profile.errorTitle'), 'Camera permission is required.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'] as ImagePicker.MediaType[],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          });
          if (!result.canceled) uploadPhoto(result.assets[0].uri);
        },
      },
      {
        text: t('profile.pickPhotoLibrary'),
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'] as ImagePicker.MediaType[],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          });
          if (!result.canceled) uploadPhoto(result.assets[0].uri);
        },
      },
      { text: t('profile.pickPhotoCancel'), style: 'cancel' },
    ]);
  }, []);

  async function uploadPhoto(localUri: string) {
    setUploading(true);
    try {
      const key = await uploadImageToR2(localUri, 'avatar');
      const signedUrl = await getSignedDownloadUrl(key);
      setAvatarKey(key);
      setAvatarUrl(signedUrl);
    } catch {
      Alert.alert(t('profile.errorTitle'), t('profile.uploadError'));
    } finally {
      setUploading(false);
    }
  }

  function removePhoto() {
    setAvatarKey(null);
    setAvatarUrl(null);
  }

  async function save() {
    if (!name.trim()) {
      Alert.alert(t('profile.nameRequired'), t('profile.nameRequiredMsg'));
      return;
    }
    if (!activeMember) return;

    setSaving(true);
    try {
      const updates: Record<string, unknown> = {
        avatarColor,
        avatar: avatarKey ?? null,
        phone: phone.trim() || null,
      };

      // Identity fields — only admins may change these
      if (canEditIdentity) {
        updates.name = name.trim();
        updates.dateOfBirth = dateOfBirth.trim() || null;
      }
      if (!isAccountHolder) {
        updates.email = email.trim() || null;
      }
      if (!isChild) {
        updates.role = role;
      }

      await updateMember(activeMember.id, updates as any);

      // Keep auth user name in sync if this is the account holder
      if (isAccountHolder) {
        updateProfile({ firstName: name.trim().split(' ')[0] });
      }

      Alert.alert(t('profile.savedTitle'), t('profile.savedMsg'), [
        { text: t('profile.savedOk'), onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert(t('profile.errorTitle'), t('profile.errorMsg'));
    } finally {
      setSaving(false);
    }
  }

  const initials = name.trim()
    ? name.trim().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f4f8' }}>
      {/* Header */}
      <LinearGradient colors={['#0F2952', '#1a3a6e']} style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('profile.headerTitle')}</Text>
        <Pressable accessibilityRole="button" onPress={save} disabled={saving} style={styles.saveBtn}>
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.saveBtnText}>{t('profile.save')}</Text>}
        </Pressable>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <Pressable accessibilityRole="button" onPress={pickPhoto} style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatarImg, { backgroundColor: avatarColor, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            {uploading && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
            <View style={styles.cameraChip}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </Pressable>

          {avatarUrl && (
            <Pressable accessibilityRole="button" onPress={removePhoto} style={styles.removePhotoBtn}>
              <Text style={styles.removePhotoText}>{t('profile.removePhoto')}</Text>
            </Pressable>
          )}
        </View>

        {/* Avatar color picker (shown when no photo) */}
        {!avatarUrl && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>{t('profile.sectionAvatar')}</Text>
            <View style={styles.colorRow}>
              {AVATAR_COLORS.map((c) => (
                <Pressable accessibilityRole="button"
                  key={c}
                  onPress={() => setAvatarColor(c)}
                  style={[styles.colorDot, { backgroundColor: c }, avatarColor === c && styles.colorDotSelected]}
                />
              ))}
            </View>
          </View>
        )}

        {/* Personal info */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{t('profile.sectionPersonal')}</Text>

          <Text style={styles.fieldLabel}>{t('profile.fieldName')}</Text>
          {canEditIdentity ? (
            <TextInput accessibilityLabel={t('profile.namePlaceholder')}
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t('profile.namePlaceholder')}
              placeholderTextColor="#94a3b8"
              autoCapitalize="words"
            />
          ) : (
            <View style={styles.readonlyRow}>
              <Text style={styles.readonlyValue}>{name}</Text>
              <View style={styles.lockedChip}>
                <Ionicons name="lock-closed" size={11} color="#64748b" />
                <Text style={styles.lockedChipText}>{t('profile.lockedAdmin')}</Text>
              </View>
            </View>
          )}

          <Text style={styles.fieldLabel}>{t('profile.fieldPhone')}</Text>
          <TextInput accessibilityLabel={t('profile.phonePlaceholder')}
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder={t('profile.phonePlaceholder')}
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad"
          />

          <Text style={styles.fieldLabel}>{t('profile.fieldDob')}</Text>
          {canEditIdentity ? (
            <TextInput accessibilityLabel={t('profile.dobPlaceholder')}
              style={styles.input}
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
              placeholder={t('profile.dobPlaceholder')}
              placeholderTextColor="#94a3b8"
            />
          ) : (
            <View style={styles.readonlyRow}>
              <Text style={styles.readonlyValue}>{dateOfBirth || '—'}</Text>
              <View style={styles.lockedChip}>
                <Ionicons name="lock-closed" size={11} color="#64748b" />
                <Text style={styles.lockedChipText}>{t('profile.lockedAdmin')}</Text>
              </View>
            </View>
          )}

          <Text style={styles.fieldLabel}>{t('profile.fieldEmail')}</Text>
          {isAccountHolder ? (
            <View style={styles.readonlyRow}>
              <Text style={styles.readonlyValue}>{user?.email ?? ''}</Text>
              <View style={styles.lockedChip}>
                <Ionicons name="lock-closed" size={11} color="#64748b" />
                <Text style={styles.lockedChipText}>{t('profile.lockedAccountEmail')}</Text>
              </View>
            </View>
          ) : (
            <TextInput accessibilityLabel={t('profile.emailPlaceholder')}
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={t('profile.emailPlaceholder')}
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          )}
        </View>

        {/* Role — hidden for children */}
        {!isChild && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>{t('profile.sectionRole')}</Text>
            <View style={styles.roleGrid}>
              {(Object.keys(ROLE_ICONS) as MemberRole[]).filter((v) => v !== 'child').map((v) => (
                <Pressable accessibilityRole="button"
                  key={v}
                  onPress={() => setRole(v)}
                  style={[styles.roleChip, role === v && styles.roleChipSelected]}
                >
                  <Ionicons
                    name={ROLE_ICONS[v] as any}
                    size={16}
                    color={role === v ? '#fff' : '#475569'}
                  />
                  <Text style={[styles.roleChipText, role === v && styles.roleChipTextSelected]}>
                    {t(`profile.role${v.charAt(0).toUpperCase()}${v.slice(1)}` as any)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  back: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff' },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#3b82f6', borderRadius: 20 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatarWrap: { position: 'relative' },
  avatarImg: { width: 100, height: 100, borderRadius: 50 },
  avatarInitials: { fontSize: 36, fontWeight: '800', color: '#fff' },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraChip: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 5,
    borderWidth: 2,
    borderColor: '#f0f4f8',
  },
  removePhotoBtn: { marginTop: 10 },
  removePhotoText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },

  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }, android: { elevation: 2 } }),
  },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 },

  fieldLabel: { fontSize: 13, color: '#64748b', fontWeight: '600', marginBottom: 4, marginTop: 12 },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1e293b',
  },
  readonlyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  readonlyValue: { fontSize: 15, color: '#475569', flex: 1 },
  lockedChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  lockedChipText: { fontSize: 11, color: '#64748b', fontWeight: '600' },

  colorRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: '#1e293b' },

  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  roleChipSelected: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  roleChipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  roleChipTextSelected: { color: '#fff' },
});
