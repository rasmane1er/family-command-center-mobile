import { apiRequest } from '../api/client';
import type {
  ChildDevice,
  GeofenceZone,
  ScreenTimeRule,
  AppUsageEntry,
  SOSAlert,
  ParentApprovalRequest,
  GuardianCommand,
  GeofenceAction,
  ScheduledDowntime,
} from '../types';

export type GuardianCommandType =
  | 'lock'
  | 'unlock'
  | 'bedtime_on'
  | 'bedtime_off'
  | 'school_on'
  | 'school_off'
  | 'location_request'
  | 'sos_ack'
  | 'web_filter_on'
  | 'web_filter_off'
  | 'take_screenshot'
  | 'start_screen_stream'
  | 'stop_screen_stream'
  | 'set_mode'
  | 'block_apps'
  | 'unblock_all_apps'
  | 'set_screen_time_rule';

// ─── Devices / pairing ────────────────────────────────────────────────────

export function fetchDevices(): Promise<{ devices: ChildDevice[] }> {
  return apiRequest('/guardian/devices');
}

export function fetchInstalledApps(deviceId: string): Promise<{ apps: { packageName: string; label: string }[] }> {
  return apiRequest(`/guardian/devices/${deviceId}/installed-apps`);
}

export interface GuardianConsent {
  id: string;
  familyId: string;
  memberId: string;
  deviceId: string | null;
  consentedByUserId: string;
  consentedByEmail: string;
  policyVersion: string;
  dataCategories: string[];
  consentedAt: string;
  revokedAt: string | null;
}

export function getConsentStatus(memberId: string): Promise<{
  hasConsent: boolean;
  consent: GuardianConsent | null;
}> {
  return apiRequest(`/guardian/consent/${memberId}`);
}

export function grantConsent(memberId: string): Promise<{ consent: GuardianConsent }> {
  return apiRequest('/guardian/consent', {
    method: 'POST',
    body: JSON.stringify({ memberId }),
  });
}

export function revokeConsent(memberId: string): Promise<void> {
  return apiRequest(`/guardian/consent/${memberId}/revoke`, { method: 'POST' });
}

export function registerDevice(input: {
  deviceName: string;
  platform: 'ios' | 'android';
  memberId: string;
  appVersion?: string;
  osVersion?: string;
}): Promise<{ device: ChildDevice; pairingCode: string }> {
  return apiRequest('/guardian/devices/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function pairDevice(pairingCode: string): Promise<{
  deviceId: string;
  accessToken: string;
  memberId: string;
  familyId: string;
  childName: string;
  avatarColor: string;
}> {
  return apiRequest('/guardian/devices/pair', {
    method: 'POST',
    body: JSON.stringify({ pairingCode }),
  });
}

export function updateDeviceStatus(
  deviceId: string,
  partial: {
    status?: string;
    batteryLevel?: number;
    lat?: number;
    lng?: number;
    accuracy?: number;
    address?: string;
    locationAt?: string;
    fcmToken?: string;
  }
): Promise<{ device: ChildDevice }> {
  return apiRequest(`/guardian/devices/${deviceId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(partial),
  });
}

export function removeDevice(deviceId: string): Promise<void> {
  return apiRequest(`/guardian/devices/${deviceId}`, { method: 'DELETE' });
}

export function registerPushToken(deviceId: string, token: string): Promise<{ device: ChildDevice }> {
  return updateDeviceStatus(deviceId, { fcmToken: token });
}

// ─── Commands ───────────────────────────────────────────────────────────

export function sendCommand(
  deviceId: string,
  type: GuardianCommandType,
  payload?: Record<string, unknown>
): Promise<{ command: GuardianCommand }> {
  return apiRequest(`/guardian/devices/${deviceId}/command`, {
    method: 'POST',
    body: JSON.stringify(payload ? { type, payload } : { type }),
  });
}

export function fetchPendingCommands(deviceId: string): Promise<{ commands: GuardianCommand[] }> {
  return apiRequest(`/guardian/devices/${deviceId}/commands/pending`);
}

export function markCommandExecuted(commandId: string): Promise<{ command: GuardianCommand }> {
  return apiRequest(`/guardian/commands/${commandId}/executed`, { method: 'PATCH' });
}

// Lets the parent app that ISSUED a command (via sendCommand above) poll for
// its resolution — sendCommand's optimistic pendingCommands entry otherwise
// never learns whether the child device actually executed it.
export function fetchCommandStatus(commandId: string): Promise<{ command: GuardianCommand }> {
  return apiRequest(`/guardian/commands/${commandId}`);
}

// ─── Geofences ──────────────────────────────────────────────────────────

export function fetchGeofences(): Promise<{ zones: GeofenceZone[] }> {
  return apiRequest('/guardian/geofences');
}

export function createGeofence(input: {
  name: string;
  lat: number;
  lng: number;
  radius: number;
  action: GeofenceAction;
  icon?: string;
  color?: string;
  linkedMembers?: string[];
}): Promise<{ zone: GeofenceZone }> {
  return apiRequest('/guardian/geofences', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateGeofence(
  id: string,
  updates: Partial<{
    name: string;
    lat: number;
    lng: number;
    radius: number;
    action: GeofenceAction;
    icon: string;
    color: string;
    linkedMembers: string[];
  }>
): Promise<{ zone: GeofenceZone }> {
  return apiRequest(`/guardian/geofences/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export function deleteGeofence(id: string): Promise<void> {
  return apiRequest(`/guardian/geofences/${id}`, { method: 'DELETE' });
}

// ─── Screen time ────────────────────────────────────────────────────────

export function fetchScreenTimeRules(memberId?: string): Promise<{ rules: ScreenTimeRule[] }> {
  const query = memberId ? `?memberId=${encodeURIComponent(memberId)}` : '';
  return apiRequest(`/guardian/screen-time${query}`);
}

export function createScreenTimeRule(input: {
  memberId: string;
  label: string;
  dailyLimitMinutes: number;
  blockedApps?: string[];
  allowedApps?: string[];
  scheduledDowntime?: ScheduledDowntime[];
  isActive?: boolean;
}): Promise<{ rule: ScreenTimeRule }> {
  return apiRequest('/guardian/screen-time', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateScreenTimeRule(
  id: string,
  updates: Partial<{
    memberId: string;
    label: string;
    dailyLimitMinutes: number;
    blockedApps: string[];
    allowedApps: string[];
    scheduledDowntime: ScheduledDowntime[];
    isActive: boolean;
  }>
): Promise<{ rule: ScreenTimeRule }> {
  return apiRequest(`/guardian/screen-time/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export function deleteScreenTimeRule(id: string): Promise<void> {
  return apiRequest(`/guardian/screen-time/${id}`, { method: 'DELETE' });
}

// ─── App usage ──────────────────────────────────────────────────────────

export function submitAppUsage(
  deviceId: string,
  entries: { appName: string; packageName: string; usageMinutes: number; date: string }[]
): Promise<{ success: boolean; count: number }> {
  return apiRequest('/guardian/app-usage', {
    method: 'POST',
    body: JSON.stringify({ deviceId, entries }),
  });
}

export function fetchAppUsage(deviceId: string, date?: string): Promise<{ usage: AppUsageEntry[] }> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  return apiRequest(`/guardian/app-usage/${deviceId}${query}`);
}

// ─── SOS ────────────────────────────────────────────────────────────────

export function createSOSAlert(input: {
  deviceId: string;
  memberId: string;
  lat?: number;
  lng?: number;
  address?: string;
  message?: string;
}): Promise<{ alert: SOSAlert }> {
  return apiRequest('/guardian/sos', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function fetchSOSAlerts(): Promise<{ alerts: SOSAlert[] }> {
  return apiRequest('/guardian/sos');
}

export function resolveSOSAlert(id: string, resolvedBy: string): Promise<{ alert: SOSAlert }> {
  return apiRequest(`/guardian/sos/${id}/resolve`, {
    method: 'PATCH',
    body: JSON.stringify({ resolvedBy }),
  });
}

export function deleteSOSAlert(id: string): Promise<{ ok: boolean }> {
  return apiRequest(`/guardian/sos/${id}`, { method: 'DELETE' });
}

export function clearResolvedSOSAlerts(): Promise<{ ok: boolean; deleted: number }> {
  return apiRequest('/guardian/sos', { method: 'DELETE' });
}

// ─── Approval requests ──────────────────────────────────────────────────

export function fetchApprovals(status?: string): Promise<{ approvals: ParentApprovalRequest[] }> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest(`/guardian/approvals${query}`);
}

export type ApprovalType = 'app_install' | 'screen_time_extension' | 'location_override' | 'purchase' | 'website';

export function createApprovalRequest(input: {
  memberId: string;
  type: ApprovalType;
  title: string;
  description: string;
}): Promise<{ approval: ParentApprovalRequest }> {
  return apiRequest('/guardian/approvals', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function respondToApproval(
  id: string,
  status: 'approved' | 'denied',
  respondedBy: string
): Promise<{ approval: ParentApprovalRequest }> {
  return apiRequest(`/guardian/approvals/${id}/respond`, {
    method: 'PATCH',
    body: JSON.stringify({ status, respondedBy }),
  });
}

// ─── Geofence events & messages ─────────────────────────────────────────

export function reportGeofenceEvent(
  deviceId: string,
  event: {
    zoneId: string;
    zoneName: string;
    type: 'entered' | 'exited';
    latitude: number;
    longitude: number;
    timestamp: string;
  }
): Promise<{ ok: boolean }> {
  return apiRequest(`/guardian/devices/${deviceId}/geofence-event`, {
    method: 'POST',
    body: JSON.stringify(event),
  });
}

export interface GuardianMessage {
  id: string;
  role: 'parent' | 'child';
  content: string;
  timestamp: string;
}

export function fetchMessages(deviceId: string): Promise<{ messages: GuardianMessage[] }> {
  return apiRequest(`/guardian/devices/${deviceId}/messages`);
}

export function sendMessage(
  deviceId: string,
  content: string,
  role: 'parent' | 'child'
): Promise<{ message: GuardianMessage }> {
  return apiRequest(`/guardian/devices/${deviceId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, role }),
  });
}

export function postChildNotification(
  deviceId: string,
  n: { packageName: string; title: string; text: string; receivedAt: number }
): Promise<{ ok: boolean }> {
  return apiRequest(`/guardian/devices/${deviceId}/notifications`, {
    method: 'POST',
    body: JSON.stringify(n),
  });
}
