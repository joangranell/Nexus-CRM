import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import { Spinner } from './components/ui';
import LoginPage from './pages/LoginPage';
import DashboardFunnel from './pages/DashboardFunnel';
import MyDay from './pages/MyDay';
import UserManual from './pages/UserManual';
import ImporterPage from './pages/ImporterPage';
import SandboxPage from './pages/SandboxPage';
import MailingPage from './pages/MailingPage';
import AISettingsPage from './pages/AISettingsPage';

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sf-bg">
        <Spinner label="Verificando sesión…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(user?.role)) {
      return <Navigate to="/my-day" replace />;
    }
  }

  return (
    <div className="min-h-screen flex flex-col app-backdrop">
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardFunnel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-day"
            element={
              <ProtectedRoute>
                <MyDay />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mailing"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN_MARKETING']}>
                <MailingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/imports"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN_MARKETING']}>
                <ImporterPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sandbox"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN_MARKETING']}>
                <SandboxPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manual"
            element={
              <ProtectedRoute>
                <UserManual />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/ai"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <AISettingsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
