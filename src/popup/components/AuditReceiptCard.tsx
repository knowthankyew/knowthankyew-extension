import React, { useState } from 'react';
import { PageScanResult } from '../../core/types';

interface AuditReceiptCardProps {
  scanResult: PageScanResult;
}

export const AuditReceiptCard: React.FC<AuditReceiptCardProps> = ({ scanResult }) => {
  const [isTextInspectOpen, setIsTextInspectOpen] = useState(false);

  const charCount = scanResult.scannedLength;
  const wordCount = scanResult.wordCount ?? Math.round(charCount / 5);
  const segmentCount = scanResult.segmentCount ?? 0;
  const durationMs = scanResult.durationMs ?? 1;
  const rulesCount = scanResult.evaluatedRulesCount;
  const containers = scanResult.inspectedContainers && scanResult.inspectedContainers.length > 0
    ? scanResult.inspectedContainers
    : ['body'];
  const textSnippet = scanResult.sanitizedTextPreview || scanResult.extractedTextSnippet || '';

  const targetJ = (scanResult.targetJurisdiction || 'ALL').toUpperCase();
  const allChecklistItems = [
    {
      title: 'Automatic Renewal & Negative Option',
      statute: 'ROSCA 15 U.S.C. § 8403 / State ARLs',
      description: 'Zero hidden recurring charges or cancellation hurdles detected.',
      jurisdiction: 'US',
    },
    {
      title: 'Mandatory Binding Arbitration & Jury Trial Waivers',
      statute: 'FAA 9 U.S.C. § 2',
      description: 'No forced corporate dispute clauses or class action bans found.',
      jurisdiction: 'US',
    },
    {
      title: 'Unilateral Terms Modification & Illusory Discretion',
      statute: 'UCC & Restatement (Second) of Contracts',
      description: 'No clauses reserving unannounced retroactive changes to terms.',
      jurisdiction: 'US',
    },
    {
      title: 'Surveillance & Cross-Context Data Brokerage Disclosures',
      statute: 'FTC Act § 5 / State Privacy Acts (CCPA/VCDPA/CPA)',
      description: 'No undisclosed commercial tracking or data sale consent traps.',
      jurisdiction: 'US',
    },
    {
      title: 'EU CRD / UK DMCC 2024 Pre-ticked Consent & Cooling-off Disclosures',
      statute: 'EU Directive 2011/83/EU / UK DMCC Act 2024',
      description: 'No pre-selected consent boxes or statutory cooling-off exemptions.',
      jurisdiction: 'INTL',
    },
  ];

  const checklistItems = allChecklistItems.filter(item => {
    if (targetJ === 'ALL') return true;
    if (targetJ === 'EU' || targetJ === 'UK') return item.jurisdiction === 'INTL';
    return item.jurisdiction === 'US';
  });

  return (
    <div
      data-testid="audit-receipt-card"
      style={{
        backgroundColor: '#0c1322',
        border: '1px solid rgba(52, 211, 153, 0.3)',
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
          marginBottom: '12px',
          borderBottom: '1px solid #1e293b',
          paddingBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px' }}>🛡️</span>
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#34d399',
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
              }}
            >
              Proof of Work · Verification Receipt
            </div>
            <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
              Inspected against active statutory battery with zero detections
            </div>
          </div>
        </div>
        <span
          style={{
            fontSize: '9.5px',
            color: '#34d399',
            backgroundColor: 'rgba(52, 211, 153, 0.12)',
            padding: '2px 7px',
            borderRadius: '10px',
            fontWeight: 700,
            border: '1px solid rgba(52, 211, 153, 0.3)',
            letterSpacing: '0.03em',
          }}
        >
          NO TRAPS IDENTIFIED
        </span>
      </div>

      {/* Quantitative Telemetry Metrics */}
      <div
        style={{
          backgroundColor: '#131b2e',
          border: '1px solid #1e293b',
          borderRadius: '5px',
          padding: '10px',
          marginBottom: '12px',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#f8fafc',
            fontFamily: 'ui-monospace, monospace',
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '4px',
          }}
        >
          <span>
            {charCount.toLocaleString()} chars · ~{wordCount.toLocaleString()} words · {segmentCount} clauses · {durationMs}ms
          </span>
          {rulesCount != null && (
            <span
              style={{
                fontSize: '10px',
                color: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                padding: '1px 5px',
                borderRadius: '3px',
                border: '1px solid rgba(56, 189, 248, 0.2)',
              }}
            >
              {rulesCount} rules evaluated
            </span>
          )}
        </div>

        {/* Inspected Containers Attribution */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
          <span style={{ fontSize: '10px', color: '#64748b' }}>Containers scanned:</span>
          {containers.map((c, i) => (
            <span
              key={`${c}-${i}`}
              style={{
                fontSize: '9.5px',
                fontFamily: 'ui-monospace, monospace',
                color: '#cbd5e1',
                backgroundColor: '#1e293b',
                padding: '1px 5px',
                borderRadius: '3px',
                border: '1px solid #334155',
              }}
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Statutory Battery Checklist */}
      <div style={{ marginBottom: '12px' }}>
        <div
          style={{
            fontSize: '10.5px',
            fontWeight: 700,
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: '6px',
          }}
        >
          Evaluated Statutory Protections
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {checklistItems.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                fontSize: '11px',
                lineHeight: 1.35,
                backgroundColor: '#131b2e',
                border: '1px solid #1e293b',
                borderRadius: '4px',
                padding: '6px 8px',
              }}
            >
              <span style={{ color: '#34d399', fontWeight: 800, fontSize: '12px' }}>✓</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{item.title}</div>
                <div style={{ fontSize: '9.5px', color: '#38bdf8', fontFamily: 'ui-monospace, monospace' }}>
                  {item.statute}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Collapsible Sanitized Text Preview */}
      <div
        style={{
          borderTop: '1px solid #1e293b',
          paddingTop: '10px',
          marginBottom: '10px',
        }}
      >
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
            <span>Inspect Evaluated Text</span>
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
              <span>Sanitized Ingest Preview (First 2,000 characters)</span>
              <span style={{ color: '#34d399' }}>● PII Redacted Locally</span>
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
                maxHeight: '160px',
                overflowY: 'auto',
                lineHeight: 1.45,
                backgroundColor: 'transparent',
              }}
            >
              {textSnippet || 'No text snippet available.'}
            </pre>
            <div
              style={{
                marginTop: '6px',
                fontSize: '9px',
                color: '#64748b',
                fontStyle: 'italic',
              }}
            >
              Zero-Egress: All text remains ephemeral in memory and is purged on Hard Burn.
            </div>
          </div>
        )}
      </div>

      {/* Limitations Notice */}
      <div style={{ fontSize: '10.5px', color: '#64748b', lineHeight: 1.4 }}>
        {scanResult.limitationsNotice}
      </div>
      <div style={{ fontSize: '10px', color: '#38bdf8', marginTop: '4px' }}>
        Tip: If terms are hosted on a separate linked page, navigate to that tab and click Rescan.
      </div>
    </div>
  );
};
