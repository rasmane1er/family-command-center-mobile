import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { useOperationsStore } from '../../store/useOperationsStore';
import type { Asset } from '../../types';

const categoryColors: Record<string, string> = {
  'Real Estate': '#27AE60',
  'Electronics': '#2980B9',
  'Furniture': '#F5A623',
  'Vehicle': '#E74C3C',
  'Jewelry': '#FFD700',
  'Other': '#95A5A6',
};

export function AssetsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { assets, vehicles } = useOperationsStore();

  const allAssets: Asset[] = [
    ...assets,
    ...vehicles.map((v) => ({
      id: v.id,
      familyId: v.familyId,
      name: `${v.year} ${v.make} ${v.model}`,
      category: 'Vehicle',
      value: 25000,
      createdAt: new Date().toISOString(),
    })),
  ];

  const totalAssets = allAssets.reduce((sum, a) => sum + a.value, 0);

  const grouped = allAssets.reduce((acc, a) => {
    if (!acc[a.category]) acc[a.category] = [];
    acc[a.category].push(a);
    return acc;
  }, {} as Record<string, typeof allAssets>);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#1A1A2E', '#16213E']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Asset Tracker</Text>
          <Pressable style={styles.addBtn}><Ionicons name="add" size={26} color="#fff" /></Pressable>
        </View>

        <Text style={styles.totalLabel}>Total Asset Value</Text>
        <Text style={styles.totalValue}>${totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
        <Text style={styles.totalSub}>{allAssets.length} assets tracked</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {Object.entries(grouped).map(([category, categoryAssets]) => {
          const catTotal = categoryAssets.reduce((sum, a) => sum + a.value, 0);
          return (
            <View key={category}>
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryDot, { backgroundColor: categoryColors[category] || '#95A5A6' }]} />
                <Text style={styles.categoryName}>{category}</Text>
                <Text style={styles.categoryTotal}>${catTotal.toLocaleString()}</Text>
              </View>
              {categoryAssets.map((asset) => (
                <Card key={asset.id} style={styles.assetCard} variant="elevated">
                  <View style={styles.assetRow}>
                    <View style={[styles.assetIcon, { backgroundColor: (categoryColors[asset.category] || '#95A5A6') + '22' }]}>
                      <Ionicons
                        name={asset.category === 'Real Estate' ? 'home' : asset.category === 'Vehicle' ? 'car' : asset.category === 'Electronics' ? 'laptop' : 'cube'}
                        size={22}
                        color={categoryColors[asset.category] || '#95A5A6'}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={styles.assetName}>{asset.name}</Text>
                      <Text style={styles.assetCategory}>{asset.category}</Text>
                      {asset.purchasePrice != null && (
                        <Text style={styles.assetAppreciation}>
                          Purchase: ${asset.purchasePrice.toLocaleString()} •{' '}
                          <Text style={{ color: asset.value > asset.purchasePrice! ? colors.success : colors.danger }}>
                            {asset.value > asset.purchasePrice! ? '+' : '-'}$
                            {Math.abs(asset.value - asset.purchasePrice!).toLocaleString()}
                          </Text>
                        </Text>
                      )}
                    </View>
                    <Text style={styles.assetValue}>${asset.value.toLocaleString()}</Text>
                  </View>
                </Card>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 28 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#fff' },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  totalLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginBottom: 6 },
  totalValue: { fontSize: 40, fontWeight: '800', color: '#fff', letterSpacing: -1, marginBottom: 4 },
  totalSub: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  content: { padding: 16 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 12 },
  categoryDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  categoryName: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  categoryTotal: { fontSize: 14, fontWeight: '700', color: colors.text },
  assetCard: { marginBottom: 10, borderRadius: 14 },
  assetRow: { flexDirection: 'row', alignItems: 'center' },
  assetIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  assetName: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 3 },
  assetCategory: { fontSize: 12, color: colors.textSecondary, marginBottom: 3 },
  assetAppreciation: { fontSize: 12, color: colors.textSecondary },
  assetValue: { fontSize: 18, fontWeight: '800', color: colors.text },
});
