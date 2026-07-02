import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Image, ScrollView,
  TextInput, Animated, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { useFinanceStore } from '../../store/useFinanceStore';
import type { Transaction, Bill, Subscription } from '../../types';
import { API_BASE_URL } from '../../config/api';

const CATEGORIES = ['Food & Drink', 'Shopping', 'Transportation', 'Bills & Utilities', 'Entertainment', 'Health', 'Education', 'Other'];

interface ReceiptData {
  merchant: string;
  amount: number;
  date: string;
  category: string;
  isRecurring: boolean;
  suggestedDestination: 'transaction' | 'bill' | 'subscription';
  confidence: number;
  tax: number;
  tip: number;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

async function scanReceipt(imageBase64: string): Promise<ReceiptData> {
  const token = await SecureStore.getItemAsync('access_token');
  const response = await fetch(`${API_BASE_URL}/receipts/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ imageBase64 }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as Record<string, string>).error ?? `HTTP ${response.status}`);
  }
  return response.json() as Promise<ReceiptData>;
}

export function ReceiptScannerScreen({ navigation }: { navigation: { goBack: () => void; navigate: (screen: string) => void } }) {
  const insets = useSafeAreaInsets();
  const { addTransaction, addBill, addSubscription } = useFinanceStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [success, setSuccess] = useState(false);

  const [editMerchant, setEditMerchant] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCategory, setEditCategory] = useState('Other');
  const [destination, setDestination] = useState<'transaction' | 'bill' | 'subscription'>('transaction');

  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (step === 2) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
          Animated.timing(scanLineAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
  }, [step, scanLineAnim]);

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission required', 'Camera permission is needed to scan receipts.'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'] as ImagePicker.MediaType[], quality: 0.8, base64: true });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 ?? null);
    }
  };

  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as ImagePicker.MediaType[], quality: 0.8, base64: true });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 ?? null);
    }
  };

  const handleScan = async () => {
    if (!imageBase64) return;
    setStep(2);
    setScanning(true);
    setScanError(null);
    try {
      const data = await scanReceipt(imageBase64);
      setReceipt(data);
      setEditMerchant(data.merchant);
      setEditAmount(String(data.amount));
      setEditDate(data.date);
      setEditCategory(data.category);
      setDestination(data.suggestedDestination);
      setStep(3);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const handleDispatch = () => {
    const amount = parseFloat(editAmount) || 0;
    const familyId = 'demo-family';
    const now = new Date().toISOString();

    if (destination === 'transaction') {
      const tx: Transaction = {
        id: generateId(), familyId, amount, type: 'expense',
        category: editCategory, description: editMerchant,
        date: editDate ? new Date(editDate).toISOString() : now,
        isRecurring: receipt?.isRecurring ?? false, createdAt: now,
      };
      addTransaction(tx);
    } else if (destination === 'bill') {
      const bill: Bill = {
        id: generateId(), familyId, name: editMerchant, amount,
        dueDate: editDate ? new Date(editDate).toISOString() : now,
        category: editCategory, status: 'upcoming',
        isAutoPay: false, isRecurring: true, recurrence: 'monthly', icon: 'receipt',
      };
      addBill(bill);
    } else {
      const nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const sub: Subscription = {
        id: generateId(), familyId, name: editMerchant, amount,
        billingCycle: 'monthly', nextBillingDate,
        category: editCategory, isActive: true, sharedMembers: [],
        icon: 'apps-outline', color: '#4A90D9',
      };
      addSubscription(sub);
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSuccess(true);
    Animated.spring(successAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }).start(() => {
      setTimeout(() => navigation.goBack(), 900);
    });
  };

  if (success) {
    return (
      <View style={[styles.root, styles.successContainer]}>
        <StatusBar style="dark" />
        <Animated.View style={[styles.successCircle, { transform: [{ scale: successAnim }], opacity: successAnim }]}>
          <Ionicons name="checkmark" size={52} color="#fff" />
        </Animated.View>
        <Text style={styles.successText}>Saved!</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => { if (step === 1) navigation.goBack(); else setStep(1); }} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.topTitle}>
          {step === 1 ? 'Scan Receipt' : step === 2 ? 'Reading…' : 'Review & Save'}
        </Text>
        <View style={styles.stepIndicator}>
          {([1, 2, 3] as const).map((s) => (
            <View key={s} style={[styles.stepDot, step >= s && styles.stepDotActive]} />
          ))}
        </View>
      </View>

      {step === 1 && (
        <View style={styles.captureContainer}>
          {!imageUri ? (
            <View style={styles.cameraPlaceholder}>
              <View style={styles.receiptFrame}>
                <View style={[styles.frameCorner, styles.tl]} />
                <View style={[styles.frameCorner, styles.tr]} />
                <View style={[styles.frameCorner, styles.bl]} />
                <View style={[styles.frameCorner, styles.br]} />
                <Ionicons name="receipt-outline" size={60} color="rgba(255,255,255,0.4)" />
                <Text style={styles.frameHint}>Position receipt here</Text>
              </View>
            </View>
          ) : (
            <View style={styles.previewContainer}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
            </View>
          )}

          {!imageUri ? (
            <View style={[styles.captureButtons, { paddingBottom: insets.bottom + 24 }]}>
              <Pressable onPress={pickFromLibrary} style={styles.libraryBtn}>
                <Ionicons name="images-outline" size={22} color="#fff" />
                <Text style={styles.libraryBtnText}>Library</Text>
              </Pressable>
              <Pressable onPress={pickFromCamera} style={styles.shutterBtn}>
                <View style={styles.shutterInner} />
              </Pressable>
              <View style={styles.shutterSpacer} />
            </View>
          ) : (
            <View style={[styles.previewActions, { paddingBottom: insets.bottom + 24 }]}>
              <Pressable onPress={() => { setImageUri(null); setImageBase64(null); }} style={styles.retakeBtn}>
                <Ionicons name="refresh" size={18} color="#fff" />
                <Text style={styles.retakeBtnText}>Retake</Text>
              </Pressable>
              <Pressable onPress={handleScan} style={styles.proceedBtn}>
                <Text style={styles.proceedBtnText}>Looks Good</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </Pressable>
            </View>
          )}
        </View>
      )}

      {step === 2 && (
        <View style={styles.scanningContainer}>
          {imageUri && (
            <View style={styles.scanImageWrap}>
              <Image source={{ uri: imageUri }} style={styles.scanImage} resizeMode="contain" />
              {scanning && (
                <Animated.View
                  style={[styles.scanLine, {
                    transform: [{
                      translateY: scanLineAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 240] }),
                    }],
                  }]}
                />
              )}
            </View>
          )}
          <View style={styles.scanStatus}>
            {scanError ? (
              <>
                <Ionicons name="alert-circle" size={36} color={colors.danger} />
                <Text style={styles.scanErrorText}>{scanError}</Text>
                <Pressable onPress={handleScan} style={styles.retryBtn}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </Pressable>
              </>
            ) : (
              <>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.readingText}>Reading receipt…</Text>
                <DotAnimation />
              </>
            )}
          </View>
        </View>
      )}

      {step === 3 && receipt && (
        <ScrollView contentContainerStyle={[styles.reviewContent, { paddingBottom: insets.bottom + 100 }]}>
          <View style={styles.confidenceBadge}>
            <Ionicons name={receipt.confidence >= 0.8 ? 'checkmark-circle' : 'alert-circle'} size={14} color={receipt.confidence >= 0.8 ? '#27AE60' : '#F5A623'} />
            <Text style={[styles.confidenceText, { color: receipt.confidence >= 0.8 ? '#27AE60' : '#F5A623' }]}>
              {Math.round(receipt.confidence * 100)}% confidence
            </Text>
          </View>

          <Text style={styles.fieldLabel}>Merchant</Text>
          <TextInput style={styles.fieldInput} value={editMerchant} onChangeText={setEditMerchant} placeholderTextColor={colors.textMuted} />

          <Text style={styles.fieldLabel}>Amount ($)</Text>
          <TextInput style={styles.fieldInput} value={editAmount} onChangeText={setEditAmount} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} />

          <Text style={styles.fieldLabel}>Date</Text>
          <TextInput style={styles.fieldInput} value={editDate} onChangeText={setEditDate} placeholderTextColor={colors.textMuted} />

          <Text style={styles.fieldLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {CATEGORIES.map((cat) => (
              <Pressable key={cat} onPress={() => setEditCategory(cat)} style={[styles.categoryPill, editCategory === cat && styles.categoryPillActive]}>
                <Text style={[styles.categoryPillText, editCategory === cat && styles.categoryPillTextActive]}>{cat}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.fieldLabel}>Save As</Text>
          <View style={styles.destGrid}>
            {((['transaction', 'bill', 'subscription'] as const)).map((dest) => {
              const isSelected = destination === dest;
              const isRecommended = dest === receipt.suggestedDestination;
              const icons: Record<string, string> = { transaction: 'swap-horizontal', bill: 'receipt', subscription: 'reload' };
              const labels: Record<string, string> = { transaction: 'Transaction', bill: 'Bill', subscription: 'Subscription' };
              const descs: Record<string, string> = {
                transaction: 'One-time expense',
                bill: 'Upcoming bill with due date',
                subscription: 'Recurring monthly charge',
              };
              return (
                <Pressable key={dest} onPress={() => setDestination(dest)}
                  style={[styles.destCard, isSelected && styles.destCardActive]}>
                  {isRecommended && (
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedText}>Recommended</Text>
                    </View>
                  )}
                  <Ionicons name={icons[dest] as 'swap-horizontal'} size={26} color={isSelected ? colors.primary : colors.textMuted} />
                  <Text style={[styles.destLabel, isSelected && styles.destLabelActive]}>{labels[dest]}</Text>
                  <Text style={styles.destDesc}>{descs[dest]}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      {step === 3 && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable onPress={handleDispatch} style={styles.dispatchBtn}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.dispatchBtnText}>Save & Dispatch</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function DotAnimation() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.stagger(200, [
        Animated.sequence([Animated.timing(dot1, { toValue: 1, duration: 400, useNativeDriver: true }), Animated.timing(dot1, { toValue: 0, duration: 400, useNativeDriver: true })]),
        Animated.sequence([Animated.timing(dot2, { toValue: 1, duration: 400, useNativeDriver: true }), Animated.timing(dot2, { toValue: 0, duration: 400, useNativeDriver: true })]),
        Animated.sequence([Animated.timing(dot3, { toValue: 1, duration: 400, useNativeDriver: true }), Animated.timing(dot3, { toValue: 0, duration: 400, useNativeDriver: true })]),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [dot1, dot2, dot3]);

  return (
    <View style={dotStyles.row}>
      {[dot1, dot2, dot3].map((anim, i) => (
        <Animated.View key={i} style={[dotStyles.dot, { opacity: anim }]} />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A1628' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
    paddingBottom: 8, backgroundColor: '#0A1628',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  topTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
  stepIndicator: { flexDirection: 'row', gap: 5 },
  stepDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)' },
  stepDotActive: { backgroundColor: '#4A90D9' },

  captureContainer: { flex: 1 },
  cameraPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#060E1C' },
  receiptFrame: { width: 260, height: 340, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  frameCorner: { position: 'absolute', width: 24, height: 24, borderColor: '#4A90D9', borderWidth: 2.5 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  frameHint: { fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 16, textAlign: 'center' },

  previewContainer: { flex: 1, backgroundColor: '#060E1C', alignItems: 'center', justifyContent: 'center', padding: 20 },
  previewImage: { width: '100%', height: '100%', borderRadius: 12 },

  captureButtons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 32, paddingTop: 20 },
  libraryBtn: { alignItems: 'center', gap: 6 },
  libraryBtnText: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  shutterBtn: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  shutterSpacer: { width: 44 },

  previewActions: { flexDirection: 'row', gap: 16, paddingHorizontal: 24, paddingTop: 20 },
  retakeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
  },
  retakeBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  proceedBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14, backgroundColor: colors.primary,
  },
  proceedBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  scanningContainer: { flex: 1, alignItems: 'center', paddingTop: 20 },
  scanImageWrap: { width: 220, height: 260, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  scanImage: { width: '100%', height: '100%' },
  scanLine: {
    position: 'absolute', left: 0, right: 0, top: 0, height: 2,
    backgroundColor: '#4A90D9', shadowColor: '#4A90D9',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8, elevation: 6,
  },
  scanStatus: { alignItems: 'center', marginTop: 32, gap: 12 },
  readingText: { fontSize: 18, fontWeight: '700', color: '#fff', marginTop: 8 },
  scanErrorText: { fontSize: 15, color: '#F87171', textAlign: 'center', marginHorizontal: 32 },
  retryBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28, marginTop: 8 },
  retryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  reviewContent: { paddingHorizontal: 20, paddingTop: 16 },
  confidenceBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card, borderRadius: 20, alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 12, marginBottom: 20, ...shadows.sm },
  confidenceText: { fontSize: 12, fontWeight: '700' },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#8BA3C7', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
    padding: 14, fontSize: 16, color: '#fff',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', marginBottom: 16,
  },
  categoryScroll: { marginBottom: 20 },
  categoryPill: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, marginRight: 8,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.06)',
  },
  categoryPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryPillText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  categoryPillTextActive: { color: '#fff' },

  destGrid: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  destCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14,
    padding: 14, alignItems: 'center', gap: 6, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)', position: 'relative', overflow: 'hidden',
  },
  destCardActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}22` },
  recommendedBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#10B981', borderBottomLeftRadius: 8, paddingVertical: 3, paddingHorizontal: 7 },
  recommendedText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  destLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  destLabelActive: { color: '#fff' },
  destDesc: { fontSize: 10, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 14 },

  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: '#0A1628', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  dispatchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16,
  },
  dispatchBtnText: { fontSize: 17, fontWeight: '800', color: '#fff' },

  successContainer: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0FFF4' },
  successCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#27AE60', alignItems: 'center', justifyContent: 'center', ...shadows.lg },
  successText: { fontSize: 20, fontWeight: '800', color: '#27AE60', marginTop: 20 },
});
