import { Platform } from 'react-native';
import { format } from 'date-fns';
import type { Task, CalendarEvent } from '../types';

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

// Mirrors the pending-task-count and next-event logic DashboardScreen
// already uses, so the widget never shows a number that disagrees with what
// the app itself displays.
export function syncWidgetData(familyName: string, tasks: Task[], events: CalendarEvent[]): void {
  const store = storage();
  if (!store) return;

  const openTasksCount = tasks.filter((t) => t.status === 'pending').length;

  const now = Date.now();
  const nextEvent = events
    .filter((e) => new Date(e.startDate).getTime() >= now)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];

  store.set('widgetData', {
    familyName: familyName || 'Family',
    openTasksCount,
    nextEventTitle: nextEvent?.title ?? '',
    nextEventTime: nextEvent
      ? nextEvent.allDay
        ? format(new Date(nextEvent.startDate), 'EEE, MMM d')
        : format(new Date(nextEvent.startDate), 'EEE h:mm a')
      : '',
    updatedAt: new Date().toISOString(),
  });

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ExtensionStorage } = require('@bacons/apple-targets');
    ExtensionStorage.reloadWidget();
  } catch {
    // widget target not linked in this build — nothing to reload
  }
}
