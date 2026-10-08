import { useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useOperationsStore } from '../store/useOperationsStore';
import { useMedicationStore } from '../store/useMedicationStore';
import { useBirthdayStore } from '../store/useBirthdayStore';
import { useGardenStore } from '../store/useGardenStore';
import { useFamilyStore } from '../store/useFamilyStore';
import { useNotificationSettingsStore } from '../store/useNotificationSettingsStore';
import {
  scheduleBillReminders,
  schedulePantryAlerts,
  scheduleMedicationReminders,
  scheduleBirthdayReminders,
  scheduleGardenReminders,
  scheduleCalendarReminders,
  scheduleVehicleAlerts,
  cancelByPrefix,
} from '../services/NotificationService';

const FREQ_TO_TIMES: Record<string, string[]> = {
  daily: ['08:00'],
  twice_daily: ['08:00', '20:00'],
  weekly: ['09:00'],
  monthly: ['09:00'],
  as_needed: [],
};

export function NotificationScheduler() {
  const settings = useNotificationSettingsStore();
  const bills = useFinanceStore((s) => s.bills);
  const pantryItems = useOperationsStore((s) => s.pantryItems);
  const vehicles = useOperationsStore((s) => s.vehicles);
  const medications = useMedicationStore((s) => s.medications);
  const members = useFamilyStore((s) => s.members);
  const events = useFamilyStore((s) => s.events);
  const birthdays = useBirthdayStore((s) => s.birthdays);
  const plants = useGardenStore((s) => s.plants);

  // Bills
  useEffect(() => {
    if (settings.masterEnabled && settings.bills) {
      scheduleBillReminders(bills, settings.billsAdvanceDays);
    } else {
      cancelByPrefix('bill-');
    }
  }, [bills, settings.masterEnabled, settings.bills, settings.billsAdvanceDays]);

  // Pantry
  useEffect(() => {
    if (settings.masterEnabled && settings.pantry) {
      schedulePantryAlerts(pantryItems);
    } else {
      cancelByPrefix('pantry-');
    }
  }, [pantryItems, settings.masterEnabled, settings.pantry]);

  // Medications
  useEffect(() => {
    if (settings.masterEnabled && settings.medications) {
      const memberMap = Object.fromEntries(members.map((m) => [m.id, m.name]));
      const medsWithTimes = medications.map((med) => ({
        id: med.id,
        name: med.name,
        memberId: med.memberId,
        memberName: memberMap[med.memberId] || 'Family',
        times: FREQ_TO_TIMES[med.frequency] ?? ['08:00'],
        isActive: med.isActive,
      }));
      scheduleMedicationReminders(medsWithTimes);
    } else {
      cancelByPrefix('med-');
    }
  }, [medications, members, settings.masterEnabled, settings.medications]);

  // Birthdays
  useEffect(() => {
    if (settings.masterEnabled && settings.birthdays) {
      scheduleBirthdayReminders(birthdays, settings.birthdaysAdvanceDays);
    } else {
      cancelByPrefix('bday-');
    }
  }, [birthdays, settings.masterEnabled, settings.birthdays, settings.birthdaysAdvanceDays]);

  // Garden
  useEffect(() => {
    if (settings.masterEnabled && settings.garden) {
      scheduleGardenReminders(plants);
    } else {
      cancelByPrefix('garden-');
    }
  }, [plants, settings.masterEnabled, settings.garden]);

  // Calendar — map startDate → startTime for the scheduler interface
  useEffect(() => {
    if (settings.masterEnabled && settings.calendar) {
      const mapped = events.map((e) => ({
        id: e.id,
        title: e.title,
        startTime: e.startDate,
        allDay: e.allDay,
      }));
      scheduleCalendarReminders(mapped, settings.calendarAdvanceMinutes);
    } else {
      cancelByPrefix('cal-');
    }
  }, [events, settings.masterEnabled, settings.calendar, settings.calendarAdvanceMinutes]);

  // Vehicles
  useEffect(() => {
    if (settings.masterEnabled && settings.vehicles) {
      scheduleVehicleAlerts(vehicles as any);
    } else {
      cancelByPrefix('veh-');
    }
  }, [vehicles, settings.masterEnabled, settings.vehicles]);

  return null;
}
