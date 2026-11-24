import React, { useState, useEffect } from 'react';
import Loader from './Loader';
import { ExternalLink, AlertTriangle, RefreshCw } from 'lucide-react';

// Global cache of confirmed active ports to ensure 0ms latency on repeated visits
const activePorts = new Set();

export default function MicroFrontendViewport({ port, path = '', title = 'Micro-Frontend Module' }) {
  // If this port was already confirmed running, don't show any blocking screen
  const [loading, setLoading] = useState(!activePorts.has(port));
  const [error, setError] = useState(false);

  const token = localStorage.getItem('college_erp_token');
  const user = localStorage.getItem('college_erp_user');
  const queryPrefix = path.includes('?') ? '&' : '?';
  const authQuery = token ? `${queryPrefix}token=${encodeURIComponent(token)}&user=${encodeURIComponent(user || '')}` : '';
  const targetUrl = `http://localhost:${port}${path}${authQuery}`;

  useEffect(() => {
    // If port is already cached as active, skip probe entirely
    if (activePorts.has(port)) {
      setLoading(false);
      setError(false);
      return;
    }

    // Resilient non-blocking health check with retry
    let isCancelled = false;
    let timeoutId = null;

    const probe = async (attemptsLeft = 2) => {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 6000);

      try {
        await fetch(`http://localhost:${port}/`, { mode: 'no-cors', signal: controller.signal });
        if (!isCancelled) {
          clearTimeout(timeoutId);
          activePorts.add(port);
          setLoading(false);
          setError(false);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (isCancelled) return;
        if (activePorts.has(port)) {
          setLoading(false);
          setError(false);
          return;
        }
        if (attemptsLeft > 1) {
          setTimeout(() => probe(attemptsLeft - 1), 1000);
        } else {
          setError(true);
          setLoading(false);
        }
      }
    };

    probe();

    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [port]); // Only re-check if switching ports, NEVER on intra-module subpath navigation!

  const handleIframeLoad = () => {
    activePorts.add(port);
    setLoading(false);
    setError(false);
  };

  const handleIframeError = () => {
    if (!activePorts.has(port)) {
      setError(true);
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="bg-white border-2 border-amber-300 rounded-2xl p-8 shadow-xs text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#553729]">{title} Not Detected on Port {port}</h3>
          <p className="text-xs text-[#929071] mt-1 max-w-md mx-auto">
            The remote micro-frontend service for this module is not running on <span className="font-mono text-[#C66B45]">http://localhost:{port}</span>.
          </p>
        </div>
        <div className="bg-[#FFF8F1] border border-[#EBD9CB] p-3 rounded-xl max-w-sm mx-auto text-left text-xs">
          <p className="font-bold text-[#553729]">Start this module in terminal:</p>
          <code className="text-[#C66B45] font-mono text-[11px] block mt-1">
            pnpm run start:app-{port === 5174 ? 'master' : port === 5175 ? 'department' : 'student'}
          </code>
        </div>
        <button
          onClick={() => {
            activePorts.delete(port);
            setError(false);
            setLoading(true);
            window.location.reload();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#C66B45] text-white rounded-xl text-xs font-bold hover:bg-[#AD5938] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Remote Micro-Frontend Meta Badge */}
      <div className="flex items-center justify-between text-xs px-4 py-2 bg-[#FCE6D8]/40 border border-[#EBD9CB] rounded-xl">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[#553729]">
            Active Remote Micro-Frontend: <strong className="text-[#C66B45]">{title}</strong> running on <span className="font-mono font-bold">Port {port}</span>
          </span>
        </div>
        <a
          href={targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#C66B45] hover:underline"
        >
          <span>Open Standalone (Port {port})</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Embedded Micro-Frontend Viewport */}
      <div className="rounded-2xl border border-[#EBD9CB] bg-[#FFF8F1] overflow-hidden shadow-xs relative">
        {loading && (
          <div className="absolute inset-0 bg-[#FFF8F1]/80 backdrop-blur-[1px] flex items-center justify-center z-10">
            <Loader message={`Loading ${title}...`} />
          </div>
        )}
        <iframe
          src={targetUrl}
          title={title}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          className="w-full min-h-[calc(100vh-14rem)] border-0"
        />
      </div>
    </div>
  );
}
