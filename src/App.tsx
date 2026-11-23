import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/types';
import { AppShell } from '@/components/layout/AppShell';
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const HomePage = lazy(() => import('@/pages/HomePage'));
const MyDayPage = lazy(() => import('@/pages/MyDayPage'));
const AccountsPage = lazy(() => import('@/pages/AccountsPage'));
const AccountDetailPage = lazy(() => import('@/pages/AccountDetailPage'));
const MeetingsPage = lazy(() => import('@/pages/MeetingsPage'));
const PipelinePage = lazy(() => import('@/pages/PipelinePage'));
const SqlPage = lazy(() => import('@/pages/SqlPage'));
const TasksPage = lazy(() => import('@/pages/TasksPage'));
const SequencesPage = lazy(() => import('@/pages/SequencesPage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const TeamPage = lazy(() => import('@/pages/TeamPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));

function Guard({ roles, children }: { roles: Role[]; children: JSX.Element }) {
  const { is } = useAuth();
  return is(...roles) ? children : <Navigate to="/" replace />;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="flex h-full items-center justify-center text-ink-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }
  const spinner = <div className="flex h-full items-center justify-center text-ink-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!user) {
    return (
      <Suspense fallback={spinner}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    );
  }
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center text-ink-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>}>
    <Routes>
      <Route path="welcome" element={<LandingPage />} />
      <Route path="login" element={<Navigate to="/" replace />} />
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="my-day" element={<Guard roles={['BDR']}><MyDayPage /></Guard>} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="my-leads" element={<Guard roles={['AE']}><AccountsPage myLeads /></Guard>} />
        <Route path="meetings" element={<Guard roles={['AE']}><MeetingsPage /></Guard>} />
        <Route path="accounts/:id" element={<AccountDetailPage />} />
        <Route path="pipeline" element={<Guard roles={['AE', 'MANAGER', 'ADMIN']}><PipelinePage /></Guard>} />
        <Route path="sql" element={<Guard roles={['BDR', 'MANAGER', 'ADMIN']}><SqlPage /></Guard>} />
        <Route path="sequences" element={<Guard roles={['BDR', 'MANAGER', 'ADMIN']}><SequencesPage /></Guard>} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="reports" element={<Guard roles={['MANAGER', 'ADMIN']}><ReportsPage /></Guard>} />
        <Route path="team" element={<Guard roles={['MANAGER', 'ADMIN']}><TeamPage /></Guard>} />
        <Route path="settings" element={<Guard roles={['MANAGER', 'ADMIN']}><SettingsPage /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    </Suspense>
  );
}
