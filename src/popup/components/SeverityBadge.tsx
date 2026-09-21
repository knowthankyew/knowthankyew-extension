import React from 'react';
import { Severity } from '../../core/types';

interface SeverityBadgeProps {
  severity: Severity;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  const styles = {
    CRITICAL: {
      bg: 'rgba(239, 68, 68, 0.15)',
      border: '#ef4444',
      text: '#f87171',
      label: 'CRITICAL TRAP',
    },
    WARNING: {
      bg: 'rgba(245, 158, 11, 0.15)',
      border: '#f59e0b',
      text: '#fbbf24',
      label: 'HIGH RISK',
    },
    INFO: {
      bg: 'rgba(56, 189, 248, 0.15)',
      border: '#38bdf8',
      text: '#7dd3fc',
      label: 'ADVISORY',
    },
  }[severity];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        backgroundColor: styles.bg,
        border: `1px solid ${styles.border}`,
        color: styles.text,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      }}
    >
      {styles.label}
    </span>
  );
};
