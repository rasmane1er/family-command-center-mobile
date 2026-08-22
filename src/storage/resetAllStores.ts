import { storage } from './mmkvStorage';

import { useFamilyStore }        from '../store/useFamilyStore';
import { useFinanceStore }        from '../store/useFinanceStore';
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

// MMKV keys to preserve across resets (auth + app settings)
const PRESERVE_KEYS = new Set([
  'family-command-center-auth',
  'family-command-center-app',
]);

/**
 * Wipes all user data from MMKV persistence and resets every Zustand store
 * to its empty initial state. Call this on sign-up so new users start clean.
 * Auth and app-settings keys are preserved.
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
  } as any);

  useFinanceStore.setState({
    accounts: [], transactions: [], budgets: [],
    bills: [], subscriptions: [], financialGoals: [], debts: [],
  } as any);

  useHealthStore.setState({
    records: [], goals: [], appointments: [],
  } as any);

  useFamilyMeetingsStore.setState({ meetings: [] } as any);

  useEmergencyStore.setState({ checklist: DEFAULT_CHECKLIST } as any);

  useMilitaryStore.setState({ deployments: [], pcsMoves: [], readiness: null } as any);

  useOperationsStore.setState({
    pantryItems: [], documents: [],
    mealPlans: [], assets: [], vehicles: [],
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
  } as any);

  useConnectStore.setState({
    connections: [], incomingRequests: [], outgoingRequests: [], isLoaded: false, isLoading: false,
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
}
