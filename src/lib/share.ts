import { toast, confirmDialog } from '../components/Dialog';
import type { Subject } from '../types';
import { shareMessage } from '../utils/subjectText';

/** Opens the phone's share sheet (WhatsApp, Messages, ...) with the join message for a subject. */
export async function shareSubjectCode(subject: Pick<Subject, 'name' | 'code' | 'type' | 'span'>): Promise<void> {
  const text = shareMessage(subject);

  if (navigator.share) {
    try {
      await navigator.share({ text });
    } catch (err) {
      // Closing the share sheet rejects with AbortError: that is not a failure
      if ((err as DOMException)?.name !== 'AbortError') toast('Could not share. Please try again.', 'error');
    }
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    toast('Message copied. Paste it into WhatsApp or Messages.');
  } catch {
    toast('Could not share. Please try again.', 'error');
  }
}

/** Confirms a subject was saved and offers to send its code to students straight away. */
export async function offerToShareSubject(subject: Subject, title = 'Subject created'): Promise<void> {
  const share = await confirmDialog({
    title,
    message: `${subject.name} is ready. Share the code ${subject.code} so your students can join.`,
    confirmLabel: 'Share code',
    cancelLabel: 'Done',
  });
  if (share) await shareSubjectCode(subject);
}
