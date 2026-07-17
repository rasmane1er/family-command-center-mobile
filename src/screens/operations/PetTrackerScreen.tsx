import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/spacing';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { usePetStore, PetSpecies, PetEventType, Pet } from '../../store/usePetStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useFamilyStore } from '../../store/useFamilyStore';
import { getPetCharges, type PetCharge } from '../../services/autoFillService';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useTranslation } from 'react-i18next';

import { generateId } from '../../utils/generateId';

const SPECIES_OPTIONS: { value: PetSpecies; label: string; emoji: string; color: string }[] = [
  { value: 'dog', label: 'Dog', emoji: '🐕', color: '#F5A623' },
  { value: 'cat', label: 'Cat', emoji: '🐈', color: '#8E44AD' },
  { value: 'bird', label: 'Bird', emoji: '🐦', color: '#2980B9' },
  { value: 'fish', label: 'Fish', emoji: '🐟', color: '#16A085' },
  { value: 'rabbit', label: 'Rabbit', emoji: '🐰', color: '#E91E63' },
  { value: 'other', label: 'Other', emoji: '🐾', color: '#7F8C8D' },
];

const EVENT_TYPES: { value: PetEventType; label: string; icon: string }[] = [
  { value: 'vet', label: 'Vet', icon: 'medical' },
  { value: 'grooming', label: 'Grooming', icon: 'cut' },
  { value: 'medication', label: 'Medication', icon: 'medical-outline' },
  { value: 'vaccine', label: 'Vaccine', icon: 'shield-checkmark' },
  { value: 'feeding', label: 'Feeding', icon: 'nutrition' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];

const HEALTH_TIPS: Record<PetSpecies, string[]> = {
  dog: [
    'Annual vet checkups recommended',
    'Rabies, DHPP, Bordetella vaccines',
    'Monthly heartworm prevention',
    'Dental cleaning every 1-2 years',
    'Exercise daily for mental health',
  ],
  cat: [
    'Annual vet checkups for indoor cats',
    'Rabies, FVRCP core vaccines',
    'Dental disease affects 70% of cats over 3',
    'Fresh water daily, wet food is beneficial',
    'Enrichment prevents behavioral issues',
  ],
  bird: [
    'Annual wellness exams recommended',
    'Fresh fruits and veggies daily',
    'Avoid Teflon cookware (toxic fumes)',
    'Socialize regularly to prevent loneliness',
    'Sunlight or UVB lighting important',
  ],
  fish: [
    'Test water parameters weekly',
    'Partial water changes (25%) weekly',
    'Do not overfeed - leads to poor water quality',
    'Quarantine new fish for 2-4 weeks',
    'Monitor for signs of ich or fin rot',
  ],
  rabbit: [
    'Annual vet checkups recommended',
    'Hay should be 80% of their diet',
    'Spay/neuter reduces cancer risk significantly',
    'Rabbits are social — consider a bonded pair',
    'Bunny-proof your home from wires and cables',
  ],
  other: [
    'Schedule a vet checkup annually',
    'Research species-specific diet requirements',
    'Provide appropriate enrichment and habitat',
    'Monitor for signs of illness or stress',
    'Keep vaccinations and records up to date',
  ],
};

function calcAge(dateOfBirth?: string): string {
  if (!dateOfBirth) return 'Unknown age';
  const dob = new Date(dateOfBirth);
  const now = new Date();
  const years = now.getFullYear() - dob.getFullYear();
  const months = now.getMonth() - dob.getMonth();
  const totalMonths = years * 12 + months;
  if (totalMonths < 12) return `${totalMonths} mo`;
  if (totalMonths < 24) return `1 yr ${totalMonths - 12} mo`;
  return `${Math.floor(totalMonths / 12)} yrs`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(dateStr: string): boolean {
  return new Date(dateStr) < new Date(new Date().toDateString());
}

export function PetTrackerScreen({ navigation }: any) {
  const { t } = useTranslation('ops');
  const insets = useSafeAreaInsets();
  const { pets, events, addPet, deletePet, addEvent, toggleEvent, deleteEvent, isLoaded, fetchFromServer } = usePetStore();
  const family = useFamilyStore((s) => s.family);

  const [activeTab, setActiveTab] = useState<'pets' | 'events' | 'health'>('pets');
  const [showAddPetModal, setShowAddPetModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);

  // Add Pet form state
  const [petName, setPetName] = useState('');
  const [petSpecies, setPetSpecies] = useState<PetSpecies>('dog');
  const [petBreed, setPetBreed] = useState('');
  const [petDob, setPetDob] = useState('');
  const [petWeight, setPetWeight] = useState('');
  const [petVetName, setPetVetName] = useState('');
  const [petVetPhone, setPetVetPhone] = useState('');
  const [petNotes, setPetNotes] = useState('');

  // Add Event form state
  const [evPetId, setEvPetId] = useState('');
  const [evType, setEvType] = useState<PetEventType>('vet');
  const [evTitle, setEvTitle] = useState('');
  const [evDate, setEvDate] = useState('');
  const [evCost, setEvCost] = useState('');
  const [evNotes, setEvNotes] = useState('');

  const upcomingCount = events.filter((e) => !e.isDone).length;

  const [vetCharges, setVetCharges] = useState<PetCharge[]>([]);
  const [vetBannerExpanded, setVetBannerExpanded] = useState(true);
  const [dismissedCharges, setDismissedCharges] = useState<Set<string>>(new Set());
  const [selectedPetForCharge, setSelectedPetForCharge] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isLoaded) fetchFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    getPetCharges()
      .then((res) => {
        const vetOnly = res.charges.filter((c) => c.isVetVisit);
        setVetCharges(vetOnly);
      })
      .catch(() => {
        // Silently fail if Plaid not connected
      });
  }, []);

  const resetPetForm = () => {
    setPetName(''); setPetSpecies('dog'); setPetBreed(''); setPetDob('');
    setPetWeight(''); setPetVetName(''); setPetVetPhone(''); setPetNotes('');
  };

  const resetEventForm = () => {
    setEvPetId(''); setEvType('vet'); setEvTitle(''); setEvDate('');
    setEvCost(''); setEvNotes('');
  };

  const handleAddPet = () => {
    if (!petName.trim()) return;
    const speciesInfo = SPECIES_OPTIONS.find((s) => s.value === petSpecies)!;
    addPet({
      familyId: useAuthStore.getState().familyId ?? family?.id ?? '',
      name: petName.trim(),
      species: petSpecies,
      breed: petBreed.trim() || undefined,
      dateOfBirth: petDob.trim() || undefined,
      weight: petWeight ? parseFloat(petWeight) : undefined,
      vetName: petVetName.trim() || undefined,
      vetPhone: petVetPhone.trim() || undefined,
      notes: petNotes.trim() || undefined,
      avatarColor: speciesInfo.color,
      emoji: speciesInfo.emoji,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetPetForm();
    setShowAddPetModal(false);
  };

  const handleAddEvent = () => {
    if (!evTitle.trim() || !evDate.trim() || !evPetId) return;
    addEvent({
      petId: evPetId,
      type: evType,
      title: evTitle.trim(),
      date: evDate.trim(),
      notes: evNotes.trim() || undefined,
      isDone: false,
      cost: evCost ? parseFloat(evCost) : undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetEventForm();
    setShowAddEventModal(false);
  };

  const handleDeletePet = (pet: Pet) => {
    Alert.alert(t('common.removeTitle'), `Remove ${pet.name} from your family?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: () => {
          deletePet(pet.id);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  };

  const pendingEvents = events.filter((e) => !e.isDone).sort((a, b) => a.date.localeCompare(b.date));
  const doneEvents = events.filter((e) => e.isDone).sort((a, b) => b.date.localeCompare(a.date));

  const renderPetsTab = () => (
    <View style={styles.tabContent}>
      {pets.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🐾</Text>
          <Text style={styles.emptyTitle}>No pets yet</Text>
          <Text style={styles.emptyDesc}>Add your furry, feathered, or scaly family members</Text>
        </View>
      )}
      <View style={styles.petGrid}>
        {pets.map((pet) => {
          const speciesInfo = SPECIES_OPTIONS.find((s) => s.value === pet.species)!;
          return (
            <Pressable
              key={pet.id}
              onLongPress={() => handleDeletePet(pet)}
              style={styles.petCardWrapper}
            >
              <Card style={styles.petCard} variant="elevated">
                <View style={[styles.petAvatarBg, { backgroundColor: speciesInfo.color + '22' }]}>
                  <Text style={styles.petEmoji}>{pet.emoji}</Text>
                </View>
                <Text style={styles.petName}>{pet.name}</Text>
                <Text style={styles.petSpecies}>{speciesInfo.label}</Text>
                {pet.breed ? <Text style={styles.petBreed}>{pet.breed}</Text> : null}
                <Text style={styles.petAge}>{calcAge(pet.dateOfBirth)}</Text>
                {pet.weight ? (
                  <Text style={styles.petDetail}>{pet.weight} lbs</Text>
                ) : null}
                {pet.vetName ? (
                  <View style={styles.petVetRow}>
                    <Ionicons name="medical-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.petVetText}>{pet.vetName}</Text>
                  </View>
                ) : null}
                <Text style={styles.longPressHint}>Hold to remove</Text>
              </Card>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const renderEventsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.eventsHeader}>
        <Text style={styles.sectionTitle}>Upcoming ({pendingEvents.length})</Text>
        <Pressable onPress={() => { setShowAddEventModal(true); if (pets.length > 0) setEvPetId(pets[0].id); }} style={styles.addEventBtn}>
          <Ionicons name="add-circle" size={22} color={colors.primary} />
          <Text style={styles.addEventText}>Add Event</Text>
        </Pressable>
      </View>

      {pendingEvents.length === 0 && (
        <View style={styles.emptyInline}>
          <Text style={styles.emptyInlineText}>No upcoming events</Text>
        </View>
      )}

      {pendingEvents.map((ev) => {
        const pet = pets.find((p) => p.id === ev.petId);
        const evTypeInfo = EVENT_TYPES.find((t) => t.value === ev.type)!;
        const overdue = isOverdue(ev.date);
        return (
          <Pressable key={ev.id} onPress={() => { toggleEvent(ev.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
            <Card style={styles.eventCard} variant="elevated">
              <View style={styles.eventRow}>
                <View style={[styles.eventIconBg, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name={evTypeInfo.icon as any} size={20} color={colors.primary} />
                </View>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{ev.title}</Text>
                  <Text style={styles.eventPetName}>{pet?.emoji} {pet?.name}</Text>
                  <Text style={[styles.eventDate, overdue && styles.overdueText]}>
                    {overdue ? 'Overdue: ' : ''}{formatDate(ev.date)}
                  </Text>
                  {ev.notes ? <Text style={styles.eventNotes}>{ev.notes}</Text> : null}
                </View>
                <View style={styles.eventRight}>
                  {ev.cost ? <Text style={styles.eventCost}>${ev.cost}</Text> : null}
                  <Badge label={evTypeInfo.label} variant="neutral" size="sm" />
                  <Pressable onPress={() => deleteEvent(ev.id)} style={styles.deleteIconBtn}>
                    <Ionicons name="trash-outline" size={14} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
            </Card>
          </Pressable>
        );
      })}

      {doneEvents.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Completed ({doneEvents.length})</Text>
          {doneEvents.map((ev) => {
            const pet = pets.find((p) => p.id === ev.petId);
            const evTypeInfo = EVENT_TYPES.find((t) => t.value === ev.type)!;
            return (
              <Pressable key={ev.id} onPress={() => { toggleEvent(ev.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                <Card style={{ ...styles.eventCard, ...styles.doneCard } as ViewStyle} variant="default">
                  <View style={styles.eventRow}>
                    <View style={[styles.eventIconBg, { backgroundColor: colors.success + '15' }]}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    </View>
                    <View style={styles.eventInfo}>
                      <Text style={[styles.eventTitle, styles.doneText]}>{ev.title}</Text>
                      <Text style={styles.eventPetName}>{pet?.emoji} {pet?.name}</Text>
                      <Text style={styles.eventDate}>{formatDate(ev.date)}</Text>
                    </View>
                    <View style={styles.eventRight}>
                      {ev.cost ? <Text style={styles.eventCost}>${ev.cost}</Text> : null}
                      <Badge label="Done" variant="success" size="sm" />
                    </View>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </>
      )}
    </View>
  );

  const renderHealthTab = () => {
    const allSpecies = [...new Set(pets.map((p) => p.species))];
    const displaySpecies = allSpecies.length > 0 ? allSpecies : (['dog', 'cat'] as PetSpecies[]);

    return (
      <View style={styles.tabContent}>
        <Card style={styles.healthStatsCard} variant="elevated">
          <Text style={styles.healthCardTitle}>Pet Health Overview</Text>
          <View style={styles.healthStats}>
            <View style={styles.healthStat}>
              <Text style={styles.healthStatNum}>{pets.length}</Text>
              <Text style={styles.healthStatLabel}>Total Pets</Text>
            </View>
            <View style={styles.healthStat}>
              <Text style={styles.healthStatNum}>{upcomingCount}</Text>
              <Text style={styles.healthStatLabel}>Upcoming</Text>
            </View>
            <View style={styles.healthStat}>
              <Text style={styles.healthStatNum}>{doneEvents.length}</Text>
              <Text style={styles.healthStatLabel}>Completed</Text>
            </View>
          </View>
        </Card>

        {displaySpecies.map((species) => {
          const speciesInfo = SPECIES_OPTIONS.find((s) => s.value === species)!;
          const tips = HEALTH_TIPS[species];
          return (
            <Card key={species} style={styles.healthTipsCard} variant="elevated">
              <View style={styles.healthTipsHeader}>
                <Text style={styles.healthTipsEmoji}>{speciesInfo.emoji}</Text>
                <Text style={styles.healthTipsTitle}>{speciesInfo.label} Health Tips</Text>
              </View>
              {tips.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <View style={[styles.tipDot, { backgroundColor: speciesInfo.color }]} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </Card>
          );
        })}

        <Card style={styles.vaccineCard} variant="elevated">
          <Text style={styles.vaccineTitle}>Vaccination Reminders</Text>
          {pets.length === 0 ? (
            <Text style={styles.vaccinePlaceholder}>Add pets to see vaccination schedules</Text>
          ) : (
            pets.map((pet) => {
              const vaccineEvents = events.filter((e) => e.petId === pet.id && e.type === 'vaccine');
              return (
                <View key={pet.id} style={styles.vaccineRow}>
                  <Text style={styles.vaccineEmoji}>{pet.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vaccinePetName}>{pet.name}</Text>
                    {vaccineEvents.length > 0 ? (
                      vaccineEvents.map((v) => (
                        <Text key={v.id} style={styles.vaccineEvent}>
                          {v.title} — {formatDate(v.date)} {v.isDone ? '✓' : ''}
                        </Text>
                      ))
                    ) : (
                      <Text style={styles.vaccineNoEvents}>No vaccine events scheduled</Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </Card>
      </View>
    );
  };

  const screenHeader = (
    <LinearGradient colors={['#1B5E20', '#388E3C']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <View style={styles.headerTop}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('petTracker.title')}</Text>
        <Pressable onPress={() => setShowAddPetModal(true)} style={styles.addBtn}>
          <Ionicons name="add" size={26} color="#fff" />
        </Pressable>
      </View>
      <View style={styles.headerStats}>
        <View style={styles.headerStat}>
          <Text style={styles.headerStatNum}>{pets.length}</Text>
          <Text style={styles.headerStatLabel}>Pets</Text>
        </View>
        <View style={styles.headerStatDivider} />
        <View style={styles.headerStat}>
          <Text style={styles.headerStatNum}>{upcomingCount}</Text>
          <Text style={styles.headerStatLabel}>Upcoming Events</Text>
        </View>
      </View>
    </LinearGradient>
  );

  const screenCompact = (
    <LinearGradient colors={['#1B5E20', '#388E3C']} style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Text style={styles.headerTitle}>{t('petTracker.title')}</Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>{pets.length} pets</Text>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
          <ScrollView
            contentContainerStyle={{ paddingTop: contentPaddingTop + 12, paddingBottom: 100 }}
            onScroll={onScroll}
            onScrollEndDrag={onScrollEndDrag}
            onMomentumScrollEnd={onMomentumScrollEnd}
            scrollEventThrottle={scrollEventThrottle}
            showsVerticalScrollIndicator={false}
          >
            {vetCharges.length > 0 && (
              <View style={styles.vetBanner}>
                <Pressable onPress={() => setVetBannerExpanded((v) => !v)} style={styles.vetBannerHeader}>
                  <Ionicons name="medical" size={16} color="#1B5E20" />
                  <Text style={styles.vetBannerTitle}>Detected {vetCharges.length} vet charge(s)</Text>
                  <Ionicons name={vetBannerExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#1B5E20" />
                </Pressable>
                {vetBannerExpanded && vetCharges
                  .filter((c) => !dismissedCharges.has(c.merchantName + c.date))
                  .map((charge, i) => {
                    const chargeKey = charge.merchantName + charge.date;
                    return (
                      <View key={i} style={styles.vetChargeRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.vetChargeMerchant}>{charge.merchantName}</Text>
                          <Text style={styles.vetChargeDetail}>${charge.amount} · {charge.date}</Text>
                        </View>
                        {pets.length > 0 && (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxWidth: 120 }}>
                            {pets.map((p) => (
                              <Pressable
                                key={p.id}
                                onPress={() => setSelectedPetForCharge((prev) => ({ ...prev, [chargeKey]: p.id }))}
                                style={[styles.vetPetChip, selectedPetForCharge[chargeKey] === p.id && styles.vetPetChipActive]}
                              >
                                <Text style={styles.vetPetChipText}>{p.emoji}</Text>
                              </Pressable>
                            ))}
                          </ScrollView>
                        )}
                        <Pressable
                          onPress={() => {
                            const petId = selectedPetForCharge[chargeKey] ?? (pets[0]?.id ?? '');
                            if (!petId) {
                              Alert.alert('No Pet', 'Add a pet first.');
                              return;
                            }
                            addEvent({
                              petId,
                              type: 'vet',
                              title: charge.merchantName,
                              date: charge.date,
                              cost: charge.amount,
                              isDone: true,
                            });
                            setDismissedCharges((prev) => new Set([...prev, chargeKey]));
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          }}
                          style={styles.vetLogBtn}
                        >
                          <Text style={styles.vetLogBtnText}>Log</Text>
                        </Pressable>
                        <Pressable onPress={() => setDismissedCharges((prev) => new Set([...prev, chargeKey]))} style={styles.vetDismissBtn}>
                          <Ionicons name="close" size={14} color={colors.textMuted} />
                        </Pressable>
                      </View>
                    );
                  })}
              </View>
            )}

            <View style={styles.tabs}>
              {(['pets', 'events', 'health'] as const).map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[styles.tab, activeTab === tab && styles.tabActive]}
                >
                  <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {activeTab === 'pets' && renderPetsTab()}
            {activeTab === 'events' && renderEventsTab()}
            {activeTab === 'health' && renderHealthTab()}
          </ScrollView>
        )}
      </CollapsibleHeader>

      {/* Add Pet Modal */}
      <Modal visible={showAddPetModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddPetModal(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Pet</Text>

          <Text style={styles.modalLabel}>Name *</Text>
          <TextInput style={styles.modalInput} placeholder="Pet name" value={petName} onChangeText={setPetName} placeholderTextColor={colors.textMuted} autoFocus />

          <Text style={styles.modalLabel}>Species *</Text>
          <View style={styles.speciesGrid}>
            {SPECIES_OPTIONS.map((s) => (
              <Pressable
                key={s.value}
                onPress={() => setPetSpecies(s.value)}
                style={[styles.speciesChip, petSpecies === s.value && { borderColor: s.color, backgroundColor: s.color + '15' }]}
              >
                <Text style={styles.speciesEmoji}>{s.emoji}</Text>
                <Text style={[styles.speciesLabel, petSpecies === s.value && { color: s.color }]}>{s.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.modalLabel}>Breed</Text>
          <TextInput style={styles.modalInput} placeholder="e.g. Golden Retriever" value={petBreed} onChangeText={setPetBreed} placeholderTextColor={colors.textMuted} />

          <Text style={styles.modalLabel}>Date of Birth (YYYY-MM-DD)</Text>
          <TextInput style={styles.modalInput} placeholder="2020-03-15" value={petDob} onChangeText={setPetDob} placeholderTextColor={colors.textMuted} />

          <Text style={styles.modalLabel}>Weight (lbs)</Text>
          <TextInput style={styles.modalInput} placeholder="e.g. 65" value={petWeight} onChangeText={setPetWeight} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} />

          <Text style={styles.modalLabel}>Vet Name</Text>
          <TextInput style={styles.modalInput} placeholder="Dr. Smith" value={petVetName} onChangeText={setPetVetName} placeholderTextColor={colors.textMuted} />

          <Text style={styles.modalLabel}>Vet Phone</Text>
          <TextInput style={styles.modalInput} placeholder="555-0180" value={petVetPhone} onChangeText={setPetVetPhone} keyboardType="phone-pad" placeholderTextColor={colors.textMuted} />

          <Text style={styles.modalLabel}>Notes</Text>
          <TextInput style={[styles.modalInput, styles.modalTextarea]} placeholder="Any special notes..." value={petNotes} onChangeText={setPetNotes} multiline numberOfLines={3} placeholderTextColor={colors.textMuted} />

          <Button title="Add Pet" onPress={handleAddPet} fullWidth size="lg" disabled={!petName.trim()} />
          <Button title="Cancel" onPress={() => { resetPetForm(); setShowAddPetModal(false); }} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>

      {/* Add Event Modal */}
      <Modal visible={showAddEventModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddEventModal(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Pet Event</Text>

          <Text style={styles.modalLabel}>Pet *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {pets.map((p) => (
              <Pressable key={p.id} onPress={() => setEvPetId(p.id)} style={[styles.petChip, evPetId === p.id && styles.petChipActive]}>
                <Text style={styles.petChipEmoji}>{p.emoji}</Text>
                <Text style={styles.petChipName}>{p.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.modalLabel}>Event Type *</Text>
          <View style={styles.eventTypeGrid}>
            {EVENT_TYPES.map((et) => (
              <Pressable key={et.value} onPress={() => setEvType(et.value)} style={[styles.eventTypeChip, evType === et.value && styles.eventTypeChipActive]}>
                <Ionicons name={et.icon as any} size={16} color={evType === et.value ? colors.primary : colors.textSecondary} />
                <Text style={[styles.eventTypeLabel, evType === et.value && styles.eventTypeLabelActive]}>{et.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.modalLabel}>Title *</Text>
          <TextInput style={styles.modalInput} placeholder="Event title" value={evTitle} onChangeText={setEvTitle} placeholderTextColor={colors.textMuted} />

          <Text style={styles.modalLabel}>Date (YYYY-MM-DD) *</Text>
          <TextInput style={styles.modalInput} placeholder="2024-06-15" value={evDate} onChangeText={setEvDate} placeholderTextColor={colors.textMuted} />

          <Text style={styles.modalLabel}>Estimated Cost ($)</Text>
          <TextInput style={styles.modalInput} placeholder="e.g. 120" value={evCost} onChangeText={setEvCost} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} />

          <Text style={styles.modalLabel}>Notes</Text>
          <TextInput style={[styles.modalInput, styles.modalTextarea]} placeholder="Any notes..." value={evNotes} onChangeText={setEvNotes} multiline numberOfLines={3} placeholderTextColor={colors.textMuted} />

          <Button title="Add Event" onPress={handleAddEvent} fullWidth size="lg" disabled={!evTitle.trim() || !evDate.trim() || !evPetId} />
          <Button title="Cancel" onPress={() => { resetEventForm(); setShowAddEventModal(false); }} variant="ghost" fullWidth style={{ marginTop: 8 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  vetBanner: { backgroundColor: '#E8F5E9', borderLeftWidth: 4, borderLeftColor: '#1B5E20', margin: 12, borderRadius: 12, padding: 12 },
  vetBannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  vetBannerTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: '#1B5E20' },
  vetChargeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, backgroundColor: '#fff', borderRadius: 10, padding: 8 },
  vetChargeMerchant: { fontSize: 13, fontWeight: '700', color: colors.text },
  vetChargeDetail: { fontSize: 11, color: colors.textSecondary },
  vetPetChip: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.border, marginRight: 4 },
  vetPetChipActive: { backgroundColor: '#C8E6C9', borderWidth: 2, borderColor: '#1B5E20' },
  vetPetChipText: { fontSize: 16 },
  vetLogBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#1B5E20' },
  vetLogBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  vetDismissBtn: { padding: 4 },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  headerStat: {
    alignItems: 'center',
  },
  headerStatNum: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  headerStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  headerStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#388E3C',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: '#388E3C',
  },
  tabContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  petGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  petCardWrapper: {
    width: '47%',
  },
  petCard: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  petAvatarBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  petEmoji: {
    fontSize: 30,
  },
  petName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  petSpecies: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  petBreed: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  petAge: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 4,
  },
  petDetail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  petVetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  petVetText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  longPressHint: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 8,
  },
  eventsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  addEventBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addEventText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyInline: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyInlineText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  eventCard: {
    marginBottom: 10,
  },
  doneCard: {
    opacity: 0.75,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  eventIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  doneText: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  eventPetName: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  eventDate: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  overdueText: {
    color: colors.danger,
    fontWeight: '600',
  },
  eventNotes: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  eventRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  eventCost: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  deleteIconBtn: {
    padding: 4,
  },
  healthStatsCard: {
    marginBottom: 16,
  },
  healthCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  healthStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  healthStat: {
    alignItems: 'center',
  },
  healthStatNum: {
    fontSize: 20,
    fontWeight: '800',
    color: '#388E3C',
  },
  healthStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  healthTipsCard: {
    marginBottom: 16,
  },
  healthTipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  healthTipsEmoji: {
    fontSize: 20,
  },
  healthTipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  tipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  tipText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  vaccineCard: {
    marginBottom: 16,
  },
  vaccineTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  vaccinePlaceholder: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 8,
  },
  vaccineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  vaccineEmoji: {
    fontSize: 18,
  },
  vaccinePetName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  vaccineEvent: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  vaccineNoEvents: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  modal: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  modalTextarea: {
    height: 80,
    textAlignVertical: 'top',
  },
  speciesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  speciesChip: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    backgroundColor: colors.card,
    minWidth: 72,
  },
  speciesEmoji: {
    fontSize: 18,
    marginBottom: 4,
  },
  speciesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  petChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    backgroundColor: colors.card,
  },
  petChipActive: {
    borderColor: '#388E3C',
    backgroundColor: '#388E3C15',
  },
  petChipEmoji: {
    fontSize: 18,
  },
  petChipName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  eventTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  eventTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.card,
  },
  eventTypeChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  eventTypeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  eventTypeLabelActive: {
    color: colors.primary,
  },
});
