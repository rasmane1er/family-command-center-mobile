import { useGuardianStore } from '../useGuardianStore';
import type { ChildDevice } from '../../types';

// Smoke tests for the child-device pairing flow: RegisterChildDeviceScreen
// calls registerThisDevice() to get a pairing code, then the parent enters
// that code on EnterPairingCodeScreen which calls pairWithCode(). A
// regression here (wrong endpoint, wrong body shape, response fields
// renamed) silently breaks the entire guardian/parental-controls feature
// since there's no other path to link a child device to the family.

function mockFetchOnce(status: number, body: unknown) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

const mockDevice: ChildDevice = {
  id: 'device-1',
  familyId: 'family-1',
  memberId: 'member-1',
  deviceName: "Kid's iPhone",
  platform: 'ios',
  status: 'offline',
  batteryLevel: 100,
  lastSeen: new Date().toISOString(),
  isPaired: true,
  createdAt: new Date().toISOString(),
  controlMode: 'normal',
  webFilterEnabled: false,
  blockedApps: null,
};

beforeEach(() => {
  global.fetch = jest.fn();
  useGuardianStore.setState({ devices: [], thisDeviceId: null, myPairingCode: null });
});

describe('useGuardianStore.registerThisDevice', () => {
  it('hits POST /guardian/devices/register and stores the returned pairing code', async () => {
    mockFetchOnce(200, { device: mockDevice, pairingCode: '123456' });

    const code = await useGuardianStore.getState().registerThisDevice({
      deviceName: "Kid's iPhone",
      platform: 'ios',
      memberId: 'member-1',
    });

    expect(code).toBe('123456');
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toMatch(/\/guardian\/devices\/register$/);
    const body = JSON.parse(options.body);
    expect(body).toEqual({ deviceName: "Kid's iPhone", platform: 'ios', memberId: 'member-1' });

    expect(useGuardianStore.getState().devices).toContainEqual(mockDevice);
    expect(useGuardianStore.getState().thisDeviceId).toBe('device-1');
    expect(useGuardianStore.getState().myPairingCode).toBe('123456');
  });
});

describe('useGuardianStore.pairWithCode', () => {
  it('hits POST /guardian/devices/pair, then reloads the device list', async () => {
    mockFetchOnce(200, {
      deviceId: 'device-1',
      accessToken: 'child-access-token',
      memberId: 'member-1',
      familyId: 'family-1',
      childName: 'Kid',
      avatarColor: '#4A8FD9',
    });
    mockFetchOnce(200, { devices: [mockDevice] });

    const deviceId = await useGuardianStore.getState().pairWithCode('123456');

    expect(deviceId).toBe('device-1');
    const calls = (global.fetch as jest.Mock).mock.calls;
    expect(calls[0][0]).toMatch(/\/guardian\/devices\/pair$/);
    expect(JSON.parse(calls[0][1].body)).toEqual({ pairingCode: '123456' });
    expect(calls[1][0]).toMatch(/\/guardian\/devices$/);

    expect(useGuardianStore.getState().devices).toEqual([mockDevice]);
  });

  it('propagates a rejection (e.g. expired/invalid code) instead of silently succeeding', async () => {
    mockFetchOnce(400, { error: 'Invalid or expired pairing code' });

    await expect(useGuardianStore.getState().pairWithCode('000000')).rejects.toBeTruthy();
    expect(useGuardianStore.getState().devices).toEqual([]);
  });
});
