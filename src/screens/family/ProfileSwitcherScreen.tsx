import React, { useState, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../../components/common/Card';
import { Avatar } from '../../components/common/Avatar';
import { useFamilyStore } from '../../store/useFamilyStore';
import { colors } from '../../theme/colors';
import type { FamilyMember } from '../../types';

const PIN_LENGTH = 4;

export function ProfileSwitcherScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const members = useFamilyStore((s) => s.members);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);
  const setActiveMember = useFamilyStore((s) => s.setActiveMember);

  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [pinEntry, setPinEntry] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const pendingMember = members.find((m) => m.id === pendingMemberId) ?? null;

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const goBackOrHome = () => {
    if (route?.params?.source === 'dashboard') {
      navigation.getParent()?.navigate('Home');
    } else {
      navigation.goBack();
    }
  };

  const handleSwitch = (member: FamilyMember) => {
    if (member.isPinProtected) {
      setPendingMemberId(member.id);
      setPinEntry('');
      setPinError(false);
      setShowPinModal(true);
    } else {
      setActiveMember(member.id);
      goBackOrHome();
    }
  };

  const handlePinDigit = (digit: string) => {
    if (pinEntry.length >= PIN_LENGTH) return;
    const newPin = pinEntry + digit;
    setPinEntry(newPin);
    setPinError(false);

    if (newPin.length === PIN_LENGTH) {
      setTimeout(() => {
        if (pendingMember && pendingMember.pin === newPin) {
          setShowPinModal(false);
          setActiveMember(pendingMember.id);
          goBackOrHome();
        } else {
          setPinError(true);
          triggerShake();
          setTimeout(() => setPinEntry(''), 600);
        }
      }, 100);
    }
  };

  const handlePinDelete = () => {
    setPinEntry((prev) => prev.slice(0, -1));
    setPinError(false);
  };

  const handlePinCancel = () => {
    setShowPinModal(false);
    setPendingMemberId(null);
    setPinEntry('');
    setPinError(false);
  };

  const numPadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F2952', '#1E4A8A']}
        style={[styles.header, { paddingTop: insets.top + 6 }]}
      >
        <Pressable onPress={goBackOrHome} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Switch Profile</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Select who is using the app right now</Text>

        {members.map((member) => {
          const isActive = member.id === activeMemberId;
          return (
            <Card
              key={member.id}
              style={isActive ? { ...styles.card, ...styles.activeCard } : styles.card}
              onPress={() => handleSwitch(member)}
            >
              <Avatar name={member.name} color={member.avatarColor} size={52} />
              <View style={styles.cardText}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{member.name}</Text>
                  {member.isPinProtected && (
                    <Text style={styles.lockIcon}>🔒</Text>
                  )}
                </View>
                <Text style={styles.role}>
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                </Text>
                <Text style={styles.profileTypeBadge}>
                  {member.isLocalProfile ? 'Local Profile' : 'Linked Account'}
                </Text>
              </View>
              {isActive ? (
                <View style={styles.activeBadge}>
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  <Text style={styles.activeLabel}>Active</Text>
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              )}
            </Card>
          );
        })}
      </ScrollView>

      {/* PIN Modal */}
      <Modal
        visible={showPinModal}
        transparent
        animationType="fade"
        onRequestClose={handlePinCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pinModal}>
            <Text style={styles.pinTitle}>Enter PIN</Text>
            {pendingMember != null && (
              <Text style={styles.pinSubtitle}>
                Switching to {pendingMember.name}
              </Text>
            )}

            <Animated.View
              style={[styles.pinDots, { transform: [{ translateX: shakeAnim }] }]}
            >
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.pinDot,
                    i < pinEntry.length && styles.pinDotFilled,
                    pinError && styles.pinDotError,
                  ]}
                />
              ))}
            </Animated.View>

            {pinError && (
              <Text style={styles.pinErrorText}>Incorrect PIN. Try again.</Text>
            )}

            <View style={styles.numPad}>
              {numPadKeys.map((key, idx) => {
                if (key === '') {
                  return <View key={idx} style={styles.numKey} />;
                }
                if (key === 'del') {
                  return (
                    <Pressable
                      key={idx}
                      style={styles.numKey}
                      onPress={handlePinDelete}
                    >
                      <Ionicons name="backspace-outline" size={24} color={colors.text} />
                    </Pressable>
                  );
                }
                return (
                  <Pressable
                    key={idx}
                    style={({ pressed }) => [
                      styles.numKey,
                      styles.numKeyDigit,
                      pressed && styles.numKeyPressed,
                    ]}
                    onPress={() => handlePinDigit(key)}
                  >
                    <Text style={styles.numKeyText}>{key}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable style={styles.cancelBtn} onPress={handlePinCancel}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 18 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: '#fff', textAlign: 'center' },
  content: { padding: 16, paddingBottom: 100 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 20, marginTop: 4 },
  card: { marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 14 },
  activeCard: { borderWidth: 2, borderColor: colors.primary, backgroundColor: '#EEF3FB' },
  cardText: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 16, fontWeight: '800', color: colors.text },
  lockIcon: { fontSize: 14 },
  role: { fontSize: 12, color: colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  profileTypeBadge: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  activeLabel: { fontSize: 12, fontWeight: '800', color: colors.primary },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  pinModal: { backgroundColor: '#fff', borderRadius: 24, padding: 32, width: 320, alignItems: 'center' },
  pinTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 6 },
  pinSubtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 24 },
  pinDots: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  pinDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.primary, backgroundColor: 'transparent' },
  pinDotFilled: { backgroundColor: colors.primary },
  pinDotError: { borderColor: '#E74C3C', backgroundColor: '#E74C3C' },
  pinErrorText: { fontSize: 13, color: '#E74C3C', marginBottom: 12 },
  numPad: { flexDirection: 'row', flexWrap: 'wrap', width: 240, marginTop: 12 },
  numKey: { width: 80, height: 64, alignItems: 'center', justifyContent: 'center' },
  numKeyDigit: { borderRadius: 40, backgroundColor: '#F5F5F5' },
  numKeyPressed: { opacity: 0.6 },
  numKeyText: { fontSize: 18, fontWeight: '600', color: colors.text },
  cancelBtn: { marginTop: 20, paddingVertical: 10, paddingHorizontal: 24 },
  cancelBtnText: { fontSize: 15, color: colors.primary, fontWeight: '600' },
});
