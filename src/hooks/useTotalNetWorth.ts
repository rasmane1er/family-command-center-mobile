import { useMemo } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useWealthStore } from '../store/useWealthStore';
import { useOperationsStore } from '../store/useOperationsStore';

// Single source of truth for "how much is this family worth" — before this,
// three different screens each computed their own disconnected total and
// all called it some variant of "Net Worth": FinanceDashboardScreen used
// only Plaid-linked account balances, WealthBuilderScreen used only
// manually-tracked wealth entries (retirement/stocks/real estate/etc.),
// and AssetsScreen used only physical possessions — none of them combined
// with the others, and none subtracted debt. This combines all four real
// sources into one number.
export function useTotalNetWorth(): number {
  const accounts = useFinanceStore((s) => s.accounts);
  const wealthEntries = useWealthStore((s) => s.entries);
  const assets = useOperationsStore((s) => s.assets);
  const debts = useFinanceStore((s) => s.debts);

  return useMemo(() => {
    const accountsTotal = accounts.reduce((sum, a) => sum + a.balance, 0);
    const wealthTotal = wealthEntries.reduce((sum, e) => sum + e.currentValue, 0);
    const assetsTotal = assets.reduce((sum, a) => sum + a.value, 0);
    const debtTotal = debts.reduce((sum, d) => sum + d.balance, 0);
    return accountsTotal + wealthTotal + assetsTotal - debtTotal;
  }, [accounts, wealthEntries, assets, debts]);
}
