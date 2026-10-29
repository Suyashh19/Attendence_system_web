import { useEffect, useState } from 'react';
import { Sheet } from './Sheet';
import { Button } from './ui';

const MAX_NOTE_LENGTH = 200;

interface LeaveRejectSheetProps {
  open: boolean;
  studentName: string;
  onClose: () => void;
  /** Called with the note, which may be empty */
  onConfirm: (note: string) => void;
}

/** Rejecting a leave request: an optional note the student will see. */
export function LeaveRejectSheet({ open, studentName, onClose, onConfirm }: LeaveRejectSheetProps) {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) setNote('');
  }, [open]);

  return (
    <Sheet open={open} onClose={onClose} title="Not approving this leave" subtitle={`${studentName} will be told. A short note helps them understand.`}>
      <p className="text-light-muted font-bold text-xs tracking-widest mb-2">NOTE (OPTIONAL)</p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE_LENGTH))}
        placeholder="e.g. Please bring a medical certificate"
        rows={3}
        className="w-full bg-light rounded-2xl border border-light-border px-4 py-3 outline-none focus:border-primary text-light-text font-medium placeholder:text-light-subtle resize-none"
      />
      <p className="text-light-subtle text-[11px] font-medium text-right mt-1 mb-4">
        {note.length}/{MAX_NOTE_LENGTH}
      </p>

      <div className="flex gap-3">
        <Button title="Cancel" variant="outline" onClick={onClose} className="flex-1" />
        <Button title="Reject" variant="danger" onClick={() => onConfirm(note.trim())} className="flex-1" />
      </div>
    </Sheet>
  );
}
