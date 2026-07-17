import { useEffect } from 'react';
import { useAutomationStore } from '../store/useAutomationStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { useOperationsStore } from '../store/useOperationsStore';
import { useShoppingStore } from '../store/useShoppingStore';
import { useFamilyStore } from '../store/useFamilyStore';
import { useNotificationsStore } from '../store/useNotificationsStore';
import type { AutomationRule } from '../types';

// Time triggers need minute-level precision to feel like they actually fired
// "at 7:30am" — the 5-minute interval used by useNotificationTriggers.ts
// (fine for "due in 3 days"-scale reminders) would make a rule fire
// anywhere from 7:30 to 7:35, which reads as broken for a specific-time
// automation.
const SCAN_INTERVAL_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
import { generateId } from '../utils/generateId';

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function timeMatches(triggerValue: string, now: Date): boolean {
  const match = triggerValue.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return false;
  return now.getHours() === Number(match[1]) && now.getMinutes() === Number(match[2]);
}

function dayConditionMatches(condition: string | undefined, now: Date): boolean {
  if (!condition || condition === 'daily') return true;
  if (condition === 'weekdays') return now.getDay() >= 1 && now.getDay() <= 5;
  if (condition === 'weekends') return now.getDay() === 0 || now.getDay() === 6;
  return DAY_NAMES[now.getDay()] === condition.toLowerCase();
}

// Performs the rule's real-world effect. Every branch here does something
// genuinely observable — a notification that actually appears, a task that
// actually shows up in Tasks, a light that actually dims (including real
// Philips Hue devices, since updateDeviceValue already talks to the live
// bridge for those) — not a no-op that only pretends the rule ran.
function performAction(rule: AutomationRule) {
  const { action } = rule;

  if (action.type === 'notify' || action.type === 'reminder' || action.type === 'message') {
    useNotificationsStore.getState().addNotification({
      type: 'family',
      isRead: false,
      title: `⚡ ${rule.name}`,
      body: action.value,
      action: { label: 'View Automations', route: 'Automation' },
    });
    return;
  }

  if (action.type === 'task') {
    useFamilyStore.getState().addTask({
      id: generateId(),
      familyId: rule.familyId,
      title: action.value,
      priority: 'medium',
      status: 'pending',
      category: 'Automation',
      recurrence: 'none',
      points: 10,
      createdAt: new Date().toISOString(),
      createdBy: 'automation',
    });
    return;
  }

  if (action.type === 'device') {
    // Only known device-action value in use (via the seed data + templates)
    // is 'dim_lights_kids_rooms' — no free-form rule builder exists yet to
    // produce anything else, so this doesn't need to be a generic DSL.
    if (action.value === 'dim_lights_kids_rooms') {
      const automation = useAutomationStore.getState();
      automation.devices
        .filter((d) => d.type === 'light' && /kid/i.test(d.room))
        .forEach((d) => automation.updateDeviceValue(d.id, 20));
    }
  }
}

// Condition-based rules don't fire once — they fire once per real matching
// instance (each overdue-soon bill, each low pantry item), reusing
// useNotificationsStore's existing dedup keys rather than building a second
// per-instance tracking mechanism just for this.
function evaluateCondition(rule: AutomationRule): boolean {
  const notif = useNotificationsStore.getState();
  let firedAny = false;

  if (rule.trigger.value === 'bill_due_in_3_days') {
    const now = Date.now();
    useFinanceStore.getState().bills.forEach((bill) => {
      if (bill.status === 'paid') return;
      const daysUntil = (new Date(bill.dueDate).getTime() - now) / DAY_MS;
      if (daysUntil < 2.5 || daysUntil > 3.5) return;
      const key = `automation-${rule.id}-bill-${bill.id}`;
      if (notif.hasBeenNotified(key)) return;
      notif.markNotified(key);
      notif.addNotification({
        type: 'family',
        isRead: false,
        title: `⚡ ${rule.name}`,
        body: `${bill.name} ($${bill.amount.toLocaleString()}) is due in 3 days.`,
        action: { label: 'View Bill', route: 'Finance' },
      });
      firedAny = true;
    });
  } else if (rule.trigger.value === 'pantry_low') {
    useOperationsStore.getState().pantryItems.forEach((item) => {
      const isLow = item.minQuantity !== undefined && item.quantity <= item.minQuantity;
      if (!isLow) return;
      const key = `automation-${rule.id}-pantry-${item.id}`;
      if (notif.hasBeenNotified(key)) return;
      notif.markNotified(key);
      // The rule's own action text says "Add to shopping list" — so it
      // actually does that, instead of just notifying about it.
      useShoppingStore.getState().addItem({
        name: item.name,
        category: 'pantry',
        quantity: 1,
        unit: item.unit || 'ea',
      });
      notif.addNotification({
        type: 'family',
        isRead: false,
        title: `⚡ ${rule.name}`,
        body: `${item.name} is running low — added to your shopping list.`,
        action: { label: 'View Shopping List', route: 'Operations' },
      });
      firedAny = true;
    });
  }

  return firedAny;
}

function scan() {
  const automation = useAutomationStore.getState();
  const now = new Date();

  automation.rules.forEach((rule) => {
    if (!rule.isActive) return;

    if (rule.trigger.type === 'time') {
      if (rule.lastRun && isSameCalendarDay(new Date(rule.lastRun), now)) return;
      if (!timeMatches(rule.trigger.value, now)) return;
      if (!dayConditionMatches(rule.trigger.condition, now)) return;
      performAction(rule);
      automation.recordRuleRun(rule.id);
      return;
    }

    if (rule.trigger.type === 'condition') {
      if (evaluateCondition(rule)) {
        automation.recordRuleRun(rule.id);
      }
    }
  });
}

// Mirrors useNotificationTriggers.ts / useGuardianCommandPolling.ts: mount
// once, re-scan on an interval via .getState() reads. Only fires while the
// app is actually open (foreground or freshly backgrounded) — there's no
// native background scheduler here, so a rule set for 7:30am won't fire if
// the app is fully killed at 7:30am. That's the same honest limitation
// useNotificationTriggers.ts already has; this doesn't make it worse.
export function useAutomationEngine() {
  useEffect(() => {
    scan();
    const interval = setInterval(scan, SCAN_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
}
