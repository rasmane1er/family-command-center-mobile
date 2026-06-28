import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';

export interface JoinRequest {
  id: string;
  familyId: string;
  familyName: string;
  requesterName: string;
  requesterRole: 'parent' | 'child' | 'guardian' | 'grandparent' | 'caregiver';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface JoinRequestsState {
  requests: JoinRequest[];
  addRequest: (request: Omit<JoinRequest, 'id' | 'status' | 'createdAt'>) => void;
  approveRequest: (id: string) => void;
  rejectRequest: (id: string) => void;
  clearRequests: () => void;
  clearHistory: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useJoinRequestsStore = create<JoinRequestsState>()(
  persist(
    (set) => ({
      requests: [],

      addRequest: (request) =>
        set((state) => ({
          requests: [
            {
              ...request,
              id: generateId(),
              status: 'pending',
              createdAt: new Date().toISOString(),
            },
            ...state.requests,
          ],
        })),
        clearHistory: () =>
  set((state) => ({
    requests: state.requests.filter((request) => request.status === 'pending'),
  })),

      approveRequest: (id) =>
        set((state) => ({
          requests: state.requests.map((r) =>
            r.id === id ? { ...r, status: 'approved' } : r
          ),
        })),

      rejectRequest: (id) =>
        set((state) => ({
          requests: state.requests.map((r) =>
            r.id === id ? { ...r, status: 'rejected' } : r
          ),
        })),

      clearRequests: () => set({ requests: [] }),
    }),
    {
      name: 'join-requests-store',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        requests: state.requests,
      }),
    }
  )
);