import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from './ui';

// Stand-ins for the app's Alert.alert: a confirm dialog that returns a promise, and a toast.

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface DialogState {
  confirm: (ConfirmOptions & { resolve: (ok: boolean) => void }) | null;
  toast: { message: string; tone: 'success' | 'error'; id: number } | null;
}

const useDialogStore = create<DialogState>(() => ({ confirm: null, toast: null }));

/** Asks the user to confirm. Resolves true when they do. */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => useDialogStore.setState({ confirm: { ...options, resolve } }));
}

/** Shows a short message at the top of the screen. */
export function toast(message: string, tone: 'success' | 'error' = 'success'): void {
  useDialogStore.setState({ toast: { message, tone, id: Date.now() } });
}

export function DialogHost() {
  const { confirm, toast: current } = useDialogStore();

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => useDialogStore.setState({ toast: null }), current.tone === 'error' ? 5000 : 3000);
    return () => clearTimeout(timer);
  }, [current]);

  const close = (ok: boolean) => {
    confirm?.resolve(ok);
    useDialogStore.setState({ confirm: null });
  };

  return createPortal(
    <>
      {confirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" role="alertdialog" aria-modal>
          <div className="absolute inset-0 bg-navy/55 animate-fade-in" onClick={() => close(false)} />
          <div className="relative w-full max-w-sm bg-light-card rounded-3xl p-6 animate-fade-in">
            <h2 className="text-light-text text-lg font-extrabold">{confirm.title}</h2>
            <p className="text-light-muted text-sm font-medium mt-2 leading-5 whitespace-pre-line">{confirm.message}</p>
            <div className="flex mt-6 gap-3">
              <Button title={confirm.cancelLabel ?? 'Cancel'} variant="outline" size="sm" className="flex-1" onClick={() => close(false)} />
              <Button
                title={confirm.confirmLabel ?? 'OK'}
                variant={confirm.destructive ? 'danger' : 'primary'}
                size="sm"
                className="flex-1"
                onClick={() => close(true)}
              />
            </div>
          </div>
        </div>
      )}

      {current && (
        <div className="fixed inset-x-0 top-0 z-[70] flex justify-center px-4 pt-safe pointer-events-none">
          <div
            key={current.id}
            role="status"
            className={`mt-3 max-w-md w-full rounded-2xl px-4 py-3 flex items-start shadow-card animate-fade-in ${
              current.tone === 'error' ? 'bg-danger text-white' : 'bg-navy text-white'
            }`}
          >
            {current.tone === 'error' ? (
              <AlertCircle size={18} className="mr-2.5 mt-0.5 shrink-0" />
            ) : (
              <CheckCircle2 size={18} className="mr-2.5 mt-0.5 shrink-0" />
            )}
            <p className="text-sm font-semibold leading-5">{current.message}</p>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
