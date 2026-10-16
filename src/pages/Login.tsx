import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Smartphone } from 'lucide-react';
import { Button, Input } from '../components/ui';
import { loginUser } from '../lib/auth';
import { getErrorMessage } from '../lib/api';
import { useAuthStore } from '../store/authStore';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Card on the gradient, shared by the sign-in and reset-password screens (AuthShell in the app). */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="hero min-h-dvh flex flex-col items-center px-5" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-white mb-8">
          <img src="/apple-touch-icon.png" alt="" className="w-16 h-16 rounded-2xl mb-4 shadow-glow" />
          <h1 className="text-[28px] font-extrabold">{title}</h1>
          <p className="text-white/70 text-sm font-medium mt-1 text-center">{subtitle}</p>
        </div>
        <div className="bg-light-card rounded-[28px] p-6 shadow-card">{children}</div>
        {footer}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!EMAIL_RE.test(email.trim())) next.email = 'Please enter a valid email address';
    if (password.length < 6) next.password = 'Password must be at least 6 characters';
    setErrors(next);
    if (next.email || next.password) return;

    try {
      setLoading(true);
      const res = await loginUser({ email: email.trim(), password });
      login(res.token, res.user);
      navigate('/', { replace: true });
    } catch (err) {
      setErrors({ form: getErrorMessage(err, 'Failed to sign in. Please try again.') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Faculty sign-in for iPhone"
      footer={
        <div className="mt-6 bg-white/10 border border-white/15 rounded-2xl px-4 py-3 flex items-start text-white">
          <Smartphone size={18} className="mr-3 mt-0.5 shrink-0 text-white/80" />
          <p className="text-[13px] leading-[18px] text-white/80">
            <span className="font-bold text-white">Students:</span> sign up and mark attendance in the mobile app.
            Student accounts cannot sign in here.
          </p>
        </div>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        <Input
          label="Email Address"
          type="email"
          placeholder="name@university.edu"
          autoComplete="username"
          autoCapitalize="none"
          icon={Mail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          icon={Lock}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />

        {errors.form && (
          <p role="alert" className="bg-danger-bg text-danger text-sm font-semibold rounded-2xl px-4 py-3 mb-2 leading-5">
            {errors.form}
          </p>
        )}

        <Button title="Sign In" icon={ArrowRight} type="submit" loading={loading} className="mt-4 w-full" />

        <div className="mt-5 text-center">
          <Link to="/forgot-password" className="text-primary font-semibold text-sm">
            Forgot password?
          </Link>
        </div>
        <p className="mt-4 text-center text-light-muted text-sm">
          New faculty?{' '}
          <Link to="/register" className="text-primary font-bold">
            Create an account
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
