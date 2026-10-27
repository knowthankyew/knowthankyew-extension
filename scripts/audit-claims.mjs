#!/usr/bin/env node
/**
 * audit-claims.mjs - Automated Claims, Architectural Parity & Privacy Invariant Linter for KnowThankYew Browser Reality Engine.
 *
 * Enforces:
 * 1. Zero-Egress Privacy Invariant:
 *    - Verifies manifest.json and public/manifest.json CSP restricts connect-src to 'none'.
 *    - Verifies src/ (excluding developer loopback ML client) contains zero unauthorized remote network egress primitives (fetch, XMLHttpRequest, sendBeacon, WebSocket, EventSource).
 *    - If dist/, dist-firefox/, or dist-safari/ exist, verifies compiled production bundles contain zero network primitives, OTLP traces, or test hooks.
 * 2. Chrome Web Store, Multi-Browser & Metadata Parity:
 *    - Verifies 1:1 manifest parity between manifest.json and public/manifest.json.
 *    - Verifies version alignment across package.json, manifest.json, public/manifest.json, docs/CHROMEWEBSTORE.md, ROADMAP.md, docs/SAFARI-SUBMISSION.md, docs/BUILD.md, docs/QA_CHECKLIST.md, docs/WALKTHROUGH-v2.1.md, docs/index.html, and docs/privacy.html.
 *    - Verifies 100% of declared manifest permissions have reviewer justifications in docs/CHROMEWEBSTORE.md.
 *    - Verifies live store baseline version alignment (v1.6.0).
 *    - Verifies internal documentation test count and suite count parity with tests/*.test.{ts,tsx}.
 *    - Verifies SHA256SUMS alignment when release packages exist.
 * 3. Vocabulary Guardrails:
 *    - Prohibits unprovable marketing adjectives ('bulletproof', 'rock solid', 'conclusive', 'definitive', 'infinitely scalable') across Markdown docs, HTML docs, and React UI sources.
 * 4. Declarative Policy Pack Conformance:
 *    - Validates rule structures, safe-regex ReDoS safety, and @knowthankyew/policy-packs/subscriptions parity across all 4 policy packs (US Federal, State ARL, UK DMCC 2024, EU CRD).
 * 5. Architecture Diagram & Invariant Parity:
 *    - Validates <!-- diagram-meta --> frontmatter in docs/ARCHITECTURE.md, verifies every file and directory path referenced in Mermaid diagrams and the directory tree exists on disk, verifies air-gapped content script flow accuracy, and verifies production dependency count parity.
 * 6. Portfolio Master Brief Parity:
 *    - Verifies that KNOWTHANKYEW_PORTFOLIO_MASTER_BRIEF.md accurately reflects current extension test count and test file inventory.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { performance } from 'node:perf_hooks';
import safeRegex from 'safe-regex';
import {
  ALL_POLICY_PACKS as UPSTREAM_POLICY_PACKS,
  COMPILED_POLICY_RULES,
} from '@knowthankyew/policy-packs/subscriptions';
import {
  stripLineComment,
  stripBlockComments,
  FORBIDDEN_NETWORK_REGEX,
  testNetworkPrimitive,
  scanSourceForNetworkPrimitives,
  scanDocumentationForVocabulary,
  BANNED_VOCABULARY,
} from './claims-linter-core.mjs';

export {
  stripLineComment,
  stripBlockComments,
  FORBIDDEN_NETWORK_REGEX,
  testNetworkPrimitive,
  scanSourceForNetworkPrimitives,
  scanDocumentationForVocabulary,
  BANNED_VOCABULARY,
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REPO_ROOT = resolve(__dirname, '..');
const DEV_ROOT = resolve(REPO_ROOT, '..');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Counts actual Vitest test files and active `it(...)` / `test(...)` blocks in `tests/`,
 * stripping block and line comments and excluding `.skip`.
 */
let cachedInventory = null;

export function getActualTestInventory() {
  if (cachedInventory) return cachedInventory;

  const testsDir = resolve(REPO_ROOT, 'tests');
  let actualCount = 0;
  let actualFiles = 0;

  function collectTestFiles(dir) {
    const entries = readdirSync(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...collectTestFiles(full));
      } else if (/\.test\.(?:ts|tsx|js|mjs)$/.test(entry.name)) {
        files.push(full);
      }
    }
    return files;
  }

  if (existsSync(testsDir)) {
    const testFiles = collectTestFiles(testsDir);
    actualFiles = testFiles.length;
    for (const file of testFiles) {
      const rawCode = readFileSync(file, 'utf-8');
      const noBlock = stripBlockComments(rawCode);
      const strippedLines = noBlock.split('\n').map((l) => stripLineComment(l)).join('\n');
      const itMatches = strippedLines.match(/(?:^|[^\w.])(?:it|test)(?:\.only|\.each\([^)]*\))?\s*\(/gm) || [];
      actualCount += itMatches.length;
    }
  }

  // Outside Vitest, verify agreement with Vitest runner's list report using local binary without network fetching
  const vitestBin = resolve(REPO_ROOT, 'node_modules/.bin/vitest');
  if (!process.env.VITEST && existsSync(vitestBin)) {
    try {
      const stdout = execSync(`"${vitestBin}" list --json`, {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 10000,
      });
      const jsonStart = stdout.indexOf('[');
      const jsonEnd = stdout.lastIndexOf(']') + 1;
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        const list = JSON.parse(stdout.slice(jsonStart, jsonEnd));
        if (Array.isArray(list) && list.length > 0) {
          const vitestFiles = new Set(list.map((t) => t.file)).size;
          actualCount = list.length;
          actualFiles = vitestFiles;
        }
      }
    } catch {
      // In minimal environments, retain static AST/regex inventory
    }
  }

  cachedInventory = { actualCount, actualFiles };
  return cachedInventory;
}

/**
 * Validates that a manifest's extension_pages CSP enforces connect-src 'none',
 * and that permissions/hosts adhere strictly to zero-egress, on-demand activeTab invariants.
 */
function validateManifestCsp(manifestPath, label, errors) {
  if (!existsSync(manifestPath)) {
    errors.push(`Missing ${label} file`);
    return;
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  const csp = manifest.content_security_policy?.extension_pages || '';
  const connectDirectiveMatch = csp
    .split(';')
    .map((d) => d.trim())
    .find((d) => /^connect-src\b/i.test(d));

  if (!connectDirectiveMatch) {
    errors.push(`${label} CSP violation: extension_pages CSP must contain connect-src directive, received: "${csp}"`);
  } else {
    const tokens = connectDirectiveMatch.replace(/^connect-src\s+/i, '').split(/\s+/).filter(Boolean);
    if (tokens.length !== 1 || tokens[0] !== "'none'") {
      errors.push(`${label} CSP violation: connect-src directive must contain exactly 'none', received: "${connectDirectiveMatch}"`);
    }
  }

  // Reject persistent background content scripts (must inject strictly on-demand via activeTab)
  if (Array.isArray(manifest.content_scripts) && manifest.content_scripts.length > 0) {
    errors.push(`${label} manifest violation: content_scripts must be omitted or empty (must use on-demand scripting/activeTab)`);
  }

  // Reject broad host permissions and wildcard scheme declarations
  const hostPermissions = manifest.host_permissions || [];
  if (Array.isArray(hostPermissions) && hostPermissions.length > 0) {
    errors.push(`${label} manifest violation: host_permissions must be omitted or empty`);
  }

  const optionalHostPermissions = manifest.optional_host_permissions || [];
  if (Array.isArray(optionalHostPermissions) && optionalHostPermissions.length > 0) {
    errors.push(`${label} manifest violation: optional_host_permissions must be omitted or empty`);
  }

  const allDeclaredPerms = [...(manifest.permissions || []), ...(manifest.optional_permissions || [])];
  for (const perm of allDeclaredPerms) {
    if (perm === '<all_urls>' || /^[a-z*]+:\/\//i.test(perm)) {
      errors.push(`${label} manifest violation: Wildcard or URL pattern '${perm}' is forbidden in permissions`);
    }
  }
}

/**
 * Audit 1: Zero-Egress & Air-Gapped Privacy Invariants
 */
export function auditZeroEgress(errors = [], { overrideCodeSnippets = null, requireArtifacts = false } = {}) {
  if (Array.isArray(overrideCodeSnippets)) {
    overrideCodeSnippets.forEach((snippet, idx) => {
      if (testNetworkPrimitive(snippet)) {
        errors.push(`Privacy violation in snippet ${idx + 1}: Unauthorized network primitive detected: ${snippet}`);
      }
    });
    return;
  }

  // Check both manifest.json and public/manifest.json CSP
  validateManifestCsp(resolve(REPO_ROOT, 'manifest.json'), 'manifest.json', errors);
  validateManifestCsp(resolve(REPO_ROOT, 'public/manifest.json'), 'public/manifest.json', errors);

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
        const rawContent = readFileSync(fullPath, 'utf-8');
        const fileErrors = scanSourceForNetworkPrimitives(rawContent, relPath, {
          isPermittedLine: (_l, _i, p) => p === 'src/ml/local-ml-client.ts',
        });
        errors.push(...fileErrors);
      }
    }
  }

  if (overrideCodeSnippets === null && existsSync(srcDir)) {
    scanFiles(srcDir);
  }

  // Verify zero network primitives, OTLP traces, or test hooks across all consumer build directories when present
  function getAssetFiles(dir, extensions) {
    const entries = readdirSync(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getAssetFiles(full, extensions));
      } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
        files.push(full);
      }
    }
    return files;
  }

  const forbiddenPatterns = [
    /\bfetch\s*\(/,
    /\bWebSocket\b/,
    /\bWebTransport\b/,
    /\bRTCPeerConnection\b/,
    /\bsendBeacon\b/,
    /\bXMLHttpRequest\b/,
    /\bEventSource\b/,
    /\bimportScripts\s*\(/,
    /\/v1\/traces/,
    /__KTY_TEST_HOOK_/,
    /(?:[A-Za-z0-9_$]+\.)?createElement\s*\(\s*['"`]script['"`]\s*\)/,
    /\bnew\s+Image\s*\(/,
    /\bnew\s+Audio\s*\(\s*['"`]?(?:https?:|\/\/)/,
  ];

  for (const distFolderName of ['dist', 'dist-firefox', 'dist-safari']) {
    const distDir = resolve(REPO_ROOT, distFolderName);
    if (!existsSync(distDir)) {
      if (requireArtifacts) {
        errors.push(`Missing required distribution directory: ${distFolderName}`);
      }
      continue;
    }

    const distManifest = resolve(distDir, 'manifest.json');
    if (existsSync(distManifest)) {
      validateManifestCsp(distManifest, `${distFolderName}/manifest.json`, errors);
    }

    const jsFiles = getAssetFiles(distDir, ['.js']);
    for (const jsFile of jsFiles) {
      const code = readFileSync(jsFile, 'utf-8');
      const relJsPath = relative(REPO_ROOT, jsFile).split(sep).join('/');
      const isVendorChunk = /chunks\/react-/.test(relJsPath);
      for (const pattern of forbiddenPatterns) {
        if (isVendorChunk && (pattern.source.includes('Image') || pattern.source.includes('createElement'))) {
          continue;
        }
        if (pattern.test(code)) {
          errors.push(`Production bundle invariant violation in ${relJsPath}: Forbidden pattern ${pattern} detected`);
        }
      }
    }

    // Inspect .html and .css files to verify zero external remote asset egress (e.g. http://, https://, or //)
    const markupFiles = getAssetFiles(distDir, ['.html', '.css']);
    const remoteUrlPattern = /\b(?:src|href)\s*=\s*['"](?:https?:|\/\/)|@import\s+(?:['"](?:https?:|\/\/)|url\s*\(\s*['"]?(?:https?:|\/\/))|\burl\s*\(\s*['"]?(?:https?:|\/\/)/i;
    for (const markupFile of markupFiles) {
      const content = readFileSync(markupFile, 'utf-8');
      const relMarkupPath = relative(REPO_ROOT, markupFile).split(sep).join('/');
      if (remoteUrlPattern.test(content)) {
        errors.push(`Production bundle markup violation in ${relMarkupPath}: Remote asset reference detected`);
      }
    }
  }
}

/**
 * Audit 2: Store Documentation & Metadata Parity
 */
export function auditStoreMetadataParity(errors = [], { requireArtifacts = false } = {}) {
  const pkgPath = resolve(REPO_ROOT, 'package.json');
  const manifestPath = resolve(REPO_ROOT, 'manifest.json');
  const publicManifestPath = resolve(REPO_ROOT, 'public/manifest.json');
  const storeDocPath = resolve(REPO_ROOT, 'docs/CHROMEWEBSTORE.md');
  const roadmapDocPath = resolve(REPO_ROOT, 'ROADMAP.md');
  const readmeDocPath = resolve(REPO_ROOT, 'README.md');

  if (
    !existsSync(pkgPath) ||
    !existsSync(manifestPath) ||
    !existsSync(publicManifestPath) ||
    !existsSync(storeDocPath) ||
    !existsSync(roadmapDocPath)
  ) {
    errors.push('Missing required packaging, manifest, or documentation files');
    return;
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  const publicManifest = JSON.parse(readFileSync(publicManifestPath, 'utf-8'));
  const storeDoc = readFileSync(storeDocPath, 'utf-8');
  const roadmapDoc = readFileSync(roadmapDocPath, 'utf-8');

  // 1:1 structural parity between manifest.json and public/manifest.json
  if (!isDeepStrictEqual(manifest, publicManifest)) {
    errors.push('Manifest drift: public/manifest.json does not match root manifest.json');
  }

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

  const versionedDocs = [
    { rel: 'docs/SAFARI-SUBMISSION.md', token: pkg.version },
    { rel: 'docs/BUILD.md', token: pkg.version },
    { rel: 'docs/QA_CHECKLIST.md', token: `v${pkg.version}` },
    { rel: 'docs/WALKTHROUGH-v2.1.md', token: `v${pkg.version}` },
    { rel: 'docs/index.html', token: `Version ${pkg.version}` },
    { rel: 'docs/privacy.html', token: `Version ${pkg.version}` },
  ];
  for (const { rel, token } of versionedDocs) {
    const full = resolve(REPO_ROOT, rel);
    if (existsSync(full)) {
      const content = readFileSync(full, 'utf-8');
      if (!content.includes(token)) {
        errors.push(`${rel} missing expected release version token '${token}'`);
      }
    }
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

  // Internal documentation test count parity
  const { actualCount, actualFiles } = getActualTestInventory();
  if (actualCount === 0 || actualFiles === 0) {
    errors.push('Test inventory failure: detected 0 test files or 0 tests in tests/');
  } else {
    const qaPath = resolve(REPO_ROOT, 'docs/QA_CHECKLIST.md');
    if (existsSync(qaPath)) {
      const qaDoc = readFileSync(qaPath, 'utf-8');
      if (!qaDoc.includes(`${actualFiles} Suites / ${actualCount} Tests`)) {
        errors.push(
          `docs/QA_CHECKLIST.md test count drift: expected '${actualFiles} Suites / ${actualCount} Tests' to match test suite inventory`
        );
      }
    }
    const buildPath = resolve(REPO_ROOT, 'docs/BUILD.md');
    if (existsSync(buildPath)) {
      const buildDoc = readFileSync(buildPath, 'utf-8');
      if (!buildDoc.includes(`${actualCount} invariant, ReDoS, and DOM parsing tests across ${actualFiles} suites`)) {
        errors.push(
          `docs/BUILD.md test count drift: expected '${actualCount} invariant, ReDoS, and DOM parsing tests across ${actualFiles} suites'`
        );
      }
    }
    const walkthroughPath = resolve(REPO_ROOT, 'docs/WALKTHROUGH-v2.1.md');
    if (existsSync(walkthroughPath)) {
      const walkthroughDoc = readFileSync(walkthroughPath, 'utf-8');
      if (!walkthroughDoc.includes(`${actualCount} / ${actualCount} Tests Passed Across ${actualFiles} Test Suites`)) {
        errors.push(
          `docs/WALKTHROUGH-v2.1.md test count drift: expected '${actualCount} / ${actualCount} Tests Passed Across ${actualFiles} Test Suites'`
        );
      }
    }
    if (!storeDoc.includes(`${actualFiles}-suite test coverage (${actualCount} automated tests)`)) {
      errors.push(
        `docs/CHROMEWEBSTORE.md test count drift: expected '${actualFiles}-suite test coverage (${actualCount} automated tests)'`
      );
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
      if (requireArtifacts) {
        const expectedArchives = [
          `knowthankyew-extension-v${pkg.version}.zip`,
          `knowthankyew-extension-v${pkg.version}-firefox.zip`,
          `knowthankyew-extension-v${pkg.version}-safari.zip`,
          `knowthankyew-extension-v${pkg.version}-local-assist.zip`,
        ];
        for (const exp of expectedArchives) {
          if (!zipLines.some((l) => l.split(/\s+/)[1] === exp)) {
            errors.push(`SHA256SUMS missing expected release archive entry: ${exp}`);
          }
        }
      }
      for (const line of zipLines) {
        const [expectedSha, zipFilename] = line.split(/\s+/);
        const zipPath = resolve(REPO_ROOT, zipFilename);
        if (existsSync(zipPath)) {
          const actualSha = createHash('sha256').update(readFileSync(zipPath)).digest('hex');
          if (expectedSha !== actualSha) {
            errors.push(`SHA256 checksum mismatch for '${zipFilename}': expected ${expectedSha}, got ${actualSha}`);
          }
        } else if (requireArtifacts) {
          errors.push(`Referenced artifact '${zipFilename}' in SHA256SUMS is missing on disk`);
        }
      }
    }
  } else if (requireArtifacts) {
    errors.push('SHA256SUMS file is missing on disk during release audit (--require-artifacts)');
  }
}

/**
 * Audit 3: Vocabulary Guardrails (Markdown docs, HTML docs, and React UI sources)
 */
export function auditVocabulary(errors = []) {
  const filesToCheck = [
    resolve(REPO_ROOT, 'README.md'),
    resolve(REPO_ROOT, 'ROADMAP.md'),
    resolve(REPO_ROOT, 'NOTICE.md'),
  ];

  const docsDir = resolve(REPO_ROOT, 'docs');
  if (existsSync(docsDir)) {
    for (const entry of readdirSync(docsDir)) {
      if (/^coderabbit-pass.*\.md$/i.test(entry)) continue;
      if (entry.endsWith('.md') || entry.endsWith('.html')) {
        filesToCheck.push(resolve(docsDir, entry));
      }
    }
  }

  function collectUiFiles(dir) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        collectUiFiles(fullPath);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        filesToCheck.push(fullPath);
      }
    }
  }

  collectUiFiles(resolve(REPO_ROOT, 'src/popup'));
  collectUiFiles(resolve(REPO_ROOT, 'src/options'));

  for (const filePath of filesToCheck) {
    if (!existsSync(filePath)) continue;
    const relPath = relative(REPO_ROOT, filePath).split(sep).join('/');
    const content = readFileSync(filePath, 'utf-8');
    const vocabErrors = scanDocumentationForVocabulary(content, relPath);
    errors.push(...vocabErrors);
  }
}

/**
 * Normalizes a policy pack rule for deep parity comparison across pack and rule ID.
 */
function normalizePolicyRule(rule) {
  if (!rule || typeof rule !== 'object') return {};
  const clone = JSON.parse(JSON.stringify(rule));
  if (Array.isArray(clone.patterns)) {
    clone.patterns = [...clone.patterns].sort();
  }
  if (clone.tracking && Array.isArray(clone.tracking.apiKeywords)) {
    clone.tracking.apiKeywords = [...clone.tracking.apiKeywords].sort();
  }
  return clone;
}

/**
 * Audit 4: Statutory Policy Pack Conformance & Upstream Parity
 */
export function auditPolicyPacks(errors = [], { runTimingChecks = true } = {}) {
  const packsDir = resolve(REPO_ROOT, 'src/core/policy-packs');
  if (!existsSync(packsDir)) {
    errors.push('Missing src/core/policy-packs directory');
    return;
  }

  const expectedPacks = ['us-federal.json', 'state-arl.json', 'uk-dmcc.json', 'eu-crd.json'];
  const localPacks = [];

  for (const pack of expectedPacks) {
    const packPath = resolve(packsDir, pack);
    if (!existsSync(packPath)) {
      errors.push(`Missing expected statutory policy pack: ${pack}`);
      continue;
    }

    try {
      const data = JSON.parse(readFileSync(packPath, 'utf-8'));
      localPacks.push({ file: pack, data });
      if ((!data.packId && !data.id) || !data.name || !Array.isArray(data.rules)) {
        errors.push(`Policy pack ${pack} missing packId/id, name, or rules array`);
      } else {
        if (data.rules.length === 0) {
          errors.push(`Policy pack ${pack} has empty rules array`);
        }
        for (const rule of data.rules) {
          if (
            !rule.id ||
            !rule.title ||
            !rule.category ||
            !rule.classification ||
            !rule.severity ||
            !rule.explanation ||
            !rule.recommendation ||
            !rule.statute?.code ||
            !rule.statute?.title ||
            !rule.statute?.jurisdiction ||
            !rule.statute?.plainExplanation ||
            !Array.isArray(rule.patterns) ||
            rule.patterns.length === 0
          ) {
            errors.push(`Policy pack ${pack} rule ${rule.id || 'unnamed'} missing required structural or statutory fields`);
          }
          if (rule.weight !== undefined && (typeof rule.weight !== 'number' || rule.weight < 0 || rule.weight > 100)) {
            errors.push(`Policy pack ${pack} rule ${rule.id} has invalid weight: ${rule.weight} (must be 0-100)`);
          }
          for (const pattern of rule.patterns || []) {
            let compiledRegex = null;
            try {
              compiledRegex = new RegExp(pattern, 'i');
            } catch (regexErr) {
              errors.push(`Policy pack ${pack} rule ${rule.id} has invalid regex: ${pattern} (${regexErr.message})`);
            }
            const isSafe = safeRegex(pattern);
            if (!isSafe) {
              errors.push(`Policy pack ${pack} rule ${rule.id} failed safe-regex ReDoS heuristic screen: ${pattern}`);
            }
            if (compiledRegex && isSafe && runTimingChecks) {
              const literals = pattern
                .replace(/[\\^$*+?.()|[\]{}]/g, ' ')
                .split(/\s+/)
                .filter((w) => w.length > 3);
              const sampleFragment = literals.length > 0 ? literals[0] : 'subscription';
              const stressInputs = [
                `${'a'.repeat(500)}!`,
                `${' '.repeat(300)}${sampleFragment}${' '.repeat(300)}!`,
                `${`${sampleFragment} `.repeat(100)}!`,
              ];

              for (const adversarialInput of stressInputs) {
                // Warm-up run to eliminate JIT compilation overhead
                compiledRegex.test(adversarialInput);
                let minElapsedMs = Infinity;
                for (let sample = 0; sample < 3; sample++) {
                  const t0 = performance.now();
                  compiledRegex.test(adversarialInput);
                  const elapsedMs = performance.now() - t0;
                  if (elapsedMs < minElapsedMs) {
                    minElapsedMs = elapsedMs;
                  }
                }
                if (minElapsedMs > 25) {
                  errors.push(
                    `Policy pack ${pack} rule ${rule.id} exceeded 25ms adversarial timing budget (${minElapsedMs.toFixed(2)}ms): ${pattern}`
                  );
                  break;
                }
              }
            }
          }
        }
      }
    } catch (parseErr) {
      errors.push(`Failed to parse policy pack ${pack}: ${parseErr.message}`);
    }
  }

  // Verify deep normalized rule parity grouped by pack and rule ID between local JSON packs and @knowthankyew/policy-packs/subscriptions
  if (!Array.isArray(UPSTREAM_POLICY_PACKS)) {
    errors.push('Upstream @knowthankyew/policy-packs/subscriptions ALL_POLICY_PACKS export is missing or not an array');
  } else if (localPacks.length === expectedPacks.length) {
    const upstreamByPackId = new Map(UPSTREAM_POLICY_PACKS.map((p) => [p.packId || p.id, p]));

    for (const { file, data } of localPacks) {
      const packId = data.packId || data.id;
      const upstreamPack = upstreamByPackId.get(packId);
      if (!upstreamPack) {
        errors.push(`Policy pack parity drift: local pack '${packId}' (${file}) not found in @knowthankyew/policy-packs/subscriptions`);
        continue;
      }

      const localRulesById = new Map((data.rules || []).map((r) => [r.id, normalizePolicyRule(r)]));
      const upstreamRulesById = new Map((upstreamPack.rules || []).map((r) => [r.id, normalizePolicyRule(r)]));

      for (const [ruleId, localNorm] of localRulesById.entries()) {
        const upstreamNorm = upstreamRulesById.get(ruleId);
        if (!upstreamNorm) {
          errors.push(`Policy pack parity drift in ${packId}: local rule '${ruleId}' missing from upstream @knowthankyew/policy-packs`);
        } else if (!isDeepStrictEqual(localNorm, upstreamNorm)) {
          errors.push(`Policy pack parity drift in ${packId} rule '${ruleId}': normalized rule content differs from upstream @knowthankyew/policy-packs`);
        }
      }

      for (const ruleId of upstreamRulesById.keys()) {
        if (!localRulesById.has(ruleId)) {
          errors.push(`Policy pack parity drift in ${packId}: upstream rule '${ruleId}' missing from local ${file}`);
        }
      }
    }

    // Verify runtime COMPILED_POLICY_RULES matches upstream rules and patterns
    const totalUpstreamRules = UPSTREAM_POLICY_PACKS.reduce((sum, p) => sum + (p.rules || []).length, 0);
    if (!Array.isArray(COMPILED_POLICY_RULES) || COMPILED_POLICY_RULES.length !== totalUpstreamRules) {
      errors.push(
        `Runtime compiled rules drift: COMPILED_POLICY_RULES has ${COMPILED_POLICY_RULES?.length || 0} rules, expected ${totalUpstreamRules}`
      );
    } else {
      for (const compiledRule of COMPILED_POLICY_RULES) {
        if (!Array.isArray(compiledRule.patterns) || !compiledRule.patterns.every((p) => p instanceof RegExp)) {
          errors.push(`Runtime compiled rule '${compiledRule.id}' contains non-RegExp pattern entries`);
        }
      }
    }

    // Verify documentation claim parity for total declarative patterns (66)
    const totalPatterns = UPSTREAM_POLICY_PACKS.reduce(
      (sum, p) => sum + (p.rules || []).reduce((pSum, r) => pSum + (r.patterns || []).length, 0),
      0
    );
    const walkDocPath = resolve(REPO_ROOT, 'docs/WALKTHROUGH-v2.1.md');
    if (existsSync(walkDocPath)) {
      const walkContent = readFileSync(walkDocPath, 'utf-8');
      if (!walkContent.includes(`across all ${totalPatterns} patterns`)) {
        errors.push(`docs/WALKTHROUGH-v2.1.md pattern count drift: expected 'across all ${totalPatterns} patterns'`);
      }
    }
  }
}

/**
 * Audit 5: Architecture Diagram Metadata, Path Existence & Invariant Parity
 */
export function auditArchitectureDiagrams(errors = [], { overrideArchitectureContent = null } = {}) {
  const archPath = resolve(REPO_ROOT, 'docs/ARCHITECTURE.md');
  if (overrideArchitectureContent === null && !existsSync(archPath)) {
    errors.push('Missing docs/ARCHITECTURE.md file');
    return;
  }

  const content = overrideArchitectureContent !== null ? overrideArchitectureContent : readFileSync(archPath, 'utf-8');

  // 1. Validate <!-- diagram-meta --> header
  const metaMatch = content.match(/<!--\s*diagram-meta([\s\S]*?)-->/);
  if (!metaMatch) {
    errors.push('docs/ARCHITECTURE.md is missing required <!-- diagram-meta ... --> metadata block');
  } else {
    const metaBody = metaMatch[1];
    if (!/last-validated:\s*\d{4}-\d{2}-\d{2}/.test(metaBody)) {
      errors.push('docs/ARCHITECTURE.md diagram-meta is missing a valid YYYY-MM-DD last-validated date');
    }
    if (!/validated-commit:\s*[0-9a-f]{7,40}/i.test(metaBody)) {
      errors.push('docs/ARCHITECTURE.md diagram-meta is missing a valid hexadecimal validated-commit hash');
    }
    if (!/covers:\s*\[.+\]/.test(metaBody)) {
      errors.push('docs/ARCHITECTURE.md diagram-meta is missing a covers: [...] list');
    }
  }

  // 2. Verify air-gapped content script accuracy in Mermaid diagrams (Scanner must never call MLWorker)
  const mermaidBlocks = [...content.matchAll(/```mermaid([\s\S]*?)```/g)].map((m) => m[1]);
  if (mermaidBlocks.length < 2) {
    errors.push('docs/ARCHITECTURE.md must contain at least 2 Mermaid architecture diagrams (C4 Container & Execution Sandbox)');
  }
  for (const block of mermaidBlocks) {
    if (/\bScanner(?:\s*\[[^\]]*\])?\s*-[.-]*>.*(?:MLWorker|\/classify-links)/i.test(block)) {
      errors.push(
        'docs/ARCHITECTURE.md diagram violation: Content Scanner (src/content/scanner.ts) is air-gapped and must not have a network arrow to MLWorker'
      );
    }
  }

  // 3. Verify every repo-relative file path cited in Mermaid diagrams exists on disk
  for (const block of mermaidBlocks) {
    const pathMatches = block.match(/\b(?:src|docs|scripts|tests|public)\/[A-Za-z0-9_./-]+\.(?:ts|tsx|js|mjs|json|md|html)\b/g) || [];
    for (const relFile of pathMatches) {
      if (!existsSync(resolve(REPO_ROOT, relFile))) {
        errors.push(`docs/ARCHITECTURE.md Mermaid diagram references non-existent file '${relFile}'`);
      }
    }
  }

  // 4. Verify Section 4 Directory Structure tree paths exist on disk
  const dirSectionMatch = content.match(/##\s*4\.\s*Directory Structure[\s\S]*?```(?:\w*\n|\n)([\s\S]*?)```/i);
  if (!dirSectionMatch) {
    errors.push('docs/ARCHITECTURE.md is missing Section 4 Directory Structure code block');
  } else {
    const treeLines = dirSectionMatch[1].split('\n').filter((l) => l.trim().length > 0);
    const stack = [];
    for (const line of treeLines) {
      const branchIdx = line.search(/[├└]──\s+/);
      if (branchIdx === -1) continue;
      const depth = Math.floor(branchIdx / 4);
      const afterBranch = line.slice(branchIdx).replace(/^[├└]──\s+/, '');
      const rawEntry = afterBranch.split(/\s+#/)[0].trim();
      if (!rawEntry) continue;
      const cleanEntry = rawEntry.replace(/\/$/, '');
      stack[depth] = cleanEntry;
      stack.length = depth + 1;
      const relTreePath = stack.join('/');
      if (!existsSync(resolve(REPO_ROOT, relTreePath))) {
        errors.push(`docs/ARCHITECTURE.md directory tree references non-existent path '${relTreePath}'`);
      }
    }
  }

  // 5. Verify Invariant #10 production dependency count matches package.json
  const pkgPath = resolve(REPO_ROOT, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const actualDepCount = Object.keys(pkg.dependencies || {}).length;
    const depClaimMatch = content.match(/\|\s*10\s*\|\s*\*\*Minimal Production Dependencies\*\*\s*\|\s*Exactly\s+(\d+)\s+production dependencies/i);
    if (!depClaimMatch) {
      errors.push('docs/ARCHITECTURE.md is missing Invariant #10 production dependency count claim');
    } else {
      const claimedDepCount = parseInt(depClaimMatch[1], 10);
      if (claimedDepCount !== actualDepCount) {
        errors.push(
          `docs/ARCHITECTURE.md Invariant #10 drift: claims ${claimedDepCount} production dependencies, but package.json has ${actualDepCount}`
        );
      }
    }
  }
}

/**
 * Audit 6: Portfolio Master Brief Parity
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
  const match = briefContent.match(/`knowthankyew-extension`.*?(\d+)\/(\d+)\s+Tests\s+\((\d+)\s+test files/);
  if (!match) {
    errors.push('Could not find knowthankyew-extension test inventory count in KNOWTHANKYEW_PORTFOLIO_MASTER_BRIEF.md');
    return false;
  }

  const documentedCount = parseInt(match[1], 10);
  const documentedFiles = parseInt(match[3], 10);
  const { actualCount, actualFiles } = getActualTestInventory();

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
  auditZeroEgress(errors, options);
  auditStoreMetadataParity(errors, options);
  auditVocabulary(errors);
  auditPolicyPacks(errors);
  auditArchitectureDiagrams(errors);
  const briefChecked = auditPortfolioMasterBrief(errors, options);

  return { errors, briefChecked };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('=== KnowThankYew Extension Claims, Architecture & Privacy Invariant Audit ===\n');
  const requireBrief = process.argv.includes('--require-brief');
  const requireArtifacts = process.argv.includes('--require-artifacts');
  const { errors, briefChecked } = runAllAudits({ requireBrief, requireArtifacts });

  if (errors.length > 0) {
    console.error(`[FAIL] Found ${errors.length} claims / architectural invariant violation(s):`);
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log('[PASS] All KnowThankYew Extension architectural & claims invariants verified:');
  console.log('  ✓ Zero remote egress verified (connect-src none, zero remote primitives in runtime & bundles)');
  console.log('  ✓ Store & multi-browser metadata parity verified (100% permissions justified, manifest parity)');
  console.log('  ✓ Zero prohibited marketing adjectives detected across docs, HTML & React UI');
  console.log('  ✓ Declarative policy packs validated (safe-regex & @knowthankyew/policy-packs parity)');
  console.log('  ✓ Architecture diagrams, referenced paths & dependency counts verified');
  if (briefChecked) {
    console.log('  ✓ Portfolio Master Brief parity verified');
  } else {
    console.log('  - Portfolio Master Brief check skipped (isolated CI)');
  }
  process.exit(0);
}
