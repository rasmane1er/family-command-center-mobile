import { createMMKV } from 'react-native-mmkv';
import type { FamilyGlanceData } from './FamilyGlanceWidget';

// Deliberately its own unencrypted MMKV instance, separate from the app's
// main encrypted store (src/storage/mmkvStorage.ts). Two reasons: (1) the
// widget's headless task handler (widget-task-handler.ts) needs to read
// this synchronously on every widget update, including right after a
// device reboot before the app has ever launched to seed a real
// per-device encryption key from SecureStore — an encrypted read at that
// point would fail; (2) the data here is already the same non-sensitive
// summary the iOS widget stores in a plaintext App Group container
// (family name, an open-task count, one event's title/time) — nothing
// here is data that needs encryption at rest.
const store = createMMKV({ id: 'family-command-center-widget-data' });

const KEY = 'widgetData';

export function getWidgetData(): FamilyGlanceData | null {
  const raw = store.getString(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FamilyGlanceData;
  } catch {
    return null;
  }
}

export function setWidgetData(data: FamilyGlanceData): void {
  store.set(KEY, JSON.stringify(data));
}
