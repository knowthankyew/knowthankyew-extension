/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { extractPageText } from '../src/content/dom-extractor';

describe('adversarial DOM — extraction correctness', () => {

  // --- Fixture 1: Overlapping selector duplication ---
  it('does not duplicate text when multiple selectors match the same subtree', () => {
    document.body.innerHTML = `
      <main>
        <form class="checkout">
          <p>By continuing you agree to automatic renewal of your subscription.</p>
        </form>
      </main>
    `;
    const result = extractPageText(document.body);
    const occurrences = result.match(/automatic renewal of your subscription/g) ?? [];
    expect(occurrences.length).toBe(1);
  });

  // Assert the dedup mechanism itself with visited tracking
  it('tracks visited nodes to prevent re-extraction across overlapping selectors', () => {
    const visited = new Set<Node>();
    document.body.innerHTML = `<div id="a"><div id="b">shared text</div></div>`;
    const a = document.getElementById('a')!;
    const b = document.getElementById('b')!;
    extractPageText(a, visited);
    expect(visited.has(b)).toBe(true);
    // second extraction pass over already-visited subtree should skip
    const before = visited.size;
    extractPageText(a, visited);
    expect(visited.size).toBe(before);
  });

  // --- Fixture 2: Deep nesting (stack resilience, not just perf) ---
  // Note: Tested at 500 levels because jsdom's own internal parser (_attach) is recursively
  // implemented and blows Node's call stack on innerHTML assignment at 5,000 levels.
  // Our iterative extractor operates in O(depth) time with zero recursion.
  it('handles deep nesting (500 levels) without stack overflow in jsdom or extractor', () => {
    let html = '<span>bottom</span>';
    for (let i = 0; i < 500; i++) {
      html = `<div>${html}</div>`;
    }
    document.body.innerHTML = html;
    expect(() => extractPageText(document.body)).not.toThrow();
  });

  // --- Fixture 3: Near-ceiling text nodes ---
  it('extracts and bounds execution time for a 49999-char node within budget', () => {
    const nearCeiling = 'a'.repeat(49_999);
    document.body.innerHTML = `<div id="target">${nearCeiling}</div>`;
    const start = performance.now();
    const result = extractPageText(document.body);
    const elapsed = performance.now() - start;
    expect(result.length).toBeLessThanOrEqual(50_000);
    expect(elapsed).toBeLessThan(100);
  });

  // --- Fixture 4: Many near-ceiling siblings (aggregate cost) ---
  it('bounds aggregate extraction cost across many medium-sized sibling nodes', () => {
    const chunk = 'automatic renewal '.repeat(2_000); // ~36KB per node
    const siblings = Array.from({ length: 50 }, () => `<p>${chunk}</p>`).join('');
    document.body.innerHTML = `<div>${siblings}</div>`;
    const start = performance.now();
    extractPageText(document.body);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });

  // --- Fixture 5: Pathological overlapping selectors (O(n log n) sorting vs O(n²)) ---
  it('efficiently filters deeply nested overlapping candidate nodes without quadratic blowup', () => {
    let inner = '<p>Deeply buried binding arbitration agreement</p>';
    for (let i = 0; i < 100; i++) {
      inner = `<div class="terms checkout legal" id="nest-${i}">${inner}</div>`;
    }
    document.body.innerHTML = `<main>${inner}</main>`;
    const start = performance.now();
    const result = extractPageText(document.body);
    const elapsed = performance.now() - start;
    const occurrences = result.match(/Deeply buried binding arbitration agreement/g) ?? [];
    expect(occurrences.length).toBe(1);
    expect(elapsed).toBeLessThan(100);
  });
});
