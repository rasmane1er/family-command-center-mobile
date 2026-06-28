import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  ChildDevice,
  GeofenceZone,
  ScreenTimeRule,
  AppUsageEntry,
  SOSAlert,
  ParentApprovalRequest,
  GuardianCommand,
} from '../types';

interface GuardianStore {
  devices: ChildDevice[];
  geofenceZones: GeofenceZone[];
  screenTimeRules: ScreenTimeRule[];
  appUsage: AppUsageEntry[];
  sosAlerts: SOSAlert[];
  approvalRequests: ParentApprovalRequest[];
  pendingCommands: GuardianCommand[];
  activePairingCode: string | null;

  // Device CRUD
  addDevice: (device: ChildDevice) => void;
  updateDevice: (id: string, updates: Partial<ChildDevice>) => void;
  removeDevice: (id: string) => void;
  updateDeviceStatus: (deviceId: string, partial: Partial<ChildDevice>) => void;

  // Geofence CRUD
  addGeofenceZone: (zone: GeofenceZone) => void;
  updateGeofenceZone: (id: string, updates: Partial<GeofenceZone>) => void;
  removeGeofenceZone: (id: string) => void;

  // Screen time CRUD
  addScreenTimeRule: (rule: ScreenTimeRule) => void;
  updateScreenTimeRule: (id: string, updates: Partial<ScreenTimeRule>) => void;
  removeScreenTimeRule: (id: string) => void;

  // App usage
  addAppUsage: (entry: AppUsageEntry) => void;
  clearAppUsageForDevice: (deviceId: string) => void;

  // SOS alerts
  addSOSAlert: (alert: SOSAlert) => void;
  resolveSOSAlert: (id: string, resolvedBy: string) => void;

  // Approval requests
  addApprovalRequest: (request: ParentApprovalRequest) => void;
  respondToApproval: (id: string, status: 'approved' | 'denied', respondedBy: string) => void;

  // Commands
  sendCommand: (deviceId: string, type: GuardianCommand['type'], familyId: string, payload?: Record<string, unknown>) => void;
  markCommandExecuted: (id: string) => void;
  markCommandFailed: (id: string) => void;

  // Pairing
  generatePairingCode: () => string;
  clearPairingCode: () => void;
}

export const useGuardianStore = create<GuardianStore>()(
  persist(
    (set, get) => ({
      devices: [],
      geofenceZones: [],
      screenTimeRules: [],
      appUsage: [],
      sosAlerts: [],
      approvalRequests: [],
      pendingCommands: [],
      activePairingCode: null,

      // Device CRUD
      addDevice: (device) => set((s) => ({ devices: [...s.devices, device] })),

      updateDevice: (id, updates) => set((s) => ({
        devices: s.devices.map((d) => (d.id === id ? { ...d, ...updates } : d)),
      })),

      removeDevice: (id) => set((s) => ({ devices: s.devices.filter((d) => d.id !== id) })),

      updateDeviceStatus: (deviceId, partial) => set((s) => ({
        devices: s.devices.map((d) => (d.id === deviceId ? { ...d, ...partial } : d)),
      })),

      // Geofence CRUD
      addGeofenceZone: (zone) => set((s) => ({ geofenceZones: [...s.geofenceZones, zone] })),

      updateGeofenceZone: (id, updates) => set((s) => ({
        geofenceZones: s.geofenceZones.map((z) => (z.id === id ? { ...z, ...updates } : z)),
      })),

      removeGeofenceZone: (id) => set((s) => ({ geofenceZones: s.geofenceZones.filter((z) => z.id !== id) })),

      // Screen time CRUD
      addScreenTimeRule: (rule) => set((s) => ({ screenTimeRules: [...s.screenTimeRules, rule] })),

      updateScreenTimeRule: (id, updates) => set((s) => ({
        screenTimeRules: s.screenTimeRules.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      })),

      removeScreenTimeRule: (id) => set((s) => ({ screenTimeRules: s.screenTimeRules.filter((r) => r.id !== id) })),

      // App usage
      addAppUsage: (entry) => set((s) => ({ appUsage: [...s.appUsage, entry] })),

      clearAppUsageForDevice: (deviceId) => set((s) => ({
        appUsage: s.appUsage.filter((e) => e.deviceId !== deviceId),
      })),

      // SOS alerts
      addSOSAlert: (alert) => set((s) => ({ sosAlerts: [...s.sosAlerts, alert] })),

      resolveSOSAlert: (id, resolvedBy) => set((s) => ({
        sosAlerts: s.sosAlerts.map((a) =>
          a.id === id
            ? { ...a, isResolved: true, resolvedAt: new Date().toISOString(), resolvedBy }
            : a
        ),
      })),

      // Approval requests
      addApprovalRequest: (request) => set((s) => ({ approvalRequests: [...s.approvalRequests, request] })),

      respondToApproval: (id, status, respondedBy) => set((s) => ({
        approvalRequests: s.approvalRequests.map((r) =>
          r.id === id
            ? { ...r, status, respondedAt: new Date().toISOString(), respondedBy }
            : r
        ),
      })),

      // Commands
      sendCommand: (deviceId, type, familyId, payload) => {
        const command: GuardianCommand = {
          id: `cmd-${Date.now()}`,
          familyId,
          deviceId,
          type,
          payload,
          sentAt: new Date().toISOString(),
          status: 'pending',
        };
        set((s) => ({ pendingCommands: [...s.pendingCommands, command] }));
      },

      markCommandExecuted: (id) => set((s) => ({
        pendingCommands: s.pendingCommands.map((c) =>
          c.id === id ? { ...c, status: 'executed', executedAt: new Date().toISOString() } : c
        ),
      })),

      markCommandFailed: (id) => set((s) => ({
        pendingCommands: s.pendingCommands.map((c) =>
          c.id === id ? { ...c, status: 'failed' } : c
        ),
      })),

      // Pairing
      generatePairingCode: () => {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        set({ activePairingCode: code });
        return code;
      },

      clearPairingCode: () => set({ activePairingCode: null }),
    }),
    { name: 'guardian-store', storage: createJSONStorage(() => AsyncStorage) }
  )
);
