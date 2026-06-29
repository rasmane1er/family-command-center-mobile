/**
 * Resets all Zustand store in-memory state to empty/initial values.
 * Call this alongside clearLocalAppData() so the UI updates immediately
 * without requiring an app restart.
 */
import { useFamilyStore } from '../store/useFamilyStore';
import { useFinanceStore } from '../store/useFinanceStore';
import { useHealthStore } from '../store/useHealthStore';
import { useOperationsStore } from '../store/useOperationsStore';
import { useNotificationsStore } from '../store/useNotificationsStore';
import { useAIStore } from '../store/useAIStore';
import { useMoodStore } from '../store/useMoodStore';
import { useHabitsStore } from '../store/useHabitsStore';
import { useShoppingStore } from '../store/useShoppingStore';

export function resetAllStores() {
  useFamilyStore.setState({
    family: null,
    members: [],
    tasks: [],
    events: [],
    achievements: [],
    vehicles: [],
    activeMemberId: null,
  } as any);

  useFinanceStore.setState({
    accounts: [],
    transactions: [],
    budgets: [],
    bills: [],
    subscriptions: [],
    financialGoals: [],
  } as any);

  useHealthStore.setState({
    medications: [],
    appointments: [],
    workouts: [],
    sleepLogs: [],
    healthMetrics: [],
  } as any);

  useOperationsStore.setState({
    pantryItems: [],
    recipes: [],
    documents: [],
    shoppingLists: [],
    mealPlans: [],
  } as any);

  useNotificationsStore.setState({ notifications: [] } as any);

  useAIStore.setState({
    conversations: [],
    insights: [],
    memories: [],
  } as any);

  useMoodStore.setState({ entries: [] } as any);
  useHabitsStore.setState({ habits: [], logs: [] } as any);
  useShoppingStore.setState({ lists: [], items: [] } as any);
}
