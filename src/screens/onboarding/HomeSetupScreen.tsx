import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useFamilyStore } from '../../store/useFamilyStore';

const homeTypes = ['Single Family', 'Apartment', 'Condo', 'Townhouse', 'Mobile Home', 'Other'];
const homeTypeKeys: Record<string, string> = {
  'Single Family': 'homeTypeSingleFamily',
  'Apartment': 'homeTypeApartment',
  'Condo': 'homeTypeCondo',
  'Townhouse': 'homeTypeTownhouse',
  'Mobile Home': 'homeTypeMobileHome',
  'Other': 'homeTypeOther',
};

export function HomeSetupScreen({ navigation }: any) {
  const { t } = useTranslation('onboarding');
  const updateFamily = useFamilyStore((s) => s.updateFamily);
  const [homeType, setHomeType] = useState('Single Family');
  const [sqft, setSqft] = useState('');
  const [bedrooms, setBedrooms] = useState('3');
  const [rentOrOwn, setRentOrOwn] = useState<'own' | 'rent'>('own');

  const handleContinue = () => {
    const parsedSqft = parseInt(sqft.replace(/,/g, ''), 10);
    updateFamily({
      homeType,
      ...(isNaN(parsedSqft) ? {} : { squareFootage: parsedSqft }),
      bedrooms: bedrooms === '5+' ? 5 : parseInt(bedrooms, 10),
      ownsHome: rentOrOwn === 'own',
    });
    navigation.navigate('VehicleSetup');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <LinearGradient colors={['#0F2952', '#1E4A8A']} style={styles.header}>
          <View style={styles.headerTopRow}>
            <Pressable onPress={() => navigation.goBack()} style={styles.back}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>
            <Pressable onPress={() => navigation.navigate('VehicleSetup')} style={styles.skipBtn}>
              <Text style={styles.skipBtnText}>{t('onboarding.screens.homeSetup.skipBadge')}</Text>
            </Pressable>
          </View>
          <View style={styles.stepBadge}><Text style={styles.stepText}>{t('onboarding.screens.homeSetup.stepBadge')}</Text></View>
          <Text style={styles.headerTitle}>{t('onboarding.screens.homeSetup.title')}</Text>
          <Text style={styles.headerSub}>{t('onboarding.screens.homeSetup.subtitle')}</Text>
        </LinearGradient>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '43%' }]} />
        </View>

        <Text style={styles.sectionLabel}>{t('onboarding.screens.homeSetup.homeTypeLabel')}</Text>
        <View style={styles.chipGrid}>
          {homeTypes.map((ht) => (
            <Pressable
              key={ht}
              onPress={() => setHomeType(ht)}
              style={[styles.chip, homeType === ht && styles.chipActive]}
            >
              <Text style={[styles.chipText, homeType === ht && styles.chipTextActive]}>{t(`onboarding.screens.homeSetup.${homeTypeKeys[ht]}`)}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>{t('onboarding.screens.homeSetup.rentOrOwnLabel')}</Text>
        <View style={styles.toggleRow}>
          {(['own', 'rent'] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => setRentOrOwn(v)}
              style={[styles.toggleChip, rentOrOwn === v && styles.toggleChipActive]}
            >
              <Ionicons
                name={v === 'own' ? 'home' : 'key'}
                size={18}
                color={rentOrOwn === v ? '#fff' : colors.textSecondary}
              />
              <Text style={[styles.toggleChipText, rentOrOwn === v && styles.toggleChipTextActive]}>
                {v === 'own' ? t('onboarding.screens.homeSetup.own') : t('onboarding.screens.homeSetup.rent')}
              </Text>
            </Pressable>
          ))}
        </View>

        <Input
          label={t('onboarding.screens.homeSetup.sqftLabel')}
          placeholder={t('onboarding.screens.homeSetup.sqftPlaceholder')}
          value={sqft}
          onChangeText={setSqft}
          leftIcon="resize-outline"
          keyboardType="numeric"
        />

        <Text style={styles.sectionLabel}>{t('onboarding.screens.homeSetup.bedroomsLabel')}</Text>
        <View style={styles.countSelector}>
          {['1', '2', '3', '4', '5+'].map((n) => (
            <Pressable
              key={n}
              onPress={() => setBedrooms(n)}
              style={[styles.countChip, bedrooms === n && styles.countChipActive]}
            >
              <Text style={[styles.countText, bedrooms === n && styles.countTextActive]}>{n}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.skipCard}>
          <Ionicons name="information-circle-outline" size={20} color={colors.info} />
          <Text style={styles.skipInfo}>
            {t('onboarding.screens.homeSetup.infoText')}
          </Text>
        </View>

        <Button
          title={t('onboarding.screens.homeSetup.nextButton')}
          onPress={handleContinue}
          fullWidth
          size="lg"
          style={{ marginTop: 8 }}
          rightIcon={<Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />}
        />
        <Pressable onPress={() => navigation.navigate('VehicleSetup')} style={styles.skipButton}>
          <Text style={styles.skipText}>{t('onboarding.screens.homeSetup.skipForNow')}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 56, paddingBottom: 28, paddingHorizontal: 24 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  back: {},
  skipBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  skipBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  stepBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12, alignSelf: 'flex-start', marginBottom: 12 },
  stepText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 6 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  progressBar: { height: 4, backgroundColor: colors.border, borderRadius: 2, marginBottom: 28 },
  progressFill: { height: 4, backgroundColor: colors.secondary, borderRadius: 2 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 12 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  chipActive: { borderColor: colors.primary, backgroundColor: '#E8EEF9' },
  chipText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: colors.primary, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  toggleChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  toggleChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  toggleChipText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  toggleChipTextActive: { color: '#fff' },
  countSelector: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  countChip: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center' },
  countChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  countText: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
  countTextActive: { color: '#fff' },
  skipCard: { flexDirection: 'row', gap: 10, backgroundColor: colors.infoLight, borderRadius: 12, padding: 14, marginBottom: 24, alignItems: 'flex-start' },
  skipInfo: { flex: 1, fontSize: 13, color: colors.info, lineHeight: 20 },
  skipButton: { alignItems: 'center', paddingVertical: 16 },
  skipText: { color: colors.textMuted, fontSize: 14 },
});
