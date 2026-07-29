import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Alert } from 'react-native';
import { mmkvStorage } from '../storage/mmkvStorage';

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

// pendingCommands is in-memory only (not persisted, see partialize below),
// but it's never trimmed on its own — completed/failed commands are only
// status-flipped, so a long-running app session keeps growing this array
// forever and it's iterated on every hydrate() call. Trim resolved
// (executed/failed) entries first, oldest-first, and never drop anything
// still 'pending' since that's load-bearing for the optimistic-update flow.
const MAX_PENDING_COMMANDS = 200;
function trimPendingCommands(commands: GuardianCommand[]): GuardianCommand[] {
  if (commands.length <= MAX_PENDING_COMMANDS) return commands;
  const pending = commands.filter((c) => c.status === 'pending');
  const resolved = commands.filter((c) => c.status !== 'pending');
  const keepResolved = resolved.slice(-Math.max(0, MAX_PENDING_COMMANDS - pending.length));
  return [...keepResolved, ...pending];
}

// appUsage currently has no callers anywhere in the app (reporting-only,
// dead today per the comment at addAppUsage below), but cap it defensively
// in case it gets wired up — same convention as the other unbounded stores.
const MAX_APP_USAGE = 1000;

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
  pairWithCode: (pairingCode: string) => Promise<string>;

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
  deleteSOSAlert: (id: string) => void;
  clearResolvedSOSAlerts: () => void;

  // Approval requests
  addApprovalRequest: (request: ParentApprovalRequest) => void;
  respondToApproval: (id: string, status: 'approved' | 'denied', respondedBy: string) => void;

  // Commands
  sendCommand: (deviceId: string, type: GuardianCommand['type'], payload?: Record<string, unknown>) => void;
  markCommandExecuted: (id: string) => void;
  markCommandFailed: (id: string) => void;
  setPendingCommands: (deviceId: string, commands: GuardianCommand[]) => void;

  // Live screen stream tracking (persists across navigation)
  streamingDeviceId: string | null;
  setStreamingDeviceId: (id: string | null) => void;
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

        const newDevices = devicesRes.status === 'fulfilled' ? devicesRes.value.devices : null;

        // Fetch today's app usage for every paired device
        let mergedUsage: AppUsageEntry[] = [];
        if (newDevices && newDevices.length > 0) {
          const today = new Date().toISOString().split('T')[0];
          const usageResults = await Promise.allSettled(
            newDevices.map((d) => guardianService.fetchAppUsage(d.id, today)),
          );
          mergedUsage = usageResults.flatMap((r) =>
            r.status === 'fulfilled' ? r.value.usage : [],
          );
        }

        set((s) => {
          // Don't let a stale server status overwrite an optimistic lock/unlock
          // that hasn't been executed by the child yet. A pending lock/unlock
          // command means we intentionally changed the status locally; keeping
          // the server value would flip the button back immediately.
          const pendingByDevice = new Map<string, string>();
          for (const cmd of s.pendingCommands) {
            if (cmd.status === 'pending') {
              if (cmd.type === 'lock') pendingByDevice.set(cmd.deviceId, 'restricted');
              else if (cmd.type === 'unlock') pendingByDevice.set(cmd.deviceId, 'online');
              else if (cmd.type === 'school_on') pendingByDevice.set(cmd.deviceId, 'school_mode');
              else if (cmd.type === 'bedtime_on') pendingByDevice.set(cmd.deviceId, 'bedtime');
              else if (cmd.type === 'school_off' || cmd.type === 'bedtime_off') pendingByDevice.set(cmd.deviceId, 'online');
            }
          }

          const mergedDevices = newDevices
            ? newDevices.map((d) => {
                const pendingStatus = pendingByDevice.get(d.id);
                return pendingStatus ? { ...d, status: pendingStatus as typeof d.status } : d;
              })
            : s.devices;

          return {
            devices: mergedDevices,
            geofenceZones: geofencesRes.status === 'fulfilled' ? geofencesRes.value.zones : s.geofenceZones,
            screenTimeRules: screenTimeRes.status === 'fulfilled' ? screenTimeRes.value.rules : s.screenTimeRules,
            sosAlerts: sosRes.status === 'fulfilled' ? sosRes.value.alerts : s.sosAlerts,
            approvalRequests: approvalsRes.status === 'fulfilled' ? approvalsRes.value.approvals : s.approvalRequests,
            appUsage: mergedUsage.length > 0 ? mergedUsage : s.appUsage,
            isHydrating: false,
          };
        });
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
        const result = await guardianService.pairDevice(pairingCode);
        // Reload the full device list from the server so the newly-paired
        // device appears with all its fields (name, status, etc.)
        const { devices } = await guardianService.fetchDevices();
        set({ devices });
        return result.deviceId;
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
        set((s) => ({ appUsage: [...s.appUsage, entry].slice(-MAX_APP_USAGE) }));
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

      deleteSOSAlert: (id) => {
        set((s) => ({ sosAlerts: s.sosAlerts.filter((a) => a.id !== id) }));
        (async () => {
          try { await guardianService.deleteSOSAlert(id); } catch { /* best-effort */ }
        })();
      },

      clearResolvedSOSAlerts: () => {
        set((s) => ({ sosAlerts: s.sosAlerts.filter((a) => !a.isResolved) }));
        (async () => {
          try { await guardianService.clearResolvedSOSAlerts(); } catch { /* best-effort */ }
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
        set((s) => ({ pendingCommands: trimPendingCommands([...s.pendingCommands, optimistic]) }));

        // Immediately flip the device status locally so buttons update
        // without waiting for the next hydrate or child confirmation.
        const OPTIMISTIC_STATUS: Partial<Record<string, import('../types').ChildDeviceStatus>> = {
          lock: 'restricted',
          unlock: 'online',
          school_on: 'school_mode',
          school_off: 'online',
          bedtime_on: 'bedtime',
          bedtime_off: 'online',
        };
        const optimisticStatus = OPTIMISTIC_STATUS[type];
        if (optimisticStatus) {
          set((s) => ({
            devices: s.devices.map((d) =>
              d.id === deviceId ? { ...d, status: optimisticStatus } : d,
            ),
          }));
        }

        // Snapshot the pre-optimistic status so we can roll back if the request fails.
        // This is read synchronously before the async block starts, so it reflects
        // the state BEFORE the optimistic update above.
        const previousStatus = useGuardianStore.getState().devices.find((d) => d.id === deviceId)?.status;

        (async () => {
          try {
            const serverDeviceId = await deviceIds.resolve(deviceId);
            const { command } = await guardianService.sendCommand(serverDeviceId, type as guardianService.GuardianCommandType, payload);
            set((s) => ({
              pendingCommands: s.pendingCommands.map((c) => (c.id === optimistic.id ? { ...command, id: c.id } : c)),
            }));
          } catch (err: any) {
            // Roll back optimistic status
            if (optimisticStatus && previousStatus) {
              set((s) => ({
                devices: s.devices.map((d) =>
                  d.id === deviceId ? { ...d, status: previousStatus } : d,
                ),
              }));
            }
            set((s) => ({
              pendingCommands: s.pendingCommands.map((c) => (c.id === optimistic.id ? { ...c, status: 'failed' } : c)),
            }));

            // Surface a meaningful error to the guardian
            const isOffline =
              typeof err?.message === 'string' && err.message.includes('409');
            if (isOffline) {
              // Mark device offline locally right away — don't wait for next poll
              set((s) => ({
                devices: s.devices.map((d) =>
                  d.id === deviceId ? { ...d, status: 'offline' as const } : d,
                ),
              }));
              Alert.alert(
                'Device Offline',
                'This device is not reachable. The child app may have been uninstalled or the device is off.\n\nUse "Reconnect Device" to pair again.',
                [{ text: 'OK' }],
              );
            }
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
        pendingCommands: trimPendingCommands([
          ...s.pendingCommands.filter((c) => c.deviceId !== deviceId || c.status !== 'pending'),
          ...commands,
        ]),
      })),

      streamingDeviceId: null,
      setStreamingDeviceId: (id) => set({ streamingDeviceId: id }),
    }),
    {
      name: 'guardian-store',
      storage: createJSONStorage(() => mmkvStorage),
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
