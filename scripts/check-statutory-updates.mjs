#!/usr/bin/env node

/**
 * Statutory & Regulatory Monitor for KnowThankYew Policy Packs.
 *
 * Queries the official Federal Register API (free, public, no-auth) and regulatory
 * endpoints for changes impacting tracked statutes (ROSCA, FTC Negative Option Rule,
 * Click-to-Cancel, FAA Arbitration, CCPA, State ARLs).
 *
 * Outputs a markdown report (statutory-update-report.md) for automated PR creation.
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const POLICY_PACKS_DIR = resolve(__dirname, '../src/core/policy-packs');
const REPORT_OUTPUT = resolve(__dirname, '../statutory-update-report.md');

/**
 * Loads all policy packs and extracts rules with tracking metadata.
 */
async function loadTrackingTargets() {
  const files = readdirSync(POLICY_PACKS_DIR).filter(f => f.endsWith('.json'));
  const targets = [];

  for (const file of files) {
    const raw = readFileSync(resolve(POLICY_PACKS_DIR, file), 'utf-8');
    const pack = JSON.parse(raw);
    for (const rule of pack.rules || []) {
      if (rule.tracking?.apiKeywords?.length) {
        targets.push({
          ruleId: rule.id,
          title: rule.title,
          packId: pack.packId,
          statuteCode: rule.tracking.statuteCode || rule.statute?.code || '',
          apiKeywords: rule.tracking.apiKeywords,
          lastVerifiedDate: rule.tracking.lastVerifiedDate || '2026-01-01',
        });
      }
    }
  }

  return targets;
}

/**
 * Queries the Federal Register API for recent rules or notices matching a keyword.
 */
async function checkFederalRegister(keyword, sinceDate) {
  const url = new URL('https://www.federalregister.gov/api/v1/documents.json');
  url.searchParams.set('conditions[term]', keyword);
  url.searchParams.set('conditions[publication_date][gte]', sinceDate);
  url.searchParams.set('order', 'newest');
  url.searchParams.set('per_page', '5');

  try {
    const res = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json', 'User-Agent': 'KnowThankYew-Statute-Monitor/1.0' },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn(`[Statute Monitor] Federal Register query for "${keyword}" returned status ${res.status}`);
      return [];
    }

    const data = await res.json();
    return data.results || [];
  } catch (err) {
    console.warn(`[Statute Monitor] Failed to reach Federal Register API for "${keyword}":`, err instanceof Error ? err.message : err);
    return [];
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isMock = args.includes('--mock');

  console.log('=== KnowThankYew Statutory Policy Monitor ===');
  console.log(`Directory: ${POLICY_PACKS_DIR}`);

  const targets = await loadTrackingTargets();
  console.log(`Loaded ${targets.length} tracked statutory rules across policy packs.\n`);

  const findings = [];

  if (isMock) {
    console.log('[Mode: MOCK] Simulating regulatory updates for automated testing.');
    findings.push({
      target: targets[0],
      documents: [{
        title: 'Trade Regulation Rule on Recurring Subscriptions and Negative Option Programs (16 CFR Part 425)',
        document_number: '2026-99999',
        publication_date: new Date().toISOString().split('T')[0],
        action: 'Final rule; technical amendments and effective date clarification.',
        html_url: 'https://www.federalregister.gov/documents/2026/01/01/mock-negative-option',
        type: 'Rule',
        abstract: 'Clarifies click-to-cancel requirements for mobile application subscriptions and immediate online cancellation mechanisms.'
      }]
    });
  } else if (!isDryRun) {
    // Unique keywords to avoid redundant network queries
    const keywordMap = new Map();
    for (const target of targets) {
      for (const kw of target.apiKeywords) {
        const list = keywordMap.get(kw) || [];
        list.push(target);
        keywordMap.set(kw, list);
      }
    }

    // Query federal register with throttle
    for (const [kw, relevantTargets] of keywordMap.entries()) {
      console.log(`Checking Federal Register for: "${kw}"...`);
      // Look back 30 days or rule's lastVerifiedDate
      const oldestDate = relevantTargets.reduce(
        (acc, t) => (t.lastVerifiedDate < acc ? t.lastVerifiedDate : acc),
        new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
      );

      const docs = await checkFederalRegister(kw, oldestDate);
      if (docs.length > 0) {
        console.log(`  Found ${docs.length} regulatory notice(s) for "${kw}".`);
        for (const target of relevantTargets) {
          findings.push({ target, documents: docs });
        }
      }

      // 500ms delay between queries to respect federal register rate limits
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Deduplicate findings by document number + ruleId
  const uniqueFindings = new Map();
  for (const f of findings) {
    for (const doc of f.documents) {
      const key = `${f.target.ruleId}:${doc.document_number}`;
      if (!uniqueFindings.has(key)) {
        uniqueFindings.set(key, { target: f.target, doc });
      }
    }
  }

  console.log(`\nScan complete. Total relevant documents discovered: ${uniqueFindings.size}`);

  // Build report markdown
  let reportMd = `# Statutory & Regulatory Update Report\n\n`;
  reportMd += `**Generated:** ${new Date().toISOString()}\n`;
  reportMd += `**Tracked Rules Evaluated:** ${targets.length}\n`;
  reportMd += `**Statutory Notices Found:** ${uniqueFindings.size}\n\n`;

  if (uniqueFindings.size === 0) {
    reportMd += `> [!NOTE]\n> All tracked statutes and regulatory rules remain up to date. No pending rule amendments or published federal registers were detected since their last verification dates.\n`;
  } else {
    reportMd += `> [!IMPORTANT]\n> The following official notices may require updating regex detection patterns or statutory explanations in \`src/core/policy-packs/\`.\n\n`;
    reportMd += `| Rule ID | Statute | Notice Title | Type | Published | Official Link |\n`;
    reportMd += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    for (const { target, doc } of uniqueFindings.values()) {
      reportMd += `| \`${target.ruleId}\` | ${target.statuteCode} | ${doc.title.replace(/\|/g, '-')} | ${doc.type} | ${doc.publication_date} | [Federal Register](${doc.html_url}) |\n`;
    }

    reportMd += `\n## Action Items for Legal Reviewer\n`;
    reportMd += `1. Review the linked Federal Register document above.\n`;
    reportMd += `2. If statutory definitions changed, update the relevant policy pack in \`src/core/policy-packs/\`.\n`;
    reportMd += `3. Verify that ReDoS tests pass via \`npm test\`.\n`;
    reportMd += `4. Merge PR to trigger automated SLSA provenance attestation and release packaging.\n`;
  }

  writeFileSync(REPORT_OUTPUT, reportMd, 'utf-8');
  console.log(`Wrote report to ${REPORT_OUTPUT}`);

  // Set GitHub Action output if running in CI
  if (process.env.GITHUB_OUTPUT) {
    const hasUpdates = uniqueFindings.size > 0 ? 'true' : 'false';
    const outputContent = `has_updates=${hasUpdates}\nfindings_count=${uniqueFindings.size}\n`;
    writeFileSync(process.env.GITHUB_OUTPUT, outputContent, { flag: 'a' });
  }
}

main().catch(err => {
  console.error('[Statute Monitor Error]:', err);
  process.exit(1);
});
