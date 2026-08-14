import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal,
  TextInput, Alert, Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { useInsuranceStore, InsuranceType, PremiumFrequency } from '../../store/useInsuranceStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useAuthStore } from '../../store/useAuthStore';
import { getDetectedInsurance } from '../../services/autoFillService';
import type { DetectedInsurance } from '../../services/autoFillService';
import { useTranslation } from 'react-i18next';
import { usePlaidAutoData } from '../../hooks/usePlaidAutoData';

import { generateId } from '../../utils/generateId';

const TYPE_COLORS: Record<InsuranceType, string> = {
  health: '#2980B9',
  auto: '#E74C3C',
  home: '#27AE60',
  life: '#8E44AD',
  dental: '#16A085',
  vision: '#F5A623',
  disability: '#E67E22',
  other: '#95A5A6',
};

const TYPE_ICONS: Record<InsuranceType, string> = {
  health: 'heart',
  auto: 'car',
  home: 'home',
  life: 'shield-checkmark',
  dental: 'medical',
  vision: 'eye',
  disability: 'accessibility',
  other: 'document-text',
};

const TYPE_LABELS: Record<InsuranceType, string> = {
  health: 'Health',
  auto: 'Auto',
  home: 'Home',
  life: 'Life',
  dental: 'Dental',
  vision: 'Vision',
  disability: 'Disability',
  other: 'Other',
};

const INSURANCE_TYPES: InsuranceType[] = ['health', 'auto', 'home', 'life', 'dental', 'vision', 'disability', 'other'];
const FREQUENCY_OPTIONS: PremiumFrequency[] = ['monthly', 'quarterly', 'annual'];
const COLOR_PALETTE = ['#2980B9', '#E74C3C', '#27AE60', '#8E44AD', '#16A085', '#F5A623', '#E67E22', '#95A5A6'];

function maskPolicyNumber(num: string): string {
  if (num.length <= 4) return num;
  return num.slice(0, -4).replace(/./g, '*') + num.slice(-4);
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function normalizeInsuranceType(raw: string): InsuranceType {
  if (INSURANCE_TYPES.includes(raw as InsuranceType)) return raw as InsuranceType;
  return 'other';
}

export function InsuranceManagerScreen({ navigation }: any) {
  const { t } = useTranslation('finance');
  const insets = useSafeAreaInsets();
  const { policies, addPolicy, updatePolicy, deletePolicy, getTotalMonthlyPremium, isLoaded, fetchFromServer } = useInsuranceStore();
  const members = useFamilyStore((s) => s.members);

  const [activeTab, setActiveTab] = useState<'Policies' | 'Coverage' | 'Calendar'>('Policies');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<typeof policies[number] | null>(null);

  // Detected insurance
  const [detectedInsurance, setDetectedInsurance] = useState<DetectedInsurance[]>([]);
  const [detectedExpanded, setDetectedExpanded] = useState(true);

  // Modal state
  const [newType, setNewType] = useState<InsuranceType>('health');
  const [newProvider, setNewProvider] = useState('');
  const [newPolicyNumber, setNewPolicyNumber] = useState('');
  const [newPremium, setNewPremium] = useState('');
  const [newFrequency, setNewFrequency] = useState<PremiumFrequency>('monthly');
  const [newDeductible, setNewDeductible] = useState('');
  const [newCoverageAmount, setNewCoverageAmount] = useState('');
  const [newRenewalDate, setNewRenewalDate] = useState('');
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentPhone, setNewAgentPhone] = useState('');
  const [newMembersInsured, setNewMembersInsured] = useState<string[]>([]);
  const [newColor, setNewColor] = useState(TYPE_COLORS['health']);

  const totalMonthly = getTotalMonthlyPremium();
  const activePolicies = policies.filter((p) => p.isActive);

  const nextRenewal = activePolicies
    .filter((p) => p.renewalDate)
    .sort((a, b) => new Date(a.renewalDate!).getTime() - new Date(b.renewalDate!).getTime())[0];

  useEffect(() => {
    if (!isLoaded) fetchFromServer();
  }, []);

  usePlaidAutoData(() => {
    getDetectedInsurance()
      .then((res) => setDetectedInsurance(res.insurance))
      .catch(() => {/* silent */ });
  });

  const resetModal = () => {
    setNewType('health');
    setNewProvider('');
    setNewPolicyNumber('');
    setNewPremium('');
    setNewFrequency('monthly');
    setNewDeductible('');
    setNewCoverageAmount('');
    setNewRenewalDate('');
    setNewAgentName('');
    setNewAgentPhone('');
    setNewMembersInsured([]);
    setNewColor(TYPE_COLORS['health']);
    setEditingPolicy(null);
  };

  const handleEdit = (policy: typeof policies[number]) => {
    setEditingPolicy(policy);
    setNewType(policy.type);
    setNewProvider(policy.provider);
    setNewPolicyNumber(policy.policyNumber);
    setNewPremium(String(policy.premium));
    setNewFrequency(policy.premiumFrequency);
    setNewDeductible(policy.deductible !== undefined ? String(policy.deductible) : '');
    setNewCoverageAmount(policy.coverageAmount !== undefined ? String(policy.coverageAmount) : '');
    setNewRenewalDate(policy.renewalDate ?? '');
    setNewAgentName(policy.agentName ?? '');
    setNewAgentPhone(policy.agentPhone ?? '');
    setNewMembersInsured(policy.membersInsured);
    setNewColor(policy.color);
    setShowAddModal(true);
  };

  const prefillFromDetected = (d: DetectedInsurance) => {
    setNewType(normalizeInsuranceType(d.type));
    setNewProvider(d.merchantName);
    setNewPremium(String(d.amount));
    setNewFrequency(d.frequency);
    setNewColor(TYPE_COLORS[normalizeInsuranceType(d.type)]);
    setShowAddModal(true);
  };

  const handleAdd = () => {
    const premium = parseFloat(newPremium);
    if (!newProvider.trim() || !newPolicyNumber.trim() || isNaN(premium) || premium <= 0) {
      Alert.alert('Missing Info', 'Please fill in provider, policy number, and premium.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (editingPolicy) {
      updatePolicy(editingPolicy.id, {
        type: newType,
        provider: newProvider.trim(),
        policyNumber: newPolicyNumber.trim(),
        premium,
        premiumFrequency: newFrequency,
        deductible: newDeductible ? parseFloat(newDeductible) : undefined,
        coverageAmount: newCoverageAmount ? parseFloat(newCoverageAmount) : undefined,
        renewalDate: newRenewalDate || undefined,
        membersInsured: newMembersInsured,
        agentName: newAgentName || undefined,
        agentPhone: newAgentPhone || undefined,
        color: newColor,
      });
    } else {
      addPolicy({
        familyId: useAuthStore.getState().familyId ?? '',
        type: newType,
        provider: newProvider.trim(),
        policyNumber: newPolicyNumber.trim(),
        premium,
        premiumFrequency: newFrequency,
        deductible: newDeductible ? parseFloat(newDeductible) : undefined,
        coverageAmount: newCoverageAmount ? parseFloat(newCoverageAmount) : undefined,
        renewalDate: newRenewalDate || undefined,
        membersInsured: newMembersInsured,
        agentName: newAgentName || undefined,
        agentPhone: newAgentPhone || undefined,
        color: newColor,
        isActive: true,
      });
      setDetectedInsurance((prev) => prev.filter((d) => d.merchantName !== newProvider));
    }
    resetModal();
    setShowAddModal(false);
  };

  const handleDelete = (id: string, provider: string) => {
    Alert.alert(`Delete "${provider}" policy?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          deletePolicy(id);
        }
      },
    ]);
  };

  const toggleMember = (id: string) => {
    setNewMembersInsured((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const tabs = ['Policies', 'Coverage', 'Calendar'] as const;

  const coveredTypes = new Set(activePolicies.map((p) => p.type));
  const allTypes = INSURANCE_TYPES;
  const missingTypes = allTypes.filter((t) => !coveredTypes.has(t));

  const renewals = activePolicies
    .filter((p) => p.renewalDate)
    .map((p) => ({ ...p, days: daysUntil(p.renewalDate!) }))
    .sort((a, b) => a.days - b.days);

  const screenHeader = (
    <LinearGradient colors={['#0D47A1', '#1565C0']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <View style={styles.headerTop}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Insurance</Text>
        <Pressable accessibilityRole="button" onPress={() => setShowAddModal(true)} style={styles.addBtn}>
          <Ionicons name="add" size={26} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>${totalMonthly.toFixed(0)}<Text style={styles.summaryUnit}>/mo</Text></Text>
          <Text style={styles.summaryLabel}>Monthly Cost</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{activePolicies.length}</Text>
          <Text style={styles.summaryLabel}>Policies</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, nextRenewal && daysUntil(nextRenewal.renewalDate!) < 30 ? { color: '#FF8A65' } : null]}>
            {nextRenewal ? `${daysUntil(nextRenewal.renewalDate!)}d` : '--'}
          </Text>
          <Text style={styles.summaryLabel}>Next Renewal</Text>
        </View>
      </View>

      <View style={styles.tabRow}>
        {tabs.map((tab) => (
          <Pressable accessibilityRole="button" key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </Pressable>
        ))}
      </View>
    </LinearGradient>
  );

  const screenCompact = (
    <View style={{ backgroundColor: '#0D47A1', paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Text style={styles.headerTitle}>Insurance</Text>
      <Pressable accessibilityRole="button" onPress={() => setShowAddModal(true)} style={styles.addBtn}>
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>
    </View>
  );

  return (
    <>
      <StatusBar style="light" />

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {(scrollProps) => (
          <ScrollView
            {...scrollProps}
            contentContainerStyle={[styles.content, { paddingBottom: 100, paddingTop: scrollProps.contentPaddingTop }]}
          >
        {/* Detected Insurance Banner */}
        {detectedInsurance.length > 0 && (
          <View style={styles.detectedBanner}>
            <Pressable accessibilityRole="button" style={styles.detectedBannerHeader} onPress={() => setDetectedExpanded((v) => !v)}>
              <View style={styles.detectedBannerLeft}>
                <Ionicons name="sparkles" size={15} color="#1565C0" />
                <Text style={styles.detectedBannerTitle}>
                  {detectedInsurance.length} insurance payment{detectedInsurance.length > 1 ? 's' : ''} detected from bank
                </Text>
              </View>
              <Ionicons name={detectedExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#1565C0" />
            </Pressable>
            {detectedExpanded && detectedInsurance.map((d) => (
              <View key={d.merchantName} style={styles.detectedRow}>
                <View style={[styles.detectedTypeIcon, { backgroundColor: TYPE_COLORS[normalizeInsuranceType(d.type)] + '20' }]}>
                  <Ionicons name={TYPE_ICONS[normalizeInsuranceType(d.type)] as any} size={18} color={TYPE_COLORS[normalizeInsuranceType(d.type)]} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.detectedProvider}>{d.merchantName}</Text>
                  <Text style={styles.detectedMeta}>{TYPE_LABELS[normalizeInsuranceType(d.type)]} · {d.frequency}</Text>
                </View>
                <Text style={styles.detectedAmount}>${d.amount.toFixed(2)}</Text>
                <Badge label={d.frequency} variant="info" size="sm" />
                <Pressable accessibilityRole="button" style={styles.addDetectedBtn} onPress={() => prefillFromDetected(d)}>
                  <Ionicons name="add" size={14} color="#fff" />
                  <Text style={styles.addDetectedBtnText}>Add</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* POLICIES TAB */}
        {activeTab === 'Policies' && (
          <>
            {activePolicies.length === 0 && policies.length > 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="shield-outline" size={52} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No active policies</Text>
              </View>
            )}
            {activePolicies.map((policy) => {
              const daysTil = policy.renewalDate ? daysUntil(policy.renewalDate) : null;
              const isRenewingSoon = daysTil !== null && daysTil <= 30;
              const memberNames = policy.membersInsured
                .map((id) => members.find((m) => m.id === id)?.name ?? id)
                .filter(Boolean);

              return (
                <Card key={policy.id} style={styles.policyCard} variant="elevated">
                  <View style={styles.policyHeader}>
                    <View style={[styles.typeIconCircle, { backgroundColor: policy.color + '20' }]}>
                      <Ionicons name={TYPE_ICONS[policy.type] as any} size={24} color={policy.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={styles.policyTitleRow}>
                        <Text style={styles.policyProvider}>{policy.provider}</Text>
                        <Badge label={TYPE_LABELS[policy.type]} variant="info" size="sm" />
                      </View>
                      <Text style={styles.policyNumber}>{maskPolicyNumber(policy.policyNumber)}</Text>
                    </View>
                    <Pressable accessibilityRole="button" onPress={() => handleEdit(policy)} style={styles.editBtn}>
                      <Ionicons name="create-outline" size={17} color={colors.primary} />
                    </Pressable>
                    <Pressable accessibilityRole="button" onPress={() => handleDelete(policy.id, policy.provider)} style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={17} color={colors.danger} />
                    </Pressable>
                  </View>

                  <View style={styles.policyMetaRow}>
                    <View style={styles.policyMetaItem}>
                      <Text style={styles.policyMetaLabel}>Premium</Text>
                      <Text style={styles.policyMetaValue}>
                        ${policy.premium.toLocaleString()}
                        <Text style={styles.policyMetaUnit}>/{policy.premiumFrequency === 'monthly' ? 'mo' : policy.premiumFrequency === 'quarterly' ? 'qtr' : 'yr'}</Text>
                      </Text>
                    </View>
                    {policy.deductible !== undefined && (
                      <View style={styles.policyMetaItem}>
                        <Text style={styles.policyMetaLabel}>Deductible</Text>
                        <Text style={styles.policyMetaValue}>${policy.deductible.toLocaleString()}</Text>
                      </View>
                    )}
                    {policy.coverageAmount !== undefined && (
                      <View style={styles.policyMetaItem}>
                        <Text style={styles.policyMetaLabel}>Coverage</Text>
                        <Text style={styles.policyMetaValue}>${(policy.coverageAmount / 1000).toFixed(0)}K</Text>
                      </View>
                    )}
                  </View>

                  {policy.renewalDate && (
                    <View style={styles.renewalRow}>
                      <Ionicons name="calendar-outline" size={14} color={isRenewingSoon ? colors.danger : colors.textSecondary} />
                      <Text style={[styles.renewalText, isRenewingSoon && { color: colors.danger }]}>
                        Renews {policy.renewalDate}
                        {daysTil !== null && ` (${daysTil} days)`}
                      </Text>
                      {isRenewingSoon && <Badge label="Renewing Soon" variant="danger" size="sm" />}
                    </View>
                  )}

                  {memberNames.length > 0 && (
                    <View style={styles.membersRow}>
                      {memberNames.map((name) => (
                        <View key={name} style={styles.memberChip}>
                          <Text style={styles.memberChipText}>{name}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {policy.agentName && (
                    <View style={styles.agentRow}>
                      <Ionicons name="person-outline" size={13} color={colors.textMuted} />
                      <Text style={styles.agentText}>{policy.agentName}{policy.agentPhone ? ` · ${policy.agentPhone}` : ''}</Text>
                    </View>
                  )}
                </Card>
              );
            })}
          </>
        )}

        {/* COVERAGE TAB */}
        {activeTab === 'Coverage' && (
          <>
            <Card style={styles.coverageSummaryCard} variant="elevated">
              <Text style={styles.coverageSummaryTitle}>Coverage Overview</Text>
              {INSURANCE_TYPES.map((type) => {
                const hasCoverage = coveredTypes.has(type);
                const policy = activePolicies.find((p) => p.type === type);
                return (
                  <View key={type} style={styles.coverageRow}>
                    <View style={[styles.coverageIcon, { backgroundColor: TYPE_COLORS[type] + '20' }]}>
                      <Ionicons name={TYPE_ICONS[type] as any} size={18} color={TYPE_COLORS[type]} />
                    </View>
                    <Text style={styles.coverageTypeLabel}>{TYPE_LABELS[type]}</Text>
                    {hasCoverage ? (
                      <View style={styles.coverageRight}>
                        {policy?.coverageAmount && (
                          <Text style={styles.coverageAmount}>${(policy.coverageAmount / 1000).toFixed(0)}K</Text>
                        )}
                        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                      </View>
                    ) : (
                      <View style={styles.coverageRight}>
                        <Ionicons name="close-circle-outline" size={20} color={colors.textMuted} />
                      </View>
                    )}
                  </View>
                );
              })}
            </Card>

            {missingTypes.length > 0 && (
              <Card style={styles.suggestionsCard} variant="elevated">
                <View style={styles.suggestionsHeader}>
                  <Ionicons name="bulb-outline" size={18} color={colors.warning} />
                  <Text style={styles.suggestionsTitle}>Coverage Gaps</Text>
                </View>
                {missingTypes.map((type) => (
                  <View key={type} style={styles.suggestionRow}>
                    <View style={[styles.coverageIcon, { backgroundColor: TYPE_COLORS[type] + '20' }]}>
                      <Ionicons name={TYPE_ICONS[type] as any} size={16} color={TYPE_COLORS[type]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.suggestionType}>{TYPE_LABELS[type]} Insurance</Text>
                      <Text style={styles.suggestionDesc}>
                        {type === 'life' ? "Protect your family's financial future" :
                          type === 'disability' ? "Income protection if you can't work" :
                            type === 'vision' ? 'Cover eye exams and eyewear' :
                              `Consider adding ${TYPE_LABELS[type].toLowerCase()} coverage`}
                      </Text>
                    </View>
                  </View>
                ))}
              </Card>
            )}

            <Card style={styles.costBreakdownCard} variant="elevated">
              <Text style={styles.coverageSummaryTitle}>Monthly Cost Breakdown</Text>
              {activePolicies.map((policy) => {
                const monthly = policy.premiumFrequency === 'monthly' ? policy.premium :
                  policy.premiumFrequency === 'quarterly' ? policy.premium / 3 : policy.premium / 12;
                const pct = totalMonthly > 0 ? (monthly / totalMonthly) * 100 : 0;
                return (
                  <View key={policy.id} style={styles.costRow}>
                    <View style={[styles.costDot, { backgroundColor: policy.color }]} />
                    <Text style={styles.costProvider}>{policy.provider}</Text>
                    <View style={{ flex: 1, marginHorizontal: 10 }}>
                      <View style={styles.costBarTrack}>
                        <View style={[styles.costBarFill, { width: `${pct}%` as any, backgroundColor: policy.color }]} />
                      </View>
                    </View>
                    <Text style={styles.costAmount}>${monthly.toFixed(0)}/mo</Text>
                  </View>
                );
              })}
              <View style={styles.costTotal}>
                <Text style={styles.costTotalLabel}>Total Annual Cost</Text>
                <Text style={styles.costTotalValue}>${(totalMonthly * 12).toFixed(0)}/yr</Text>
              </View>
            </Card>
          </>
        )}

        {/* CALENDAR TAB */}
        {activeTab === 'Calendar' && (
          <>
            {renewals.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={52} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No renewal dates set</Text>
                <Text style={styles.emptyDesc}>Add renewal dates to your policies to track them here.</Text>
              </View>
            ) : (
              renewals.map((policy) => (
                <Card key={policy.id} style={styles.calendarCard} variant="elevated">
                  <View style={[styles.calendarDateBadge, {
                    backgroundColor: policy.days < 30 ? colors.danger : policy.days < 90 ? colors.warning : colors.success,
                  }]}>
                    <Text style={styles.calendarDays}>{policy.days}</Text>
                    <Text style={styles.calendarDaysLabel}>days</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.calendarRow}>
                      <Ionicons name={TYPE_ICONS[policy.type] as any} size={16} color={policy.color} />
                      <Text style={styles.calendarProvider}>{policy.provider}</Text>
                    </View>
                    <Text style={styles.calendarDate}>Renews {policy.renewalDate}</Text>
                    <Badge
                      label={policy.days < 0 ? 'Overdue' : policy.days < 30 ? 'Urgent' : policy.days < 90 ? 'Upcoming' : 'On Track'}
                      variant={policy.days < 30 ? 'danger' : policy.days < 90 ? 'warning' : 'success'}
                      size="sm"
                    />
                  </View>
                </Card>
              ))
            )}
          </>
        )}
          </ScrollView>
        )}
      </CollapsibleHeader>

      {/* Add Policy Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingPolicy ? 'Edit Policy' : 'Add Insurance Policy'}</Text>
            <Pressable accessibilityRole="button" onPress={() => { resetModal(); setShowAddModal(false); }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalLabel}>Type</Text>
            <View style={styles.typeGrid}>
              {INSURANCE_TYPES.map((t) => (
                <Pressable accessibilityRole="button"
                  key={t}
                  onPress={() => { setNewType(t); setNewColor(TYPE_COLORS[t]); }}
                  style={[styles.typeGridItem, newType === t && { borderColor: TYPE_COLORS[t], backgroundColor: TYPE_COLORS[t] + '15' }]}
                >
                  <Ionicons name={TYPE_ICONS[t] as any} size={22} color={newType === t ? TYPE_COLORS[t] : colors.textMuted} />
                  <Text style={[styles.typeGridLabel, newType === t && { color: TYPE_COLORS[t] }]}>{TYPE_LABELS[t]}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalLabel}>Provider *</Text>
            <TextInput accessibilityLabel="e.g. Blue Cross Blue Shield"
              style={styles.modalInput}
              value={newProvider}
              onChangeText={setNewProvider}
              placeholder="e.g. Blue Cross Blue Shield"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>Policy Number *</Text>
            <TextInput accessibilityLabel="e.g. BCBS-2024-4892"
              style={styles.modalInput}
              value={newPolicyNumber}
              onChangeText={setNewPolicyNumber}
              placeholder="e.g. BCBS-2024-4892"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>Premium Amount *</Text>
            <TextInput accessibilityLabel="0.00"
              style={styles.modalInput}
              value={newPremium}
              onChangeText={setNewPremium}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.modalLabel}>Frequency</Text>
            <View style={styles.chipRow}>
              {FREQUENCY_OPTIONS.map((f) => (
                <Pressable accessibilityRole="button" key={f} onPress={() => setNewFrequency(f)} style={[styles.chip, newFrequency === f && styles.chipActive]}>
                  <Text style={[styles.chipText, newFrequency === f && styles.chipTextActive]}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalLabel}>Renewal Date (YYYY-MM-DD)</Text>
            <TextInput accessibilityLabel="2025-01-01"
              style={styles.modalInput}
              value={newRenewalDate}
              onChangeText={setNewRenewalDate}
              placeholder="2025-01-01"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>Deductible</Text>
            <TextInput accessibilityLabel="0"
              style={styles.modalInput}
              value={newDeductible}
              onChangeText={setNewDeductible}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.modalLabel}>Coverage Amount</Text>
            <TextInput accessibilityLabel="0"
              style={styles.modalInput}
              value={newCoverageAmount}
              onChangeText={setNewCoverageAmount}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.modalLabel}>Agent Name</Text>
            <TextInput accessibilityLabel="Optional"
              style={styles.modalInput}
              value={newAgentName}
              onChangeText={setNewAgentName}
              placeholder="Optional"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>Agent Phone</Text>
            <TextInput accessibilityLabel="Optional"
              style={styles.modalInput}
              value={newAgentPhone}
              onChangeText={setNewAgentPhone}
              placeholder="Optional"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />

            <Text style={styles.modalLabel}>Members Insured</Text>
            {members.map((m) => (
              <Pressable accessibilityRole="button" key={m.id} onPress={() => toggleMember(m.id)} style={styles.memberRow}>
                <View style={[styles.memberAvatar, { backgroundColor: m.avatarColor }]}>
                  <Text style={styles.memberAvatarText}>{m.name[0]}</Text>
                </View>
                <Text style={styles.memberName}>{m.name}</Text>
                <View style={[styles.checkbox, newMembersInsured.includes(m.id) && styles.checkboxChecked]}>
                  {newMembersInsured.includes(m.id) && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
              </Pressable>
            ))}

            <Text style={styles.modalLabel}>Color</Text>
            <View style={styles.colorPicker}>
              {COLOR_PALETTE.map((c) => (
                <Pressable accessibilityRole="button" key={c} onPress={() => setNewColor(c)} style={[styles.colorSwatch, { backgroundColor: c }, newColor === c && styles.colorSwatchActive]} />
              ))}
            </View>

            <Pressable accessibilityRole="button"
              onPress={handleAdd}
              style={[styles.submitBtn, (!newProvider.trim() || !newPolicyNumber.trim() || !newPremium) && styles.submitBtnDisabled]}
            >
              <Ionicons name="shield-checkmark" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>{editingPolicy ? 'Save Changes' : 'Add Policy'}</Text>
            </Pressable>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 0 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backBtn: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 12, alignItems: 'center' },
  summaryValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  summaryUnit: { fontSize: 12, fontWeight: '600' },
  summaryLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '600', marginTop: 2 },
  tabRow: { flexDirection: 'row', marginBottom: 0 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#fff' },
  tabText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  tabTextActive: { color: '#fff' },
  content: { padding: 16 },
  // Detected insurance banner
  detectedBanner: { backgroundColor: '#EBF2FC', borderRadius: 14, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#1565C0', overflow: 'hidden' },
  detectedBannerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  detectedBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  detectedBannerTitle: { fontSize: 13, fontWeight: '700', color: '#1565C0', flex: 1 },
  detectedRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 12, gap: 6 },
  detectedTypeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  detectedProvider: { fontSize: 14, fontWeight: '700', color: colors.text },
  detectedMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  detectedAmount: { fontSize: 15, fontWeight: '800', color: colors.text },
  addDetectedBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#1565C0', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  addDetectedBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  seedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 16, ...shadows.sm },
  seedBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 14 },
  emptyDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 6, textAlign: 'center' },
  policyCard: { marginBottom: 12 },
  policyHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  typeIconCircle: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  policyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  policyProvider: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text },
  policyNumber: { fontSize: 12, color: colors.textMuted, fontFamily: 'monospace' },
  editBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primaryLight + '30', alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  deleteBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.dangerLight, alignItems: 'center', justifyContent: 'center' },
  policyMetaRow: { flexDirection: 'row', gap: 16, marginBottom: 10, flexWrap: 'wrap' },
  policyMetaItem: {},
  policyMetaLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  policyMetaValue: { fontSize: 15, fontWeight: '700', color: colors.text },
  policyMetaUnit: { fontSize: 11, fontWeight: '400', color: colors.textSecondary },
  renewalRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  renewalText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  membersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  memberChip: { backgroundColor: colors.background, borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10 },
  memberChipText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  agentRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  agentText: { fontSize: 11, color: colors.textMuted },
  coverageSummaryCard: { marginBottom: 12 },
  coverageSummaryTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 14 },
  coverageRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  coverageIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  coverageTypeLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  coverageRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coverageAmount: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  suggestionsCard: { marginBottom: 12 },
  suggestionsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  suggestionsTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  suggestionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  suggestionType: { fontSize: 13, fontWeight: '700', color: colors.text },
  suggestionDesc: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  costBreakdownCard: { marginBottom: 12 },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  costDot: { width: 10, height: 10, borderRadius: 5 },
  costProvider: { fontSize: 12, color: colors.text, fontWeight: '600', width: 90 },
  costBarTrack: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  costBarFill: { height: 6, borderRadius: 3 },
  costAmount: { fontSize: 12, color: colors.textSecondary, width: 70, textAlign: 'right' },
  costTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  costTotalLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
  costTotalValue: { fontSize: 16, fontWeight: '800', color: colors.primary },
  calendarCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 },
  calendarDateBadge: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  calendarDays: { fontSize: 20, fontWeight: '800', color: '#fff' },
  calendarDaysLabel: { fontSize: 9, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  calendarRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  calendarProvider: { fontSize: 15, fontWeight: '700', color: colors.text },
  calendarDate: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  modalContainer: { flex: 1, backgroundColor: colors.card },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  modalScroll: { flex: 1, padding: 20 },
  modalLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  modalInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: colors.text, marginBottom: 16, backgroundColor: colors.background },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeGridItem: { width: '22%', aspectRatio: 1, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 4 },
  typeGridLabel: { fontSize: 9, fontWeight: '600', color: colors.textMuted },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border },
  chipActive: { backgroundColor: '#1565C0', borderColor: '#1565C0' },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: '#fff' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  memberName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#1565C0', borderColor: '#1565C0' },
  colorPicker: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  colorSwatch: { width: 32, height: 32, borderRadius: 16 },
  colorSwatchActive: { borderWidth: 3, borderColor: colors.text },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1565C0', borderRadius: 14, paddingVertical: 15, marginTop: 8 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
