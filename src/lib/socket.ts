import { io, Socket } from 'socket.io-client';
import { SERVER_URL } from './api';
import type { SessionEndedPayload, AttendanceCountPayload } from '../types';

let socket: Socket | null = null;
// subjectId -> how many screens currently need that room
const joinedRooms = new Map<string, number>();

export function initSocket(token: string): Socket {
  if (socket) return socket;

  socket = io(SERVER_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 2000,
    timeout: 60000,
  });

  // Re-join every room after a reconnect (Safari drops sockets while the page sleeps)
  socket.on('connect', () => {
    joinedRooms.forEach((_count, subjectId) => socket?.emit('join_subject', { subjectId }));
  });

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
  joinedRooms.clear();
}

export function joinSubjectRoom(subjectId: string): void {
  const count = joinedRooms.get(subjectId) ?? 0;
  joinedRooms.set(subjectId, count + 1);
  if (count === 0 && socket?.connected) socket.emit('join_subject', { subjectId });
}

// Two screens can need the same room, so it is only left when the last one lets go
export function leaveSubjectRoom(subjectId: string): void {
  const count = joinedRooms.get(subjectId) ?? 0;
  if (count > 1) {
    joinedRooms.set(subjectId, count - 1);
    return;
  }
  joinedRooms.delete(subjectId);
  if (count === 1 && socket?.connected) socket.emit('leave_subject', { subjectId });
}

export function onSessionEnded(callback: (data: SessionEndedPayload) => void): () => void {
  socket?.on('session_ended', callback);
  return () => socket?.off('session_ended', callback);
}

export function onAttendanceCount(callback: (data: AttendanceCountPayload) => void): () => void {
  socket?.on('attendance_count', callback);
  return () => socket?.off('attendance_count', callback);
}
