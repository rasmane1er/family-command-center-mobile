import { useEffect } from 'react';
import { useNotificationsStore } from '../store/useNotificationsStore';
import { useGuardianStore } from '../store/useGuardianStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { useFamilyStore } from '../store/useFamilyStore';

const SCAN_INTERVAL_MS = 5 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const BILL_DUE_SOON_DAYS = 3;
const GOAL_MILESTONES = [25, 50, 75, 100];

// Periodic scanner for real, already-existing app state — mirrors the
// pattern in useGuardianCommandPolling.ts (mount once, re-scan on an
// interval via .getState() reads rather than a reactive subscription).
// Notifications are minutes/hours-scale here, not Guardian's near-real-time
// command delivery, so a 5-minute interval is enough. Dedup is handled via
// useNotificationsStore's notifiedSourceKeys so re-scanning doesn't spam
// duplicates; keys clear when their underlying condition resolves so a
// future recurrence of the same id can notify again.
function scan() {
  const notif = useNotificationsStore.getState();
  const guardian = useGuardianStore.getState();
  const finance = useFinanceStore.getState();
  const family = useFamilyStore.getState();
  const now = Date.now();

  guardian.sosAlerts.forEach((alert) => {
    const key = `sos-${alert.id}`;
    if (alert.isResolved) {
      if (notif.hasBeenNotified(key)) notif.clearNotified(key);
      return;
    }
    if (notif.hasBeenNotified(key)) return;
    notif.markNotified(key);
    notif.addNotification({
      type: 'emergency',
      isRead: false,
      title: '🚨 SOS Alert',
      body: alert.message?.trim() ? alert.message : 'A family member triggered an SOS alert. Check on them now.',
      action: { label: 'View Alert', route: 'SOSAlerts' },
      memberId: alert.memberId,
    });
  });

  guardian.approvalRequests.forEach((req) => {
    const key = `approval-${req.id}`;
    if (req.status !== 'pending') {
      if (notif.hasBeenNotified(key)) notif.clearNotified(key);
      return;
    }
    if (notif.hasBeenNotified(key)) return;
    notif.markNotified(key);
    notif.addNotification({
      type: 'family',
      isRead: false,
      title: '✅ Approval Needed',
      body: req.title,
      action: { label: 'Review', route: 'ApprovalRequests' },
      memberId: req.memberId,
    });
  });

  finance.bills.forEach((bill) => {
    const overdueKey = `bill-overdue-${bill.id}`;
    const dueSoonKey = `bill-duesoon-${bill.id}`;

    if (bill.status === 'paid') {
      if (notif.hasBeenNotified(overdueKey)) notif.clearNotified(overdueKey);
      if (notif.hasBeenNotified(dueSoonKey)) notif.clearNotified(dueSoonKey);
      return;
    }

    const daysUntilDue = (new Date(bill.dueDate).getTime() - now) / DAY_MS;

    if (daysUntilDue < 0 && !notif.hasBeenNotified(overdueKey)) {
      notif.markNotified(overdueKey);
      notif.addNotification({
        type: 'bill',
        isRead: false,
        title: '💳 Bill Overdue',
        body: `${bill.name} ($${bill.amount.toLocaleString()}) is overdue.`,
        action: { label: 'View Bill', route: 'Finance' },
      });
    } else if (daysUntilDue >= 0 && daysUntilDue <= BILL_DUE_SOON_DAYS && !notif.hasBeenNotified(dueSoonKey)) {
      const days = Math.max(0, Math.ceil(daysUntilDue));
      notif.markNotified(dueSoonKey);
      notif.addNotification({
        type: 'bill',
        isRead: false,
        title: '💳 Bill Due Soon',
        body: `${bill.name} ($${bill.amount.toLocaleString()}) is due in ${days} day${days === 1 ? '' : 's'}.`,
        action: { label: 'View Bill', route: 'Finance' },
      });
    }
  });

  family.tasks.forEach((task) => {
    const key = `task-overdue-${task.id}`;
    const isOverdue = task.status !== 'completed' && !!task.dueDate && new Date(task.dueDate).getTime() < now;

    if (!isOverdue) {
      if (notif.hasBeenNotified(key)) notif.clearNotified(key);
      return;
    }
    if (notif.hasBeenNotified(key)) return;

    notif.markNotified(key);
    notif.addNotification({
      type: 'task',
      isRead: false,
      title: '⏰ Task Overdue',
      body: task.title,
      action: { label: 'View Tasks', route: 'Family' },
    });
  });

  finance.financialGoals.forEach((goal) => {
    if (goal.targetAmount <= 0) return;
    const pct = (goal.savedAmount / goal.targetAmount) * 100;

    GOAL_MILESTONES.forEach((threshold) => {
      if (pct < threshold) return;
      const key = `goal-milestone-${goal.id}-${threshold}`;
      if (notif.hasBeenNotified(key)) return;

      notif.markNotified(key);
      notif.addNotification({
        type: 'goal',
        isRead: false,
        title: threshold >= 100 ? '🎯 Goal Reached!' : `🎯 Goal ${threshold}% Reached!`,
        body: `You've saved $${goal.savedAmount.toLocaleString()} of your $${goal.targetAmount.toLocaleString()} ${goal.name} goal.`,
        action: { label: 'View Goals', route: 'Finance' },
      });
    });
  });
}

export function useNotificationTriggers() {
  useEffect(() => {
    scan();
    const interval = setInterval(scan, SCAN_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
}
