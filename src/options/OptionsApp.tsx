import React, { useState, useEffect, useCallback } from 'react';
import { hardBurnAllData, telemetry } from '../telemetry/client';
import { PrivacyAuditModal } from '@knowthankyew/privacy-telemetry/react';

export const OptionsApp: React.FC = () => {
  const [storageBytes, setStorageBytes] = useState<number>(0);
  const [storageKeys, setStorageKeys] = useState<string[]>([]);
  const [tabCount, setTabCount] = useState<number>(0);
  const [telemetrySpanCount, setTelemetrySpanCount] = useState<number>(0);
  const [auditLogCount, setAuditLogCount] = useState<number>(0);
  const [burning, setBurning] = useState(false);
  const [burned, setBurned] = useState(false);
  const [showTelemetryModal, setShowTelemetryModal] = useState(false);
  const [activeTabSection, setActiveTabSection] = useState<'memory' | 'pillars' | 'permissions'>('memory');
  const [mlStatus, setMlStatus] = useState<'connected' | 'disconnected' | 'disabled'>('disabled');

  const refreshDiagnostics = useCallback(async () => {
    // 1. Query chrome.storage.local usage
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      try {
        if (chrome.storage.local.getBytesInUse) {
          const bytes = await new Promise<number>((resolve) => {
            chrome.storage.local.getBytesInUse(null, (b) => {
              resolve(b || 0);
            });
          });
          setStorageBytes(bytes);
        }

        const allItems = await new Promise<Record<string, unknown>>((resolve) => {
          chrome.storage.local.get(null, (items) => {
            resolve(items || {});
          });
        });
        setStorageKeys(Object.keys(allItems));
      } catch {
        // Fallback for mocked or non-extension environments
        setStorageBytes(0);
        setStorageKeys([]);
      }
    }

    // 2. Query open tabs count
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      try {
        const tabs = await chrome.tabs.query({});
        setTabCount(tabs.length);
      } catch {
        setTabCount(0);
      }
    }

    // 3. Telemetry memory metrics
    try {
      setTelemetrySpanCount(telemetry.getBufferedSpans().length);
      setAuditLogCount(telemetry.getAuditLog().length);
    } catch {
      setTelemetrySpanCount(0);
      setAuditLogCount(0);
    }

    // 4. Local ML loopback worker status
    try {
      const { localMLClient } = await import('../ml/local-ml-client');
      if (!localMLClient.isFeatureEnabled()) {
        setMlStatus('disabled');
      } else {
        const isUp = await localMLClient.isAvailable();
        setMlStatus(isUp ? 'connected' : 'disconnected');
      }
    } catch {
      setMlStatus('disabled');
    }
  }, []);

  useEffect(() => {
    refreshDiagnostics();
  }, [refreshDiagnostics]);

  const handleBurnAll = async () => {
    setBurning(true);
    try {
      await hardBurnAllData();
      setBurned(true);
      await refreshDiagnostics();
      setTimeout(() => setBurned(false), 4000);
    } catch (err) {
      console.error('Master burn failed:', err);
    } finally {
      setBurning(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', padding: '40px 24px', color: '#e2e8f0' }}>
      {/* VS Code Extension Details Header */}
      <header
        style={{
          display: 'flex',
          gap: '24px',
          alignItems: 'flex-start',
          borderBottom: '1px solid #1e293b',
          paddingBottom: '28px',
          marginBottom: '28px',
        }}
      >
        <div
          style={{
            width: '96px',
            height: '96px',
            borderRadius: '16px',
            backgroundColor: '#131b2e',
            border: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            flexShrink: 0,
          }}
        >
          <img
            src="icons/icon-128.png"
            alt="KnowThankYew Logo"
            style={{ width: '80px', height: '80px', objectFit: 'contain' }}
            onError={(e) => {
              // Fallback placeholder if image not rendered
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', color: '#f8fafc' }}>
              KnowThankYew Reality Engine
            </h1>
            <span
              style={{
                backgroundColor: '#1e293b',
                color: '#38bdf8',
                padding: '3px 10px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 700,
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              v1.3.0
            </span>
          </div>

          <div style={{ marginTop: '6px', fontSize: '13px', color: '#94a3b8' }}>
            Identifier: <code style={{ color: '#38bdf8' }}>knowthankyew-extension</code> • Publisher:{' '}
            <a
              href="https://github.com/knowthankyew"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#f1f5f9', textDecoration: 'none', fontWeight: 600 }}
            >
              knowthankyew
            </a>
          </div>

          <p style={{ margin: '10px 0 16px 0', fontSize: '14px', lineHeight: 1.5, color: '#cbd5e1' }}>
            Zero-egress consumer advocate detecting hidden subscription traps, continuous billing, arbitration waivers,
            and dark patterns in real-time. 100% on-device sandboxed contract auditing.
          </p>

          {/* Badges / Pill row */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid #10b981',
                borderRadius: '6px',
                padding: '3px 10px',
                fontSize: '11.5px',
                color: '#34d399',
                fontWeight: 600,
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              Zero Network Egress
            </span>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid #38bdf8',
                borderRadius: '6px',
                padding: '3px 10px',
                fontSize: '11.5px',
                color: '#38bdf8',
                fontWeight: 600,
              }}
            >
              Client-Side Sandbox
            </span>

            <a
              href="https://chromewebstore.google.com/detail/knowthankyew-reality-engi/pbgjjgggmeecalifcgggiondfminilnl"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '3px 10px',
                fontSize: '11.5px',
                color: '#f1f5f9',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              🌐 Chrome Web Store Listing
            </a>

            <a
              href="https://github.com/knowthankyew/knowthankyew-extension"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '3px 10px',
                fontSize: '11.5px',
                color: '#f1f5f9',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              🐙 GitHub Repository
            </a>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid #1e293b',
          marginBottom: '28px',
        }}
      >
        <button
          onClick={() => setActiveTabSection('memory')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTabSection === 'memory' ? '2px solid #ef4444' : '2px solid transparent',
            color: activeTabSection === 'memory' ? '#f87171' : '#94a3b8',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.15s ease',
          }}
        >
          🔥 Memory & Cross-Domain Burn
        </button>

        <button
          onClick={() => setActiveTabSection('pillars')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTabSection === 'pillars' ? '2px solid #38bdf8' : '2px solid transparent',
            color: activeTabSection === 'pillars' ? '#38bdf8' : '#94a3b8',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.15s ease',
          }}
        >
          🛡️ Architectural Pillars
        </button>

        <button
          onClick={() => setActiveTabSection('permissions')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTabSection === 'permissions' ? '2px solid #10b981' : '2px solid transparent',
            color: activeTabSection === 'permissions' ? '#34d399' : '#94a3b8',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.15s ease',
          }}
        >
          🔒 Security & Zero Egress Proof
        </button>
      </nav>

      {/* Tab 1: Memory, Reclaim & Cross-Domain Burn */}
      {activeTabSection === 'memory' && (
        <div>
          {/* Diagnostics Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '28px',
            }}
          >
            <div
              style={{
                backgroundColor: '#131b2e',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '18px',
              }}
            >
              <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Extension Local Storage
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: '#38bdf8',
                  marginTop: '8px',
                  fontFamily: 'ui-monospace, monospace',
                }}
              >
                {formatBytes(storageBytes)}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                {storageKeys.length === 0 ? 'Clean (0 keys persisted)' : `${storageKeys.length} keys in namespace`}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#131b2e',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '18px',
              }}
            >
              <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Volatile Telemetry Spans
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: '#34d399',
                  marginTop: '8px',
                  fontFamily: 'ui-monospace, monospace',
                }}
              >
                {telemetrySpanCount} active
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                RAM-only buffer (zero disk egress)
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#131b2e',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '18px',
              }}
            >
              <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Session Audit Log
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: '#f59e0b',
                  marginTop: '8px',
                  fontFamily: 'ui-monospace, monospace',
                }}
              >
                {auditLogCount} events
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Local operational metrics
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#131b2e',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '18px',
              }}
            >
              <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Reachable Browser Tabs
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: '#e2e8f0',
                  marginTop: '8px',
                  fontFamily: 'ui-monospace, monospace',
                }}
              >
                {tabCount} tabs
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Targeted during broadcast burn
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#131b2e',
                border: mlStatus === 'connected' ? '1px solid #10b981' : '1px solid #1e293b',
                borderRadius: '8px',
                padding: '18px',
              }}
            >
              <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Local ML Assist (127.0.0.1:8420)
              </div>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: mlStatus === 'connected' ? '#34d399' : mlStatus === 'disconnected' ? '#f87171' : '#94a3b8',
                  marginTop: '8px',
                  fontFamily: 'ui-monospace, monospace',
                }}
              >
                {mlStatus === 'connected' ? '● Connected' : mlStatus === 'disconnected' ? '○ Offline' : 'Air-Gapped'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                {mlStatus === 'connected'
                  ? 'Loopback semantic reranker active'
                  : mlStatus === 'disconnected'
                  ? 'Run `npm run ml:serve` to connect'
                  : 'Zero external network calls (Default)'}
              </div>
            </div>
          </div>

          {/* Master Cross-Domain Hard Burn Console */}
          <div
            style={{
              backgroundColor: '#181015',
              border: '1px solid #7f1d1d',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '28px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>🔥</span>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fca5a5' }}>
                Nuclear Amnesia: Burn All Data Across All Domains
              </h2>
            </div>

            <p style={{ fontSize: '13.5px', lineHeight: 1.6, color: '#e2e8f0', margin: '14px 0' }}>
              Used the reality engine on multiple checkout or terms pages and want to wipe all session traces, reclaim
              local memory, or reset state across every domain at once?
            </p>

            <ul style={{ margin: '0 0 20px 0', paddingLeft: '20px', fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6 }}>
              <li>
                <strong>Atomic Storage Purge:</strong> Destroys all items in the extension's local storage namespace.
              </li>
              <li>
                <strong>Memory Buffer Flush:</strong> Atomically drains and resets all in-memory telemetry spans and
                session audit logs.
              </li>
              <li>
                <strong>Cross-Domain DOM Teardown:</strong> Broadcasts <code>KTY_HARD_BURN_DOM</code> to all open
                tabs across every domain to disconnect active <code>MutationObserver</code>s, strip overlay attributes,
                and dereference cached analysis results.
              </li>
              <li>
                <strong>Toolbar Cleanup:</strong> Resets all action badge counters and alert indicators to blank.
              </li>
            </ul>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleBurnAll}
                disabled={burning}
                style={{
                  backgroundColor: burned ? '#10b981' : '#b91c1c',
                  border: `1px solid ${burned ? '#059669' : '#ef4444'}`,
                  color: '#ffffff',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  cursor: burning ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease-in-out',
                  fontFamily: 'inherit',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.25)',
                }}
              >
                <span style={{ fontSize: '16px' }}>{burned ? '✓' : '🔥'}</span>
                <span>
                  {burning
                    ? 'PURGING ALL DOMAINS...'
                    : burned
                    ? 'ALL DATA INCINERATED ACROSS ALL DOMAINS'
                    : 'BURN ALL DATA ACROSS ALL DOMAINS'}
                </span>
              </button>

              <button
                onClick={() => setShowTelemetryModal(true)}
                style={{
                  backgroundColor: '#131b2e',
                  border: '1px solid #38bdf8',
                  color: '#38bdf8',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                🔍 Inspect Raw Telemetry Buffer
              </button>

              <button
                onClick={() => refreshDiagnostics()}
                style={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  color: '#94a3b8',
                  padding: '12px 18px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                ↻ Refresh Status
              </button>
            </div>

            {burned && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid #10b981',
                  borderRadius: '6px',
                  color: '#34d399',
                  fontSize: '12.5px',
                  fontWeight: 600,
                }}
              >
                ✓ Amnesia engaged! All local storage namespaces, memory buffers, and active tab observers across every
                domain have been terminated.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Architectural Pillars */}
      {activeTabSection === 'pillars' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
          <div style={{ backgroundColor: '#131b2e', border: '1px solid #1e293b', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#38bdf8' }}>
              Pillar 1: Volatile Memory State & Local-Only Processing
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6 }}>
              The extension never writes document excerpts, page URLs, or audit traces to persistent disk or sync storage.
              Operational telemetry is configured as <code>memory_only</code>, and scan results are held strictly in
              ephemeral memory within the tab sandbox.
            </p>
          </div>

          <div style={{ backgroundColor: '#131b2e', border: '1px solid #1e293b', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#38bdf8' }}>
              Pillar 2: Compile-Time Dead-Code Shims & CSP Boundaries
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6 }}>
              Manifest Content Security Policy enforces <code>connect-src 'none'</code> for all extension pages,
              physically prohibiting network requests, background sockets, or outbound beacon dispatch at the browser engine
              level. Egress shims in <code>vite.config.ts</code> excise remote network exporter functions at build time.
            </p>
          </div>

          <div style={{ backgroundColor: '#131b2e', border: '1px solid #1e293b', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#38bdf8' }}>
              Pillar 3: Strict Fail-Closed Allowlisting
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6 }}>
              All telemetry spans emit attributes strictly validated against compile-time safe key allowlists. Arbitrary
              properties, raw clause texts, and user-identifying attributes are rejected and dropped.
            </p>
          </div>

          <div style={{ backgroundColor: '#131b2e', border: '1px solid #1e293b', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#38bdf8' }}>
              Pillar 4: Zero Raw Text Egress & Least-Privilege Injection
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6 }}>
              Heuristic pattern matching executes locally inside the target tab. Only structured categorical findings and
              sanitized snippets are returned to the popup. Under <code>activeTab</code>, the extension cannot passively
              track other tabs or background navigation.
            </p>
          </div>

          <div style={{ backgroundColor: '#131b2e', border: '1px solid #1e293b', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#38bdf8' }}>
              Pillar 5: The Amnesiac Hard Burn
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6 }}>
              A single action atomically wipes local storage, flushes in-memory spans, resets badges, and instructs all
              open tabs to disconnect dynamic <code>MutationObserver</code>s and remove DOM overlays.
            </p>
          </div>
        </div>
      )}

      {/* Tab 3: Permissions & Security */}
      {activeTabSection === 'permissions' && (
        <div style={{ backgroundColor: '#131b2e', border: '1px solid #1e293b', borderRadius: '8px', padding: '24px', marginBottom: '28px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#f8fafc' }}>
            Declared Permissions Justification
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', textAlign: 'left', color: '#94a3b8' }}>
                <th style={{ padding: '8px 12px' }}>Permission</th>
                <th style={{ padding: '8px 12px' }}>Role</th>
                <th style={{ padding: '8px 12px' }}>Reviewer Justification</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '10px 12px', fontFamily: 'ui-monospace, monospace', color: '#38bdf8' }}>activeTab</td>
                <td style={{ padding: '10px 12px', color: '#cbd5e1' }}>User-Initiated Scan</td>
                <td style={{ padding: '10px 12px', color: '#94a3b8' }}>
                  Temporary access to inspect the active checkout/terms page only upon user action.
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '10px 12px', fontFamily: 'ui-monospace, monospace', color: '#38bdf8' }}>storage</td>
                <td style={{ padding: '10px 12px', color: '#cbd5e1' }}>Local-Only Preferences</td>
                <td style={{ padding: '10px 12px', color: '#94a3b8' }}>
                  Local device storage for UI options and target of atomic Hard Burn.
                </td>
              </tr>
              <tr>
                <td style={{ padding: '10px 12px', fontFamily: 'ui-monospace, monospace', color: '#38bdf8' }}>scripting</td>
                <td style={{ padding: '10px 12px', color: '#cbd5e1' }}>Sandbox Script Injection</td>
                <td style={{ padding: '10px 12px', color: '#94a3b8' }}>
                  Injects local text analyzer into the active tab on demand.
                </td>
              </tr>
            </tbody>
          </table>

          <div
            style={{
              marginTop: '20px',
              padding: '12px 16px',
              backgroundColor: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#93c5fd',
              lineHeight: 1.5,
            }}
          >
            <strong>Zero Broad Host Permissions:</strong> This extension does NOT declare <code>&lt;all_urls&gt;</code> or
            wildcard domain permissions. It cannot read web traffic or intercept network requests across the web.
          </div>
        </div>
      )}

      {/* Footer Info */}
      <footer
        style={{
          borderTop: '1px solid #1e293b',
          paddingTop: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          color: '#64748b',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          KnowThankYew Reality Engine • Automated consumer protection text evaluation for informational/educational
          purposes only. Not legal advice.
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <a
            href="https://github.com/knowthankyew/knowthankyew-extension/blob/main/LICENSE"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#94a3b8', textDecoration: 'none' }}
          >
            MIT License
          </a>
          <a
            href="https://knowthankyew.github.io/knowthankyew-extension/privacy.html"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#94a3b8', textDecoration: 'none' }}
          >
            Privacy Policy
          </a>
        </div>
      </footer>

      {/* PrivacyAuditModal Integration */}
      <PrivacyAuditModal
        isOpen={showTelemetryModal}
        onClose={() => setShowTelemetryModal(false)}
        telemetry={telemetry}
        branding={{
          appTitle: 'KnowThankYew Reality Engine',
        }}
        onBurn={async () => {
          await handleBurnAll();
        }}
      />
    </div>
  );
};
