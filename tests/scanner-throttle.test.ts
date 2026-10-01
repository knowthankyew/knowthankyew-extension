import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  BUCKET_CAPACITY,
  TOKEN_REFILL_INTERVAL_MS,
  DEBOUNCE_DELAY_MS,
  TEXT_DELTA_THRESHOLD,
  consumeScanToken,
  getTokenCount,
  resetTokenBucket,
} from '../src/content/scanner';

/**
 * Tests the Token-Bucket MutationObserver throttle logic in scanner.ts:
 * - 400ms debounce delay between mutation batches
 * - 15 token capacity ceiling (steady-state 15 scans/minute)
 * - 1 token refill every 4,000ms (eliminates cliff-edge exhaustion on SPAs)
 * - 25-character text delta threshold (only rescans on meaningful content changes)
 */

describe('MutationObserver Token-Bucket Throttle Behavior (scanner-throttle.test.ts)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetTokenBucket();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('enforces the burst ceiling (15 tokens) and throttles the 16th immediate scan', () => {
    expect(getTokenCount()).toBe(BUCKET_CAPACITY);

    let executedScans = 0;
    // Attempt 15 scans immediately
    for (let i = 0; i < 15; i++) {
      if (consumeScanToken()) {
        executedScans++;
      }
    }

    expect(executedScans).toBe(15);
    expect(getTokenCount()).toBe(0);

    // 16th scan with 0 elapsed time must be throttled
    const throttled = consumeScanToken();
    expect(throttled).toBe(false);
  });

  it('smoothly replenishes tokens at 1 token per 4,000ms interval', () => {
    expect(TOKEN_REFILL_INTERVAL_MS).toBe(4000);

    // Exhaust all 15 tokens
    for (let i = 0; i < 15; i++) {
      expect(consumeScanToken()).toBe(true);
    }
    expect(getTokenCount()).toBe(0);
    expect(consumeScanToken()).toBe(false);

    // Advance 3,999ms (TOKEN_REFILL_INTERVAL_MS - 1) — still not enough for a full token
    vi.advanceTimersByTime(TOKEN_REFILL_INTERVAL_MS - 1);
    expect(getTokenCount(Date.now())).toBe(0);
    expect(consumeScanToken(Date.now())).toBe(false);

    // Advance 1ms (total TOKEN_REFILL_INTERVAL_MS) — exactly 1 token replenished
    vi.advanceTimersByTime(1);
    expect(getTokenCount(Date.now())).toBe(1);
    expect(consumeScanToken(Date.now())).toBe(true);
    expect(getTokenCount(Date.now())).toBe(0);

    // Advance 3 refill intervals — exactly 3 tokens replenished
    vi.advanceTimersByTime(TOKEN_REFILL_INTERVAL_MS * 3);
    expect(getTokenCount(Date.now())).toBe(3);

    // Consume all 3
    expect(consumeScanToken(Date.now())).toBe(true);
    expect(consumeScanToken(Date.now())).toBe(true);
    expect(consumeScanToken(Date.now())).toBe(true);
    expect(consumeScanToken(Date.now())).toBe(false);
  });

  it('caps token replenishment at BUCKET_CAPACITY (15) and never overflows', () => {
    // Reset to full
    resetTokenBucket();
    expect(getTokenCount()).toBe(15);

    // Advance 10 minutes into the future without consuming
    vi.advanceTimersByTime(600000);

    // Must still be capped at 15
    expect(getTokenCount(Date.now())).toBe(15);

    // Only 15 scans can burst
    let successfulScans = 0;
    for (let i = 0; i < 20; i++) {
      if (consumeScanToken(Date.now())) {
        successfulScans++;
      }
    }
    expect(successfulScans).toBe(15);
  });

  it('ignores mutations below the TEXT_DELTA_THRESHOLD (25 chars) without consuming tokens', () => {
    let lastTextLength = 1000;

    function simulateMutationAttempt(newTextLength: number): boolean {
      const lengthDelta = Math.abs(newTextLength - lastTextLength);
      if (lengthDelta < TEXT_DELTA_THRESHOLD) {
        return false; // Sub-threshold
      }
      const tokenGranted = consumeScanToken(Date.now());
      if (tokenGranted) {
        lastTextLength = newTextLength;
      }
      return tokenGranted;
    }

    // Small change (5 chars) — ignored, token not consumed
    expect(simulateMutationAttempt(1005)).toBe(false);
    expect(getTokenCount(Date.now())).toBe(15);

    // Another small change (24 chars) — still below threshold
    expect(simulateMutationAttempt(1024)).toBe(false);
    expect(getTokenCount(Date.now())).toBe(15);

    // Exact threshold (25 chars) — triggers scan and consumes 1 token
    expect(simulateMutationAttempt(1025)).toBe(true);
    expect(getTokenCount(Date.now())).toBe(14);

    // Large change (500 chars) — triggers scan and consumes 1 token
    expect(simulateMutationAttempt(1525)).toBe(true);
    expect(getTokenCount(Date.now())).toBe(13);
  });

  it('debounce delay prevents rapid-fire scans within 400ms', () => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let scanCount = 0;

    function simulateMutation() {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        scanCount++;
      }, DEBOUNCE_DELAY_MS);
    }

    // Fire 10 mutations in rapid succession (every 50ms)
    for (let i = 0; i < 10; i++) {
      simulateMutation();
      vi.advanceTimersByTime(50);
    }

    // Debounce timer is still pending
    expect(scanCount).toBe(0);

    // Advance past the 400ms debounce window
    vi.advanceTimersByTime(400);

    // Exactly 1 debounced scan fires
    expect(scanCount).toBe(1);
  });

  it('resetTokenBucket restores bucket immediately to maximum capacity', () => {
    for (let i = 0; i < 15; i++) {
      consumeScanToken();
    }
    expect(getTokenCount()).toBe(0);

    resetTokenBucket();
    expect(getTokenCount()).toBe(15);
    expect(consumeScanToken()).toBe(true);
  });
});
