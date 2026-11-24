import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../../shell/src/context/AuthContext';
import { ToastProvider } from '../../shell/src/components/feedback/Toast';
import ShellGuard from './ShellGuard';
import DepartmentOverview from './DepartmentOverview';
import StudentSubjectLookupPage from '../StudentSubjectLookupPage';
import HODStaffOverviewPage from '../HODStaffOverviewPage';
import JobRosterPage from '../JobRosterPage';
import CreateSchedulePage from '../CreateSchedulePage';
import '../../shell/src/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ShellGuard moduleName="Department Workflows" modulePort={5175}>
            <div className="p-4 max-w-7xl mx-auto">
              <Routes>
                <Route index element={<DepartmentOverview />} />
                <Route path="student-lookup" element={<StudentSubjectLookupPage />} />
                <Route path="hod-overview" element={<HODStaffOverviewPage />} />
                <Route path="job-roster" element={<JobRosterPage />} />
                <Route path="create-schedule" element={<CreateSchedulePage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </ShellGuard>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
