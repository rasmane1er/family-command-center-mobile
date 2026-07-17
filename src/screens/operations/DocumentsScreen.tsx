import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal,
  TextInput, Switch, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, differenceInDays } from 'date-fns';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../../theme/ThemeContext';
import { shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useOperationsStore } from '../../store/useOperationsStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import type { DocumentCategory, Document } from '../../types';
import { useTranslation } from 'react-i18next';

// ─── constants ────────────────────────────────────────────────────────────────

const CATEGORIES_CONFIG = [
  { key: 'all'       as const, label: 'All',       icon: 'folder',           color: '#2980B9' },
  { key: 'identity'  as const, label: 'Identity',  icon: 'person',           color: '#27AE60' },
  { key: 'medical'   as const, label: 'Medical',   icon: 'medkit',           color: '#E74C3C' },
  { key: 'financial' as const, label: 'Financial', icon: 'wallet',           color: '#F5A623' },
  { key: 'insurance' as const, label: 'Insurance', icon: 'shield',           color: '#2980B9' },
  { key: 'legal'     as const, label: 'Legal',     icon: 'briefcase',        color: '#8E44AD' },
  { key: 'education' as const, label: 'Education', icon: 'school',           color: '#16A085' },
  { key: 'vehicle'   as const, label: 'Vehicle',   icon: 'car',              color: '#E74C3C' },
  { key: 'home'      as const, label: 'Home',      icon: 'home',             color: '#7F8C8D' },
  { key: 'other'     as const, label: 'Other',     icon: 'ellipsis-horizontal', color: '#95A5A6' },
];

const DOC_CATEGORIES: DocumentCategory[] = [
  'identity','medical','financial','insurance','legal','education','vehicle','home','other',
];

import { generateId } from '../../utils/generateId';

function formatBytes(bytes: number) {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(name?: string) {
  if (!name) return 'document-outline';
  const ext = name.split('.').pop()?.toLowerCase();
  if (['jpg','jpeg','png','gif','heic'].includes(ext ?? '')) return 'image-outline';
  if (ext === 'pdf') return 'document-text-outline';
  if (['doc','docx'].includes(ext ?? ''))  return 'document-outline';
  if (['xls','xlsx'].includes(ext ?? ''))  return 'grid-outline';
  if (['mp4','mov','avi'].includes(ext ?? '')) return 'videocam-outline';
  return 'attach-outline';
}

// Explicit MM/DD/YYYY parsing rather than trusting `new Date(freeTextInput)` —
// native Date parsing of ambiguous/partial strings silently produces an
// Invalid Date, which date-fns then throws RangeError on the next render.
// Returns an ISO date string (matching how expiryDate is stored everywhere
// else in this data model), or null if the input isn't a real MM/DD/YYYY date.
function parseExpiryDateInput(input: string): string | null {
  const match = input.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, mm, dd, yyyy] = match;
  const month = Number(mm), day = Number(dd), year = Number(yyyy);
  const date = new Date(year, month - 1, day);
  // Catches e.g. 02/31 — JS Date rolls invalid days into the next month
  // instead of rejecting them, so round-trip and compare the components.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date.toISOString();
}

// Defensive counterpart for every render site that formats a stored
// expiryDate — never throw on already-bad data (from before the fix above,
// or any other source), just treat it as "no date" instead of crashing.
function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !value) return false;
  return !Number.isNaN(new Date(value).getTime());
}

// ─── screen ───────────────────────────────────────────────────────────────────

export function DocumentsScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { t } = useTranslation('ops');
  const insets = useSafeAreaInsets();

  // If navigated from a vehicle with a filter
  const vehicleFilter: string | undefined = route?.params?.vehicleId;
  const vehicleLabel: string | undefined = route?.params?.vehicleLabel;

  const [activeCategory, setActiveCategory] = useState<string>(vehicleFilter ? 'vehicle' : 'all');
  const { documents, addDocument, updateDocument, deleteDocument } = useOperationsStore();
  const members = useFamilyStore((s) => s.members);
  const family  = useFamilyStore((s) => s.family);

  // ── add modal state ────────────────────────────────────────────────────────
  const [showModal,    setShowModal]    = useState(false);
  const [newTitle,     setNewTitle]     = useState('');
  const [newCategory,  setNewCategory]  = useState<DocumentCategory>(vehicleFilter ? 'vehicle' : 'identity');
  const [newIssuer,    setNewIssuer]    = useState('');
  const [newExpiry,    setNewExpiry]    = useState('');
  const [newMemberId,  setNewMemberId]  = useState<string | null>(null);
  const [newSensitive, setNewSensitive] = useState(false);
  const [newShared,    setNewShared]    = useState(false);
  const [pickedFile,   setPickedFile]   = useState<{ uri: string; name: string; size?: number; mimeType?: string } | null>(null);
  const [uploading,    setUploading]    = useState(false);

  // ── document viewer modal ──────────────────────────────────────────────────
  const [viewDoc, setViewDoc] = useState<Document | null>(null);
  const [downloading, setDownloading] = useState(false);

  const s = makeStyles(colors);

  // ── helpers ────────────────────────────────────────────────────────────────

  const filtered = documents.filter((d) => {
    const catMatch = activeCategory === 'all' || d.category === activeCategory;
    const vehicleMatch = vehicleFilter ? (d as any).vehicleId === vehicleFilter : true;
    return catMatch && vehicleMatch;
  });

  const getCatInfo = (key: string) =>
    CATEGORIES_CONFIG.find((c) => c.key === key) ?? CATEGORIES_CONFIG[0];

  const getExpiryBadge = (expiryDate?: string) => {
    if (!isValidDate(expiryDate)) return null;
    const days = differenceInDays(new Date(expiryDate), new Date());
    if (days < 0)   return <Badge label="Expired!" variant="danger" size="sm" />;
    if (days <= 30) return <Badge label={`${days}d left`} variant="danger" size="sm" />;
    if (days <= 90) return <Badge label={`${days}d left`} variant="warning" size="sm" />;
    return null;
  };

  // ── file picker ────────────────────────────────────────────────────────────

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setPickedFile({ uri: asset.uri, name: asset.name, size: asset.size ?? undefined, mimeType: asset.mimeType ?? undefined });
      if (!newTitle.trim()) setNewTitle(asset.name.replace(/\.[^.]+$/, ''));
    } catch {
      Alert.alert(t('common.error'), 'Could not pick a file. Please try again.');
    }
  };

  // ── add document ───────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!pickedFile) {
      Alert.alert('File Required', 'Please upload a file before saving — a "Document Vault" entry with nothing attached isn\'t a real document.');
      return;
    }
    if (!newTitle.trim()) {
      Alert.alert(t('common.validationTitle'), 'Please enter a document title.');
      return;
    }

    const expiryDate = newExpiry.trim() ? parseExpiryDateInput(newExpiry) : null;
    if (newExpiry.trim() && !expiryDate) {
      Alert.alert(t('common.validationTitle'), t('common.validationMsg'));
      return;
    }

    setUploading(true);

    let savedUri = pickedFile?.uri;

    // Copy file to app's document directory for persistence
    if (pickedFile?.uri) {
      try {
        const dest = `${FileSystem.documentDirectory}fcc_docs/${generateId()}_${pickedFile.name}`;
        await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}fcc_docs/`, { intermediates: true });
        await FileSystem.copyAsync({ from: pickedFile.uri, to: dest });
        savedUri = dest;
      } catch {
        // Keep original URI if copy fails
      }
    }

    const doc: Document = {
      id: generateId(),
      familyId: family?.id ?? 'family',
      title: newTitle.trim(),
      category: newCategory,
      issuer: newIssuer.trim() || undefined,
      expiryDate: expiryDate ?? undefined,
      memberId: newMemberId || undefined,
      isSensitive: newSensitive,
      isShared: newShared,
      fileUrl: savedUri,
      fileName: pickedFile?.name,
      fileSize: pickedFile?.size,
      ...(vehicleFilter ? { vehicleId: vehicleFilter } as any : {}),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addDocument(doc);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNewTitle(''); setNewCategory(vehicleFilter ? 'vehicle' : 'identity');
    setNewIssuer(''); setNewExpiry(''); setNewMemberId(null);
    setNewSensitive(false); setNewShared(false); setPickedFile(null);
    setUploading(false);
    setShowModal(false);
  };

  // ── download / share ───────────────────────────────────────────────────────

  const handleDownload = async (doc: Document) => {
    if (!doc.fileUrl) {
      Alert.alert('No File', 'This document has no attached file.');
      return;
    }
    setDownloading(true);
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Not Supported', 'Sharing is not available on this device.');
        return;
      }
      // If the file is remote (http), download it first
      let localUri = doc.fileUrl;
      if (doc.fileUrl.startsWith('http')) {
        const dest = `${FileSystem.cacheDirectory}${doc.fileName ?? 'document'}`;
        const { uri } = await FileSystem.downloadAsync(doc.fileUrl, dest);
        localUri = uri;
      }
      await Sharing.shareAsync(localUri, {
        mimeType: 'application/octet-stream',
        dialogTitle: doc.title,
        UTI: 'public.data',
      });
    } catch {
      Alert.alert('Error', 'Could not open this file.');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async (doc: Document) => {
    if (!doc.fileUrl) {
      Alert.alert('No File', 'This document has no attached file to share.');
      return;
    }
    await handleDownload(doc);
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert(t('common.deleteTitle'), `Remove "${title}" from the vault?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          deleteDocument(id);
          if (viewDoc?.id === id) setViewDoc(null);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  };

  // ── render ─────────────────────────────────────────────────────────────────

  const screenHeader = (
    <LinearGradient colors={['#2980B9', '#1A5276']} style={[s.header, { paddingTop: insets.top + 6 }]}>
      <View style={s.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={s.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{vehicleLabel ? `${vehicleLabel} Docs` : 'Document Vault'}</Text>
        </View>
        <Pressable onPress={() => setShowModal(true)} style={s.headerBtn}>
          <Ionicons name="add" size={26} color="#fff" />
        </Pressable>
      </View>
      <View style={s.headerMeta}>
        <Ionicons name="lock-closed" size={16} color="rgba(255,255,255,0.7)" />
        <Text style={s.headerMetaText}>{documents.length} document{documents.length !== 1 ? 's' : ''} • End-to-end encrypted</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catBar} contentContainerStyle={s.catBarContent}>
        {CATEGORIES_CONFIG.map((cat) => (
          <Pressable key={cat.key} onPress={() => setActiveCategory(cat.key)}
            style={[s.catChip, activeCategory === cat.key && { borderColor: cat.color, backgroundColor: cat.color + '15' }]}>
            <Ionicons name={cat.icon as any} size={13} color={activeCategory === cat.key ? cat.color : colors.textSecondary} />
            <Text style={[s.catText, activeCategory === cat.key && { color: cat.color }]}>{cat.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </LinearGradient>
  );

  const screenCompact = (
    <LinearGradient
      colors={['#2980B9', '#1A5276']}
      style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
    >
      <Pressable onPress={() => navigation.goBack()} style={s.back}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Text style={s.headerTitle}>{vehicleLabel ? `${vehicleLabel} Docs` : 'Documents'}</Text>
      <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>{documents.length} docs</Text>
    </LinearGradient>
  );

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
      <ScrollView
        contentContainerStyle={[s.list, { paddingBottom: 100, paddingTop: contentPaddingTop }]}
        onScroll={onScroll}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={scrollEventThrottle}
      >
        {filtered.map((doc) => {
          const catInfo = getCatInfo(doc.category);
          return (
            <Pressable key={doc.id} onPress={() => setViewDoc(doc)}>
              <Card style={s.docCard} variant="elevated">
                <View style={s.docRow}>
                  <View style={[s.docIconWrap, { backgroundColor: catInfo.color + '15' }]}>
                    <Ionicons name={(doc.fileName ? getFileIcon(doc.fileName) : catInfo.icon) as any} size={22} color={catInfo.color} />
                  </View>

                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <View style={s.docTitleRow}>
                      <Text style={s.docTitle} numberOfLines={1}>{doc.title}</Text>
                      {doc.isSensitive && <Ionicons name="lock-closed" size={13} color={colors.textMuted} />}
                    </View>

                    <View style={s.docBadges}>
                      <Badge label={doc.category} variant="primary" size="sm" />
                      {doc.isShared && <Badge label="Shared" variant="info" size="sm" />}
                      {doc.fileName && <Badge label="File attached" variant="success" size="sm" />}
                      {getExpiryBadge(doc.expiryDate)}
                    </View>

                    {doc.fileName && (
                      <Text style={s.docFile} numberOfLines={1}>
                        <Ionicons name={getFileIcon(doc.fileName) as any} size={11} /> {doc.fileName}
                        {doc.fileSize ? `  •  ${formatBytes(doc.fileSize)}` : ''}
                      </Text>
                    )}
                    {doc.issuer && <Text style={s.docMeta}>Issued by {doc.issuer}</Text>}
                    {isValidDate(doc.expiryDate) && <Text style={s.docMeta}>Expires {format(new Date(doc.expiryDate), 'MMM d, yyyy')}</Text>}
                  </View>

                  <View style={s.docActions}>
                    {doc.fileUrl && (
                      <Pressable onPress={() => handleDownload(doc)} style={s.docActionBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="download-outline" size={18} color={colors.primary} />
                      </Pressable>
                    )}
                    <Pressable onPress={() => handleShare(doc)} style={s.docActionBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="share-outline" size={18} color={colors.primary} />
                    </Pressable>
                    <Pressable onPress={() => handleDelete(doc.id, doc.title)} style={s.docActionBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        })}

        {filtered.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="folder-open-outline" size={64} color={colors.textMuted} />
            <Text style={s.emptyTitle}>No documents yet</Text>
            <Text style={s.emptyDesc}>Tap + to upload a file or add a document record</Text>
            <Pressable style={s.emptyBtn} onPress={() => setShowModal(true)}>
              <LinearGradient colors={['#2980B9', '#1A5276']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.emptyBtnGrad}>
                <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                <Text style={s.emptyBtnText}>Upload Document</Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}

        <View style={s.secNote}>
          <Ionicons name="shield-checkmark" size={16} color={colors.info} />
          <Text style={s.secText}>Documents are stored securely on-device. Only you and authorized family members can access them.</Text>
        </View>
      </ScrollView>
        )}
      </CollapsibleHeader>

      {/* ── Document View Modal ──────────────────────────────────────────── */}
      <Modal visible={!!viewDoc} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setViewDoc(null)}>
        {viewDoc && (
          <View style={[s.modal, { paddingTop: insets.top + 8 }]}>
            <View style={s.modalHandle} />
            <View style={s.viewHeader}>
              <View style={[s.viewIcon, { backgroundColor: getCatInfo(viewDoc.category).color + '15' }]}>
                <Ionicons name={(viewDoc.fileName ? getFileIcon(viewDoc.fileName) : getCatInfo(viewDoc.category).icon) as any}
                  size={28} color={getCatInfo(viewDoc.category).color} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={s.viewTitle}>{viewDoc.title}</Text>
                <Text style={s.viewCat}>{viewDoc.category}</Text>
              </View>
              <Pressable onPress={() => setViewDoc(null)} style={s.closeBtn}>
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
              <View style={s.viewRow}>
                <Ionicons name="shield-checkmark-outline" size={16} color={colors.textMuted} />
                <Text style={s.viewRowLabel}>Security</Text>
                <Text style={s.viewRowValue}>{viewDoc.isSensitive ? 'Sensitive' : 'Standard'}</Text>
              </View>
              {viewDoc.issuer && (
                <View style={s.viewRow}>
                  <Ionicons name="business-outline" size={16} color={colors.textMuted} />
                  <Text style={s.viewRowLabel}>Issuer</Text>
                  <Text style={s.viewRowValue}>{viewDoc.issuer}</Text>
                </View>
              )}
              {isValidDate(viewDoc.expiryDate) && (
                <View style={s.viewRow}>
                  <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
                  <Text style={s.viewRowLabel}>Expires</Text>
                  <Text style={s.viewRowValue}>{format(new Date(viewDoc.expiryDate), 'MMMM d, yyyy')}</Text>
                </View>
              )}
              <View style={s.viewRow}>
                <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                <Text style={s.viewRowLabel}>Added</Text>
                <Text style={s.viewRowValue}>{format(new Date(viewDoc.createdAt), 'MMM d, yyyy')}</Text>
              </View>

              {viewDoc.fileName && (
                <View style={s.fileCard}>
                  <Ionicons name={getFileIcon(viewDoc.fileName) as any} size={36} color={colors.primary} />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={s.fileCardName} numberOfLines={2}>{viewDoc.fileName}</Text>
                    {viewDoc.fileSize && <Text style={s.fileCardSize}>{formatBytes(viewDoc.fileSize)}</Text>}
                  </View>
                </View>
              )}

              <View style={s.viewActions}>
                {viewDoc.fileUrl && (
                  <Pressable style={[s.viewActionBtn, { flex: 1 }]} onPress={() => handleDownload(viewDoc)} disabled={downloading}>
                    <LinearGradient colors={['#2980B9', '#1A5276']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.viewActionGrad}>
                      {downloading
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <>
                            <Ionicons name="download-outline" size={18} color="#fff" />
                            <Text style={s.viewActionText}>Download</Text>
                          </>
                      }
                    </LinearGradient>
                  </Pressable>
                )}
                <Pressable style={[s.viewActionBtn, { flex: 1 }]} onPress={() => handleShare(viewDoc)}>
                  <LinearGradient colors={['#27AE60', '#1E8449']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.viewActionGrad}>
                    <Ionicons name="share-social-outline" size={18} color="#fff" />
                    <Text style={s.viewActionText}>Share</Text>
                  </LinearGradient>
                </Pressable>
              </View>

              <Pressable style={s.deleteFullBtn} onPress={() => handleDelete(viewDoc.id, viewDoc.title)}>
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                <Text style={[s.viewActionText, { color: colors.danger }]}>Delete Document</Text>
              </Pressable>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* ── Add Document Modal ────────────────────────────────────────────── */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <ScrollView style={s.modal} contentContainerStyle={{ paddingBottom: 48 }}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>Add Document</Text>

          {/* File picker section */}
          <Pressable style={[s.uploadArea, pickedFile && s.uploadAreaDone]} onPress={handlePickFile}>
            {pickedFile ? (
              <>
                <Ionicons name={getFileIcon(pickedFile.name) as any} size={36} color={colors.primary} />
                <Text style={s.uploadFileName} numberOfLines={1}>{pickedFile.name}</Text>
                {pickedFile.size && <Text style={s.uploadFileMeta}>{formatBytes(pickedFile.size)}</Text>}
                <Text style={[s.uploadHint, { color: colors.primary }]}>Tap to change file</Text>
              </>
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={40} color={colors.textMuted} />
                <Text style={s.uploadTitle}>Upload File *</Text>
                <Text style={s.uploadHint}>Tap to pick a PDF, image, or any document</Text>
              </>
            )}
          </Pressable>

          <Text style={s.modalLabel}>Title *</Text>
          <TextInput style={s.modalInput} placeholder="e.g. John's Passport"
            value={newTitle} onChangeText={setNewTitle}
            placeholderTextColor={colors.textMuted} autoFocus={!pickedFile} />

          <Text style={s.modalLabel}>Issuer</Text>
          <TextInput style={s.modalInput} placeholder="e.g. US Dept. of State"
            value={newIssuer} onChangeText={setNewIssuer}
            placeholderTextColor={colors.textMuted} />

          <Text style={s.modalLabel}>Expiry Date (MM/DD/YYYY)</Text>
          <TextInput style={s.modalInput} placeholder="e.g. 03/15/2029 — optional"
            value={newExpiry} onChangeText={setNewExpiry}
            placeholderTextColor={colors.textMuted}
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'} />

          <Text style={s.modalLabel}>Category</Text>
          <View style={s.catGrid}>
            {DOC_CATEGORIES.map((cat) => {
              const info = getCatInfo(cat);
              return (
                <Pressable key={cat} onPress={() => setNewCategory(cat)}
                  style={[s.catGridItem, newCategory === cat && { backgroundColor: info.color + '20', borderColor: info.color }]}>
                  <Ionicons name={info.icon as any} size={15} color={newCategory === cat ? info.color : colors.textSecondary} />
                  <Text style={[s.catGridText, newCategory === cat && { color: info.color }]}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={s.modalLabel}>Assign To</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <Pressable onPress={() => setNewMemberId(null)} style={[s.memberChip, !newMemberId && s.memberChipOn]}>
              <Ionicons name="home-outline" size={16} color={!newMemberId ? '#2980B9' : colors.textMuted} />
              <Text style={[s.memberChipName, !newMemberId && { color: '#2980B9' }]}>Family</Text>
            </Pressable>
            {members.map((m) => (
              <Pressable key={m.id} onPress={() => setNewMemberId(m.id)} style={[s.memberChip, newMemberId === m.id && s.memberChipOn]}>
                <Avatar name={m.name} color={m.avatarColor} imageUri={m.avatar} size={28} />
                <Text style={[s.memberChipName, newMemberId === m.id && { color: '#2980B9' }]}>{m.name.split(' ')[0]}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={s.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.toggleLabel}>Sensitive</Text>
              <Text style={s.toggleDesc}>Requires extra auth to view</Text>
            </View>
            <Switch value={newSensitive} onValueChange={setNewSensitive} trackColor={{ true: colors.danger }} />
          </View>

          <View style={[s.toggleRow, { marginBottom: 24 }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.toggleLabel}>Shared with Family</Text>
              <Text style={s.toggleDesc}>All members can view this</Text>
            </View>
            <Switch value={newShared} onValueChange={setNewShared} trackColor={{ true: colors.primary }} />
          </View>

          {uploading
            ? <ActivityIndicator color={colors.primary} size="large" style={{ marginVertical: 16 }} />
            : <Button title="Save Document" onPress={handleAdd} fullWidth size="lg" disabled={!newTitle.trim() || !pickedFile} />
          }
          <Button title="Cancel" onPress={() => { setShowModal(false); setPickedFile(null); }}
            variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 20, paddingBottom: 8 },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    back: { marginRight: 12 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
    headerBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerMetaText: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
    // category bar
    catBar: { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, maxHeight: 52 },
    catBarContent: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
    catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 13, borderRadius: 20, borderWidth: 1.5, borderColor: 'transparent' },
    catText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    // list
    list: { padding: 16 },
    docCard: { marginBottom: 10, borderRadius: 16 },
    docRow: { flexDirection: 'row', alignItems: 'flex-start' },
    docIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    docTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
    docTitle: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
    docBadges: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginBottom: 4 },
    docFile: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
    docMeta: { fontSize: 12, color: colors.textSecondary },
    docActions: { gap: 4, alignItems: 'center' },
    docActionBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
    // empty
    empty: { alignItems: 'center', paddingVertical: 60 },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 16 },
    emptyDesc: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 32, marginBottom: 24 },
    emptyBtn: { borderRadius: 14, overflow: 'hidden' },
    emptyBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 24 },
    emptyBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    // security note
    secNote: { flexDirection: 'row', gap: 10, backgroundColor: colors.infoLight, borderRadius: 12, padding: 14, marginTop: 8 },
    secText: { flex: 1, fontSize: 13, color: colors.info, lineHeight: 20 },
    // view modal
    modal: { flex: 1, backgroundColor: colors.background },
    modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginVertical: 12 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 20, paddingHorizontal: 24 },
    modalLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 24 },
    modalInput: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1.5, borderColor: colors.border, marginBottom: 16, marginHorizontal: 24, ...shadows.sm },
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16, paddingHorizontal: 24 },
    catGridItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
    catGridText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    memberChip: { alignItems: 'center', marginRight: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent', gap: 4 },
    memberChipOn: { borderColor: '#2980B9', backgroundColor: '#EBF5FB' },
    memberChipName: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
    toggleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 12, marginHorizontal: 24, borderWidth: 1.5, borderColor: colors.border },
    toggleLabel: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 2 },
    toggleDesc: { fontSize: 12, color: colors.textSecondary },
    // upload area
    uploadArea: { margin: 24, marginBottom: 16, borderRadius: 16, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', padding: 24, alignItems: 'center', gap: 8, backgroundColor: colors.background },
    uploadAreaDone: { borderColor: colors.primary, borderStyle: 'solid', backgroundColor: colors.primary + '08' },
    uploadTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    uploadHint: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
    uploadFileName: { fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'center', paddingHorizontal: 8 },
    uploadFileMeta: { fontSize: 12, color: colors.textMuted },
    // view modal content
    viewHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 8 },
    viewIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    viewTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
    viewCat: { fontSize: 13, color: colors.textSecondary, textTransform: 'capitalize', marginTop: 2 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
    viewRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10 },
    viewRowLabel: { flex: 1, fontSize: 14, color: colors.textSecondary },
    viewRowValue: { fontSize: 14, fontWeight: '600', color: colors.text },
    fileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, padding: 16, marginVertical: 16, borderWidth: 1, borderColor: colors.border },
    fileCardName: { fontSize: 14, fontWeight: '600', color: colors.text },
    fileCardSize: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
    viewActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    viewActionBtn: { borderRadius: 12, overflow: 'hidden' },
    viewActionGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
    viewActionText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    deleteFullBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginTop: 8, borderRadius: 12, borderWidth: 1.5, borderColor: colors.danger + '40' },
  });
}
