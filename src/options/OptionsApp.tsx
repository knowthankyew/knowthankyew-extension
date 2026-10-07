import React, { useState, useEffect, useCallback, useRef } from 'react';
import { hardBurnAllData, telemetry } from '../telemetry/client';
import { PrivacyAuditModal } from '@knowthankyew/privacy-telemetry/react';
import { scanDocumentText } from '../core/engine';
import { PageScanResult } from '../core/types';

function extractTextFromPdfBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const latin1 = new TextDecoder('latin1').decode(bytes);
  const textMatches: string[] = [];
  const tjRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
  let match;
  while ((match = tjRegex.exec(latin1)) !== null) {
    textMatches.push(match[1]);
  }
  const arrayTjRegex = /\[([^\]]+)\]\s*TJ/g;
  while ((match = arrayTjRegex.exec(latin1)) !== null) {
    const inner = match[1];
    const subMatches = inner.match(/\(([^)]+)\)/g);
    if (subMatches) {
      for (const sm of subMatches) {
        textMatches.push(sm.slice(1, -1));
      }
    }
  }
  return textMatches.join(' ').replace(/\\([()\\])/g, '$1').replace(/\s+/g, ' ').trim();
}

export const OptionsApp: React.FC = () => {
  const [storageBytes, setStorageBytes] = useState<number>(0);
  const [storageKeys, setStorageKeys] = useState<string[]>([]);
  const [tabCount, setTabCount] = useState<number>(0);
  const [telemetrySpanCount, setTelemetrySpanCount] = useState<number>(0);
  const [auditLogCount, setAuditLogCount] = useState<number>(0);
  const [burning, setBurning] = useState(false);
  const [burned, setBurned] = useState(false);
  const [showTelemetryModal, setShowTelemetryModal] = useState(false);
  const [activeTabSection, setActiveTabSection] = useState<'memory' | 'document' | 'pillars' | 'permissions'>('memory');
  const [mlStatus, setMlStatus] = useState<'connected' | 'disconnected' | 'disabled'>('disabled');

  // Document & Contract Auditor State
  const [docText, setDocText] = useState('');
  const [docScanResult, setDocScanResult] = useState<PageScanResult | null>(null);
  const [isAuditingDoc, setIsAuditingDoc] = useState(false);
  const [docFileName, setDocFileName] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshDiagnostics = useCallback(async (force = false) => {
    // 1. Query chrome.storage.local usage
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      try {
        if (chrome.storage.local.getBytesInUse) {
          const bytes = await chrome.storage.local.getBytesInUse(null);
          setStorageBytes(bytes || 0);
        }

        const allItems = await chrome.storage.local.get(null);
        setStorageKeys(Object.keys(allItems || {}));
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
        const isUp = await localMLClient.isAvailable(force);
        setMlStatus(isUp ? 'connected' : 'disconnected');
      }
    } catch {
      setMlStatus('disabled');
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window.location.hash === '#document' || window.location.hash === '#audit')) {
      setActiveTabSection('document');
    }
  }, []);

  useEffect(() => {
    refreshDiagnostics();

    let channel: BroadcastChannel | null = null;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel('kty_hard_burn');
        channel.onmessage = (event) => {
          if (event?.data?.type === 'KTY_HARD_BURN_DOM') {
            setBurned(true);
            setDocText('');
            setDocScanResult(null);
            setDocFileName(null);
            setDocError(null);
            refreshDiagnostics();
            if (timerId) clearTimeout(timerId);
            timerId = setTimeout(() => {
              setBurned(false);
            }, 4000);
          }
        };
      } catch {
        // Non-fatal if BroadcastChannel is restricted or unsupported
      }
    }

    return () => {
      if (timerId) {
        clearTimeout(timerId);
      }
      if (channel) {
        try {
          channel.close();
        } catch {
          // Ignore close errors
        }
      }
    };
  }, [refreshDiagnostics]);

  const handleBurnAll = async () => {
    setBurning(true);
    try {
      await hardBurnAllData();
      setBurned(true);
      setDocText('');
      setDocScanResult(null);
      setDocFileName(null);
      setDocError(null);
      await refreshDiagnostics();
      setTimeout(() => setBurned(false), 4000);
    } catch (err) {
      console.error('Master burn failed:', err);
    } finally {
      setBurning(false);
    }
  };

  const handleAuditDoc = (textToAudit?: string) => {
    const text = (textToAudit ?? docText).trim();
    if (!text) {
      setDocError('Please paste contract text or select a file to audit.');
      setDocScanResult(null);
      return;
    }
    setDocError(null);
    setIsAuditingDoc(true);
    try {
      const result = scanDocumentText(text, docFileName || 'document-input', ['document-auditor']);
      setDocScanResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDocError(`Audit failed: ${msg}`);
    } finally {
      setIsAuditingDoc(false);
    }
  };

  const handlePasteClipboard = async () => {
    setDocError(null);
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
        throw new Error('Clipboard access is not available.');
      }
      const text = await navigator.clipboard.readText();
      if (!text || text.trim().length === 0) {
        setDocError('Clipboard is empty. Copy text from your agreement first.');
        return;
      }
      setDocText(text);
      handleAuditDoc(text);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDocError(`Clipboard read error: ${msg}. Please paste text into the box manually.`);
    }
  };

  const handleFileUpload = async (file: File) => {
    setDocError(null);
    setDocFileName(file.name);
    try {
      if (file.name.toLowerCase().endsWith('.pdf')) {
        const buffer = await file.arrayBuffer();
        const extracted = extractTextFromPdfBuffer(buffer);
        if (!extracted || extracted.trim().length === 0) {
          setDocError(
            'This PDF appears to use custom font encodings or scanned images without embedded text streams. Please select and copy (Cmd+A, Cmd+C) text directly from your PDF viewer and paste below.'
          );
          setDocText('');
          return;
        }
        setDocText(extracted);
        handleAuditDoc(extracted);
      } else {
        const text = await file.text();
        setDocText(text);
        handleAuditDoc(text);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDocError(`Failed to read file: ${msg}`);
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
              v2.0.0
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
          onClick={() => setActiveTabSection('document')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTabSection === 'document' ? '2px solid #38bdf8' : '2px solid transparent',
            color: activeTabSection === 'document' ? '#38bdf8' : '#94a3b8',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.15s ease',
          }}
        >
          📄 Document & Contract Auditor
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
                Local ML Assist
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
                  ? 'Loopback semantic reranker active (127.0.0.1:8420)'
                  : mlStatus === 'disconnected'
                  ? 'Target: 127.0.0.1:8420 • Run `npm run ml:worker` to connect'
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
                onClick={() => refreshDiagnostics(true)}
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

      {/* Tab 2: Document & Contract Auditor */}
      {activeTabSection === 'document' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}>
          {/* Header Card */}
          <div
            style={{
              backgroundColor: '#131b2e',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📄</span>
                  <span>Air-Gapped Document & Contract Auditor</span>
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>
                  Audit offline PDF agreements, Terms of Service contracts, or fine-print disclosures directly on-device with zero network egress.
                </p>
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  color: '#34d399',
                  fontWeight: 600,
                }}
              >
                <span>🔒</span>
                <span>Zero Cloud Egress</span>
              </div>
            </div>

            {/* Upload & Drop Zone */}
            <div
              style={{
                marginTop: '20px',
                padding: '20px',
                border: '2px dashed #334155',
                borderRadius: '8px',
                backgroundColor: '#0c1322',
                textAlign: 'center',
                cursor: 'pointer',
              }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md,.html"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📥</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
                {docFileName ? `Selected: ${docFileName}` : 'Drop PDF or text contract file here, or click to browse'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Supports .pdf, .txt, .md, .html • Processed 100% in volatile browser memory
              </div>
            </div>

            {/* Or Paste Textarea */}
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase' }}>
                  Or Paste Agreement Fine Print Below:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    style={{
                      background: 'none',
                      border: '1px solid #334155',
                      borderRadius: '4px',
                      color: '#38bdf8',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>📋</span>
                    <span>Paste from Clipboard</span>
                  </button>
                  {docText && (
                    <button
                      type="button"
                      onClick={() => {
                        setDocText('');
                        setDocScanResult(null);
                        setDocFileName(null);
                        setDocError(null);
                      }}
                      style={{
                        background: 'none',
                        border: '1px solid #334155',
                        borderRadius: '4px',
                        color: '#94a3b8',
                        padding: '4px 8px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <textarea
                value={docText}
                onChange={(e) => setDocText(e.target.value)}
                placeholder="Paste contract clauses, arbitration agreements, subscription terms, or contractor fine print here..."
                rows={7}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#0c1322',
                  border: '1px solid #1e293b',
                  borderRadius: '6px',
                  color: '#e2e8f0',
                  fontSize: '12px',
                  fontFamily: 'ui-monospace, monospace',
                  lineHeight: 1.5,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Error Banner */}
            {docError && (
              <div
                style={{
                  marginTop: '14px',
                  padding: '12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '6px',
                  color: '#fca5a5',
                  fontSize: '12px',
                  lineHeight: 1.4,
                }}
              >
                {docError}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => handleAuditDoc()}
                disabled={isAuditingDoc || !docText.trim()}
                style={{
                  backgroundColor: '#0284c7',
                  border: 'none',
                  color: '#ffffff',
                  padding: '10px 22px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isAuditingDoc || !docText.trim() ? 'not-allowed' : 'pointer',
                  opacity: isAuditingDoc || !docText.trim() ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: 'inherit',
                }}
              >
                <span>🔍</span>
                <span>{isAuditingDoc ? 'Analyzing Document...' : 'Run Statutory Audit'}</span>
              </button>

              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Evaluates against ROSCA, FAA, State ARL, UK DMCC, and EU Consumer Rights rule packs
              </span>
            </div>
          </div>

          {/* Audit Results View */}
          {docScanResult && (
            <div
              style={{
                backgroundColor: '#131b2e',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '24px',
              }}
            >
              {/* Summary Stats Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid #1e293b',
                  paddingBottom: '16px',
                  marginBottom: '20px',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#f8fafc' }}>
                    Audit Findings for {docFileName || 'Pasted Agreement'}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Scanned {docScanResult.wordCount} words ({docScanResult.segmentCount} segments) in {docScanResult.durationMs}ms
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div
                    style={{
                      padding: '6px 12px',
                      backgroundColor:
                        docScanResult.riskScore > 50
                          ? 'rgba(239, 68, 68, 0.2)'
                          : docScanResult.riskScore > 20
                          ? 'rgba(245, 158, 11, 0.2)'
                          : 'rgba(16, 185, 129, 0.2)',
                      border: `1px solid ${
                        docScanResult.riskScore > 50
                          ? '#ef4444'
                          : docScanResult.riskScore > 20
                          ? '#f59e0b'
                          : '#10b981'
                      }`,
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color:
                        docScanResult.riskScore > 50
                          ? '#f87171'
                          : docScanResult.riskScore > 20
                          ? '#fbbf24'
                          : '#34d399',
                    }}
                  >
                    Risk Score: {docScanResult.riskScore}/100
                  </div>

                  <div
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#cbd5e1',
                    }}
                  >
                    <span style={{ color: '#ef4444', fontWeight: 700, marginRight: '4px' }}>●</span>
                    {docScanResult.summary.critical} Critical &nbsp;|&nbsp;
                    <span style={{ color: '#f59e0b', fontWeight: 700, margin: '0 4px' }}>●</span>
                    {docScanResult.summary.warning} Warnings
                  </div>
                </div>
              </div>

              {/* Matched Clauses List */}
              {docScanResult.matches.length === 0 ? (
                <div
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    backgroundColor: '#0c1322',
                    borderRadius: '6px',
                    color: '#94a3b8',
                    fontSize: '13px',
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '6px' }}>🛡️</div>
                  <div style={{ fontWeight: 700, color: '#34d399' }}>Zero Statutory Violations Detected</div>
                  <div style={{ marginTop: '4px', fontSize: '12px', color: '#64748b' }}>
                    No automatic renewal traps, forced arbitration clauses, or unilateral modification patterns were found in the inspected text.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {docScanResult.matches.map((m, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '16px',
                        backgroundColor: '#0c1322',
                        border: `1px solid ${m.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b'}`,
                        borderRadius: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              backgroundColor: m.severity === 'CRITICAL' ? '#7f1d1d' : '#78350f',
                              color: m.severity === 'CRITICAL' ? '#fca5a5' : '#fde68a',
                              borderRadius: '4px',
                              marginRight: '8px',
                            }}
                          >
                            {m.severity}
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                            {m.title}
                          </span>
                        </div>
                        {m.statute && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontFamily: 'ui-monospace, monospace',
                              color: '#38bdf8',
                              backgroundColor: 'rgba(56, 189, 248, 0.1)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            {m.statute.code}
                          </span>
                        )}
                      </div>

                      <p style={{ margin: '0 0 10px 0', fontSize: '12.5px', color: '#cbd5e1', lineHeight: 1.5 }}>
                        {m.explanation}
                      </p>

                      <div
                        style={{
                          padding: '10px 12px',
                          backgroundColor: '#131b2e',
                          borderLeft: '3px solid #38bdf8',
                          borderRadius: '0 4px 4px 0',
                          fontSize: '11.5px',
                          color: '#94a3b8',
                          fontStyle: 'italic',
                          lineHeight: 1.45,
                          marginBottom: '8px',
                        }}
                      >
                        "{m.matchedSnippet}"
                      </div>

                      {m.recommendation && (
                        <div style={{ fontSize: '11.5px', color: '#fcd34d' }}>
                          💡 <strong>Action:</strong> {m.recommendation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Architectural Pillars */}
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
