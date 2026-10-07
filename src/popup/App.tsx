import React, { useState, useEffect, useCallback } from 'react';
import { PageScanResult } from '../core/types';
import { scanDocumentText } from '../core/engine';
import { TrapCard } from './components/TrapCard';
import { BurnButton } from './components/BurnButton';
import { DiscoveredLinksCard } from './components/DiscoveredLinksCard';
import { AuditReceiptCard } from './components/AuditReceiptCard';
import { SparseScanWarning } from './components/SparseScanWarning';
import { telemetry, recordScanMetrics } from '../telemetry/client';
import { PrivacyAuditModal } from '@knowthankyew/privacy-telemetry/react';

import { ChromePromptAPIAdapter } from '../ml/chrome-ai-adapter';
import { NanoCapabilityState } from '../ml/nano-types';
import { EvaluationMatch } from '../core/types';
import { resolveDestinationTool, buildHandoffPayload } from '../core/handoff';
import { dispatchHandoffToDestination } from './handoff-bridge';

export const App: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<PageScanResult | null>(null);
  const [activeHostname, setActiveHostname] = useState<string>('local-tab');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPdfDetected, setIsPdfDetected] = useState(false);
  const [clipboardScanning, setClipboardScanning] = useState(false);
  const [clipboardError, setClipboardError] = useState<string | null>(null);
  const [showTelemetryModal, setShowTelemetryModal] = useState(false);
  const [isLocalMLActive, setIsLocalMLActive] = useState(false);
  const [nanoState, setNanoState] = useState<NanoCapabilityState | null>(null);
  const [handoffStatus, setHandoffStatus] = useState<string | null>(null);

  /**
   * Injects the content script into a tab and retries the scan request.
   * Returns the scan result on success, or null if the tab is restricted.
   */
  const injectAndRetryScan = async (
    tabId: number,
    startTime: number
  ): Promise<{ result: PageScanResult; duration: number } | null> => {
    try {
      if (!chrome.scripting?.executeScript) return null;
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/scanner.js'],
      });
      return await new Promise((resolve) => {
        chrome.tabs.sendMessage(
          tabId,
          { type: 'KTY_REQUEST_PAGE_SCAN' },
          (retryRes) => {
            const duration = Math.round(performance.now() - startTime);
            if (retryRes && retryRes.success) {
              resolve({ result: retryRes.data, duration });
            } else {
              resolve(null);
            }
          }
        );
      });
    } catch {
      // Restricted page (chrome://, edge://, etc.)
      return null;
    }
  };

  /**
   * Dynamically refreshes ML availability and semantically reranks
   * multi-sided candidate agreements (e.g. Consumer vs. Merchant vs. Courier terms).
   * Non-blocking: failures fall back silently to heuristic ordering.
   */
  const attemptMLRerank = async (result: PageScanResult, hostname: string): Promise<void> => {
    try {
      const { localMLClient } = await import('../ml/local-ml-client');
      if (!localMLClient.isFeatureEnabled()) return;

      const isAvail = await localMLClient.isAvailable(true);
      setIsLocalMLActive(isAvail);

      if (!isAvail || !result.discoveredLinks || result.discoveredLinks.length <= 1) return;

      const candidateItems = result.discoveredLinks.map((link, idx) => ({
        id: idx + 1,
        text: link.title,
        href: link.url,
      }));
      const ranked = await localMLClient.classifyLinks({
        domain: hostname,
        pageType: 'checkout',
        candidates: candidateItems,
      });

      if (ranked?.primaryConsumerTermsId) {
        const matchIdx = result.discoveredLinks.findIndex(
          (_, idx) => idx + 1 === ranked.primaryConsumerTermsId
        );
        if (matchIdx > 0) {
          const links = [...result.discoveredLinks];
          const [promoted] = links.splice(matchIdx, 1);
          links.unshift(promoted);
          setScanResult((prev) => (prev ? { ...prev, discoveredLinks: links } : prev));
        }
      }
    } catch {
      // Non-blocking fallback
    }
  };

  const performScan = useCallback(async () => {
    setScanning(true);
    setErrorMessage(null);
    setIsPdfDetected(false);
    setClipboardError(null);
    const startTime = performance.now();

    try {
      if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
        let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0) {
          // Mobile Firefox (Fenix) bottom sheets do not have a desktop window context
          tabs = await chrome.tabs.query({ active: true });
        }
        const tab = tabs[0];
        if (!tab || !tab.id) {
          setErrorMessage('No active tab detected');
          setScanning(false);
          return;
        }

        let hostname = 'browser-tab';
        try {
          hostname = new URL(tab.url || 'http://localhost').hostname;
        } catch {
          // keep default
        }
        setActiveHostname(hostname);

        const rawUrl = (tab.url || '').toLowerCase();
        const isPdf = Boolean(
          rawUrl.split('?')[0].endsWith('.pdf') ||
          rawUrl.includes('.pdf?') ||
          rawUrl.startsWith('chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai')
        );

        // Send scan request to content script, with automatic script injection fallback
        chrome.tabs.sendMessage(
          tab.id,
          { type: 'KTY_REQUEST_PAGE_SCAN' },
          async (response) => {
            if (chrome.runtime.lastError || !response || !response.success) {
              // Try on-demand injection via chrome.scripting
              const retryResult = await injectAndRetryScan(tab.id!, startTime);
              if (retryResult) {
                setScanResult(retryResult.result);
                recordScanMetrics(retryResult.result.summary, retryResult.duration);
                setScanning(false);
                setIsPdfDetected(false);
                await attemptMLRerank(retryResult.result, hostname);
              } else {
                if (isPdf) {
                  setIsPdfDetected(true);
                  setErrorMessage(null);
                } else {
                  setIsPdfDetected(false);
                  setErrorMessage(
                    'Cannot scan restricted browser system page or protected URL. Navigate to an active checkout, terms, or subscription agreement page.'
                  );
                }
                setScanning(false);
              }
              return;
            }

            const duration = Math.round(performance.now() - startTime);
            const result: PageScanResult = response.data;
            setScanResult(result);
            recordScanMetrics(result.summary, duration);
            setScanning(false);
            setIsPdfDetected(false);

            await attemptMLRerank(result, hostname);
          }
        );
      } else {
        // Fallback demo state when opened outside extension environment (e.g. dev server)
        setActiveHostname('example.com (Dev Mode)');
        setScanResult({
          timestamp: new Date().toISOString(),
          urlDomain: 'example.com',
          scannedLength: 3420,
          wordCount: 684,
          segmentCount: 12,
          inspectedContainers: ['main', 'form.checkout'],
          durationMs: 38,
          evaluatedRulesCount: 42,
          sanitizedTextPreview: 'Your subscription will automatically renew each month unless you cancel at least 48 hours prior to billing. You and Company agree that any dispute arising out of this agreement shall be resolved exclusively by binding arbitration.',
          extractedTextSnippet: 'Your subscription will automatically renew each month unless you cancel at least 48 hours prior to billing. You and Company agree that any dispute arising out of this agreement shall be resolved exclusively by binding arbitration.',
          riskScore: 85,
          summary: { critical: 2, warning: 1, info: 0 },
          limitationsNotice: 'Scans visible on-page DOM text only. Does not audit linked external Terms pages or cross-origin iframes without direct user navigation.',
          discoveredLinks: [
            {
              url: 'https://example.com/terms-of-service',
              title: 'Terms of Service',
              category: 'TERMS',
              source: 'DOM_ANCHOR',
            },
            {
              url: 'https://example.com/arbitration-clause',
              title: 'Mandatory Binding Arbitration',
              category: 'ARBITRATION',
              source: 'DOM_ANCHOR',
            },
          ],
          matches: [
            {
              ruleId: 'AR-001',
              title: 'Automatic Negative Option Renewal',
              category: 'AUTO_RENEWAL',
              classification: 'STATUTORY_VIOLATION',
              severity: 'CRITICAL',
              statute: {
                code: '15 U.S.C. § 8403',
                title: 'ROSCA & Automatic Renewal Law',
                jurisdiction: 'US Federal & State',
                plainExplanation: 'Continuous subscription charges require upfront affirmative consent and clear cancellation mechanisms.',
              },
              explanation: 'Contract binds you to continuous automated billing that renews indefinitely.',
              recommendation: 'Verify cancellation mechanism before entering credit card details.',
              matchedSnippet: 'Your subscription will automatically renew each month unless you cancel at least 48 hours prior to billing.',
            },
            {
              ruleId: 'ARB-001',
              title: 'Mandatory Binding Arbitration Waiver',
              category: 'ARBITRATION',
              classification: 'RIGHTS_WAIVER',
              severity: 'WARNING',
              statute: {
                code: '9 U.S.C. § 2',
                title: 'Federal Arbitration Act',
                jurisdiction: 'US Federal',
                plainExplanation: 'Surrenders 7th Amendment right to jury trial and public courtrooms.',
              },
              explanation: 'Disputes are forced into private corporate arbitration.',
              recommendation: 'Check for a 30-day mail or email opt-out provision.',
              matchedSnippet: 'You and Company agree that any dispute arising out of this agreement shall be resolved exclusively by binding arbitration.',
            },
          ],
        });
        setScanning(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    performScan();
    try {
      const adapter = new ChromePromptAPIAdapter(true);
      adapter.getStatus().then((report) => setNanoState(report.state)).catch(() => {});
    } catch {
      // non-fatal
    }
    try {
      import('../ml/local-ml-client').then(({ localMLClient }) => {
        if (localMLClient.isFeatureEnabled()) {
          localMLClient.isAvailable(true).then(setIsLocalMLActive).catch(() => {});
        }
      }).catch(() => {});
    } catch {
      // non-fatal in restricted or offline contexts
    }
  }, [performScan]);

  const handleNavigateToContract = (targetUrl: string) => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      if (chrome.tabs.create) {
        chrome.tabs.create({ url: targetUrl, active: true }, () => {
          window.close();
        });
        return;
      }
      if (chrome.tabs.query && chrome.tabs.update) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const activeTabId = tabs[0]?.id;
          if (activeTabId) {
            chrome.tabs.update(activeTabId, { url: targetUrl });
            window.close();
          } else {
            window.open(targetUrl, '_blank');
          }
        });
        return;
      }
    }
    window.open(targetUrl, '_blank');
  };

  const handleBatchHandoff = async () => {
    if (!scanResult || scanResult.matches.length === 0) return;
    const targetTool = resolveDestinationTool(scanResult.matches, activeHostname);
    const payload = buildHandoffPayload(scanResult);
    await dispatchHandoffToDestination(payload);
    setHandoffStatus(`Launched ${targetTool.name}`);
    setTimeout(() => setHandoffStatus(null), 3000);
  };

  const handleSingleHandoff = async (match: EvaluationMatch) => {
    if (!scanResult) return;
    const targetTool = resolveDestinationTool([match], activeHostname);
    const payload = buildHandoffPayload(scanResult, targetTool.id, match);
    await dispatchHandoffToDestination(payload);
    setHandoffStatus(`Launched ${targetTool.name} for ${match.title}`);
    setTimeout(() => setHandoffStatus(null), 3000);
  };

  const handleBurnCompleted = () => {
    setScanResult(null);
    setHandoffStatus(null);
    setIsPdfDetected(false);
    setClipboardError(null);
    setErrorMessage('All session data and local storage have been incinerated.');
  };

  const handleScanClipboard = async () => {
    setClipboardScanning(true);
    setClipboardError(null);
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
        throw new Error('Clipboard access is not supported in this browser context.');
      }
      const text = await navigator.clipboard.readText();
      if (!text || text.trim().length === 0) {
        setClipboardError(
          'Clipboard is empty. Copy text from the agreement (Cmd+A, Cmd+C) first, or open Document Auditor.'
        );
        return;
      }
      const result = scanDocumentText(text, activeHostname, ['clipboard-contract']);
      setScanResult(result);
      recordScanMetrics(result.summary, result.durationMs ?? 0);
      setIsPdfDetected(false);
      setErrorMessage(null);
      await attemptMLRerank(result, activeHostname);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setClipboardError(
        msg.includes('denied') || msg.includes('permission')
          ? 'Clipboard read permission was not granted. Please open Document Auditor in the Dashboard to paste text directly.'
          : `Unable to read clipboard (${msg}). Use the Dashboard Document Auditor.`
      );
    } finally {
      setClipboardScanning(false);
    }
  };

  const handleOpenDashboardAudit = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('options.html#document', '_blank');
    }
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', minHeight: '480px' }}>
      {/* Header */}
      <header
        style={{
          borderBottom: '1px solid #1e293b',
          paddingBottom: '12px',
          marginBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                color: '#38bdf8',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              KNOWTHANKYEW
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Reality Engine • In-Browser Advocate
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {(() => {
              const claims = telemetry.getPrivacyClaims();
              const isEnterprise = !claims.isLocalOnlyHonest;
              const badgeLabel = isEnterprise
                ? claims.badgeLabel
                : isLocalMLActive
                ? 'Local Assist'
                : 'Zero Egress';
              const badgeColor = isEnterprise ? '#f59e0b' : isLocalMLActive ? '#38bdf8' : '#34d399';
              const badgeBg = isEnterprise
                ? 'rgba(245, 158, 11, 0.15)'
                : isLocalMLActive
                ? 'rgba(56, 189, 248, 0.15)'
                : 'rgba(16, 185, 129, 0.1)';
              const badgeBorder = isEnterprise
                ? '1px solid #d97706'
                : isLocalMLActive
                ? '1px solid #0284c7'
                : '1px solid #10b981';

              return (
                <div
                  data-testid="privacy-status-badge"
                  style={{
                    padding: '3px 8px',
                    backgroundColor: badgeBg,
                    border: badgeBorder,
                    borderRadius: '12px',
                    fontSize: '10px',
                    color: badgeColor,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title={
                    isEnterprise
                      ? (claims.modalStatusDescription || 'Enterprise Telemetry Active (OTLP)')
                      : isLocalMLActive
                      ? 'Local ML Assist active on loopback (127.0.0.1:8420)'
                      : (claims.modalStatusDescription || 'Air-gapped 100% on-device heuristic engine')
                  }
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: badgeColor }} />
                  {badgeLabel}
                </div>
              );
            })()}
            <button
              onClick={() => {
                if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
                  chrome.runtime.openOptionsPage();
                } else {
                  window.open('options.html', '_blank');
                }
              }}
              title="Open Engine Dashboard & Cross-Domain Burn"
              style={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#cbd5e1',
                padding: '3px 8px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontFamily: 'inherit',
              }}
            >
              ⚙️ Dashboard
            </button>
          </div>
        </div>

        <div
          style={{
            marginTop: '8px',
            fontSize: '11px',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>Domain:</span>
          <span
            style={{
              color: '#f8fafc',
              backgroundColor: '#1e293b',
              padding: '1px 6px',
              borderRadius: '3px',
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            {activeHostname}
          </span>
        </div>
      </header>

      {/* Main Body */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {scanning ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 0',
              color: '#94a3b8',
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                border: '3px solid #1e293b',
                borderTopColor: '#38bdf8',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                marginBottom: '12px',
              }}
            />
            <div style={{ fontSize: '12px', fontWeight: 600 }}>Analyzing page clauses locally...</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
              Evaluating against ROSCA, FAA & State ARL rule packs
            </div>
          </div>
        ) : isPdfDetected ? (
          <div
            style={{
              padding: '16px',
              backgroundColor: '#131b2e',
              border: '1px solid #38bdf8',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: '12px',
              lineHeight: 1.5,
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '20px' }}>📄</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '13px', color: '#38bdf8' }}>
                  PDF Agreement Detected
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                  Chromium Native PDF Viewer
                </div>
              </div>
            </div>

            <p style={{ margin: '0 0 12px 0', color: '#cbd5e1', fontSize: '12px' }}>
              Chromium isolates built-in PDF tabs from extension content scripts for security. You can audit this agreement immediately using copied text or the full-page Document Auditor:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={handleScanClipboard}
                disabled={clipboardScanning}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  backgroundColor: '#0284c7',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: clipboardScanning ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontFamily: 'inherit',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <span>📋</span>
                <span>{clipboardScanning ? 'Reading Clipboard...' : 'Audit Copied Text (Clipboard)'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenDashboardAudit}
                style={{
                  width: '100%',
                  padding: '9px 14px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#f8fafc',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontFamily: 'inherit',
                }}
              >
                <span>🖥️</span>
                <span>Open Document Auditor in Dashboard</span>
              </button>
            </div>

            {clipboardError && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '6px',
                  color: '#fca5a5',
                  fontSize: '11px',
                  lineHeight: 1.4,
                }}
              >
                {clipboardError}
              </div>
            )}

            <div style={{ marginTop: '12px', fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
              💡 Tip: Click inside the PDF, press <kbd style={{ padding: '1px 4px', backgroundColor: '#1e293b', borderRadius: '3px', color: '#e2e8f0' }}>Cmd+A</kbd> then <kbd style={{ padding: '1px 4px', backgroundColor: '#1e293b', borderRadius: '3px', color: '#e2e8f0' }}>Cmd+C</kbd>, then click "Audit Copied Text".
            </div>
          </div>
        ) : errorMessage ? (
          <div
            style={{
              padding: '14px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              color: '#fca5a5',
              fontSize: '12px',
              lineHeight: 1.4,
              marginBottom: '14px',
            }}
          >
            <div>{errorMessage}</div>
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleScanClipboard}
                disabled={clipboardScanning}
                style={{
                  flex: '1 1 140px',
                  padding: '6px 10px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  color: '#f8fafc',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: clipboardScanning ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>📋</span>
                <span>Audit Copied Text</span>
              </button>
              <button
                type="button"
                onClick={handleOpenDashboardAudit}
                style={{
                  flex: '1 1 140px',
                  padding: '6px 10px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  color: '#f8fafc',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>🖥️</span>
                <span>Document Auditor</span>
              </button>
            </div>
            {clipboardError && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  borderRadius: '4px',
                  fontSize: '11px',
                }}
              >
                {clipboardError}
              </div>
            )}
          </div>
        ) : scanResult ? (
          <>
            {(() => {
              const isSparse = scanResult.scannedLength < 250;
              const isClean = scanResult.matches.length === 0;
              const isIndeterminate = isClean && isSparse;

              return (
                <>
                  {/* Risk Banner */}
                  <div
                    style={{
                      backgroundColor: isIndeterminate
                        ? 'rgba(245, 158, 11, 0.15)'
                        : scanResult.riskScore > 50
                        ? 'rgba(239, 68, 68, 0.15)'
                        : '#131b2e',
                      border: `1px solid ${
                        isIndeterminate
                          ? '#f59e0b'
                          : scanResult.riskScore > 50
                          ? '#ef4444'
                          : '#334155'
                      }`,
                      borderRadius: '6px',
                      padding: '12px',
                      marginBottom: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>
                        {isIndeterminate ? 'Scope Advisory' : 'Risk Assessment'}
                      </div>
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: 800,
                          color: isIndeterminate
                            ? '#fbbf24'
                            : scanResult.riskScore > 50
                            ? '#f87171'
                            : '#34d399',
                        }}
                      >
                        {isIndeterminate
                          ? 'Sparse Content / Indeterminate Scan'
                          : scanResult.riskScore > 70
                          ? 'Predatory Terms Detected'
                          : scanResult.riskScore > 30
                          ? 'Moderate Risk'
                          : 'Clean / Low Risk'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '20px',
                          fontWeight: 900,
                          color: isIndeterminate
                            ? '#f59e0b'
                            : scanResult.riskScore > 50
                            ? '#ef4444'
                            : '#10b981',
                          fontFamily: 'ui-monospace, monospace',
                        }}
                      >
                        {isIndeterminate ? '—' : scanResult.riskScore}
                      </span>
                      <span style={{ fontSize: '11px', color: isIndeterminate ? '#f59e0b' : '#64748b' }}>
                        /100
                      </span>
                    </div>
                  </div>

                  {/* Finding Stats */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      marginBottom: '14px',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        backgroundColor: '#131b2e',
                        border: '1px solid #1e293b',
                        borderRadius: '4px',
                        textAlign: 'center',
                      }}
                    >
                      <span style={{ color: '#ef4444', marginRight: '4px' }}>●</span>
                      {scanResult.summary.critical} Watch out
                    </div>
                    <div
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        backgroundColor: '#131b2e',
                        border: '1px solid #1e293b',
                        borderRadius: '4px',
                        textAlign: 'center',
                      }}
                    >
                      <span style={{ color: '#f59e0b', marginRight: '4px' }}>●</span>
                      {scanResult.summary.warning} Problem
                    </div>
                    <div
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        backgroundColor: '#131b2e',
                        border: '1px solid #1e293b',
                        borderRadius: '4px',
                        textAlign: 'center',
                      }}
                    >
                      <span style={{ color: '#38bdf8', marginRight: '4px' }}>●</span>
                      {scanResult.matches.length} Total
                    </div>
                  </div>

                  {/* Discovered Governing Agreements (non-sparse clean or with findings) */}
                  {!isIndeterminate && scanResult.discoveredLinks && scanResult.discoveredLinks.length > 0 && (
                    <DiscoveredLinksCard
                      links={scanResult.discoveredLinks}
                      onNavigate={handleNavigateToContract}
                    />
                  )}

                  {/* Clause Findings / Proof of Work Receipt / Sparse Content Warning */}
                  {isIndeterminate ? (
                    <SparseScanWarning
                      scanResult={scanResult}
                      onNavigate={handleNavigateToContract}
                    />
                  ) : isClean ? (
                    <AuditReceiptCard scanResult={scanResult} />
                  ) : (
                    <>
                      {/* Phase 2: Actionable Advocate Handoff Banner */}
                      {(() => {
                        const targetTool = resolveDestinationTool(scanResult.matches, activeHostname);
                        return (
                          <div
                            style={{
                              backgroundColor: '#0f172a',
                              border: '1px solid #0284c7',
                              borderRadius: '6px',
                              padding: '10px 12px',
                              marginBottom: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#f1f5f9' }}>
                                Take Action: Dispute or Cancel
                              </span>
                              <span
                                style={{
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                                  color: '#38bdf8',
                                  borderRadius: '4px',
                                  fontWeight: 600,
                                }}
                              >
                                {targetTool.name}
                              </span>
                            </div>
                            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: 1.35 }}>
                              {targetTool.tagline}. Pre-loads sanitized findings into an advocate workflow with zero cloud storage.
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                              <button
                                type="button"
                                onClick={handleBatchHandoff}
                                style={{
                                  backgroundColor: '#0284c7',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '6px 12px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                              >
                                Launch Rights Advocate →
                              </button>
                            </div>
                          </div>
                        );
                      })()}

                      {handoffStatus && (
                        <div
                          style={{
                            padding: '6px 10px',
                            marginBottom: '10px',
                            backgroundColor: 'rgba(56, 189, 248, 0.1)',
                            border: '1px solid #0284c7',
                            borderRadius: '4px',
                            color: '#38bdf8',
                            fontSize: '11px',
                            fontWeight: 500,
                            textAlign: 'center',
                          }}
                        >
                          ✓ {handoffStatus}
                        </div>
                      )}

                      {scanResult.matches.map((match) => (
                        <TrapCard
                          key={match.ruleId}
                          match={match}
                          sourceDomain={activeHostname}
                          onHandoff={handleSingleHandoff}
                        />
                      ))}
                    </>
                  )}
                </>
              );
            })()}

            {/* Browser Support & Local ML Upgrade Notice */}
            {(nanoState === 'unsupported-browser' || nanoState === 'unsupported-hardware') && (
              <div
                style={{
                  marginTop: '12px',
                  marginBottom: '10px',
                  padding: '10px 12px',
                  backgroundColor: '#0c1322',
                  border: '1px solid #1e293b',
                  borderRadius: '6px',
                  fontSize: '11px',
                  lineHeight: 1.45,
                  color: '#94a3b8',
                }}
              >
                <div style={{ color: '#f1f5f9', fontWeight: 600, marginBottom: '4px' }}>
                  Plain Language AI Summaries
                </div>
                <div>
                  Plain language summaries use Chrome's built-in Prompt API — AI that runs entirely on your device.
                  Your browser doesn't support it yet.
                </div>
                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <a
                    href="https://developer.chrome.com/docs/ai/prompt-api"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 500 }}
                  >
                    → How to enable on Chrome
                  </a>
                  <a
                    href="https://github.com/knowthankyew/knowthankyew-extension/blob/main/docs/LOCAL-ML-SETUP.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 500 }}
                  >
                    → Run a local model on Firefox/Safari
                  </a>
                  <a
                    href="https://www.w3.org/groups/wg/webmachinelearning/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 500 }}
                  >
                    → window.ai browser support status (W3C WebML)
                  </a>
                </div>
              </div>
            )}
          </>
        ) : null}
      </main>

      {/* Footer Controls */}
      <footer
        style={{
          borderTop: '1px solid #1e293b',
          paddingTop: '12px',
          marginTop: '12px',
          display: 'flex',
          gap: '8px',
        }}
      >
        <button
          onClick={() => performScan()}
          disabled={scanning}
          style={{
            flex: 1,
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            color: '#f1f5f9',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: scanning ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {scanning ? 'Scanning...' : '↻ Rescan Tab'}
        </button>

        <button
          onClick={() => setShowTelemetryModal(true)}
          style={{
            flex: 1,
            backgroundColor: '#0f172a',
            border: '1px solid #38bdf8',
            color: '#38bdf8',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          🔍 Audit Memory
        </button>

        <BurnButton onBurnCompleted={handleBurnCompleted} />
      </footer>

      {/* Legal Disclaimer */}
      <div
        style={{
          marginTop: '8px',
          textAlign: 'center',
          fontSize: '9.5px',
          color: '#64748b',
          lineHeight: 1.3,
        }}
      >
        Automated text analysis for informational/educational purposes only. Not legal advice.
      </div>

      {/* Embedded PrivacyAuditModal from @knowthankyew/privacy-telemetry */}
      <PrivacyAuditModal
        isOpen={showTelemetryModal}
        onClose={() => setShowTelemetryModal(false)}
        telemetry={telemetry}
        branding={{
          appTitle: 'KnowThankYew Reality Engine',
        }}
        onBurn={handleBurnCompleted}
      />
    </div>
  );
};
