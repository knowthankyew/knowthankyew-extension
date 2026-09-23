#!/usr/bin/env node
/**
 * KnowThankYew Local ML Reality Engine Reference / Mock Loopback Worker
 * Listens on http://127.0.0.1:8420
 *
 * Implements the full LocalMLProvider service contract:
 * - GET  /health          Health ping & model diagnostic metadata
 * - POST /classify-links  2-stage cascade semantic candidate reranking
 * - POST /analyze         Plain-English clause explanation
 * - POST /burn            Nuclear amnesia protocol handshake
 *
 * Zero external dependencies: runs on Node.js built-in `node:http`.
 */

import http from 'node:http';

const PORT = 8420;
const HOST = '127.0.0.1';

let inMemoryContextBytes = 1048576; // Simulated 1 MB context buffer
let sessionActive = true;

const server = http.createServer(async (req, res) => {
  // Set CORS headers for local Chrome Extension access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);
  const startTime = Date.now();

  // Helper to read JSON request body
  const readJson = () =>
    new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (e) {
          reject(e);
        }
      });
      req.on('error', reject);
    });

  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          model: 'SmolLM2-135M-FTaaS (Local Edge)',
          contextWindow: 4096,
          latencyMs: Date.now() - startTime + 8,
          burnSupported: true,
        })
      );
      console.log(`[HEALTH] Responded 200 OK (${Date.now() - startTime}ms)`);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/classify-links') {
      const data = await readJson();
      const candidates = data.candidates || [];

      // Semantic heuristic: prioritize consumer-facing terms over merchant/courier/API terms
      const consumerKeywords = [
        'consumer',
        'customer',
        'terms of service',
        'terms of use',
        'user agreement',
        'terms and conditions',
      ];
      const excludedKeywords = ['merchant', 'driver', 'courier', 'dasher', 'developer', 'api'];

      let bestMatch = null;
      for (const item of candidates) {
        const text = (item.text || '').toLowerCase();
        const href = (item.href || '').toLowerCase();

        const isExcluded = excludedKeywords.some((k) => text.includes(k) || href.includes(k));
        if (isExcluded) continue;

        const isConsumer = consumerKeywords.some((k) => text.includes(k) || href.includes(k));
        if (isConsumer) {
          bestMatch = item;
          break;
        }
      }

      if (!bestMatch && candidates.length > 0) {
        bestMatch = candidates[0];
      }

      const responsePayload = {
        primaryConsumerTermsId: bestMatch ? bestMatch.id : null,
        confidence: bestMatch ? 0.94 : 0.4,
        category: 'TERMS',
        reasoning: bestMatch
          ? `Identified primary consumer terms ("${bestMatch.text}") over secondary multi-sided contracts.`
          : 'No dominant consumer agreement detected.',
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(responsePayload));
      console.log(
        `[CLASSIFY] Domain: ${data.domain || 'unknown'} -> Promoted Candidate #${bestMatch?.id ?? 'none'} (${Date.now() - startTime}ms)`
      );
      return;
    }

    if (req.method === 'POST' && url.pathname === '/analyze') {
      const data = await readJson();
      const clause = data.clauseText || '';

      const isArbitration = /arbitrat/i.test(clause);
      const isAutoRenew = /renew|recurring|subscription/i.test(clause);

      const responsePayload = {
        plainEnglishSummary: isArbitration
          ? 'You surrender your constitutional right to a public jury trial and agree to private arbitration.'
          : isAutoRenew
            ? 'Your payment card will be charged automatically on a recurring schedule until you explicitly cancel.'
            : 'Unilateral terms allow the service provider broad contractual discretion without prior notice.',
        hiddenObligations: isAutoRenew ? ['Requires manual cancellation before renewal deadline'] : [],
        rightsSurrendered: isArbitration ? ['Right to jury trial', 'Right to join class action lawsuit'] : [],
        severity: isArbitration || isAutoRenew ? 'CRITICAL' : 'WARNING',
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(responsePayload));
      console.log(`[ANALYZE] Clause snippet evaluated (${Date.now() - startTime}ms)`);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/burn') {
      await readJson();
      const cleared = inMemoryContextBytes;
      inMemoryContextBytes = 0;
      sessionActive = false;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'burned',
          memoryClearedBytes: cleared,
          sessionPurged: true,
        })
      );
      console.log(`🔥 [HARD BURN] Handshake received! Purged ${cleared} bytes of prompt context & KV cache.`);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  } catch (err) {
    console.error('[ERROR]', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`\n======================================================`);
  console.log(`🛡️  KnowThankYew Local ML Reality Engine Loopback Worker`);
  console.log(`📍 Listening on: http://${HOST}:${PORT}`);
  console.log(`🔒 Contract Endpoints:`);
  console.log(`   - GET  /health          (Status & Latency)`);
  console.log(`   - POST /classify-links  (Semantic Candidate Reranking)`);
  console.log(`   - POST /analyze         (Plain-English Clause Synthesis)`);
  console.log(`   - POST /burn            (Pillar 5 Hard Burn Handshake)`);
  console.log(`======================================================\n`);
});
