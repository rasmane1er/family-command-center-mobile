// Thin client for the Philips Hue Bridge's local REST API (CLIP v1).
// All calls except discoverBridges() go directly to the bridge's local IP
// over plain HTTP — no cloud, no backend involved. See the app's
// NSAllowsLocalNetworking / NSLocalNetworkUsageDescription (iOS) and
// usesCleartextTraffic (Android) config, both required for these requests
// to succeed at all.

export interface DiscoveredBridge {
  id: string;
  internalipaddress: string;
}

// One-time cloud lookup (Signify's own discovery broker) that returns the
// bridge's local IP — everything after this is local-network only.
export async function discoverBridges(): Promise<DiscoveredBridge[]> {
  const res = await fetch('https://discovery.meethue.com/');
  if (!res.ok) throw new Error(`Discovery request failed: ${res.status}`);
  return res.json();
}

interface HueApiError {
  type: number;
  address: string;
  description: string;
}

type HueApiResponseEntry<T> = { success: T } | { error: HueApiError };

function firstError(body: unknown): HueApiError | null {
  if (!Array.isArray(body)) return null;
  const entry = body.find((e) => e && typeof e === 'object' && 'error' in e) as
    | { error: HueApiError }
    | undefined;
  return entry?.error ?? null;
}

// Returns the application key on success, or null if the bridge's physical
// link button hasn't been pressed yet (error type 101) — callers should
// retry on an interval while showing a countdown. Throws for any other
// unexpected error.
export async function tryRegisterApplicationKey(bridgeIp: string): Promise<string | null> {
  const res = await fetch(`http://${bridgeIp}/api`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ devicetype: 'family_command_center#mobile' }),
  });
  if (!res.ok) throw new Error(`Bridge responded with ${res.status}`);

  const body: HueApiResponseEntry<{ username: string }>[] = await res.json();
  const successEntry = body.find((e): e is { success: { username: string } } => 'success' in e);
  if (successEntry) return successEntry.success.username;

  const err = firstError(body);
  if (err?.type === 101) return null; // link button not pressed yet
  throw new Error(err?.description ?? 'Unexpected response from bridge');
}

export interface HueLightState {
  on: boolean;
  bri?: number;
  reachable?: boolean;
}

export interface HueLight {
  name: string;
  type: string;
  state: HueLightState;
}

export type HueLightsResponse = Record<string, HueLight>;

export async function getLights(bridgeIp: string, appKey: string): Promise<HueLightsResponse> {
  const res = await fetch(`http://${bridgeIp}/api/${appKey}/lights`);
  if (!res.ok) throw new Error(`Failed to fetch lights: ${res.status}`);
  return res.json();
}

export interface HueGroup {
  name: string;
  type: string;
  class?: string;
  lights: string[];
}

export type HueGroupsResponse = Record<string, HueGroup>;

export async function getGroups(bridgeIp: string, appKey: string): Promise<HueGroupsResponse> {
  const res = await fetch(`http://${bridgeIp}/api/${appKey}/groups`);
  if (!res.ok) throw new Error(`Failed to fetch groups: ${res.status}`);
  return res.json();
}

export async function setLightState(
  bridgeIp: string,
  appKey: string,
  lightId: string,
  state: { on?: boolean; bri?: number }
): Promise<void> {
  const res = await fetch(`http://${bridgeIp}/api/${appKey}/lights/${lightId}/state`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });
  if (!res.ok) throw new Error(`Failed to set light state: ${res.status}`);

  const body = await res.json();
  const err = firstError(body);
  if (err) throw new Error(err.description);
}

export interface HueScene {
  name: string;
  group?: string;
  lights?: string[];
}

export type HueScenesResponse = Record<string, HueScene>;

export async function getScenes(bridgeIp: string, appKey: string): Promise<HueScenesResponse> {
  const res = await fetch(`http://${bridgeIp}/api/${appKey}/scenes`);
  if (!res.ok) throw new Error(`Failed to fetch scenes: ${res.status}`);
  return res.json();
}

export async function recallScene(
  bridgeIp: string,
  appKey: string,
  groupId: string,
  sceneId: string
): Promise<void> {
  const res = await fetch(`http://${bridgeIp}/api/${appKey}/groups/${groupId}/action`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scene: sceneId }),
  });
  if (!res.ok) throw new Error(`Failed to recall scene: ${res.status}`);

  const body = await res.json();
  const err = firstError(body);
  if (err) throw new Error(err.description);
}
