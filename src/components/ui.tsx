import React from 'react';
import { Loader2, Pencil, type LucideIcon } from 'lucide-react';
import { initials, statusTone } from '../theme';

// Small building blocks, matching the mobile app's components of the same names.

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'dangerSoft' | 'ghost';

// primary: the one main action on a screen. secondary/outline/ghost: everything else.
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white shadow-glow',
  secondary: 'bg-light-primaryBg text-primary',
  outline: 'bg-light-card border border-light-border text-light-text',
  danger: 'bg-danger text-white',
  dangerSoft: 'bg-danger-bg text-danger',
  ghost: 'bg-transparent text-primary',
};

const SIZES = {
  sm: { box: 'h-11 px-4 rounded-xl text-sm', icon: 16 },
  md: { box: 'h-[46px] px-5 rounded-2xl text-[15px]', icon: 18 },
};

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  title: string;
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  loading?: boolean;
  icon?: LucideIcon;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  icon: Icon,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  const s = SIZES[size];
  const inactive = disabled || loading;
  return (
    <button
      type={type}
      disabled={inactive}
      aria-busy={loading}
      className={`tap flex items-center justify-center font-bold ${VARIANTS[variant]} ${s.box} ${
        inactive ? 'opacity-55 shadow-none' : ''
      } ${className}`}
      {...rest}
    >
      {loading ? (
        <Loader2 size={20} className="animate-spin" />
      ) : (
        <>
          {Icon && <Icon size={s.icon} className="mr-2 shrink-0" />}
          {title}
        </>
      )}
    </button>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, icon: Icon, error, className = '', id, ...rest },
  ref
) {
  const inputId = id ?? (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return (
    <div className={`mb-3 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-light-text font-semibold mb-1.5 ml-1 text-[13px]">
          {label}
        </label>
      )}
      <div
        className={`flex items-center bg-light-card border rounded-2xl px-4 h-[46px] focus-within:border-primary ${
          error ? 'border-danger' : 'border-light-border'
        }`}
      >
        {Icon && <Icon size={18} className="text-light-subtle mr-3 shrink-0" />}
        <input
          ref={ref}
          id={inputId}
          className="flex-1 min-w-0 bg-transparent outline-none text-light-text font-medium placeholder:text-light-subtle"
          {...rest}
        />
      </div>
      {error && <p className="text-danger text-xs font-medium mt-1.5 ml-1">{error}</p>}
    </div>
  );
});

export function Card({ className = '', children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`bg-light-card rounded-3xl border border-light-border shadow-card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function Avatar({ name, size = 44, onDark = false }: { name?: string | null; size?: number; onDark?: boolean }) {
  return (
    <div
      className={`rounded-full flex items-center justify-center font-extrabold shrink-0 ${
        onDark ? 'bg-white/15 text-white' : 'bg-light-primaryBg text-primary'
      }`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}

interface ChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  icon?: LucideIcon;
  tone?: 'primary' | 'danger';
  className?: string;
}

export function Chip({ label, selected = false, onClick, icon: Icon, tone = 'primary', className = '' }: ChipProps) {
  const on = tone === 'danger' ? 'bg-danger text-white border-danger' : 'bg-primary text-white border-primary';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`tap h-9 px-4 rounded-full border text-[13px] font-bold flex items-center whitespace-nowrap shrink-0 ${
        selected ? on : 'bg-light-card text-light-muted border-light-border'
      } ${className}`}
    >
      {Icon && <Icon size={14} className="mr-1.5" />}
      {label}
    </button>
  );
}

export function StatusPill({ status, label, edited = false }: { status: string; /** Shown instead of the raw status */ label?: string; edited?: boolean }) {
  const tone = statusTone(status);
  return (
    <span className={`inline-flex items-center px-3 h-8 rounded-full text-[11px] font-bold tracking-wide ${tone.bg} ${tone.text}`}>
      {label ?? status}
      {edited && <Pencil size={10} className="ml-1.5" />}
    </span>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex justify-center ${className}`}>
      <Loader2 size={32} className="animate-spin text-primary" />
    </div>
  );
}

export function SectionLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-light-muted text-xs font-bold tracking-widest ${className}`}>{children}</p>;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title?: string;
  text: string;
  tone?: 'primary' | 'danger';
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, text, tone = 'primary', action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-4">
      <div
        className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
          tone === 'danger' ? 'bg-danger-bg text-danger' : 'bg-light-primaryBg text-primary'
        }`}
      >
        <Icon size={28} />
      </div>
      {title && <p className="text-light-text text-lg font-extrabold mb-1">{title}</p>}
      <p className="text-light-muted text-sm font-medium leading-5 max-w-xs">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

interface ProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  children?: React.ReactNode;
}

export function ProgressRing({ percent, size = 48, strokeWidth = 5, color, children }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E8E5F0" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

interface SegmentedProps<T extends string> {
  options: { key: T; label: string; badge?: number; icon?: LucideIcon }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({ options, value, onChange, className = '' }: SegmentedProps<T>) {
  return (
    <div className={`flex bg-light-card border border-light-border rounded-2xl p-1 ${className}`} role="tablist">
      {options.map(({ key, label, badge, icon: Icon }) => {
        const selected = key === value;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(key)}
            className={`flex-1 min-w-0 h-9 px-1 rounded-xl text-[13px] font-bold flex items-center justify-center transition-colors ${
              selected ? 'bg-primary text-white' : 'text-light-muted'
            }`}
          >
            {Icon && <Icon size={15} className="mr-1 shrink-0" />}
            <span className="truncate">{label}</span>
            {!!badge && (
              <span
                className={`ml-1 min-w-[18px] h-[18px] px-1 shrink-0 rounded-full text-[10px] flex items-center justify-center ${
                  selected ? 'bg-white/25 text-white' : 'bg-gold text-white'
                }`}
              >
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
