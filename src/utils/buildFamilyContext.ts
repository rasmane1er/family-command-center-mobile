import { useFamilyStore } from '../store/useFamilyStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { useOperationsStore } from '../store/useOperationsStore';
import { useMedicationStore } from '../store/useMedicationStore';
import { useHealthStore } from '../store/useHealthStore';
import { useAppStore } from '../store/useAppStore';

/**
 * Builds a rich natural-language context string from live store state.
 * Called once per AI message send so Claude always has current data.
 */
export function buildFamilyContext(): string {
  const { family, members, tasks, events, goals } = useFamilyStore.getState();
  const { bills, budgets, monthlyIncome, monthlyExpenses, accounts, subscriptions } = useFinanceStore.getState();
  const { pantryItems, vehicles } = useOperationsStore.getState();
  const { medications } = useMedicationStore.getState();
  const { records: healthRecords } = useHealthStore.getState();
  const healthScore = useAppStore.getState().healthScore;

  const now = new Date();
  const lines: string[] = [];

  // ── Family ──────────────────────────────────────────────────────
  if (family) {
    lines.push(`FAMILY: ${family.name} | Timezone: ${family.timezone} | Currency: ${family.currency}`);
  }

  if (members.length > 0) {
    const memberList = members.map((m) => `${m.name} (${m.role}, ${m.status})`).join(', ');
    lines.push(`MEMBERS [${members.length}]: ${memberList}`);
  }

  // ── Tasks ────────────────────────────────────────────────────────
  const overdueTasks = tasks.filter((t) => t.status === 'overdue');
  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const highPriority = pendingTasks.filter((t) => t.priority === 'high' || t.priority === 'urgent');

  if (overdueTasks.length > 0) {
    lines.push(`OVERDUE TASKS [${overdueTasks.length}]: ${overdueTasks.slice(0, 4).map((t) => {
      const assignee = members.find((m) => t.assignedTo?.includes(m.id));
      return `"${t.title}"${assignee ? ` (${assignee.name})` : ''}`;
    }).join('; ')}`);
  }
  if (highPriority.length > 0) {
    lines.push(`HIGH-PRIORITY PENDING [${highPriority.length}]: ${highPriority.slice(0, 3).map((t) => `"${t.title}"`).join('; ')}`);
  }
  lines.push(`TASKS TOTAL: ${tasks.length} | Pending: ${pendingTasks.length} | Completed: ${tasks.filter((t) => t.status === 'completed').length}`);

  // ── Calendar ─────────────────────────────────────────────────────
  const upcoming = events
    .filter((e) => new Date(e.startDate) > now && new Date(e.startDate).getTime() - now.getTime() < 7 * 86_400_000)
    .slice(0, 4);
  if (upcoming.length > 0) {
    lines.push(`UPCOMING EVENTS (7 days): ${upcoming.map((e) => {
      const d = new Date(e.startDate);
      return `"${e.title}" on ${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}${e.location ? ` at ${e.location}` : ''}`;
    }).join('; ')}`);
  }

  // ── Finance ──────────────────────────────────────────────────────
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  lines.push(`FINANCES: Monthly income $${monthlyIncome.toLocaleString()} | Expenses $${monthlyExpenses.toLocaleString()} | Net worth $${totalBalance.toLocaleString()}`);

  const overdueBills = bills.filter((b) => b.status === 'overdue');
  const dueSoonBills = bills.filter((b) => b.status === 'due_soon');
  if (overdueBills.length > 0) {
    lines.push(`OVERDUE BILLS [${overdueBills.length}]: ${overdueBills.map((b) => `${b.name} $${b.amount}`).join(', ')}`);
  }
  if (dueSoonBills.length > 0) {
    lines.push(`BILLS DUE SOON: ${dueSoonBills.map((b) => `${b.name} $${b.amount}`).join(', ')}`);
  }

  const overBudget = budgets.filter((b) => b.monthlyLimit > 0 && b.spent > b.monthlyLimit);
  const nearBudget = budgets.filter((b) => b.monthlyLimit > 0 && b.spent / b.monthlyLimit >= 0.8 && b.spent <= b.monthlyLimit);
  if (overBudget.length > 0) {
    lines.push(`OVER BUDGET: ${overBudget.map((b) => `${b.category} ($${b.spent}/$${b.monthlyLimit})`).join(', ')}`);
  }
  if (nearBudget.length > 0) {
    lines.push(`NEAR BUDGET LIMIT: ${nearBudget.map((b) => `${b.category} ${Math.round(b.spent / b.monthlyLimit * 100)}%`).join(', ')}`);
  }

  const monthlySubCost = subscriptions.filter((s) => s.isActive).reduce((sum, s) => sum + s.amount, 0);
  if (monthlySubCost > 0) {
    lines.push(`SUBSCRIPTIONS: ${subscriptions.filter((s) => s.isActive).length} active, total $${monthlySubCost.toFixed(2)}/month`);
  }

  // ── Goals ────────────────────────────────────────────────────────
  const activeGoals = goals.filter((g) => !g.isCompleted);
  if (activeGoals.length > 0) {
    lines.push(`FAMILY GOALS [${activeGoals.length} active]: ${activeGoals.slice(0, 3).map((g) => `"${g.title}" (target: ${g.targetDate || 'ongoing'})`).join('; ')}`);
  }

  // ── Operations ───────────────────────────────────────────────────
  const lowPantry = pantryItems.filter((p: any) => p.quantity != null && p.quantity <= (p.minQuantity ?? 1));
  if (lowPantry.length > 0) {
    lines.push(`LOW PANTRY ITEMS [${lowPantry.length}]: ${lowPantry.slice(0, 5).map((p: any) => p.name).join(', ')}`);
  }
  lines.push(`PANTRY: ${pantryItems.length} items tracked`);

  if (vehicles.length > 0) {
    lines.push(`VEHICLES [${vehicles.length}]: ${vehicles.map((v: any) => `${v.year} ${v.make} ${v.model}`).join(', ')}`);
  }

  // ── Health & Medications ─────────────────────────────────────────
  const activeMeds = medications.filter((m) => m.isActive);
  if (activeMeds.length > 0) {
    const lowMeds = activeMeds.filter((m) => m.pillsRemaining != null && (m.pillsRemaining as number) < 10);
    lines.push(`MEDICATIONS: ${activeMeds.length} active${lowMeds.length > 0 ? ` | LOW SUPPLY: ${lowMeds.map((m) => m.name).join(', ')}` : ''}`);
  }

  // ── Health Score ─────────────────────────────────────────────────
  if (healthScore) {
    lines.push(`FAMILY HEALTH SCORE: ${healthScore.overall}/100 (Financial:${healthScore.financial} Tasks:${healthScore.tasks} Goals:${healthScore.goals} Health:${healthScore.health} Communication:${healthScore.communication})`);
  }

  return lines.join('\n');
}
