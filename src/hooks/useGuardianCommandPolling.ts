import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';

import { useGuardianStore } from '../store/useGuardianStore';
import * as guardianService from '../services/guardianService';
import { GuardianNative } from '../native/GuardianNative';
import type { GuardianCommand } from '../types';

const POLL_INTERVAL_MS = 25000;

// Runs on a child device once it has registered itself (thisDeviceId set).
// True background delivery (silent push waking the app) needs Firebase/EAS
// infra that isn't configured yet — see guardianService's push token
// registration comment. Until then, this foreground interval is the only
// delivery mechanism: a command only lands while the app is open. A
// received push (if it ever fires) just triggers one out-of-cycle poll
// instead of waiting for the next tick — pure enhancement, costs nothing
// if push never arrives.
async function executeCommand(command: GuardianCommand) {
  switch (command.type) {
    case 'lock':
      await GuardianNative.lockScreen();
      break;
    case 'school_on':
      await GuardianNative.setSchoolMode(true);
      break;
    case 'school_off':
      await GuardianNative.setSchoolMode(false);
      break;
    case 'bedtime_on':
      await GuardianNative.setBedtimeMode(true);
      break;
    case 'bedtime_off':
      await GuardianNative.setBedtimeMode(false);
      break;
    case 'location_request':
      await GuardianNative.startLocationTracking(30000);
      break;
    default:
      // 'unlock', 'sos_ack', 'web_filter_on/off' — no native handler yet.
      break;
  }
}

export function useGuardianCommandPolling() {
  const thisDeviceId = useGuardianStore((s) => s.thisDeviceId);
  const setPendingCommands = useGuardianStore((s) => s.setPendingCommands);
  const markCommandExecuted = useGuardianStore((s) => s.markCommandExecuted);
  const updateDeviceStatus = useGuardianStore((s) => s.updateDeviceStatus);

  const inFlight = useRef(false);

  useEffect(() => {
    if (!thisDeviceId) return;

    const poll = async () => {
      if (inFlight.current) return;
      inFlight.current = true;

      try {
        const { commands } = await guardianService.fetchPendingCommands(thisDeviceId);
        setPendingCommands(thisDeviceId, commands);

        for (const command of commands) {
          try {
            await executeCommand(command);
          } catch {
            // GuardianNative calls are non-blocking no-ops today — nothing
            // real to fail on yet, but don't let a thrown promise stop the
            // command from being marked executed below.
          }
          try {
            await guardianService.markCommandExecuted(command.id);
          } catch {
            // best-effort
          }
          markCommandExecuted(command.id);
        }

        updateDeviceStatus(thisDeviceId, { status: 'online' });
        guardianService.updateDeviceStatus(thisDeviceId, { status: 'online' }).catch(() => {});
      } catch {
        // offline or backend unreachable — try again next tick
      } finally {
        inFlight.current = false;
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);

    // Best-effort push token registration. This will fail/no-op on
    // Expo Go and on any build without real Firebase project + EAS
    // credentials configured (see guardianService.ts) — that's expected;
    // foreground polling above is what actually delivers commands today.
    (async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') return;
        const token = await Notifications.getDevicePushTokenAsync();
        if (typeof token.data === 'string') {
          await guardianService.registerPushToken(thisDeviceId, token.data);
        }
      } catch {
        // no Firebase/EAS credentials configured yet — expected for now
      }
    })();

    const subscription = Notifications.addNotificationReceivedListener((event) => {
      const data = event.request.content.data as Record<string, unknown> | undefined;
      if (data?.commandId || data?.type === 'command') {
        poll();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [thisDeviceId, setPendingCommands, markCommandExecuted, updateDeviceStatus]);
}
