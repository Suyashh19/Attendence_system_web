import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, Users } from 'lucide-react';
import { getSessionDetails, editAttendanceRecord } from '../lib/attendance';
import { getErrorMessage } from '../lib/api';
import { MIN_ATTENDANCE_PERCENT } from '../theme';
import { ScreenHeader } from '../components/Layout';
import { Avatar, Button, Card, EmptyState, ProgressRing, SectionLabel, Spinner, StatusPill } from '../components/ui';
import { toast } from '../components/Dialog';

/** One lecture's roster; tap a status to correct it. */
export default function LecturePage() {
  const { id } = useParams();
  const sessionId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['session-details', sessionId],
    queryFn: () => getSessionDetails(sessionId),
    enabled: !!sessionId,
  });

  const editMutation = useMutation({
    mutationFn: ({ studentId, status }: { studentId: number; status: string }) => editAttendanceRecord(sessionId, studentId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-details', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['recent-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['subject-analytics'] });
    },
    onError: (err) => toast(getErrorMessage(err, 'Failed to update attendance.'), 'error'),
  });

  if (isLoading) {
    return (
      <div>
        <ScreenHeader title="Lecture" back />
        <Spinner className="pt-20" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div>
        <ScreenHeader title="Lecture" back />
        <EmptyState
          icon={AlertCircle}
          tone="danger"
          title="Failed to load details"
          text="Check your internet connection and open this lecture again."
          action={<Button title="Go Back" icon={ArrowLeft} onClick={() => navigate(-1)} />}
        />
      </div>
    );
  }

  const { session, students } = data;
  const presentCount = students.filter((s) => s.status === 'PRESENT').length;
  const rate = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0;
  const good = rate >= MIN_ATTENDANCE_PERCENT;

  return (
    <div>
      <ScreenHeader
        title={session.subjectName}
        subtitle={new Date(session.date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
        back
      />

      <div className="p-4">
        <Card className="p-5 mb-6 flex items-center">
          <ProgressRing percent={rate} size={96} strokeWidth={10} color={good ? '#0B815A' : '#D92D20'}>
            <span className={`text-2xl font-extrabold ${good ? 'text-success' : 'text-danger'}`}>{rate}%</span>
          </ProgressRing>
          <div className="flex-1 ml-5">
            <p className="text-light-muted font-bold text-xs uppercase tracking-widest mb-1">Attendance Rate</p>
            <p className="text-success text-[28px] font-extrabold leading-tight">
              {presentCount}
              <span className="text-light-muted text-base font-semibold"> / {students.length}</span>
            </p>
            <p className="text-light-muted text-[11px] font-bold tracking-wide">STUDENTS PRESENT</p>
          </div>
        </Card>

        <SectionLabel className="mb-3 ml-1">STUDENTS · TAP A STATUS TO CHANGE IT</SectionLabel>

        {students.length === 0 ? (
          <EmptyState icon={Users} text="No students enrolled in this subject." />
        ) : (
          students.map((item) => (
            <Card key={item.id} className="p-4 mb-3 flex items-center">
              <Avatar name={item.name} size={44} />
              <div className="flex-1 min-w-0 mx-3">
                <p className="text-light-text font-bold text-[15px] truncate">{item.name}</p>
                <div className="flex items-center mt-1">
                  {item.rollNo && (
                    <span className="bg-light px-2 py-0.5 rounded-md mr-2 text-light-muted text-[10px] font-bold">Roll: {item.rollNo}</span>
                  )}
                  {item.prn && <span className="text-light-muted text-[11px] font-medium">PRN: {item.prn}</span>}
                </div>
                {item.status === 'INVALID' && item.reason ? (
                  <p className="text-warning text-[11px] font-medium mt-1 line-clamp-2">{item.reason}</p>
                ) : item.editedByFaculty ? (
                  <p className="text-light-muted text-[11px] font-medium mt-1">Edited by you</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => editMutation.mutate({ studentId: item.id, status: item.status === 'PRESENT' ? 'ABSENT' : 'PRESENT' })}
                disabled={editMutation.isPending}
                aria-label={`${item.name} is ${item.status}. Tap to change.`}
                className={editMutation.isPending ? 'opacity-60' : ''}
              >
                <StatusPill status={item.status} edited={item.editedByFaculty} />
              </button>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
