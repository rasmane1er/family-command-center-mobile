import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { useAutomationStore } from '../../store/useAutomationStore';
import type { DeviceType } from '../../types';

const DEVICE_ICONS: Record<DeviceType, string> = {
  light: 'bulb',
  thermostat: 'thermometer',
  lock: 'lock-closed',
  camera: 'camera',
  speaker: 'volume-high',
  appliance: 'flash',
  sensor: 'radio',
  hub: 'radio-button-on',
};

const DEVICE_COLORS: Record<DeviceType, string> = {
  light: '#F5A623',
  thermostat: '#E74C3C',
  lock: '#2980B9',
  camera: '#8E44AD',
  speaker: '#16A085',
  appliance: '#27AE60',
  sensor: '#E67E22',
  hub: '#7F8C8D',
};

const ROOMS = ['All', 'Living Room', 'Kitchen', 'Entry', 'Exterior', "Aiden's Room", "Lily's Room", 'Garage', 'Hallway'];

const SCENES = [
  { name: 'Good Morning', icon: 'sunny', color: '#F5A623', desc: 'Lights on, thermostat 70°F' },
  { name: 'Movie Night', icon: 'film', color: '#8E44AD', desc: 'Dim lights, lock doors' },
  { name: 'Away Mode', icon: 'airplane', color: '#2980B9', desc: 'All off, cameras active' },
  { name: 'Bedtime', icon: 'moon', color: '#1A252F', desc: 'Lights off, thermostat 68°F' },
  { name: 'Party Mode', icon: 'musical-notes', color: '#E74C3C', desc: 'Color lights, speaker on' },
  { name: 'Work From Home', icon: 'laptop', color: '#27AE60', desc: 'Office light, focus mode' },
];

export function SmartHomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'devices' | 'scenes' | 'energy'>('devices');
  const [selectedRoom, setSelectedRoom] = useState('All');
  const { devices, toggleDevice, seedDemoData } = useAutomationStore();

  if (devices.length === 0) seedDemoData();

  const filteredDevices = selectedRoom === 'All' ? devices : devices.filter((d) => d.room === selectedRoom);
  const onlineDevices = devices.filter((d) => d.isOnline).length;
  const activeDevices = devices.filter((d) => d.isOn).length;

  const ENERGY_DATA = [
    { label: 'Today', kwh: 28.4, cost: '$3.41', change: -8 },
    { label: 'This Week', kwh: 186.2, cost: '$22.34', change: 12 },
    { label: 'This Month', kwh: 742.1, cost: '$89.05', change: -3 },
    { label: 'Annual Est.', kwh: 8920, cost: '$1,070', change: -5 },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={['#1A1A2E', '#0F3460']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Smart Home</Text>
          <Pressable
            onPress={() => Alert.alert('Add Device', 'To pair a new smart home device, open your device manufacturer\'s app and follow the pairing instructions. Your devices will appear here automatically.', [{ text: 'Got It' }])}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.homeStats}>
          <View style={styles.homeStat}>
            <Ionicons name="wifi" size={20} color="rgba(255,255,255,0.7)" />
            <Text style={styles.homeStatVal}>{onlineDevices}/{devices.length}</Text>
            <Text style={styles.homeStatLabel}>Online</Text>
          </View>
          <View style={styles.homeStatDivider} />
          <View style={styles.homeStat}>
            <Ionicons name="flash" size={20} color="rgba(255,255,255,0.7)" />
            <Text style={styles.homeStatVal}>{activeDevices}</Text>
            <Text style={styles.homeStatLabel}>Active</Text>
          </View>
          <View style={styles.homeStatDivider} />
          <View style={styles.homeStat}>
            <Ionicons name="thermometer" size={20} color="rgba(255,255,255,0.7)" />
            <Text style={styles.homeStatVal}>72°F</Text>
            <Text style={styles.homeStatLabel}>Indoor</Text>
          </View>
          <View style={styles.homeStatDivider} />
          <View style={styles.homeStat}>
            <Ionicons name="lock-closed" size={20} color="rgba(255,255,255,0.7)" />
            <Text style={styles.homeStatVal}>Locked</Text>
            <Text style={styles.homeStatLabel}>Status</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.tabs}>
        {(['devices', 'scenes', 'energy'] as const).map((tab) => (
          <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {activeTab === 'devices' && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {ROOMS.filter((r) => r === 'All' || devices.some((d) => d.room === r)).map((room) => (
                <Pressable
                  key={room}
                  onPress={() => setSelectedRoom(room)}
                  style={[styles.roomChip, selectedRoom === room && styles.roomChipActive]}
                >
                  <Text style={[styles.roomText, selectedRoom === room && styles.roomTextActive]}>{room}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {filteredDevices.map((device) => {
              const icon = DEVICE_ICONS[device.type];
              const color = DEVICE_COLORS[device.type];
              return (
                <Card key={device.id} style={styles.deviceCard} variant="elevated">
                  <View style={styles.deviceRow}>
                    <View style={[styles.deviceIcon, { backgroundColor: (device.isOnline ? color : colors.textMuted) + '20' }]}>
                      <Ionicons name={icon as any} size={22} color={device.isOnline ? (device.isOn ? color : colors.textMuted) : colors.border} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={styles.deviceNameRow}>
                        <Text style={styles.deviceName}>{device.name}</Text>
                        {!device.isOnline && <Badge label="Offline" variant="danger" size="sm" />}
                      </View>
                      <Text style={styles.deviceRoom}>{device.room} • {device.brand}</Text>
                      {device.value !== undefined && device.unit && (
                        <Text style={[styles.deviceValue, { color }]}>{device.value}{device.unit}</Text>
                      )}
                      {device.battery !== undefined && (
                        <View style={styles.batteryRow}>
                          <Ionicons name="battery-half" size={12} color={device.battery < 20 ? colors.danger : colors.textMuted} />
                          <Text style={styles.batteryText}>{device.battery}%</Text>
                        </View>
                      )}
                    </View>
                    {(device.type === 'light' || device.type === 'speaker' || device.type === 'lock' || device.type === 'camera') && (
                      <Switch
                        value={device.isOn ?? false}
                        onValueChange={() => toggleDevice(device.id)}
                        disabled={!device.isOnline}
                        trackColor={{ false: colors.border, true: color + '60' }}
                        thumbColor={device.isOnline ? color : colors.border}
                      />
                    )}
                  </View>
                </Card>
              );
            })}
          </>
        )}

        {activeTab === 'scenes' && (
          <View style={styles.scenesGrid}>
            {SCENES.map((scene) => (
              <Pressable
                key={scene.name}
                onPress={() => Alert.alert(`Activate "${scene.name}"?`, scene.desc, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Activate', onPress: () => Alert.alert('Scene Activated', `${scene.name} scene is now active.`) },
                ])}
                style={[styles.sceneCard, { backgroundColor: scene.color + '15', borderColor: scene.color + '30' }]}
              >
                <View style={[styles.sceneIcon, { backgroundColor: scene.color + '20' }]}>
                  <Ionicons name={scene.icon as any} size={28} color={scene.color} />
                </View>
                <Text style={styles.sceneName}>{scene.name}</Text>
                <Text style={styles.sceneDesc}>{scene.desc}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {activeTab === 'energy' && (
          <>
            {ENERGY_DATA.map((e, i) => (
              <Card key={i} style={styles.energyCard} variant="elevated">
                <View style={styles.energyRow}>
                  <View>
                    <Text style={styles.energyLabel}>{e.label}</Text>
                    <Text style={styles.energyKwh}>{e.kwh} kWh</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.energyCost}>{e.cost}</Text>
                    <View style={styles.changeRow}>
                      <Ionicons
                        name={e.change < 0 ? 'trending-down' : 'trending-up'}
                        size={14}
                        color={e.change < 0 ? colors.success : colors.danger}
                      />
                      <Text style={[styles.changeText, { color: e.change < 0 ? colors.success : colors.danger }]}>
                        {e.change < 0 ? '' : '+'}{e.change}% vs last period
                      </Text>
                    </View>
                  </View>
                </View>
              </Card>
            ))}

            <Card style={styles.tipCard} variant="elevated">
              <Ionicons name="bulb" size={22} color={colors.secondary} />
              <Text style={styles.tipTitle}>Energy Saving Tip</Text>
              <Text style={styles.tipText}>
                Setting your thermostat to 68°F when sleeping and 65°F when away could save you up to $180/year.
                Your Nest thermostat can automate this schedule.
              </Text>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
  addBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  homeStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  homeStat: { alignItems: 'center', gap: 4 },
  homeStatVal: { fontSize: 16, fontWeight: '800', color: '#fff' },
  homeStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  homeStatDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.15)' },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.primary },
  content: { padding: 16 },
  roomChip: { backgroundColor: colors.background, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  roomChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roomText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  roomTextActive: { color: '#fff' },
  deviceCard: { marginBottom: 8, borderRadius: 14 },
  deviceRow: { flexDirection: 'row', alignItems: 'center' },
  deviceIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  deviceNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deviceName: { fontSize: 14, fontWeight: '700', color: colors.text },
  deviceRoom: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  deviceValue: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  batteryRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  batteryText: { fontSize: 10, color: colors.textMuted },
  scenesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sceneCard: { width: '47%', borderRadius: 16, padding: 14, borderWidth: 1, alignItems: 'center' },
  sceneIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  sceneName: { fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 4 },
  sceneDesc: { fontSize: 11, color: colors.textSecondary, textAlign: 'center' },
  energyCard: { marginBottom: 10, borderRadius: 14 },
  energyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  energyLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  energyKwh: { fontSize: 20, fontWeight: '800', color: colors.text },
  energyCost: { fontSize: 18, fontWeight: '700', color: colors.success },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  changeText: { fontSize: 11, fontWeight: '600' },
  tipCard: { borderRadius: 14, alignItems: 'flex-start', gap: 8 },
  tipTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  tipText: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
});
