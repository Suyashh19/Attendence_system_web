import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, KeyRound, Lock } from 'lucide-react';
import { Button, Input } from '../components/ui';
import { toast } from '../components/Dialog';
import { forgotPassword, resetPassword } from '../lib/auth';
import { getErrorMessage } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { AuthShell } from './Login';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSendCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }
    try {
      setError('');
      setLoading(true);
      const res = await forgotPassword(email.trim());
      toast(res.message || 'Check your email for the code.');
      setStep('reset');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to send the code.'));
    } finally {
      setLoading(false);
    }
  };

  const onReset = async (e: FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Enter the 6-digit code from your email');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    try {
      setError('');
      setLoading(true);
      await resetPassword({ email: email.trim(), otp, newPassword });
      toast('Password has been reset. Sign in with the new one.');
      navigate(isAuthenticated ? '/profile' : '/login', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to reset the password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset password"
      subtitle={step === 'email' ? 'Enter your email to receive a code' : 'Enter the code from your email and a new password'}
      footer={
        <div className="mt-6 text-center">
          <Link to={isAuthenticated ? '/profile' : '/login'} className="text-white font-bold text-sm">
            {isAuthenticated ? 'Back to Profile' : 'Back to Sign In'}
          </Link>
        </div>
      }
    >
      <form onSubmit={step === 'email' ? onSendCode : onReset} noValidate>
        <Input
          label="Email Address"
          type="email"
          placeholder="name@university.edu"
          autoComplete="username"
          autoCapitalize="none"
          icon={Mail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={step === 'reset'}
        />

        {step === 'reset' && (
          <>
            <Input
              label="Code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit code"
              icon={KeyRound}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <Input
              label="New Password"
              type="password"
              autoComplete="new-password"
              placeholder="Min 6 characters"
              icon={Lock}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </>
        )}

        {error && (
          <p role="alert" className="bg-danger-bg text-danger text-sm font-semibold rounded-2xl px-4 py-3 mb-2 leading-5">
            {error}
          </p>
        )}

        <Button title={step === 'email' ? 'Send Code' : 'Reset Password'} type="submit" loading={loading} className="mt-4 w-full" />
      </form>
    </AuthShell>
  );
}
