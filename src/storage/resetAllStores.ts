import { storage } from './mmkvStorage';
import { clearWidgetData } from '../widgets/widgetStorage';
import * as FileSystem from 'expo-file-system';

import { useFamilyStore }        from '../store/useFamilyStore';
import { useFinanceStore }        from '../store/useFinanceStore';
import { usePlaidStore }          from '../store/usePlaidStore';
import { useHealthStore }         from '../store/useHealthStore';
import { useOperationsStore }     from '../store/useOperationsStore';
import { useNotificationsStore }  from '../store/useNotificationsStore';
import { useAIStore }             from '../store/useAIStore';
import { useMoodStore }           from '../store/useMoodStore';
import { useHabitsStore }         from '../store/useHabitsStore';
import { useShoppingStore }       from '../store/useShoppingStore';
import { useActivitiesStore }     from '../store/useActivitiesStore';
import { useAllowanceStore }      from '../store/useAllowanceStore';
import { useAutomationStore }     from '../store/useAutomationStore';
import { useConnectStore }        from '../store/useConnectStore';
import { useBirthdayStore }       from '../store/useBirthdayStore';
import { useBucketListStore }     from '../store/useBucketListStore';
import { useCarpoolStore }        from '../store/useCarpoolStore';
import { useChildcareStore }      from '../store/useChildcareStore';
import { useChoreStore }          from '../store/useChoreStore';
import { useFamilyBoardStore }    from '../store/useFamilyBoardStore';
import { useFamilyGoalsStore }    from '../store/useFamilyGoalsStore';
import { useGiftStore }           from '../store/useGiftStore';
import { useGuardianStore }       from '../store/useGuardianStore';
import { useHomeInventoryStore }  from '../store/useHomeInventoryStore';
import { useHomeMaintenanceStore } from '../store/useHomeMaintenanceStore';
import { useHomeworkStore }       from '../store/useHomeworkStore';
import { useInsuranceStore }      from '../store/useInsuranceStore';
import { useJoinRequestsStore }   from '../store/useJoinRequestsStore';
import { useJournalStore }        from '../store/useJournalStore';
import { useLegacyStore }         from '../store/useLegacyStore';
import { useMedicationStore }     from '../store/useMedicationStore';
import { useMemoryStore }         from '../store/useMemoryStore';
import { usePetStore }            from '../store/usePetStore';
import { usePollsStore }          from '../store/usePollsStore';
import { useRecipesStore }        from '../store/useRecipesStore';
import { useSchoolStore }         from '../store/useSchoolStore';
import { useSleepStore }          from '../store/useSleepStore';
import { useTimelineStore }       from '../store/useTimelineStore';
import { useTravelStore }         from '../store/useTravelStore';
import { useUtilityStore }        from '../store/useUtilityStore';
import { useWealthStore }         from '../store/useWealthStore';
import { useWorkoutStore }        from '../store/useWorkoutStore';
import { useFamilyMeetingsStore } from '../store/useFamilyMeetingsStore';
import { useEmergencyStore, DEFAULT_CHECKLIST } from '../store/useEmergencyStore';
import { useMilitaryStore } from '../store/useMilitaryStore';
import { useCoachingStore }       from '../store/useCoachingStore';
import { useDigitalTwinStore }    from '../store/useDigitalTwinStore';
import { useEventPlannerStore }   from '../store/useEventPlannerStore';
import { useGardenStore }         from '../store/useGardenStore';
import { useHOAStore }            from '../store/useHOAStore';
import { useMealPrepStore }       from '../store/useMealPrepStore';
import { useReadingStore }        from '../store/useReadingStore';
import { useTaxStore }            from '../store/useTaxStore';
import { useVolunteerStore }      from '../store/useVolunteerStore';
import { useChatStore }           from '../store/useChatStore';
import { useMedicalRecordsStore } from '../store/useMedicalRecordsStore';
import { useNutritionStore }      from '../store/useNutritionStore';
import { useWellnessStore }       from '../store/useWellnessStore';
import { useAppStore }            from '../store/useAppStore';

// MMKV keys to preserve across resets (auth + app settings)
const PRESERVE_KEYS = new Set([
  'family-command-center-auth',
  'family-command-center-app',
]);

/**
 * Wipes all user data from MMKV persistence and resets every Zustand store
 * to its empty initial state. Call this on sign-up and on every sign-in (new
 * or returning account) so one account's data can never bleed into another
 * on a shared device. Auth and app-settings keys are preserved, minus the
 * few account-specific fields carved out of app-settings below.
 */
export function resetAllStores() {
  // 1. Wipe MMKV — remove every persisted store key except auth & app settings
  const allKeys = storage.getAllKeys();
  for (const key of allKeys) {
    if (!PRESERVE_KEYS.has(key)) {
      storage.remove(key);
    }
  }

  // 2. Reset in-memory Zustand state for every store
  useFamilyStore.setState({
    family: null, members: [], tasks: [], events: [],
    goals: [], rewards: [], rewardCatalog: [], hasSeededRewardCatalog: false,
    achievements: [], activeMemberId: null, isLoaded: false,
    isHydratingTasks: false, isHydratingEvents: false,
  } as any);

  useFinanceStore.setState({
    accounts: [], transactions: [], budgets: [],
    bills: [], subscriptions: [], financialGoals: [], debts: [],
    // totalNetWorth/monthlyIncome/monthlyExpenses/monthlySavings are derived
    // by calcDerived() from accounts/transactions — clearing those arrays
    // alone doesn't re-run it, so the numbers themselves have to be zeroed
    // here too or the dashboard tiles show the previous account's figures
    // until the next fetchFromServer() resolves.
    totalNetWorth: 0, monthlyIncome: 0, monthlyExpenses: 0, monthlySavings: 0,
    isLoaded: false, localAdoptedAt: null,
    accountTransactions: {}, recurringTransactions: {},
  } as any);

  // Bank balances read reactively by useTotalNetWorth() — without this the
  // previous account's Plaid balances kept rendering until a cold restart,
  // since the live store instance stays resident in memory across sign-out/
  // sign-in even though its MMKV-persisted copy is wiped above.
  usePlaidStore.setState({
    isConnected: false, itemCount: 0, lastSyncedAt: null, isSyncing: false, accounts: [],
  } as any);

  useHealthStore.setState({
    records: [], goals: [], appointments: [],
  } as any);

  useFamilyMeetingsStore.setState({ meetings: [] } as any);

  useEmergencyStore.setState({ checklist: DEFAULT_CHECKLIST } as any);

  useMilitaryStore.setState({ deployments: [], pcsMoves: [], readiness: null } as any);

  useOperationsStore.setState({
    pantryItems: [], documents: [],
    mealPlans: [], assets: [], vehicles: [], isLoaded: false,
  } as any);

  useNotificationsStore.setState({ notifications: [], notifiedSourceKeys: [] } as any);

  useAIStore.setState({ messages: [], insights: [] } as any);

  useMoodStore.setState({ entries: [] } as any);

  useHabitsStore.setState({ habits: [] } as any);

  useShoppingStore.setState({ items: [], budget: 0, hasSeeded: false } as any);

  useActivitiesStore.setState({ activities: [] } as any);

  useAllowanceStore.setState({ configs: [], transactions: [], hasSeeded: false } as any);

  useAutomationStore.setState({
    rules: [], listings: [], conflicts: [], timeBlocks: [], devices: [], hasSeeded: false,
    hueBridgeIp: null, hueConnected: false, hueScenes: [], isRefreshingHue: false,
    devicesLoaded: false,
  } as any);

  useConnectStore.setState({
    connections: [], incomingRequests: [], outgoingRequests: [], blockedHouseholds: [],
    isLoaded: false, isLoading: false,
    feedPosts: [], feedNextCursor: null, isFeedLoading: false, postComments: {}, postReactions: {},
    coParentGrants: [], sharedChildren: {}, sharedCustodyEvents: [],
  } as any);

  useBirthdayStore.setState({ birthdays: [] } as any);

  useBucketListStore.setState({ items: [] } as any);

  useCarpoolStore.setState({ routes: [] } as any);

  useChildcareStore.setState({ caregivers: [], bookings: [], hasSeeded: false } as any);

  useChoreStore.setState({ chores: [] } as any);

  useFamilyBoardStore.setState({ posts: [], hasSeeded: false } as any);

  useFamilyGoalsStore.setState({ goals: [], hasSeeded: false } as any);

  useGiftStore.setState({ gifts: [], hasSeeded: false } as any);

  useGuardianStore.setState({
    devices: [], geofenceZones: [], screenTimeRules: [], appUsage: [],
    sosAlerts: [], approvalRequests: [], pendingCommands: [],
    thisDeviceId: null, myPairingCode: null, isHydrating: false,
  } as any);

  useHomeInventoryStore.setState({ items: [] } as any);

  useHomeMaintenanceStore.setState({ tasks: [], hasSeeded: false } as any);

  useHomeworkStore.setState({ assignments: [] } as any);

  useInsuranceStore.setState({ policies: [] } as any);

  useJoinRequestsStore.setState({ requests: [] } as any);

  useJournalStore.setState({ entries: [] } as any);

  useLegacyStore.setState({ items: [] } as any);

  useMedicationStore.setState({ medications: [] } as any);

  useMemoryStore.setState({ memories: [] } as any);

  usePetStore.setState({ pets: [], events: [] } as any);

  usePollsStore.setState({ polls: [] } as any);

  useRecipesStore.setState({ recipes: [], hasSeeded: false } as any);

  useSchoolStore.setState({ subjects: [], assignments: [], hasSeeded: false } as any);

  useSleepStore.setState({ logs: [] } as any);

  useTimelineStore.setState({ entries: [] } as any);

  useTravelStore.setState({ trips: [], hasSeeded: false } as any);

  useUtilityStore.setState({ bills: [] } as any);

  useWealthStore.setState({ entries: [], projections: [], reputationScores: [] } as any);

  useWorkoutStore.setState({ workouts: [] } as any);

  useCoachingStore.setState({ progress: {} } as any);

  useDigitalTwinStore.setState({ snapshots: [] } as any);

  useEventPlannerStore.setState({
    events: [], guests: [], tasks: [], expenses: [], isLoaded: false,
  } as any);

  useGardenStore.setState({ plants: [], tasks: [] } as any);

  useHOAStore.setState({
    dues: [], rules: [], amenities: [], meetings: [],
    monthlyDueAmount: 0, hoaName: '', managementCompany: '', managementPhone: '',
    isLoaded: false,
  } as any);

  useMealPrepStore.setState({ sessions: [], items: [], ingredients: [], isLoaded: false } as any);

  useReadingStore.setState({ books: [], challenges: [], isLoaded: false } as any);

  useTaxStore.setState({ documents: [], deductions: [], selectedYear: 2026 } as any);

  useVolunteerStore.setState({ logs: [], goals: [], isLoaded: false } as any);

  // Not persisted (see useChatStore.ts), but the live store instance still
  // holds the previous account's thread list and message bodies in memory,
  // and — worse — may still have an open socket connection wired to their
  // session. Disconnect before clearing so no in-flight event for the old
  // account can repopulate this right after the reset.
  useChatStore.getState().disconnectSocket();
  useChatStore.setState({
    threads: [], activeThreadId: null, messages: {}, connectionStatus: 'disconnected',
    isLoadingThreads: false, isLoadingMessages: false, isSending: false, error: null,
    listenersWired: false,
  } as any);

  // Not persisted — medical records, food log, and weight data are pure
  // in-memory stores with no cap on how long stale data survives otherwise.
  useMedicalRecordsStore.setState({ records: [], doctors: [] } as any);

  useNutritionStore.setState({ entries: [], goals: [], isLoaded: false, isLoading: false, error: null } as any);

  useWellnessStore.setState({
    entries: [], weightGoalLbs: null, isLoading: false, error: null,
    suggestions: null, isSuggesting: false, suggestionError: null,
  } as any);

  // app-settings (PRESERVE_KEYS) deliberately survives account switches —
  // theme/language/currency/etc. are device preferences, not account data.
  // But subscriptionTier and deviceLockedMemberId are entitlement/lock state
  // that belongs to the PREVIOUS account and must not leak into whoever
  // signs in next (subscriptionTier especially — otherwise a free account
  // briefly inherits a former Premium account's paywall-unlocked tier until
  // the next server entitlement check happens to overwrite it). Resetting
  // subscriptionChecked too forces that server check to actually run again
  // for the new account instead of trusting the stale value as already-confirmed.
  useAppStore.setState((s) => ({
    settings: { ...s.settings, subscriptionTier: 'free', deviceLockedMemberId: null },
    subscriptionChecked: false,
  } as any));

  // Home-screen widget cache lives in its own unencrypted MMKV instance
  // (see widgetStorage.ts) that step 1's wipe loop above can't reach —
  // without this, a previous account's family name/task count/event stays
  // visible on the device's home screen (outside the app entirely) until
  // the next background widget refresh happens to overwrite it.
  clearWidgetData();

  // Uploaded documents are saved to app-local disk (DocumentsScreen.tsx),
  // keyed only by a random id + original filename — not per-account. The
  // useOperationsStore.documents list pointing at them is cleared above, so
  // they're not reachable from the new account's UI, but the files
  // themselves would otherwise sit on disk indefinitely across accounts.
  // Fire-and-forget: this function stays synchronous like every call site
  // expects, and a failed/missing directory is not worth surfacing here.
  FileSystem.deleteAsync(`${FileSystem.documentDirectory}fcc_docs/`, { idempotent: true }).catch(() => {});
}
