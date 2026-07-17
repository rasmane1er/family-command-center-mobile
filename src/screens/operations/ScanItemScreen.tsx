import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Button } from '../../components/common/Button';
import { useOperationsStore } from '../../store/useOperationsStore';
import { useAuthStore } from '../../store/useAuthStore';
import { lookupBarcode } from '../../services/barcodeService';
import { scanPantryPhoto } from '../../services/pantryService';
import type { PantryItem } from '../../types';
import { PANTRY_CATEGORIES } from '../../constants/pantry';

import { generateId } from '../../utils/generateId';
const CATEGORIES = PANTRY_CATEGORIES;

type ScanMode = 'barcode' | 'photo';
type ScanState = 'scanning' | 'looking-up' | 'confirming' | 'not-found' | 'analyzing-photo' | 'reviewing-photo';

interface ReviewItem {
  name: string;
  category: string;
  selected: boolean;
}

// Barcode and AI-camera modes of Smart Pantry Scan — the receipt-scan mode
// lives in ReceiptScannerScreen, but all three converge on the same "user
// confirms before it's saved" step this screen also uses.
export function ScanItemScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<ScanMode>('barcode');
  const [state, setState] = useState<ScanState>('scanning');
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('Produce');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('pcs');
  const [location, setLocation] = useState('Pantry');
  const [expiryDate, setExpiryDate] = useState('');

  const addPantryItem = useOperationsStore((s) => s.addPantryItem);
  const addPantryItemsBulk = useOperationsStore((s) => s.addPantryItemsBulk);
  const familyId = useAuthStore.getState().familyId ?? '';

  const takePantryPhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'] as ImagePicker.MediaType[],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;

    setState('analyzing-photo');
    try {
      const { items } = await scanPantryPhoto(result.assets[0].base64);
      if (items.length === 0) {
        Alert.alert('No items found', "Couldn't identify any items in that photo. Try again with better lighting.");
        setState('scanning');
        return;
      }
      setReviewItems(items.map((i) => ({ name: i.name, category: i.category, selected: true })));
      setState('reviewing-photo');
    } catch {
      Alert.alert('Scan failed', 'Could not analyze the photo. Check your connection and try again.');
      setState('scanning');
    }
  };

  const toggleReviewItem = (index: number) => {
    setReviewItems((prev) => prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item)));
  };

  const handleAddReviewedItems = () => {
    const selected = reviewItems.filter((i) => i.selected);
    if (selected.length === 0) return;
    const items: PantryItem[] = selected.map((i) => ({
      id: generateId(),
      familyId,
      name: i.name,
      category: i.category,
      quantity: 1,
      unit: 'pcs',
      location: 'Pantry',
      updatedAt: new Date().toISOString(),
    }));
    addPantryItemsBulk(items);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (state !== 'scanning') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setScannedBarcode(data);
    setState('looking-up');

    const product = await lookupBarcode(data);
    if (!product) {
      setState('not-found');
      return;
    }

    setName(product.name);
    setBrand(product.brand ?? '');
    setCategory(product.category);
    setUnit(product.size ?? 'pcs');
    setImageUrl(product.imageUrl);
    setState('confirming');
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const item: PantryItem = {
      id: generateId(),
      familyId,
      name: name.trim(),
      brand: brand.trim() || undefined,
      category,
      quantity: parseFloat(quantity) || 1,
      unit: unit.trim() || 'pcs',
      location: location.trim() || 'Pantry',
      expiryDate: expiryDate.trim() || undefined,
      barcode: scannedBarcode ?? undefined,
      imageUrl,
      updatedAt: new Date().toISOString(),
    };
    addPantryItem(item);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
  };

  const resetScan = () => {
    setState('scanning');
    setScannedBarcode(null);
    setImageUrl(undefined);
    setReviewItems([]);
    setName(''); setBrand(''); setCategory('Produce');
    setQuantity('1'); setUnit('pcs'); setLocation('Pantry'); setExpiryDate('');
  };

  if (state === 'reviewing-photo') {
    const selectedCount = reviewItems.filter((i) => i.selected).length;
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Pressable onPress={resetScan} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Confirm Items</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={styles.form}>
          <Text style={styles.reviewIntro}>
            I found {reviewItems.length} item{reviewItems.length === 1 ? '' : 's'}. Uncheck anything that's wrong or already in your pantry:
          </Text>
          {reviewItems.map((item, index) => (
            <Pressable key={`${item.name}-${index}`} onPress={() => toggleReviewItem(index)} style={styles.reviewRow}>
              <Ionicons
                name={item.selected ? 'checkbox' : 'square-outline'}
                size={22}
                color={item.selected ? colors.success : colors.textMuted}
              />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.reviewItemName}>{item.name}</Text>
                <Text style={styles.reviewItemCategory}>{item.category}</Text>
              </View>
            </Pressable>
          ))}

          <Button
            title={`Add ${selectedCount} Item${selectedCount === 1 ? '' : 's'} to Pantry`}
            onPress={handleAddReviewedItems}
            fullWidth
            size="lg"
            disabled={selectedCount === 0}
            style={{ marginTop: 16 }}
          />
          <Button title="Retake Photo" onPress={resetScan} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </View>
    );
  }

  if (state === 'confirming' || state === 'not-found') {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Pressable onPress={resetScan} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>{state === 'not-found' ? 'Not Found — Add Manually' : 'Confirm Item'}</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={styles.form}>
          {state === 'not-found' && (
            <View style={styles.notFoundBanner}>
              <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
              <Text style={styles.notFoundText}>
                No product found for barcode {scannedBarcode}. Enter the details below to add it anyway.
              </Text>
            </View>
          )}

          {imageUrl && <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="contain" />}

          <Text style={styles.label}>Item Name *</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Whole Milk" placeholderTextColor={colors.textMuted} autoFocus={state === 'not-found'} />

          <Text style={styles.label}>Brand</Text>
          <TextInput style={styles.input} value={brand} onChangeText={setBrand} placeholder="e.g. Organic Valley" placeholderTextColor={colors.textMuted} />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Quantity</Text>
              <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.label}>Unit</Text>
              <TextInput style={styles.input} value={unit} onChangeText={setUnit} placeholder="pcs / lbs / oz" placeholderTextColor={colors.textMuted} />
            </View>
          </View>

          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {CATEGORIES.map((cat) => (
              <Pressable key={cat} onPress={() => setCategory(cat)} style={[styles.catChip, category === cat && styles.catChipActive]}>
                <Text style={[styles.catText, category === cat && styles.catTextActive]}>{cat}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.label}>Storage Location</Text>
          <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="e.g. Pantry, Fridge, Freezer" placeholderTextColor={colors.textMuted} />

          <Text style={styles.label}>Expiry Date (YYYY-MM-DD)</Text>
          <TextInput style={[styles.input, { marginBottom: 24 }]} value={expiryDate} onChangeText={setExpiryDate} placeholder="Optional" placeholderTextColor={colors.textMuted} />

          <Button title="Add to Pantry" onPress={handleSave} fullWidth size="lg" disabled={!name.trim()} />
          <Button title="Scan Again" onPress={resetScan} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Scan Item</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.modeToggle}>
        <Pressable onPress={() => setMode('barcode')} style={[styles.modeBtn, mode === 'barcode' && styles.modeBtnActive]}>
          <Ionicons name="barcode-outline" size={16} color={mode === 'barcode' ? '#fff' : colors.textSecondary} />
          <Text style={[styles.modeBtnText, mode === 'barcode' && styles.modeBtnTextActive]}>Barcode</Text>
        </Pressable>
        <Pressable onPress={() => setMode('photo')} style={[styles.modeBtn, mode === 'photo' && styles.modeBtnActive]}>
          <Ionicons name="sparkles-outline" size={16} color={mode === 'photo' ? '#fff' : colors.textSecondary} />
          <Text style={[styles.modeBtnText, mode === 'photo' && styles.modeBtnTextActive]}>AI Photo</Text>
        </Pressable>
      </View>

      <View style={styles.cameraWrap}>
        {permission?.granted ? (
          mode === 'barcode' ? (
            <>
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
                onBarcodeScanned={state === 'scanning' ? handleBarcodeScanned : undefined}
              />
              <View style={styles.scanOverlay}>
                <View style={styles.scanFrame}>
                  <View style={[styles.corner, styles.cornerTopLeft]} />
                  <View style={[styles.corner, styles.cornerTopRight]} />
                  <View style={[styles.corner, styles.cornerBottomLeft]} />
                  <View style={[styles.corner, styles.cornerBottomRight]} />
                </View>
                <Text style={styles.scanHint}>
                  {state === 'looking-up' ? 'Looking up product…' : 'Position the barcode inside the frame'}
                </Text>
                {state === 'looking-up' && <ActivityIndicator color="#fff" size="small" style={{ marginTop: 12 }} />}
              </View>
            </>
          ) : (
            <View style={styles.photoModeWrap}>
              <Ionicons name="fast-food-outline" size={48} color="rgba(255,255,255,0.5)" />
              <Text style={styles.scanHint}>
                {state === 'analyzing-photo' ? 'Analyzing photo…' : 'Take a photo of your pantry, fridge, or countertop and AI will suggest items to add'}
              </Text>
              {state === 'analyzing-photo' ? (
                <ActivityIndicator color="#fff" size="small" style={{ marginTop: 16 }} />
              ) : (
                <Pressable onPress={takePantryPhoto} style={styles.captureBtn}>
                  <Ionicons name="camera" size={26} color="#fff" />
                </Pressable>
              )}
            </View>
          )
        ) : (
          <View style={styles.permissionPlaceholder}>
            <Ionicons name="camera-outline" size={40} color={colors.textMuted} />
            <Text style={styles.permissionText}>Camera access is needed to scan items.</Text>
            <Button title="Allow Camera" onPress={requestPermission} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  cameraWrap: { flex: 1, margin: 16, borderRadius: 20, overflow: 'hidden', backgroundColor: '#000' },
  scanOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)', padding: 20 },
  scanFrame: { width: 260, height: 140, position: 'relative' },
  corner: { position: 'absolute', width: 36, height: 36, borderColor: '#fff' },
  cornerTopLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 },
  cornerTopRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 },
  cornerBottomLeft: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 },
  cornerBottomRight: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 16 },
  scanHint: { color: '#fff', fontSize: 13, fontWeight: '600', marginTop: 20, textAlign: 'center' },
  permissionPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  permissionText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  form: { padding: 20, paddingBottom: 40 },
  notFoundBanner: { flexDirection: 'row', gap: 8, backgroundColor: colors.warningLight, borderRadius: 12, padding: 12, marginBottom: 16, alignItems: 'flex-start' },
  notFoundText: { flex: 1, fontSize: 12.5, color: colors.text, lineHeight: 18 },
  productImage: { width: 100, height: 100, alignSelf: 'center', marginBottom: 16, borderRadius: 12 },
  label: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.card, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, borderWidth: 1.5, borderColor: colors.border, marginBottom: 16 },
  row: { flexDirection: 'row' },
  catChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: 'transparent', backgroundColor: colors.card, marginRight: 8 },
  catChipActive: { borderColor: colors.success, backgroundColor: '#D5F5E3' },
  catText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  catTextActive: { color: colors.success },
  modeToggle: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 4 },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.card },
  modeBtnActive: { backgroundColor: colors.success },
  modeBtnText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  modeBtnTextActive: { color: '#fff' },
  photoModeWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 8 },
  captureBtn: { marginTop: 20, width: 64, height: 64, borderRadius: 32, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  reviewIntro: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 16 },
  reviewRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: colors.border },
  reviewItemName: { fontSize: 15, fontWeight: '700', color: colors.text },
  reviewItemCategory: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
