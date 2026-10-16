import { useEffect, useRef } from 'react';
import { joinSubjectRoom, leaveSubjectRoom, onSessionEnded, onAttendanceCount } from '../lib/socket';
import type { SessionEndedPayload, AttendanceCountPayload } from '../types';
import { useAuthStore } from '../store/authStore';

interface UseSocketOptions {
  subjectIds?: string[];
  onSessionEnded?: (data: SessionEndedPayload) => void;
  onAttendanceCount?: (data: AttendanceCountPayload) => void;
}

export function useSocket(options: UseSocketOptions = {}): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Listeners are attached once but always call the latest handlers
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const subjectKey = (options.subjectIds ?? []).join(',');

  useEffect(() => {
    if (!isAuthenticated) return;
    const cleanups = [
      onSessionEnded((data) => optionsRef.current.onSessionEnded?.(data)),
      onAttendanceCount((data) => optionsRef.current.onAttendanceCount?.(data)),
    ];
    return () => cleanups.forEach((fn) => fn());
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !subjectKey) return;
    const subjectIds = subjectKey.split(',');
    subjectIds.forEach((id) => joinSubjectRoom(id));
    return () => subjectIds.forEach((id) => leaveSubjectRoom(id));
  }, [isAuthenticated, subjectKey]);
}
