import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Trash2,
  Loader2,
  Search,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Mail,
  IdCard,
  List,
  UserMinus,
  X,
  Check,
  CloudOff,
  Calendar,
  Users,
} from 'lucide-react';
import {
  getMySubjects,
  getSubjectEnrollments,
  getSubjectAnalytics,
  getSubjectSessions,
  updateEnrollmentStatus,
  deleteSubject,
} from '../lib/attendance';
import { getErrorMessage } from '../lib/api';
import { MIN_ATTENDANCE_PERCENT } from '../theme';
import type { Subject, EnrolledStudent, StudentAttendanceSummary, SubjectSession } from '../types';
import { ScreenHeader } from '../components/Layout';
import { Avatar, Button, Card, Chip, EmptyState, ProgressRing, SectionLabel, SegmentedControl, Spinner } from '../components/ui';
import { confirmDialog, toast } from '../components/Dialog';

type Tab = 'students' | 'requests' | 'lectures';

/** Faculty's page for one subject: who is enrolled, who is waiting, and past lectures. */
export default function SubjectPage() {
  const { id } = useParams();
  const subjectId = Number(id);
  const { data: subjects = [], isLoading } = useQuery({ queryKey: ['subjects'], queryFn: getMySubjects });
  const subject = subjects.find((s) => s.id === subjectId);

  if (!subject) {
    return (
      <div>
        <ScreenHeader title="Subject" back />
        {isLoading ? <Spinner className="pt-20" /> : <EmptyState icon={AlertCircle} text="This subject is no longer available." />}
      </div>
    );
  }
  return <SubjectView subject={subject} />;
}

function SubjectView({ subject }: { subject: Subject }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const subjectId = subject.id;

  const [tab, setTab] = useState<Tab>('students');
  const [search, setSearch] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const enrollments = useQuery({ queryKey: ['enrollments', subjectId], queryFn: () => getSubjectEnrollments(subjectId) });
  const analytics = useQuery({ queryKey: ['subject-analytics', subjectId], queryFn: () => getSubjectAnalytics(subjectId) });
  const sessions = useQuery({
    queryKey: ['subject-sessions', subjectId],
    queryFn: () => getSubjectSessions(subjectId),
    enabled: tab === 'lectures',
  });

  const students = enrollments.data ?? [];
  const approved = useMemo(() => students.filter((s) => s.status === 'APPROVED'), [students]);
  const pending = useMemo(() => students.filter((s) => s.status === 'PENDING'), [students]);
  const removed = useMemo(() => students.filter((s) => s.status === 'REJECTED'), [students]);

  // Attendance so far, per student. Students with no records yet are simply absent from this map.
  const summaryByStudent = useMemo(() => {
    const map = new Map<number, StudentAttendanceSummary>();
    for (const row of analytics.data?.summary ?? []) map.set(Number(row.id), row);
    return map;
  }, [analytics.data]);

  const percentOf = (studentId: number): number | null => {
    const row = summaryByStudent.get(studentId);
    if (!row || row.totalSessions === 0) return null;
    return Math.round((row.PRESENT / row.totalSessions) * 100);
  };

  const lowCount = approved.filter((s) => {
    const p = percentOf(s.id);
    return p !== null && p < MIN_ATTENDANCE_PERCENT;
  }).length;

  const { mutate: setStatus, isPending: isUpdating } = useMutation({
    mutationFn: ({ studentId, status }: { studentId: number; status: 'APPROVED' | 'REJECTED' }) =>
      updateEnrollmentStatus(subjectId, studentId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments', subjectId] });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['recent-sessions'] });
    },
    onError: (err) => toast(getErrorMessage(err, 'Could not update. Please try again.'), 'error'),
  });

  const confirmRemove = async (student: EnrolledStudent) => {
    const ok = await confirmDialog({
      title: 'Remove from class',
      message: `${student.name || 'This student'} will no longer be able to mark attendance for ${subject.name}. Their past records are kept, and you can add them back from the Requests tab.`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    setExpandedId(null);
    setStatus({ studentId: student.id, status: 'REJECTED' });
  };

  const confirmDelete = async () => {
    const ok = await confirmDialog({
      title: 'Delete Subject',
      message: `Are you sure you want to delete "${subject.name}"? This permanently wipes all attendance data for this class.\n\nIf you want to keep a record, download the Excel file from Reports first.`,
      confirmLabel: 'Delete Subject',
      destructive: true,
    });
    if (!ok) return;
    try {
      setDeleting(true);
      await deleteSubject(subjectId);
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['recent-sessions'] });
      navigate('/', { replace: true });
    } catch (err) {
      setDeleting(false);
      toast(getErrorMessage(err, 'Failed to delete the subject.'), 'error');
    }
  };

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return approved
      .filter((s) => {
        if (onlyLow) {
          const p = percentOf(s.id);
          if (p === null || p >= MIN_ATTENDANCE_PERCENT) return false;
        }
        if (!q) return true;
        return [s.name, s.prn, s.rollNo, s.email].some((v) => v && String(v).toLowerCase().includes(q));
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    // percentOf reads summaryByStudent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approved, search, onlyLow, summaryByStudent]);

  const isLoading = tab === 'lectures' ? sessions.isLoading : enrollments.isLoading;
  const loadFailed = tab === 'lectures' ? sessions.isError : enrollments.isError;

  const emptyText =
    tab === 'students'
      ? search || onlyLow
        ? 'No students match.'
        : `No students yet. Share the code ${subject.code} so they can enroll, then approve them under Requests.`
      : tab === 'requests'
        ? 'No requests waiting for you.'
        : 'No lectures yet. Start attendance from the Classes tab.';

  const isEmpty =
    tab === 'students'
      ? filteredStudents.length === 0
      : tab === 'requests'
        ? pending.length === 0 && removed.length === 0
        : (sessions.data ?? []).length === 0;

  return (
    <div>
      <ScreenHeader
        title={subject.name}
        subtitle={`${subject.code} · ${subject.type === 'practical' ? 'Practical' : 'Theory'}`}
        back
        right={
          <button
            type="button"
            onClick={confirmDelete}
            disabled={deleting}
            aria-label="Delete subject"
            className="w-11 h-11 bg-white/10 border border-white/15 rounded-full flex items-center justify-center ml-3 shrink-0"
          >
            {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
          </button>
        }
      >
        <div className="flex gap-2 mt-5">
          <Stat value={approved.length} label="Students" />
          <Stat value={pending.length} label="Requests" highlight={pending.length > 0} />
          <Stat value={lowCount} label={`Below ${MIN_ATTENDANCE_PERCENT}%`} highlight={lowCount > 0} />
        </div>
      </ScreenHeader>

      <div className="p-4">
        <SegmentedControl
          options={[
            { key: 'students', label: 'Students' },
            { key: 'requests', label: 'Requests', badge: pending.length },
            { key: 'lectures', label: 'Lectures' },
          ]}
          value={tab}
          onChange={setTab}
          className="mb-4"
        />

        {tab === 'students' && approved.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center bg-light-card border border-light-border rounded-2xl px-4 h-[52px] mb-3 focus-within:border-primary">
              <Search size={18} className="text-light-subtle mr-2.5 shrink-0" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, PRN or roll no."
                autoCorrect="off"
                className="flex-1 min-w-0 bg-transparent outline-none text-light-text font-medium placeholder:text-light-subtle"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="text-light-subtle">
                  <XCircle size={18} />
                </button>
              )}
            </div>
            <Chip
              label={`Below ${MIN_ATTENDANCE_PERCENT}% · ${lowCount}`}
              icon={AlertCircle}
              tone="danger"
              selected={onlyLow}
              onClick={() => setOnlyLow(!onlyLow)}
            />
          </div>
        )}

        {isLoading ? (
          <Spinner className="pt-8" />
        ) : loadFailed ? (
          <EmptyState icon={CloudOff} tone="danger" text="Could not load this. Check your connection and try again." />
        ) : isEmpty ? (
          <EmptyState icon={tab === 'lectures' ? Calendar : Users} text={emptyText} />
        ) : tab === 'students' ? (
          filteredStudents.map((student) => (
            <StudentRow
              key={student.id}
              student={student}
              percent={percentOf(student.id)}
              summary={summaryByStudent.get(student.id)}
              expanded={expandedId === student.id}
              onToggle={() => setExpandedId(expandedId === student.id ? null : student.id)}
              onRemove={() => confirmRemove(student)}
              disabled={isUpdating}
            />
          ))
        ) : tab === 'requests' ? (
          <>
            {pending.map((student) => (
              <RequestRow
                key={student.id}
                student={student}
                disabled={isUpdating}
                onApprove={() => setStatus({ studentId: student.id, status: 'APPROVED' })}
                onReject={() => setStatus({ studentId: student.id, status: 'REJECTED' })}
              />
            ))}
            {removed.length > 0 && <SectionLabel className="mt-3 mb-3 ml-1">REMOVED OR REJECTED</SectionLabel>}
            {removed.map((student) => (
              <RequestRow
                key={student.id}
                student={student}
                removed
                disabled={isUpdating}
                onApprove={() => setStatus({ studentId: student.id, status: 'APPROVED' })}
              />
            ))}
          </>
        ) : (
          (sessions.data ?? []).map((session) => (
            <LectureRow key={session.id} session={session} onOpen={() => navigate(`/lecture/${session.id}`)} />
          ))
        )}
      </div>
    </div>
  );
}

/** One number in the header. `highlight` marks a count that needs the faculty's attention. */
function Stat({ value, label, highlight }: { value: number; label: string; highlight?: boolean }) {
  return (
    <div className="flex-1 bg-white/10 border border-white/10 rounded-2xl py-3 flex flex-col items-center">
      <span className="flex items-center text-xl font-extrabold">
        {highlight && <span className="w-2 h-2 rounded-full bg-gold mr-1.5" />}
        {value}
      </span>
      <span className="text-white/60 text-[11px] font-semibold mt-0.5">{label}</span>
    </div>
  );
}

function StudentRow({
  student,
  percent,
  summary,
  expanded,
  onToggle,
  onRemove,
  disabled,
}: {
  student: EnrolledStudent;
  percent: number | null;
  summary?: StudentAttendanceSummary;
  expanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  const low = percent !== null && percent < MIN_ATTENDANCE_PERCENT;
  return (
    <Card className="mb-3 overflow-hidden">
      <button type="button" onClick={onToggle} aria-expanded={expanded} className="w-full p-4 flex items-center text-left">
        <Avatar name={student.name} size={46} />
        <span className="flex-1 min-w-0 mx-3">
          <span className="block text-light-text font-bold text-[15px] truncate">{student.name || 'Unnamed student'}</span>
          <span className="block text-light-muted text-xs font-medium mt-0.5 truncate">
            {student.prn ? `PRN ${student.prn}` : 'No PRN yet'}
            {student.rollNo ? ` · Roll ${student.rollNo}` : ''}
          </span>
        </span>
        {percent === null ? (
          <span className="text-light-subtle text-xs font-semibold mr-2">No classes</span>
        ) : (
          <span className="mr-2">
            <ProgressRing percent={percent} size={44} strokeWidth={5} color={low ? '#D92D20' : '#0B815A'}>
              <span className={`text-[10px] font-extrabold ${low ? 'text-danger' : 'text-success'}`}>{percent}%</span>
            </ProgressRing>
          </span>
        )}
        {expanded ? <ChevronUp size={18} className="text-light-subtle" /> : <ChevronDown size={18} className="text-light-subtle" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-3 border-t border-light-border bg-light/60">
          <Detail icon={Mail} label="Email" value={student.email} />
          <Detail icon={IdCard} label="PRN" value={student.prn || 'Not added yet'} />
          {student.rollNo && <Detail icon={List} label="Roll no." value={student.rollNo} />}
          <div className="flex gap-2 mt-3 mb-4">
            <Count label="Present" value={summary?.PRESENT ?? 0} tone="bg-success-bg text-success" />
            <Count label="Absent" value={summary?.ABSENT ?? 0} tone="bg-danger-bg text-danger" />
            <Count label="Invalid" value={summary?.INVALID ?? 0} tone="bg-warning-bg text-warning" />
          </div>
          <Button title="Remove from class" variant="dangerSoft" size="sm" icon={UserMinus} onClick={onRemove} disabled={disabled} className="w-full" />
        </div>
      )}
    </Card>
  );
}

function RequestRow({
  student,
  removed = false,
  disabled,
  onApprove,
  onReject,
}: {
  student: EnrolledStudent;
  removed?: boolean;
  disabled: boolean;
  onApprove: () => void;
  onReject?: () => void;
}) {
  return (
    <Card className="mb-3 p-4 flex items-center">
      <Avatar name={student.name} size={46} />
      <div className="flex-1 min-w-0 mx-3">
        <p className="text-light-text font-bold text-[15px] truncate">{student.name || 'Unnamed student'}</p>
        <p className="text-light-muted text-xs font-medium mt-0.5 truncate">
          {student.prn ? `PRN ${student.prn} · ` : ''}
          {student.email}
        </p>
      </div>
      {!removed && onReject && (
        <button
          type="button"
          onClick={onReject}
          disabled={disabled}
          aria-label={`Reject ${student.name || 'student'}`}
          className="tap w-11 h-11 rounded-full bg-danger-bg text-danger flex items-center justify-center mr-2 shrink-0"
        >
          <X size={20} />
        </button>
      )}
      <button
        type="button"
        onClick={onApprove}
        disabled={disabled}
        aria-label={`${removed ? 'Add back' : 'Approve'} ${student.name || 'student'}`}
        className={`tap h-11 rounded-full flex items-center justify-center shrink-0 ${
          removed ? 'px-4 bg-success-bg text-success text-sm font-bold' : 'w-11 bg-success text-white'
        }`}
      >
        <Check size={20} />
        {removed && <span className="ml-1">Add back</span>}
      </button>
    </Card>
  );
}

function LectureRow({ session, onOpen }: { session: SubjectSession; onOpen: () => void }) {
  const start = new Date(session.startTime);
  return (
    <button type="button" onClick={onOpen} className="w-full text-left block">
      <Card className="mb-3 p-4 flex items-center">
        <span className="w-12 h-14 rounded-2xl bg-light-primaryBg text-primary flex flex-col items-center justify-center mr-3 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wide">{start.toLocaleDateString('en-GB', { month: 'short' })}</span>
          <span className="text-lg font-extrabold leading-tight">{start.getDate()}</span>
        </span>
        <span className="flex-1 min-w-0 mr-2">
          <span className="block text-light-text font-bold text-[15px]">
            {start.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <span className="block text-light-muted text-xs font-medium mt-0.5">
            {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
          </span>
        </span>
        {session.isActive && (
          <span className="bg-success-bg text-success px-3 h-8 rounded-full mr-2 flex items-center text-[11px] font-bold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-success mr-2" />
            LIVE
          </span>
        )}
        <ChevronRight size={18} className="text-light-subtle shrink-0" />
      </Card>
    </button>
  );
}

function Detail({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center py-1.5">
      <Icon size={16} className="text-light-muted mr-2.5 shrink-0" />
      <span className="text-light-muted text-xs font-medium w-16 shrink-0">{label}</span>
      <span className="text-light-text text-sm font-semibold flex-1 min-w-0 break-all select-text">{value}</span>
    </div>
  );
}

function Count({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`flex-1 rounded-2xl p-3 flex flex-col items-center ${tone}`}>
      <span className="font-extrabold text-lg">{value}</span>
      <span className="text-xs font-semibold">{label}</span>
    </div>
  );
}
