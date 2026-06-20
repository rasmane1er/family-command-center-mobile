// ===================== FAMILY & MEMBERS =====================

export type MemberRole = 'parent' | 'child' | 'guardian' | 'grandparent' | 'caregiver';
export type MemberStatus = 'active' | 'away' | 'school' | 'work' | 'sleeping';

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
