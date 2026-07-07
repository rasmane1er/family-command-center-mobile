import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import { colors } from '../../theme/colors';
import { CollapsibleHeader } from '../../components/common/CollapsibleHeader';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { useAutomationStore } from '../../store/useAutomationStore';
import type { DeviceType } from '../../types';
import { useTranslation } from 'react-i18next';

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

export function SmartHomeScreen({ navigation }: any) {
  const { t } = useTranslation('ops');
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'devices' | 'scenes'>('devices');
  const [selectedRoom, setSelectedRoom] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const {
    devices,
    toggleDevice,
    updateDeviceValue,
    hueConnected,
    hueBridgeIp,
    hueScenes,
    isRefreshingHue,
    hydrateHueConnection,
    refreshHueDevices,
    recallHueScene,
  } = useAutomationStore();

  useEffect(() => {
    hydrateHueConnection();
  }, [hydrateHueConnection]);

  useFocusEffect(
    React.useCallback(() => {
      if (hueConnected) refreshHueDevices();
    }, [hueConnected, refreshHueDevices])
  );

  const onPullRefresh = async () => {
    if (!hueConnected) return;
    setRefreshing(true);
    await refreshHueDevices();
    setRefreshing(false);
  };

  const rooms = ['All', ...Array.from(new Set(devices.map((d) => d.room)))];
  const filteredDevices = selectedRoom === 'All' ? devices : devices.filter((d) => d.room === selectedRoom);
  const onlineDevices = devices.filter((d) => d.isOnline).length;
  const activeDevices = devices.filter((d) => d.isOn).length;

  const screenHeader = (
    <LinearGradient colors={['#1A1A2E', '#0F3460']} style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <View style={styles.headerTop}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('smartHome.title')}</Text>
        <Pressable onPress={() => navigation.navigate('ConnectHueBridge')} style={styles.addBtn}>
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
          <Ionicons name={hueConnected ? 'checkmark-circle' : 'close-circle'} size={20} color={hueConnected ? '#4EECD0' : 'rgba(255,255,255,0.5)'} />
          <Text style={styles.homeStatVal}>{hueConnected ? 'Connected' : 'Not linked'}</Text>
          <Text style={styles.homeStatLabel}>Hue Bridge</Text>
        </View>
      </View>

      {devices.length > 0 && (
        <View style={styles.tabs}>
          {(['devices', 'scenes'] as const).map((tab) => (
            <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.tabActive]}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </LinearGradient>
  );

  const screenCompact = (
    <LinearGradient colors={['#1A1A2E', '#0F3460']} style={{ paddingTop: insets.top, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Text style={styles.headerTitle}>{t('smartHome.title')}</Text>
      <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>{activeDevices} active</Text>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <CollapsibleHeader fullHeader={screenHeader} compactHeader={screenCompact}>
        {({ onScroll, onScrollEndDrag, onMomentumScrollEnd, scrollEventThrottle, contentPaddingTop }) => (
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: 100, paddingTop: contentPaddingTop }]}
            onScroll={onScroll}
            onScrollEndDrag={onScrollEndDrag}
            onMomentumScrollEnd={onMomentumScrollEnd}
            scrollEventThrottle={scrollEventThrottle}
            refreshControl={<RefreshControl refreshing={refreshing || isRefreshingHue} onRefresh={onPullRefresh} />}
          >
            {devices.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="bulb-outline" size={56} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No devices connected</Text>
                <Text style={styles.emptyDesc}>
                  Connect your Philips Hue Bridge to control your real lights from here.
                </Text>
                <Button
                  title="Connect Hue Bridge"
                  onPress={() => navigation.navigate('ConnectHueBridge')}
                  style={{ marginTop: 18, alignSelf: 'stretch' }}
                />
              </View>
            )}

            {devices.length > 0 && activeTab === 'devices' && (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 16, maxHeight: 40 }}
                  contentContainerStyle={{ alignItems: 'center' }}
                >
                  {rooms.map((room) => (
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
                  const isHueLight = device.brand === 'Philips Hue' && device.type === 'light';
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
                          {!isHueLight && device.value !== undefined && device.unit && (
                            <Text style={[styles.deviceValue, { color }]}>{device.value}{device.unit}</Text>
                          )}
                          {device.battery !== undefined && (
                            <View style={styles.batteryRow}>
                              <Ionicons name="battery-half" size={12} color={device.battery < 20 ? colors.danger : colors.textMuted} />
                              <Text style={styles.batteryText}>{device.battery}%</Text>
                            </View>
                          )}
                        </View>
                        <Pressable
                          onPress={() => toggleDevice(device.id)}
                          disabled={!device.isOnline}
                          style={[
                            styles.toggleBtn,
                            { backgroundColor: device.isOn ? color : colors.border },
                            !device.isOnline && { opacity: 0.4 },
                          ]}
                        >
                          <Ionicons name="power" size={16} color={device.isOn ? '#fff' : colors.textMuted} />
                        </Pressable>
                      </View>

                      {isHueLight && device.isOn && device.isOnline && device.value !== undefined && (
                        <View style={styles.sliderRow}>
                          <Ionicons name="sunny-outline" size={14} color={colors.textMuted} />
                          <Slider
                            style={{ flex: 1, marginHorizontal: 10 }}
                            minimumValue={1}
                            maximumValue={100}
                            step={1}
                            value={device.value}
                            minimumTrackTintColor={color}
                            maximumTrackTintColor={colors.border}
                            thumbTintColor={color}
                            onSlidingComplete={(v) => updateDeviceValue(device.id, Math.round(v))}
                          />
                          <Text style={styles.sliderValue}>{device.value}%</Text>
                        </View>
                      )}
                    </Card>
                  );
                })}
              </>
            )}

            {devices.length > 0 && activeTab === 'scenes' && (
              <>
                {!hueConnected && (
                  <Text style={styles.emptyDesc}>Connect your Hue Bridge to see and activate scenes.</Text>
                )}
                {hueConnected && hueScenes.length === 0 && (
                  <Text style={styles.emptyDesc}>
                    No scenes yet. Create one in the official Hue app and it'll show up here.
                  </Text>
                )}
                {hueConnected && hueScenes.length > 0 && (
                  <View style={styles.scenesGrid}>
                    {hueScenes.map((scene) => (
                      <Pressable
                        key={scene.id}
                        onPress={() => recallHueScene(scene.id)}
                        style={[styles.sceneCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
                      >
                        <View style={[styles.sceneIcon, { backgroundColor: colors.primary + '20' }]}>
                          <Ionicons name="color-palette" size={26} color={colors.primary} />
                        </View>
                        <Text style={styles.sceneName}>{scene.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
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
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  back: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
  addBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  homeStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  homeStat: { alignItems: 'center', gap: 4 },
  homeStatVal: { fontSize: 14, fontWeight: '800', color: '#fff' },
  homeStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  homeStatDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.15)' },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, marginTop: 8 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.primary },
  content: { padding: 16, flexGrow: 1 },
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 14 },
  emptyDesc: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 19 },
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
  toggleBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sliderRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  sliderValue: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, width: 36, textAlign: 'right' },
  scenesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sceneCard: { width: '47%', borderRadius: 16, padding: 14, borderWidth: 1, alignItems: 'center' },
  sceneIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  sceneName: { fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'center' },
});
