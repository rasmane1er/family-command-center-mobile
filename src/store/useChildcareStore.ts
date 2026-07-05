import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import { useFamilyStore } from './useFamilyStore';
import { useFinanceStore } from './useFinanceStore';
import type { Caregiver, Booking, CaregiverType, DaycareEnrollment, CalendarEvent, Bill } from '../types';

export type { CaregiverType, Caregiver, Booking, DaycareEnrollment };

const generateId = () => Math.random().toString(36).substring(2, 11);

function resolveFamilyId(fallback: string): string {
  return useFamilyStore.getState().family?.id ?? fallback;
}

interface ChildcareState {
  caregivers: Caregiver[];
  bookings: Booking[];
  // Persisted so demo data seeds exactly once, ever — not "whenever the
  // list happens to be empty," which used to make deleted demo caregivers
  // silently reappear the next time the screen opened.
  hasSeeded: boolean;

  addCaregiver: (c: Omit<Caregiver, 'id' | 'familyId' | 'totalHoursWorked' | 'totalPaid'>) => void;
  deleteCaregiver: (id: string) => void;
  togglePreferred: (id: string) => void;
  setDaycareEnrollment: (caregiverId: string, enrollment: DaycareEnrollment | undefined) => void;

  addBooking: (b: Omit<Booking, 'id' | 'familyId' | 'billId' | 'eventId'>) => void;
  completeBooking: (id: string, amountPaid: number) => void;
  cancelBooking: (id: string) => void;

  seedDemoData: () => void;
}


export const useChildcareStore = create<ChildcareState>()(
  persist(
    (set, get) => ({
      caregivers: [],
      bookings: [],
      hasSeeded: false,

      addCaregiver: (c) =>
        set((s) => ({
          caregivers: [
            ...s.caregivers,
            { ...c, id: generateId(), familyId: resolveFamilyId('demo-family'), totalHoursWorked: 0, totalPaid: 0 },
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

      setDaycareEnrollment: (caregiverId, enrollment) =>
        set((s) => ({
          caregivers: s.caregivers.map((c) =>
            c.id === caregiverId ? { ...c, enrollment } : c
          ),
        })),

      addBooking: (b) => {
        const familyId = resolveFamilyId('demo-family');
        const id = generateId();
        const booking: Booking = { ...b, id, familyId };

        // Real calendar event, not a separate "childcare calendar" — the
        // same Calendar screen everyone already uses will show this, so the
        // rest of the family can see who's watching the kids and when.
        const caregiver = get().caregivers.find((c) => c.id === b.caregiverId);
        const now = new Date().toISOString();
        const event: CalendarEvent = {
          id: generateId(),
          familyId,
          title: `${caregiver?.name ?? 'Caregiver'} — childcare`,
          description: b.notes,
          startDate: b.date,
          endDate: b.date,
          allDay: false,
          attendees: b.childIds ?? [],
          color: '#EF6C00',
          category: 'Childcare',
          recurrence: 'none',
          createdAt: now,
          createdBy: caregiver?.id ?? 'user',
        };
        useFamilyStore.getState().addEvent(event);
        booking.eventId = event.id;

        set((s) => ({ bookings: [...s.bookings, booking] }));
      },

      completeBooking: (id, amountPaid) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.id === id);
          if (!booking) return s;

          // Real Finance expense, tagged the same 'Childcare' category
          // TaxCenterScreen already looks for (Child & Dependent Care
          // Credit) — so completed bookings feed tax-deduction tracking and
          // monthly spend automatically instead of only updating a total
          // that lives nowhere outside this screen.
          let billId: string | undefined;
          if (amountPaid > 0) {
            const familyId = resolveFamilyId(booking.familyId);
            const caregiver = s.caregivers.find((c) => c.id === booking.caregiverId);
            billId = generateId();
            const bill: Bill = {
              id: billId,
              familyId,
              name: `Childcare — ${caregiver?.name ?? 'Caregiver'}`,
              amount: amountPaid,
              dueDate: booking.date,
              category: 'Childcare',
              status: 'paid',
              isAutoPay: false,
              isRecurring: false,
              recurrence: 'none',
              notes: booking.notes,
            };
            useFinanceStore.getState().addBill(bill);
          }

          return {
            bookings: s.bookings.map((b) =>
              b.id === id ? { ...b, status: 'completed', amountPaid, billId } : b
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

      cancelBooking: (id) => {
        const booking = get().bookings.find((b) => b.id === id);
        // Clean up the calendar event a cancelled booking created —
        // otherwise a ghost "childcare" entry lingers on the shared family
        // calendar for a booking that's no longer happening.
        if (booking?.eventId) {
          useFamilyStore.getState().deleteEvent(booking.eventId);
        }
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.id === id ? { ...b, status: 'cancelled' } : b
          ),
        }));
      },

      seedDemoData: () => {
        const familyId = resolveFamilyId('demo-family');
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

        const children = useFamilyStore.getState().members.filter((m) => m.role === 'child');
        const demoChildIds = children.length > 0 ? children.map((c) => c.id) : undefined;

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
            enrollment: demoChildIds
              ? {
                  weeklySchedule: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                  startTime: '7:30 AM',
                  endTime: '5:30 PM',
                  monthlyTuition: 950,
                  enrolledSince: dayOffset(-60),
                }
              : undefined,
          },
        ];

        const bookings: Booking[] = [
          {
            id: generateId(),
            familyId,
            caregiverId: caregiver1Id,
            childIds: demoChildIds,
            date: dayOffset(daysToFriday),
            startTime: '6:00 PM',
            endTime: '10:00 PM',
            hoursWorked: 4,
            notes: 'Date night. Kids fed by 6:30, bedtime 8:30.',
            status: 'upcoming',
          },
          {
            id: generateId(),
            familyId,
            caregiverId: caregiver1Id,
            childIds: demoChildIds,
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
            familyId,
            caregiverId: caregiver2Id,
            childIds: demoChildIds,
            date: dayOffset(-7),
            startTime: '9:00 AM',
            endTime: '5:00 PM',
            hoursWorked: 8,
            amountPaid: 0,
            notes: 'Grandma watched kids while we were at the conference.',
            status: 'completed',
          },
        ];

        set({ caregivers, bookings, hasSeeded: true });
      },
    }),
    {
      name: 'family-command-center-childcare',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
