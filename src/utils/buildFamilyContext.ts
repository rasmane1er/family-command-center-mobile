/**
 * useFamilyContextString
 * Builds a rich context string from all stores for AI prompts.
 * Must be called inside a React component (uses hooks internally).
 */
import { useFamilyStore } from '../store/useFamilyStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { useOperationsStore } from '../store/useOperationsStore';
import { useGuardianStore } from '../store/useGuardianStore';

function computeAge(dateOfBirth?: string): number {
  if (!dateOfBirth) return 0;
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age;
}

export function useFamilyContextString(): string {
  const family = useFamilyStore((s) => s.family);
  const members = useFamilyStore((s) => s.members);
  const tasks = useFamilyStore((s) => s.tasks);

  const bills = useFinanceStore((s) => s.bills);
  const accounts = useFinanceStore((s) => s.accounts);
  const monthlyIncome = useFinanceStore((s) => s.monthlyIncome);
  const monthlyExpenses = useFinanceStore((s) => s.monthlyExpenses);

  const pantryItems = useOperationsStore((s) => s.pantryItems);
  const vehicles = useOperationsStore((s) => s.vehicles);

  const sosAlerts = useGuardianStore((s) => s.sosAlerts);
  const approvalRequests = useGuardianStore((s) => s.approvalRequests);

  const today = new Date();
  const in14Days = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Family
  const familyName = family?.name ?? 'My Family';
  const membersSummary = members
    .map((m) => `${m.name} (${m.role}, ${computeAge(m.dateOfBirth)})`)
    .join(', ');

  // Bills
  const billsDueSoon = bills.filter((b) => {
    if (b.status === 'paid') return false;
    const due = new Date(b.dueDate);
    return due >= today && due <= in14Days;
  });
  const overdueBills = bills.filter((b) => {
    if (b.status === 'paid') return false;
    return new Date(b.dueDate) < today;
  });

  // Finance summary
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const financeParts: string[] = [];
  if (billsDueSoon.length > 0) {
    financeParts.push(
      `Bills due soon: ${billsDueSoon
        .map((b) => `${b.name} $${b.amount} (${new Date(b.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`)
        .join(', ')}`,
    );
  }
  if (overdueBills.length > 0) {
    financeParts.push(
      `Overdue bills: ${overdueBills
        .map((b) => {
          const days = Math.floor((today.getTime() - new Date(b.dueDate).getTime()) / 86400000);
          return `${b.name} $${b.amount} (overdue ${days} day${days !== 1 ? 's' : ''})`;
        })
        .join(', ')}`,
    );
  }
  financeParts.push(`Total balance: $${totalBalance.toFixed(0)}`);
  if (monthlyIncome > 0 || monthlyExpenses > 0) {
    financeParts.push(`Monthly income: $${monthlyIncome.toFixed(0)}, expenses: $${monthlyExpenses.toFixed(0)}`);
  }

  // Pantry
  const lowPantry = pantryItems.filter(
    (p) => p.minQuantity !== undefined && p.quantity <= p.minQuantity,
  );
  const pantrySummary =
    lowPantry.length > 0
      ? `Low pantry: ${lowPantry.map((p) => `${p.name} (${p.quantity} left)`).join(', ')}`
      : null;

  // Vehicles
  const vehiclesDueSoon = vehicles.filter((v) => {
    if (!v.nextService) return false;
    const next = new Date(v.nextService);
    return next <= in30Days;
  });
  const vehicleSummary =
    vehiclesDueSoon.length > 0
      ? `Vehicle service due: ${vehiclesDueSoon
          .map((v) => {
            const next = new Date(v.nextService!);
            const overdue = next < today;
            const days = Math.abs(Math.floor((today.getTime() - next.getTime()) / 86400000));
            return `${v.year} ${v.make} ${v.model} (${overdue ? `overdue ${days} days` : `due in ${days} days`})`;
          })
          .join(', ')}`
      : null;

  // Tasks
  const overdueTasks = tasks.filter((t) => {
    if (t.status === 'completed') return false;
    return t.dueDate && new Date(t.dueDate) < today;
  });
  const taskSummary =
    overdueTasks.length > 0
      ? `Overdue tasks: ${overdueTasks
          .map((t) => {
            const days = Math.floor((today.getTime() - new Date(t.dueDate!).getTime()) / 86400000);
            return `"${t.title}" (${days} day${days !== 1 ? 's' : ''} overdue)`;
          })
          .join(', ')}`
      : null;

  // Guardian
  const unresolvedSOS = sosAlerts.filter((a) => !a.isResolved).length;
  const pendingApprovals = approvalRequests.filter((r) => r.status === 'pending').length;
  const guardianParts: string[] = [];
  if (unresolvedSOS > 0) guardianParts.push(`${unresolvedSOS} SOS alert${unresolvedSOS !== 1 ? 's' : ''}`);
  if (pendingApprovals > 0) guardianParts.push(`${pendingApprovals} approval request${pendingApprovals !== 1 ? 's' : ''}`);
  const guardianSummary = guardianParts.length > 0 ? `Pending: ${guardianParts.join(', ')}` : null;

  const parts = [
    `Family: ${familyName} | Members: ${membersSummary}`,
    ...financeParts,
    pantrySummary,
    vehicleSummary,
    taskSummary,
    guardianSummary,
  ].filter((p): p is string => p !== null && p !== '');

  return parts.join('\n');
}

export { computeAge };
