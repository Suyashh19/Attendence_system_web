import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogOut, Trash2, ChevronRight, Briefcase, KeyRound, ShieldCheck, Share, PlusSquare, type LucideIcon } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { requestPasswordChange, confirmPasswordChange, deleteAccount } from '../lib/auth';
import { maskEmail } from '../utils/maskEmail';
import { getErrorMessage } from '../lib/api';
import { Button, Card, Input, SectionLabel } from '../components/ui';
import { Sheet } from '../components/Sheet';
import { confirmDialog, toast } from '../components/Dialog';

// Running from the Home Screen icon rather than a Safari tab
const isStandalone =
  (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches) ||
  (typeof navigator !== 'undefined' && (navigator as Navigator & { standalone?: boolean }).standalone === true);

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  // Password change: a code is emailed to the account address first
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordOtp, setPasswordOtp] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Deleting an account needs the account password
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleLogout = async () => {
    const ok = await confirmDialog({ title: 'Sign Out', message: 'Are you sure you want to sign out?', confirmLabel: 'Sign Out', destructive: true });
    if (!ok) return;
    logout();
    navigate('/login', { replace: true });
  };

  // Asks first, then emails a code to the registered address. The user never types an email.
  const handleStartPasswordChange = async () => {
    const ok = await confirmDialog({
      title: 'Change password?',
      message: `We will email a 6-digit code to ${maskEmail(user?.email)} to confirm it is you.`,
      confirmLabel: 'Send code',
    });
    if (ok) await sendPasswordCode(true);
  };

  const sendPasswordCode = async (openSheet: boolean) => {
    try {
      setSendingCode(true);
      await requestPasswordChange();
      setPasswordOtp('');
      if (openSheet) {
        setNewPassword('');
        setConfirmPassword('');
        setPasswordOpen(true);
      } else {
        toast(`A new code is on its way to ${maskEmail(user?.email)}.`);
      }
    } catch (err) {
      toast(getErrorMessage(err, 'Could not send the code. Please try again.'), 'error');
    } finally {
      setSendingCode(false);
    }
  };

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (passwordOtp.trim().length !== 6) return toast('Enter the 6-digit code from your email.', 'error');
    if (!newPassword || !confirmPassword) return toast('Enter and confirm your new password.', 'error');
    if (newPassword.length < 6) return toast('New password must be at least 6 characters.', 'error');
    if (newPassword !== confirmPassword) return toast('New passwords do not match.', 'error');

    try {
      setSavingPassword(true);
      const res = await confirmPasswordChange({ otp: passwordOtp.trim(), newPassword });
      toast(res.message || 'Password updated.');
      setPasswordOpen(false);
      setPasswordOtp('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast(getErrorMessage(err, 'Failed to update the password.'), 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  // Opens the password sheet: deleting needs the account password, not just a tap
  const openDelete = () => {
    setDeletePassword('');
    setDeleteOpen(true);
  };

  const handleDeleteAccount = async (e: FormEvent) => {
    e.preventDefault();
    if (!deletePassword) return toast('Enter your password to delete your account.', 'error');
    try {
      setDeleting(true);
      await deleteAccount(deletePassword);
      setDeleteOpen(false);
      logout();
      navigate('/login', { replace: true });
      toast('Your account has been deleted.');
    } catch (err) {
      toast(getErrorMessage(err, 'Could not delete the account.'), 'error');
    } finally {
      setDeleting(false);
      setDeletePassword('');
    }
  };

  return (
    <div>
      <header className="hero rounded-b-[32px] px-5 pb-16 flex flex-col items-center text-white" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 24px)' }}>
        <div className="w-[100px] h-[100px] rounded-full border-2 border-gold flex items-center justify-center mb-4">
          <div className="w-[86px] h-[86px] bg-white/15 rounded-full flex items-center justify-center text-4xl font-extrabold">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
        <h1 className="text-2xl font-extrabold truncate max-w-full">{user?.name}</h1>
        <span className="bg-white/10 border border-white/15 px-3 h-7 rounded-full mt-2 flex items-center text-[11px] font-bold uppercase tracking-widest">
          <Briefcase size={12} className="mr-1.5" />
          Faculty account
        </span>
      </header>

      <div className="px-4 -mt-10">
        <Card className="overflow-hidden mb-6">
          <div className="p-4 flex items-center">
            <span className="w-11 h-11 rounded-2xl bg-light-primaryBg text-primary flex items-center justify-center mr-4 shrink-0">
              <Mail size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-light-muted text-[11px] font-bold tracking-widest mb-1">EMAIL ADDRESS</p>
              <p className="text-light-text font-semibold text-[15px] truncate">{user?.email}</p>
            </div>
          </div>
        </Card>

        {!isStandalone && (
          <Card className="p-4 mb-6">
            <p className="text-light-text font-bold text-[15px] mb-1">Add to your Home Screen</p>
            <p className="text-light-muted text-xs leading-[18px]">
              Open this page in Safari, tap <Share size={13} className="inline -mt-0.5 text-primary" /> Share, then{' '}
              <PlusSquare size={13} className="inline -mt-0.5 text-primary" /> Add to Home Screen. It then opens full screen like an app.
            </p>
          </Card>
        )}

        <SectionLabel className="mb-3 ml-1">ACCOUNT</SectionLabel>
        <Card className="overflow-hidden mb-6">
          <SettingsRow icon={Lock} title="Update Password" subtitle="Change the password you sign in with" onClick={handleStartPasswordChange} divider />
          <SettingsRow icon={LogOut} title="Sign Out" subtitle="You will need to sign in again" onClick={handleLogout} />
        </Card>

        <p className="text-danger font-bold text-xs tracking-widest mb-3 ml-1">DANGER ZONE</p>
        <Card className="overflow-hidden border-danger/20">
          <SettingsRow icon={Trash2} title="Delete Account" subtitle="Permanently removes your data" tone="danger" onClick={openDelete} />
        </Card>

        <p className="text-center text-light-subtle text-xs font-medium mt-8">Attendance System · Web v1.2.0</p>
      </div>

      <Sheet open={passwordOpen} onClose={() => setPasswordOpen(false)} title="Update Password" subtitle={`Enter the code we emailed to ${maskEmail(user?.email)}, then choose a new password.`}>
        <form onSubmit={handleUpdatePassword}>
          <Input
            label="6-digit code"
            placeholder="123456"
            icon={Mail}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={passwordOtp}
            onChange={(e) => setPasswordOtp(e.target.value.replace(/\D/g, ''))}
          />
          <button
            type="button"
            onClick={() => sendPasswordCode(false)}
            disabled={sendingCode}
            className="block ml-auto -mt-2 mb-4 text-primary font-semibold text-xs"
          >
            {sendingCode ? 'Sending...' : 'Resend code'}
          </button>
          <Input label="New Password" type="password" autoComplete="new-password" icon={KeyRound} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <Input
            label="Confirm New Password"
            type="password"
            autoComplete="new-password"
            icon={ShieldCheck}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match' : undefined}
          />
          <Button title="Save Password" type="submit" loading={savingPassword} className="mt-2 w-full" />
        </form>
      </Sheet>

      <Sheet
        open={deleteOpen}
        onClose={() => !deleting && setDeleteOpen(false)}
        title="Delete Account"
        subtitle="This permanently deletes your account, your subjects and their attendance records. It cannot be undone."
      >
        <form onSubmit={handleDeleteAccount}>
          <Input
            label="Enter your password to confirm"
            type="password"
            autoComplete="current-password"
            icon={Lock}
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
          />
          <div className="flex gap-3 mt-2">
            <Button title="Cancel" variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting} className="flex-1" />
            <Button title="Delete" type="submit" variant="danger" loading={deleting} disabled={!deletePassword} className="flex-1" />
          </div>
        </form>
      </Sheet>
    </div>
  );
}

/** One tappable line in a settings card: icon, title, a short explanation and a chevron. */
function SettingsRow({
  icon: Icon,
  title,
  subtitle,
  onClick,
  tone = 'default',
  divider = false,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
  divider?: boolean;
}) {
  const danger = tone === 'danger';
  return (
    <button type="button" onClick={onClick} className={`w-full p-4 flex items-center text-left ${divider ? 'border-b border-light-border' : ''}`}>
      <span className={`w-11 h-11 rounded-2xl flex items-center justify-center mr-4 shrink-0 ${danger ? 'bg-danger-bg text-danger' : 'bg-light text-light-text'}`}>
        <Icon size={20} />
      </span>
      <span className="flex-1">
        <span className={`block font-bold text-[15px] ${danger ? 'text-danger' : 'text-light-text'}`}>{title}</span>
        <span className={`block text-xs font-medium mt-0.5 ${danger ? 'text-danger/70' : 'text-light-muted'}`}>{subtitle}</span>
      </span>
      <ChevronRight size={18} className={danger ? 'text-danger' : 'text-light-subtle'} />
    </button>
  );
}
