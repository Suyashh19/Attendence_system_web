import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Radio, BookOpen, FlaskConical, Users, Play, ChevronRight, School, CloudOff, RefreshCw, Loader2, SearchX, X } from 'lucide-react';
import { getMySubjects, startSession, endSession, getMyActiveSession } from '../lib/attendance';
import { getErrorMessage } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useSocket } from '../hooks/useSocket';
import { Avatar, Button, EmptyState, SectionLabel } from '../components/ui';
import { confirmDialog, toast } from '../components/Dialog';
import { CreateSubjectSheet } from '../components/SubjectSheets';
import { ClassFilterSheet } from '../components/ClassFilterSheet';
import { SearchFilterBar } from '../components/SearchFilterBar';
import { TabSkeleton } from '../components/Skeleton';
import { offerToShareSubject } from '../lib/share';
import {
  NO_FILTERS,
  activeFilterCount,
  applyClassFilters,
  buildClassList,
  defaultFilters,
  filterSummary,
  filtersShowing,
  yearChoices,
  type ClassFilters,
} from '../utils/classesView';
import { FacultySessionScreen, AttendanceSummarySheet } from '../components/SessionModals';
import type { FacultySession, SessionAttendance, Subject } from '../types';

export default function HomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [activeSession, setActiveSession] = useState<(FacultySession & { windowSeconds: number }) | null>(null);
  const [liveCount, setLiveCount] = useState<{ sessionId: number; presentCount: number } | null>(null);
  const [summary, setSummary] = useState<{ sessionId: number; attendances: SessionAttendance[] } | null>(null);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const endingRef = useRef(false);
  const [showCreate, setShowCreate] = useState(false);
  // null = not touched yet, so the list opens on the running academic year and term
  const [chosenFilters, setChosenFilters] = useState<ClassFilters | null>(null);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  // Bumped when the page comes back into view, to re-check for a running session
  const [visibleTick, setVisibleTick] = useState(0);

  const { data: subjects = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['subjects'],
    queryFn: getMySubjects,
  });

  const subjectIds = useMemo(() => subjects.map((s) => String(s.id)), [subjects]);
  const liveSubject = activeSession ? subjects.find((s) => s.id === Number(activeSession.subjectId)) : undefined;

  // A chosen year or term that no longer matches anything just shows an empty state with Show all
  const filters = chosenFilters ?? defaultFilters(subjects);
  const filterCount = activeFilterCount(filters);
  const filtered = useMemo(() => applyClassFilters(subjects, filters, search), [subjects, filters, search]);
  const listEntries = useMemo(() => buildClassList(filtered, liveSubject?.id ?? null), [filtered, liveSubject?.id]);
  const showAll = () => {
    setChosenFilters(NO_FILTERS);
    setSearch('');
  };

  // ─── Ending a session ───────────────────────────────────────────────────────
  // Also runs when the server closes the session by itself; the end call then just returns the roster
  const handleEndSession = useCallback(
    async (target?: { id: number }) => {
      const session = target ?? activeSession;
      if (!session || endingRef.current) return;
      endingRef.current = true;
      setEnding(true);
      try {
        for (;;) {
          try {
            const res = await endSession(session.id);
            setActiveSession(null);
            setLiveCount(null);
            queryClient.invalidateQueries({ queryKey: ['recent-sessions'] });
            if (res.attendances?.length) setSummary({ sessionId: session.id, attendances: res.attendances });
            return;
          } catch (err) {
            // Keep the session on screen so the faculty can retry instead of silently losing it
            const retry = await confirmDialog({
              title: 'Could not end session',
              message: `${getErrorMessage(err, 'Something went wrong.')}\n\nThe session also closes by itself shortly after the timer runs out.`,
              confirmLabel: 'Try Again',
              cancelLabel: 'Close',
            });
            if (!retry) {
              setActiveSession(null);
              setLiveCount(null);
              return;
            }
          }
        }
      } finally {
        endingRef.current = false;
        setEnding(false);
      }
    },
    [activeSession, queryClient]
  );
  const handleEndSessionRef = useRef(handleEndSession);
  handleEndSessionRef.current = handleEndSession;

  // ─── Live updates ───────────────────────────────────────────────────────────
  useSocket({
    subjectIds,
    onSessionEnded: (data) => {
      // The server closed the faculty's session by itself: fetch the roster and show the summary
      if (activeSession && activeSession.id === Number(data.sessionId)) handleEndSessionRef.current();
    },
    onAttendanceCount: (data) => setLiveCount({ sessionId: Number(data.sessionId), presentCount: data.presentCount }),
  });

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setVisibleTick((t) => t + 1);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // ─── Recovery: reopen a session that is still running (page reloaded or reopened) ───
  useEffect(() => {
    if (activeSession) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await getMyActiveSession();
        if (cancelled || !result?.active || !result.session) return;
        const session = result.session;
        const remainingMs = new Date(session.windowExpiry).getTime() - new Date(session.serverTime).getTime();
        if (remainingMs > 0) {
          setLiveCount({ sessionId: Number(session.id), presentCount: session.presentCount ?? 0 });
          setActiveSession({ ...session, windowSeconds: Math.ceil(remainingMs / 1000) });
        } else {
          // The window is over but the session was never closed: close it and show the summary
          handleEndSessionRef.current({ id: Number(session.id) });
        }
      } catch {
        // Best-effort; the server closes the session by itself anyway
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleTick]);

  // ─── Starting a session ─────────────────────────────────────────────────────
  const handleStartPress = async (subject: Subject) => {
    const ok = await confirmDialog({
      title: 'Start Attendance',
      message: `Start an attendance session for "${subject.name}"?\n\nStudents get a few seconds to type the code you show them, so start only when the class is ready.`,
      confirmLabel: 'Start',
    });
    if (ok) startSessionFor(subject);
  };

  const startSessionFor = async (subject: Subject) => {
    if (starting || activeSession) return;

    // The timetable slot stored with the session: now, for one hour
    const pad = (n: number) => String(n).padStart(2, '0');
    const now = new Date();
    const later = new Date(now.getTime() + 60 * 60 * 1000);

    try {
      setStarting(true);
      const session = await startSession({
        subjectId: subject.id,
        date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
        startTime: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
        endTime: `${pad(later.getHours())}:${pad(later.getMinutes())}`,
      });
      // Countdown length comes from the server's window, not a hard-coded number
      const windowMs = new Date(session.windowExpiry).getTime() - new Date(session.serverTime).getTime();
      const windowSeconds = windowMs > 0 ? Math.ceil(windowMs / 1000) : session.windowSeconds || 15;
      setLiveCount(null);
      setActiveSession({ ...session, subjectName: subject.name, windowSeconds });
    } catch (err) {
      toast(getErrorMessage(err, 'Failed to start the session. Please try again.'), 'error');
    } finally {
      setStarting(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (isLoading) return <TabSkeleton />;

  if (isError) {
    return (
      <div className="pt-24 px-4">
        <EmptyState
          icon={CloudOff}
          tone="danger"
          title="Could not load your classes"
          text="Check your internet connection and try again."
          action={<Button title="Try Again" icon={RefreshCw} onClick={() => refetch()} />}
        />
      </div>
    );
  }

  const firstName = user?.name?.split(' ')[0] || 'there';
  const counts = {
    theory: subjects.filter((s) => s.type === 'theory').length,
    practical: subjects.filter((s) => s.type === 'practical').length,
  };

  return (
    <div>
      <header className="hero rounded-b-[32px] px-5 pb-6 text-white mb-3" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <div className="flex items-center">
          <Avatar name={user?.name} size={48} onDark />
          <h1 className="flex-1 mx-3 text-[22px] font-extrabold truncate">Hello, {firstName}</h1>
          <button
            type="button"
            onClick={() => refetch()}
            aria-label="Refresh"
            className="w-11 h-11 rounded-full bg-white/10 border border-white/15 flex items-center justify-center mr-2"
          >
            <RefreshCw size={18} className={isFetching ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="tap bg-white text-primary h-11 pl-3 pr-4 rounded-full flex items-center text-sm font-bold"
          >
            <Plus size={18} className="mr-1.5" />
            New subject
          </button>
        </div>

        <div className="flex gap-2 mt-5">
          {[
            { label: 'Subjects', value: subjects.length },
            { label: 'Theory', value: counts.theory },
            { label: 'Practical', value: counts.practical },
          ].map(({ label, value }) => (
            <div key={label} className="flex-1 bg-white/10 border border-white/10 rounded-2xl py-3 flex flex-col items-center">
              <span className="text-xl font-extrabold">{value}</span>
              <span className="text-white/60 text-[11px] font-semibold mt-0.5">{label}</span>
            </div>
          ))}
        </div>

        {/* What is happening right now */}
        <div
          className={`rounded-2xl px-4 py-3 mt-3 flex items-center ${liveSubject ? 'bg-white text-light-text' : 'bg-white/10 border border-white/10'}`}
        >
          {liveSubject ? (
            <span className="w-8 h-8 rounded-full bg-success-bg flex items-center justify-center mr-3">
              <span className="w-2.5 h-2.5 rounded-full bg-success" />
            </span>
          ) : (
            <Radio size={18} className="mr-2.5 text-white/60 shrink-0" />
          )}
          <p className={`text-[13px] leading-[18px] ${liveSubject ? 'font-bold' : 'text-white/80 font-medium'}`}>
            {liveSubject
              ? `Attendance is open for ${liveSubject.name}`
              : 'No session running. Tap Start on a subject when the class is ready.'}
          </p>
        </div>
      </header>

      {subjects.length > 0 && (
        <div className="px-4 mt-4">
          <SearchFilterBar
            value={search}
            onChange={setSearch}
            placeholder="Search by name or code"
            filterCount={filterCount}
            onOpenFilters={() => setShowFilters(true)}
            summary={filterSummary(filtered.length, filters)}
            onShowAll={showAll}
          />
        </div>
      )}

      {subjects.length === 0 ? (
        <div className="px-4 pt-6">
          <EmptyState
            icon={School}
            title="No subjects yet"
            text="Create a subject, then share its code with your students so they can enroll."
            action={<Button title="Create Subject" icon={Plus} onClick={() => setShowCreate(true)} />}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-4">
          <EmptyState
            icon={SearchX}
            title="No subjects match"
            text={search.trim() ? `Nothing found for "${search.trim()}" with these filters.` : 'No subjects fit the filters you picked.'}
            action={<Button title="Clear filters" variant="outline" icon={X} onClick={showAll} />}
          />
        </div>
      ) : (
        <div className="px-4">
          {listEntries.map((entry) =>
            entry.kind === 'header' ? (
              <SectionLabel key={`header-${entry.key}`} className="px-1 mt-4 mb-3">
                {entry.label.toUpperCase()} · {entry.count}
              </SectionLabel>
            ) : (
              <SubjectCard
                key={entry.subject.id}
                subject={entry.subject}
                live={liveSubject?.id === entry.subject.id}
                onOpen={() => navigate(`/subject/${entry.subject.id}`)}
                onStart={() => handleStartPress(entry.subject)}
              />
            )
          )}
        </div>
      )}

      <ClassFilterSheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onChange={setChosenFilters}
        years={yearChoices(subjects)}
        counts={{ all: subjects.length, theory: counts.theory, practical: counts.practical }}
      />

      <CreateSubjectSheet
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={(_type, created) => {
          setShowCreate(false);
          // Show the new subject: filter to its year and term, and drop a search that would hide it
          setChosenFilters(filtersShowing(created.span));
          setSearch('');
          queryClient.invalidateQueries({ queryKey: ['subjects'] });
          void offerToShareSubject(created);
        }}
      />

      {activeSession && (
        <FacultySessionScreen
          key={activeSession.id}
          subjectName={activeSession.subjectName || liveSubject?.name || ''}
          correctCode={activeSession.correctCode}
          presentCount={liveCount && liveCount.sessionId === Number(activeSession.id) ? liveCount.presentCount : 0}
          duration={activeSession.windowSeconds}
          ending={ending}
          onEndSession={() => handleEndSession()}
        />
      )}

      <AttendanceSummarySheet
        sessionId={summary?.sessionId ?? null}
        attendances={summary?.attendances ?? []}
        onClose={() => setSummary(null)}
      />

      {starting && (
        <div className="fixed inset-0 z-50 bg-navy/55 flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-light-card rounded-3xl px-10 py-7 flex flex-col items-center">
            <Loader2 size={32} className="animate-spin text-primary" />
            <p className="text-light-text font-bold mt-4">Starting session...</p>
          </div>
        </div>
      )}
    </div>
  );
}

/** "Theory · 2026-27 Odd": the type and the semester label, when there is one. */
function subjectMeta(subject: Subject): string {
  return [subject.type === 'practical' ? 'Practical' : 'Theory', subject.span].filter(Boolean).join(' · ');
}

function SubjectCard({ subject, live, onOpen, onStart }: { subject: Subject; live: boolean; onOpen: () => void; onStart: () => void }) {
  const practical = subject.type === 'practical';
  return (
    <div className={`bg-light-card rounded-3xl p-4 border shadow-card mb-3 ${live ? 'border-success' : 'border-light-border'}`}>
      <button type="button" onClick={onOpen} className="w-full flex items-center text-left" aria-label={`Open ${subject.name}`}>
        <span
          className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center mr-3 shrink-0 ${
            practical ? 'bg-gold-bg text-gold' : 'bg-light-primaryBg text-primary'
          }`}
        >
          {practical ? <FlaskConical size={22} /> : <BookOpen size={22} />}
        </span>
        <span className="flex-1 min-w-0 mr-2">
          <span className="block text-light-text font-bold text-base truncate">{subject.name}</span>
          <span className="flex items-center mt-1">
            <span className="bg-light px-2 py-0.5 rounded-md mr-2 text-light-muted text-[11px] font-bold tracking-wide shrink-0">{subject.code}</span>
            <span className="text-light-muted text-xs font-medium truncate">{subjectMeta(subject)}</span>
          </span>
        </span>
        {live && (
          <span className="bg-success-bg text-success px-3 h-8 rounded-full flex items-center mr-1 text-[11px] font-bold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-success mr-2" />
            LIVE
          </span>
        )}
        <ChevronRight size={18} className="text-light-subtle shrink-0" />
      </button>

      <div className="flex items-center mt-4 pt-3 border-t border-light-border">
        <Users size={18} className="text-light-muted mr-1.5" />
        <button type="button" onClick={onOpen} className="flex-1 text-left text-light-muted text-sm font-medium">
          Students and lectures
        </button>
        {!live && (
          <button
            type="button"
            onClick={onStart}
            aria-label={`Start attendance for ${subject.name}`}
            className="tap bg-primary text-white h-10 pl-3 pr-4 rounded-full flex items-center text-sm font-bold shadow-glow"
          >
            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center mr-2">
              <Play size={11} fill="currentColor" />
            </span>
            Start
          </button>
        )}
      </div>
    </div>
  );
}
