import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppLayout } from './components/layout/AppLayout';

import { Dashboard } from './pages/Dashboard';
import { MeetingsPage } from './pages/MeetingsPage';
import { MeetingDetailPage } from './pages/MeetingDetailPage';
import { RecordPage } from './pages/RecordPage';
import { UploadPage } from './pages/UploadPage';
import { InviteBotPage } from './pages/InviteBotPage';
import { TasksPage } from './pages/TasksPage';
import { SearchPage } from './pages/SearchPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

const ProtectedRouteWrapper: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-wrapper">
        <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-primary)' }}>
          Loading PulseNote AI...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout />;
};

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/register',
    element: <RegisterPage />
  },
  {
    element: <ProtectedRouteWrapper />,
    children: [
      {
        path: '/',
        element: <Navigate to="/dashboard" replace />
      },
      {
        path: '/dashboard',
        element: <Dashboard />
      },
      {
        path: '/invite-bot',
        element: <InviteBotPage />
      },
      {
        path: '/meetings',
        element: <MeetingsPage />
      },
      {
        path: '/meetings/:meetingId',
        element: <MeetingDetailPage />
      },
      {
        path: '/record',
        element: <RecordPage />
      },
      {
        path: '/upload',
        element: <UploadPage />
      },
      {
        path: '/search',
        element: <SearchPage />
      },
      {
        path: '/tasks',
        element: <TasksPage />
      },
      {
        path: '/settings',
        element: <SettingsPage />
      },
      {
        path: '/profile',
        element: <SettingsPage />
      }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />
  }
]);

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
