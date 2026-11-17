/**
 * Automation rules engine — evaluates active rules against live store state
 * and fires their configured actions. Call evaluate() on app foreground,
 * after significant state changes, or on a timer.
 */

import type { AutomationRule } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 11);
const now = () => new Date().toISOString();

export interface EvalResult {
  ruleId: string;
  ruleName: string;
  fired: boolean;
  reason?: string;
  actionTaken?: string;
}

// ── Main entry point ─────────────────────────────────────────────────────────

export function evaluateRules(): EvalResult[] {
  const { rules } = (require('../store/useAutomationStore').useAutomationStore as any).getState();
  const activeRules: AutomationRule[] = rules.filter((r: AutomationRule) => r.isActive);
  return activeRules.map(evaluateRule).filter((r): r is EvalResult => r !== null);
}

function evaluateRule(rule: AutomationRule): EvalResult | null {
  try {
    const triggered = checkTrigger(rule);
    if (!triggered.fires) {
      return { ruleId: rule.id, ruleName: rule.name, fired: false, reason: triggered.reason };
    }
    const action = fireAction(rule);
    if (action.fired) {
      const { rules } = (require('../store/useAutomationStore').useAutomationStore as any).getState();
      (require('../store/useAutomationStore').useAutomationStore as any).setState({
        rules: rules.map((r: AutomationRule) =>
          r.id === rule.id ? { ...r, runCount: r.runCount + 1, lastRun: now() } : r
        ),
      });
    }
    return { ruleId: rule.id, ruleName: rule.name, fired: action.fired, actionTaken: action.description };
  } catch {
    return null;
  }
}

// ── Trigger evaluation ───────────────────────────────────────────────────────

interface TriggerResult { fires: boolean; reason?: string }

function checkTrigger(rule: AutomationRule): TriggerResult {
  const { type, value, condition } = rule.trigger;

  if (type === 'manual') {
    return { fires: false, reason: 'manual trigger — user must fire' };
  }

  if (type === 'time') {
    return checkTimeTrigger(value, rule.lastRun);
  }

  if (type === 'condition') {
    return checkConditionTrigger(condition || value);
  }

  if (type === 'event') {
    return checkEventTrigger(value);
  }

  return { fires: false, reason: `trigger type "${type}" not evaluatable` };
}

function checkTimeTrigger(value: string, lastRun?: string): TriggerResult {
  // value format: "daily:07:00", "weekly:friday:07:00", "monthly:1:09:00"
  const now = new Date();

  if (lastRun) {
    const last = new Date(lastRun);
    const hoursSince = (now.getTime() - last.getTime()) / 3600000;

    if (value.startsWith('daily:')) {
      if (hoursSince < 23) return { fires: false, reason: 'already ran today' };
      const [, hh, mm] = value.split(':');
      const targetH = parseInt(hh, 10);
      const targetM = parseInt(mm, 10);
      if (Math.abs(now.getHours() - targetH) <= 1 && Math.abs(now.getMinutes() - targetM) < 30) {
        return { fires: true };
      }
      return { fires: false, reason: 'not the right time yet' };
    }

    if (value.startsWith('weekly:')) {
      if (hoursSince < 6 * 24) return { fires: false, reason: 'already ran this week' };
      const parts = value.split(':');
      const targetDay = parts[1].toLowerCase();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      if (days[now.getDay()] === targetDay) return { fires: true };
      return { fires: false, reason: `not ${targetDay}` };
    }
  } else {
    // Never run before — only fire for 'condition' first run, skip time-based
    if (value.startsWith('daily:') || value.startsWith('weekly:') || value.startsWith('monthly:')) {
      return { fires: false, reason: 'initial setup — will fire on schedule' };
    }
  }

  return { fires: false, reason: 'time trigger: waiting for window' };
}

function checkConditionTrigger(condition: string): TriggerResult {
  const lower = condition.toLowerCase();

  // Budget over X%
  const budgetMatch = lower.match(/budget.*over\s*(\d+)\s*%|(\d+)\s*%.*budget/);
  if (budgetMatch) {
    const threshold = parseInt(budgetMatch[1] || budgetMatch[2], 10) / 100;
    const { budgets } = (require('../store/useFinanceStore').useFinanceStore as any).getState();
    const overBudget = budgets.filter((b: any) => b.monthlyLimit > 0 && b.spent / b.monthlyLimit >= threshold);
    if (overBudget.length > 0) {
      return { fires: true };
    }
    return { fires: false, reason: 'no budgets at threshold' };
  }

  // Bills due in N days
  const billMatch = lower.match(/bill.*due.*(\d+)\s*day|(\d+)\s*day.*bill.*due/);
  if (billMatch) {
    const days = parseInt(billMatch[1] || billMatch[2], 10);
    const { bills } = (require('../store/useFinanceStore').useFinanceStore as any).getState();
    const soon = bills.filter((b: any) => {
      if (b.status === 'paid') return false;
      const daysUntil = (new Date(b.dueDate).getTime() - Date.now()) / 86400000;
      return daysUntil >= 0 && daysUntil <= days;
    });
    if (soon.length > 0) return { fires: true };
    return { fires: false, reason: 'no bills due soon' };
  }

  // Pantry low
  if (lower.includes('pantry') && (lower.includes('low') || lower.includes('empty'))) {
    const { pantryItems } = (require('../store/useOperationsStore').useOperationsStore as any).getState();
    const low = pantryItems.filter((p: any) => p.quantity != null && p.quantity <= (p.minQuantity ?? 1));
    if (low.length > 0) return { fires: true };
    return { fires: false, reason: 'pantry stocked' };
  }

  // Overdue tasks
  if (lower.includes('overdue') && lower.includes('task')) {
    const { tasks } = (require('../store/useFamilyStore').useFamilyStore as any).getState();
    const overdue = tasks.filter((t: any) => t.status === 'overdue');
    if (overdue.length > 0) return { fires: true };
    return { fires: false, reason: 'no overdue tasks' };
  }

  // Health score below X
  const healthMatch = lower.match(/health.*score.*below\s*(\d+)|below\s*(\d+).*health.*score/);
  if (healthMatch) {
    const threshold = parseInt(healthMatch[1] || healthMatch[2], 10);
    const healthScore = (require('../store/useAppStore').useAppStore as any).getState().healthScore;
    if (healthScore && healthScore.overall < threshold) return { fires: true };
    return { fires: false, reason: 'health score above threshold' };
  }

  return { fires: false, reason: 'condition not matched' };
}

function checkEventTrigger(value: string): TriggerResult {
  const lower = value.toLowerCase();

  // Task completed
  if (lower.includes('task_completed') || lower.includes('chore completed')) {
    return { fires: false, reason: 'event triggers require hook-based invocation' };
  }

  return { fires: false, reason: 'event trigger: not evaluatable in poll mode' };
}

// ── Action execution ─────────────────────────────────────────────────────────

interface ActionResult { fired: boolean; description?: string }

function fireAction(rule: AutomationRule): ActionResult {
  const { type, value, target } = rule.action;

  if (type === 'notify') {
    return fireNotifyAction(rule.name, value);
  }

  if (type === 'task') {
    return fireCreateTaskAction(value, target);
  }

  if (type === 'reminder') {
    return fireNotifyAction(`Reminder: ${rule.name}`, value);
  }

  if (type === 'message') {
    // Would send to family chat — log it as an AI insight for now
    return fireInsightAction(rule.name, value);
  }

  return { fired: false, description: `action type "${type}" not implemented` };
}

function fireNotifyAction(title: string, body: string): ActionResult {
  try {
    const { scheduleLocalNotification } =
      (require('../services/NotificationService').NotificationService as any);
    if (scheduleLocalNotification) {
      scheduleLocalNotification({ title, body, trigger: { seconds: 1 } });
      return { fired: true, description: `Notification sent: "${title}"` };
    }
  } catch {
    // NotificationService may not export scheduleLocalNotification directly
  }
  // Fallback: add an AI insight so the user sees it in the app
  return fireInsightAction(title, body);
}

function fireCreateTaskAction(taskTitle: string, assigneeName?: string): ActionResult {
  const { addTask, members, family } =
    (require('../store/useFamilyStore').useFamilyStore as any).getState();
  if (!family) return { fired: false, description: 'no family' };

  let assignedTo: string[] | undefined;
  if (assigneeName) {
    const member = members.find((m: any) =>
      m.name.toLowerCase().includes(assigneeName.toLowerCase())
    );
    if (member) assignedTo = [member.id];
  }

  addTask({
    id: generateId(),
    familyId: family.id,
    title: taskTitle,
    priority: 'medium',
    status: 'pending',
    category: 'Automation',
    recurrence: 'none',
    points: 50,
    assignedTo,
    createdAt: now(),
    createdBy: 'automation',
  });
  return { fired: true, description: `Task created: "${taskTitle}"` };
}

function fireInsightAction(title: string, body: string): ActionResult {
  const { addInsight } = (require('../store/useAIStore').useAIStore as any).getState();
  const family = (require('../store/useFamilyStore').useFamilyStore as any).getState().family;
  addInsight({
    id: generateId(),
    familyId: family?.id || 'automation',
    type: 'alert',
    title: `🤖 ${title}`,
    summary: body,
    priority: 'medium',
    isRead: false,
    createdAt: now(),
  });
  return { fired: true, description: `Insight added: "${title}"` };
}

// ── Manual fire for a single rule ─────────────────────────────────────────────

export function fireRuleNow(ruleId: string): EvalResult | null {
  const { rules } = (require('../store/useAutomationStore').useAutomationStore as any).getState();
  const rule = rules.find((r: AutomationRule) => r.id === ruleId);
  if (!rule) return null;
  const action = fireAction(rule);
  if (action.fired) {
    (require('../store/useAutomationStore').useAutomationStore as any).setState({
      rules: rules.map((r: AutomationRule) =>
        r.id === ruleId ? { ...r, runCount: r.runCount + 1, lastRun: now() } : r
      ),
    });
  }
  return { ruleId, ruleName: rule.name, fired: action.fired, actionTaken: action.description };
}
