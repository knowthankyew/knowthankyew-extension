import React, { useState } from 'react';
import { PageScanResult } from '../../core/types';

interface SparseScanWarningProps {
  scanResult: PageScanResult;
  onNavigate: (url: string) => void;
}

export const SparseScanWarning: React.FC<SparseScanWarningProps> = ({ scanResult, onNavigate }) => {
  const [isTextInspectOpen, setIsTextInspectOpen] = useState(false);

  const charCount = scanResult.scannedLength;
  const wordCount = scanResult.wordCount ?? Math.round(charCount / 5);
  const textSnippet = scanResult.sanitizedTextPreview || scanResult.extractedTextSnippet || '';
  const discoveredLinks = scanResult.discoveredLinks || [];
  const primaryLink = discoveredLinks.find((l) => l.category === 'TERMS') || discoveredLinks[0];
  const secondaryLinks = discoveredLinks.filter((l) => l !== primaryLink);

  return (
    <div
      data-testid="sparse-scan-warning"
      style={{
        backgroundColor: '#0c1322',
        border: '1px solid rgba(245, 158, 11, 0.4)',
        borderRadius: '6px',
        padding: '14px',
        marginBottom: '14px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.35)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
          borderBottom: '1px solid #1e293b',
          paddingBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px' }}>⚠️</span>
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#fbbf24',
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
              }}
            >
              Sparse Content / Indeterminate Scan
            </div>
            <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
              Only {charCount} characters evaluated · Sub-threshold extraction
            </div>
          </div>
        </div>
        <span
          style={{
            fontSize: '9.5px',
            color: '#fbbf24',
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            padding: '2px 7px',
            borderRadius: '10px',
            fontWeight: 700,
            border: '1px solid rgba(245, 158, 11, 0.3)',
            letterSpacing: '0.03em',
          }}
        >
          INCONCLUSIVE
        </span>
      </div>

      {/* Advisory Explanation */}
      <div
        style={{
          fontSize: '11px',
          color: '#cbd5e1',
          lineHeight: 1.45,
          marginBottom: '12px',
          backgroundColor: '#131b2e',
          border: '1px solid #1e293b',
          borderRadius: '5px',
          padding: '10px',
        }}
      >
        <div style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
          Why is this scan indeterminate?
        </div>
        <div>
          The engine extracted fewer than 250 characters of visible text (~{wordCount} words). A green &ldquo;Clean&rdquo; verdict
          is suppressed to prevent silent failures. Substantive subscription clauses may be trapped inside:
        </div>
        <ul
          style={{
            margin: '8px 0 0 0',
            paddingLeft: '16px',
            color: '#94a3b8',
            fontSize: '10.5px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
          }}
        >
          <li>Cross-origin <code style={{ color: '#38bdf8' }}>&lt;iframe&gt;</code> (payment processor or third-party checkout)</li>
          <li>Closed Shadow DOM or canvas / PDF embedded viewer</li>
          <li>Collapsed accordion, closed drawer, or dynamic modal</li>
          <li>External agreement hosted on a separate linked page</li>
        </ul>
      </div>

      {/* Elevated Action for Discovered Links */}
      {primaryLink ? (
        <div
          style={{
            backgroundColor: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '5px',
            padding: '10px',
            marginBottom: '12px',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#38bdf8',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              marginBottom: '4px',
            }}
          >
            Discovered Linked Agreement
          </div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#f8fafc',
              marginBottom: '2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {primaryLink.title}
          </div>
          <div
            style={{
              fontSize: '10px',
              color: '#64748b',
              fontFamily: 'ui-monospace, monospace',
              marginBottom: '8px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {primaryLink.url}
          </div>
          <button
            onClick={() => onNavigate(primaryLink.url)}
            style={{
              width: '100%',
              backgroundColor: '#0284c7',
              border: '1px solid #38bdf8',
              color: '#ffffff',
              padding: '7px 12px',
              borderRadius: '5px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontFamily: 'inherit',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0369a1')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0284c7')}
          >
            <span>Open &amp; Scan Linked Terms</span>
            <span>→</span>
          </button>
          {secondaryLinks.length > 0 && (
            <div
              style={{
                marginTop: '10px',
                paddingTop: '8px',
                borderTop: '1px solid rgba(56, 189, 248, 0.2)',
              }}
            >
              <div
                style={{
                  fontSize: '9.5px',
                  color: '#94a3b8',
                  marginBottom: '6px',
                  fontWeight: 600,
                }}
              >
                Other Discovered Agreements ({secondaryLinks.length}):
              </div>
              {secondaryLinks.map((link, idx) => (
                <div
                  key={`${link.url}-${idx}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '4px',
                    padding: '3px 0',
                  }}
                >
                  <span
                    style={{
                      fontSize: '10.5px',
                      color: '#cbd5e1',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '220px',
                    }}
                    title={link.url}
                  >
                    {link.title}
                  </span>
                  <button
                    onClick={() => onNavigate(link.url)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#38bdf8',
                      fontSize: '10.5px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      padding: '2px 4px',
                      fontFamily: 'inherit',
                    }}
                  >
                    Audit →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            fontSize: '10.5px',
            color: '#94a3b8',
            backgroundColor: '#131b2e',
            border: '1px solid #1e293b',
            borderRadius: '4px',
            padding: '8px 10px',
            marginBottom: '12px',
            lineHeight: 1.4,
          }}
        >
          💡 <strong style={{ color: '#f1f5f9' }}>Action:</strong> Open the service&apos;s full Terms of Service or Checkout tab and click &ldquo;↻ Rescan Tab&rdquo; below.
        </div>
      )}

      {/* Collapsible Sanitized Text Preview (Inspect what was found) */}
      <div style={{ borderTop: '1px solid #1e293b', paddingTop: '10px' }}>
        <button
          onClick={() => setIsTextInspectOpen(!isTextInspectOpen)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#131b2e',
            border: '1px solid #334155',
            borderRadius: '5px',
            padding: '6px 10px',
            color: '#e2e8f0',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🔍</span>
            <span>Inspect Evaluated Text ({charCount} chars)</span>
          </span>
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>
            {isTextInspectOpen ? '▲ Hide' : '▼ Expand'}
          </span>
        </button>

        {isTextInspectOpen && (
          <div
            style={{
              marginTop: '8px',
              backgroundColor: '#070d19',
              border: '1px solid #1e293b',
              borderRadius: '5px',
              padding: '10px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px',
                fontSize: '9.5px',
                color: '#64748b',
              }}
            >
              <span>Sanitized Ingest Content</span>
              <span style={{ color: '#fbbf24' }}>● Sparse Scope</span>
            </div>
            <pre
              data-testid="sanitized-text-preview"
              style={{
                margin: 0,
                fontSize: '10px',
                fontFamily: 'ui-monospace, monospace',
                color: '#cbd5e1',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: '120px',
                overflowY: 'auto',
                lineHeight: 1.45,
                backgroundColor: 'transparent',
              }}
            >
              {textSnippet || '(No text extracted from page containers)'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
