import { Sheet } from './Sheet';
import { Button, Chip, SegmentedControl } from './ui';
import { OTHER_YEAR, currentAcademicYear, type Term } from '../utils/academicYear';
import { NO_FILTERS, activeFilterCount, type ClassFilters } from '../utils/classesView';

interface ClassFilterSheetProps {
  open: boolean;
  onClose: () => void;
  filters: ClassFilters;
  onChange: (filters: ClassFilters) => void;
  /** Academic years the faculty has subjects in (OTHER_YEAR for those without one) */
  years: string[];
  counts: { all: number; theory: number; practical: number };
  /** Recent classes: the faculty's subjects, offered as a "Subject" filter */
  subjects?: { id: number; name: string; code: string; type: string }[];
}

const MAX_CHIP_NAME = 24;

/** The subject's name, cut short for a chip. Subjects sharing a name get their type added so they stay apart. */
function subjectChipLabel(subject: { id: number; name: string; type: string }, all: { id: number; name: string }[]): string {
  const name = subject.name.length > MAX_CHIP_NAME ? `${subject.name.slice(0, MAX_CHIP_NAME - 1).trimEnd()}…` : subject.name;
  const shared = all.some((other) => other.id !== subject.id && other.name === subject.name);
  return shared ? `${name} · ${subject.type === 'practical' ? 'Practical' : 'Theory'}` : name;
}

type TypeKey = 'all' | 'theory' | 'practical';
type TermKey = 'all' | Term;

const TYPE_OPTIONS: { key: TypeKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'theory', label: 'Theory' },
  { key: 'practical', label: 'Practical' },
];

const TERM_OPTIONS: { key: TermKey; label: string }[] = [
  { key: 'all', label: 'Both' },
  { key: 'Odd', label: 'Odd' },
  { key: 'Even', label: 'Even' },
];

/** Type, academic year and semester filters. Changes apply as they are made. */
export function ClassFilterSheet({ open, onClose, filters, onChange, years, counts, subjects }: ClassFilterSheetProps) {
  const current = currentAcademicYear();
  const active = activeFilterCount(filters);

  return (
    <Sheet open={open} onClose={onClose} title="Filters" subtitle="Narrow down your subjects.">
      <p className="text-light-text font-semibold mb-2 ml-1 text-[13px]">Type · {filters.category ? counts[filters.category] : counts.all}</p>
      <SegmentedControl<TypeKey>
        options={TYPE_OPTIONS}
        value={filters.category ?? 'all'}
        onChange={(key) => onChange({ ...filters, category: key === 'all' ? null : key })}
        className="mb-5"
      />

      {years.length > 0 && (
        <>
          <p className="text-light-text font-semibold mb-2 ml-1 text-[13px]">Academic year</p>
          <div className="flex flex-wrap gap-2 mb-4">
            <Chip label="All years" selected={filters.year === null} onClick={() => onChange({ ...filters, year: null })} />
            {years.map((year) => (
              <Chip
                key={year}
                label={year === OTHER_YEAR ? 'Other' : year === current ? `${year} · Current` : year}
                selected={filters.year === year}
                onClick={() => onChange({ ...filters, year })}
              />
            ))}
          </div>
        </>
      )}

      {subjects && subjects.length > 0 && (
        <>
          <p className="text-light-text font-semibold mb-2 ml-1 text-[13px]">Subject</p>
          <div className="flex gap-2 overflow-x-auto -mx-6 px-6 pb-1 mb-4">
            <Chip label="All subjects" selected={!filters.subjectId} onClick={() => onChange({ ...filters, subjectId: null })} />
            {subjects.map((s) => (
              <Chip
                key={s.id}
                label={subjectChipLabel(s, subjects)}
                selected={filters.subjectId === s.id}
                onClick={() => onChange({ ...filters, subjectId: s.id })}
              />
            ))}
          </div>
        </>
      )}

      <p className="text-light-text font-semibold mb-2 ml-1 text-[13px]">Semester</p>
      <SegmentedControl<TermKey>
        options={TERM_OPTIONS}
        value={filters.term ?? 'all'}
        onChange={(key) => onChange({ ...filters, term: key === 'all' ? null : key })}
        className="mb-6"
      />

      <div className="flex gap-3">
        <Button title="Clear all" variant="outline" onClick={() => onChange(NO_FILTERS)} disabled={active === 0} className="flex-1" />
        <Button title="Done" onClick={onClose} className="flex-1" />
      </div>
    </Sheet>
  );
}
