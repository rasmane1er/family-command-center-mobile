import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import * as readingService from '../services/readingService';

const generateId = () => Math.random().toString(36).substring(2, 11);

export type ReadingStatus = 'want-to-read' | 'reading' | 'completed';

export interface Book {
  id: string;
  memberId: string;
  memberName: string;
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
  status: ReadingStatus;
  rating: number; // 1-5 stars, 0 if not rated
  genre: string;
  startDate?: string;
  finishDate?: string;
  notes: string;
  coverEmoji: string; // emoji to represent cover color/genre
  coverUrl?: string; // real cover image from book search — takes priority over coverEmoji when present
  createdAt: string;
}

export interface ReadingChallenge {
  id?: string;
  memberId: string;
  memberName: string;
  year: number;
  targetBooks: number;
}

interface ReadingState {
  books: Book[];
  challenges: ReadingChallenge[];
  isLoaded: boolean;
  addBook: (book: Omit<Book, 'id' | 'createdAt'>) => void;
  updateProgress: (id: string, currentPage: number) => void;
  completeBook: (id: string, rating: number) => void;
  removeBook: (id: string) => void;
  addChallenge: (challenge: Omit<ReadingChallenge, 'id'>) => void;
  getBooksForMember: (memberId: string) => Book[];
  getCompletedCount: (memberId: string, year: number) => number;
  getTotalPagesRead: (memberId: string) => number;
  fetchFromServer: () => Promise<void>;
}

export const useReadingStore = create<ReadingState>()(
  persist(
    (set, get) => ({
  // A fresh family's reading tracker starts empty — the screen already has
  // real "No Books Yet" / "Nobody Reading Right Now" / "No Challenges Yet"
  // empty states for this. Shipping the same hardcoded Harry Potter/Atomic
  // Habits demo library to every family regardless of what they actually
  // read was never real data, just a permanent fake default.
  books: [],
  challenges: [],
  isLoaded: false,

  addBook: (book) => {
    const newBook: Book = { ...book, id: generateId(), createdAt: new Date().toISOString() };
    set((s) => ({ books: [newBook, ...s.books] }));
    readingService.createBook(newBook).catch(() => {
      set((s) => ({ books: s.books.filter((b) => b.id !== newBook.id) }));
    });
  },

  updateProgress: (id, currentPage) => {
    const prev = get().books;
    set((s) => ({
      books: s.books.map((b) => (b.id === id ? { ...b, currentPage, status: 'reading' as ReadingStatus } : b)),
    }));
    readingService.updateBookRemote(id, { currentPage, status: 'reading' }).catch(() => { set({ books: prev }); });
  },

  completeBook: (id, rating) => {
    const prev = get().books;
    const finishDate = new Date().toISOString().split('T')[0];
    set((s) => ({
      books: s.books.map((b) =>
        b.id === id ? { ...b, status: 'completed' as ReadingStatus, currentPage: b.totalPages, rating, finishDate } : b
      ),
    }));
    const book = prev.find((b) => b.id === id);
    readingService
      .updateBookRemote(id, { status: 'completed', currentPage: book?.totalPages, rating, finishDate })
      .catch(() => { set({ books: prev }); });
  },

  removeBook: (id) => {
    const prev = get().books;
    set((s) => ({ books: s.books.filter((b) => b.id !== id) }));
    readingService.deleteBookRemote(id).catch(() => { set({ books: prev }); });
  },

  addChallenge: (challenge) => {
    const prev = get().challenges;
    set((s) => {
      const exists = s.challenges.find((c) => c.memberId === challenge.memberId && c.year === challenge.year);
      return {
        challenges: exists
          ? s.challenges.map((c) => (c.memberId === challenge.memberId && c.year === challenge.year ? { ...exists, ...challenge } : c))
          : [challenge, ...s.challenges],
      };
    });
    readingService.saveReadingChallengeRemote(challenge)
      .then(({ challenge: saved }) => {
        set((s) => ({
          challenges: s.challenges.map((c) => (c.memberId === saved.memberId && c.year === saved.year ? saved : c)),
        }));
      })
      .catch(() => { set({ challenges: prev }); });
  },

  getBooksForMember: (memberId) =>
    get().books.filter((b) => b.memberId === memberId),

  getCompletedCount: (memberId, year) =>
    get().books.filter(
      (b) =>
        b.memberId === memberId &&
        b.status === 'completed' &&
        b.finishDate?.startsWith(String(year))
    ).length,

  getTotalPagesRead: (memberId) =>
    get()
      .books.filter((b) => b.memberId === memberId)
      .reduce((acc, b) => acc + b.currentPage, 0),

  fetchFromServer: async () => {
    try {
      const [{ books }, { challenges }] = await Promise.all([
        readingService.fetchBooks(),
        readingService.fetchReadingChallenges(),
      ]);
      set({ books, challenges, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },
    }),
    {
      name: 'family-command-center-reading',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ books: state.books, challenges: state.challenges, isLoaded: state.isLoaded }),
    }
  )
);
