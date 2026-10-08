import { useCallback } from 'react';
import { useFamilyStore } from '../store/useFamilyStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { useMedicationStore } from '../store/useMedicationStore';
import { useBirthdayStore } from '../store/useBirthdayStore';
import { useAIStore } from '../store/useAIStore';
import type { AIInsight } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 11);

export function useAIInsights() {
  const tasks = useFamilyStore((s) => s.tasks);
  const goals = useFamilyStore((s) => s.goals);
  const events = useFamilyStore((s) => s.events);
  const members = useFamilyStore((s) => s.members);
  const { bills, budgets, monthlyIncome, monthlyExpenses } = useFinanceStore();
  const medications = useMedicationStore((s) => s.medications);
  const birthdays = useBirthdayStore((s) => s.birthdays);
  const family = useFamilyStore((s) => s.family);
  const addInsight = useAIStore((s) => s.addInsight);

  const refresh = useCallback(() => {
    const familyId = family?.id ?? 'demo-family';
    const now = new Date();
    const newInsights: AIInsight[] = [];

    // ── Financial alerts ─────────────────────────────────────────
    const overdueBills = bills.filter((b) => b.status === 'overdue');
    if (overdueBills.length > 0) {
      newInsights.push({
        id: generateId(), familyId, isRead: false,
        createdAt: new Date().toISOString(),
        type: 'financial', priority: 'high',
        title: `${overdueBills.length} Overdue Bill${overdueBills.length > 1 ? 's' : ''}`,
        summary: `${overdueBills.map((b) => b.name).slice(0, 2).join(', ')}${overdueBills.length > 2 ? ` and ${overdueBills.length - 2} more` : ''} need immediate attention`,
        actionLabel: 'View Bills', actionRoute: 'Finance',
      });
    }

    const overBudget = budgets.filter((b) => b.monthlyLimit > 0 && b.spent > b.monthlyLimit);
    overBudget.slice(0, 2).forEach((b) => {
      newInsights.push({
        id: generateId(), familyId, isRead: false,
        createdAt: new Date().toISOString(),
        type: 'financial', priority: 'medium',
        title: `${b.category} Budget Exceeded`,
        summary: `You've spent $${b.spent.toFixed(0)} of your $${b.monthlyLimit.toFixed(0)} ${b.category} budget this month`,
        actionLabel: 'View Budget', actionRoute: 'Finance',
      });
    });

    const nearBudget = budgets.filter((b) => {
      if (b.monthlyLimit <= 0) return false;
      const pct = b.spent / b.monthlyLimit;
      return pct >= 0.8 && pct < 1;
    });
    if (nearBudget.length > 0) {
      const b = nearBudget[0];
      const pct = Math.round((b.spent / b.monthlyLimit) * 100);
      newInsights.push({
        id: generateId(), familyId, isRead: false,
        createdAt: new Date().toISOString(),
        type: 'financial', priority: 'medium',
        title: `${b.category} Budget at ${pct}%`,
        summary: `$${(b.monthlyLimit - b.spent).toFixed(0)} remaining for ${b.category} this month`,
        actionLabel: 'View Budget', actionRoute: 'Finance',
      });
    }

    const savingsRate = monthlyIncome > 0 ? (monthlyIncome - monthlyExpenses) / monthlyIncome : 0;
    if (savingsRate > 0.15) {
      newInsights.push({
        id: generateId(), familyId, isRead: false,
        createdAt: new Date().toISOString(),
        type: 'financial', priority: 'low',
        title: `Great Savings Rate: ${Math.round(savingsRate * 100)}%`,
        summary: `You're saving $${(monthlyIncome * savingsRate).toFixed(0)}/month. Consider boosting your emergency fund or investment contributions.`,
        actionLabel: 'View Goals', actionRoute: 'Finance',
      });
    }

    // ── Task alerts ───────────────────────────────────────────────
    const overdueTasks = tasks.filter((t) => t.status === 'overdue');
    if (overdueTasks.length > 0) {
      newInsights.push({
        id: generateId(), familyId, isRead: false,
        createdAt: new Date().toISOString(),
        type: 'task', priority: 'high',
        title: `${overdueTasks.length} Overdue Task${overdueTasks.length > 1 ? 's' : ''}`,
        summary: overdueTasks.slice(0, 2).map((t) => t.title).join(', ') + (overdueTasks.length > 2 ? ` +${overdueTasks.length - 2} more` : ''),
        actionLabel: 'View Tasks', actionRoute: 'Home',
      });
    }

    const highPriorityPending = tasks.filter((t) => t.status === 'pending' && t.priority === 'high');
    if (highPriorityPending.length > 0) {
      newInsights.push({
        id: generateId(), familyId, isRead: false,
        createdAt: new Date().toISOString(),
        type: 'task', priority: 'medium',
        title: `${highPriorityPending.length} High-Priority Task${highPriorityPending.length > 1 ? 's' : ''} Pending`,
        summary: highPriorityPending.slice(0, 2).map((t) => `"${t.title}"`).join(', '),
        actionLabel: 'View Tasks', actionRoute: 'Home',
      });
    }

    // ── Upcoming events ───────────────────────────────────────────
    const upcomingEvents = events.filter((e) => {
      const t = new Date(e.startDate).getTime();
      return t > now.getTime() && t - now.getTime() < 7 * 86_400_000;
    });
    if (upcomingEvents.length > 0) {
      newInsights.push({
        id: generateId(), familyId, isRead: false,
        createdAt: new Date().toISOString(),
        type: 'tip', priority: 'low',
        title: `${upcomingEvents.length} Event${upcomingEvents.length > 1 ? 's' : ''} This Week`,
        summary: upcomingEvents.slice(0, 3).map((e) => e.title).join(', '),
        actionLabel: 'View Calendar', actionRoute: 'Home',
      });
    }

    // ── Birthdays ─────────────────────────────────────────────────
    birthdays.forEach((b) => {
      const [mon, day] = b.date.split('-').map(Number);
      const target = new Date(now.getFullYear(), mon - 1, day);
      if (target < now) target.setFullYear(now.getFullYear() + 1);
      const diff = target.getTime() - now.getTime();
      if (diff > 0 && diff < 14 * 86_400_000) {
        const days = Math.round(diff / 86_400_000);
        newInsights.push({
          id: generateId(), familyId, isRead: false,
          createdAt: new Date().toISOString(),
          type: 'tip', priority: 'low',
          title: `🎂 ${b.name}'s Birthday in ${days} Day${days !== 1 ? 's' : ''}`,
          summary: `Don't forget to celebrate ${b.name}! Plan something special.`,
          actionLabel: 'View Birthdays', actionRoute: 'Family',
        });
      }
    });

    // ── Medications ───────────────────────────────────────────────
    medications
      .filter((m) => m.isActive && m.pillsRemaining != null && (m.pillsRemaining as number) < 10)
      .slice(0, 2)
      .forEach((m) => {
        const member = members.find((mem) => mem.id === m.memberId);
        newInsights.push({
          id: generateId(), familyId, isRead: false,
          createdAt: new Date().toISOString(),
          type: 'health', priority: 'high',
          title: `Low Medication Supply: ${m.name}`,
          summary: `${member?.name ?? 'A family member'} has only ${m.pillsRemaining} pills of ${m.name} remaining. Time to refill!`,
          actionLabel: 'View Medications', actionRoute: 'MedicationManager',
        });
      });

    // ── Goal progress ─────────────────────────────────────────────
    const completedGoals = goals.filter((g) => g.isCompleted);
    if (completedGoals.length > 0) {
      const latest = completedGoals[completedGoals.length - 1];
      newInsights.push({
        id: generateId(), familyId, isRead: false,
        createdAt: new Date().toISOString(),
        type: 'goal', priority: 'low',
        title: `Goal Achieved: ${latest.title} 🎉`,
        summary: `Congratulations! Your family completed "${latest.title}". Time to set a new goal!`,
        actionLabel: 'View Goals', actionRoute: 'Finance',
      });
    }

    if (newInsights.length === 0) {
      newInsights.push({
        id: generateId(), familyId, isRead: false,
        createdAt: new Date().toISOString(),
        type: 'tip', priority: 'low',
        title: 'Everything looks great! 🎉',
        summary: "No urgent alerts right now. Keep up the excellent work managing your family's needs.",
      });
    }

    newInsights.forEach((insight) => addInsight(insight));
  }, [bills, budgets, monthlyIncome, monthlyExpenses, tasks, goals, events, members, medications, birthdays, family, addInsight]);

  return { refresh };
}
