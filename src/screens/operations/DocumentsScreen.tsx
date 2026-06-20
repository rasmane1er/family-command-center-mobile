import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, differenceInDays } from 'date-fns';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { useOperationsStore } from '../../store/useOperationsStore';
import type { DocumentCategory } from '../../types';

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

export function DocumentsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const { documents } = useOperationsStore();

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

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#2980B9', '#1A5276']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Document Vault</Text>
          <Pressable style={styles.addBtn}><Ionicons name="add" size={26} color="#fff" /></Pressable>
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
            <Card key={doc.id} style={styles.docCard} onPress={() => {}} variant="elevated">
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
                  <Pressable style={styles.docActionBtn}>
                    <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
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
});
