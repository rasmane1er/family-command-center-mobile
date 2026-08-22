import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import { useFamilyStore } from './useFamilyStore';
import { useFinanceStore } from './useFinanceStore';
import { authBridge } from './authBridge';
import * as childcareService from '../services/childcareService';
import type { Caregiver, Booking, CaregiverType, DaycareEnrollment, CalendarEvent, Bill } from '../types';

export type { CaregiverType, Caregiver, Booking, DaycareEnrollment };

import { generateId } from '../utils/generateId';

function resolveFamilyId(): string {
  return useFamilyStore.getState().family?.id ?? authBridge.getSnapshot().familyId ?? '';
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

      addCaregiver: (c) => {
        const newCaregiver: Caregiver = { ...c, id: generateId(), familyId: resolveFamilyId(), totalHoursWorked: 0, totalPaid: 0 };
        set((s) => ({ caregivers: [...s.caregivers, newCaregiver] }));
        childcareService.createCaregiver(newCaregiver).catch(() => {
          set((s) => ({ caregivers: s.caregivers.filter((c2) => c2.id !== newCaregiver.id) }));
        });
      },

      deleteCaregiver: (id) => {
        const prevCaregivers = get().caregivers;
        const prevBookings = get().bookings;
        set((s) => ({
          caregivers: s.caregivers.filter((c) => c.id !== id),
          bookings: s.bookings.filter((b) => b.caregiverId !== id),
        }));
        childcareService.deleteCaregiverRemote(id).catch(() => {
          set({ caregivers: prevCaregivers, bookings: prevBookings });
        });
      },

      togglePreferred: (id) => {
        const prev = get().caregivers;
        const target = prev.find((c) => c.id === id);
        if (!target) return;
        const isPreferred = !target.isPreferred;
        set((s) => ({
          caregivers: s.caregivers.map((c) => (c.id === id ? { ...c, isPreferred } : c)),
        }));
        childcareService.updateCaregiverRemote(id, { isPreferred }).catch(() => { set({ caregivers: prev }); });
      },

      setDaycareEnrollment: (caregiverId, enrollment) => {
        const prev = get().caregivers;
        set((s) => ({
          caregivers: s.caregivers.map((c) =>
            c.id === caregiverId ? { ...c, enrollment } : c
          ),
        }));
        childcareService.updateCaregiverRemote(caregiverId, { enrollment }).catch(() => { set({ caregivers: prev }); });
      },

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
        childcareService.createBooking(booking).catch(() => {
          set((s) => ({ bookings: s.bookings.filter((b) => b.id !== booking.id) }));
        });
      },

      completeBooking: (id, amountPaid) => {
        const prevBookings = get().bookings;
        const prevCaregivers = get().caregivers;
        let billId: string | undefined;
        set((s) => {
          const booking = s.bookings.find((b) => b.id === id);
          if (!booking) return s;

          // Real Finance expense, tagged the same 'Childcare' category
          // TaxCenterScreen already looks for (Child & Dependent Care
          // Credit) — so completed bookings feed tax-deduction tracking and
          // monthly spend automatically instead of only updating a total
          // that lives nowhere outside this screen.
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
        });
        childcareService.updateBookingRemote(id, { status: 'completed', amountPaid, billId }).catch(() => {
          set({ bookings: prevBookings, caregivers: prevCaregivers });
        });
      },

      cancelBooking: (id) => {
        const prev = get().bookings;
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
        childcareService.updateBookingRemote(id, { status: 'cancelled' }).catch(() => { set({ bookings: prev }); });
      },

      fetchFromServer: async () => {
        try {
          const [{ caregivers }, { bookings }] = await Promise.all([
            childcareService.fetchCaregivers(),
            childcareService.fetchBookings(),
          ]);
          set({ caregivers, bookings, isLoaded: true });
        } catch {
          set({ isLoaded: true });
        }
      },
    }),
    {
      name: 'family-command-center-childcare',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
