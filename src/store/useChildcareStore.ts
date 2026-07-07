import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import { useFamilyStore } from './useFamilyStore';
import { useFinanceStore } from './useFinanceStore';
import { useAuthStore } from './useAuthStore';
import type { Caregiver, Booking, CaregiverType, DaycareEnrollment, CalendarEvent, Bill } from '../types';

export type { CaregiverType, Caregiver, Booking, DaycareEnrollment };

const generateId = () => Math.random().toString(36).substring(2, 11);

function resolveFamilyId(): string {
  return useFamilyStore.getState().family?.id ?? useAuthStore.getState().familyId ?? '';
}

interface ChildcareState {
  caregivers: Caregiver[];
  bookings: Booking[];
  addCaregiver: (c: Omit<Caregiver, 'id' | 'familyId' | 'totalHoursWorked' | 'totalPaid'>) => void;
  deleteCaregiver: (id: string) => void;
  togglePreferred: (id: string) => void;
  setDaycareEnrollment: (caregiverId: string, enrollment: DaycareEnrollment | undefined) => void;

  addBooking: (b: Omit<Booking, 'id' | 'familyId' | 'billId' | 'eventId'>) => void;
  completeBooking: (id: string, amountPaid: number) => void;
  cancelBooking: (id: string) => void;

  isLoaded: boolean;
  fetchFromServer: () => Promise<void>;
}


export const useChildcareStore = create<ChildcareState>()(
  persist(
    (set, get) => ({
      caregivers: [],
      bookings: [],
      isLoaded: false,

      addCaregiver: (c) =>
        set((s) => ({
          caregivers: [
            ...s.caregivers,
            { ...c, id: generateId(), familyId: resolveFamilyId(), totalHoursWorked: 0, totalPaid: 0 },
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
        const familyId = resolveFamilyId();
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
            const familyId = booking.familyId || resolveFamilyId();
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

      fetchFromServer: async () => { set({ isLoaded: true }); },
    }),
    {
      name: 'family-command-center-childcare',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
