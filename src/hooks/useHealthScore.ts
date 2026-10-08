import { useMemo } from 'react';
import { useFamilyStore } from '../store/useFamilyStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { useMedicationStore } from '../store/useMedicationStore';
import { useHabitsStore } from '../store/useHabitsStore';
import { useJournalStore } from '../store/useJournalStore';
import { useAppStore } from '../store/useAppStore';
import type { FamilyHealthScore } from '../types';

function clamp(v: number) {
  return Math.max(0, Math.min(100, Math.round(v)));
}

export function useHealthScore(): FamilyHealthScore {
  const tasks = useFamilyStore((s) => s.tasks);
  const goals = useFamilyStore((s) => s.goals);
  const { bills, budgets, monthlyIncome, monthlyExpenses } = useFinanceStore();
  const medications = useMedicationStore((s) => s.medications);
  const { habits, isCompletedToday } = useHabitsStore();
  const entries = useJournalStore((s) => s.entries);
  const setHealthScore = useAppStore((s) => s.setHealthScore);

  const score = useMemo<FamilyHealthScore>(() => {
    // ── Financial ────────────────────────────────────────────────
    let financial = 100;
    const overdueBills = bills.filter((b) => b.status === 'overdue').length;
    financial -= Math.min(40, overdueBills * 15);
    const overBudgetCategories = budgets.filter(
      (b) => b.monthlyLimit > 0 && b.spent / b.monthlyLimit > 0.9
    ).length;
    financial -= Math.min(25, overBudgetCategories * 8);
    const savingsRate = monthlyIncome > 0 ? (monthlyIncome - monthlyExpenses) / monthlyIncome : 0;
    if (savingsRate < 0) financial -= 20;
    else if (savingsRate < 0.1) financial -= 10;
    else if (savingsRate > 0.2) financial += 10;

    // ── Tasks ────────────────────────────────────────────────────
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const overdueTasks = tasks.filter((t) => t.status === 'overdue').length;
    const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0.5;
    let taskScore = 30 + completionRate * 70;
    taskScore -= Math.min(30, overdueTasks * 8);

    // ── Goals ────────────────────────────────────────────────────
    const activeGoals = goals.filter((g) => !g.isCompleted);
    let goalsScore = 60;
    if (goals.length > 0) {
      const completedGoals = goals.filter((g) => g.isCompleted).length;
      const completionPct = completedGoals / goals.length;
      goalsScore = 30 + completionPct * 70;
      if (activeGoals.length > 0) goalsScore += 10; // has ongoing goals
    }

    // ── Health ───────────────────────────────────────────────────
    let healthScore = 50;
    const activeMeds = medications.filter((m) => m.isActive).length;
    healthScore += Math.min(20, activeMeds * 5);
    const todayStr = new Date().toISOString().split('T')[0];
    if (habits.length > 0) {
      const completedToday = habits.filter((h) => isCompletedToday(h.id)).length;
      const habitRate = completedToday / habits.length;
      healthScore += habitRate * 30;
    } else {
      healthScore += 20;
    }

    // ── Communication ────────────────────────────────────────────
    let communication = 40;
    const recentEntries = entries.filter((e) => {
      const d = new Date(e.date);
      return Date.now() - d.getTime() < 7 * 86_400_000;
    }).length;
    communication += Math.min(40, recentEntries * 10);
    if (tasks.some((t) => t.assignedTo && t.assignedTo.length > 1)) communication += 10;
    if (goals.length > 0) communication += 10;

    const overall = clamp(
      financial * 0.3 + taskScore * 0.25 + goalsScore * 0.2 + healthScore * 0.15 + communication * 0.1
    );

    return {
      overall,
      financial: clamp(financial),
      tasks: clamp(taskScore),
      goals: clamp(goalsScore),
      health: clamp(healthScore),
      communication: clamp(communication),
      lastCalculated: new Date().toISOString(),
    };
  }, [bills, budgets, monthlyIncome, monthlyExpenses, tasks, goals, medications, habits, entries]);

  useMemo(() => {
    setHealthScore(score);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  return score;
}
