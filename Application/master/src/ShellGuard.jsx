import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, ExternalLink } from 'lucide-react';

const SHELL_URL = 'http://localhost:5173';

// 1. Immediately & synchronously sync auth credentials before React renders
if (typeof window !== 'undefined') {
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const urlToken = searchParams.get('token');
    const urlUser = searchParams.get('user');
    if (urlToken) {
      localStorage.setItem('college_erp_token', urlToken);
      if (urlUser) localStorage.setItem('college_erp_user', urlUser);
    }
  } catch (e) {}
}

export default function ShellGuard({ moduleName, modulePort, children }) {
  // If running inside the Shell iframe, window.self !== window.top is TRUE.
  // It is already hosted inside the Shell container, so status is active immediately (0ms delay)!
  const isInsideShell = typeof window !== 'undefined' && window.self !== window.top;
  const [shellStatus, setShellStatus] = useState(isInsideShell ? 'active' : 'checking');

  const checkShellHealth = async () => {
    if (isInsideShell) {
      setShellStatus('active');
      return;
    }
    try {
      await fetch(`${SHELL_URL}/`, { mode: 'no-cors' });
      setShellStatus('active');
    } catch (err) {
      setShellStatus('inactive');
    }
  };

  useEffect(() => {
    // Listen to cross-origin sync messages from Shell host
    const handleMessage = (event) => {
      if (event.data?.type === 'COLLEGE_ERP_AUTH_SYNC' && event.data?.token) {
        localStorage.setItem('college_erp_token', event.data.token);
        if (event.data.user) {
          localStorage.setItem('college_erp_user', typeof event.data.user === 'string' ? event.data.user : JSON.stringify(event.data.user));
        }
      }
    };
    window.addEventListener('message', handleMessage);

    // Only standalone browser tabs need to poll/verify Shell availability
    if (!isInsideShell) {
      checkShellHealth();
      const interval = setInterval(checkShellHealth, 4000);
      return () => {
        clearInterval(interval);
        window.removeEventListener('message', handleMessage);
      };
    }

    return () => window.removeEventListener('message', handleMessage);
  }, [isInsideShell]);

  if (shellStatus === 'checking') {
    return (
      <div className="min-h-screen bg-[#FFF8F1] flex flex-col items-center justify-center p-6 text-[#553729]">
        <div className="w-8 h-8 border-3 border-[#C66B45] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-[#929071]">Connecting to Shell Host...</p>
      </div>
    );
  }

  if (shellStatus === 'inactive') {
    return (
      <div className="min-h-screen bg-[#FFF8F1] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border-2 border-red-300 rounded-3xl p-8 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shadow-xs">
            <ShieldAlert className="w-9 h-9" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full">
              Host Shell Required
            </span>
            <h2 className="text-xl font-bold text-[#553729] mt-2">
              Shell Host Not Running
            </h2>
            <p className="text-xs text-[#929071] mt-2 leading-relaxed">
              The <strong className="text-[#553729]">{moduleName} Micro-Frontend (Port {modulePort})</strong> is an independent remote module and cannot run without the active parent Shell host on <strong className="text-red-700">Port 5173</strong>.
            </p>
          </div>
          <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-xl p-3.5 text-left text-xs space-y-1.5">
            <p className="font-bold text-[#553729]">How to start the Shell:</p>
            <p className="text-[#929071] font-mono text-[11px] bg-white p-1 rounded border border-[#EBD9CB]">pnpm run start:app-shell</p>
            <p className="text-[11px] text-[#929071]">Or start all micro-frontends with <span className="font-mono text-[#C66B45] font-bold">pnpm run start:frontend</span></p>
          </div>
          <button
            onClick={checkShellHealth}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#C66B45] hover:bg-[#AD5938] text-white font-bold text-sm shadow-sm transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Shell Connection</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {!isInsideShell && (
        <div className="bg-[#FCE6D8] border-b border-[#EBD9CB] px-4 py-2 text-xs flex items-center justify-between text-[#553729]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              <strong>{moduleName} Micro-Frontend</strong> running on <strong>Port {modulePort}</strong> (Shell Host active on <strong>Port 5173</strong>)
            </span>
          </div>
          <a
            href={`${SHELL_URL}/`}
            className="inline-flex items-center gap-1 font-bold text-[#C66B45] hover:underline"
          >
            <span>Open in Shell Container</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
      <main>{children}</main>
    </div>
  );
}
