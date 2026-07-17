// Client-side optimistic ID for locally-created records before the backend
// assigns its real id (e.g. addMember reconciles this to the server id once
// the create request resolves). Not cryptographically unique — fine for a
// short-lived, single-device placeholder, not for anything persisted as a
// permanent identifier.
export const generateId = (): string => Math.random().toString(36).substring(2, 11);
