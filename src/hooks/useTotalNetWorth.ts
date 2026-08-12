import { useMemo } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useWealthStore } from '../store/useWealthStore';
import { useOperationsStore } from '../store/useOperationsStore';
import { usePlaidStore } from '../store/usePlaidStore';

// Single source of truth for "how much is this family worth" — before this,
// three different screens each computed their own disconnected total and
// all called it some variant of "Net Worth": FinanceDashboardScreen used
// only Plaid-linked account balances, WealthBuilderScreen used only
// manually-tracked wealth entries (retirement/stocks/real estate/etc.),
// and AssetsScreen used only physical possessions — none of them combined
// with the others, and none subtracted debt. This combines all five real
// sources into one number.
//
// Note: a manually-entered FinancialAccount and a Plaid-linked account for
// the same real-world bank account will double-count here — there's no
// link between the two records (FinancialAccount has no plaidAccountId), so
// this can't be deduped automatically. In practice this only happens if a
// user manually re-enters a balance for an account they've also connected
// via Plaid, which the UI doesn't currently prompt anyone to do.
export function useTotalNetWorth(): number {
  const accounts = useFinanceStore((s) => s.accounts);
  const wealthEntries = useWealthStore((s) => s.entries);
  const assets = useOperationsStore((s) => s.assets);
  const debts = useFinanceStore((s) => s.debts);
  const plaidAccounts = usePlaidStore((s) => s.accounts);

  return useMemo(() => {
    const accountsTotal = accounts.reduce((sum, a) => sum + a.balance, 0);
    const wealthTotal = wealthEntries.reduce((sum, e) => sum + e.currentValue, 0);
    const assetsTotal = assets.reduce((sum, a) => sum + a.value, 0);
    const debtTotal = debts.reduce((sum, d) => sum + d.balance, 0);
    // Credit (and loan, which Plaid sync folds into the 'credit' bucket —
    // see plaid.ts's syncPlaidItem) balances are what's owed, so they
    // subtract; every other account type (checking/savings/investment) adds.
    const plaidTotal = plaidAccounts.reduce(
      (sum, a) => (a.accountType === 'credit' ? sum - a.balance : sum + a.balance),
      0,
    );
    return accountsTotal + wealthTotal + assetsTotal + plaidTotal - debtTotal;
  }, [accounts, wealthEntries, assets, debts, plaidAccounts]);
}
