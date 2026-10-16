import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, ShieldCheck, KeyRound, ArrowRight } from 'lucide-react';
import { Button, Input } from '../components/ui';
import { toast } from '../components/Dialog';
import { sendSignupOtp, registerFaculty, loginUser } from '../lib/auth';
import { getErrorMessage } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { AuthShell } from './Login';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Faculty sign-up: details first, then the code emailed to them. */
export default function RegisterPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [step, setStep] = useState<'details' | 'code'>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSendCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Enter your full name');
    if (!EMAIL_RE.test(email.trim())) return setError('Please enter a valid email address');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    if (password !== confirm) return setError('Passwords do not match');

    try {
      setError('');
      setLoading(true);
      await sendSignupOtp(email.trim());
      toast(`We sent a 6-digit code to ${email.trim()}`);
      setStep('code');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to send the code.'));
    } finally {
      setLoading(false);
    }
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return setError('Enter the 6-digit code from your email');

    try {
      setError('');
      setLoading(true);
      await registerFaculty({ name: name.trim(), email: email.trim(), password, otp });
      // Sign straight in with the new account
      const res = await loginUser({ email: email.trim(), password });
      login(res.token, res.user);
      toast('Account created. Welcome!');
      navigate('/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create the account.'));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await sendSignupOtp(email.trim());
      toast('A new code is on its way.');
    } catch (err) {
      toast(getErrorMessage(err, 'Failed to send the code.'), 'error');
    }
  };

  return (
    <AuthShell
      title="Create account"
      subtitle={step === 'details' ? 'Faculty sign-up' : `Enter the code sent to ${email.trim()}`}
      footer={
        <p className="mt-6 text-center text-white/80 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-white font-bold">
            Sign in
          </Link>
        </p>
      }
    >
      {step === 'details' ? (
        <form onSubmit={onSendCode} noValidate>
          <Input label="Full Name" autoComplete="name" placeholder="e.g. Priya Sharma" icon={User} value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            label="Email Address"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            placeholder="name@university.edu"
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input label="Password" type="password" autoComplete="new-password" placeholder="Min 6 characters" icon={Lock} value={password} onChange={(e) => setPassword(e.target.value)} />
          <Input
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
            placeholder="Type it again"
            icon={ShieldCheck}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {error && <ErrorBox text={error} />}
          <Button title="Send Code" icon={ArrowRight} type="submit" loading={loading} className="mt-4 w-full" />
          <p className="text-light-muted text-xs leading-[18px] text-center mt-4">
            This creates a faculty account. Students sign up in the mobile app.
          </p>
        </form>
      ) : (
        <form onSubmit={onCreate} noValidate>
          <Input
            label="Code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit code"
            icon={KeyRound}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
          {error && <ErrorBox text={error} />}
          <Button title="Create Account" type="submit" loading={loading} className="mt-4 w-full" />
          <div className="flex justify-between mt-5 text-sm font-semibold">
            <button type="button" onClick={() => { setStep('details'); setError(''); }} className="text-light-muted">
              Change details
            </button>
            <button type="button" onClick={resend} className="text-primary">
              Resend code
            </button>
          </div>
        </form>
      )}
    </AuthShell>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <p role="alert" className="bg-danger-bg text-danger text-sm font-semibold rounded-2xl px-4 py-3 mb-2 leading-5">
      {text}
    </p>
  );
}
