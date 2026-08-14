import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useFinanceStore } from '../../store/useFinanceStore';
import { Button } from '../../components/common/Button';
import * as financeAccountService from '../../services/financeAccountService';
import type { StatementImportRow } from '../../services/financeAccountService';

const PRIMARY = '#1E3A5F';
const DANGER = '#EF4444';
const SUCCESS = '#10B981';
const BG = '#F5F7FA';
const CARD = '#fff';
const TEXT = '#1A1A2E';
const SUBTEXT = '#6B7280';
const BORDER = '#E5E7EB';

function formatMoney(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface Row extends StatementImportRow {
  included: boolean;
}

interface Props {
  navigation: { goBack: () => void };
  route: { params?: { accountId?: string } };
}

export function ImportStatementScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const accountId = route.params?.accountId ?? '';
  const account = useFinanceStore((s) => s.accounts.find((a) => a.id === accountId));
  const importStatementRows = useFinanceStore((s) => s.importStatementRows);

  const [filename, setFilename] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!/\.(csv|ofx|qfx)$/i.test(asset.name)) {
        Alert.alert('Unsupported file', 'Please choose a .csv, .ofx, or .qfx bank statement export.');
        return;
      }

      setLoading(true);
      setRows(null);
      setParseErrors([]);
      const content = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
      const result2 = await financeAccountService.previewStatementImport(accountId, asset.name, content);
      setFilename(asset.name);
      setRows(result2.rows.map((r) => ({ ...r, included: !r.isLikelyDuplicate })));
      setParseErrors(result2.errors);
    } catch (err) {
      Alert.alert('Could not read statement', err instanceof Error ? err.message : 'Please try a different file.');
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (index: number) => {
    setRows((prev) => prev && prev.map((r, i) => (i === index ? { ...r, included: !r.included } : r)));
  };

  const invertAllSigns = () => {
    setRows((prev) => prev && prev.map((r) => ({ ...r, type: r.type === 'INCOME' ? 'EXPENSE' : 'INCOME' })));
  };

  const selectedCount = rows?.filter((r) => r.included).length ?? 0;

  const handleConfirm = async () => {
    if (!rows) return;
    const selected = rows.filter((r) => r.included);
    if (selected.length === 0) return;
    setImporting(true);
    try {
      const imported = await importStatementRows(
        accountId,
        selected.map(({ date, description, amount, type }) => ({ date, description, amount, type })),
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Import complete', `Added ${imported} transaction${imported === 1 ? '' : 's'} to ${account?.name ?? 'this account'}.`, [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Import failed', 'Please try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={TEXT} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Import Statement</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!rows && (
          <View style={styles.card}>
            <Ionicons name="document-attach-outline" size={40} color={PRIMARY} style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={styles.pickTitle}>Import a bank statement</Text>
            <Text style={styles.pickSubtitle}>
              Choose a CSV, OFX, or QFX file exported from your bank to add its transactions to {account?.name ?? 'this account'}.
            </Text>
            {loading ? (
              <ActivityIndicator style={{ marginTop: 16 }} color={PRIMARY} />
            ) : (
              <Button title="Choose File" onPress={handlePickFile} fullWidth size="lg" style={{ marginTop: 16 }} />
            )}
          </View>
        )}

        {rows && rows.length === 0 && (
          <View style={styles.card}>
            <Text style={styles.pickTitle}>No transactions found</Text>
            {parseErrors.map((e, i) => <Text key={i} style={styles.errorText}>{e}</Text>)}
            <Button title="Choose a Different File" onPress={handlePickFile} fullWidth size="lg" style={{ marginTop: 16 }} variant="outline" />
          </View>
        )}

        {rows && rows.length > 0 && (
          <>
            <View style={styles.card}>
              <Text style={styles.summaryFile} numberOfLines={1}>{filename}</Text>
              <Text style={styles.summaryText}>
                {selectedCount} of {rows.length} transaction{rows.length === 1 ? '' : 's'} selected
              </Text>
              {parseErrors.length > 0 && (
                <Text style={styles.errorText}>{parseErrors.length} row{parseErrors.length === 1 ? '' : 's'} couldn't be read.</Text>
              )}
              <Pressable accessibilityRole="button" onPress={invertAllSigns} style={styles.invertRow}>
                <Ionicons name="swap-vertical" size={16} color={PRIMARY} />
                <Text style={styles.invertText}>Amounts look flipped? Tap to invert income/expense</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              {rows.map((r, i) => (
                <Pressable accessibilityRole="button" key={i} style={styles.row} onPress={() => toggleRow(i)}>
                  <Ionicons
                    name={r.included ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={r.included ? PRIMARY : SUBTEXT}
                    style={{ marginRight: 12 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel} numberOfLines={1}>{r.description}</Text>
                    <Text style={styles.rowMeta}>
                      {formatDate(r.date)}
                      {r.isLikelyDuplicate && '  •  Possible duplicate'}
                    </Text>
                  </View>
                  <Text style={[styles.rowAmount, { color: r.type === 'INCOME' ? SUCCESS : DANGER }]}>
                    {r.type === 'INCOME' ? '+' : '-'}${formatMoney(r.amount)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Button
              title={importing ? 'Importing…' : `Import ${selectedCount} Transaction${selectedCount === 1 ? '' : 's'}`}
              onPress={handleConfirm}
              fullWidth
              size="lg"
              disabled={selectedCount === 0 || importing}
            />
            <Button title="Choose a Different File" onPress={handlePickFile} fullWidth variant="ghost" style={{ marginTop: 8, marginBottom: 24 }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, backgroundColor: BG },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: TEXT, textAlign: 'center' },

  content: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: CARD, borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },

  pickTitle: { fontSize: 17, fontWeight: '800', color: TEXT, textAlign: 'center' },
  pickSubtitle: { fontSize: 13, color: SUBTEXT, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  errorText: { fontSize: 12, color: DANGER, marginTop: 8 },

  summaryFile: { fontSize: 13, fontWeight: '700', color: TEXT },
  summaryText: { fontSize: 13, color: SUBTEXT, marginTop: 4 },
  invertRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  invertText: { fontSize: 12, color: PRIMARY, fontWeight: '600', flex: 1 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: BORDER },
  rowLabel: { fontSize: 14, fontWeight: '600', color: TEXT },
  rowMeta: { fontSize: 12, color: SUBTEXT, marginTop: 2 },
  rowAmount: { fontSize: 14, fontWeight: '700', marginLeft: 8 },
});
