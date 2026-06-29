import { useMemo } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useFamilyStore } from '../store/useFamilyStore';
import { useHabitsStore, type Habit } from '../store/useHabitsStore';
import { useMoodStore, type MoodEntry } from '../store/useMoodStore';
import type { FamilyHealthScore } from '../types';

// ─── scoring helpers ──────────────────────────────────────────────────────────

function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

/**
 * Calculates a Financial Health sub-score (0–100) from real store data.
 *
 * Factors (weighted):
 *   30 pts — Savings rate  (monthlySavings / monthlyIncome)
 *   25 pts — Budget adherence (avg % of budgets not overspent)
 *   25 pts — Bills on time (% paid or autopay vs overdue)
 *   20 pts — Goal progress (avg % completion across active goals)
 */
function calcFinancialScore(
  monthlyIncome: number,
  monthlyExpenses: number,
  monthlySavings: number,
  budgets: { monthlyLimit: number; spent: number }[],
  bills: { status: string; isAutoPay: boolean }[],
  financialGoals: { savedAmount: number; targetAmount: number; isCompleted: boolean }[],
): number {
  // 1. Savings rate (30 pts)
  let savingsScore = 0;
  if (monthlyIncome > 0) {
    const rate = monthlySavings / monthlyIncome; // 0.20+ = perfect
    savingsScore = clamp((rate / 0.2) * 30, 0, 30);
  } else if (monthlyIncome === 0 && monthlySavings === 0) {
    savingsScore = 15; // neutral when no data
  }

  // 2. Budget adherence (25 pts)
  let budgetScore = 25; // default perfect when no budgets set
  if (budgets.length > 0) {
    const ratios = budgets.map((b) => (b.monthlyLimit > 0 ? Math.min(1, b.spent / b.monthlyLimit) : 0));
    const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    budgetScore = clamp((1 - avgRatio) * 25, 0, 25);
  }

  // 3. Bills on time (25 pts)
  let billScore = 25;
  if (bills.length > 0) {
    const overdue = bills.filter((b) => b.status === 'overdue').length;
    billScore = clamp(((bills.length - overdue) / bills.length) * 25, 0, 25);
  }

  // 4. Goal progress (20 pts)
  let goalScore = 10; // neutral when no goals
  const activeGoals = financialGoals.filter((g) => !g.isCompleted);
  if (activeGoals.length > 0) {
    const avgPct = activeGoals.reduce((sum, g) => sum + (g.targetAmount > 0 ? g.savedAmount / g.targetAmount : 0), 0) / activeGoals.length;
    goalScore = clamp(avgPct * 20, 0, 20);
  } else if (financialGoals.some((g) => g.isCompleted)) {
    goalScore = 20; // all goals done
  }

  return clamp(savingsScore + budgetScore + billScore + goalScore);
}

/**
 * Calculates a Tasks sub-score (0–100).
 * Based on: % of non-overdue tasks, completion rate.
 */
function calcTasksScore(tasks: { status: string }[]): number {
  if (tasks.length === 0) return 50;
  const done    = tasks.filter((t) => t.status === 'completed').length;
  const overdue = tasks.filter((t) => t.status === 'overdue').length;
  const completionRate = done / tasks.length;
  const overdueRate    = overdue / tasks.length;
  return clamp(completionRate * 70 + (1 - overdueRate) * 30);
}

/**
 * Calculates a Goals sub-score (0–100) from family goals (milestone-based).
 */
function calcGoalsScore(goals: { isCompleted: boolean; milestones: { isCompleted: boolean }[] }[]): number {
  if (goals.length === 0) return 50;
  const avgProgress = goals.reduce((sum, g) => {
    if (g.isCompleted) return sum + 100;
    if (g.milestones.length === 0) return sum + 0;
    const done = g.milestones.filter((m) => m.isCompleted).length;
    return sum + (done / g.milestones.length) * 100;
  }, 0) / goals.length;
  return clamp(avgProgress);
}

/**
 * Calculates a Wellness sub-score (0–100) from habits + mood.
 * Habits use completedDates[] (YYYY-MM-DD strings).
 * Mood uses level 1–5.
 */
function calcWellnessScore(habits: Habit[], moodEntries: MoodEntry[]): number {
  // Habit completion in last 7 days (50 pts)
  let habitScore = 25;
  if (habits.length > 0) {
    const today = new Date();
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    });
    const totalExpected = habits.length * 7;
    const totalDone = habits.reduce((sum, h) => sum + h.completedDates.filter((d) => last7.includes(d)).length, 0);
    habitScore = clamp((totalDone / totalExpected) * 50, 0, 50);
  }

  // Avg mood last 7 days (50 pts), mood level is 1–5
  let moodScore = 25;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentMoods = moodEntries.filter((e) => new Date(e.date) >= sevenDaysAgo);
  if (recentMoods.length > 0) {
    const avg = recentMoods.reduce((s, e) => s + e.level, 0) / recentMoods.length;
    moodScore = clamp((avg / 5) * 50, 0, 50);
  }

  return clamp(habitScore + moodScore);
}

// ─── hook ─────────────────────────────────────────────────────────────────────

export function useFinancialHealth(): FamilyHealthScore & {
  breakdown: {
    savingsRate: number;
    budgetAdherence: number;
    billsOnTime: number;
    goalProgress: number;
    overdueCount: number;
    overBudgetCount: number;
    totalSaved: number;
    totalTarget: number;
  };
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  tips: string[];
} {
  const { monthlyIncome, monthlyExpenses, monthlySavings, budgets, bills, financialGoals } = useFinanceStore();
  const { tasks, goals } = useFamilyStore();
  const { habits } = useHabitsStore();
  const { entries: moodEntries } = useMoodStore();

  return useMemo(() => {
    const financial = calcFinancialScore(monthlyIncome, monthlyExpenses, monthlySavings, budgets, bills, financialGoals);
    const tasksScore   = calcTasksScore(tasks);
    const goalsScore   = calcGoalsScore(goals);
    const wellnessScore = calcWellnessScore(habits, moodEntries);
    const communication = 70; // placeholder — would come from messaging/check-ins

    const overall = clamp(
      Math.round(financial * 0.35 + tasksScore * 0.25 + goalsScore * 0.20 + wellnessScore * 0.20)
    );

    // breakdown details
    const overdueCount    = bills.filter((b) => b.status === 'overdue').length;
    const overBudgetCount = budgets.filter((b) => b.spent > b.monthlyLimit).length;
    const totalSaved  = financialGoals.reduce((s, g) => s + g.savedAmount, 0);
    const totalTarget = financialGoals.reduce((s, g) => s + g.targetAmount, 0);
    const savingsRate = monthlyIncome > 0 ? Math.round((monthlySavings / monthlyIncome) * 100) : 0;
    const budgetAdherence = budgets.length > 0
      ? Math.round(((budgets.length - overBudgetCount) / budgets.length) * 100)
      : 100;
    const billsOnTime = bills.length > 0
      ? Math.round(((bills.length - overdueCount) / bills.length) * 100)
      : 100;
    const goalProgress = financialGoals.length > 0
      ? Math.round((totalSaved / Math.max(1, totalTarget)) * 100)
      : 0;

    // grade
    const grade: 'A' | 'B' | 'C' | 'D' | 'F' =
      overall >= 90 ? 'A' :
      overall >= 75 ? 'B' :
      overall >= 60 ? 'C' :
      overall >= 45 ? 'D' : 'F';

    // actionable tips
    const tips: string[] = [];
    if (savingsRate < 10 && monthlyIncome > 0) tips.push('Aim to save at least 10% of your monthly income.');
    if (overdueCount > 0) tips.push(`You have ${overdueCount} overdue bill${overdueCount > 1 ? 's' : ''} — pay them to improve your score.`);
    if (overBudgetCount > 0) tips.push(`${overBudgetCount} budget${overBudgetCount > 1 ? 's are' : ' is'} over the limit this month.`);
    if (financialGoals.filter((g) => !g.isCompleted).length === 0 && financialGoals.length === 0) tips.push('Set a financial goal to start tracking your progress.');
    if (goalProgress > 0 && goalProgress < 25) tips.push('You\'re making progress on your goals — keep it up!');
    if (tips.length === 0) tips.push('Your finances look great! Keep maintaining your good habits.');

    return {
      overall,
      financial,
      tasks: tasksScore,
      goals: goalsScore,
      health: wellnessScore,
      communication,
      lastCalculated: new Date().toISOString(),
      breakdown: { savingsRate, budgetAdherence, billsOnTime, goalProgress, overdueCount, overBudgetCount, totalSaved, totalTarget },
      grade,
      tips,
    };
  }, [monthlyIncome, monthlyExpenses, monthlySavings, budgets, bills, financialGoals, tasks, goals, habits, moodEntries]);
}
