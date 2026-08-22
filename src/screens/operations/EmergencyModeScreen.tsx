import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Animated, Linking, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { useFamilyStore } from '../../store/useFamilyStore';
import { useEmergencyStore } from '../../store/useEmergencyStore';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { useTranslation } from 'react-i18next';

type EmergencyType = 'medical' | 'fire' | 'earthquake' | 'flood' | 'break_in' | 'power';

const EMERGENCY_TYPES: { type: EmergencyType; icon: string; color: string; label: string }[] = [
  { type: 'medical', icon: 'medkit', color: '#E74C3C', label: 'Medical' },
  { type: 'fire', icon: 'flame', color: '#E67E22', label: 'Fire' },
  { type: 'earthquake', icon: 'warning', color: '#8E44AD', label: 'Earthquake' },
  { type: 'flood', icon: 'water', color: '#2980B9', label: 'Flood' },
  { type: 'break_in', icon: 'lock-closed', color: '#1A1A2E', label: 'Break-in' },
  { type: 'power', icon: 'flash-off', color: '#F5A623', label: 'Power Out' },
];

const PROTOCOLS: Record<EmergencyType, { step: string; action: string }[]> = {
  medical: [
    { step: 'Call 911', action: 'Describe symptoms clearly and give your address.' },
    { step: 'Stay Calm', action: 'Keep the person still. Do NOT give food or water.' },
    { step: 'First Aid', action: 'Apply pressure to wounds. Begin CPR if unresponsive.' },
    { step: 'Unlock Door', action: 'Unlock the front door for paramedics.' },
    { step: 'Meet Responders', action: 'Have someone wait outside to guide emergency crew.' },
  ],
  fire: [
    { step: 'Alert Everyone', action: 'Yell "FIRE!" and activate the nearest alarm.' },
    { step: 'Evacuate', action: 'Use the pre-planned exit route. Close doors behind you.' },
    { step: 'Call 911', action: 'Once outside and safe — do NOT go back inside.' },
    { step: 'Meeting Point', action: 'Meet at the mailbox / corner of Oak & Main St.' },
    { step: 'Account for All', action: 'Count all family members and neighbors.' },
  ],
  earthquake: [
    { step: 'Drop', action: 'Drop to hands and knees immediately.' },
    { step: 'Cover', action: 'Get under a sturdy table or against interior wall.' },
    { step: 'Hold On', action: 'Hold on until shaking stops. Protect your head.' },
    { step: 'Check Injuries', action: 'Check everyone for injuries before moving.' },
    { step: 'Evacuate if Unsafe', action: 'Leave if you smell gas or structure looks damaged.' },
  ],
  flood: [
    { step: 'Move to High Ground', action: 'Go upstairs immediately. Never wade through water.' },
    { step: 'Turn Off Utilities', action: 'Turn off electricity at the breaker if safe to do so.' },
    { step: 'Grab Emergency Bag', action: 'Documents, medications, water, phone chargers.' },
    { step: 'Call for Help', action: 'Dial 911 or signal from an upper window.' },
    { step: 'Monitor Updates', action: 'Listen to emergency radio for evacuation orders.' },
  ],
  break_in: [
    { step: 'Don\'t Confront', action: 'Stay hidden. Your safety is more important than property.' },
    { step: 'Call 911', action: 'Speak quietly. Leave the line open.' },
    { step: 'Lock Room Door', action: 'Get children, lock yourselves in a room.' },
    { step: 'Exit if Possible', action: 'Leave through a window or back door if safe.' },
    { step: 'Meet Outside', action: 'Go to a neighbor\'s house and wait for police.' },
  ],
  power: [
    { step: 'Flashlights', action: 'Emergency flashlights are in the kitchen drawer.' },
    { step: 'Check Breaker', action: 'Reset tripped breakers. If all are fine, call utility co.' },
    { step: 'Preserve Food', action: 'Keep refrigerator closed. Food is safe for 4 hours.' },
    { step: 'Stay Warm/Cool', action: 'Use blankets or go to a community center if extreme weather.' },
    { step: 'Update Family', action: 'Text everyone your status. Check on elderly neighbors.' },
  ],
};

export function EmergencyModeScreen({ navigation }: any) {
  const { t } = useTranslation('ops');
  const insets = useSafeAreaInsets();
  const [selectedType, setSelectedType] = useState<EmergencyType>('medical');
  const [sosActive, setSosActive] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(5);
  const [tab, setTab] = useState<'protocols' | 'contacts' | 'kit'>('protocols');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const members = useFamilyStore((s) => s.members);
  const sendSOS = useFamilyStore((s) => s.sendSOS);
  const kit = useEmergencyStore((s) => s.kit);
  const toggleKitItem = useEmergencyStore((s) => s.toggleKitItem);
  const meetingPoint = useEmergencyStore((s) => s.meetingPoint);
  const setMeetingPoint = useEmergencyStore((s) => s.setMeetingPoint);
  const fetchEmergencyFromServer = useEmergencyStore((s) => s.fetchFromServer);
  const [editingMeetingPoint, setEditingMeetingPoint] = useState(false);
  const [meetingPointDraft, setMeetingPointDraft] = useState(meetingPoint);

  useEffect(() => {
    fetchEmergencyFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (sosActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();

      const timer = setInterval(() => {
        setSosCountdown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            setSosActive(false);
            setSosCountdown(5);
            // Fire-and-report rather than awaited inline — this callback is
            // the setState updater for the countdown itself, not an async
            // context, and the SOS send shouldn't block the countdown UI
            // from resetting immediately.
            sendSOS()
              .then((sent) => {
                Alert.alert(
                  sent > 0 ? '🚨 SOS Sent' : '🚨 SOS Sent — No One Reachable',
                  sent > 0
                    ? `Emergency alert sent to ${sent} family member${sent === 1 ? '' : 's'}.`
                    : 'No other family members have notifications enabled right now. Call 911 directly if this is a real emergency.',
                );
              })
              .catch(() => {
                Alert.alert(
                  '🚨 SOS Not Sent',
                  'Could not reach the server to alert your family. Call 911 directly if this is a real emergency.',
                );
              });
            return 5;
          }
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [sosActive]);

  const handleSOS = () => {
    if (sosActive) {
      setSosActive(false);
      setSosCountdown(5);
    } else {
      Alert.alert(
        '🚨 Activate SOS?',
        'This will alert all family members and prepare to dial 911. Use only in real emergencies.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Activate SOS', style: 'destructive', onPress: () => setSosActive(true) },
        ]
      );
    }
  };

  const selectedProtocol = PROTOCOLS[selectedType];
  const kitDone = kit.filter((k) => k.done).length;

  const EMERGENCY_CONTACTS = [
    { name: 'Emergency Services', number: '911', icon: 'call', color: '#E74C3C', type: 'police/fire/medical' },
    { name: 'Poison Control', number: '1-800-222-1222', icon: 'medical', color: '#E67E22', type: 'poisoning' },
    { name: 'Crisis Helpline', number: '988', icon: 'heart', color: '#8E44AD', type: 'mental health' },
    { name: 'Red Cross', number: '1-800-733-2767', icon: 'shield', color: '#E74C3C', type: 'disaster relief' },
    ...members.filter((m) => m.emergencyContactName).map((m) => ({
      name: m.emergencyContactName!,
      number: m.emergencyContactPhone ?? '',
      icon: 'person' as const,
      color: m.avatarColor,
      type: `${m.name}'s contact`,
    })),
  ];

  const screenHeader = (
    <LinearGradient colors={['#7B0000', '#B71C1C', '#D32F2F']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('emergency.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* SOS Button */}
      <View style={styles.sosCenter}>
        <Animated.View style={[styles.sosPulse, sosActive && { transform: [{ scale: pulseAnim }] }]}>
          <Pressable accessibilityRole="button" onPress={handleSOS} style={[styles.sosBtn, sosActive && styles.sosBtnActive]}>
            {sosActive ? (
              <>
                <Text style={styles.sosBtnText}>CANCEL</Text>
                <Text style={styles.sosCountdown}>{sosCountdown}s</Text>
              </>
            ) : (
              <>
                <Ionicons name="alert-circle" size={32} color="#fff" />
                <Text style={styles.sosBtnText}>SOS</Text>
              </>
            )}
          </Pressable>
        </Animated.View>
        <Text style={styles.sosHint}>
          {sosActive ? `Sending in ${sosCountdown}s — tap to cancel` : 'Tap to activate emergency SOS'}
        </Text>
      </View>
    
    <View style={styles.tabs}>
            {(['protocols', 'contacts', 'kit'] as const).map((t) => (
              <Pressable accessibilityRole="button" key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === 'protocols' ? '📋 Protocols' : t === 'contacts' ? '📞 Contacts' : '🎒 Kit'}
                </Text>
              </Pressable>
            ))}
          </View>
</LinearGradient>
  );

  const screenCompact = (
    <LinearGradient
      colors={['#7B0000', '#B71C1C', '#D32F2F']}
      style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
    >
      <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.back}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Text style={styles.headerTitle}>{t('emergency.title')}</Text>
      <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>SOS Ready</Text>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
      // 160 rather than this screen family's usual 100 — the floating tab
      // bar's footprint (~125pt: its own height plus the safe-area bottom
      // inset) sits on top of the last ~25-60pt of content at max scroll,
      // and unlike most other screens here, this one now has a real
      // tappable control (the meeting-point editor) as its last element,
      // not just a static info card that doesn't need to be reachable.
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 160, paddingTop: contentPaddingTop }]}
        onScroll={onScroll}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={scrollEventThrottle}
      >
        {tab === 'protocols' && (
          <>
            <Text style={styles.sectionLabel}>Select Emergency Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
              {EMERGENCY_TYPES.map((et) => (
                <Pressable accessibilityRole="button"
                  key={et.type}
                  onPress={() => setSelectedType(et.type)}
                  style={[styles.typeChip, selectedType === et.type && { backgroundColor: et.color }]}
                >
                  <Ionicons name={et.icon as any} size={18} color={selectedType === et.type ? '#fff' : et.color} />
                  <Text style={[styles.typeChipLabel, selectedType === et.type && { color: '#fff' }]}>{et.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.sectionLabel}>Step-by-Step Protocol</Text>
            {selectedProtocol.map((step, i) => (
              <Card key={i} variant="elevated" style={styles.stepCard}>
                <View style={styles.stepRow}>
                  <View style={[styles.stepNum, { backgroundColor: EMERGENCY_TYPES.find((e) => e.type === selectedType)?.color + '20' }]}>
                    <Text style={[styles.stepNumText, { color: EMERGENCY_TYPES.find((e) => e.type === selectedType)?.color }]}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.stepTitle}>{step.step}</Text>
                    <Text style={styles.stepAction}>{step.action}</Text>
                  </View>
                </View>
              </Card>
            ))}

            <View style={styles.meetingPoint}>
              <Ionicons name="location" size={18} color="#E74C3C" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.meetingPointTitle}>Family Meeting Point</Text>
                {editingMeetingPoint ? (
                  <>
                    <TextInput
                      accessibilityLabel="Family meeting point"
                      style={styles.meetingPointInput}
                      value={meetingPointDraft}
                      onChangeText={setMeetingPointDraft}
                      placeholder="e.g. Corner of Oak & Main, in front of the Johnsons'"
                      placeholderTextColor={colors.textMuted}
                      multiline
                      autoFocus
                    />
                    <View style={styles.meetingPointActions}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => { setMeetingPointDraft(meetingPoint); setEditingMeetingPoint(false); }}
                      >
                        <Text style={styles.meetingPointCancel}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => { setMeetingPoint(meetingPointDraft.trim()); setEditingMeetingPoint(false); }}
                      >
                        <Text style={styles.meetingPointSave}>Save</Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => { setMeetingPointDraft(meetingPoint); setEditingMeetingPoint(true); }}
                    hitSlop={10}
                    style={({ pressed }) => [styles.meetingPointTap, pressed && { opacity: 0.6 }]}
                  >
                    <Text style={styles.meetingPointAddr}>
                      {meetingPoint || 'Not set — tap to add your family\'s rally point'}
                    </Text>
                    <Ionicons name="pencil" size={14} color={colors.textSecondary} />
                  </Pressable>
                )}
              </View>
            </View>
          </>
        )}

        {tab === 'contacts' && (
          <>
            <Text style={styles.sectionLabel}>Emergency Numbers</Text>
            {EMERGENCY_CONTACTS.map((contact, i) => (
              <Pressable accessibilityRole="button" key={i} onPress={() => Alert.alert(t('common.callTitle', { name: contact.name }), t('common.callMsg', { name: contact.number }), [{ text: t('common.cancel'), style: 'cancel' }, { text: t('common.call'), style: 'destructive', onPress: () => Linking.openURL(`tel:${contact.number.replace(/-/g, '')}`) }])}>
                <Card variant="elevated" style={styles.contactCard}>
                  <View style={styles.contactRow}>
                    <View style={[styles.contactIcon, { backgroundColor: contact.color + '20' }]}>
                      <Ionicons name={contact.icon as any} size={20} color={contact.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      <Text style={styles.contactType}>{contact.type}</Text>
                    </View>
                    <View style={styles.contactRight}>
                      <Text style={styles.contactNumber}>{contact.number}</Text>
                      <Ionicons name="call" size={16} color={contact.color} />
                    </View>
                  </View>
                </Card>
              </Pressable>
            ))}
          </>
        )}

        {tab === 'kit' && (
          <>
            <View style={styles.kitHeader}>
              <Text style={styles.kitProgress}>{kitDone}/{kit.length} items ready</Text>
              <View style={styles.kitBar}>
                <View style={[styles.kitFill, { width: `${(kitDone / kit.length) * 100}%` }]} />
              </View>
              <Text style={styles.kitStatus}>
                {kitDone === kit.length ? '✅ Your kit is ready!' : `⚠️ ${kit.length - kitDone} items still needed`}
              </Text>
            </View>

            {kit.map((item) => (
              <Pressable accessibilityRole="button" key={item.id} onPress={() => toggleKitItem(item.id)}>
                <Card variant="elevated" style={styles.kitItem}>
                  <View style={styles.kitRow}>
                    <Ionicons
                      name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={item.done ? colors.success : colors.textMuted}
                    />
                    <Text style={[styles.kitItemText, item.done && styles.kitItemDone]}>{item.label}</Text>
                  </View>
                </Card>
              </Pressable>
            ))}

            <Card variant="elevated" style={styles.storageCard}>
              <Ionicons name="information-circle" size={18} color={colors.primary} />
              <Text style={styles.storageTitle}>Where to store your kit</Text>
              <Text style={styles.storageText}>Keep your emergency kit in an easily accessible location — a garage, closet near front door, or under a bed. Review and replace expired items annually.</Text>
            </Card>
          </>
        )}
      </ScrollView>
        )}
      </CollapsibleHeader>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff', textAlign: 'center' },
  sosCenter: { alignItems: 'center', gap: 12 },
  sosPulse: { borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.1)', padding: 4 },
  sosBtn: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 4 },
  sosBtnActive: { backgroundColor: '#fff' },
  sosBtnText: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  sosCountdown: { fontSize: 18, fontWeight: '800', color: '#E74C3C' },
  sosHint: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: '#E74C3C' },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: '#E74C3C' },
  content: { padding: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },
  typeScroll: { marginBottom: 16 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  typeChipLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  stepCard: { marginBottom: 8, borderRadius: 14 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start' },
  stepNum: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 16, fontWeight: '800' },
  stepTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  stepAction: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  meetingPoint: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FDEDEC', borderRadius: 14, padding: 16, marginTop: 12 },
  meetingPointTitle: { fontSize: 13, fontWeight: '700', color: '#E74C3C', marginBottom: 4 },
  meetingPointTap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 6 },
  meetingPointAddr: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 19 },
  meetingPointInput: { fontSize: 13, color: colors.text, lineHeight: 19, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 8, backgroundColor: colors.card, minHeight: 40 },
  meetingPointActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 8 },
  meetingPointCancel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  meetingPointSave: { fontSize: 13, fontWeight: '700', color: '#E74C3C' },
  contactCard: { marginBottom: 8, borderRadius: 14 },
  contactRow: { flexDirection: 'row', alignItems: 'center' },
  contactIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  contactName: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 2 },
  contactType: { fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize' },
  contactRight: { alignItems: 'flex-end', gap: 4 },
  contactNumber: { fontSize: 13, fontWeight: '700', color: colors.primary },
  kitHeader: { backgroundColor: '#FDEDEC', borderRadius: 16, padding: 16, marginBottom: 8 },
  kitProgress: { fontSize: 18, fontWeight: '800', color: '#E74C3C', marginBottom: 10 },
  kitBar: { height: 8, backgroundColor: 'rgba(231,76,60,0.2)', borderRadius: 4, marginBottom: 10 },
  kitFill: { height: 8, backgroundColor: '#E74C3C', borderRadius: 4 },
  kitStatus: { fontSize: 13, color: colors.text, fontWeight: '600' },
  kitItem: { marginBottom: 6, borderRadius: 10 },
  kitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  kitItemText: { flex: 1, fontSize: 13, color: colors.text },
  kitItemDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  storageCard: { borderRadius: 16, marginTop: 12, backgroundColor: '#EBF5FB' },
  storageTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 6, marginBottom: 6 },
  storageText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
});
