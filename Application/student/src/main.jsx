import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../../shell/src/context/AuthContext';
import { ToastProvider } from '../../shell/src/components/feedback/Toast';
import ShellGuard from './ShellGuard';
import StudentLookupPage from '../StudentLookupPage';
import '../../shell/src/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ShellGuard moduleName="Student Directory" modulePort={5176}>
            <div className="p-4 max-w-7xl mx-auto">
              <Routes>
                <Route index element={<StudentLookupPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </ShellGuard>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
