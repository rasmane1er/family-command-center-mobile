import { apiRequest } from '../api/client';
import type { SchoolSubject, SchoolAssignment, GradeEntry } from '../store/useSchoolStore';

export function fetchSubjects(): Promise<{ subjects: SchoolSubject[] }> {
  return apiRequest('/school/subjects');
}

export function createSubject(subject: SchoolSubject): Promise<{ subject: SchoolSubject }> {
  return apiRequest('/school/subjects', { method: 'POST', body: JSON.stringify(subject) });
}

export function deleteSubjectRemote(id: string): Promise<void> {
  return apiRequest(`/school/subjects/${id}`, { method: 'DELETE' });
}

export function createGradeEntryRemote(subjectId: string, grade: Omit<GradeEntry, 'id'>): Promise<{ gradeEntry: GradeEntry }> {
  return apiRequest(`/school/subjects/${subjectId}/grades`, { method: 'POST', body: JSON.stringify(grade) });
}

export function deleteGradeEntryRemote(subjectId: string, gradeId: string): Promise<void> {
  return apiRequest(`/school/subjects/${subjectId}/grades/${gradeId}`, { method: 'DELETE' });
}

export function fetchAssignments(): Promise<{ assignments: SchoolAssignment[] }> {
  return apiRequest('/school/assignments');
}

export function createAssignment(assignment: SchoolAssignment): Promise<{ assignment: SchoolAssignment }> {
  return apiRequest('/school/assignments', { method: 'POST', body: JSON.stringify(assignment) });
}

export function updateAssignmentRemote(id: string, updates: Partial<SchoolAssignment>): Promise<{ assignment: SchoolAssignment }> {
  return apiRequest(`/school/assignments/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deleteAssignmentRemote(id: string): Promise<void> {
  return apiRequest(`/school/assignments/${id}`, { method: 'DELETE' });
}
