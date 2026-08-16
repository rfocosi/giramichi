import React, { useEffect, useState } from 'react';
import { Server, Layout, Shield } from 'lucide-react';
import { buildApiUrl, getDashboardVersion } from '../config.js';

interface FooterProps {
  serverVersionOverride?: string;
}

export const Footer: React.FC<FooterProps> = ({ serverVersionOverride }) => {
  const dashboardVersion = getDashboardVersion();
  const [serverVersion, setServerVersion] = useState<string | null>(serverVersionOverride || null);
  const [serverStatus, setServerStatus] = useState<'loading' | 'online' | 'offline'>(
    serverVersionOverride ? 'online' : 'loading'
  );

  useEffect(() => {
    if (serverVersionOverride) {
      setServerVersion(serverVersionOverride);
      setServerStatus('online');
      return;
    }

    let isMounted = true;

    const fetchServerVersion = async () => {
      try {
        const res = await fetch(buildApiUrl('/api/version'));
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        if (isMounted) {
          if (data.success && data.version) {
            setServerVersion(data.version);
            setServerStatus('online');
          } else {
            setServerStatus('offline');
          }
        }
      } catch (err) {
        console.warn('[Footer] Failed to fetch server version:', err);
        if (isMounted) {
          setServerStatus('offline');
        }
      }
    };

    fetchServerVersion();

    return () => {
      isMounted = false;
    };
  }, [serverVersionOverride]);

  return (
    <footer
      id="dashboard-footer"
      className="dashboard-footer"
      style={{
        marginTop: '36px',
        padding: '16px 20px',
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--border-glass)',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        fontSize: '0.8125rem',
        color: 'var(--text-muted)',
      }}
    >
      {/* Left side: Brand identity & system overview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img
            src="/giramichi.png"
            alt="Giramichi"
            style={{ width: '18px', height: '18px', objectFit: 'contain', opacity: 0.85 }}
          />
          <span style={{ fontWeight: 600, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
            Giramichi <span style={{ color: 'var(--accent-indigo)', fontWeight: 500 }}>煌道</span>
          </span>
        </div>
        <span style={{ color: 'var(--border-glass)', userSelect: 'none' }}>|</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Shield size={14} color="var(--accent-indigo)" style={{ opacity: 0.8 }} />
          <span>AI-Guided Multi-Agent Workflow</span>
        </div>
      </div>

      {/* Right side: Version badges & connectivity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {/* Dashboard Version Pill */}
        <div
          id="dashboard-version"
          className="version-pill"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-glass)',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
          }}
          title={`Dashboard Frontend Version: v${dashboardVersion}`}
        >
          <Layout size={13} color="var(--accent-violet)" />
          <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}>Dashboard</span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              color: 'var(--text-main)',
            }}
          >
            v{dashboardVersion}
          </span>
        </div>

        {/* Server Version Pill */}
        <div
          id="server-version"
          className="version-pill"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background:
              serverStatus === 'offline'
                ? 'rgba(244, 63, 94, 0.08)'
                : 'rgba(255, 255, 255, 0.04)',
            border:
              serverStatus === 'offline'
                ? '1px solid rgba(244, 63, 94, 0.3)'
                : '1px solid var(--border-glass)',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
          }}
          title={
            serverStatus === 'online'
              ? `Server API Version: v${serverVersion}`
              : serverStatus === 'loading'
                ? 'Connecting to Server API...'
                : 'Server API unreachable'
          }
        >
          <Server
            size={13}
            color={
              serverStatus === 'online'
                ? 'var(--accent-emerald)'
                : serverStatus === 'loading'
                  ? 'var(--accent-amber)'
                  : 'var(--accent-rose)'
            }
          />
          <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}>Server</span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              color:
                serverStatus === 'online'
                  ? 'var(--text-main)'
                  : serverStatus === 'loading'
                    ? 'var(--accent-amber)'
                    : 'var(--accent-rose)',
            }}
          >
            {serverStatus === 'online' && serverVersion
              ? `v${serverVersion}`
              : serverStatus === 'loading'
                ? 'v...'
                : 'Offline'}
          </span>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor:
                serverStatus === 'online'
                  ? 'var(--accent-emerald)'
                  : serverStatus === 'loading'
                    ? 'var(--accent-amber)'
                    : 'var(--accent-rose)',
              boxShadow:
                serverStatus === 'online'
                  ? '0 0 6px var(--accent-emerald)'
                  : serverStatus === 'loading'
                    ? '0 0 6px var(--accent-amber)'
                    : '0 0 6px var(--accent-rose)',
            }}
          />
        </div>
      </div>
    </footer>
  );
};
