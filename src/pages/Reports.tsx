import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, ChevronRight, BookOpen, FlaskConical, Download, Library, Clock } from 'lucide-react';
import { getMySubjects, getRecentSessions, exportAttendanceData } from '../lib/attendance';
import { getErrorMessage } from '../lib/api';
import { ScreenHeader } from '../components/Layout';
import { Card, SectionLabel, SegmentedControl } from '../components/ui';
import { ListSkeleton } from '../components/Skeleton';
import { ExportSheet } from '../components/SubjectSheets';
import { ClassFilterSheet } from '../components/ClassFilterSheet';
import { SearchFilterBar } from '../components/SearchFilterBar';
import { toast } from '../components/Dialog';
import {
  NO_FILTERS,
  activeFilterCount,
  applyClassFilters,
  buildClassList,
  defaultFilters,
  filterSummary,
  yearChoices,
  type ClassFilters,
} from '../utils/classesView';
import { applyRecentFilters, groupSessionsByDate, recentSummary } from '../utils/recentView';

type ReportsTab = 'reports' | 'recent';

/** Recent lectures and Excel downloads (the faculty's History tab in the app). */
export default function ReportsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<ReportsTab>('reports');
  const [exportFor, setExportFor] = useState<number | undefined>(undefined);
  const [showExport, setShowExport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Download reports: null = not touched yet, so the list opens on the running academic year and term
  const [query, setQuery] = useState('');
  const [chosenFilters, setChosenFilters] = useState<ClassFilters | null>(null);
  // Recent classes
  const [recentQuery, setRecentQuery] = useState('');
  const [recentFilters, setRecentFilters] = useState<ClassFilters>(NO_FILTERS);

  const { data: recent = [], isLoading: recentLoading } = useQuery({ queryKey: ['recent-sessions'], queryFn: () => getRecentSessions() });
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects'], queryFn: getMySubjects });

  const filters = useMemo(() => chosenFilters ?? defaultFilters(subjects), [chosenFilters, subjects]);
  const filterCount = activeFilterCount(filters);
  const filteredSubjects = useMemo(() => applyClassFilters(subjects, filters, query), [subjects, filters, query]);
  const reportEntries = useMemo(() => buildClassList(filteredSubjects, null), [filteredSubjects]);
  const clearReportFilters = () => {
    setChosenFilters(NO_FILTERS);
    setQuery('');
  };

  // The newest 10 until something is typed or filtered, then every fetched class that matches
  const spanBySubject = useMemo(() => new Map(subjects.map((s) => [Number(s.id), s.span])), [subjects]);
  const visibleRecent = useMemo(
    () => applyRecentFilters(recent, recentFilters, recentQuery, spanBySubject),
    [recent, recentFilters, recentQuery, spanBySubject]
  );
  const recentEntries = useMemo(() => groupSessionsByDate(visibleRecent), [visibleRecent]);
  const recentFilterCount = activeFilterCount(recentFilters);
  const clearRecentFilters = () => {
    setRecentFilters(NO_FILTERS);
    setRecentQuery('');
  };
  const recentSubject = subjects.find((s) => Number(s.id) === recentFilters.subjectId);

  const onRecent = tab === 'recent';

  return (
    <div>
      <ScreenHeader eyebrow="ATTENDANCE REPORTS" title="Reports" />

      <div className="px-4 pt-5">
        <SegmentedControl
          options={[
            { key: 'reports' as const, label: 'Download reports', icon: Download },
            { key: 'recent' as const, label: 'Recent classes', icon: Clock },
          ]}
          value={tab}
          onChange={setTab}
          className="mb-4"
        />

        {!onRecent && subjects.length > 0 && (
          <div className="mb-1">
            <SearchFilterBar
              value={query}
              onChange={setQuery}
              placeholder="Search by subject name or code"
              filterCount={filterCount}
              onOpenFilters={() => setShowFilters(true)}
              summary={filterSummary(filteredSubjects.length, filters)}
              onShowAll={clearReportFilters}
            />
          </div>
        )}

        {onRecent && recent.length > 0 && (
          <div className="mb-1">
            <SearchFilterBar
              value={recentQuery}
              onChange={setRecentQuery}
              placeholder="Search by subject or date, e.g. 12 oct"
              filterCount={recentFilterCount}
              onOpenFilters={() => setShowFilters(true)}
              summary={recentSummary(visibleRecent.length, recentFilters, recentQuery, recentSubject?.name)}
              onShowAll={clearRecentFilters}
            />
          </div>
        )}

        {onRecent ? (
          recentLoading ? (
            <ListSkeleton count={3} />
          ) : recentEntries.length === 0 ? (
            <EmptyCard icon={Calendar} text={recent.length > 0 ? 'No classes match your search or filters.' : 'Classes you take attendance for will appear here.'} />
          ) : (
            recentEntries.map((entry) => {
              if (entry.kind === 'header') {
                return (
                  <SectionLabel key={`header-${entry.key}`} className="px-1 mt-2 mb-3">
                    {entry.label.toUpperCase()} · {entry.count}
                  </SectionLabel>
                );
              }
              const session = entry.session;
              const start = new Date(session.startTime);
              return (
                <button key={session.id} type="button" onClick={() => navigate(`/lecture/${session.id}`)} className="w-full text-left block">
                  <Card className="p-4 mb-3 flex items-center">
                    <span className="w-12 h-14 rounded-2xl bg-light-primaryBg text-primary flex flex-col items-center justify-center mr-3 shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-wide">{start.toLocaleString('en-US', { month: 'short' })}</span>
                      <span className="text-lg font-extrabold leading-tight">{start.getDate()}</span>
                    </span>
                    <span className="flex-1 min-w-0 mr-3">
                      <span className="block text-light-text font-bold text-base truncate">{session.subjectName}</span>
                      <span className="block text-light-muted text-xs font-medium mt-1 truncate">
                        {session.subjectCode} · {session.subjectType === 'theory' ? 'Theory' : 'Practical'} ·{' '}
                        {start.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                      </span>
                    </span>
                    <span className="flex flex-col items-end mr-2">
                      <span className="text-light-text font-extrabold text-base">
                        {session.presentCount}
                        <span className="text-light-muted text-xs font-semibold"> / {session.totalEnrolled}</span>
                      </span>
                      <span className="text-success text-[11px] font-bold">Present</span>
                    </span>
                    <ChevronRight size={18} className="text-light-subtle shrink-0" />
                  </Card>
                </button>
              );
            })
          )
        ) : filteredSubjects.length === 0 ? (
          <EmptyCard
            icon={Library}
            text={
              subjects.length === 0
                ? 'Create a subject to download its report.'
                : query.trim()
                  ? 'No subjects match your search.'
                  : 'No subjects fit the filters you picked.'
            }
          />
        ) : (
          reportEntries.map((entry) => {
            if (entry.kind === 'header') {
              return (
                <SectionLabel key={`header-${entry.key}`} className="px-1 mt-2 mb-3">
                  {entry.label.toUpperCase()} · {entry.count}
                </SectionLabel>
              );
            }
            const subject = entry.subject;
            const practical = subject.type === 'practical';
            return (
              <Card key={subject.id} className="p-4 mb-3 flex items-center">
                <span
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center mr-3 shrink-0 ${
                    practical ? 'bg-gold-bg text-gold' : 'bg-light-primaryBg text-primary'
                  }`}
                >
                  {practical ? <FlaskConical size={20} /> : <BookOpen size={20} />}
                </span>
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-light-text font-bold text-base truncate">{subject.name}</p>
                  <p className="text-light-muted text-xs font-medium mt-1 truncate">
                    {subject.code} · {practical ? 'Practical' : 'Theory'}
                    {subject.span ? ` · ${subject.span}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setExportFor(subject.id);
                    setShowExport(true);
                  }}
                  aria-label={`Download report for ${subject.name}`}
                  className="tap bg-light-primaryBg text-primary h-11 px-4 rounded-full flex items-center text-sm font-bold shrink-0"
                >
                  <Download size={18} className="mr-1.5" />
                  Excel
                </button>
              </Card>
            );
          })
        )}
      </div>

      <ClassFilterSheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        filters={onRecent ? recentFilters : filters}
        onChange={onRecent ? setRecentFilters : setChosenFilters}
        years={yearChoices(subjects)}
        subjects={onRecent ? subjects : undefined}
        counts={
          onRecent
            ? {
                all: recent.length,
                theory: recent.filter((s) => s.subjectType === 'theory').length,
                practical: recent.filter((s) => s.subjectType === 'practical').length,
              }
            : {
                all: subjects.length,
                theory: subjects.filter((s) => s.type === 'theory').length,
                practical: subjects.filter((s) => s.type === 'practical').length,
              }
        }
      />

      <ExportSheet
        open={showExport}
        onClose={() => setShowExport(false)}
        subjects={subjects}
        initialSubjectId={exportFor}
        loading={exporting}
        onConfirm={async ({ subjectId, startDate, endDate }) => {
          try {
            setExporting(true);
            await exportAttendanceData(subjectId, { startDate, endDate });
            setShowExport(false);
            toast('Report downloaded. Find it in the Files app.');
          } catch (err) {
            toast(getErrorMessage(err, 'Could not generate the report. Check your connection and try again.'), 'error');
          } finally {
            setExporting(false);
          }
        }}
      />
    </div>
  );
}

function EmptyCard({ icon: Icon, text }: { icon: typeof Calendar; text: string }) {
  return (
    <Card className="p-6 flex flex-col items-center">
      <span className="w-14 h-14 rounded-full bg-light flex items-center justify-center text-light-subtle">
        <Icon size={26} />
      </span>
      <p className="text-light-muted text-sm font-medium mt-3 text-center">{text}</p>
    </Card>
  );
}
