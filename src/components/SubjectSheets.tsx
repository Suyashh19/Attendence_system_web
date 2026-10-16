import { useEffect, useState } from 'react';
import { School, Tag, BookOpen, FlaskConical, Download, FileText, CheckCircle2 } from 'lucide-react';
import { Sheet } from './Sheet';
import { Button, Input, SegmentedControl } from './ui';
import { toast } from './Dialog';
import { createSubject } from '../lib/attendance';
import { getErrorMessage } from '../lib/api';
import type { Subject } from '../types';

const TYPES = [
  { key: 'theory' as const, label: 'Theory', icon: BookOpen },
  { key: 'practical' as const, label: 'Practical', icon: FlaskConical },
];

interface CreateSubjectSheetProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (type: 'theory' | 'practical') => void;
}

export function CreateSubjectSheet({ open, onClose, onSuccess }: CreateSubjectSheetProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<'theory' | 'practical'>('theory');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      toast('Enter both a subject name and a subject code.', 'error');
      return;
    }
    try {
      setLoading(true);
      await createSubject(name.trim(), code.trim(), type);
      onSuccess(type);
      setName('');
      setCode('');
      setType('theory');
    } catch (err) {
      toast(getErrorMessage(err, 'Could not create the subject. Please try again.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="New subject" subtitle="Students enroll with the subject code you set here.">
      <form onSubmit={handleCreate}>
        <Input label="Subject name" placeholder="e.g. Distributed Systems" icon={School} value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          label="Subject code"
          placeholder="e.g. CS402"
          icon={Tag}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect="off"
        />
        <p className="text-light-text font-semibold mb-2 ml-1 text-[13px]">Type</p>
        <SegmentedControl options={TYPES} value={type} onChange={setType} className="mb-6" />
        <div className="flex gap-3">
          <Button title="Cancel" variant="outline" onClick={onClose} disabled={loading} className="flex-1" />
          <Button title="Create" type="submit" loading={loading} className="flex-1" />
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
  const [start, setStart] = useState(() => toInputDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))); // last 30 days
  const [end, setEnd] = useState(() => toInputDate(new Date()));

  // Each time the sheet opens, start on the subject whose download button was tapped
  useEffect(() => {
    if (open) setSubjectId(initialSubjectId ?? subjects[0]?.id);
  }, [open, initialSubjectId, subjects]);

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
    <Sheet
      open={open}
      onClose={onClose}
      title="Export Attendance"
      subtitle={selected ? selected.name : 'Choose a subject and a date range.'}
    >
      <p className="text-light-muted font-bold text-xs tracking-widest mb-3">SELECT SUBJECT</p>
      <div className="flex gap-2 overflow-x-auto -mx-6 px-6 pb-1 mb-6">
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
      <div className="flex gap-3 mb-6">
        <DateField label="FROM" value={start} onChange={setStart} max={end} />
        <DateField label="TO" value={end} onChange={setEnd} min={start} />
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

      <Button title="Download Excel" icon={Download} onClick={handleConfirm} loading={loading} className="mt-6 w-full" />
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
    <label className="flex-1 bg-light p-4 rounded-2xl border border-light-border">
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
