import api from './api';
import type {
  Subject,
  RecentSession,
  SessionDetailsResponse,
  EnrolledStudent,
  SubjectAnalytics,
  SubjectSession,
  FacultySession,
  SessionAttendance,
  SubjectSummary,
} from '../types';

// ─── Subjects ─────────────────────────────────────────────────────────────────
export async function getMySubjects(): Promise<Subject[]> {
  const { data } = await api.get('/subjects/my');
  return Array.isArray(data) ? data : (data.subjects ?? []);
}

export async function createSubject(name: string, code: string, type: 'theory' | 'practical', span?: string): Promise<Subject> {
  const { data } = await api.post('/subjects', { name, code, type, span });
  return data.subject;
}

// Send only the fields that changed; an empty span clears the semester label
export async function updateSubject(
  subjectId: number,
  changes: { name?: string; code?: string; type?: 'theory' | 'practical'; span?: string }
): Promise<Subject> {
  const { data } = await api.put(`/subjects/${subjectId}`, changes);
  return data.subject;
}

// What a delete would remove: lectures, attendance records and students
export async function getSubjectSummary(subjectId: number): Promise<SubjectSummary> {
  const { data } = await api.get(`/subjects/${subjectId}/summary`);
  return data;
}

export async function deleteSubject(subjectId: number): Promise<void> {
  await api.delete(`/subjects/${subjectId}`);
}

// ─── Enrollments ──────────────────────────────────────────────────────────────
// Everyone who requested or joined the subject, whatever their status
export async function getSubjectEnrollments(subjectId: number): Promise<EnrolledStudent[]> {
  const { data } = await api.get(`/enrollments/${subjectId}`);
  return data.students ?? [];
}

export async function updateEnrollmentStatus(subjectId: number, studentId: number, status: 'APPROVED' | 'REJECTED') {
  const { data } = await api.put(`/enrollments/subject/${subjectId}/student/${studentId}/status`, { status });
  return data;
}

// Approves every pending request for the subject; returns how many were approved
export async function approveAllEnrollments(subjectId: number): Promise<number> {
  const { data } = await api.put(`/enrollments/subject/${subjectId}/approve-all`);
  return data.approved ?? 0;
}

// ─── Sessions ─────────────────────────────────────────────────────────────────
export async function startSession(params: {
  subjectId: number;
  date: string;
  startTime: string;
  endTime: string;
}): Promise<FacultySession> {
  const { data } = await api.post('/sessions/start', params);
  return data.session;
}

export async function endSession(sessionId: number): Promise<{ attendances?: SessionAttendance[] }> {
  const { data } = await api.post(`/sessions/${sessionId}/end`);
  return data;
}

// The session the faculty still has open, if any (to reopen it after a reload)
export async function getMyActiveSession(): Promise<{ active: boolean; session?: FacultySession }> {
  const { data } = await api.get('/sessions/my-active');
  return data;
}

// Fetches up to 100 so Reports can search older classes; the list itself shows the newest 10
export async function getRecentSessions(limit = 100): Promise<RecentSession[]> {
  const { data } = await api.get('/sessions/recent', { params: { limit } });
  return data.sessions ?? [];
}

// Every lecture taken for a subject, newest first
export async function getSubjectSessions(subjectId: number): Promise<SubjectSession[]> {
  const { data } = await api.get(`/sessions/${subjectId}/history`);
  return data.history ?? [];
}

// ─── Attendance ───────────────────────────────────────────────────────────────
export async function getSessionDetails(sessionId: number): Promise<SessionDetailsResponse> {
  const { data } = await api.get(`/attendance/session/${sessionId}`);
  return data;
}

export async function getSubjectAnalytics(subjectId: number): Promise<SubjectAnalytics> {
  const { data } = await api.get(`/attendance/subject/${subjectId}/analytics`);
  return data;
}

export async function editAttendanceRecord(sessionId: number, studentId: number, status: string, reason?: string) {
  const { data } = await api.put(`/attendance/session/${sessionId}/student/${studentId}`, { status, reason });
  return data;
}

// ─── Reports ──────────────────────────────────────────────────────────────────
/** Downloads a subject's attendance as an Excel file through the browser. */
export async function exportAttendanceData(subjectId: number, filters: { startDate?: string; endDate?: string }) {
  const params = new URLSearchParams();
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);

  const response = await api.get(`/analytics/export/${subjectId}?${params.toString()}`, { responseType: 'blob' });

  const disposition: string = response.headers['content-disposition'] ?? '';
  const fileName = /filename="?([^";]+)"?/i.exec(disposition)?.[1] ?? `attendance_${subjectId}.xlsx`;

  const blobUrl = URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Safari needs the URL alive for a moment after the click
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
}
