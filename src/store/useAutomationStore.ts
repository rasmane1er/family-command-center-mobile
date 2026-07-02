import { create } from 'zustand';
import type { AutomationRule, MarketplaceListing, ConflictRecord, TimeBlock, SmartDevice } from '../types';
import { secureStorage } from '../storage/secureStorage';
import * as hueService from '../services/hueService';

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

  // Marketplace
  addListing: (l: Omit<MarketplaceListing, 'id' | 'createdAt'>) => void;
  claimListing: (id: string, memberId: string) => void;
  completeListing: (id: string) => void;

  // Conflicts
  addConflict: (c: Omit<ConflictRecord, 'id' | 'createdAt'>) => void;
  resolveConflict: (id: string, resolution: string) => void;
  updateConflictStatus: (id: string, status: ConflictRecord['status']) => void;

  // Time Blocks
  addTimeBlock: (b: Omit<TimeBlock, 'id'>) => void;
  deleteTimeBlock: (id: string) => void;

  // Smart Home (generic, local-only)
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

  seedDemoData: () => void;
}

export const useAutomationStore = create<AutomationState>((set, get) => ({
  rules: [],
  listings: [],
  conflicts: [],
  timeBlocks: [],
  devices: [],
  hueBridgeIp: null,
  hueConnected: false,
  hueScenes: [],
  isRefreshingHue: false,

  addRule: (r) =>
    set((s) => ({ rules: [{ ...r, id: generateId(), runCount: 0 }, ...s.rules] })),
  toggleRule: (id) =>
    set((s) => ({ rules: s.rules.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r)) })),
  deleteRule: (id) =>
    set((s) => ({ rules: s.rules.filter((r) => r.id !== id) })),

  addListing: (l) =>
    set((s) => ({ listings: [{ ...l, id: generateId(), createdAt: new Date().toISOString() }, ...s.listings] })),
  claimListing: (id, memberId) =>
    set((s) => ({ listings: s.listings.map((l) => (l.id === id ? { ...l, claimedBy: memberId, isAvailable: false } : l)) })),
  completeListing: (id) =>
    set((s) => ({ listings: s.listings.map((l) => (l.id === id ? { ...l, completedAt: new Date().toISOString() } : l)) })),

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

  toggleDevice: (id) => {
    const device = get().devices.find((d) => d.id === id);
    if (device?.brand === 'Philips Hue') {
      get().setHueLightState(id, { on: !device.isOn });
      return;
    }
    set((s) => ({ devices: s.devices.map((d) => (d.id === id ? { ...d, isOn: !d.isOn } : d)) }));
  },
  updateDeviceValue: (id, value) => {
    const device = get().devices.find((d) => d.id === id);
    if (device?.brand === 'Philips Hue') {
      get().setHueLightState(id, { brightnessPct: value });
      return;
    }
    set((s) => ({ devices: s.devices.map((d) => (d.id === id ? { ...d, value } : d)) }));
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

  seedDemoData: () => {
    const now = new Date().toISOString();

    const rules: AutomationRule[] = [
      { id: 'aut1', familyId: 'demo-family', name: 'School Morning Alert', description: 'Remind kids to pack bags at 7:30am on school days', isActive: true, trigger: { type: 'time', value: '07:30', condition: 'weekdays' }, action: { type: 'notify', value: 'Pack your backpack! School bus in 30 minutes 🎒', target: 'children' }, runCount: 47, lastRun: now, icon: 'alarm', color: '#2980B9' },
      { id: 'aut2', familyId: 'demo-family', name: 'Bill Due Reminder', description: 'Alert 3 days before any bill is due', isActive: true, trigger: { type: 'condition', value: 'bill_due_in_3_days' }, action: { type: 'notify', value: 'Bill payment reminder sent to parents', target: 'parents' }, runCount: 12, lastRun: now, icon: 'receipt', color: '#E74C3C' },
      { id: 'aut3', familyId: 'demo-family', name: 'Weekend Chore Assignment', description: 'Auto-assign weekend chores every Friday at 6pm', isActive: true, trigger: { type: 'time', value: '18:00', condition: 'friday' }, action: { type: 'task', value: 'Assign weekend chores', target: 'all' }, runCount: 23, lastRun: now, icon: 'checkbox', color: '#27AE60' },
      { id: 'aut4', familyId: 'demo-family', name: 'Low Pantry Alert', description: 'Notify when pantry item drops below minimum', isActive: false, trigger: { type: 'condition', value: 'pantry_low' }, action: { type: 'notify', value: 'Add to shopping list', target: 'parents' }, runCount: 8, icon: 'nutrition', color: '#F5A623' },
      { id: 'aut5', familyId: 'demo-family', name: 'Bedtime Wind-Down', description: 'Turn off screens and dim lights at 8:30pm for kids', isActive: true, trigger: { type: 'time', value: '20:30', condition: 'daily' }, action: { type: 'device', value: 'dim_lights_kids_rooms', target: 'smart_home' }, runCount: 89, lastRun: now, icon: 'moon', color: '#8E44AD' },
      { id: 'aut6', familyId: 'demo-family', name: 'Weekly Family Report', description: 'Generate AI family health report every Sunday', isActive: true, trigger: { type: 'time', value: '09:00', condition: 'sunday' }, action: { type: 'message', value: 'Generate weekly family health summary', target: 'ai' }, runCount: 18, lastRun: now, icon: 'bar-chart', color: '#16A085' },
    ];

    const listings: MarketplaceListing[] = [
      { id: 'mkt1', familyId: 'demo-family', createdBy: 'member-1', title: 'Mow the Lawn', description: 'Front and back yard, edge the walkways too', category: 'chores', pointsValue: 150, isAvailable: true, icon: 'leaf', tags: ['outdoor', 'weekend'], createdAt: now },
      { id: 'mkt2', familyId: 'demo-family', createdBy: 'member-2', title: 'Math Tutoring Session', description: '1 hour of algebra help for Aiden', category: 'lessons', pointsValue: 200, isAvailable: true, icon: 'school', tags: ['education', 'Aiden'], createdAt: now },
      { id: 'mkt3', familyId: 'demo-family', createdBy: 'member-3', title: 'Clean Garage', description: 'Sweep and organize the garage shelves', category: 'chores', pointsValue: 250, isAvailable: false, claimedBy: 'member-3', icon: 'home', tags: ['indoor', 'big-job'], createdAt: now },
      { id: 'mkt4', familyId: 'demo-family', createdBy: 'member-2', title: 'Teach Me to Bake', description: 'Lily wants to learn to bake cookies', category: 'skills', pointsValue: 100, isAvailable: true, icon: 'restaurant', tags: ['cooking', 'Lily', 'fun'], createdAt: now },
      { id: 'mkt5', familyId: 'demo-family', createdBy: 'member-1', title: 'Car Wash & Detail', description: 'Wash both cars inside and out', category: 'chores', pointsValue: 300, isAvailable: true, icon: 'car', tags: ['outdoor', 'vehicles'], createdAt: now },
      { id: 'mkt6', familyId: 'demo-family', createdBy: 'member-3', title: 'Tech Support', description: 'Set up Dad\'s new tablet and apps', category: 'skills', pointsValue: 175, isAvailable: true, icon: 'phone-portrait', tags: ['tech', 'Aiden'], createdAt: now },
    ];

    const conflicts: ConflictRecord[] = [
      { id: 'cf1', familyId: 'demo-family', title: 'Screen Time Dispute', description: 'Aiden wants more gaming time, parents say 2 hours is enough on school nights', partiesInvolved: ['member-1', 'member-3'], status: 'resolved', severity: 'low', aiSuggestion: 'Consider a points-based system where Aiden earns extra screen time through completed homework and chores.', resolution: 'Agreed on extra 30min for each completed chore set. Trial period 2 weeks.', resolvedAt: now, createdAt: now },
      { id: 'cf2', familyId: 'demo-family', title: 'Chore Distribution Fairness', description: "Lily feels she's assigned harder chores than Aiden for the same number of points", partiesInvolved: ['member-3', 'member-4'], status: 'in_mediation', severity: 'medium', aiSuggestion: 'Review and re-categorize chores by time required and difficulty. Ensure equitable point values relative to effort.', createdAt: now },
      { id: 'cf3', familyId: 'demo-family', title: 'Vacation Budget Disagreement', description: 'Marcus wants to stay within $5k for Hawaii trip, Sarah wants to splurge on a nicer resort', partiesInvolved: ['member-1', 'member-2'], status: 'in_mediation', severity: 'medium', aiSuggestion: "Consider splitting the difference: book a 4-star vs 5-star resort and use savings from meal planning to offset the cost. The family's current savings rate suggests $6k is achievable by summer.", createdAt: now },
    ];

    const devices: SmartDevice[] = [
      { id: 'dev1', familyId: 'demo-family', name: 'Living Room Lights', type: 'light', room: 'Living Room', isOnline: true, isOn: true, value: 80, unit: '%', brand: 'Philips Hue', lastSeen: now },
      { id: 'dev2', familyId: 'demo-family', name: 'Main Thermostat', type: 'thermostat', room: 'Hallway', isOnline: true, isOn: true, value: 72, unit: '°F', brand: 'Nest', lastSeen: now },
      { id: 'dev3', familyId: 'demo-family', name: 'Front Door Lock', type: 'lock', room: 'Entry', isOnline: true, isOn: false, brand: 'August', lastSeen: now },
      { id: 'dev4', familyId: 'demo-family', name: 'Driveway Camera', type: 'camera', room: 'Exterior', isOnline: true, isOn: true, brand: 'Ring', lastSeen: now },
      { id: 'dev5', familyId: 'demo-family', name: "Aiden's Room Light", type: 'light', room: "Aiden's Room", isOnline: true, isOn: false, value: 0, unit: '%', brand: 'Philips Hue', lastSeen: now },
      { id: 'dev6', familyId: 'demo-family', name: 'Kitchen Speaker', type: 'speaker', room: 'Kitchen', isOnline: true, isOn: true, brand: 'Sonos', lastSeen: now },
      { id: 'dev7', familyId: 'demo-family', name: 'Garage Sensor', type: 'sensor', room: 'Garage', isOnline: true, isOn: false, battery: 85, brand: 'SmartThings', lastSeen: now },
      { id: 'dev8', familyId: 'demo-family', name: "Lily's Room Light", type: 'light', room: "Lily's Room", isOnline: false, isOn: false, value: 0, unit: '%', battery: 12, brand: 'Philips Hue', lastSeen: now },
    ];

    const today = new Date();
    const timeBlocks: TimeBlock[] = [
      { id: 'tb1', familyId: 'demo-family', memberId: 'member-1', category: 'work', title: 'Work', startTime: '08:00', endTime: '17:00', date: today.toISOString().split('T')[0], isRecurring: true, color: '#2980B9' },
      { id: 'tb2', familyId: 'demo-family', memberId: 'member-2', category: 'work', title: 'Office Hours', startTime: '09:00', endTime: '15:00', date: today.toISOString().split('T')[0], isRecurring: true, color: '#2980B9' },
      { id: 'tb3', familyId: 'demo-family', memberId: 'member-2', category: 'fitness', title: 'Morning Yoga', startTime: '06:00', endTime: '07:00', date: today.toISOString().split('T')[0], isRecurring: true, color: '#27AE60' },
      { id: 'tb4', familyId: 'demo-family', memberId: 'member-3', category: 'school', title: 'School', startTime: '08:00', endTime: '15:30', date: today.toISOString().split('T')[0], isRecurring: true, color: '#F5A623' },
      { id: 'tb5', familyId: 'demo-family', memberId: 'member-4', category: 'school', title: 'Kindergarten', startTime: '08:30', endTime: '13:00', date: today.toISOString().split('T')[0], isRecurring: true, color: '#F5A623' },
      { id: 'tb6', familyId: 'demo-family', memberId: 'member-1', category: 'family', title: 'Family Dinner', startTime: '18:00', endTime: '19:30', date: today.toISOString().split('T')[0], isRecurring: true, color: '#E74C3C' },
    ];

    set({ rules, listings, conflicts, devices, timeBlocks });
  },
}));
