import api from './api';
import type { LeaveRequest } from '../types';

// Faculty side of leave requests. Students apply in the mobile app.

/** A subject's requests, waiting ones first. */
export async function getSubjectLeaves(subjectId: number): Promise<{ leaves: LeaveRequest[]; pending: number }> {
  const { data } = await api.get(`/leaves/subject/${subjectId}`);
  return { leaves: data.leaves, pending: data.pending };
}

/** Approve or reject one request. Approving excuses the student's missed classes in the period. */
export async function reviewLeave(
  id: number,
  status: 'APPROVED' | 'REJECTED',
  note?: string
): Promise<{ leave: LeaveRequest; excused: number; restored: number }> {
  const { data } = await api.put(`/leaves/${id}/review`, { status, note });
  return { leave: data.leave, excused: data.excused ?? 0, restored: data.restored ?? 0 };
}

/** Approve every request still waiting in a subject. */
export async function approveAllLeaves(subjectId: number): Promise<{ approved: number; excused: number }> {
  const { data } = await api.put(`/leaves/subject/${subjectId}/approve-all`);
  return { approved: data.approved ?? 0, excused: data.excused ?? 0 };
}
