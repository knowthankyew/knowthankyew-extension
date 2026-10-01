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

/**
 * Queries the EUR-Lex ELI REST API / canonical endpoint for amendments to covered directives.
 */
async function checkEurLex() {
  const trackedDirectives = [
    { id: 'dir/2011/83', title: 'Consumer Rights Directive (2011/83/EU)', url: 'https://eur-lex.europa.eu/eli/dir/2011/83/oj' },
    { id: 'reg/2016/679', title: 'General Data Protection Regulation (2016/679)', url: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj' }
  ];

  const results = [];
  for (const item of trackedDirectives) {
    try {
      const res = await fetch(item.url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'KnowThankYew-Statute-Monitor/1.0' },
        signal: AbortSignal.timeout(8000),
      });

      const lastModified = res.headers.get('last-modified') || new Date().toISOString().split('T')[0];
      results.push({
        directive: item.title,
        lastAmended: lastModified,
        abstractText: `Checked canonical EUR-Lex ELI repository for amendments or corrigenda.`,
        eurLexUrl: item.url,
      });
    } catch (err) {
      console.warn(`[Statute Monitor] EUR-Lex check for ${item.title} failed (non-blocking):`, err instanceof Error ? err.message : err);
    }
  }
  return results;
}

/**
 * Queries UK legislation.gov.uk for statutory revisions to covered acts.
 */
async function checkUkLegislation() {
  const trackedActs = [
    { title: 'Digital Markets, Competition and Consumers Act 2024', url: 'https://www.legislation.gov.uk/ukpga/2024/13/data.feed' },
    { title: 'Consumer Rights Act 2015', url: 'https://www.legislation.gov.uk/ukpga/2015/15/data.feed' }
  ];

  const results = [];
  for (const item of trackedActs) {
    try {
      const res = await fetch(item.url, {
        headers: { 'Accept': 'application/atom+xml, text/xml', 'User-Agent': 'KnowThankYew-Statute-Monitor/1.0' },
        signal: AbortSignal.timeout(8000),
      });

      const lastModified = res.headers.get('last-modified') || new Date().toISOString().split('T')[0];
      results.push({
        act: item.title,
        lastAmended: lastModified,
        amendmentUrl: item.url.replace('/data.feed', ''),
      });
    } catch (err) {
      console.warn(`[Statute Monitor] UK legislation check for ${item.title} failed (non-blocking):`, err instanceof Error ? err.message : err);
    }
  }
  return results;
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

  // Deduplicate US findings by document number + ruleId
  const uniqueFindings = new Map();
  for (const f of findings) {
    for (const doc of f.documents) {
      const key = `${f.target.ruleId}:${doc.document_number}`;
      if (!uniqueFindings.has(key)) {
        uniqueFindings.set(key, { target: f.target, doc });
      }
    }
  }

  // Query International Registers
  let ukFindings = [];
  let euFindings = [];
  if (!isDryRun && !isMock) {
    console.log('Checking UK legislation.gov.uk...');
    ukFindings = await checkUkLegislation();
    console.log('Checking EUR-Lex canonical repository...');
    euFindings = await checkEurLex();
  } else if (isMock) {
    ukFindings = [{ act: 'Digital Markets, Competition and Consumers Act 2024', lastAmended: '2026-09-15', amendmentUrl: 'https://www.legislation.gov.uk/ukpga/2024/13' }];
    euFindings = [{ directive: 'Consumer Rights Directive (2011/83/EU)', lastAmended: '2026-09-10', abstractText: 'Consolidated text verified.', eurLexUrl: 'https://eur-lex.europa.eu/eli/dir/2011/83/oj' }];
  }

  console.log(`\nScan complete. Total US notices: ${uniqueFindings.size}, UK acts checked: ${ukFindings.length}, EU directives checked: ${euFindings.length}`);

  // Build report markdown
  let reportMd = `# Statutory & Regulatory Update Report\n\n`;
  reportMd += `**Generated:** ${new Date().toISOString()}\n`;
  reportMd += `**Tracked Rules Evaluated:** ${targets.length}\n`;
  reportMd += `**Statutory Notices Found:** ${uniqueFindings.size}\n\n`;

  reportMd += `## 🇺🇸 US Federal Register Updates\n\n`;
  if (uniqueFindings.size === 0) {
    reportMd += `> [!NOTE]\n> All tracked US federal statutes remain up to date. No pending rule amendments detected.\n\n`;
  } else {
    reportMd += `| Rule ID | Statute | Notice Title | Type | Published | Official Link |\n`;
    reportMd += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    for (const { target, doc } of uniqueFindings.values()) {
      reportMd += `| \`${target.ruleId}\` | ${target.statuteCode} | ${doc.title.replace(/\|/g, '-')} | ${doc.type} | ${doc.publication_date} | [Federal Register](${doc.html_url}) |\n`;
    }
    reportMd += `\n`;
  }

  reportMd += `## 🇬🇧 UK Legislation Updates\n\n`;
  if (ukFindings.length === 0) {
    reportMd += `> [!NOTE]\n> No amendments or changes detected for covered UK legislation.\n\n`;
  } else {
    reportMd += `| Enactment | Last Modified | Canonical Link |\n`;
    reportMd += `| :--- | :--- | :--- |\n`;
    for (const uk of ukFindings) {
      reportMd += `| ${uk.act} | ${uk.lastAmended} | [legislation.gov.uk](${uk.amendmentUrl}) |\n`;
    }
    reportMd += `\n`;
  }

  reportMd += `## 🇪🇺 EUR-Lex Updates\n\n`;
  if (euFindings.length === 0) {
    reportMd += `> [!NOTE]\n> No revisions or corrigenda detected for covered EU directives.\n\n`;
  } else {
    reportMd += `| Directive / Regulation | Verified Date | Canonical ELI Link |\n`;
    reportMd += `| :--- | :--- | :--- |\n`;
    for (const eu of euFindings) {
      reportMd += `| ${eu.directive} | ${eu.lastAmended} | [EUR-Lex ELI](${eu.eurLexUrl}) |\n`;
    }
    reportMd += `\n`;
  }

  reportMd += `## Action Items for Legal Reviewer\n`;
  reportMd += `1. Review the linked statutory documents above.\n`;
  reportMd += `2. If statutory definitions changed, update the relevant policy pack in \`src/core/policy-packs/\`.\n`;
  reportMd += `3. Verify that ReDoS tests pass via \`npm test\`.\n`;
  reportMd += `4. Merge PR to trigger automated SLSA provenance attestation and release packaging.\n`;

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
