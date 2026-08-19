import { apiRequest } from '../api/client';
import type { Document } from '../types';

export function fetchDocuments(): Promise<{ documents: Document[] }> {
  return apiRequest('/documents');
}

export function createDocument(document: Document): Promise<{ document: Document }> {
  return apiRequest('/documents', { method: 'POST', body: JSON.stringify(document) });
}

export function updateDocumentRemote(id: string, updates: Partial<Document>): Promise<{ document: Document }> {
  return apiRequest(`/documents/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteDocumentRemote(id: string): Promise<void> {
  return apiRequest(`/documents/${id}`, { method: 'DELETE' });
}
