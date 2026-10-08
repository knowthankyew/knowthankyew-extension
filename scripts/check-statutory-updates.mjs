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
  const quotedTerm = keyword.includes(' ') && !keyword.startsWith('"') ? `"${keyword}"` : keyword;
  url.searchParams.set('conditions[term]', quotedTerm);
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
      return { results: [], error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { results: data.results || [], error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Statute Monitor] Failed to reach Federal Register API for "${keyword}":`, msg);
    return { results: [], error: msg };
  }
}

/**
 * Queries the EUR-Lex ELI REST API / canonical landing endpoint for consolidated version,
 * corrigenda, and amendment metadata for covered EU directives and regulations.
 */
async function checkEurLex(baselineDate = '2026-09-01') {
  const trackedDirectives = [
    {
      id: 'dir/2011/83',
      title: 'Consumer Rights Directive (2011/83/EU)',
      canonicalUrl: 'https://eur-lex.europa.eu/eli/dir/2011/83',
      eliPrefix: 'eli/dir/2011/83',
      baselineDate,
    },
    {
      id: 'reg/2016/679',
      title: 'General Data Protection Regulation (2016/679)',
      canonicalUrl: 'https://eur-lex.europa.eu/eli/reg/2016/679',
      eliPrefix: 'eli/reg/2016/679',
      baselineDate,
    },
  ];

  const results = [];
  const errors = [];
  for (const item of trackedDirectives) {
    try {
      const res = await fetch(item.canonicalUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml',
          'User-Agent': 'KnowThankYew-Statute-Monitor/1.0',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        errors.push({ title: item.title, error: `HTTP ${res.status}` });
        continue;
      }

      const html = await res.text();
      // Extract consolidated version dates from ELI metadata (e.g. eli/dir/2011/83/2026-09-27)
      const consolidatedRegex = new RegExp(`${item.eliPrefix}/(\\d{4}-\\d{2}-\\d{2})`, 'g');
      // Extract corrigendum publication dates (e.g. eli/reg/2016/679/corrigendum/2021-03-04)
      const corrigendumRegex = new RegExp(`${item.eliPrefix}/corrigendum/(\\d{4}-\\d{2}-\\d{2})`, 'g');

      const matches = [...html.matchAll(consolidatedRegex)];
      const corrMatches = [...html.matchAll(corrigendumRegex)];

      let latestConsolidatedDate = null;
      for (const m of matches) {
        const d = m[1];
        if (!latestConsolidatedDate || d > latestConsolidatedDate) {
          latestConsolidatedDate = d;
        }
      }

      let latestCorrigendumDate = null;
      for (const m of corrMatches) {
        const d = m[1];
        if (!latestCorrigendumDate || d > latestCorrigendumDate) {
          latestCorrigendumDate = d;
        }
      }

      const latestUpdateDate = [latestConsolidatedDate, latestCorrigendumDate]
        .filter(Boolean)
        .sort()
        .pop() || null;

      const isCorrigendum = latestUpdateDate === latestCorrigendumDate && latestCorrigendumDate !== latestConsolidatedDate;

      if (latestUpdateDate && latestUpdateDate > item.baselineDate) {
        results.push({
          directive: item.title,
          lastAmended: latestUpdateDate,
          updateType: isCorrigendum ? 'Corrigendum' : 'Consolidated version',
          abstractText: isCorrigendum
            ? `EUR-Lex corrigendum published on ${latestUpdateDate}.`
            : `EUR-Lex consolidated version published on ${latestUpdateDate}.`,
          eurLexUrl: isCorrigendum
            ? `${item.canonicalUrl}/corrigendum/${latestUpdateDate}`
            : `${item.canonicalUrl}/${latestUpdateDate}`,
        });
      }
    } catch (err) {
      console.warn(`[Statute Monitor] EUR-Lex check for ${item.title} failed (non-blocking):`, err instanceof Error ? err.message : err);
      errors.push({ title: item.title, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return { results, errors };
}

/**
 * Queries UK legislation.gov.uk affected-legislation changes feed for statutory revisions to covered acts.
 */
async function checkUkLegislation(baselineDate = '2026-09-01') {
  const trackedActs = [
    {
      title: 'Digital Markets, Competition and Consumers Act 2024',
      changesFeedUrl: 'https://www.legislation.gov.uk/changes/affected/ukpga/2024/13/data.feed',
      actUrl: 'https://www.legislation.gov.uk/ukpga/2024/13',
      baselineDate,
    },
    {
      title: 'Consumer Rights Act 2015',
      changesFeedUrl: 'https://www.legislation.gov.uk/changes/affected/ukpga/2015/15/data.feed',
      actUrl: 'https://www.legislation.gov.uk/ukpga/2015/15',
      baselineDate,
    },
  ];

  const results = [];
  const errors = [];
  for (const item of trackedActs) {
    try {
      const res = await fetch(item.changesFeedUrl, {
        headers: { 'Accept': 'application/atom+xml, text/xml', 'User-Agent': 'KnowThankYew-Statute-Monitor/1.0' },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        errors.push({ title: item.title, error: `HTTP ${res.status}` });
        continue;
      }

      const xml = await res.text();
      // Extract affecting change entries newer than baseline
      const entryMatches = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)];
      let latestChangeDate = null;
      let latestTitle = '';

      for (const m of entryMatches) {
        const entryContent = m[1];
        const updatedMatch = /<updated>([^<]+)<\/updated>/i.exec(entryContent);
        if (!updatedMatch) continue;
        const parsed = new Date(updatedMatch[1].trim());
        if (Number.isNaN(parsed.getTime())) continue;
        const d = parsed.toISOString().split('T')[0];
        if (d > item.baselineDate) {
          if (!latestChangeDate || d > latestChangeDate) {
            latestChangeDate = d;
            const titleMatch = /<title>([^<]+)<\/title>/i.exec(entryContent);
            if (titleMatch) latestTitle = titleMatch[1].trim();
          }
        }
      }

      if (latestChangeDate) {
        results.push({
          act: item.title,
          lastAmended: latestChangeDate,
          changeTitle: latestTitle,
          amendmentUrl: item.actUrl,
        });
      }
    } catch (err) {
      console.warn(`[Statute Monitor] UK legislation check for ${item.title} failed (non-blocking):`, err instanceof Error ? err.message : err);
      errors.push({ title: item.title, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return { results, errors };
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
  const usErrors = [];

  if (isMock) {
    console.log('[Mode: MOCK] Simulating regulatory updates for automated testing.');
    const usTarget = targets.find(t => t.packId === 'us-federal') || targets[0];
    findings.push({
      target: usTarget,
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
    // Filter targets to US policy packs to avoid querying US registers for UK/EU rules
    const usTargets = targets.filter(t => t.packId === 'us-federal' || t.packId === 'state-arl');
    const keywordMap = new Map();
    for (const target of usTargets) {
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

      const res = await checkFederalRegister(kw, oldestDate);
      if (res.error) {
        usErrors.push({ keyword: kw, error: res.error });
      }
      if (res.results.length > 0) {
        console.log(`  Found ${res.results.length} regulatory notice(s) for "${kw}".`);
        for (const target of relevantTargets) {
          findings.push({ target, documents: res.results });
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
  let ukErrors = [];
  let euFindings = [];
  let euErrors = [];
  if (!isDryRun && !isMock) {
    const ukBaseline = targets.find(t => t.packId === 'uk-dmcc')?.lastVerifiedDate || '2026-09-01';
    const euBaseline = targets.find(t => t.packId === 'eu-crd')?.lastVerifiedDate || '2026-09-01';
    console.log(`Checking UK legislation.gov.uk (baseline: ${ukBaseline})...`);
    const ukRes = await checkUkLegislation(ukBaseline);
    ukFindings = ukRes.results;
    ukErrors = ukRes.errors;
    console.log(`Checking EUR-Lex canonical repository (baseline: ${euBaseline})...`);
    const euRes = await checkEurLex(euBaseline);
    euFindings = euRes.results;
    euErrors = euRes.errors;
  } else if (isMock) {
    ukFindings = [{ act: 'Digital Markets, Competition and Consumers Act 2024', lastAmended: '2026-09-15', amendmentUrl: 'https://www.legislation.gov.uk/ukpga/2024/13' }];
    euFindings = [{ directive: 'Consumer Rights Directive (2011/83/EU)', lastAmended: '2026-09-10', abstractText: 'Consolidated text verified.', eurLexUrl: 'https://eur-lex.europa.eu/eli/dir/2011/83/oj' }];
  }

  console.log(`\nScan complete. Total US notices: ${uniqueFindings.size} (${usErrors.length} errors), UK updates: ${ukFindings.length} (${ukErrors.length} errors), EU updates: ${euFindings.length} (${euErrors.length} errors)`);

  // Build report markdown
  let reportMd = `# Statutory & Regulatory Update Report\n\n`;
  reportMd += `**Generated:** ${new Date().toISOString()}\n`;
  reportMd += `**Tracked Rules Evaluated:** ${targets.length}\n`;
  reportMd += `**Statutory Notices Found:** ${uniqueFindings.size + ukFindings.length + euFindings.length}\n\n`;

  reportMd += `## 🇺🇸 US Federal Register Updates\n\n`;
  if (usErrors.length > 0) {
    reportMd += `> [!WARNING]\n> Could not query Federal Register API for keywords: ${usErrors.map(e => `"${e.keyword}" (${e.error})`).join(', ')}\n\n`;
  }
  if (uniqueFindings.size === 0) {
    if (usErrors.length === 0) {
      reportMd += `> [!NOTE]\n> All tracked US federal statutes remain up to date. No pending rule amendments detected.\n\n`;
    }
  } else {
    reportMd += `| Rule ID | Statute | Notice Title | Type | Published | Official Link |\n`;
    reportMd += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    for (const { target, doc } of uniqueFindings.values()) {
      reportMd += `| \`${target.ruleId}\` | ${target.statuteCode} | ${doc.title.replace(/\|/g, '-')} | ${doc.type} | ${doc.publication_date} | [Federal Register](${doc.html_url}) |\n`;
    }
    reportMd += `\n`;
  }

  reportMd += `## 🇬🇧 UK Legislation Updates\n\n`;
  if (ukErrors.length > 0) {
    reportMd += `> [!WARNING]\n> Could not query UK legislation endpoints for: ${ukErrors.map(e => `${e.title} (${e.error})`).join(', ')}\n\n`;
  }
  if (ukFindings.length === 0) {
    if (ukErrors.length === 0) {
      reportMd += `> [!NOTE]\n> No amendments or changes detected for covered UK legislation since baseline.\n\n`;
    }
  } else {
    reportMd += `| Enactment | Last Modified | Canonical Link |\n`;
    reportMd += `| :--- | :--- | :--- |\n`;
    for (const uk of ukFindings) {
      reportMd += `| ${uk.act} | ${uk.lastAmended} | [legislation.gov.uk](${uk.amendmentUrl}) |\n`;
    }
    reportMd += `\n`;
  }

  reportMd += `## 🇪🇺 EUR-Lex Updates\n\n`;
  if (euErrors.length > 0) {
    reportMd += `> [!WARNING]\n> Could not query EUR-Lex canonical endpoints for: ${euErrors.map(e => `${e.title} (${e.error})`).join(', ')}\n\n`;
  }
  if (euFindings.length === 0) {
    if (euErrors.length === 0) {
      reportMd += `> [!NOTE]\n> No revisions or corrigenda detected for covered EU directives since baseline.\n\n`;
    }
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

  if (process.env.GITHUB_OUTPUT) {
    const totalCount = uniqueFindings.size + ukFindings.length + euFindings.length;
    const hasUpdates = totalCount > 0 ? 'true' : 'false';
    const checkFailed = usErrors.length > 0 || ukErrors.length > 0 || euErrors.length > 0 ? 'true' : 'false';
    const outputContent = `has_updates=${hasUpdates}\nfindings_count=${totalCount}\ncheck_failed=${checkFailed}\n`;
    writeFileSync(process.env.GITHUB_OUTPUT, outputContent, { flag: 'a' });
  }
}

main().catch(err => {
  console.error('[Statute Monitor Error]:', err);
  process.exit(1);
});
