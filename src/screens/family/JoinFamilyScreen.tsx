import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNotificationsStore } from '../../store/useNotificationsStore';
import { Button } from '../../components/common/Button';
import { useJoinRequestsStore } from '../../store/useJoinRequestsStore';
import { colors } from '../../theme/colors';

type JoinRole = 'parent' | 'child' | 'guardian' | 'grandparent' | 'caregiver';

const ROLES: JoinRole[] = ['parent', 'child', 'guardian', 'grandparent', 'caregiver'];

export function JoinFamilyScreen({ navigation }: any) {
  const { t } = useTranslation('family');
  const ROLE_LABELS: Record<JoinRole, string> = {
    parent: t('family.screens.joinFamily.roleParent'),
    child: t('family.screens.joinFamily.roleChild'),
    guardian: t('family.screens.joinFamily.roleGuardian'),
    grandparent: t('family.screens.joinFamily.roleGrandparent'),
    caregiver: t('family.screens.joinFamily.roleCaregiver'),
  };
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteData, setInviteData] = useState<any>(null);
  const [requesterName, setRequesterName] = useState('');
  const [requesterRole, setRequesterRole] = useState<JoinRole>('child');

  const addRequest = useJoinRequestsStore((s) => s.addRequest);
  const addNotification = useNotificationsStore((s) => s.addNotification);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;

    setScanned(true);

    try {
      const parsed = JSON.parse(data);

      if (parsed?.type !== 'family-invite' || !parsed?.familyId) {
        Alert.alert(
          t('family.screens.joinFamily.invalidQrTitle'),
          t('family.screens.joinFamily.invalidQrFamilyMsg')
        );
        setScanned(false);
        return;
      }

      setInviteData(parsed);
      setRequesterName('');
      setRequesterRole('child');
      setShowJoinModal(true);
    } catch {
      Alert.alert(
        t('family.screens.joinFamily.invalidQrTitle'),
        t('family.screens.joinFamily.invalidQrUnreadableMsg')
      );
      setScanned(false);
    }
  };

  const submitJoinRequest = () => {
    if (!inviteData?.familyId) return;

    if (!requesterName.trim()) {
      Alert.alert(
        t('family.screens.joinFamily.nameRequiredTitle'),
        t('family.screens.joinFamily.nameRequiredMsg')
      );
      return;
    }

    addRequest({
      familyId: inviteData.familyId,
      familyName: inviteData.familyName ?? t('family.screens.joinFamily.defaultFamilyFallback'),
      requesterName: requesterName.trim(),
      requesterRole,
    });

    addNotification({
  type: 'family',
  title: t('family.screens.joinFamily.notificationTitle'),
  body: t('family.screens.joinFamily.notificationBody', {
    name: requesterName.trim(),
    familyName: inviteData.familyName ?? t('family.screens.joinFamily.defaultFamilyYourFamily'),
  }),
  isRead: false,
  action: {
    label: t('family.screens.joinFamily.notificationActionLabel'),
    route: 'JoinRequests',
  },
});

    setShowJoinModal(false);

    navigation.navigate('FamilyProfiles', {
      joinedFamilyId: inviteData.familyId,
      joinedFamilyName: inviteData.familyName ?? t('family.screens.joinFamily.defaultFamilyFallback'),
    });
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>{t('family.screens.joinFamily.permissionTitle')}</Text>
        <Text style={styles.permissionSubtitle}>
          {t('family.screens.joinFamily.permissionSubtitle')}
        </Text>
        <Button title={t('family.screens.joinFamily.allowCamera')} onPress={requestPermission} fullWidth />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      <View style={styles.overlay}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.title}>{t('family.screens.joinFamily.title')}</Text>
        <Text style={styles.subtitle}>{t('family.screens.joinFamily.subtitle')}</Text>

        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />
        </View>

        {scanned && (
          <Button
            title={t('family.screens.joinFamily.scanAgain')}
            onPress={() => {
              setScanned(false);
              setShowJoinModal(false);
              setInviteData(null);
            }}
            fullWidth
            style={{ marginTop: 24 }}
          />
        )}
      </View>

      <Modal
        visible={showJoinModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowJoinModal(false);
          setScanned(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Ionicons name="people-circle-outline" size={42} color={colors.primary} />
            <Text style={styles.modalTitle}>{t('family.screens.joinFamily.modalTitle')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('family.screens.joinFamily.modalSubtitle', {
                familyName: inviteData?.familyName ?? t('family.screens.joinFamily.defaultFamilyName'),
              })}
            </Text>

            <Text style={styles.label}>{t('family.screens.joinFamily.yourName')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('family.screens.joinFamily.namePlaceholder')}
              value={requesterName}
              onChangeText={setRequesterName}
              placeholderTextColor={colors.textMuted}
              autoFocus
            />

            <Text style={styles.label}>{t('family.screens.joinFamily.role')}</Text>
            <View style={styles.roleGrid}>
              {ROLES.map((role) => (
                <Pressable
                  key={role}
                  onPress={() => setRequesterRole(role)}
                  style={[styles.roleChip, requesterRole === role && styles.roleChipActive]}
                >
                  <Text
                    style={[
                      styles.roleChipText,
                      requesterRole === role && styles.roleChipTextActive,
                    ]}
                  >
                    {ROLE_LABELS[role]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Button
              title={t('family.screens.joinFamily.submitJoinRequest')}
              onPress={submitJoinRequest}
              fullWidth
              disabled={!requesterName.trim()}
              style={{ marginTop: 10 }}
            />

            <Button
              title={t('family.screens.joinFamily.cancel')}
              variant="ghost"
              onPress={() => {
                setShowJoinModal(false);
                setScanned(false);
              }}
              fullWidth
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  backBtn: { position: 'absolute', top: 52, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },

  permissionContainer: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    justifyContent: 'center',
  },

  permissionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },

  permissionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },

  overlay: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },

  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 30,
  },

  scanFrame: {
    width: 260,
    height: 260,
    borderRadius: 24,
    position: 'relative',
  },

  corner: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderColor: '#fff',
  },

  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 24,
  },

  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 24,
  },

  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 24,
  },

  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 24,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },

  modalCard: {
    backgroundColor: colors.background,
    borderRadius: 22,
    padding: 22,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginTop: 10,
  },

  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 6,
    marginBottom: 18,
    lineHeight: 20,
  },

  label: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: 16,
  },

  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  roleChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },

  roleChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  roleChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },

  roleChipTextActive: {
    color: '#fff',
  },
});