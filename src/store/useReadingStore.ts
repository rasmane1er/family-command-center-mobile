import { create } from 'zustand';

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
  createdAt: string;
}

export interface ReadingChallenge {
  id: string;
  memberId: string;
  memberName: string;
  year: number;
  targetBooks: number;
}

interface ReadingState {
  books: Book[];
  challenges: ReadingChallenge[];
  addBook: (book: Omit<Book, 'id' | 'createdAt'>) => void;
  updateProgress: (id: string, currentPage: number) => void;
  completeBook: (id: string, rating: number) => void;
  removeBook: (id: string) => void;
  addChallenge: (challenge: Omit<ReadingChallenge, 'id'>) => void;
  getBooksForMember: (memberId: string) => Book[];
  getCompletedCount: (memberId: string, year: number) => number;
  getTotalPagesRead: (memberId: string) => number;
}

const _now = new Date().toISOString();
const _today = new Date().toISOString().split('T')[0];

const seedBooks: Book[] = [
  {
    id: 'bk1',
    memberId: 'member-3',
    memberName: 'Emma',
    title: 'Harry Potter and the Sorcerer\'s Stone',
    author: 'J.K. Rowling',
    totalPages: 309,
    currentPage: 309,
    status: 'completed',
    rating: 5,
    genre: 'Fantasy',
    startDate: '2025-05-01',
    finishDate: '2025-05-20',
    notes: 'Amazing! I love Hermione.',
    coverEmoji: '🔵',
    createdAt: _now,
  },
  {
    id: 'bk2',
    memberId: 'member-3',
    memberName: 'Emma',
    title: 'Harry Potter and the Chamber of Secrets',
    author: 'J.K. Rowling',
    totalPages: 341,
    currentPage: 178,
    status: 'reading',
    rating: 0,
    genre: 'Fantasy',
    startDate: _today,
    notes: 'Getting scary but so good!',
    coverEmoji: '🟢',
    createdAt: _now,
  },
  {
    id: 'bk3',
    memberId: 'member-3',
    memberName: 'Emma',
    title: 'The Giver',
    author: 'Lois Lowry',
    totalPages: 179,
    currentPage: 0,
    status: 'want-to-read',
    rating: 0,
    genre: 'Science Fiction',
    notes: 'Teacher recommended',
    coverEmoji: '📚',
    createdAt: _now,
  },
  {
    id: 'bk4',
    memberId: 'member-4',
    memberName: 'Liam',
    title: 'Diary of a Wimpy Kid',
    author: 'Jeff Kinney',
    totalPages: 217,
    currentPage: 217,
    status: 'completed',
    rating: 4,
    genre: 'Humor',
    startDate: '2025-06-01',
    finishDate: '2025-06-15',
    notes: 'So funny, Greg is hilarious',
    coverEmoji: '🟡',
    createdAt: _now,
  },
  {
    id: 'bk5',
    memberId: 'member-4',
    memberName: 'Liam',
    title: 'Captain Underpants',
    author: 'Dav Pilkey',
    totalPages: 176,
    currentPage: 90,
    status: 'reading',
    rating: 0,
    genre: 'Humor',
    startDate: _today,
    notes: '',
    coverEmoji: '🔴',
    createdAt: _now,
  },
  {
    id: 'bk6',
    memberId: 'member-4',
    memberName: 'Liam',
    title: 'Charlotte\'s Web',
    author: 'E.B. White',
    totalPages: 184,
    currentPage: 0,
    status: 'want-to-read',
    rating: 0,
    genre: 'Classic',
    notes: 'Summer reading list',
    coverEmoji: '📚',
    createdAt: _now,
  },
  {
    id: 'bk7',
    memberId: 'member-2',
    memberName: 'Mom',
    title: 'Atomic Habits',
    author: 'James Clear',
    totalPages: 320,
    currentPage: 320,
    status: 'completed',
    rating: 5,
    genre: 'Self-Help',
    startDate: '2025-04-01',
    finishDate: '2025-04-28',
    notes: 'Life-changing! Applying the 1% rule.',
    coverEmoji: '🟢',
    createdAt: _now,
  },
  {
    id: 'bk8',
    memberId: 'member-2',
    memberName: 'Mom',
    title: 'The Seven Husbands of Evelyn Hugo',
    author: 'Taylor Jenkins Reid',
    totalPages: 400,
    currentPage: 215,
    status: 'reading',
    rating: 0,
    genre: 'Fiction',
    startDate: _today,
    notes: 'Can\'t put it down!',
    coverEmoji: '🔴',
    createdAt: _now,
  },
];

const seedChallenges: ReadingChallenge[] = [
  { id: 'rc1', memberId: 'member-3', memberName: 'Emma', year: 2025, targetBooks: 24 },
  { id: 'rc2', memberId: 'member-4', memberName: 'Liam', year: 2025, targetBooks: 20 },
  { id: 'rc3', memberId: 'member-2', memberName: 'Mom', year: 2025, targetBooks: 15 },
];

export const useReadingStore = create<ReadingState>()((set, get) => ({
  books: seedBooks,
  challenges: seedChallenges,

  addBook: (book) =>
    set((s) => ({
      books: [{ ...book, id: generateId(), createdAt: new Date().toISOString() }, ...s.books],
    })),

  updateProgress: (id, currentPage) =>
    set((s) => ({
      books: s.books.map((b) =>
        b.id === id ? { ...b, currentPage, status: 'reading' as ReadingStatus } : b
      ),
    })),

  completeBook: (id, rating) =>
    set((s) => ({
      books: s.books.map((b) =>
        b.id === id
          ? {
              ...b,
              status: 'completed' as ReadingStatus,
              currentPage: b.totalPages,
              rating,
              finishDate: new Date().toISOString().split('T')[0],
            }
          : b
      ),
    })),

  removeBook: (id) =>
    set((s) => ({ books: s.books.filter((b) => b.id !== id) })),

  addChallenge: (challenge) =>
    set((s) => ({
      challenges: [{ ...challenge, id: generateId() }, ...s.challenges],
    })),

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
}));
