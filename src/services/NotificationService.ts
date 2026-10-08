import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Show alerts even when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Family Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0F2952',
    });
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.setNotificationChannelAsync('emergency', {
      name: 'Emergency',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
    });
  }
  return true;
}

export async function cancelNotification(id: string) {
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

export async function cancelByPrefix(prefix: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(prefix))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {}))
  );
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Generic one-time scheduled notification
export async function scheduleAt(
  id: string,
  title: string,
  body: string,
  trigger: Notifications.NotificationTriggerInput,
  data?: Record<string, unknown>
) {
  await cancelNotification(id);
  return Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title,
      body,
      data: data ?? {},
      sound: true,
      ...(Platform.OS === 'android' && { channelId: 'default' }),
    },
    trigger,
  });
}

// ─── Domain schedulers ──────────────────────────────────────────────────────

interface BillLike {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  status: string;
}

export async function scheduleBillReminders(bills: BillLike[], advanceDays = 3) {
  await cancelByPrefix('bill-');
  const now = Date.now();
  for (const bill of bills) {
    if (bill.status === 'paid') continue;
    const due = new Date(bill.dueDate).getTime();
    const triggerMs = due - advanceDays * 86_400_000;
    if (triggerMs <= now) continue;
    await scheduleAt(
      `bill-${bill.id}`,
      '💳 Bill Due Soon',
      `${bill.name} — $${bill.amount.toFixed(2)} due in ${advanceDays} day${advanceDays !== 1 ? 's' : ''}`,
      { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(triggerMs) },
      { route: 'Bills', billId: bill.id }
    );
  }
}

interface PantryItemLike {
  id: string;
  name: string;
  quantity: number;
  minQuantity?: number;
}

export async function schedulePantryAlerts(items: PantryItemLike[]) {
  await cancelByPrefix('pantry-');
  const low = items.filter((i) => i.minQuantity != null && i.quantity <= i.minQuantity);
  if (low.length === 0) return;
  const names = low.slice(0, 3).map((i) => i.name).join(', ');
  const extra = low.length > 3 ? ` +${low.length - 3} more` : '';
  // Fire in 5 seconds so it arrives on first open (could be made smarter with daily check)
  await scheduleAt(
    'pantry-low-stock',
    '🛒 Pantry Running Low',
    `${names}${extra} — add to your shopping list`,
    { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, repeats: false },
    { route: 'Pantry' }
  );
}

interface MedicationLike {
  id: string;
  name: string;
  memberId: string;
  memberName: string;
  times: string[];   // ["08:00", "20:00"]
  isActive: boolean;
}

export async function scheduleMedicationReminders(meds: MedicationLike[]) {
  await cancelByPrefix('med-');
  for (const med of meds) {
    if (!med.isActive) continue;
    for (let ti = 0; ti < med.times.length; ti++) {
      const [hStr, mStr] = med.times[ti].split(':');
      const hour = parseInt(hStr, 10);
      const minute = parseInt(mStr, 10);
      if (isNaN(hour) || isNaN(minute)) continue;
      await scheduleAt(
        `med-${med.id}-${ti}`,
        '💊 Medication Reminder',
        `${med.memberName}: time to take ${med.name}`,
        {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
        { route: 'MedicationManager', medId: med.id }
      );
    }
  }
}

interface BirthdayLike {
  id: string;
  name: string;
  date: string; // MM-DD
}

export async function scheduleBirthdayReminders(birthdays: BirthdayLike[], advanceDays = 3) {
  await cancelByPrefix('bday-');
  const now = new Date();
  for (const bday of birthdays) {
    const [mon, day] = bday.date.split('-').map(Number);
    if (isNaN(mon) || isNaN(day)) continue;
    let target = new Date(now.getFullYear(), mon - 1, day, 9, 0, 0);
    if (target.getTime() - advanceDays * 86_400_000 < now.getTime()) {
      target = new Date(now.getFullYear() + 1, mon - 1, day, 9, 0, 0);
    }
    const triggerMs = target.getTime() - advanceDays * 86_400_000;
    if (triggerMs <= now.getTime()) continue;
    await scheduleAt(
      `bday-${bday.id}`,
      '🎂 Birthday Coming Up!',
      `${bday.name}'s birthday is in ${advanceDays} day${advanceDays !== 1 ? 's' : ''}`,
      { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(triggerMs) },
      { route: 'BirthdayTracker', birthdayId: bday.id }
    );
  }
}

interface PlantLike {
  id: string;
  name: string;
  nextWatering?: string;
}

export async function scheduleGardenReminders(plants: PlantLike[]) {
  await cancelByPrefix('garden-');
  const now = Date.now();
  const needsWater = plants.filter((p) => {
    if (!p.nextWatering) return false;
    const t = new Date(p.nextWatering).getTime();
    return t > now && t - now < 86_400_000 * 2; // within 2 days
  });
  if (needsWater.length === 0) return;
  const names = needsWater.slice(0, 3).map((p) => p.name).join(', ');
  await scheduleAt(
    'garden-water-today',
    '🌱 Time to Water Your Plants',
    `${names} need watering today`,
    {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 8,
      minute: 0,
    },
    { route: 'GardenPlanner' }
  );
}

interface CalendarEventLike {
  id: string;
  title: string;
  startTime: string; // ISO
  allDay?: boolean;
}

export async function scheduleCalendarReminders(events: CalendarEventLike[], advanceMinutes = 60) {
  await cancelByPrefix('cal-');
  const now = Date.now();
  for (const evt of events) {
    if (evt.allDay) continue;
    const start = new Date(evt.startTime).getTime();
    const triggerMs = start - advanceMinutes * 60_000;
    if (triggerMs <= now) continue;
    await scheduleAt(
      `cal-${evt.id}`,
      '📅 Upcoming Event',
      `${evt.title} starts in ${advanceMinutes >= 60 ? `${advanceMinutes / 60}h` : `${advanceMinutes}min`}`,
      { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(triggerMs) },
      { route: 'Calendar', eventId: evt.id }
    );
  }
}

interface VehicleLike {
  id: string;
  year: number;
  make: string;
  model: string;
  nextService?: string;
  insuranceExpiry?: string;
}

export async function scheduleVehicleAlerts(vehicles: VehicleLike[]) {
  await cancelByPrefix('veh-');
  const now = Date.now();
  for (const v of vehicles) {
    const label = `${v.year} ${v.make} ${v.model}`;
    if (v.nextService) {
      const t = new Date(v.nextService).getTime();
      if (t > now && t - now < 30 * 86_400_000) {
        await scheduleAt(
          `veh-svc-${v.id}`,
          '🔧 Vehicle Service Due',
          `${label} is due for service soon`,
          { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 30, repeats: false },
          { route: 'Vehicles', vehicleId: v.id }
        );
      }
    }
    if (v.insuranceExpiry) {
      const t = new Date(v.insuranceExpiry).getTime();
      if (t > now && t - now < 30 * 86_400_000) {
        await scheduleAt(
          `veh-ins-${v.id}`,
          '🛡️ Insurance Expiring',
          `${label} insurance expires within 30 days`,
          { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 45, repeats: false },
          { route: 'Vehicles', vehicleId: v.id }
        );
      }
    }
  }
}
