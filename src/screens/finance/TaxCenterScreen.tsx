import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFinanceStore } from '../../store/useFinanceStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useTheme } from '../../theme/ThemeContext';
import { shadows } from '../../theme/spacing';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import type { Transaction } from '../../types';
import { useTranslation } from 'react-i18next';

// Categories that are commonly tax-deductible
const DEDUCTIBLE_CATEGORIES: Record<string, { label: string; icon: string; color: string; note: string }> = {
  'Medical':       { label: 'Medical & Dental',    icon: 'medical',         color: '#E74C3C', note: 'Expenses >7.5% of AGI may be deductible' },
  'Health':        { label: 'Health',               icon: 'fitness',         color: '#E74C3C', note: 'Health insurance premiums may qualify' },
  'Charity':       { label: 'Charitable Donations', icon: 'heart',           color: '#8E44AD', note: 'Up to 60% of AGI for cash donations' },
  'Donation':      { label: 'Charitable Donations', icon: 'heart',           color: '#8E44AD', note: 'Up to 60% of AGI for cash donations' },
  'Education':     { label: 'Education',            icon: 'school',          color: '#2980B9', note: 'Tuition & fees, student loan interest' },
  'Home Office':   { label: 'Home Office',          icon: 'home',            color: '#27AE60', note: 'If used regularly & exclusively for work' },
  'Business':      { label: 'Business Expenses',    icon: 'briefcase',       color: '#F5A623', note: 'Ordinary & necessary business costs' },
  'Mortgage':      { label: 'Mortgage Interest',    icon: 'business',        color: '#1A6B3C', note: 'Interest on loans up to $750k' },
  'Property Tax':  { label: 'Property Tax',         icon: 'home',            color: '#16A085', note: 'State & local property taxes (SALT cap $10k)' },
  'Childcare':     { label: 'Childcare',            icon: 'people',          color: '#F39C12', note: 'Child & Dependent Care Credit may apply' },
  'Investment':    { label: 'Investment Losses',    icon: 'trending-down',   color: '#C0392B', note: 'Capital losses offset gains dollar-for-dollar' },
};

const INCOME_CATEGORIES = ['Salary', 'Wages', 'Freelance', 'Investment', 'Rental', 'Business', 'Interest', 'Dividend', 'Other Income'];

function categoryColor(cat: string): string {
  return DEDUCTIBLE_CATEGORIES[cat]?.color ?? '#6366F1';
}

function buildHTML(
  year: number,
  familyName: string,
  totalIncome: number,
  totalExpenses: number,
  deductionGroups: { category: string; amount: number }[],
  incomeSources: { category: string; amount: number }[],
  checklistItems: { label: string; done: boolean }[],
): string {
  const totalDeductions = deductionGroups.reduce((s, d) => s + d.amount, 0);
  const estimatedTaxableIncome = Math.max(0, totalIncome - totalDeductions - 14600);

  const deductionRows = deductionGroups
    .map(d => `<tr><td>${d.category}</td><td style="text-align:right">$${d.amount.toLocaleString()}</td></tr>`)
    .join('');

  const incomeRows = incomeSources
    .map(s => `<tr><td>${s.category}</td><td style="text-align:right">$${s.amount.toLocaleString()}</td></tr>`)
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #1a1a2e; }
  h1 { color: #0F2952; border-bottom: 3px solid #0F2952; padding-bottom: 8px; }
  h2 { color: #0F2952; margin-top: 32px; font-size: 16px; }
  .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin: 20px 0; }
  .summary-box { background: #f5f7fa; border-radius: 10px; padding: 16px; text-align: center; }
  .summary-box .value { font-size: 22px; font-weight: bold; color: #0F2952; }
  .summary-box .label { font-size: 12px; color: #666; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #0F2952; color: #fff; padding: 8px 12px; text-align: left; font-size: 13px; }
  td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
  tr:nth-child(even) { background: #f9f9f9; }
  .total-row td { font-weight: bold; background: #E8EEF9; }
  .notice { background: #FFF3CD; border-left: 4px solid #F5A623; padding: 12px 16px; border-radius: 4px; margin-top: 24px; font-size: 12px; color: #555; }
  .checklist { margin-top: 8px; }
  .checklist-item { display: flex; align-items: center; padding: 6px 0; font-size: 13px; }
  footer { margin-top: 40px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 16px; }
</style>
</head>
<body>
<h1>📋 ${familyName} — ${year} Tax Summary</h1>
<p style="color:#666;font-size:13px">Generated by Family Command Center • For accountant / tax software use only</p>

<div class="summary-grid">
  <div class="summary-box">
    <div class="value">$${totalIncome.toLocaleString()}</div>
    <div class="label">Total Income</div>
  </div>
  <div class="summary-box">
    <div class="value">$${totalDeductions.toLocaleString()}</div>
    <div class="label">Potential Deductions</div>
  </div>
  <div class="summary-box">
    <div class="value">$${estimatedTaxableIncome.toLocaleString()}</div>
    <div class="label">Est. Taxable Income*</div>
  </div>
</div>

<h2>Income Sources</h2>
<table>
  <tr><th>Source</th><th style="text-align:right">Amount</th></tr>
  ${incomeRows || '<tr><td colspan="2">No income transactions recorded</td></tr>'}
  <tr class="total-row"><td>Total Income</td><td style="text-align:right">$${totalIncome.toLocaleString()}</td></tr>
</table>

<h2>Potential Deductions</h2>
<table>
  <tr><th>Category</th><th style="text-align:right">Amount</th></tr>
  ${deductionRows || '<tr><td colspan="2">No deductible transactions found</td></tr>'}
  <tr class="total-row"><td>Total Potential Deductions</td><td style="text-align:right">$${totalDeductions.toLocaleString()}</td></tr>
</table>

<h2>Tax Readiness Checklist</h2>
<div class="checklist">
${checklistItems.map(i => `<div class="checklist-item">${i.done ? '✅' : '⬜'} &nbsp; ${i.label}</div>`).join('')}
</div>

<div class="notice">
  * Estimated taxable income uses the 2024 standard deduction ($14,600 single / $29,200 married). This is a preliminary estimate — consult a licensed tax professional before filing. This document does not constitute tax advice.
</div>

<footer>
  Family Command Center Tax Summary • ${year} Tax Year • Generated ${new Date().toLocaleDateString()}<br/>
  This summary is based on transactions entered in the app. Verify all figures against official documents (W-2, 1099, etc.) before filing.
</footer>
</body>
</html>`;
}

export function TaxCenterScreen({ navigation }: any) {
  const { t } = useTranslation('finance');
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { transactions, bills } = useFinanceStore();
  const family = useFamilyStore((s) => s.family);
  const members = useFamilyStore((s) => s.members);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [exporting, setExporting] = useState(false);

  const years = [currentYear, currentYear - 1, currentYear - 2];

  const yearTransactions = useMemo(
    () => transactions.filter((t) => new Date(t.date).getFullYear() === selectedYear),
    [transactions, selectedYear]
  );

  // Income breakdown
  const incomeSources = useMemo(() => {
    const map: Record<string, number> = {};
    yearTransactions
      .filter((t) => t.type === 'income')
      .forEach((t) => {
        map[t.category] = (map[t.category] ?? 0) + t.amount;
      });
    return Object.entries(map)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [yearTransactions]);

  const totalIncome = incomeSources.reduce((s, i) => s + i.amount, 0);

  // Deductible expense breakdown
  const deductionGroups = useMemo(() => {
    const map: Record<string, number> = {};
    yearTransactions
      .filter((t) => t.type === 'expense' && DEDUCTIBLE_CATEGORIES[t.category])
      .forEach((t) => {
        map[t.category] = (map[t.category] ?? 0) + t.amount;
      });
    return Object.entries(map)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [yearTransactions]);

  const totalDeductions = deductionGroups.reduce((s, d) => s + d.amount, 0);

  // All expenses for spending summary
  const totalExpenses = useMemo(
    () => yearTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [yearTransactions]
  );

  const estimatedTaxableIncome = Math.max(0, totalIncome - totalDeductions - 14600);

  // Tax readiness checklist
  const checklist = useMemo(() => [
    { label: 'Income transactions recorded', done: totalIncome > 0 },
    { label: 'At least one deductible expense tracked', done: deductionGroups.length > 0 },
    { label: 'Family members set up', done: members.length > 0 },
    { label: 'Bills & subscriptions logged', done: bills.length > 0 },
    { label: `Full year of data (${selectedYear})`, done: yearTransactions.length >= 12 },
    { label: 'Charitable donations logged', done: yearTransactions.some(t => t.category === 'Charity' || t.category === 'Donation') },
    { label: 'Medical expenses logged', done: yearTransactions.some(t => t.category === 'Medical' || t.category === 'Health') },
  ], [totalIncome, deductionGroups, members, bills, yearTransactions, selectedYear]);

  const readinessScore = Math.round((checklist.filter(c => c.done).length / checklist.length) * 100);

  async function handleExport() {
    try {
      setExporting(true);
      const familyName = family?.name ?? 'My Family';
      const totalDeductionsLocal = deductionGroups.reduce((s, d) => s + d.amount, 0);
      const estTaxable = Math.max(0, totalIncome - totalDeductionsLocal - 14600);

      const lines = [
        `📋 ${familyName} — ${selectedYear} Tax Summary`,
        `Generated by Family Command Center`,
        ``,
        `── INCOME ──────────────────────`,
        ...incomeSources.map(s => `  ${s.category}: $${s.amount.toLocaleString()}`),
        `  TOTAL: $${totalIncome.toLocaleString()}`,
        ``,
        `── POTENTIAL DEDUCTIONS ────────`,
        ...deductionGroups.map(d => `  ${d.category}: $${d.amount.toLocaleString()}`),
        `  TOTAL: $${totalDeductionsLocal.toLocaleString()}`,
        ``,
        `── ESTIMATE ────────────────────`,
        `  Gross Income:        $${totalIncome.toLocaleString()}`,
        `  Deductions:        - $${totalDeductionsLocal.toLocaleString()}`,
        `  Standard Deduction:- $14,600`,
        `  Est. Taxable Income: $${estTaxable.toLocaleString()}`,
        ``,
        `── TAX READINESS: ${readinessScore}% ──────────`,
        ...checklist.map(c => `  ${c.done ? '✅' : '⬜'} ${c.label}`),
        ``,
        `* Consult a licensed CPA before filing. Not tax advice.`,
      ];

      await Share.share({
        title: `${selectedYear} Tax Summary — ${familyName}`,
        message: lines.join('\n'),
      });
    } catch (e: any) {
      if (e.message !== 'The user canceled the action') {
        Alert.alert('Export failed', e.message ?? 'Could not share report');
      }
    } finally {
      setExporting(false);
    }
  }

  const scoreColor = readinessScore >= 80 ? '#27AE60' : readinessScore >= 50 ? '#F5A623' : '#E74C3C';

  const screenHeader = (
    <LinearGradient colors={['#0F2952', '#1E4A8A']} style={{ paddingTop: insets.top + 6, paddingHorizontal: 20, paddingBottom: 16 }}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('tax.title')}</Text>
          <Text style={styles.headerSub}>Summary & deduction tracker</Text>
        </View>
        <Pressable
          onPress={handleExport}
          disabled={exporting}
          style={[styles.exportBtn, exporting && { opacity: 0.5 }]}
        >
          <Ionicons name="share-outline" size={18} color="#fff" />
          <Text style={styles.exportBtnText}>{exporting ? 'Generating…' : 'Export PDF'}</Text>
        </Pressable>
      </View>

      {/* Year selector */}
      <View style={styles.yearRow}>
        {years.map((y) => (
          <Pressable
            key={y}
            onPress={() => setSelectedYear(y)}
            style={[styles.yearChip, selectedYear === y && styles.yearChipActive]}
          >
            <Text style={[styles.yearChipText, selectedYear === y && styles.yearChipTextActive]}>
              {y}
            </Text>
          </Pressable>
        ))}
      </View>
    </LinearGradient>
  );

  const screenCompact = (
    <View style={{ backgroundColor: '#0F2952', paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Text style={styles.headerTitle}>{t('tax.title')}</Text>
      <Pressable
        onPress={handleExport}
        disabled={exporting}
        style={[styles.exportBtn, exporting && { opacity: 0.5 }]}
      >
        <Ionicons name="share-outline" size={18} color="#fff" />
        <Text style={styles.exportBtnText}>{exporting ? 'Generating…' : 'Export PDF'}</Text>
      </Pressable>
    </View>
  );

  return (
    <CollapsibleHeader
      fullHeader={screenHeader}
      compactHeader={screenCompact}
      wrapperStyle={styles.container}
    >
      {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
        <ScrollView
          style={{ flex: 1 }}
          onScroll={onScroll}
          onScrollEndDrag={onScrollEndDrag}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={scrollEventThrottle}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32, paddingTop: contentPaddingTop }]}
          showsVerticalScrollIndicator={false}
        >
        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, shadows.card]}>
            <Text style={styles.summaryValue}>${totalIncome.toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>Total Income</Text>
          </View>
          <View style={[styles.summaryCard, shadows.card]}>
            <Text style={[styles.summaryValue, { color: '#27AE60' }]}>${totalDeductions.toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>Deductions Found</Text>
          </View>
          <View style={[styles.summaryCard, shadows.card]}>
            <Text style={[styles.summaryValue, { color: '#2980B9' }]}>${estimatedTaxableIncome.toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>Est. Taxable*</Text>
          </View>
        </View>

        {/* Readiness score */}
        <View style={[styles.section, shadows.card]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-circle" size={20} color={scoreColor} />
            <Text style={styles.sectionTitle}>Tax Readiness</Text>
            <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
              <Text style={styles.scoreBadgeText}>{readinessScore}%</Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${readinessScore}%` as any, backgroundColor: scoreColor }]} />
          </View>
          {checklist.map((item, i) => (
            <View key={i} style={styles.checkRow}>
              <Ionicons
                name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
                size={18}
                color={item.done ? '#27AE60' : '#ccc'}
              />
              <Text style={[styles.checkLabel, !item.done && { color: colors.textMuted }]}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Income sources */}
        <View style={[styles.section, shadows.card]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up" size={20} color="#27AE60" />
            <Text style={styles.sectionTitle}>Income Sources</Text>
          </View>
          {incomeSources.length === 0 ? (
            <Text style={styles.emptyText}>No income recorded for {selectedYear}</Text>
          ) : (
            incomeSources.map((s, i) => (
              <View key={i} style={styles.lineRow}>
                <View style={[styles.lineDot, { backgroundColor: '#27AE60' }]} />
                <Text style={styles.lineLabel}>{s.category}</Text>
                <Text style={styles.lineAmount}>${s.amount.toLocaleString()}</Text>
              </View>
            ))
          )}
          {totalIncome > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>${totalIncome.toLocaleString()}</Text>
            </View>
          )}
        </View>

        {/* Deductions */}
        <View style={[styles.section, shadows.card]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="receipt" size={20} color="#6366F1" />
            <Text style={styles.sectionTitle}>Potential Deductions</Text>
          </View>
          {deductionGroups.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="alert-circle-outline" size={32} color="#ccc" />
              <Text style={styles.emptyText}>No deductible categories found for {selectedYear}</Text>
              <Text style={styles.emptyHint}>
                Tag expenses as Medical, Charity, Education, Home Office, Business, Mortgage, or Childcare to track deductions.
              </Text>
            </View>
          ) : (
            deductionGroups.map((d, i) => {
              const meta = DEDUCTIBLE_CATEGORIES[d.category];
              return (
                <View key={i} style={styles.deductionCard}>
                  <View style={[styles.deductionIcon, { backgroundColor: (meta?.color ?? '#6366F1') + '22' }]}>
                    <Ionicons name={(meta?.icon ?? 'pricetag') as any} size={18} color={meta?.color ?? '#6366F1'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.deductionLabel}>{meta?.label ?? d.category}</Text>
                    <Text style={styles.deductionNote}>{meta?.note ?? ''}</Text>
                  </View>
                  <Text style={[styles.deductionAmount, { color: meta?.color ?? '#6366F1' }]}>
                    ${d.amount.toLocaleString()}
                  </Text>
                </View>
              );
            })
          )}
          {totalDeductions > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Potential Deductions</Text>
              <Text style={[styles.totalAmount, { color: '#6366F1' }]}>${totalDeductions.toLocaleString()}</Text>
            </View>
          )}
        </View>

        {/* Deduction tips */}
        <View style={[styles.section, shadows.card]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bulb" size={20} color="#F5A623" />
            <Text style={styles.sectionTitle}>Deduction Tips</Text>
          </View>
          {Object.entries(DEDUCTIBLE_CATEGORIES).slice(0, 5).map(([cat, meta]) => (
            <View key={cat} style={styles.tipRow}>
              <View style={[styles.tipIcon, { backgroundColor: meta.color + '15' }]}>
                <Ionicons name={meta.icon as any} size={16} color={meta.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tipLabel}>{meta.label}</Text>
                <Text style={styles.tipNote}>{meta.note}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
          <Text style={styles.disclaimerText}>
            * Estimated taxable income uses the 2024 standard deduction. This is not tax advice — consult a licensed CPA or tax professional before filing.
          </Text>
        </View>
        </ScrollView>
      )}
    </CollapsibleHeader>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, paddingTop: 8 },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 1 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  exportBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  yearRow: { flexDirection: 'row', gap: 8 },
  yearChip: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)' },
  yearChipActive: { backgroundColor: '#fff' },
  yearChipText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  yearChipTextActive: { color: '#0F2952' },
  scroll: { padding: 16, gap: 16 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: '800', color: '#0F2952' },
  summaryLabel: { fontSize: 11, color: '#666', marginTop: 3, textAlign: 'center' },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#0F2952' },
  scoreBadge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 12 },
  scoreBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  progressBar: { height: 6, backgroundColor: '#F0F0F0', borderRadius: 3, marginBottom: 14 },
  progressFill: { height: 6, borderRadius: 3 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  checkLabel: { fontSize: 14, color: '#1a1a2e' },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  lineDot: { width: 8, height: 8, borderRadius: 4 },
  lineLabel: { flex: 1, fontSize: 14, color: '#333' },
  lineAmount: { fontSize: 14, fontWeight: '600', color: '#0F2952' },
  totalRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1.5, borderTopColor: '#E8EEF9' },
  totalLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0F2952' },
  totalAmount: { fontSize: 15, fontWeight: '800', color: '#0F2952' },
  deductionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  deductionIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  deductionLabel: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  deductionNote: { fontSize: 11, color: '#888', marginTop: 2 },
  deductionAmount: { fontSize: 15, fontWeight: '700' },
  emptyBox: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 13, color: '#999', textAlign: 'center' },
  emptyHint: { fontSize: 12, color: '#bbb', textAlign: 'center', lineHeight: 18 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  tipIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  tipLabel: { fontSize: 13, fontWeight: '600', color: '#1a1a2e' },
  tipNote: { fontSize: 12, color: '#888', marginTop: 2, lineHeight: 17 },
  disclaimer: { flexDirection: 'row', gap: 8, backgroundColor: '#FFF3CD', borderRadius: 10, padding: 12, alignItems: 'flex-start' },
  disclaimerText: { flex: 1, fontSize: 12, color: '#7a6000', lineHeight: 18 },
});
