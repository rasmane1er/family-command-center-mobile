import { Platform } from 'react-native';
import { format } from 'date-fns';
import type { Task, CalendarEvent } from '../types';
import { setWidgetData } from '../widgets/widgetStorage';
import type { FamilyGlanceData } from '../widgets/FamilyGlanceWidget';

const APP_GROUP = 'group.com.grasmane.familycommandcenter';

// Lazily required — @bacons/apple-targets' native module only exists once
// `expo prebuild` has linked the widget target, and importing it on Android
// (where there's no such module) would throw at load time.
function getExtensionStorage() {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ExtensionStorage } = require('@bacons/apple-targets');
    return new ExtensionStorage(APP_GROUP) as {
      set: (key: string, value: Record<string, string | number>) => void;
    };
  } catch {
    return null;
  }
}

let cachedStorage: ReturnType<typeof getExtensionStorage> | undefined;
function storage() {
  if (cachedStorage === undefined) cachedStorage = getExtensionStorage();
  return cachedStorage;
}

function syncIOS(data: FamilyGlanceData): void {
  const store = storage();
  if (!store) return;

  store.set('widgetData', { ...data });

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ExtensionStorage } = require('@bacons/apple-targets');
    ExtensionStorage.reloadWidget();
  } catch {
    // widget target not linked in this build — nothing to reload
  }
}

function syncAndroid(data: FamilyGlanceData): void {
  setWidgetData(data);
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { pushAndroidWidgetUpdate } = require('../widgets/pushAndroidWidgetUpdate');
    pushAndroidWidgetUpdate(data);
  } catch {
    // react-native-android-widget's native module isn't linked in this
    // build (e.g. an Expo Go dev client) — nothing to push an update to.
  }
}

// Mirrors the pending-task-count and next-event logic DashboardScreen
// already uses, so the widget never shows a number that disagrees with what
// the app itself displays.
export function syncWidgetData(familyName: string, tasks: Task[], events: CalendarEvent[]): void {
  const openTasksCount = tasks.filter((t) => t.status === 'pending').length;

  const now = Date.now();
  const nextEvent = events
    .filter((e) => new Date(e.startDate).getTime() >= now)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];

  const data: FamilyGlanceData = {
    familyName: familyName || 'Family',
    openTasksCount,
    nextEventTitle: nextEvent?.title ?? '',
    nextEventTime: nextEvent
      ? nextEvent.allDay
        ? format(new Date(nextEvent.startDate), 'EEE, MMM d')
        : format(new Date(nextEvent.startDate), 'EEE h:mm a')
      : '',
    updatedAt: new Date().toISOString(),
  };

  if (Platform.OS === 'ios') syncIOS(data);
  else if (Platform.OS === 'android') syncAndroid(data);
}
