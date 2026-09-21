import { describe, it, expect, beforeEach } from 'vitest';
import { telemetry, recordScanMetrics, hardBurnAllData } from '../src/telemetry/client';

describe('KnowThankYew Architectural Invariants (Telemetry & Zero-Egress)', () => {
  beforeEach(() => {
    telemetry.reset();
  });

  it('Pillar 1 & 2: Instantiates in memory_only mode with network egress denied', () => {
    const config = telemetry.getConfig();
    expect(config.mode).toBe('memory_only');
    expect(config.networkEgress).toBe('deny');
    expect(config.burnEnabled).toBe(true);
    expect(config.allowRawPayloads).toBe(false);
  });

  it('Pillar 3: Records operational metrics strictly using safe allowlist keys', () => {
    recordScanMetrics({ critical: 2, warning: 1, info: 0 }, 142);
    const spans = telemetry.getBufferedSpans();
    expect(spans.length).toBe(1);

    const span = spans[0];
    expect(span.name).toBe('extension.page_scan');
    expect(span.attributes['extension.traps_found']).toBe(3);
    expect(span.attributes['extension.critical_count']).toBe(2);
    expect(span.attributes['extension.scan_duration_ms']).toBe(142);

    // Verify no arbitrary raw text or unauthorized key exists
    expect(span.attributes['raw_text']).toBeUndefined();
    expect(span.attributes['document_body']).toBeUndefined();
  });

  it('Pillar 5: Hard Burn completely flushes buffered spans and session audit events', async () => {
    recordScanMetrics({ critical: 1, warning: 0, info: 0 }, 55);
    expect(telemetry.getBufferedSpans().length).toBeGreaterThan(0);
    expect(telemetry.getAuditLog().length).toBeGreaterThan(0);

    await hardBurnAllData();

    expect(telemetry.getBufferedSpans().length).toBe(0);
    expect(telemetry.getAuditLog().length).toBe(0);
    const report = telemetry.getPrivacyAuditReport();
    expect(report.activeSpanCount).toBe(0);
    expect(report.sessionAuditCount).toBe(0);
  });
});
