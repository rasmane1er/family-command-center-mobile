import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import type { AutomationRule, MarketplaceListing, ConflictRecord, TimeBlock, SmartDevice, Task } from '../types';
import { secureStorage } from '../storage/secureStorage';
import * as hueService from '../services/hueService';
import * as smartDeviceService from '../services/smartDeviceService';
import * as automationRuleService from '../services/automationRuleService';
import * as marketplaceListingService from '../services/marketplaceListingService';
import { useFamilyStore } from './useFamilyStore';

const generateId = () => Math.random().toString(36).substring(2, 11);

const HUE_IP_KEY = 'hue_bridge_ip';
const HUE_APP_KEY_KEY = 'hue_application_key';

// Kept out of Zustand state deliberately — this store has no persist
// middleware, so the durable copy of the secret lives in secureStorage
// (keychain/Keystore); this is just an in-memory cache for action closures
// within the current session, mirroring the refreshPromise module-level
// pattern already used in src/api/client.ts.
let cachedHueAppKey: string | null = null;

const briToPercent = (bri: number) => Math.round((bri / 254) * 100);
const percentToBri = (pct: number) => Math.round((pct / 100) * 254);

export interface HueSceneSummary {
  id: string;
  name: string;
  groupId: string;
}

interface AutomationState {
  rules: AutomationRule[];
  listings: MarketplaceListing[];
  conflicts: ConflictRecord[];
  timeBlocks: TimeBlock[];
  devices: SmartDevice[];

  // Automation
  addRule: (r: Omit<AutomationRule, 'id' | 'runCount'>) => void;
  toggleRule: (id: string) => void;
  deleteRule: (id: string) => void;
  // Bookkeeping for a rule actually firing — the only place runCount/
  // lastRun ever change, called by useAutomationEngine.ts once per real
  // trigger-and-action cycle.
  recordRuleRun: (id: string) => void;

  // Marketplace
  addListing: (l: Omit<MarketplaceListing, 'id' | 'createdAt'>) => void;
  // Claiming creates a real Task (requiresApproval: true, linked back via
  // marketplaceListingId) instead of running its own parallel claim →
  // submit → approve → payout pipeline. The claimant finishes it exactly
  // like any other task — same photo-proof submission in Tasks/Kids Mode,
  // same parent "Needs Review" queue, same completeTask()-driven point
  // award. Marketplace has no completion logic of its own anymore; it just
  // reads the linked task's live status.
  claimListing: (id: string, memberId: string) => void;
  // Removes the listing itself only — deliberately does not touch its
  // linked Task. That task is a real record of work someone actually did
  // (with photo proof, possibly already approved and paid out); clearing
  // the listing from the marketplace view shouldn't retroactively erase
  // that history or claw back points already awarded.
  deleteListing: (id: string) => void;
  // One-time self-heal for listings claimed before claimListing() started
  // creating a real linked Task — those are stuck with claimedBy set and
  // no taskId, so "Open in Tasks" has nothing to show. Idempotent (only
  // touches listings still missing a taskId), safe to call on every
  // Marketplace mount.
  repairOrphanedClaims: () => void;

  // Conflicts
  addConflict: (c: Omit<ConflictRecord, 'id' | 'createdAt'>) => void;
  resolveConflict: (id: string, resolution: string) => void;
  updateConflictStatus: (id: string, status: ConflictRecord['status']) => void;

  // Time Blocks
  addTimeBlock: (b: Omit<TimeBlock, 'id'>) => void;
  deleteTimeBlock: (id: string) => void;

  // Smart Home — generic (non-Hue) devices, family-shared and backend-synced.
  // Hue-branded entries in `devices` are a separate live feed refreshed from
  // the bridge (see refreshHueDevices) and are not affected by these actions.
  devicesLoaded: boolean;
  fetchDevices: () => Promise<void>;
  addDevice: (device: SmartDevice) => void;
  deleteDevice: (id: string) => void;
  toggleDevice: (id: string) => void;
  updateDeviceValue: (id: string, value: number) => void;

  // Smart Home — real Philips Hue Bridge integration
  hueBridgeIp: string | null;
  hueConnected: boolean;
  hueScenes: HueSceneSummary[];
  isRefreshingHue: boolean;
  hydrateHueConnection: () => Promise<void>;
  connectHueBridge: (ip: string, appKey: string) => Promise<void>;
  disconnectHue: () => Promise<void>;
  refreshHueDevices: () => Promise<void>;
  setHueLightState: (deviceId: string, state: { on?: boolean; brightnessPct?: number }) => Promise<void>;
  fetchHueScenes: () => Promise<void>;
  recallHueScene: (sceneId: string) => Promise<void>;

  isLoaded: boolean;
  fetchFromServer: () => Promise<void>;
}

export const useAutomationStore = create<AutomationState>()(
  persist(
    (set, get) => ({
  rules: [],
  listings: [],
  conflicts: [],
  timeBlocks: [],
  devices: [],
  devicesLoaded: false,
  isLoaded: false,
  hueBridgeIp: null,
  hueConnected: false,
  hueScenes: [],
  isRefreshingHue: false,

  addRule: (r) => {
    const rule: AutomationRule = { ...r, id: generateId(), runCount: 0 };
    set((s) => ({ rules: [rule, ...s.rules] }));
    automationRuleService.createAutomationRule(rule).catch(() => {
      set((s) => ({ rules: s.rules.filter((x) => x.id !== rule.id) }));
    });
  },
  toggleRule: (id) => {
    const rule = get().rules.find((r) => r.id === id);
    if (!rule) return;
    const isActive = !rule.isActive;
    set((s) => ({ rules: s.rules.map((r) => (r.id === id ? { ...r, isActive } : r)) }));
    automationRuleService.updateAutomationRuleRemote(id, { isActive }).catch(() => {});
  },
  deleteRule: (id) => {
    const prev = get().rules;
    set((s) => ({ rules: s.rules.filter((r) => r.id !== id) }));
    automationRuleService.deleteAutomationRuleRemote(id).catch(() => { set({ rules: prev }); });
  },
  recordRuleRun: (id) => {
    const lastRun = new Date().toISOString();
    const rule = get().rules.find((r) => r.id === id);
    if (!rule) return;
    const runCount = rule.runCount + 1;
    set((s) => ({
      rules: s.rules.map((r) => (r.id === id ? { ...r, runCount, lastRun } : r)),
    }));
    automationRuleService.updateAutomationRuleRemote(id, { runCount, lastRun }).catch(() => {});
  },

  addListing: (l) => {
    const listing: MarketplaceListing = { ...l, id: generateId(), createdAt: new Date().toISOString() };
    set((s) => ({ listings: [listing, ...s.listings] }));
    marketplaceListingService.createMarketplaceListing(listing).catch(() => {
      set((s) => ({ listings: s.listings.filter((x) => x.id !== listing.id) }));
    });
  },
  claimListing: (id, memberId) => {
    const listing = get().listings.find((l) => l.id === id);
    if (!listing) return;

    const now = new Date().toISOString();
    const taskId = generateId();
    const task: Task = {
      id: taskId,
      familyId: listing.familyId,
      title: listing.title,
      description: listing.description,
      assignedTo: [memberId],
      priority: 'medium',
      status: 'pending',
      category: 'Marketplace',
      recurrence: 'none',
      points: listing.pointsValue,
      createdAt: now,
      createdBy: listing.createdBy,
      requiresApproval: true,
      marketplaceListingId: id,
    };
    useFamilyStore.getState().addTask(task);

    set((s) => ({
      listings: s.listings.map((l) => (l.id === id ? { ...l, claimedBy: memberId, isAvailable: false, taskId } : l)),
    }));
    marketplaceListingService
      .updateMarketplaceListingRemote(id, { claimedBy: memberId, isAvailable: false, taskId })
      .catch(() => {});
  },
  deleteListing: (id) => {
    const prev = get().listings;
    set((s) => ({ listings: s.listings.filter((l) => l.id !== id) }));
    marketplaceListingService.deleteMarketplaceListingRemote(id).catch(() => { set({ listings: prev }); });
  },
  repairOrphanedClaims: () => {
    const orphaned = get().listings.filter((l) => l.claimedBy && !l.isAvailable && !l.taskId);
    if (orphaned.length === 0) return;

    const now = new Date().toISOString();
    const taskIds = new Map<string, string>();
    orphaned.forEach((l) => {
      const taskId = generateId();
      taskIds.set(l.id, taskId);
      useFamilyStore.getState().addTask({
        id: taskId,
        familyId: l.familyId,
        title: l.title,
        description: l.description,
        assignedTo: [l.claimedBy as string],
        priority: 'medium',
        status: 'pending',
        category: 'Marketplace',
        recurrence: 'none',
        points: l.pointsValue,
        createdAt: now,
        createdBy: l.createdBy,
        requiresApproval: true,
        marketplaceListingId: l.id,
      });
    });

    set((s) => ({
      listings: s.listings.map((l) => (taskIds.has(l.id) ? { ...l, taskId: taskIds.get(l.id) } : l)),
    }));
    taskIds.forEach((taskId, listingId) => {
      marketplaceListingService.updateMarketplaceListingRemote(listingId, { taskId }).catch(() => {});
    });
  },

  addConflict: (c) =>
    set((s) => ({ conflicts: [{ ...c, id: generateId(), createdAt: new Date().toISOString() }, ...s.conflicts] })),
  resolveConflict: (id, resolution) =>
    set((s) => ({
      conflicts: s.conflicts.map((c) =>
        c.id === id ? { ...c, resolution, status: 'resolved' as const, resolvedAt: new Date().toISOString() } : c
      ),
    })),
  updateConflictStatus: (id, status) =>
    set((s) => ({ conflicts: s.conflicts.map((c) => (c.id === id ? { ...c, status } : c)) })),

  addTimeBlock: (b) =>
    set((s) => ({ timeBlocks: [{ ...b, id: generateId() }, ...s.timeBlocks] })),
  deleteTimeBlock: (id) =>
    set((s) => ({ timeBlocks: s.timeBlocks.filter((b) => b.id !== id) })),

  fetchDevices: async () => {
    try {
      const { devices } = await smartDeviceService.fetchDevices();
      set((s) => ({
        // Hue devices are synthesized locally from a live bridge session,
        // never backend-persisted — but only keep them here if that bridge
        // is actually connected right now, so a stale cached Hue device from
        // a bridge we're no longer paired with doesn't linger forever.
        devices: [...devices, ...(s.hueConnected ? s.devices.filter((d) => d.brand === 'Philips Hue') : [])],
        devicesLoaded: true,
      }));
    } catch {
      set({ devicesLoaded: true });
    }
  },

  addDevice: (device) => {
    set((s) => ({ devices: [...s.devices, device] }));
    smartDeviceService.createDevice(device).catch(() => {
      set((s) => ({ devices: s.devices.filter((d) => d.id !== device.id) }));
    });
  },

  deleteDevice: (id) => {
    const prev = get().devices;
    set((s) => ({ devices: s.devices.filter((d) => d.id !== id) }));
    smartDeviceService.deleteDeviceRemote(id).catch(() => { set({ devices: prev }); });
  },

  toggleDevice: (id) => {
    const device = get().devices.find((d) => d.id === id);
    if (device?.brand === 'Philips Hue') {
      get().setHueLightState(id, { on: !device.isOn });
      return;
    }
    set((s) => ({ devices: s.devices.map((d) => (d.id === id ? { ...d, isOn: !d.isOn } : d)) }));
    if (device) smartDeviceService.updateDeviceRemote(id, { isOn: !device.isOn }).catch(() => {});
  },
  updateDeviceValue: (id, value) => {
    const device = get().devices.find((d) => d.id === id);
    if (device?.brand === 'Philips Hue') {
      get().setHueLightState(id, { brightnessPct: value });
      return;
    }
    set((s) => ({ devices: s.devices.map((d) => (d.id === id ? { ...d, value } : d)) }));
    smartDeviceService.updateDeviceRemote(id, { value }).catch(() => {});
  },

  hydrateHueConnection: async () => {
    const [ip, appKey] = await Promise.all([
      secureStorage.getToken(HUE_IP_KEY),
      secureStorage.getToken(HUE_APP_KEY_KEY),
    ]);
    if (!ip || !appKey) return;
    cachedHueAppKey = appKey;
    set({ hueBridgeIp: ip, hueConnected: true });
    await get().refreshHueDevices();
    await get().fetchHueScenes();
  },

  connectHueBridge: async (ip, appKey) => {
    await secureStorage.setToken(HUE_IP_KEY, ip);
    await secureStorage.setToken(HUE_APP_KEY_KEY, appKey);
    cachedHueAppKey = appKey;
    set({ hueBridgeIp: ip, hueConnected: true });
    await get().refreshHueDevices();
    await get().fetchHueScenes();
  },

  disconnectHue: async () => {
    await secureStorage.removeToken(HUE_IP_KEY);
    await secureStorage.removeToken(HUE_APP_KEY_KEY);
    cachedHueAppKey = null;
    set((s) => ({
      hueBridgeIp: null,
      hueConnected: false,
      hueScenes: [],
      devices: s.devices.filter((d) => d.brand !== 'Philips Hue'),
    }));
  },

  refreshHueDevices: async () => {
    const { hueBridgeIp } = get();
    if (!hueBridgeIp || !cachedHueAppKey) return;

    set({ isRefreshingHue: true });
    try {
      const [lights, groups] = await Promise.all([
        hueService.getLights(hueBridgeIp, cachedHueAppKey),
        hueService.getGroups(hueBridgeIp, cachedHueAppKey),
      ]);

      const roomForLight = (lightId: string): string => {
        for (const group of Object.values(groups)) {
          if (group.class && group.lights.includes(lightId)) return group.name;
        }
        return 'Other';
      };

      const now = new Date().toISOString();
      const hueDevices: SmartDevice[] = Object.entries(lights).map(([id, light]) => ({
        id: `hue-${id}`,
        familyId: 'local',
        name: light.name,
        type: 'light',
        room: roomForLight(id),
        isOnline: light.state.reachable ?? true,
        isOn: light.state.on,
        value: light.state.bri !== undefined ? briToPercent(light.state.bri) : undefined,
        unit: light.state.bri !== undefined ? '%' : undefined,
        brand: 'Philips Hue',
        lastSeen: now,
      }));

      set((s) => ({
        devices: [...s.devices.filter((d) => d.brand !== 'Philips Hue'), ...hueDevices],
        isRefreshingHue: false,
      }));
    } catch {
      set({ isRefreshingHue: false });
    }
  },

  setHueLightState: async (deviceId, state) => {
    const { hueBridgeIp, devices } = get();
    if (!hueBridgeIp || !cachedHueAppKey) return;
    const device = devices.find((d) => d.id === deviceId);
    if (!device || !deviceId.startsWith('hue-')) return;
    const lightId = deviceId.replace(/^hue-/, '');
    const previous = { ...device };

    set((s) => ({
      devices: s.devices.map((d) =>
        d.id === deviceId
          ? {
              ...d,
              ...(state.on !== undefined && { isOn: state.on }),
              ...(state.brightnessPct !== undefined && { value: state.brightnessPct }),
            }
          : d
      ),
    }));

    try {
      await hueService.setLightState(hueBridgeIp, cachedHueAppKey, lightId, {
        ...(state.on !== undefined && { on: state.on }),
        ...(state.brightnessPct !== undefined && { bri: percentToBri(state.brightnessPct) }),
      });
    } catch {
      set((s) => ({ devices: s.devices.map((d) => (d.id === deviceId ? previous : d)) }));
    }
  },

  fetchHueScenes: async () => {
    const { hueBridgeIp } = get();
    if (!hueBridgeIp || !cachedHueAppKey) return;
    try {
      const scenes = await hueService.getScenes(hueBridgeIp, cachedHueAppKey);
      const summaries: HueSceneSummary[] = Object.entries(scenes)
        .filter(([, scene]) => !!scene.group)
        .map(([id, scene]) => ({ id, name: scene.name, groupId: scene.group as string }));
      set({ hueScenes: summaries });
    } catch {
      // best-effort
    }
  },

  recallHueScene: async (sceneId) => {
    const { hueBridgeIp, hueScenes } = get();
    if (!hueBridgeIp || !cachedHueAppKey) return;
    const scene = hueScenes.find((s) => s.id === sceneId);
    if (!scene) return;
    await hueService.recallScene(hueBridgeIp, cachedHueAppKey, scene.groupId, sceneId);
    await get().refreshHueDevices();
  },

  // Real hydration for rules/listings — previously a no-op stub, meaning
  // rules created or listings posted/claimed on another family member's
  // device (or before a reinstall) never showed up here even though
  // addRule/addListing etc. above already write through to the backend.
  fetchFromServer: async () => {
    try {
      const [{ rules }, { listings }] = await Promise.all([
        automationRuleService.fetchAutomationRules(),
        marketplaceListingService.fetchMarketplaceListings(),
      ]);
      set({ rules, listings });
    } catch {
      // offline or backend unreachable — keep whatever is already local.
    }
    set({ isLoaded: true });
  },
    }),
    {
      name: 'family-command-center-automation',
      storage: createJSONStorage(() => mmkvStorage),
      // Hue connection state is deliberately excluded — it's re-derived
      // fresh on every SmartHomeScreen mount via hydrateHueConnection(),
      // which reads the real credentials from secureStorage and re-fetches
      // live device/scene state from the bridge. Persisting a second copy
      // here would just be a stale snapshot that could conflict with that
      // live source of truth. Non-Hue devices persist fine since
      // refreshHueDevices() already only ever replaces the Hue-branded
      // subset of `devices`, leaving the rest untouched.
      partialize: (state) => ({
        rules: state.rules,
        listings: state.listings,
        conflicts: state.conflicts,
        timeBlocks: state.timeBlocks,
        devices: state.devices,
        isLoaded: state.isLoaded,
      }),
    }
  )
);
