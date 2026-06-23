import { create } from 'zustand';

export type CaregiverType = 'babysitter' | 'nanny' | 'daycare' | 'relative' | 'au_pair' | 'other';

export interface Caregiver {
  id: string;
  familyId: string;
  name: string;
  type: CaregiverType;
  phone?: string;
  email?: string;
  hourlyRate?: number;
  rating: number; // 1-5
  certifications: string[];
  notes?: string;
  avatarColor: string;
  isPreferred: boolean;
  totalHoursWorked: number;
  totalPaid: number;
}

export interface Booking {
  id: string;
  caregiverId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // "6:00 PM"
  endTime: string; // "10:00 PM"
  hoursWorked: number;
  amountPaid?: number;
  notes?: string;
  status: 'upcoming' | 'completed' | 'cancelled';
}

interface ChildcareState {
  caregivers: Caregiver[];
  bookings: Booking[];
  addCaregiver: (c: Omit<Caregiver, 'id' | 'totalHoursWorked' | 'totalPaid'>) => void;
  deleteCaregiver: (id: string) => void;
  togglePreferred: (id: string) => void;
  addBooking: (b: Omit<Booking, 'id'>) => void;
  completeBooking: (id: string, amountPaid: number) => void;
  cancelBooking: (id: string) => void;
  seedDemoData: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useChildcareStore = create<ChildcareState>((set, get) => ({
  caregivers: [],
  bookings: [],

  addCaregiver: (c) =>
    set((s) => ({
      caregivers: [
        ...s.caregivers,
        { ...c, id: generateId(), totalHoursWorked: 0, totalPaid: 0 },
      ],
    })),

  deleteCaregiver: (id) =>
    set((s) => ({
      caregivers: s.caregivers.filter((c) => c.id !== id),
      bookings: s.bookings.filter((b) => b.caregiverId !== id),
    })),

  togglePreferred: (id) =>
    set((s) => ({
      caregivers: s.caregivers.map((c) =>
        c.id === id ? { ...c, isPreferred: !c.isPreferred } : c
      ),
    })),

  addBooking: (b) =>
    set((s) => ({ bookings: [...s.bookings, { ...b, id: generateId() }] })),

  completeBooking: (id, amountPaid) =>
    set((s) => {
      const booking = s.bookings.find((b) => b.id === id);
      if (!booking) return s;
      return {
        bookings: s.bookings.map((b) =>
          b.id === id ? { ...b, status: 'completed', amountPaid } : b
        ),
        caregivers: s.caregivers.map((c) =>
          c.id === booking.caregiverId
            ? {
                ...c,
                totalHoursWorked: c.totalHoursWorked + booking.hoursWorked,
                totalPaid: c.totalPaid + amountPaid,
              }
            : c
        ),
      };
    }),

  cancelBooking: (id) =>
    set((s) => ({
      bookings: s.bookings.map((b) =>
        b.id === id ? { ...b, status: 'cancelled' } : b
      ),
    })),

  seedDemoData: () => {
    const familyId = 'demo-family';
    const today = new Date();

    const dayOffset = (n: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + n);
      return d.toISOString().split('T')[0];
    };

    // Find upcoming Friday
    const daysToFriday = (5 - today.getDay() + 7) % 7 || 7;

    const caregiver1Id = 'caregiver-1';
    const caregiver2Id = 'caregiver-2';
    const caregiver3Id = 'caregiver-3';

    const caregivers: Caregiver[] = [
      {
        id: caregiver1Id,
        familyId,
        name: 'Emma Rodriguez',
        type: 'babysitter',
        phone: '+1 (555) 901-2345',
        email: 'emma.rodriguez@email.com',
        hourlyRate: 18,
        rating: 5,
        certifications: ['CPR', 'First Aid'],
        notes: 'Amazing with kids! Always on time and very reliable.',
        avatarColor: '#FF6B6B',
        isPreferred: true,
        totalHoursWorked: 24,
        totalPaid: 432,
      },
      {
        id: caregiver2Id,
        familyId,
        name: 'Mrs. Chen',
        type: 'relative',
        phone: '+1 (555) 234-5678',
        hourlyRate: 0,
        rating: 5,
        certifications: [],
        notes: 'Grandma! Kids love spending time with her.',
        avatarColor: '#4ECDC4',
        isPreferred: true,
        totalHoursWorked: 40,
        totalPaid: 0,
      },
      {
        id: caregiver3Id,
        familyId,
        name: 'Happy Kids Daycare',
        type: 'daycare',
        phone: '+1 (555) 456-7890',
        email: 'info@happykidsdaycare.com',
        hourlyRate: 45,
        rating: 4,
        certifications: ['Licensed Daycare', 'CPR', 'First Aid', 'State Certified'],
        notes: 'Open 7am-6pm Mon-Fri. Drop-in available.',
        avatarColor: '#F5A623',
        isPreferred: false,
        totalHoursWorked: 0,
        totalPaid: 0,
      },
    ];

    const bookings: Booking[] = [
      {
        id: generateId(),
        caregiverId: caregiver1Id,
        date: dayOffset(daysToFriday),
        startTime: '6:00 PM',
        endTime: '10:00 PM',
        hoursWorked: 4,
        notes: 'Date night. Kids fed by 6:30, bedtime 8:30.',
        status: 'upcoming',
      },
      {
        id: generateId(),
        caregiverId: caregiver1Id,
        date: dayOffset(-14),
        startTime: '7:00 PM',
        endTime: '11:00 PM',
        hoursWorked: 4,
        amountPaid: 72,
        notes: 'Anniversary dinner.',
        status: 'completed',
      },
      {
        id: generateId(),
        caregiverId: caregiver2Id,
        date: dayOffset(-7),
        startTime: '9:00 AM',
        endTime: '5:00 PM',
        hoursWorked: 8,
        amountPaid: 0,
        notes: 'Grandma watched kids while we were at the conference.',
        status: 'completed',
      },
    ];

    set({ caregivers, bookings });
  },
}));
