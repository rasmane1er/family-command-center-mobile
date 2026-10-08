import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationSettings {
  bills: boolean;
  billsAdvanceDays: number;
  pantry: boolean;
  medications: boolean;
  birthdays: boolean;
  birthdaysAdvanceDays: number;
  garden: boolean;
  calendar: boolean;
  calendarAdvanceMinutes: number;
  vehicles: boolean;
  masterEnabled: boolean;
}

interface NotificationSettingsState extends NotificationSettings {
  setMasterEnabled: (enabled: boolean) => void;
  setSetting: <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => void;
}

export const useNotificationSettingsStore = create<NotificationSettingsState>()(
  persist(
    (set) => ({
      masterEnabled: true,
      bills: true,
      billsAdvanceDays: 3,
      pantry: true,
      medications: true,
      birthdays: true,
      birthdaysAdvanceDays: 3,
      garden: true,
      calendar: true,
      calendarAdvanceMinutes: 60,
      vehicles: true,

      setMasterEnabled: (enabled) => set({ masterEnabled: enabled }),
      setSetting: (key, value) => set({ [key]: value }),
    }),
    {
      name: 'notification-settings-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
