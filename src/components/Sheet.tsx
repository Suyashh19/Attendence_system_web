import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Taller sheet for long lists */
  tall?: boolean;
}

/** Bottom sheet, like the app's BottomSheet. */
export function Sheet({ open, onClose, title, subtitle, children, tall = false }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    // Keep the page behind from scrolling while the sheet is up
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal aria-label={title}>
      <div className="absolute inset-0 bg-navy/55 animate-fade-in" onClick={onClose} />
      <div
        className={`relative w-full max-w-md bg-light-card rounded-t-[28px] px-5 pt-2.5 pb-safe animate-sheet-up flex flex-col ${
          tall ? 'h-[84dvh]' : 'max-h-[88dvh]'
        }`}
      >
        <div className="w-10 h-1.5 rounded-full bg-light-border mx-auto mb-4 shrink-0" />
        <div className="flex items-start mb-4 shrink-0">
          <div className="flex-1 mr-3">
            <h2 className="text-light-text text-lg font-extrabold">{title}</h2>
            {subtitle && <p className="text-light-muted text-[13px] font-medium mt-0.5 leading-[18px]">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-light flex items-center justify-center text-light-muted shrink-0"
          >
            <X size={18} />
          </button>
        </div>
        <div className={`overflow-y-auto pb-6 ${tall ? 'flex-1 flex flex-col min-h-0' : ''}`}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
