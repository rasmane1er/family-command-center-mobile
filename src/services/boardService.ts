import { apiRequest } from '../api/client';
import type { BoardPost } from '../store/useFamilyBoardStore';

interface CreatePostInput extends Omit<BoardPost, 'familyId'> {}
interface UpdatePostInput extends Partial<Pick<BoardPost, 'isPinned' | 'reactions' | 'title' | 'content'>> {}

export function fetchPosts(): Promise<{ posts: BoardPost[] }> {
  return apiRequest('/board/posts');
}

export function createPost(post: CreatePostInput): Promise<{ post: BoardPost }> {
  return apiRequest('/board/posts', {
    method: 'POST',
    body: JSON.stringify(post),
  });
}

export function updatePost(id: string, updates: UpdatePostInput): Promise<{ post: BoardPost }> {
  return apiRequest(`/board/posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export function deletePost(id: string): Promise<void> {
  return apiRequest(`/board/posts/${id}`, { method: 'DELETE' });
}
