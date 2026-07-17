import { apiRequest } from '../api/client';
import type {
  HouseholdConnection, ConnectionRelationshipType, ConnectPost, PostComment, PostReaction, PostType, PostAudienceType,
  CoParentAccessGrant, CoParentPermission, SharedChildFields, CalendarEvent,
} from '../types';

export function sendConnectionRequest(
  recipientEmail: string,
  relationshipType?: ConnectionRelationshipType,
  message?: string
): Promise<{ connection: HouseholdConnection }> {
  return apiRequest('/connect/requests', {
    method: 'POST',
    body: JSON.stringify({ recipientEmail, relationshipType, message }),
  });
}

export function fetchIncomingRequests(): Promise<{ requests: HouseholdConnection[] }> {
  return apiRequest('/connect/requests/incoming');
}

export function fetchOutgoingRequests(): Promise<{ requests: HouseholdConnection[] }> {
  return apiRequest('/connect/requests/outgoing');
}

export function fetchConnections(): Promise<{ connections: HouseholdConnection[] }> {
  return apiRequest('/connect/connections');
}

export function acceptConnectionRequest(id: string): Promise<{ connection: HouseholdConnection }> {
  return apiRequest(`/connect/requests/${id}/accept`, { method: 'PATCH' });
}

export function acceptConnectionRequestLimited(id: string): Promise<{ connection: HouseholdConnection }> {
  return apiRequest(`/connect/requests/${id}/accept-limited`, { method: 'PATCH' });
}

export function declineConnectionRequest(id: string): Promise<{ connection: HouseholdConnection }> {
  return apiRequest(`/connect/requests/${id}/decline`, { method: 'PATCH' });
}

export function removeConnection(id: string): Promise<void> {
  return apiRequest(`/connect/connections/${id}`, { method: 'DELETE' });
}

export function blockHousehold(familyId: string): Promise<void> {
  return apiRequest(`/connect/households/${familyId}/block`, { method: 'POST' });
}

export function unblockHousehold(familyId: string): Promise<void> {
  return apiRequest(`/connect/households/${familyId}/block`, { method: 'DELETE' });
}

// ─── Family Connect Phase 2: feed ───────────────────────────────────────────

export function createPost(params: {
  authorMemberId: string;
  text?: string;
  type?: PostType;
  audienceType?: PostAudienceType;
  audienceFamilyIds?: string[];
}): Promise<{ post: ConnectPost }> {
  return apiRequest('/connect/posts', { method: 'POST', body: JSON.stringify(params) });
}

export function fetchFeed(cursor?: string): Promise<{ posts: ConnectPost[]; nextCursor: string | null }> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return apiRequest(`/connect/feed${query}`);
}

export function fetchPostDetail(id: string): Promise<{ post: ConnectPost; comments: PostComment[]; reactions: PostReaction[] }> {
  return apiRequest(`/connect/posts/${id}`);
}

export function deletePost(id: string): Promise<void> {
  return apiRequest(`/connect/posts/${id}`, { method: 'DELETE' });
}

export function addComment(postId: string, authorMemberId: string, text: string): Promise<{ comment: PostComment }> {
  return apiRequest(`/connect/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ authorMemberId, text }) });
}

export function toggleReaction(postId: string, authorMemberId: string, type = 'like'): Promise<{ reaction: PostReaction }> {
  return apiRequest(`/connect/posts/${postId}/reactions`, { method: 'POST', body: JSON.stringify({ authorMemberId, type }) });
}

export function removeReaction(postId: string, authorMemberId: string): Promise<void> {
  return apiRequest(`/connect/posts/${postId}/reactions/${authorMemberId}`, { method: 'DELETE' });
}

export function reportPost(postId: string, reporterMemberId: string, reason: string, description?: string): Promise<void> {
  return apiRequest(`/connect/posts/${postId}/report`, { method: 'POST', body: JSON.stringify({ reporterMemberId, reason, description }) });
}

// ─── Co-parenting shared-child access ───────────────────────────────────────

export function createCoParentGrant(
  childMemberId: string,
  holderFamilyId: string,
  permission?: CoParentPermission
): Promise<{ grant: CoParentAccessGrant }> {
  return apiRequest('/connect/coparent/grants', { method: 'POST', body: JSON.stringify({ childMemberId, holderFamilyId, permission }) });
}

export function fetchCoParentGrants(): Promise<{ grants: CoParentAccessGrant[] }> {
  return apiRequest('/connect/coparent/grants');
}

export function acceptCoParentGrant(id: string): Promise<{ grant: CoParentAccessGrant }> {
  return apiRequest(`/connect/coparent/grants/${id}/accept`, { method: 'PATCH' });
}

export function declineCoParentGrant(id: string): Promise<{ grant: CoParentAccessGrant }> {
  return apiRequest(`/connect/coparent/grants/${id}/decline`, { method: 'PATCH' });
}

export function revokeCoParentGrant(id: string): Promise<void> {
  return apiRequest(`/connect/coparent/grants/${id}`, { method: 'DELETE' });
}

export function fetchGrantedChild(grantId: string): Promise<{ child: SharedChildFields }> {
  return apiRequest(`/connect/coparent/grants/${grantId}/child`);
}

export function updateGrantedChild(grantId: string, updates: Partial<SharedChildFields>): Promise<{ child: SharedChildFields }> {
  return apiRequest(`/connect/coparent/grants/${grantId}/child`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function fetchSharedCustodyEvents(): Promise<{ events: CalendarEvent[] }> {
  return apiRequest('/connect/coparent/shared-events');
}
