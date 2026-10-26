#!/usr/bin/env node
/**
 * audit-claims.mjs - Automated Claims, Architectural Parity & Privacy Invariant Linter for KnowThankYew Browser Reality Engine.
 *
 * Enforces:
 * 1. Zero-Egress Privacy Invariant:
 *    - Verifies manifest.json CSP restricts connect-src to 'none'.
 *    - Verifies src/ (excluding developer loopback ML client) contains zero unauthorized remote network egress primitives (fetch, XMLHttpRequest, sendBeacon, WebSocket, EventSource).
 *    - If dist/ exists, verifies compiled production bundles contain zero network primitives.
 * 2. Chrome Web Store & Metadata Parity:
 *    - Verifies version alignment across package.json, manifest.json, docs/CHROMEWEBSTORE.md, and ROADMAP.md.
 *    - Verifies 100% of declared manifest permissions have reviewer justifications in docs/CHROMEWEBSTORE.md.
 *    - Verifies live store baseline version alignment (v1.6.0).
 *    - Verifies SHA256SUMS alignment when release packages exist.
 * 3. Vocabulary Guardrails:
 *    - Prohibits unprovable marketing adjectives ('bulletproof', 'conclusive', 'definitive', 'infinitely scalable').
 * 4. Declarative Policy Pack Conformance:
 *    - Validates rule structures and pattern compilations across all 4 policy packs (US Federal, State ARL, UK DMCC 2024, EU CRD).
 * 5. Portfolio Master Brief Parity:
 *    - Verifies that KNOWTHANKYEW_PORTFOLIO_MASTER_BRIEF.md accurately reflects current extension test count and test file inventory.
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REPO_ROOT = resolve(__dirname, '..');
const DEV_ROOT = resolve(REPO_ROOT, '..');

const PROHIBITED_WORDS = [
  /\bbulletproof\b/i,
  /\bconclusive\b/i,
  /\bdefinitive\b/i,
  /\binfinitely scalable\b/i,
];

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Audit 1: Zero-Egress & Air-Gapped Privacy Invariants
 */
export function auditZeroEgress(errors = [], { overrideCodeSnippets = null } = {}) {
  const networkPrimitiveRegex =
    /(?:\b(?:fetch|\??\.\s*fetch)\s*\(|=\s*fetch\b|\b(?:XMLHttpRequest|axios)\b|\[\s*['"`](?:fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource|axios)['"`]\s*\]|\bnavigator\s*(?:\??\.\s*sendBeacon|\[\s*['"`]sendBeacon['"`]\s*\])|\bnew\s+(?:WebSocket|EventSource)\b|\bimportScripts\s*\()/;

  if (Array.isArray(overrideCodeSnippets)) {
    overrideCodeSnippets.forEach((snippet, idx) => {
      if (networkPrimitiveRegex.test(snippet)) {
        errors.push(`Privacy violation in snippet ${idx + 1}: Unauthorized network primitive detected: ${snippet}`);
      }
    });
    return;
  }

  // Check manifest.json CSP
  const manifestPath = resolve(REPO_ROOT, 'manifest.json');
  if (!existsSync(manifestPath)) {
    errors.push('Missing manifest.json file');
  } else {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    const csp = manifest.content_security_policy?.extension_pages || '';
    const connectDirectiveMatch = csp
      .split(';')
      .map((d) => d.trim())
      .find((d) => /^connect-src\b/i.test(d));

    if (!connectDirectiveMatch) {
      errors.push(`manifest.json CSP violation: extension_pages CSP must contain connect-src directive, received: "${csp}"`);
    } else {
      const tokens = connectDirectiveMatch.replace(/^connect-src\s+/i, '').split(/\s+/).filter(Boolean);
      if (tokens.length !== 1 || tokens[0] !== "'none'") {
        errors.push(`manifest.json CSP violation: connect-src directive must contain exactly 'none', received: "${connectDirectiveMatch}"`);
      }
    }
  }

  // Scan src/ for unauthorized network primitives
  const srcDir = resolve(REPO_ROOT, 'src');
  function scanFiles(dir) {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        scanFiles(fullPath);
      } else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) {
        const relPath = relative(REPO_ROOT, fullPath).split(sep).join('/');
        // Allow opt-in developer loopback ML client file
        if (relPath === 'src/ml/local-ml-client.ts') {
          continue;
        }

        const rawContent = readFileSync(fullPath, 'utf-8');
        // Strip block comments while preserving newlines
        const noBlockComments = rawContent.replace(/\/\*[\s\S]*?\*\//g, (match) => {
          const newlines = match.match(/\n/g);
          return newlines ? newlines.join('') : '';
        });
        const lines = noBlockComments.split('\n');
        lines.forEach((line, lineIdx) => {
          const trimmed = line.replace(/\/\/.*$/, '').trim();
          if (!trimmed) {
            return;
          }

          if (networkPrimitiveRegex.test(trimmed)) {
            errors.push(`Privacy violation in ${relPath}:${lineIdx + 1}: Unauthorized network primitive detected: ${trimmed}`);
          }
        });
      }
    }
  }

  if (overrideCodeSnippets === null && existsSync(srcDir)) {
    scanFiles(srcDir);
  }

  // If production dist/ exists, verify zero network primitives in dist JS
  const distDir = resolve(REPO_ROOT, 'dist');
  if (existsSync(distDir)) {
    function getJsFiles(dir) {
      const entries = readdirSync(dir, { withFileTypes: true });
      const files = [];
      for (const entry of entries) {
        const full = resolve(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...getJsFiles(full));
        } else if (entry.name.endsWith('.js')) {
          files.push(full);
        }
      }
      return files;
    }

    const jsFiles = getJsFiles(distDir);
    const forbiddenPatterns = [
      /\bfetch\s*\(/,
      /\bWebSocket\b/,
      /\bsendBeacon\b/,
      /\bXMLHttpRequest\b/,
      /\bEventSource\b/,
      /\bimportScripts\s*\(/,
    ];

    for (const jsFile of jsFiles) {
      const code = readFileSync(jsFile, 'utf-8');
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(code)) {
          errors.push(`Production bundle invariant violation in ${jsFile.replace(REPO_ROOT + '/', '')}: Forbidden network pattern ${pattern} detected`);
        }
      }
    }
  }
}

/**
 * Audit 2: Store Documentation & Metadata Parity
 */
export function auditStoreMetadataParity(errors = []) {
  const pkgPath = resolve(REPO_ROOT, 'package.json');
  const manifestPath = resolve(REPO_ROOT, 'manifest.json');
  const storeDocPath = resolve(REPO_ROOT, 'docs/CHROMEWEBSTORE.md');
  const roadmapDocPath = resolve(REPO_ROOT, 'ROADMAP.md');
  const readmeDocPath = resolve(REPO_ROOT, 'README.md');

  if (!existsSync(pkgPath) || !existsSync(manifestPath) || !existsSync(storeDocPath) || !existsSync(roadmapDocPath)) {
    errors.push('Missing required packaging, manifest, or documentation files');
    return;
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  const storeDoc = readFileSync(storeDocPath, 'utf-8');
  const roadmapDoc = readFileSync(roadmapDocPath, 'utf-8');

  // Version alignment
  if (manifest.version !== pkg.version) {
    errors.push(`Version mismatch: manifest.json has '${manifest.version}', package.json has '${pkg.version}'`);
  }
  if (!storeDoc.includes(`knowthankyew-extension-v${pkg.version}.zip`)) {
    errors.push(`docs/CHROMEWEBSTORE.md missing expected zip bundle filename 'knowthankyew-extension-v${pkg.version}.zip'`);
  }
  if (!roadmapDoc.includes(`v${pkg.version}`)) {
    errors.push(`ROADMAP.md missing expected release candidate version 'v${pkg.version}'`);
  }

  // Live store baseline
  const liveVersion = '1.6.0';
  if (!storeDoc.includes(`\`${liveVersion}\` (Live & Approved in Chrome Web Store & Firefox AMO)`)) {
    errors.push(`docs/CHROMEWEBSTORE.md lacks live store baseline citation for v${liveVersion}`);
  }
  if (!roadmapDoc.includes(`v${liveVersion} Live on Chrome Web Store & Firefox AMO`)) {
    errors.push(`ROADMAP.md lacks live store baseline citation for v${liveVersion}`);
  }
  if (existsSync(readmeDocPath)) {
    const readmeDoc = readFileSync(readmeDocPath, 'utf-8');
    if (!readmeDoc.includes(`knowthankyew-extension-v${liveVersion}.zip`)) {
      errors.push(`README.md lacks live store baseline zip citation for v${liveVersion}`);
    }
  }

  // Manifest permissions justification coverage
  const permissions = manifest.permissions || [];
  const justificationSectionMatch = storeDoc.match(/##\s*2\.\s*Permissions Justification[\s\S]*?(?=##\s*3|$)/i);
  const justificationSection = justificationSectionMatch ? justificationSectionMatch[0] : '';

  for (const perm of permissions) {
    const rowPattern = new RegExp(`^\\|\\s*\`?${escapeRegex(perm)}\`?\\s*\\|.*\\|.*\\|$`, 'm');
    if (!rowPattern.test(justificationSection)) {
      errors.push(`Manifest permission '${perm}' lacks a matching plain-English justification row in docs/CHROMEWEBSTORE.md`);
    }
  }

  // Checksums alignment if artifacts exist
  const shaFile = resolve(REPO_ROOT, 'SHA256SUMS');
  if (existsSync(shaFile)) {
    const shaContent = readFileSync(shaFile, 'utf-8');
    const lines = shaContent.split('\n').map((l) => l.trim()).filter(Boolean);
    const versionedZipRegex = new RegExp(`knowthankyew-extension-v${escapeRegex(pkg.version)}.*\\.zip$`);

    const zipLines = lines.filter((line) => {
      const parts = line.split(/\s+/);
      return parts.length >= 2 && versionedZipRegex.test(parts[1]);
    });

    if (zipLines.length === 0) {
      errors.push(`SHA256SUMS does not contain any entries matching version v${pkg.version}`);
    } else {
      for (const line of zipLines) {
        const [expectedSha, zipFilename] = line.split(/\s+/);
        const zipPath = resolve(REPO_ROOT, zipFilename);
        if (existsSync(zipPath)) {
          const actualSha = createHash('sha256').update(readFileSync(zipPath)).digest('hex');
          if (expectedSha !== actualSha) {
            errors.push(`SHA256 checksum mismatch for '${zipFilename}': expected ${expectedSha}, got ${actualSha}`);
          }
        } else {
          errors.push(`Referenced artifact '${zipFilename}' in SHA256SUMS is missing on disk`);
        }
      }
    }
  }
}

/**
 * Audit 3: Vocabulary Guardrails
 */
export function auditVocabulary(errors = []) {
  const docsToCheck = [
    resolve(REPO_ROOT, 'README.md'),
    resolve(REPO_ROOT, 'ROADMAP.md'),
    resolve(REPO_ROOT, 'docs/CHROMEWEBSTORE.md'),
    resolve(REPO_ROOT, 'src/popup/App.tsx'),
    resolve(REPO_ROOT, 'src/options/OptionsApp.tsx'),
    resolve(REPO_ROOT, 'docs/ARCHITECTURE.md'),
  ];

  for (const docPath of docsToCheck) {
    if (!existsSync(docPath)) continue;
    const lines = readFileSync(docPath, 'utf-8').split('\n');
    lines.forEach((line, idx) => {
      const lower = line.toLowerCase();
      if (
        lower.includes('prohibits unprovable') ||
        lower.includes('prohibited word') ||
        lower.includes('prohibited marketing')
      ) {
        return;
      }

      // Allow indeterminate scan warning vocabulary "inconclusive" without suppressing prohibited words on the same line
      const cleanedLine = line.replace(/\binconclusive\b/gi, '');

      for (const pattern of PROHIBITED_WORDS) {
        if (pattern.test(cleanedLine)) {
          errors.push(
            `Prohibited marketing word '${pattern.source}' found in ${relative(REPO_ROOT, docPath)}:${idx + 1}: ${line.trim()}`
          );
        }
      }
    });
  }
}

/**
 * Audit 4: Statutory Policy Pack Conformance
 */
export function auditPolicyPacks(errors = []) {
  const packsDir = resolve(REPO_ROOT, 'src/core/policy-packs');
  if (!existsSync(packsDir)) {
    errors.push('Missing src/core/policy-packs directory');
    return;
  }

  const expectedPacks = ['us-federal.json', 'state-arl.json', 'uk-dmcc.json', 'eu-crd.json'];
  for (const pack of expectedPacks) {
    const packPath = resolve(packsDir, pack);
    if (!existsSync(packPath)) {
      errors.push(`Missing expected statutory policy pack: ${pack}`);
      continue;
    }

    try {
      const data = JSON.parse(readFileSync(packPath, 'utf-8'));
      if ((!data.packId && !data.id) || !data.name || !Array.isArray(data.rules)) {
        errors.push(`Policy pack ${pack} missing packId/id, name, or rules array`);
      } else {
        if (data.rules.length === 0) {
          errors.push(`Policy pack ${pack} has empty rules array`);
        }
        for (const rule of data.rules) {
          if (!rule.id || !rule.title || !Array.isArray(rule.patterns)) {
            errors.push(`Policy pack ${pack} rule ${rule.id || 'unnamed'} missing required fields`);
          }
          for (const pattern of rule.patterns || []) {
            try {
              new RegExp(pattern, 'i');
            } catch (regexErr) {
              errors.push(`Policy pack ${pack} rule ${rule.id} has invalid regex: ${pattern} (${regexErr.message})`);
            }
          }
        }
      }
    } catch (parseErr) {
      errors.push(`Failed to parse policy pack ${pack}: ${parseErr.message}`);
    }
  }
}

/**
 * Audit 5: Portfolio Master Brief Parity
 */
export function auditPortfolioMasterBrief(
  errors = [],
  { requireBrief = false, overrideBriefPath = null } = {}
) {
  const briefCandidates = overrideBriefPath
    ? [overrideBriefPath]
    : [
        resolve(DEV_ROOT, 'KNOWTHANKYEW_PORTFOLIO_MASTER_BRIEF.md'),
        resolve(REPO_ROOT, 'KNOWTHANKYEW_PORTFOLIO_MASTER_BRIEF.md'),
      ];
  const briefPath = briefCandidates.find((p) => existsSync(p));

  if (!briefPath) {
    if (requireBrief) {
      errors.push('KNOWTHANKYEW_PORTFOLIO_MASTER_BRIEF.md not found but required via --require-brief.');
    }
    return false;
  }

  const briefContent = readFileSync(briefPath, 'utf-8');
  // Example pattern in Master Brief:
  // | **`knowthankyew-extension`**| `knowthankyew/knowthankyew-extension`| React 19, MV3, TS | `npm audit` + 192/192 Tests (25 test files...
  const match = briefContent.match(/`knowthankyew-extension`.*?(\d+)\/(\d+)\s+Tests\s+\((\d+)\s+test files/);
  if (!match) {
    errors.push('Could not find knowthankyew-extension test inventory count in KNOWTHANKYEW_PORTFOLIO_MASTER_BRIEF.md');
    return false;
  }

  const documentedCount = parseInt(match[1], 10);
  const documentedFiles = parseInt(match[3], 10);

  const testsDir = resolve(REPO_ROOT, 'tests');
  let actualCount = 0;
  let actualFiles = 0;

  if (existsSync(testsDir)) {
    const testFiles = readdirSync(testsDir).filter((f) => f.endsWith('.test.ts') || f.endsWith('.test.tsx'));
    actualFiles = testFiles.length;
    for (const file of testFiles) {
      const code = readFileSync(resolve(testsDir, file), 'utf-8');
      const itMatches = code.match(/\bit(?:\.only|\.skip)?\s*\(/g) || [];
      actualCount += itMatches.length;
    }
  }

  if (documentedFiles !== actualFiles) {
    errors.push(
      `Portfolio Brief File Drift: Master Brief documents ${documentedFiles} test files, but actual test suite has ${actualFiles} test files.`
    );
  }

  if (documentedCount !== actualCount) {
    errors.push(
      `Portfolio Brief Count Drift: Master Brief documents ${documentedCount}/${documentedCount} Tests, but actual test suite has ${actualCount} tests.`
    );
  }

  return true;
}

/**
 * Main execution CLI
 */
export function runAllAudits(options = {}) {
  const errors = [];
  auditZeroEgress(errors);
  auditStoreMetadataParity(errors);
  auditVocabulary(errors);
  auditPolicyPacks(errors);
  const briefChecked = auditPortfolioMasterBrief(errors, options);

  return { errors, briefChecked };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('=== KnowThankYew Extension Claims, Architecture & Privacy Invariant Audit ===\n');
  const requireBrief = process.argv.includes('--require-brief');
  const { errors, briefChecked } = runAllAudits({ requireBrief });

  if (errors.length > 0) {
    console.error(`[FAIL] Found ${errors.length} claims / architectural invariant violation(s):`);
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log('[PASS] All KnowThankYew Extension architectural & claims invariants verified:');
  console.log('  ✓ Zero remote egress verified (connect-src none, zero remote primitives in runtime)');
  console.log('  ✓ Store documentation parity verified (100% permissions justified in CHROMEWEBSTORE.md)');
  console.log('  ✓ Zero prohibited marketing adjectives detected');
  console.log('  ✓ Declarative policy packs validated (US Federal, State ARL, UK DMCC, EU CRD)');
  if (briefChecked) {
    console.log('  ✓ Portfolio Master Brief parity verified');
  } else {
    console.log('  - Portfolio Master Brief check skipped (isolated CI)');
  }
  process.exit(0);
}
