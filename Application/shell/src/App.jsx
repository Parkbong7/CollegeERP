import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/feedback/Toast';
import Loader from './components/common/Loader';
import MicroFrontendViewport from './components/common/MicroFrontendViewport';

// Layout
import AppLayout from './components/layout/AppLayout';

// Pages
import LoginPage from './pages/auth/LoginPage';
import SettingsPage from './pages/settings/SettingsPage';
import DashboardOverview from './pages/DashboardOverview';
import AttendancePage from './pages/attendance/AttendancePage';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF8F1] flex items-center justify-center p-6">
        <Loader message="Authenticating session with College ERP Gateway..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login/ABC" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public tenant-scoped authentication */}
            <Route path="/login" element={<Navigate to="/login/ABC" replace />} />
            <Route
              path="/login/:tenantName"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />

            {/* Authenticated workspace */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              {/* Home / Landing Dashboard (Hosted directly on Shell Port 5173) */}
              <Route index element={<DashboardOverview />} />

              {/* Master Micro-Frontend (Running on Port 5174) */}
              <Route
                path="master"
                element={<MicroFrontendViewport port={5174} path="/" title="Master Configurations" />}
              />
              <Route
                path="master/year"
                element={<MicroFrontendViewport port={5174} path="/year" title="Year Master" />}
              />
              <Route
                path="master/staff"
                element={<MicroFrontendViewport port={5174} path="/staff" title="Staff Master" />}
              />
              <Route
                path="master/department"
                element={<MicroFrontendViewport port={5174} path="/department" title="Department Master" />}
              />

              {/* Department Micro-Frontend (Running on Port 5175) */}
              <Route
                path="department"
                element={<MicroFrontendViewport port={5175} path="/" title="Department Workflows" />}
              />
              <Route
                path="department/student-lookup"
                element={<MicroFrontendViewport port={5175} path="/student-lookup" title="Student Subject Lookup" />}
              />
              <Route
                path="department/hod-overview"
                element={<MicroFrontendViewport port={5175} path="/hod-overview" title="HOD Staff Overview" />}
              />
              <Route
                path="department/job-roster"
                element={<MicroFrontendViewport port={5175} path="/job-roster" title="Job Roster" />}
              />
              <Route
                path="department/create-schedule"
                element={<MicroFrontendViewport port={5175} path="/create-schedule" title="Create Schedule" />}
              />

              {/* Student Micro-Frontend (Running on Port 5176) */}
              <Route
                path="student"
                element={<MicroFrontendViewport port={5176} path="/" title="Student Directory" />}
              />

              {/* Attendance Management System */}
              <Route path="attendance" element={<AttendancePage />} />

              {/* Settings */}
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Wildcard redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
