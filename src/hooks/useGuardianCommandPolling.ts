import { useCallback, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import messaging, { getMessaging, onMessage } from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

import { useGuardianStore } from '../store/useGuardianStore';
import * as guardianService from '../services/guardianService';
import { GuardianNative } from '../native/GuardianNative';
import type { GuardianCommand } from '../types';
import { useAppStateInterval } from './useAppStateInterval';

const POLL_INTERVAL_MS = 25000;

// Runs on a child device once it has registered itself (thisDeviceId set).
// The backend doesn't currently send a silent/data-only push to wake the
// app in the background for Guardian commands (sendCommandPush only fires
// on explicit triggers), so this foreground interval remains the primary
// delivery mechanism: a command reliably lands only while the app is open.
// A received push (if one ever arrives) just triggers one out-of-cycle poll
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

  const poll = useCallback(async () => {
    if (!thisDeviceId || inFlight.current) return;
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
  }, [thisDeviceId, setPendingCommands, markCommandExecuted, updateDeviceStatus]);

  // Paused entirely while backgrounded — no point hammering the commands
  // endpoint for an app the OS has suspended anyway — and resumes with an
  // immediate poll on return to foreground.
  useAppStateInterval(poll, POLL_INTERVAL_MS, !!thisDeviceId);

  useEffect(() => {
    if (!thisDeviceId) return;

    // Best-effort push token registration via native FCM (same mechanism as
    // usePushRegistration.ts) — foreground polling above remains the
    // reliable delivery path regardless of whether this succeeds.
    (async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') return;
        if (Platform.OS === 'ios') {
          await messaging().registerDeviceForRemoteMessages();
        }
        const fcmToken = await messaging().getToken();
        if (fcmToken) {
          await guardianService.registerPushToken(thisDeviceId, fcmToken);
        }
      } catch {
        // best-effort — foreground polling above still delivers commands
      }
    })();

    // Firebase onMessage fires when app is foregrounded (Android)
    let unsubFirebase: (() => void) | null = null;
    try {
      unsubFirebase = onMessage(getMessaging(), (msg) => {
        const data = msg.data as Record<string, unknown> | undefined;
        if (data?.commandId || data?.type === 'command') poll();
      });
    } catch {}

    // Expo listener fires on iOS foreground + catches backgrounded taps
    const subscription = Notifications.addNotificationReceivedListener((event) => {
      const data = event.request.content.data as Record<string, unknown> | undefined;
      if (data?.commandId || data?.type === 'command') poll();
    });

    return () => {
      unsubFirebase?.();
      subscription.remove();
    };
  }, [thisDeviceId, poll]);
}
