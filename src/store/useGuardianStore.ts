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
import * as guardianService from '../services/guardianService';

// Screens create entries with their own locally-generated `id` (e.g.
// `geo-${Date.now()}`) and, in a few places (ScreenTimeScreen's
// `ensureRule()`), immediately chain an update against that same id in the
// same synchronous tick — before the backend create request could possibly
// have resolved. So local ids are never swapped for server ids once
// assigned; instead each in-flight create's real server id is tracked here
// and resolved lazily by any update/delete that targets it while the create
// is still pending. Rows loaded via hydrate() already carry their real
// server id, so resolution for them is a same-value no-op.
function createPendingIdTracker() {
  const pending = new Map<string, Promise<string>>();
  return {
    track(localId: string, serverIdPromise: Promise<string>) {
      pending.set(localId, serverIdPromise);
      serverIdPromise.finally(() => {
        if (pending.get(localId) === serverIdPromise) pending.delete(localId);
      });
    },
    async resolve(localId: string): Promise<string> {
      const p = pending.get(localId);
      if (!p) return localId;
      try {
        return await p;
      } catch {
        return localId;
      }
    },
  };
}

const deviceIds = createPendingIdTracker();
const geofenceIds = createPendingIdTracker();
const screenTimeIds = createPendingIdTracker();
const sosIds = createPendingIdTracker();
const approvalIds = createPendingIdTracker();

interface GuardianStore {
  devices: ChildDevice[];
  geofenceZones: GeofenceZone[];
  screenTimeRules: ScreenTimeRule[];
  appUsage: AppUsageEntry[];
  sosAlerts: SOSAlert[];
  approvalRequests: ParentApprovalRequest[];
  pendingCommands: GuardianCommand[];

  // This physical device's own identity once it has registered itself as a
  // child device (set by registerThisDevice(), persisted). Null on a
  // parent's device, or on a child device that hasn't registered yet.
  thisDeviceId: string | null;
  myPairingCode: string | null;

  isHydrating: boolean;
  hydrate: () => Promise<void>;

  // Device CRUD
  addDevice: (device: ChildDevice) => void;
  updateDevice: (id: string, updates: Partial<ChildDevice>) => void;
  removeDevice: (id: string) => void;
  updateDeviceStatus: (deviceId: string, partial: Partial<ChildDevice>) => void;

  // Pairing
  registerThisDevice: (input: { deviceName: string; platform: 'ios' | 'android'; memberId: string }) => Promise<string>;
  pairWithCode: (pairingCode: string) => Promise<void>;

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
  sendCommand: (deviceId: string, type: GuardianCommand['type'], payload?: Record<string, unknown>) => void;
  markCommandExecuted: (id: string) => void;
  markCommandFailed: (id: string) => void;
  setPendingCommands: (deviceId: string, commands: GuardianCommand[]) => void;
}

export const useGuardianStore = create<GuardianStore>()(
  persist(
    (set) => ({
      devices: [],
      geofenceZones: [],
      screenTimeRules: [],
      appUsage: [],
      sosAlerts: [],
      approvalRequests: [],
      pendingCommands: [],
      thisDeviceId: null,
      myPairingCode: null,
      isHydrating: false,

      hydrate: async () => {
        set({ isHydrating: true });
        const [devicesRes, geofencesRes, screenTimeRes, sosRes, approvalsRes] = await Promise.allSettled([
          guardianService.fetchDevices(),
          guardianService.fetchGeofences(),
          guardianService.fetchScreenTimeRules(),
          guardianService.fetchSOSAlerts(),
          guardianService.fetchApprovals(),
        ]);

        set((s) => ({
          devices: devicesRes.status === 'fulfilled' ? devicesRes.value.devices : s.devices,
          geofenceZones: geofencesRes.status === 'fulfilled' ? geofencesRes.value.zones : s.geofenceZones,
          screenTimeRules: screenTimeRes.status === 'fulfilled' ? screenTimeRes.value.rules : s.screenTimeRules,
          sosAlerts: sosRes.status === 'fulfilled' ? sosRes.value.alerts : s.sosAlerts,
          approvalRequests: approvalsRes.status === 'fulfilled' ? approvalsRes.value.approvals : s.approvalRequests,
          isHydrating: false,
        }));
      },

      // Device CRUD (local-only helpers used by the command-polling hook to
      // reflect status locally; source of truth is still hydrate()/the
      // backend for anything cross-device)
      addDevice: (device) => set((s) => ({ devices: [...s.devices, device] })),

      updateDevice: (id, updates) => set((s) => ({
        devices: s.devices.map((d) => (d.id === id ? { ...d, ...updates } : d)),
      })),

      removeDevice: (id) => {
        set((s) => ({ devices: s.devices.filter((d) => d.id !== id) }));
        (async () => {
          try {
            const serverId = await deviceIds.resolve(id);
            await guardianService.removeDevice(serverId);
          } catch {
            // best-effort
          }
        })();
      },

      updateDeviceStatus: (deviceId, partial) => set((s) => ({
        devices: s.devices.map((d) => (d.id === deviceId ? { ...d, ...partial } : d)),
      })),

      // Pairing
      registerThisDevice: async ({ deviceName, platform, memberId }) => {
        const { device, pairingCode } = await guardianService.registerDevice({ deviceName, platform, memberId });
        set((s) => ({
          devices: [...s.devices, device],
          thisDeviceId: device.id,
          myPairingCode: pairingCode,
        }));
        return pairingCode;
      },

      pairWithCode: async (pairingCode) => {
        const { device } = await guardianService.pairDevice(pairingCode);
        set((s) => ({
          devices: s.devices.some((d) => d.id === device.id)
            ? s.devices.map((d) => (d.id === device.id ? device : d))
            : [...s.devices, device],
        }));
      },

      // Geofence CRUD
      addGeofenceZone: (zone) => {
        set((s) => ({ geofenceZones: [...s.geofenceZones, zone] }));

        const createPromise = guardianService
          .createGeofence({
            name: zone.name,
            lat: zone.lat,
            lng: zone.lng,
            radius: zone.radius,
            action: zone.action,
            icon: zone.icon,
            color: zone.color,
            linkedMembers: zone.linkedMembers,
          })
          .then((res) => {
            set((s) => ({
              geofenceZones: s.geofenceZones.map((z) => (z.id === zone.id ? { ...res.zone, id: z.id } : z)),
            }));
            return res.zone.id;
          })
          .catch((err) => {
            set((s) => ({ geofenceZones: s.geofenceZones.filter((z) => z.id !== zone.id) }));
            throw err;
          });

        geofenceIds.track(zone.id, createPromise);
      },

      updateGeofenceZone: (id, updates) => {
        set((s) => ({
          geofenceZones: s.geofenceZones.map((z) => (z.id === id ? { ...z, ...updates } : z)),
        }));
        (async () => {
          try {
            const serverId = await geofenceIds.resolve(id);
            await guardianService.updateGeofence(serverId, updates);
          } catch {
            // best-effort; optimistic local state already reflects the edit
          }
        })();
      },

      removeGeofenceZone: (id) => {
        set((s) => ({ geofenceZones: s.geofenceZones.filter((z) => z.id !== id) }));
        (async () => {
          try {
            const serverId = await geofenceIds.resolve(id);
            await guardianService.deleteGeofence(serverId);
          } catch {
            // best-effort
          }
        })();
      },

      // Screen time CRUD
      addScreenTimeRule: (rule) => {
        set((s) => ({ screenTimeRules: [...s.screenTimeRules, rule] }));

        const createPromise = guardianService
          .createScreenTimeRule({
            memberId: rule.memberId,
            label: rule.label,
            dailyLimitMinutes: rule.dailyLimitMinutes,
            blockedApps: rule.blockedApps,
            allowedApps: rule.allowedApps,
            scheduledDowntime: rule.scheduledDowntime,
            isActive: rule.isActive,
          })
          .then((res) => {
            set((s) => ({
              screenTimeRules: s.screenTimeRules.map((r) => (r.id === rule.id ? { ...res.rule, id: r.id } : r)),
            }));
            return res.rule.id;
          })
          .catch((err) => {
            set((s) => ({ screenTimeRules: s.screenTimeRules.filter((r) => r.id !== rule.id) }));
            throw err;
          });

        screenTimeIds.track(rule.id, createPromise);
      },

      updateScreenTimeRule: (id, updates) => {
        set((s) => ({
          screenTimeRules: s.screenTimeRules.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        }));
        (async () => {
          try {
            const serverId = await screenTimeIds.resolve(id);
            await guardianService.updateScreenTimeRule(serverId, updates);
          } catch {
            // best-effort
          }
        })();
      },

      removeScreenTimeRule: (id) => {
        set((s) => ({ screenTimeRules: s.screenTimeRules.filter((r) => r.id !== id) }));
        (async () => {
          try {
            const serverId = await screenTimeIds.resolve(id);
            await guardianService.deleteScreenTimeRule(serverId);
          } catch {
            // best-effort
          }
        })();
      },

      // App usage — reporting-only, not reconciled back into local state
      // beyond the optimistic add (screens read historical usage via
      // hydrate-adjacent fetches, not this local cache, for cross-device data)
      addAppUsage: (entry) => {
        set((s) => ({ appUsage: [...s.appUsage, entry] }));
        guardianService
          .submitAppUsage(entry.deviceId, [
            { appName: entry.appName, packageName: entry.packageName, usageMinutes: entry.usageMinutes, date: entry.date },
          ])
          .catch(() => {});
      },

      clearAppUsageForDevice: (deviceId) => set((s) => ({
        appUsage: s.appUsage.filter((e) => e.deviceId !== deviceId),
      })),

      // SOS alerts
      addSOSAlert: (alert) => {
        set((s) => ({ sosAlerts: [...s.sosAlerts, alert] }));

        const createPromise = guardianService
          .createSOSAlert({
            deviceId: alert.deviceId,
            memberId: alert.memberId,
            lat: alert.lat ?? undefined,
            lng: alert.lng ?? undefined,
            address: alert.address ?? undefined,
            message: alert.message ?? undefined,
          })
          .then((res) => {
            set((s) => ({
              sosAlerts: s.sosAlerts.map((a) => (a.id === alert.id ? { ...res.alert, id: a.id } : a)),
            }));
            return res.alert.id;
          })
          .catch((err) => {
            set((s) => ({ sosAlerts: s.sosAlerts.filter((a) => a.id !== alert.id) }));
            throw err;
          });

        sosIds.track(alert.id, createPromise);
      },

      resolveSOSAlert: (id, resolvedBy) => {
        set((s) => ({
          sosAlerts: s.sosAlerts.map((a) =>
            a.id === id
              ? { ...a, isResolved: true, resolvedAt: new Date().toISOString(), resolvedBy }
              : a
          ),
        }));
        (async () => {
          try {
            const serverId = await sosIds.resolve(id);
            await guardianService.resolveSOSAlert(serverId, resolvedBy);
          } catch {
            // best-effort
          }
        })();
      },

      // Approval requests
      addApprovalRequest: (request) => {
        set((s) => ({ approvalRequests: [...s.approvalRequests, request] }));

        const createPromise = guardianService
          .createApprovalRequest({
            memberId: request.memberId,
            type: request.type as guardianService.ApprovalType,
            title: request.title,
            description: request.description,
          })
          .then((res) => {
            set((s) => ({
              approvalRequests: s.approvalRequests.map((r) => (r.id === request.id ? { ...res.approval, id: r.id } : r)),
            }));
            return res.approval.id;
          })
          .catch((err) => {
            set((s) => ({ approvalRequests: s.approvalRequests.filter((r) => r.id !== request.id) }));
            throw err;
          });

        approvalIds.track(request.id, createPromise);
      },

      respondToApproval: (id, status, respondedBy) => {
        set((s) => ({
          approvalRequests: s.approvalRequests.map((r) =>
            r.id === id
              ? { ...r, status, respondedAt: new Date().toISOString(), respondedBy }
              : r
          ),
        }));
        (async () => {
          try {
            const serverId = await approvalIds.resolve(id);
            await guardianService.respondToApproval(serverId, status, respondedBy);
          } catch {
            // best-effort
          }
        })();
      },

      // Commands
      sendCommand: (deviceId, type, payload) => {
        const optimistic: GuardianCommand = {
          id: `cmd-${Date.now()}`,
          familyId: '',
          deviceId,
          type,
          payload,
          sentAt: new Date().toISOString(),
          status: 'pending',
        };
        set((s) => ({ pendingCommands: [...s.pendingCommands, optimistic] }));

        (async () => {
          try {
            const serverDeviceId = await deviceIds.resolve(deviceId);
            const { command } = await guardianService.sendCommand(serverDeviceId, type as guardianService.GuardianCommandType, payload);
            set((s) => ({
              pendingCommands: s.pendingCommands.map((c) => (c.id === optimistic.id ? { ...command, id: c.id } : c)),
            }));
          } catch {
            set((s) => ({
              pendingCommands: s.pendingCommands.map((c) => (c.id === optimistic.id ? { ...c, status: 'failed' } : c)),
            }));
          }
        })();
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

      setPendingCommands: (deviceId, commands) => set((s) => ({
        pendingCommands: [
          ...s.pendingCommands.filter((c) => c.deviceId !== deviceId || c.status !== 'pending'),
          ...commands,
        ],
      })),
    }),
    {
      name: 'guardian-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        devices: s.devices,
        geofenceZones: s.geofenceZones,
        screenTimeRules: s.screenTimeRules,
        appUsage: s.appUsage,
        sosAlerts: s.sosAlerts,
        approvalRequests: s.approvalRequests,
        thisDeviceId: s.thisDeviceId,
        myPairingCode: s.myPairingCode,
      }),
    }
  )
);
