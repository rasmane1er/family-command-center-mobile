import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Switch, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, differenceInDays } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { useOperationsStore } from '../../store/useOperationsStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import type { DocumentCategory, Document } from '../../types';

const CATEGORIES: { key: DocumentCategory | 'all'; label: string; icon: string; color: string }[] = [
  { key: 'all', label: 'All', icon: 'folder', color: colors.primary },
  { key: 'identity', label: 'Identity', icon: 'person', color: '#27AE60' },
  { key: 'medical', label: 'Medical', icon: 'medkit', color: '#E74C3C' },
  { key: 'financial', label: 'Financial', icon: 'wallet', color: '#F5A623' },
  { key: 'insurance', label: 'Insurance', icon: 'shield', color: '#2980B9' },
  { key: 'legal', label: 'Legal', icon: 'briefcase', color: '#8E44AD' },
  { key: 'education', label: 'Education', icon: 'school', color: '#16A085' },
  { key: 'vehicle', label: 'Vehicle', icon: 'car', color: '#E74C3C' },
];

const DOC_CATEGORIES: DocumentCategory[] = ['identity', 'medical', 'financial', 'insurance', 'legal', 'education', 'vehicle', 'home', 'other'];
const generateId = () => Math.random().toString(36).substring(2, 11);

export function DocumentsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const { documents, addDocument, deleteDocument } = useOperationsStore();
  const members = useFamilyStore((s) => s.members);

  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<DocumentCategory>('identity');
  const [newIssuer, setNewIssuer] = useState('');
  const [newMemberId, setNewMemberId] = useState<string | null>(null);
  const [newSensitive, setNewSensitive] = useState(false);
  const [newShared, setNewShared] = useState(false);

  const filtered = documents.filter((d) => activeCategory === 'all' || d.category === activeCategory);

  const getExpiryBadge = (expiryDate?: string) => {
    if (!expiryDate) return null;
    const days = differenceInDays(new Date(expiryDate), new Date());
    if (days < 0) return <Badge label="Expired!" variant="danger" size="sm" />;
    if (days <= 30) return <Badge label={`${days}d`} variant="danger" size="sm" />;
    if (days <= 90) return <Badge label={`${days}d`} variant="warning" size="sm" />;
    return null;
  };

  const getCategoryInfo = (cat: string) => CATEGORIES.find((c) => c.key === cat) || CATEGORIES[0];

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    const doc: Document = {
      id: generateId(),
      familyId: 'demo-family',
      title: newTitle.trim(),
      category: newCategory,
      issuer: newIssuer.trim() || undefined,
      memberId: newMemberId || undefined,
      isSensitive: newSensitive,
      isShared: newShared,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addDocument(doc);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNewTitle(''); setNewCategory('identity'); setNewIssuer('');
    setNewMemberId(null); setNewSensitive(false); setNewShared(false);
    setShowModal(false);
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete Document', `Remove "${title}" from the vault?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteDocument(id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#2980B9', '#1A5276']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Document Vault</Text>
          <Pressable onPress={() => setShowModal(true)} style={styles.addBtn}>
            <Ionicons name="add" size={26} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.vaultInfo}>
          <Ionicons name="lock-closed" size={20} color="rgba(255,255,255,0.7)" />
          <Text style={styles.vaultText}>{documents.length} documents • End-to-end encrypted</Text>
        </View>
      </LinearGradient>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catContent}>
        {CATEGORIES.map((cat) => (
          <Pressable key={cat.key} onPress={() => setActiveCategory(cat.key)} style={[styles.catChip, activeCategory === cat.key && { borderColor: cat.color, backgroundColor: cat.color + '15' }]}>
            <Ionicons name={cat.icon as any} size={14} color={activeCategory === cat.key ? cat.color : colors.textSecondary} />
            <Text style={[styles.catText, activeCategory === cat.key && { color: cat.color }]}>{cat.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {filtered.map((doc) => {
          const catInfo = getCategoryInfo(doc.category);
          return (
            <Card key={doc.id} style={styles.docCard} variant="elevated">
              <View style={styles.docRow}>
                <View style={[styles.docIcon, { backgroundColor: catInfo.color + '15' }]}>
                  <Ionicons name={catInfo.icon as any} size={22} color={catInfo.color} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <View style={styles.docHeader}>
                    <Text style={styles.docTitle}>{doc.title}</Text>
                    {doc.isSensitive && <Ionicons name="lock-closed" size={14} color={colors.textMuted} />}
                  </View>
                  <View style={styles.docMeta}>
                    <Badge label={doc.category} variant="primary" size="sm" />
                    {doc.isShared && <Badge label="Shared" variant="info" size="sm" />}
                    {getExpiryBadge(doc.expiryDate)}
                  </View>
                  {doc.expiryDate && (
                    <Text style={styles.docExpiry}>Expires {format(new Date(doc.expiryDate), 'MMM d, yyyy')}</Text>
                  )}
                  {doc.issuer && <Text style={styles.docIssuer}>Issued by {doc.issuer}</Text>}
                </View>
                <View style={styles.docActions}>
                  <Pressable style={styles.docActionBtn}>
                    <Ionicons name="share-outline" size={18} color={colors.primary} />
                  </Pressable>
                  <Pressable onPress={() => handleDelete(doc.id, doc.title)} style={styles.docActionBtn}>
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No documents</Text>
            <Text style={styles.emptyDesc}>Upload important family documents to keep them secure and accessible</Text>
          </View>
        )}

        <View style={styles.securityNote}>
          <Ionicons name="shield-checkmark" size={18} color={colors.info} />
          <Text style={styles.securityText}>
            All documents are encrypted and stored securely. Only you and authorized family members can access them.
          </Text>
        </View>
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Document</Text>

          <Text style={styles.modalLabel}>Title *</Text>
          <TextInput style={styles.modalInput} placeholder="e.g. John's Passport" value={newTitle} onChangeText={setNewTitle} placeholderTextColor={colors.textMuted} autoFocus />

          <Text style={styles.modalLabel}>Issuer</Text>
          <TextInput style={styles.modalInput} placeholder="e.g. US Department of State" value={newIssuer} onChangeText={setNewIssuer} placeholderTextColor={colors.textMuted} />

          <Text style={styles.modalLabel}>Category</Text>
          <View style={styles.catGrid}>
            {DOC_CATEGORIES.map((cat) => {
              const info = getCategoryInfo(cat);
              return (
                <Pressable key={cat} onPress={() => setNewCategory(cat)} style={[styles.catGridItem, newCategory === cat && { backgroundColor: (info?.color || colors.primary) + '20', borderColor: info?.color || colors.primary }]}>
                  <Ionicons name={(info?.icon || 'folder') as any} size={16} color={newCategory === cat ? (info?.color || colors.primary) : colors.textSecondary} />
                  <Text style={[styles.catGridText, newCategory === cat && { color: info?.color || colors.primary }]}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.modalLabel}>Assign To Member</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <Pressable onPress={() => setNewMemberId(null)} style={[styles.memberChip, !newMemberId && styles.memberChipActive]}>
              <Text style={styles.memberChipName}>Family</Text>
            </Pressable>
            {members.map((m) => (
              <Pressable key={m.id} onPress={() => setNewMemberId(m.id)} style={[styles.memberChip, newMemberId === m.id && styles.memberChipActive]}>
                <Avatar name={m.name} color={m.avatarColor} size={28} />
                <Text style={styles.memberChipName}>{m.name.split(' ')[0]}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Sensitive</Text>
              <Text style={styles.toggleDesc}>Requires extra authentication to view</Text>
            </View>
            <Switch value={newSensitive} onValueChange={setNewSensitive} trackColor={{ true: colors.danger }} />
          </View>

          <View style={[styles.toggleRow, { marginBottom: 24 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Shared with Family</Text>
              <Text style={styles.toggleDesc}>All family members can view this document</Text>
            </View>
            <Switch value={newShared} onValueChange={setNewShared} trackColor={{ true: colors.primary }} />
          </View>

          <Button title="Add Document" onPress={handleAdd} fullWidth size="lg" disabled={!newTitle.trim()} />
          <Button title="Cancel" onPress={() => setShowModal(false)} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#fff' },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  vaultInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vaultText: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  catScroll: { maxHeight: 50, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  catContent: { paddingHorizontal: 16, alignItems: 'center', gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: 'transparent' },
  catText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  content: { padding: 16 },
  docCard: { marginBottom: 10, borderRadius: 16 },
  docRow: { flexDirection: 'row', alignItems: 'flex-start' },
  docIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  docHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  docTitle: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  docMeta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 5 },
  docExpiry: { fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
  docIssuer: { fontSize: 12, color: colors.textMuted },
  docActions: { gap: 4 },
  docActionBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 16 },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
  securityNote: { flexDirection: 'row', gap: 10, backgroundColor: colors.infoLight, borderRadius: 12, padding: 14, marginTop: 8 },
  securityText: { flex: 1, fontSize: 13, color: colors.info, lineHeight: 20 },
  modal: { flex: 1, padding: 24, backgroundColor: colors.background },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 20 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1.5, borderColor: colors.border, marginBottom: 16, ...shadows.sm },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  catGridItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  catGridText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  memberChip: { alignItems: 'center', marginRight: 12, padding: 10, borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent', gap: 4 },
  memberChipActive: { borderColor: '#2980B9', backgroundColor: '#EBF5FB' },
  memberChipName: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1.5, borderColor: colors.border },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 2 },
  toggleDesc: { fontSize: 12, color: colors.textSecondary },
});
