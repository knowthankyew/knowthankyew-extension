import React from 'react';
import { DiscoveredLegalLink } from '../../core/types';

interface DiscoveredLinksCardProps {
  links: DiscoveredLegalLink[];
  onNavigate: (url: string) => void;
}

const CATEGORY_META = {
  TERMS: {
    label: 'TERMS',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: '#38bdf8',
    text: '#38bdf8',
    icon: '📜',
  },
  ARBITRATION: {
    label: 'ARBITRATION',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: '#f59e0b',
    text: '#fbbf24',
    icon: '⚖️',
  },
  BILLING: {
    label: 'BILLING',
    bg: 'rgba(192, 132, 252, 0.12)',
    border: '#c084fc',
    text: '#d8b4fe',
    icon: '💳',
  },
  PRIVACY: {
    label: 'PRIVACY',
    bg: 'rgba(52, 211, 153, 0.12)',
    border: '#34d399',
    text: '#34d399',
    icon: '🔒',
  },
};

export const DiscoveredLinksCard: React.FC<DiscoveredLinksCardProps> = ({ links, onNavigate }) => {
  if (!links || links.length === 0) return null;

  const getDisplayPath = (rawUrl: string) => {
    try {
      const parsed = new URL(rawUrl);
      return parsed.pathname.length > 1 ? parsed.pathname : parsed.hostname;
    } catch {
      return rawUrl;
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#0c1322',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        borderRadius: '6px',
        padding: '12px',
        marginBottom: '14px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px' }}>🔗</span>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#f8fafc',
              letterSpacing: '0.02em',
            }}
          >
            Governing Agreements Discovered
          </span>
        </div>
        <span
          style={{
            fontSize: '10px',
            color: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            padding: '2px 6px',
            borderRadius: '10px',
            fontWeight: 600,
            border: '1px solid rgba(56, 189, 248, 0.2)',
          }}
        >
          {links.length} found
        </span>
      </div>

      <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '10px', lineHeight: 1.4 }}>
        Underlying consumer contracts governing this domain. Click to audit:
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {links.map((link, idx) => {
          const meta = CATEGORY_META[link.category] || CATEGORY_META.TERMS;
          return (
            <div
              key={`${link.url}-${idx}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                backgroundColor: '#131b2e',
                border: '1px solid #1e293b',
                borderRadius: '5px',
                gap: '8px',
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '11px' }}>{meta.icon}</span>
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: '#e2e8f0',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {link.title}
                  </span>
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      color: meta.text,
                      backgroundColor: meta.bg,
                      border: `1px solid ${meta.border}`,
                      borderRadius: '3px',
                      padding: '1px 4px',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {meta.label}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: '#64748b',
                    fontFamily: 'ui-monospace, monospace',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={link.url}
                >
                  {getDisplayPath(link.url)}
                </div>
              </div>

              <button
                onClick={() => onNavigate(link.url)}
                style={{
                  backgroundColor: '#0284c7',
                  border: '1px solid #38bdf8',
                  color: '#ffffff',
                  padding: '5px 10px',
                  borderRadius: '4px',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  cursor: 'pointer',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  transition: 'background-color 0.15s ease',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0369a1')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0284c7')}
              >
                <span>Audit</span>
                <span>→</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
