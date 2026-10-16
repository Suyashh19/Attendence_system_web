import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { TabLayout, ServerWakeBanner } from './components/Layout';
import { DialogHost } from './components/Dialog';
import LoginPage from './pages/Login';
import ForgotPasswordPage from './pages/ForgotPassword';
import RegisterPage from './pages/Register';
import HomePage from './pages/Home';
import SubjectPage from './pages/Subject';
import LecturePage from './pages/Lecture';
import ReportsPage from './pages/Reports';
import ProfilePage from './pages/Profile';

// Signed-in screens; anyone else goes to the sign-in page
function RequireAuth() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

function GuestOnly() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        {/* Reachable signed in too, from Update Password */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<TabLayout />}>
            <Route index element={<HomePage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/subject/:id" element={<SubjectPage />} />
            <Route path="/lecture/:id" element={<LecturePage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ServerWakeBanner />
      <DialogHost />
    </>
  );
}
