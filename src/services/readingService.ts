import { apiRequest } from '../api/client';
import type { Book, ReadingChallenge } from '../store/useReadingStore';

export function fetchBooks(): Promise<{ books: Book[] }> {
  return apiRequest('/reading/books');
}

export function createBook(book: Book): Promise<{ book: Book }> {
  return apiRequest('/reading/books', { method: 'POST', body: JSON.stringify(book) });
}

export function updateBookRemote(id: string, updates: Partial<Book>): Promise<{ book: Book }> {
  return apiRequest(`/reading/books/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteBookRemote(id: string): Promise<void> {
  return apiRequest(`/reading/books/${id}`, { method: 'DELETE' });
}

export function fetchReadingChallenges(): Promise<{ challenges: ReadingChallenge[] }> {
  return apiRequest('/reading/challenges');
}

export function saveReadingChallengeRemote(challenge: ReadingChallenge): Promise<{ challenge: ReadingChallenge }> {
  return apiRequest('/reading/challenges', { method: 'PUT', body: JSON.stringify(challenge) });
}
