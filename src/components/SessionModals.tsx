import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation } from '@tanstack/react-query';
import { Users, StopCircle, BarChart2, CheckCircle2, XCircle, Hand } from 'lucide-react';
import { CountdownTimer } from './CountdownTimer';
import { Sheet } from './Sheet';
import { Avatar, Button, StatusPill } from './ui';
import { toast } from './Dialog';
import { useWakeLock } from '../hooks/useWakeLock';
import { editAttendanceRecord } from '../lib/attendance';
import { getErrorMessage } from '../lib/api';
import type { SessionAttendance } from '../types';

// Students get a short grace period for network delay, so the session is closed just after the countdown
const AUTO_END_DELAY_MS = 2500;

interface FacultySessionScreenProps {
  subjectName: string;
  correctCode: string;
  presentCount: number;
  /** Seconds the attendance window stays open (from the server) */
  duration: number;
  ending: boolean;
  onEndSession: () => void;
}

/** Full-screen code display while a session is live (FacultySessionModal in the app). */
export function FacultySessionScreen({
  subjectName,
  correctCode,
  presentCount,
  duration,
  ending,
  onEndSession,
}: FacultySessionScreenProps) {
  const [windowClosed, setWindowClosed] = useState(false);
  const onEndSessionRef = useRef(onEndSession);
  onEndSessionRef.current = onEndSession;

  // The code has to stay on screen for the whole window
  useWakeLock(true);

  // When the countdown finishes, end the session automatically and show the summary
  useEffect(() => {
    if (!windowClosed) return;
    const timer = setTimeout(() => onEndSessionRef.current(), AUTO_END_DELAY_MS);
    return () => clearTimeout(timer);
  }, [windowClosed]);

  const digits = String(correctCode).split('');
  const digitSize = digits.length <= 4 ? 52 : digits.length <= 6 ? 38 : 26;

  return createPortal(
    <div
      className="hero fixed inset-0 z-50 flex flex-col px-6 text-white overflow-y-auto"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 24px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
      }}
    >
      <div className="max-w-md w-full mx-auto flex-1 flex flex-col">
        {/* Which class, and whether the window is still open */}
        <div className="flex flex-col items-center">
          <span
            className={`flex items-center px-3 h-8 rounded-full text-[11px] font-bold tracking-widest ${
              windowClosed ? 'bg-white/10 text-white/70' : 'bg-success text-white'
            }`}
          >
            <span className={`w-2 h-2 rounded-full mr-2 ${windowClosed ? 'bg-white/50' : 'bg-white animate-pulse'}`} />
            {windowClosed ? 'WINDOW CLOSED' : 'LIVE SESSION'}
          </span>
          <h1 className="text-2xl font-extrabold text-center mt-3 line-clamp-2">{subjectName}</h1>
        </div>

        {/* The code students type, large enough to read from the back of the room */}
        <div className="flex-1 flex flex-col justify-center py-6">
          <div className="bg-white rounded-[32px] px-4 py-7 flex flex-col items-center shadow-glow">
            <p className="text-light-muted text-xs font-bold tracking-widest mb-4">STUDENT VERIFICATION CODE</p>
            <div className="flex justify-center self-stretch" aria-label={`Verification code ${digits.join(' ')}`}>
              {digits.map((digit, i) => (
                <div
                  key={i}
                  className="flex-1 mx-1 rounded-2xl bg-light-primaryBg flex items-center justify-center text-navy font-extrabold"
                  style={{ height: digitSize + 36, maxWidth: 72, fontSize: digitSize }}
                >
                  {digit}
                </div>
              ))}
            </div>
            <div className="flex items-center bg-success-bg text-success px-4 h-10 rounded-full mt-5 text-[15px] font-bold">
              <Users size={16} className="mr-2" />
              {presentCount} marked present
            </div>
          </div>

          <div className="flex flex-col items-center mt-8">
            <CountdownTimer duration={duration} onComplete={() => setWindowClosed(true)} />
            <p className="text-white/70 text-[13px] font-medium mt-4 text-center">
              {windowClosed ? 'Time is up. Preparing the lecture summary...' : 'Remaining time for submissions'}
            </p>
          </div>
        </div>

        <div>
          <p className="text-white/60 text-center text-[13px] leading-5 px-2">
            Show this code to your students. They have {duration} seconds to type it in the app. Compare the
            present count with the headcount in the room.
          </p>
          <Button
            title={windowClosed ? 'View Summary' : 'End Attendance Session'}
            onClick={onEndSession}
            loading={ending}
            variant={windowClosed ? 'primary' : 'dangerSoft'}
            icon={windowClosed ? BarChart2 : StopCircle}
            className="mt-5 w-full"
          />
        </div>
      </div>
    </div>,
    document.body
  );
}

interface AttendanceSummarySheetProps {
  sessionId: number | null;
  attendances: SessionAttendance[];
  onClose: () => void;
}

/** Roster shown right after a session ends; tap a status to correct it. */
export function AttendanceSummarySheet({ sessionId, attendances: initial, onClose }: AttendanceSummarySheetProps) {
  const [attendances, setAttendances] = useState(initial);
  useEffect(() => setAttendances(initial), [initial]);

  const { mutate: editStatus, isPending } = useMutation({
    mutationFn: ({ studentId, status }: { studentId: number; status: string }) =>
      editAttendanceRecord(sessionId!, studentId, status, 'Manually updated by faculty'),
    onSuccess: (_data, variables) => {
      setAttendances((prev) =>
        prev.map((a) =>
          a.studentId === variables.studentId
            ? { ...a, status: variables.status as SessionAttendance['status'], editedByFaculty: true }
            : a
        )
      );
    },
    onError: (err) => toast(getErrorMessage(err, 'Could not update attendance.'), 'error'),
  });

  const presentCount = attendances.filter((a) => a.status === 'PRESENT').length;
  const absentCount = attendances.filter((a) => a.status === 'ABSENT').length;

  return (
    <Sheet
      open={sessionId !== null}
      onClose={onClose}
      title="Lecture Summary"
      subtitle={`${attendances.length} ${attendances.length === 1 ? 'student' : 'students'} in this class`}
      tall
    >
      <div className="flex gap-3 mb-4 shrink-0">
        <SummaryTile icon={CheckCircle2} value={presentCount} label="PRESENT" tone="success" />
        <SummaryTile icon={XCircle} value={absentCount} label="ABSENT" tone="danger" />
      </div>

      <div className="bg-light-primaryBg text-primary rounded-2xl px-4 py-3 mb-2 flex items-center shrink-0">
        <Hand size={16} className="mr-2.5 shrink-0" />
        <p className="text-[13px] font-medium leading-[18px]">Tap the status next to any student to change it.</p>
      </div>

      <ul className="flex-1 overflow-y-auto min-h-0">
        {attendances.map((item) => (
          <li key={item.studentId} className="flex items-center py-3 border-b border-light-border">
            <Avatar name={item.student.name} size={40} />
            <div className="flex-1 mx-3 min-w-0">
              <p className="text-light-text text-[15px] font-bold truncate">{item.student.name}</p>
              <p className="text-light-muted text-xs font-medium mt-0.5">
                {item.student.prn || item.student.rollNo || item.student.id}
              </p>
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                editStatus({ studentId: item.studentId, status: item.status === 'PRESENT' ? 'ABSENT' : 'PRESENT' })
              }
              aria-label={`${item.student.name} is ${item.status}. Tap to change.`}
              className={isPending ? 'opacity-60' : ''}
            >
              <StatusPill status={item.status} edited={item.editedByFaculty} />
            </button>
          </li>
        ))}
      </ul>

      <Button title="Done" onClick={onClose} className="mt-4 w-full shrink-0" />
    </Sheet>
  );
}

function SummaryTile({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: typeof CheckCircle2;
  value: number;
  label: string;
  tone: 'success' | 'danger';
}) {
  const color = tone === 'success' ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger';
  return (
    <div className={`flex-1 rounded-2xl p-4 flex items-center ${color}`}>
      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center mr-3">
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-extrabold leading-none">{value}</p>
        <p className="text-[11px] font-bold tracking-widest mt-1">{label}</p>
      </div>
    </div>
  );
}
