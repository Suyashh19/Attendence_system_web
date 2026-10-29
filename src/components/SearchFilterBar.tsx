import { Search, XCircle, SlidersHorizontal } from 'lucide-react';

interface SearchFilterBarProps {
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
  /** Number of filters switched on, shown on the button */
  filterCount: number;
  onOpenFilters: () => void;
  /** The line under the bar, e.g. "5 subjects · 2026-27 · Odd" */
  summary: string;
  /** Clears the search and every filter; the link shows only when there is something to clear */
  onShowAll: () => void;
}

/** Search box, a filter button with a count badge, and a one-line summary of what is showing. */
export function SearchFilterBar({ value, onChange, placeholder, filterCount, onOpenFilters, summary, onShowAll }: SearchFilterBarProps) {
  const active = filterCount > 0;

  return (
    <div>
      <div className="flex items-center">
        <div className="flex-1 min-w-0 flex items-center bg-light-card border border-light-border rounded-2xl px-4 h-[52px] focus-within:border-primary">
          <Search size={18} className="text-light-subtle mr-2.5 shrink-0" />
          <input
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            autoCapitalize="none"
            autoCorrect="off"
            enterKeyHint="search"
            className="flex-1 min-w-0 bg-transparent outline-none text-light-text font-medium placeholder:text-light-subtle"
          />
          {value && (
            <button type="button" onClick={() => onChange('')} aria-label="Clear search" className="text-light-subtle">
              <XCircle size={18} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenFilters}
          aria-label={active ? `Filters, ${filterCount} on` : 'Filters'}
          className={`tap relative ml-3 w-[52px] h-[52px] rounded-2xl flex items-center justify-center border shrink-0 ${
            active ? 'bg-navy border-navy text-white' : 'bg-light-card border-light-border text-light-muted'
          }`}
        >
          <SlidersHorizontal size={20} />
          {active && (
            <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-gold flex items-center justify-center text-[11px] font-bold text-white">
              {filterCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex items-center mt-3 min-h-8">
        <p className="text-light-muted text-xs font-semibold flex-1 truncate">{summary}</p>
        {(active || value.length > 0) && (
          <button type="button" onClick={onShowAll} className="text-primary text-xs font-bold pl-3 py-2">
            Show all
          </button>
        )}
      </div>
    </div>
  );
}
