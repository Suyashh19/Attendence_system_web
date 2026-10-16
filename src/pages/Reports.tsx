import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, ChevronRight, BookOpen, FlaskConical, Download, Library } from 'lucide-react';
import { getMySubjects, getRecentSessions, exportAttendanceData } from '../lib/attendance';
import { getErrorMessage } from '../lib/api';
import { ScreenHeader } from '../components/Layout';
import { Card, Chip, SectionLabel, Spinner } from '../components/ui';
import { ExportSheet } from '../components/SubjectSheets';
import { toast } from '../components/Dialog';

type Category = 'theory' | 'practical' | null;

/** Recent lectures and Excel downloads (the faculty's History tab in the app). */
export default function ReportsPage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category>(null);
  const [exportFor, setExportFor] = useState<number | undefined>(undefined);
  const [showExport, setShowExport] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { data: recent = [], isLoading: recentLoading } = useQuery({ queryKey: ['recent-sessions'], queryFn: getRecentSessions });
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects'], queryFn: getMySubjects });

  const filtered = useMemo(() => (category ? subjects.filter((s) => s.type === category) : subjects), [subjects, category]);

  const categories: { key: Category; label: string; count: number }[] = [
    { key: null, label: 'All', count: subjects.length },
    { key: 'theory', label: 'Theory', count: subjects.filter((s) => s.type === 'theory').length },
    { key: 'practical', label: 'Practical', count: subjects.filter((s) => s.type === 'practical').length },
  ];

  return (
    <div>
      <ScreenHeader eyebrow="ATTENDANCE REPORTS" title="Reports" />

      <div className="px-4 pt-5">
        <SectionLabel className="mb-3 ml-1">RECENT CLASSES</SectionLabel>

        {recentLoading ? (
          <Spinner className="py-6" />
        ) : recent.length === 0 ? (
          <Card className="p-6 flex flex-col items-center mb-6">
            <span className="w-14 h-14 rounded-full bg-light flex items-center justify-center text-light-subtle">
              <Calendar size={26} />
            </span>
            <p className="text-light-muted text-sm font-medium mt-3 text-center">Classes you take attendance for will appear here.</p>
          </Card>
        ) : (
          <div className="mb-3">
            {recent.map((session) => {
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
            })}
          </div>
        )}

        <SectionLabel className="mb-3 ml-1">DOWNLOAD REPORTS</SectionLabel>
        {subjects.length > 0 && (
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {categories.map(({ key, label, count }) => (
              <Chip key={label} label={`${label} · ${count}`} selected={category === key} onClick={() => setCategory(key)} />
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <Card className="p-6 flex flex-col items-center">
            <span className="w-14 h-14 rounded-full bg-light flex items-center justify-center text-light-subtle">
              <Library size={26} />
            </span>
            <p className="text-light-muted text-sm font-medium mt-3 text-center">
              {category ? `You have no ${category} subjects.` : 'Create a subject to download its report.'}
            </p>
          </Card>
        ) : (
          filtered.map((subject) => {
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
                  <p className="text-light-muted text-xs font-medium mt-1">
                    {subject.code} · {practical ? 'Practical' : 'Theory'}
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
