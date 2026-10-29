import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Library, BarChart3, User, ChevronLeft, CloudSun } from 'lucide-react';
import { useServerStatus } from '../lib/api';
import { useSocket } from '../hooks/useSocket';

const TABS = [
  { to: '/', label: 'Classes', icon: Library },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/profile', label: 'Profile', icon: User },
];

/** The signed-in shell: the page plus the bottom tab bar. */
export function TabLayout() {
  const queryClient = useQueryClient();

  // A leave request was sent or answered: refresh the lists, and the attendance an approval changed
  useSocket({
    onLeaveUpdated: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['subject-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['session-details'] });
    },
  });

  return (
    <div className="min-h-dvh flex flex-col max-w-md mx-auto bg-light">
      <main className="flex-1 pb-28">
        <Outlet />
      </main>
      <nav
        className="fixed bottom-0 inset-x-0 z-30 max-w-md mx-auto flex bg-light-card rounded-t-[28px] px-3 pt-3 shadow-raised"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 10px)' }}
      >
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center ${isActive ? 'text-primary' : 'text-light-subtle'}`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`w-16 h-9 rounded-full flex items-center justify-center ${isActive ? 'bg-light-primaryBg' : ''}`}>
                  <Icon size={22} />
                </span>
                <span className={`text-[11px] mt-1 ${isActive ? 'font-bold' : 'font-semibold'}`}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

interface HeaderProps {
  title: string;
  subtitle?: string;
  /** Small caps line above the title (tab screens) */
  eyebrow?: string;
  back?: boolean;
  right?: React.ReactNode;
  children?: React.ReactNode;
}

/** Gradient header used at the top of every screen. */
export function ScreenHeader({ title, subtitle, eyebrow, back = false, right, children }: HeaderProps) {
  const navigate = useNavigate();
  return (
    <header className="hero rounded-b-[32px] px-5 pb-6 text-white" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
      <div className="flex items-center">
        {back && (
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
            aria-label="Back"
            className="w-11 h-11 bg-white/10 border border-white/15 rounded-full flex items-center justify-center mr-3 shrink-0"
          >
            <ChevronLeft size={22} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          {eyebrow && <p className="text-white/60 text-[11px] font-bold tracking-widest mb-1">{eyebrow}</p>}
          <h1 className="text-[22px] font-extrabold truncate">{title}</h1>
          {subtitle && <p className="text-white/70 text-[13px] font-medium mt-0.5 truncate">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </header>
  );
}

/** Shown while a request is slow because the free server is waking up. */
export function ServerWakeBanner() {
  const slow = useServerStatus((s) => s.slowRequests > 0);
  if (!slow) return null;
  return (
    <div className="fixed inset-x-0 z-50 flex justify-center px-4 pointer-events-none" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}>
      <div className="max-w-md w-full bg-navy text-white rounded-2xl px-4 py-3 flex items-center shadow-card animate-fade-in" role="status">
        <CloudSun size={18} className="mr-2.5 shrink-0" />
        <p className="text-[13px] font-semibold leading-[18px]">Waking up the server. This can take up to a minute the first time.</p>
      </div>
    </div>
  );
}
