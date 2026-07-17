import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { PremiumHeader } from '../../../components/common/PremiumHeader';
import { Card } from '../../../components/common/Card';
import { Avatar } from '../../../components/common/Avatar';
import { Button } from '../../../components/common/Button';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/spacing';
import { useMilitaryStore } from '../../../store/useMilitaryStore';
import { useFamilyStore } from '../../../store/useFamilyStore';
import type { ChainOfCommandContact } from '../../../types';

const MILITARY_GREEN = '#4A7C59';
import { generateId } from '../../../utils/generateId';

const BRANCHES = ['Army', 'Navy', 'Air Force', 'Marine Corps', 'Space Force', 'Coast Guard', 'National Guard'];

export function FamilyReadinessScreen({ navigation }: any) {
  const { t } = useTranslation('family');
  const readiness = useMilitaryStore((s) => s.readiness);
  const updateReadiness = useMilitaryStore((s) => s.updateReadiness);
  const addContact = useMilitaryStore((s) => s.addContact);
  const updateContact = useMilitaryStore((s) => s.updateContact);
  const removeContact = useMilitaryStore((s) => s.removeContact);
  const members = useFamilyStore((s) => s.members);

  const [serviceMemberId, setServiceMemberId] = useState(readiness?.serviceMemberId ?? '');
  const [branch, setBranch] = useState(readiness?.branch ?? '');
  const [rank, setRank] = useState(readiness?.rank ?? '');
  const [unit, setUnit] = useState(readiness?.unit ?? '');
  const [dutyStation, setDutyStation] = useState(readiness?.dutyStation ?? '');
  const [deersId, setDeersId] = useState(readiness?.deersId ?? '');
  const [tricareRegion, setTricareRegion] = useState(readiness?.tricareRegion ?? '');
  const [dirty, setDirty] = useState(false);

  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactName, setContactName] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Re-sync local form state if the underlying record changes from another
  // source (e.g. store hydration finishing after mount).
  useEffect(() => {
    if (!dirty && readiness) {
      setServiceMemberId(readiness.serviceMemberId ?? '');
      setBranch(readiness.branch ?? '');
      setRank(readiness.rank ?? '');
      setUnit(readiness.unit ?? '');
      setDutyStation(readiness.dutyStation ?? '');
      setDeersId(readiness.deersId ?? '');
      setTricareRegion(readiness.tricareRegion ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readiness]);

  const handleSave = () => {
    updateReadiness({
      serviceMemberId: serviceMemberId || undefined,
      branch: branch || undefined,
      rank: rank.trim() || undefined,
      unit: unit.trim() || undefined,
      dutyStation: dutyStation.trim() || undefined,
      deersId: deersId.trim() || undefined,
      tricareRegion: tricareRegion.trim() || undefined,
    });
    setDirty(false);
    Alert.alert(t('family.screens.familyReadiness.savedTitle'), t('family.screens.familyReadiness.savedMsg'));
  };

  const openAddContact = () => {
    setEditingContactId(null);
    setContactName('');
    setContactRole('');
    setContactPhone('');
    setContactEmail('');
    setShowContactModal(true);
  };

  const openEditContact = (c: ChainOfCommandContact) => {
    setEditingContactId(c.id);
    setContactName(c.name);
    setContactRole(c.role);
    setContactPhone(c.phone ?? '');
    setContactEmail(c.email ?? '');
    setShowContactModal(true);
  };

  const handleSaveContact = () => {
    if (!contactName.trim() || !contactRole.trim()) {
      Alert.alert(t('family.screens.familyReadiness.missingInfoTitle'), t('family.screens.familyReadiness.missingInfoMsg'));
      return;
    }
    if (editingContactId) {
      updateContact(editingContactId, {
        name: contactName.trim(),
        role: contactRole.trim(),
        phone: contactPhone.trim() || undefined,
        email: contactEmail.trim() || undefined,
      });
    } else {
      addContact({
        id: generateId(),
        name: contactName.trim(),
        role: contactRole.trim(),
        phone: contactPhone.trim() || undefined,
        email: contactEmail.trim() || undefined,
      });
    }
    setShowContactModal(false);
  };

  const handleDeleteContact = (c: ChainOfCommandContact) => {
    Alert.alert(
      t('family.screens.familyReadiness.removeContactTitle'),
      t('family.screens.familyReadiness.removeContactMsg', { name: c.name }),
      [
        { text: t('family.screens.familyReadiness.cancelButton'), style: 'cancel' },
        { text: t('family.screens.familyReadiness.removeButton'), style: 'destructive', onPress: () => removeContact(c.id) },
      ]
    );
  };

  const handleCall = (c: ChainOfCommandContact) => {
    if (!c.phone) return;
    Alert.alert(
      t('family.screens.familyReadiness.callTitle'),
      t('family.screens.familyReadiness.callMsg', { name: c.name, phone: c.phone }),
      [
        { text: t('family.screens.familyReadiness.cancelButton'), style: 'cancel' },
        { text: t('family.screens.familyReadiness.callButton'), onPress: () => Linking.openURL(`tel:${c.phone!.replace(/[^0-9+]/g, '')}`) },
      ]
    );
  };

  const handleEmail = (c: ChainOfCommandContact) => {
    if (!c.email) return;
    Linking.openURL(`mailto:${c.email}`);
  };

  const serviceMember = members.find((m) => m.id === serviceMemberId);
  const contacts = readiness?.contacts ?? [];

  return (
    <View style={styles.container}>
      <PremiumHeader
        title={t('family.screens.familyReadiness.title')}
        onBack={() => navigation.goBack()}
        colors={['#0F2952', MILITARY_GREEN]}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {readiness?.updatedAt && (
          <Text style={styles.updatedAt}>{t('family.screens.familyReadiness.lastUpdated', { date: format(new Date(readiness.updatedAt), 'MMM d, yyyy') })}</Text>
        )}

        <Text style={styles.sectionTitle}>{t('family.screens.familyReadiness.serviceMemberSection')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {members.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => { setServiceMemberId(m.id); setDirty(true); }}
              style={[styles.memberChip, serviceMemberId === m.id && styles.memberChipActive]}
            >
              <Avatar name={m.name} color={m.avatarColor} size={30} />
              <Text style={styles.memberChipText}>{m.name.split(' ')[0]}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>{t('family.screens.familyReadiness.branchSection')}</Text>
        <View style={styles.branchGrid}>
          {BRANCHES.map((b) => (
            <Pressable key={b} onPress={() => { setBranch(b); setDirty(true); }} style={[styles.branchChip, branch === b && styles.branchChipActive]}>
              <Text style={[styles.branchChipText, branch === b && styles.branchChipTextActive]}>{b}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>{t('family.screens.familyReadiness.rankLabel')}</Text>
        <TextInput style={styles.input} placeholder={t('family.screens.familyReadiness.rankPlaceholder')} value={rank} onChangeText={(v) => { setRank(v); setDirty(true); }} placeholderTextColor={colors.textMuted} />

        <Text style={styles.fieldLabel}>{t('family.screens.familyReadiness.unitLabel')}</Text>
        <TextInput style={styles.input} placeholder={t('family.screens.familyReadiness.unitPlaceholder')} value={unit} onChangeText={(v) => { setUnit(v); setDirty(true); }} placeholderTextColor={colors.textMuted} />

        <Text style={styles.fieldLabel}>{t('family.screens.familyReadiness.dutyStationLabel')}</Text>
        <TextInput style={styles.input} placeholder={t('family.screens.familyReadiness.dutyStationPlaceholder')} value={dutyStation} onChangeText={(v) => { setDutyStation(v); setDirty(true); }} placeholderTextColor={colors.textMuted} />

        <Text style={styles.fieldLabel}>{t('family.screens.familyReadiness.deersIdLabel')}</Text>
        <TextInput style={styles.input} placeholder={t('family.screens.familyReadiness.deersIdPlaceholder')} value={deersId} onChangeText={(v) => { setDeersId(v); setDirty(true); }} placeholderTextColor={colors.textMuted} />

        <Text style={styles.fieldLabel}>{t('family.screens.familyReadiness.tricareRegionLabel')}</Text>
        <TextInput style={styles.input} placeholder={t('family.screens.familyReadiness.tricareRegionPlaceholder')} value={tricareRegion} onChangeText={(v) => { setTricareRegion(v); setDirty(true); }} placeholderTextColor={colors.textMuted} />

        <Button title={t('family.screens.familyReadiness.saveButton')} onPress={handleSave} fullWidth size="lg" disabled={!dirty} style={{ marginBottom: 24 }} />

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{t('family.screens.familyReadiness.contactsSection')}</Text>
          <Pressable onPress={openAddContact} style={styles.addContactBtn}>
            <Ionicons name="add" size={16} color={MILITARY_GREEN} />
            <Text style={styles.addContactBtnText}>{t('family.screens.familyReadiness.addButton')}</Text>
          </Pressable>
        </View>

        {contacts.length === 0 && (
          <Text style={styles.emptyContacts}>
            {t('family.screens.familyReadiness.emptyContacts')}
          </Text>
        )}

        {contacts.map((c) => (
          <Card key={c.id} style={styles.contactCard} variant="elevated">
            <View style={{ flex: 1 }}>
              <Text style={styles.contactName}>{c.name}</Text>
              <Text style={styles.contactRole}>{c.role}</Text>
              {c.phone && <Text style={styles.contactDetail}>{c.phone}</Text>}
              {c.email && <Text style={styles.contactDetail}>{c.email}</Text>}
            </View>
            <View style={styles.contactActions}>
              {c.phone && (
                <Pressable onPress={() => handleCall(c)} style={styles.contactActionBtn}>
                  <Ionicons name="call" size={16} color={MILITARY_GREEN} />
                </Pressable>
              )}
              {c.email && (
                <Pressable onPress={() => handleEmail(c)} style={styles.contactActionBtn}>
                  <Ionicons name="mail" size={16} color={MILITARY_GREEN} />
                </Pressable>
              )}
              <Pressable onPress={() => openEditContact(c)} style={styles.contactActionBtn}>
                <Ionicons name="create-outline" size={16} color={colors.primary} />
              </Pressable>
              <Pressable onPress={() => handleDeleteContact(c)} style={styles.contactActionBtn}>
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
              </Pressable>
            </View>
          </Card>
        ))}

        {serviceMember && (
          <Text style={styles.footerNote}>
            {t('family.screens.familyReadiness.footerNote', { name: serviceMember.name })}
          </Text>
        )}
      </ScrollView>

      <Modal visible={showContactModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowContactModal(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{editingContactId ? t('family.screens.familyReadiness.editContactTitle') : t('family.screens.familyReadiness.addContactTitle')}</Text>

          <Text style={styles.fieldLabel}>{t('family.screens.familyReadiness.nameLabel')}</Text>
          <TextInput style={styles.input} placeholder={t('family.screens.familyReadiness.namePlaceholder')} value={contactName} onChangeText={setContactName} placeholderTextColor={colors.textMuted} />

          <Text style={styles.fieldLabel}>{t('family.screens.familyReadiness.roleLabel')}</Text>
          <TextInput style={styles.input} placeholder={t('family.screens.familyReadiness.rolePlaceholder')} value={contactRole} onChangeText={setContactRole} placeholderTextColor={colors.textMuted} />

          <Text style={styles.fieldLabel}>{t('family.screens.familyReadiness.phoneLabel')}</Text>
          <TextInput style={styles.input} placeholder={t('family.screens.familyReadiness.phonePlaceholder')} value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" placeholderTextColor={colors.textMuted} />

          <Text style={styles.fieldLabel}>{t('family.screens.familyReadiness.emailLabel')}</Text>
          <TextInput style={styles.input} placeholder={t('family.screens.familyReadiness.emailPlaceholder')} value={contactEmail} onChangeText={setContactEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={colors.textMuted} />

          <Button title={editingContactId ? t('family.screens.familyReadiness.saveChangesButton') : t('family.screens.familyReadiness.addContactTitle')} onPress={handleSaveContact} fullWidth size="lg" />
          <Button title={t('family.screens.familyReadiness.cancelButton')} onPress={() => setShowContactModal(false)} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 48 },
  updatedAt: { fontSize: 11, color: colors.textMuted, marginBottom: 16, textAlign: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 10 },
  memberChip: { alignItems: 'center', marginRight: 12, padding: 10, borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent', gap: 4 },
  memberChipActive: { borderColor: MILITARY_GREEN, backgroundColor: '#E7F0EA' },
  memberChipText: { fontSize: 11, color: colors.textSecondary },
  branchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  branchChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  branchChipActive: { backgroundColor: MILITARY_GREEN, borderColor: MILITARY_GREEN },
  branchChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  branchChipTextActive: { color: '#fff' },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 15, color: colors.text, borderWidth: 1.5, borderColor: colors.border, marginBottom: 16, ...shadows.sm },
  addContactBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E7F0EA', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  addContactBtnText: { fontSize: 12, fontWeight: '700', color: MILITARY_GREEN },
  emptyContacts: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 16 },
  contactCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, marginBottom: 10 },
  contactName: { fontSize: 14, fontWeight: '700', color: colors.text },
  contactRole: { fontSize: 12, color: MILITARY_GREEN, fontWeight: '600', marginTop: 2 },
  contactDetail: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  contactActions: { flexDirection: 'row', gap: 6 },
  contactActionBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  footerNote: { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 16 },
  modal: { flex: 1, padding: 24, backgroundColor: colors.background },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 20 },
});
