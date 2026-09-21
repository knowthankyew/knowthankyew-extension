import React, { useState } from 'react';
import { EvaluationMatch } from '../../core/types';
import { SeverityBadge } from './SeverityBadge';

interface TrapCardProps {
  match: EvaluationMatch;
}

export const TrapCard: React.FC<TrapCardProps> = ({ match }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        backgroundColor: '#131b2e',
        border: '1px solid #1e293b',
        borderRadius: '6px',
        padding: '12px',
        marginBottom: '10px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '8px',
          marginBottom: '8px',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: 600,
            color: '#f1f5f9',
            lineHeight: 1.3,
          }}
        >
          {match.title}
        </h3>
        <SeverityBadge severity={match.severity} />
      </div>

      <div
        style={{
          fontSize: '10px',
          color: '#38bdf8',
          fontFamily: 'ui-monospace, monospace',
          marginBottom: '8px',
        }}
      >
        ⚖️ {match.statute.code} ({match.statute.jurisdiction})
      </div>

      <p
        style={{
          fontSize: '12px',
          color: '#cbd5e1',
          margin: '0 0 8px 0',
          lineHeight: 1.4,
        }}
      >
        {match.explanation}
      </p>

      <div
        style={{
          backgroundColor: '#090d16',
          borderLeft: '3px solid #f59e0b',
          padding: '6px 8px',
          borderRadius: '2px',
          fontSize: '11px',
          color: '#fbbf24',
          marginBottom: '8px',
          lineHeight: 1.3,
        }}
      >
        <strong>Advocate Tip:</strong> {match.recommendation}
      </div>

      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            fontSize: '10px',
            color: '#94a3b8',
            cursor: 'pointer',
            textDecoration: 'underline',
            fontFamily: 'inherit',
          }}
        >
          {expanded ? '▲ Hide Detected Clause Snippet' : '▼ Inspect Local Matched Text'}
        </button>

        {expanded && (
          <div
            style={{
              marginTop: '6px',
              padding: '8px',
              backgroundColor: '#090d16',
              border: '1px dashed #334155',
              borderRadius: '4px',
              fontSize: '10px',
              fontFamily: 'ui-monospace, monospace',
              color: '#e2e8f0',
              lineHeight: 1.4,
              wordBreak: 'break-word',
            }}
          >
            "{match.matchedSnippet}"
          </div>
        )}
      </div>
    </div>
  );
};
