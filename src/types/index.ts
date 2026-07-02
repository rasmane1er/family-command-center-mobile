// ===================== FAMILY & MEMBERS =====================

export type MemberRole = 'parent' | 'child' | 'guardian' | 'grandparent' | 'caregiver';
export type MemberStatus = 'active' | 'away' | 'school' | 'work' | 'sleeping';

export interface MemberPermissions {
  viewFinance: boolean;
  manageFinance: boolean;
  viewTasks: boolean;
  manageTasks: boolean;
  viewCalendar: boolean;
  manageCalendar: boolean;
  viewHealth: boolean;
  manageHealth: boolean;
  viewDocuments: boolean;
  manageDocuments: boolean;
  viewFamily: boolean;
  manageFamily: boolean;
  viewOperations: boolean;
  manageOperations: boolean;
  approveRequests: boolean;
  viewAI: boolean;
  manageAI: boolean;
  switchProfiles: boolean;
  viewAllProfiles: boolean;
}

export interface FamilyMember {
  id: string;
  familyId: string;
  name: string;
  role: MemberRole;
  avatar?: string;
  avatarColor: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  status: MemberStatus;
  points: number;
  level: number;
  isAdmin: boolean;
  medicalInfo?: MedicalInfo;
  createdAt: string;
  // Household model additions
  linkedUserId?: string | null;
  isLocalProfile: boolean;
  pin?: string;
  isPinProtected: boolean;
  permissions: MemberPermissions;
  inviteStatus?: 'none' | 'pending' | 'accepted';
  inviteToken?: string;
}

export function defaultPermissionsForRole(role: MemberRole): MemberPermissions {
  const full: MemberPermissions = {
    viewFinance: true, manageFinance: true, viewTasks: true, manageTasks: true,
    viewCalendar: true, manageCalendar: true, viewHealth: true, manageHealth: true,
    viewDocuments: true, manageDocuments: true, viewFamily: true, manageFamily: true,
    viewOperations: true, manageOperations: true, approveRequests: true,
    viewAI: true, manageAI: true, switchProfiles: true, viewAllProfiles: true,
  };
  const childPerms: MemberPermissions = {
    viewFinance: false, manageFinance: false, viewTasks: true, manageTasks: false,
    viewCalendar: true, manageCalendar: false, viewHealth: true, manageHealth: false,
    viewDocuments: false, manageDocuments: false, viewFamily: true, manageFamily: false,
    viewOperations: false, manageOperations: false, approveRequests: false,
    viewAI: true, manageAI: false, switchProfiles: false, viewAllProfiles: false,
  };
  const grandparentPerms: MemberPermissions = {
    viewFinance: false, manageFinance: false, viewTasks: true, manageTasks: false,
    viewCalendar: true, manageCalendar: false, viewHealth: true, manageHealth: false,
    viewDocuments: true, manageDocuments: false, viewFamily: true, manageFamily: false,
    viewOperations: false, manageOperations: false, approveRequests: false,
    viewAI: true, manageAI: false, switchProfiles: false, viewAllProfiles: false,
  };
  const caregiverPerms: MemberPermissions = {
    viewFinance: false, manageFinance: false, viewTasks: true, manageTasks: true,
    viewCalendar: true, manageCalendar: true, viewHealth: true, manageHealth: false,
    viewDocuments: false, manageDocuments: false, viewFamily: true, manageFamily: false,
    viewOperations: true, manageOperations: false, approveRequests: false,
    viewAI: false, manageAI: false, switchProfiles: false, viewAllProfiles: false,
  };
  switch (role) {
    case 'parent': case 'guardian': return full;
    case 'child': return childPerms;
    case 'grandparent': return grandparentPerms;
    case 'caregiver': return caregiverPerms;
    default: return childPerms;
  }
}

export interface Family {
  id: string;
  name: string;
  motto?: string;
  homeAddress?: string;
  timezone: string;
  currency: string;
  militaryMode: boolean;
  premiumTier: 'free' | 'premium' | 'pro' | 'enterprise';
  healthScore: number;
  createdAt: string;
}

// ===================== TASKS & EVENTS =====================

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Task {
  id: string;
  familyId: string;
  title: string;
  description?: string;
  assignedTo?: string[];
  dueDate?: string;
  dueTime?: string;
  priority: TaskPriority;
  status: TaskStatus;
  category: string;
  recurrence: RecurrenceType;
  points: number;
  completedAt?: string;
  completedBy?: string;
  createdAt: string;
  createdBy: string;
}

export interface CalendarEvent {
  id: string;
  familyId: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  location?: string;
  attendees: string[];
  color: string;
  category: string;
  recurrence: RecurrenceType;
  reminder?: number;
  createdAt: string;
  createdBy: string;
}

// ===================== FINANCE =====================

export type TransactionType = 'income' | 'expense' | 'transfer' | 'investment';
export type BillStatus = 'upcoming' | 'due_soon' | 'overdue' | 'paid';
export type AccountType = 'checking' | 'savings' | 'investment' | 'credit' | 'cash';

export interface Transaction {
  id: string;
  familyId: string;
  amount: number;
  type: TransactionType;
  category: string;
  subcategory?: string;
  description: string;
  date: string;
  accountId?: string;
  memberId?: string;
  isRecurring: boolean;
  receipt?: string;
  tags?: string[];
  createdAt: string;
}

export interface Budget {
  id: string;
  familyId: string;
  category: string;
  monthlyLimit: number;
  spent: number;
  month: string;
  color: string;
  icon: string;
}

export interface Bill {
  id: string;
  familyId: string;
  name: string;
  amount: number;
  dueDate: string;
  category: string;
  status: BillStatus;
  isAutoPay: boolean;
  isRecurring: boolean;
  recurrence: RecurrenceType;
  accountId?: string;
  notes?: string;
  icon?: string;
}

export interface Subscription {
  id: string;
  familyId: string;
  name: string;
  amount: number;
  billingCycle: 'monthly' | 'annual' | 'quarterly';
  nextBillingDate: string;
  category: string;
  isActive: boolean;
  sharedMembers: string[];
  notes?: string;
  icon?: string;
  color?: string;
}

export interface FinancialAccount {
  id: string;
  familyId: string;
  name: string;
  type: AccountType;
  balance: number;
  institution?: string;
  lastUpdated: string;
  isShared: boolean;
}

export interface FinancialGoal {
  id: string;
  familyId: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  deadline?: string;
  category: string;
  color: string;
  icon: string;
  notes?: string;
  isCompleted: boolean;
  createdAt: string;
}

// ===================== ASSETS & VEHICLES =====================

export interface Asset {
  id: string;
  familyId: string;
  name: string;
  category: string;
  value: number;
  purchaseDate?: string;
  purchasePrice?: number;
  location?: string;
  serialNumber?: string;
  warrantyExpiry?: string;
  notes?: string;
  images?: string[];
  createdAt: string;
}

export interface Vehicle {
  id: string;
  familyId: string;
  make: string;
  model: string;
  year: number;
  color?: string;
  licensePlate?: string;
  vin?: string;
  mileage?: number;
  fuelType?: string;
  insuranceExpiry?: string;
  registrationExpiry?: string;
  lastService?: string;
  nextService?: string;
  lastServiceMileage?: number;
  primaryDriver?: string;
  notes?: string;
  image?: string;
}

// ===================== HOME OPERATIONS =====================

export interface PantryItem {
  id: string;
  familyId: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiryDate?: string;
  barcode?: string;
  location?: string;
  minQuantity?: number;
  notes?: string;
  icon?: string;
  updatedAt: string;
}

export interface ShoppingItem {
  id: string;
  listId: string;
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
  estimatedPrice?: number;
  isChecked: boolean;
  addedBy: string;
}

export interface ShoppingList {
  id: string;
  familyId: string;
  name: string;
  items: ShoppingItem[];
  store?: string;
  totalBudget?: number;
  estimatedTotal?: number;
  isCompleted: boolean;
  createdAt: string;
  createdBy: string;
}

export interface MealPlan {
  id: string;
  familyId: string;
  weekStart: string;
  meals: {
    [day: string]: {
      breakfast?: Meal;
      lunch?: Meal;
      dinner?: Meal;
      snack?: Meal;
    };
  };
}

export interface Meal {
  id: string;
  name: string;
  servings: number;
  prepTime?: number;
  calories?: number;
  ingredients?: string[];
  recipe?: string;
  tags?: string[];
}

// ===================== DOCUMENTS =====================

export type DocumentCategory =
  | 'identity'
  | 'medical'
  | 'financial'
  | 'insurance'
  | 'legal'
  | 'education'
  | 'vehicle'
  | 'home'
  | 'military'
  | 'other';

export interface Document {
  id: string;
  familyId: string;
  memberId?: string;
  title: string;
  category: DocumentCategory;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  expiryDate?: string;
  issuedDate?: string;
  issuer?: string;
  notes?: string;
  tags?: string[];
  isShared: boolean;
  isSensitive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ===================== MEDICAL =====================

export interface MedicalInfo {
  bloodType?: string;
  allergies?: string[];
  medications?: Medication[];
  conditions?: string[];
  emergencyContact?: EmergencyContact;
  doctorName?: string;
  doctorPhone?: string;
  insuranceId?: string;
  insuranceProvider?: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  prescribedBy?: string;
  refillDate?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  address?: string;
}

// ===================== GOALS & REWARDS =====================

export type GoalCategory =
  | 'savings'
  | 'health'
  | 'education'
  | 'travel'
  | 'home'
  | 'career'
  | 'family'
  | 'fitness'
  | 'other';

export interface Goal {
  id: string;
  familyId: string;
  memberId?: string;
  title: string;
  description?: string;
  category: GoalCategory;
  targetDate?: string;
  milestones: Milestone[];
  isCompleted: boolean;
  completedAt?: string;
  color: string;
  icon: string;
  createdAt: string;
}

export interface Milestone {
  id: string;
  title: string;
  isCompleted: boolean;
  completedAt?: string;
  points: number;
}

export interface Reward {
  id: string;
  familyId: string;
  memberId: string;
  title: string;
  description?: string;
  pointsCost: number;
  category: string;
  isRedeemed: boolean;
  redeemedAt?: string;
  expiryDate?: string;
  icon?: string;
  color?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  points: number;
  unlockedAt?: string;
  isUnlocked: boolean;
  category: string;
}

// ===================== AI =====================

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  isLoading?: boolean;
  suggestions?: string[];
  pendingAction?: { type: string; payload: Record<string, unknown> };
}

export interface AIInsight {
  id: string;
  familyId: string;
  type: 'financial' | 'health' | 'task' | 'goal' | 'alert' | 'tip';
  title: string;
  summary: string;
  priority: 'low' | 'medium' | 'high';
  actionLabel?: string;
  actionRoute?: string;
  isRead: boolean;
  createdAt: string;
}

// ===================== NAVIGATION =====================

export type OnboardingStep =
  | 'splash'
  | 'welcome'
  | 'family_setup'
  | 'member_setup'
  | 'home_setup'
  | 'vehicle_setup'
  | 'financial_setup'
  | 'goals_setup'
  | 'complete';

// ===================== AI MEMORY ENGINE =====================

export type MemoryType = 'preference' | 'habit' | 'milestone' | 'insight' | 'conflict' | 'health';

export interface FamilyMemory {
  id: string;
  familyId: string;
  memberId?: string;
  type: MemoryType;
  title: string;
  content: string;
  tags: string[];
  isPinned: boolean;
  sentiment: 'positive' | 'neutral' | 'negative';
  createdAt: string;
  lastAccessed: string;
}

// ===================== LEGACY VAULT =====================

export type LegacyItemType = 'story' | 'photo' | 'letter' | 'video' | 'document' | 'milestone' | 'tradition' | 'recipe';

export interface LegacyItem {
  id: string;
  familyId: string;
  memberId?: string;
  type: LegacyItemType;
  title: string;
  content: string;
  date?: string;
  tags: string[];
  isPrivate: boolean;
  isFeatured: boolean;
  reactions: { memberId: string; emoji: string }[];
  createdAt: string;
}

// ===================== HEALTH HUB =====================

export type HealthMetricType = 'weight' | 'steps' | 'sleep' | 'water' | 'mood' | 'exercise' | 'bp' | 'glucose';

export interface HealthRecord {
  id: string;
  familyId: string;
  memberId: string;
  metric: HealthMetricType;
  value: number;
  unit: string;
  notes?: string;
  date: string;
}

export interface HealthGoal {
  id: string;
  memberId: string;
  metric: HealthMetricType;
  target: number;
  unit: string;
  current: number;
  deadline?: string;
}

// ===================== AUTOMATION ENGINE =====================

export type TriggerType = 'time' | 'location' | 'event' | 'condition' | 'manual';
export type ActionType = 'notify' | 'task' | 'message' | 'device' | 'reminder';

export interface AutomationRule {
  id: string;
  familyId: string;
  name: string;
  description: string;
  isActive: boolean;
  trigger: { type: TriggerType; value: string; condition?: string };
  action: { type: ActionType; value: string; target?: string };
  runCount: number;
  lastRun?: string;
  icon: string;
  color: string;
}

// ===================== FAMILY MARKETPLACE =====================

export type ListingCategory = 'chores' | 'skills' | 'items' | 'favors' | 'lessons';

export interface MarketplaceListing {
  id: string;
  familyId: string;
  createdBy: string;
  title: string;
  description: string;
  category: ListingCategory;
  pointsValue: number;
  isAvailable: boolean;
  claimedBy?: string;
  completedAt?: string;
  icon: string;
  tags: string[];
  createdAt: string;
}

// ===================== CONFLICT RESOLVER =====================

export type ConflictStatus = 'open' | 'in_mediation' | 'resolved' | 'escalated';

export interface ConflictRecord {
  id: string;
  familyId: string;
  title: string;
  description: string;
  partiesInvolved: string[];
  status: ConflictStatus;
  aiSuggestion?: string;
  resolution?: string;
  resolvedAt?: string;
  createdAt: string;
  severity: 'low' | 'medium' | 'high';
}

// ===================== TIME ECONOMY =====================

export type TimeBlockCategory = 'work' | 'family' | 'self-care' | 'chores' | 'sleep' | 'leisure' | 'school' | 'fitness';

export interface TimeBlock {
  id: string;
  familyId: string;
  memberId: string;
  category: TimeBlockCategory;
  title: string;
  startTime: string;
  endTime: string;
  date: string;
  isRecurring: boolean;
  color: string;
  points?: number;
}

// ===================== WEALTH BUILDER =====================

export type WealthCategory = 'stocks' | 'bonds' | 'real_estate' | 'crypto' | 'savings' | 'retirement' | 'business' | 'other';

export interface WealthEntry {
  id: string;
  familyId: string;
  name: string;
  category: WealthCategory;
  currentValue: number;
  costBasis: number;
  percentAllocation: number;
  annualReturn?: number;
  institution?: string;
  lastUpdated: string;
  notes?: string;
}

export interface WealthProjection {
  year: number;
  netWorth: number;
  contributions: number;
  returns: number;
}

// ===================== SMART HOME =====================

export type DeviceType = 'light' | 'thermostat' | 'lock' | 'camera' | 'speaker' | 'appliance' | 'sensor' | 'hub';

export interface SmartDevice {
  id: string;
  familyId: string;
  name: string;
  type: DeviceType;
  room: string;
  isOnline: boolean;
  isOn?: boolean;
  value?: number;
  unit?: string;
  battery?: number;
  brand?: string;
  lastSeen: string;
}

// ===================== REPUTATION SCORE =====================

export interface ReputationScore {
  memberId: string;
  overall: number;
  helpfulness: number;
  taskCompletion: number;
  teamwork: number;
  reliability: number;
  kindness: number;
  trend: 'up' | 'down' | 'stable';
  weeklyPoints: number;
}

// ===================== APP STATE =====================

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  biometricLock: boolean;
  currency: string;
  language: string;
  militaryMode: boolean;
  weekStartsOn: 0 | 1 | 6;
  displayName?: string;
  subscriptionTier?: string;
  // Device-local only (never synced) — when set, this physical device is
  // pinned to a single family member's profile and the profile switcher is
  // hidden, so e.g. a child can't switch into a parent's profile on their
  // own phone. See src/screens/family/ProfileSwitcherScreen.tsx.
  deviceLockedMemberId?: string | null;
}

// ===================== GUARDIAN / PARENTAL CONTROL =====================

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface ScheduledDowntime {
  id: string;
  label?: string;
  startTime: string;  // "HH:MM"
  endTime: string;    // "HH:MM"
  days: DayOfWeek[];
  isActive: boolean;
}

export interface ScreenTimeRule {
  id: string;
  familyId: string;
  memberId: string;
  label: string;
  dailyLimitMinutes: number;
  blockedApps: string[];
  allowedApps: string[];
  scheduledDowntime: ScheduledDowntime[];
  isActive: boolean;
  createdAt: string;
}

export type ChildDeviceStatus = 'online' | 'offline' | 'restricted' | 'school_mode' | 'bedtime';

export interface ChildDevice {
  id: string;
  familyId: string;
  memberId: string;
  deviceName: string;
  platform: 'ios' | 'android';
  status: ChildDeviceStatus;
  batteryLevel: number;
  lastSeen: string;
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  address?: string | null;
  location?: { lat: number; lng: number; accuracy?: number; address?: string; timestamp?: string } | null;
  locationAt?: string | null;
  appVersion?: string | null;
  osVersion?: string | null;
  pairingCode?: string | null;
  isPaired: boolean;
  fcmToken?: string | null;
  createdAt: string;
}

export type GeofenceAction = 'alert' | 'lock' | 'notify' | 'alert_entry' | 'alert_exit' | 'alert_both';

export interface GeofenceZone {
  id: string;
  familyId: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
  action: GeofenceAction;
  icon: string;
  color: string;
  isActive: boolean;
  linkedMembers: string[];
  createdAt: string;
}

export interface AppUsageEntry {
  id: string;
  deviceId: string;
  familyId: string;
  appName: string;
  packageName: string;
  usageMinutes: number;
  date: string;
  createdAt: string;
}

export interface SOSAlert {
  id: string;
  familyId: string;
  memberId: string;
  deviceId: string;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  location?: { lat: number; lng: number; address?: string } | null;
  message?: string | null;
  isResolved: boolean;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  createdAt: string;
}

export interface ParentApprovalRequest {
  id: string;
  familyId: string;
  memberId: string;
  type: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'denied';
  respondedAt?: string | null;
  respondedBy?: string | null;
  createdAt: string;
}

export interface GuardianCommand {
  id: string;
  familyId: string;
  deviceId: string;
  type: string;
  payload?: Record<string, unknown> | null;
  sentAt: string;
  executedAt?: string | null;
  status: 'pending' | 'executed' | 'failed';
}

export interface FamilyHealthScore {
  overall: number;
  financial: number;
  tasks: number;
  goals: number;
  health: number;
  communication: number;
  lastCalculated: string;
}

export interface PlaidTransaction {
  id: string;
  plaidTransactionId: string;
  plaidAccountId: string;
  amount: number;
  date: string;
  name: string;
  merchantName: string | null;
  category: string;
  pending: boolean;
  currencyCode: string;
}

export interface PlaidAccount {
  plaidAccountId: string;
  name: string;
  officialName: string | null;
  balance: number;
  accountType: 'checking' | 'savings' | 'credit' | 'investment' | string;
  currency: string;
  mask: string | null;
}

// ===================== DEBT MANAGEMENT =====================

export type DebtType = 'credit_card' | 'personal_loan' | 'mortgage' | 'student_loan' | 'auto_loan' | 'medical' | 'other';
export type PayoffStrategy = 'avalanche' | 'snowball';

export interface Debt {
  id: string;
  familyId: string;
  name: string;
  type: DebtType;
  balance: number;
  originalBalance: number;
  interestRate: number;       // APR as decimal e.g. 0.2199 for 21.99%
  minimumPayment: number;
  dueDate: number;            // day of month 1-31
  plaidAccountId?: string;
  plaidItemId?: string;
  lastPaymentDate?: string;   // YYYY-MM-DD
  lastPaymentAmount?: number;
  isAutoPay: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayoffPlanMonth {
  month: string;              // "2026-07"
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

export interface DebtPayoffPlan {
  debtId: string;
  debtName: string;
  strategy: PayoffStrategy;
  months: PayoffPlanMonth[];
  totalInterest: number;
  payoffDate: string;         // YYYY-MM
  monthsToPayoff: number;
}

export interface PayoffSummary {
  strategy: PayoffStrategy;
  totalMonths: number;
  payoffDate: string;
  totalInterestPaid: number;
  totalPaid: number;
  order: string[];            // debt names in payoff order
  monthlyBudget: number;
  plans: DebtPayoffPlan[];
}

export interface DetectedDebt {
  plaidAccountId: string;
  name: string;
  balance: number;
  mask: string | null;
  estimatedMinPayment: number;
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
}

export interface PaymentDetection {
  plaidTransactionId: string;
  date: string;
  amount: number;
  name: string;
  merchantName: string | null;
}
