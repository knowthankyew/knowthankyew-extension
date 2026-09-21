import React, { useState, useEffect, useCallback } from 'react';
import { PageScanResult } from '../core/types';
import { TrapCard } from './components/TrapCard';
import { BurnButton } from './components/BurnButton';
import { DiscoveredLinksCard } from './components/DiscoveredLinksCard';
import { telemetry, recordScanMetrics } from '../telemetry/client';
import { PrivacyAuditModal } from '@knowthankyew/privacy-telemetry/react';

export const App: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<PageScanResult | null>(null);
  const [activeHostname, setActiveHostname] = useState<string>('local-tab');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showTelemetryModal, setShowTelemetryModal] = useState(false);

  const performScan = useCallback(async () => {
    setScanning(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) {
          setErrorMessage('No active tab detected');
          setScanning(false);
          return;
        }

        try {
          const url = new URL(tab.url || 'http://localhost');
          setActiveHostname(url.hostname);
        } catch {
          setActiveHostname('browser-tab');
        }

        // Send scan request to content script, with automatic script injection fallback
        chrome.tabs.sendMessage(
          tab.id,
          { type: 'KTY_REQUEST_PAGE_SCAN' },
          async (response) => {
            if (chrome.runtime.lastError || !response || !response.success) {
              // Try on-demand injection via chrome.scripting
              try {
                if (chrome.scripting?.executeScript && tab.id) {
                  await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content/scanner.js'],
                  });
                  // Retry scan request after injection
                  chrome.tabs.sendMessage(
                    tab.id,
                    { type: 'KTY_REQUEST_PAGE_SCAN' },
                    (retryRes) => {
                      const duration = Math.round(performance.now() - startTime);
                      if (retryRes && retryRes.success) {
                        setScanResult(retryRes.data);
                        recordScanMetrics(retryRes.data.summary, duration);
                      } else {
                        setErrorMessage(
                          'Cannot scan restricted browser system page. Navigate to an HTTP/HTTPS checkout or terms page.'
                        );
                      }
                      setScanning(false);
                    }
                  );
                  return;
                }
              } catch {
                // Restricted page (chrome://, edge://, etc.)
              }

              setErrorMessage(
                'Cannot scan restricted browser system page or protected URL. Navigate to an active checkout, terms, or subscription agreement page.'
              );
              setScanning(false);
              return;
            }

            const duration = Math.round(performance.now() - startTime);
            const result: PageScanResult = response.data;
            setScanResult(result);
            recordScanMetrics(result.summary, duration);
            setScanning(false);
          }
        );
      } else {
        // Fallback demo state when opened outside extension environment (e.g. dev server)
        setActiveHostname('example.com (Dev Mode)');
        setScanResult({
          timestamp: new Date().toISOString(),
          urlDomain: 'example.com',
          scannedLength: 3420,
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

  const handleBurnCompleted = () => {
    setScanResult(null);
    setErrorMessage('All session data and local storage have been incinerated.');
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
          <div
            style={{
              padding: '3px 8px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid #10b981',
              borderRadius: '12px',
              fontSize: '10px',
              color: '#34d399',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
            Zero Egress
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
        ) : errorMessage ? (
          <div
            style={{
              padding: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              color: '#fca5a5',
              fontSize: '12px',
              lineHeight: 1.4,
            }}
          >
            {errorMessage}
          </div>
        ) : scanResult ? (
          <>
            {/* Risk Banner */}
            <div
              style={{
                backgroundColor: scanResult.riskScore > 50 ? 'rgba(239, 68, 68, 0.15)' : '#131b2e',
                border: `1px solid ${scanResult.riskScore > 50 ? '#ef4444' : '#334155'}`,
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
                  Risk Assessment
                </div>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 800,
                    color: scanResult.riskScore > 50 ? '#f87171' : '#34d399',
                  }}
                >
                  {scanResult.riskScore > 70
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
                    color: scanResult.riskScore > 50 ? '#ef4444' : '#10b981',
                    fontFamily: 'ui-monospace, monospace',
                  }}
                >
                  {scanResult.riskScore}
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>/100</span>
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
                {scanResult.summary.critical} Critical
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
                {scanResult.summary.warning} Warning
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

            {/* Discovered Governing Agreements */}
            {scanResult.discoveredLinks && scanResult.discoveredLinks.length > 0 && (
              <DiscoveredLinksCard
                links={scanResult.discoveredLinks}
                onNavigate={handleNavigateToContract}
              />
            )}

            {/* Clause Findings */}
            {scanResult.matches.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '24px 16px',
                  color: '#94a3b8',
                  fontSize: '12px',
                  backgroundColor: '#131b2e',
                  border: '1px solid #1e293b',
                  borderRadius: '6px',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontSize: '20px', marginBottom: '8px' }}>🔍</div>
                <div style={{ color: '#f1f5f9', fontWeight: 600, marginBottom: '6px' }}>
                  No Matched Traps Detected in Visible Text
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  {scanResult.limitationsNotice}
                </div>
                <div style={{ fontSize: '10.5px', color: '#38bdf8', marginTop: '6px' }}>
                  Tip: If terms are hosted on a separate linked page, navigate to that tab and click Rescan.
                </div>
              </div>
            ) : (
              scanResult.matches.map((match) => (
                <TrapCard key={match.ruleId} match={match} />
              ))
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
