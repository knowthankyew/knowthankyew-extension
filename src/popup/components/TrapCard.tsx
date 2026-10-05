import React, { useState, useEffect } from 'react';
import { EvaluationMatch } from '../../core/types';
import { SeverityBadge } from './SeverityBadge';
import { ChromePromptAPIAdapter } from '../../ml/chrome-ai-adapter';
import { ClauseSummary } from '../../ml/nano-types';

interface TrapCardProps {
  match: EvaluationMatch;
  sourceDomain?: string;
  onHandoff?: (match: EvaluationMatch) => void;
}

export const TrapCard: React.FC<TrapCardProps> = ({ match, sourceDomain, onHandoff }) => {
  const [expanded, setExpanded] = useState(false);
  const [nanoSummary, setNanoSummary] = useState<ClauseSummary | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const adapter = new ChromePromptAPIAdapter(true);
    const controller = new AbortController();

    (async () => {
      try {
        const status = await adapter.getStatus();
        if (!status.isAvailable || isCancelled) return;
        const summary = await adapter.summarizeTrapClause(
          match.matchedSnippet,
          match.category,
          controller.signal
        );
        if (!isCancelled && summary) {
          setNanoSummary(summary);
        }
      } catch {
        // Fall back cleanly to heuristic explanation with zero error state or user disruption
      }
    })();

    return () => {
      isCancelled = true;
      controller.abort();
      adapter.burn();
    };
  }, [match.matchedSnippet, match.category]);

  const plainLanguageText = nanoSummary?.obligationSummary || match.explanation;

  // Calendar reminder generator for auto-renewal traps (zero new permissions, standard link)
  const isAutoRenewal = match.category === 'AUTO_RENEWAL';
  let calendarUrl = '';
  if (isAutoRenewal) {
    const domain = sourceDomain || 'Subscription';
    const now = new Date();
    // Default reminder date: 25 days from today (before typical 30-day renewal cycle)
    const reminderDate = new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000);
    const startIso = reminderDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endDate = new Date(reminderDate.getTime() + 60 * 60 * 1000);
    const endIso = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const eventTitle = encodeURIComponent(`Cancel ${domain} subscription before renewal`);
    const eventDetails = encodeURIComponent(
      `Reminder from KnowThankYew:\n${plainLanguageText}\n\nReview your subscription settings or bank card before the recurring billing date.`
    );
    calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${startIso}/${endIso}&details=${eventDetails}`;
  }

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

      {/* Plain English Translation (Nano On-Device or Rule Explanation Fallback) */}
      <p
        style={{
          fontSize: '12.5px',
          color: '#e2e8f0',
          margin: '0 0 10px 0',
          lineHeight: 1.45,
          fontWeight: 500,
        }}
      >
        {plainLanguageText}
      </p>

      {/* Surrendered rights line if detected by Nano */}
      {nanoSummary?.rightsWaived && (
        <div
          style={{
            fontSize: '11px',
            color: '#f87171',
            marginBottom: '8px',
            lineHeight: 1.35,
          }}
        >
          <strong>Rights surrendered:</strong> {nanoSummary.rightsWaived}
        </div>
      )}

      <div
        style={{
          backgroundColor: '#090d16',
          borderLeft: '3px solid #f59e0b',
          padding: '6px 8px',
          borderRadius: '2px',
          fontSize: '11px',
          color: '#fbbf24',
          marginBottom: '10px',
          lineHeight: 1.3,
        }}
      >
        <strong>Advocate Tip:</strong> {match.recommendation}
      </div>

      {/* Calendar reminder button for recurring billing traps */}
      {isAutoRenewal && calendarUrl && (
        <div style={{ marginBottom: '10px' }}>
          <a
            href={calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 10px',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid #0284c7',
              borderRadius: '4px',
              color: '#38bdf8',
              fontSize: '11px',
              fontWeight: 600,
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            <span>📅</span>
            <span>Remind me to cancel in 25 days</span>
          </a>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <button
          type="button"
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

        {onHandoff && (
          <button
            type="button"
            onClick={() => onHandoff(match)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid #0284c7',
              borderRadius: '4px',
              color: '#38bdf8',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Defend Rights →
          </button>
        )}
      </div>

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
  );
};
