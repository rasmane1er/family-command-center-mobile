import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '../storage/mmkvStorage';
import type {
  HouseholdConnection, ConnectionRelationshipType, ConnectPost, PostComment, PostReaction,
  CoParentAccessGrant, CoParentPermission, SharedChildFields, CalendarEvent,
} from '../types';
import * as connectService from '../services/connectService';

// apiRequest only throws a generic `API error {status}` (doesn't parse the
// server's real error text) — map the status codes this route actually
// returns to something a user can act on, rather than a raw "API error 409".
function friendlyRequestError(err: unknown): string {
  const msg = err instanceof Error ? err.message : '';
  if (msg.includes('404')) return 'No household found with that email.';
  if (msg.includes('409')) return 'A connection already exists with this household.';
  if (msg.includes('403')) return 'Unable to connect with this household.';
  if (msg.includes('400')) return "You can't connect with your own household.";
  return 'Could not send request. Check your connection and try again.';
}

interface ConnectState {
  connections: HouseholdConnection[];
  incomingRequests: HouseholdConnection[];
  outgoingRequests: HouseholdConnection[];
  isLoaded: boolean;
  isLoading: boolean;

  fetchFromServer: () => Promise<void>;
  sendConnectionRequest: (
    email: string,
    relationshipType?: ConnectionRelationshipType,
    message?: string
  ) => Promise<{ success: boolean; error?: string }>;
  acceptRequest: (id: string) => Promise<void>;
  acceptRequestLimited: (id: string) => Promise<void>;
  declineRequest: (id: string) => Promise<void>;
  removeConnection: (id: string) => Promise<void>;
  blockHousehold: (familyId: string) => Promise<void>;
  unblockHousehold: (familyId: string) => Promise<void>;

  // Feed (Phase 2) — deliberately NOT persisted (see partialize below); it's
  // refetched on demand, same reasoning as any other social-style feed in
  // this codebase that would otherwise go stale in local storage.
  feedPosts: ConnectPost[];
  feedNextCursor: string | null;
  isFeedLoading: boolean;
  postComments: Record<string, PostComment[]>;
  postReactions: Record<string, PostReaction[]>;

  fetchFeed: (reset?: boolean) => Promise<void>;
  createPost: (authorMemberId: string, text: string) => Promise<{ success: boolean; error?: string }>;
  deletePost: (id: string) => Promise<void>;
  loadPostComments: (postId: string) => Promise<void>;
  addComment: (postId: string, authorMemberId: string, text: string) => Promise<void>;
  toggleReaction: (postId: string, authorMemberId: string) => Promise<void>;
  reportPost: (postId: string, reporterMemberId: string, reason: string) => Promise<void>;

  // Co-parenting shared-child access — also not persisted; refetched on
  // demand like the feed, since it's cross-household state that can change
  // from the other side at any time.
  coParentGrants: CoParentAccessGrant[];
  sharedChildren: Record<string, SharedChildFields>;
  sharedCustodyEvents: CalendarEvent[];

  fetchCoParentGrants: () => Promise<void>;
  createCoParentGrant: (childMemberId: string, holderFamilyId: string, permission?: CoParentPermission) => Promise<{ success: boolean; error?: string }>;
  acceptCoParentGrant: (id: string) => Promise<void>;
  declineCoParentGrant: (id: string) => Promise<void>;
  revokeCoParentGrant: (id: string) => Promise<void>;
  loadGrantedChild: (grantId: string) => Promise<void>;
  updateGrantedChild: (grantId: string, updates: Partial<SharedChildFields>) => Promise<{ success: boolean; error?: string }>;
  fetchSharedCustodyEvents: () => Promise<void>;
}

export const useConnectStore = create<ConnectState>()(
  persist(
    (set, get) => ({
      connections: [],
      incomingRequests: [],
      outgoingRequests: [],
      isLoaded: false,
      isLoading: false,
      feedPosts: [],
      feedNextCursor: null,
      isFeedLoading: false,
      postComments: {},
      postReactions: {},
      coParentGrants: [],
      sharedChildren: {},
      sharedCustodyEvents: [],

      fetchFromServer: async () => {
        set({ isLoading: true });
        try {
          const [connectionsRes, incomingRes, outgoingRes] = await Promise.all([
            connectService.fetchConnections(),
            connectService.fetchIncomingRequests(),
            connectService.fetchOutgoingRequests(),
          ]);
          set({
            connections: connectionsRes.connections,
            incomingRequests: incomingRes.requests,
            outgoingRequests: outgoingRes.requests,
          });
        } catch {
          // offline/unreachable — keep whatever is already local.
        } finally {
          set({ isLoaded: true, isLoading: false });
        }
      },

      sendConnectionRequest: async (email, relationshipType, message) => {
        try {
          const { connection } = await connectService.sendConnectionRequest(email, relationshipType, message);
          set((s) => ({ outgoingRequests: [connection, ...s.outgoingRequests] }));
          return { success: true };
        } catch (err) {
          return { success: false, error: friendlyRequestError(err) };
        }
      },

      acceptRequest: async (id) => {
        const { connection } = await connectService.acceptConnectionRequest(id);
        set((s) => ({
          incomingRequests: s.incomingRequests.filter((r) => r.id !== id),
          connections: [connection, ...s.connections],
        }));
      },

      acceptRequestLimited: async (id) => {
        const { connection } = await connectService.acceptConnectionRequestLimited(id);
        set((s) => ({
          incomingRequests: s.incomingRequests.filter((r) => r.id !== id),
          connections: [connection, ...s.connections],
        }));
      },

      declineRequest: async (id) => {
        await connectService.declineConnectionRequest(id);
        set((s) => ({ incomingRequests: s.incomingRequests.filter((r) => r.id !== id) }));
      },

      removeConnection: async (id) => {
        const prev = get().connections;
        set((s) => ({ connections: s.connections.filter((c) => c.id !== id) }));
        try {
          await connectService.removeConnection(id);
        } catch {
          set({ connections: prev });
        }
      },

      blockHousehold: async (familyId) => {
        await connectService.blockHousehold(familyId);
        set((s) => ({
          connections: s.connections.filter(
            (c) => c.requesterFamilyId !== familyId && c.recipientFamilyId !== familyId
          ),
          incomingRequests: s.incomingRequests.filter((r) => r.requesterFamilyId !== familyId),
          outgoingRequests: s.outgoingRequests.filter((r) => r.recipientFamilyId !== familyId),
        }));
      },

      unblockHousehold: async (familyId) => {
        await connectService.unblockHousehold(familyId);
      },

      fetchFeed: async (reset = true) => {
        set({ isFeedLoading: true });
        try {
          const cursor = reset ? undefined : get().feedNextCursor ?? undefined;
          const { posts, nextCursor } = await connectService.fetchFeed(cursor);
          set((s) => ({
            feedPosts: reset ? posts : [...s.feedPosts, ...posts],
            feedNextCursor: nextCursor,
          }));
        } catch {
          // offline/unreachable — keep whatever is already loaded.
        } finally {
          set({ isFeedLoading: false });
        }
      },

      createPost: async (authorMemberId, text) => {
        try {
          const { post } = await connectService.createPost({ authorMemberId, text });
          set((s) => ({ feedPosts: [post, ...s.feedPosts] }));
          return { success: true };
        } catch {
          return { success: false, error: 'Could not post. Check your connection and try again.' };
        }
      },

      deletePost: async (id) => {
        const prev = get().feedPosts;
        set((s) => ({ feedPosts: s.feedPosts.filter((p) => p.id !== id) }));
        try {
          await connectService.deletePost(id);
        } catch {
          set({ feedPosts: prev });
        }
      },

      loadPostComments: async (postId) => {
        try {
          const { comments, reactions } = await connectService.fetchPostDetail(postId);
          set((s) => ({
            postComments: { ...s.postComments, [postId]: comments },
            postReactions: { ...s.postReactions, [postId]: reactions },
          }));
        } catch {
          // ignore — comment thread just won't expand this time.
        }
      },

      addComment: async (postId, authorMemberId, text) => {
        const { comment } = await connectService.addComment(postId, authorMemberId, text);
        set((s) => ({
          postComments: { ...s.postComments, [postId]: [...(s.postComments[postId] ?? []), comment] },
          feedPosts: s.feedPosts.map((p) =>
            p.id === postId && p._count ? { ...p, _count: { ...p._count, comments: p._count.comments + 1 } } : p
          ),
        }));
      },

      toggleReaction: async (postId, authorMemberId) => {
        const existing = (get().postReactions[postId] ?? []).find((r) => r.authorMemberId === authorMemberId);
        if (existing) {
          await connectService.removeReaction(postId, authorMemberId);
          set((s) => ({
            postReactions: { ...s.postReactions, [postId]: (s.postReactions[postId] ?? []).filter((r) => r.authorMemberId !== authorMemberId) },
            feedPosts: s.feedPosts.map((p) =>
              p.id === postId && p._count ? { ...p, _count: { ...p._count, reactions: Math.max(0, p._count.reactions - 1) } } : p
            ),
          }));
        } else {
          const { reaction } = await connectService.toggleReaction(postId, authorMemberId);
          set((s) => ({
            postReactions: { ...s.postReactions, [postId]: [...(s.postReactions[postId] ?? []), reaction] },
            feedPosts: s.feedPosts.map((p) =>
              p.id === postId && p._count ? { ...p, _count: { ...p._count, reactions: p._count.reactions + 1 } } : p
            ),
          }));
        }
      },

      reportPost: async (postId, reporterMemberId, reason) => {
        await connectService.reportPost(postId, reporterMemberId, reason);
      },

      fetchCoParentGrants: async () => {
        try {
          const { grants } = await connectService.fetchCoParentGrants();
          set({ coParentGrants: grants });
        } catch {
          // offline/unreachable — keep whatever is already loaded.
        }
      },

      createCoParentGrant: async (childMemberId, holderFamilyId, permission) => {
        try {
          const { grant } = await connectService.createCoParentGrant(childMemberId, holderFamilyId, permission);
          set((s) => ({ coParentGrants: [grant, ...s.coParentGrants] }));
          return { success: true };
        } catch (err) {
          const msg = err instanceof Error ? err.message : '';
          const error = msg.includes('403')
            ? 'You must be connected with this household first.'
            : msg.includes('409')
              ? 'A grant already exists for this household.'
              : 'Could not create the grant. Check your connection and try again.';
          return { success: false, error };
        }
      },

      acceptCoParentGrant: async (id) => {
        const { grant } = await connectService.acceptCoParentGrant(id);
        set((s) => ({ coParentGrants: s.coParentGrants.map((g) => (g.id === id ? grant : g)) }));
      },

      declineCoParentGrant: async (id) => {
        const { grant } = await connectService.declineCoParentGrant(id);
        set((s) => ({ coParentGrants: s.coParentGrants.map((g) => (g.id === id ? grant : g)) }));
      },

      revokeCoParentGrant: async (id) => {
        const prev = get().coParentGrants;
        set((s) => ({ coParentGrants: s.coParentGrants.filter((g) => g.id !== id) }));
        try {
          await connectService.revokeCoParentGrant(id);
        } catch {
          set({ coParentGrants: prev });
        }
      },

      loadGrantedChild: async (grantId) => {
        try {
          const { child } = await connectService.fetchGrantedChild(grantId);
          set((s) => ({ sharedChildren: { ...s.sharedChildren, [grantId]: child } }));
        } catch {
          // grant may have been revoked from the other side — just don't expand.
        }
      },

      updateGrantedChild: async (grantId, updates) => {
        try {
          const { child } = await connectService.updateGrantedChild(grantId, updates);
          set((s) => ({ sharedChildren: { ...s.sharedChildren, [grantId]: child } }));
          return { success: true };
        } catch (err) {
          const msg = err instanceof Error ? err.message : '';
          return { success: false, error: msg.includes('403') ? 'View-only access.' : 'Could not save changes.' };
        }
      },

      fetchSharedCustodyEvents: async () => {
        try {
          const { events } = await connectService.fetchSharedCustodyEvents();
          set({ sharedCustodyEvents: events });
        } catch {
          // offline/unreachable — keep whatever is already loaded.
        }
      },
    }),
    {
      name: 'family-command-center-connect',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        connections: state.connections,
        incomingRequests: state.incomingRequests,
        outgoingRequests: state.outgoingRequests,
      }),
    }
  )
);
