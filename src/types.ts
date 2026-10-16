// Faculty-side types, copied from AttendanceApp/types/index.ts

export type UserRole = 'student' | 'faculty';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Subject {
  id: number;
  name: string;
  code: string;
  facultyId: number;
  type: 'theory' | 'practical';
  _count?: { enrollments: number };
}

/** A session the faculty started: the code to show and when the window closes */
export interface FacultySession {
  id: number;
  subjectId: number;
  subjectName?: string;
  correctCode: string;
  windowExpiry: string;
  serverTime: string;
  windowSeconds?: number;
  presentCount?: number;
}

export interface SessionEndedPayload {
  sessionId: string | number;
  subjectId: string | number;
}

export interface AttendanceCountPayload {
  sessionId: number;
  presentCount: number;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'INVALID';

/** One row of the roster returned when a session ends */
export interface SessionAttendance {
  studentId: number;
  status: AttendanceStatus;
  editedByFaculty?: boolean;
  student: { id: number; name: string | null; prn: string | null; rollNo: string | null };
}

export interface RecentSession {
  id: number;
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  subjectType: 'theory' | 'practical';
  startTime: string;
  endTime: string | null;
  presentCount: number;
  totalEnrolled: number;
}

export interface SessionStudentAttendance {
  id: number;
  name: string;
  prn: string | null;
  rollNo: string | null;
  status: AttendanceStatus;
  reason: string | null;
  editedByFaculty: boolean;
}

export interface SessionDetailsResponse {
  session: {
    id: number;
    date: string;
    subjectName: string;
    subjectCode: string;
    subjectType: 'theory' | 'practical';
  };
  students: SessionStudentAttendance[];
}

export interface EnrolledStudent {
  id: number;
  name: string | null;
  email: string;
  prn: string | null;
  rollNo: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface StudentAttendanceSummary {
  id: number;
  PRESENT: number;
  ABSENT: number;
  INVALID: number;
  totalSessions: number;
  attendancePercentage: string;
}

export interface SubjectAnalytics {
  totalSessions: number;
  summary: StudentAttendanceSummary[];
}

export interface SubjectSession {
  id: number;
  subjectId: number;
  isActive: boolean;
  startTime: string;
  endTime: string | null;
}
