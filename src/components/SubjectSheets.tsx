import { useEffect, useMemo, useState } from 'react';
import { School, Tag, BookOpen, FlaskConical, Download, FileText, CheckCircle2 } from 'lucide-react';
import { Sheet } from './Sheet';
import { Button, Chip, Input, SegmentedControl } from './ui';
import { toast } from './Dialog';
import { createSubject, updateSubject } from '../lib/attendance';
import { getErrorMessage } from '../lib/api';
import { academicYearOptions, currentAcademicYear, currentTerm, formatSpan, parseSpan, type Term } from '../utils/academicYear';
import { subjectSubtitle } from '../utils/subjectText';
import { RANGE_PRESETS, presetRange, type RangeKey } from '../utils/exportRange';
import type { Subject } from '../types';

type SubjectType = 'theory' | 'practical';

const TYPES = [
  { key: 'theory' as const, label: 'Theory', icon: BookOpen },
  { key: 'practical' as const, label: 'Practical', icon: FlaskConical },
];

const TERM_OPTIONS = [
  { key: 'Odd' as const, label: 'Odd semester' },
  { key: 'Even' as const, label: 'Even semester' },
];

interface CreateSubjectSheetProps {
  open: boolean;
  onClose: () => void;
  /** Called with the saved subject, so the caller can offer to share its code */
  onSuccess: (type: SubjectType, saved: Subject) => void;
  /** Edit this subject instead of creating a new one */
  subject?: Subject;
  /** Start a new subject from another one's details (Duplicate). The code is left blank: it must be new. */
  prefill?: { name: string; type: SubjectType; span?: string | null };
}

/** Year + term from a saved label. An old free-text label gives no year, so the faculty picks one. */
function splitSpan(span?: string | null): { year: string; term: Term } {
  const parsed = parseSpan(span);
  return { year: parsed?.year ?? '', term: parsed?.term ?? currentTerm() };
}

function initialValues(subject?: Subject, prefill?: CreateSubjectSheetProps['prefill']) {
  if (subject) return { name: subject.name, code: subject.code, type: subject.type as SubjectType, ...splitSpan(subject.span) };
  if (prefill) return { name: prefill.name, code: '', type: prefill.type, ...splitSpan(prefill.span) };
  // A new subject starts on the running academic year and term
  return { name: '', code: '', type: 'theory' as SubjectType, year: currentAcademicYear(), term: currentTerm() };
}

export function CreateSubjectSheet({ open, onClose, onSuccess, subject, prefill }: CreateSubjectSheetProps) {
  const editing = !!subject;
  const [values, setValues] = useState(() => initialValues(subject, prefill));
  const [loading, setLoading] = useState(false);

  // The saved year is always offered, even when it has fallen out of the usual range
  const yearOptions = useMemo(() => {
    const options = academicYearOptions();
    return values.year && !options.includes(values.year) ? [...options, values.year] : options;
  }, [values.year]);

  // Each time the sheet opens it starts from the subject being edited, the duplicate, or blank
  useEffect(() => {
    if (open) setValues(initialValues(subject, prefill));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = values.name.trim();
    const code = values.code.trim();

    if (!name || !code) {
      toast('Enter both a subject name and a subject code.', 'error');
      return;
    }

    const span = values.year ? formatSpan(values.year, values.term) : '';

    try {
      setLoading(true);
      let saved: Subject;

      if (subject) {
        // Send only what changed
        const changes: { name?: string; code?: string; type?: SubjectType; span?: string } = {};
        if (name !== subject.name) changes.name = name;
        if (code.toUpperCase() !== subject.code) changes.code = code;
        if (values.type !== subject.type) changes.type = values.type;
        // An old free-text label stays as it is until a year is picked to replace it
        const keepsOldLabel = !!subject.span && !parseSpan(subject.span) && !values.year;
        if (!keepsOldLabel && span !== (subject.span ?? '')) changes.span = span;

        if (Object.keys(changes).length === 0) {
          onClose();
          return;
        }
        saved = await updateSubject(subject.id, changes);
      } else {
        saved = await createSubject(name, code, values.type, span || undefined);
      }

      onSuccess(values.type, saved);
    } catch (err) {
      toast(getErrorMessage(err, editing ? 'Could not save the changes. Please try again.' : 'Could not create the subject. Please try again.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const title = editing ? 'Edit subject' : prefill ? 'Duplicate subject' : 'New subject';
  const subtitle = editing
    ? 'Students already in the class stay enrolled.'
    : prefill
      ? 'Give the copy a new code and check its academic year. It starts with no students.'
      : 'Students enroll with the subject code you set here.';

  return (
    <Sheet open={open} onClose={onClose} title={title} subtitle={subtitle}>
      <form onSubmit={handleSave}>
        <Input label="Subject name" placeholder="e.g. Distributed Systems" icon={School} value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
        <Input
          label="Subject code"
          placeholder="e.g. CS402"
          icon={Tag}
          value={values.code}
          onChange={(e) => setValues({ ...values, code: e.target.value.toUpperCase() })}
          autoCapitalize="characters"
          autoCorrect="off"
        />

        <p className="text-light-text font-semibold mb-2 ml-1 text-[13px]">Academic year (optional)</p>
        <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 mb-4">
          {yearOptions.map((year) => (
            <Chip
              key={year}
              label={year === currentAcademicYear() ? `${year} · Current` : year}
              selected={values.year === year}
              // Tapping the chosen year again clears it
              onClick={() => setValues({ ...values, year: values.year === year ? '' : year })}
            />
          ))}
        </div>
        {values.year && <SegmentedControl options={TERM_OPTIONS} value={values.term} onChange={(term) => setValues({ ...values, term })} className="mb-4" />}
        {subject?.span && !parseSpan(subject.span) && !values.year && (
          <p className="text-light-muted text-xs font-medium -mt-1 mb-4 ml-1">Current label: {subject.span}. Pick an academic year to replace it.</p>
        )}
        {editing && values.code.trim().toUpperCase() !== subject!.code && (
          <p className="text-light-muted text-xs font-medium mb-4 ml-1">Students who join later must use the new code. Share it with them.</p>
        )}

        <p className="text-light-text font-semibold mb-2 ml-1 text-[13px]">Type</p>
        <SegmentedControl options={TYPES} value={values.type} onChange={(type) => setValues({ ...values, type })} className="mb-6" />
        <div className="flex gap-3">
          <Button title="Cancel" variant="outline" onClick={onClose} disabled={loading} className="flex-1" />
          <Button title={editing ? 'Save' : 'Create'} type="submit" loading={loading} className="flex-1" />
        </div>
      </form>
    </Sheet>
  );
}

// yyyy-mm-dd in local time, the format <input type="date"> uses
function toInputDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

interface ExportSheetProps {
  open: boolean;
  onClose: () => void;
  subjects: Subject[];
  initialSubjectId?: number;
  loading: boolean;
  onConfirm: (filters: { subjectId: number; startDate: string; endDate: string }) => void;
}

export function ExportSheet({ open, onClose, subjects, initialSubjectId, loading, onConfirm }: ExportSheetProps) {
  const [subjectId, setSubjectId] = useState<number | undefined>(initialSubjectId);
  const [rangeKey, setRangeKey] = useState<RangeKey>('30d');
  const [start, setStart] = useState(() => toInputDate(presetRange('30d').from));
  const [end, setEnd] = useState(() => toInputDate(presetRange('30d').to));

  const pickPreset = (key: Exclude<RangeKey, 'custom'>) => {
    const { from, to } = presetRange(key);
    setRangeKey(key);
    setStart(toInputDate(from));
    setEnd(toInputDate(to));
  };

  // Each time the sheet opens, start on the subject whose download button was tapped, and the last 30 days
  useEffect(() => {
    if (!open) return;
    setSubjectId(initialSubjectId ?? subjects[0]?.id);
    pickPreset('30d');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialSubjectId]);

  const selected = subjects.find((s) => s.id === subjectId);

  const handleConfirm = () => {
    if (!selected) {
      toast('Select a subject to export.', 'error');
      return;
    }
    if (!start || !end || end < start) {
      toast('The "To" date must be on or after the "From" date.', 'error');
      return;
    }
    // Whole days: from the first minute of the start date to the last minute of the end date
    const from = new Date(`${start}T00:00:00`);
    const to = new Date(`${end}T23:59:59.999`);
    onConfirm({ subjectId: selected.id, startDate: from.toISOString(), endDate: to.toISOString() });
  };

  return (
    <Sheet open={open} onClose={onClose} title="Download report" subtitle={selected ? subjectSubtitle(selected) : "An Excel sheet of every student's status for each lecture."}>
      <p className="text-light-muted font-bold text-xs tracking-widest mb-3">SUBJECT</p>
      <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 mb-6">
        {subjects.map((s) => {
          const isSelected = s.id === subjectId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSubjectId(s.id)}
              aria-pressed={isSelected}
              className={`shrink-0 px-4 h-11 rounded-full flex items-center text-sm font-bold border-[1.5px] ${
                isSelected ? 'bg-light-primaryBg border-primary text-primary' : 'bg-light border-light-border text-light-text'
              }`}
            >
              {isSelected && <CheckCircle2 size={16} className="mr-1.5" />}
              {s.code}
            </button>
          );
        })}
      </div>

      <p className="text-light-muted font-bold text-xs tracking-widest mb-3">DATE RANGE</p>
      <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 mb-3">
        {RANGE_PRESETS.map(({ key, label }) => (
          <Chip key={key} label={label} selected={rangeKey === key} onClick={() => pickPreset(key)} />
        ))}
      </div>
      <div className="flex gap-3 mb-6">
        <DateField
          label="FROM"
          value={start}
          onChange={(v) => {
            setStart(v);
            setRangeKey('custom');
          }}
          max={end}
        />
        <DateField
          label="TO"
          value={end}
          onChange={(v) => {
            setEnd(v);
            setRangeKey('custom');
          }}
          min={start}
        />
      </div>

      <div className="bg-light-primaryBg p-4 rounded-2xl flex">
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center mr-3 text-primary shrink-0">
          <FileText size={18} />
        </div>
        <div>
          <p className="text-primary font-bold text-sm mb-1">What you get</p>
          <p className="text-light-muted text-xs leading-[18px]">
            An Excel sheet listing every student (PRN, name, email) with their status for each lecture in the selected dates.
          </p>
        </div>
      </div>

      <Button title="Download Excel" icon={Download} onClick={handleConfirm} loading={loading} disabled={!selected} className="mt-6 w-full" />
    </Sheet>
  );
}

function DateField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
}) {
  return (
    <label className="flex-1 min-w-0 bg-light p-4 rounded-2xl border border-light-border">
      <span className="block text-light-muted text-[10px] font-bold tracking-widest mb-1.5">{label}</span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent outline-none text-light-text font-bold"
      />
    </label>
  );
}
