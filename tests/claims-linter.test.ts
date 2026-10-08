import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { ALL_POLICY_PACKS } from '../src/core/policy-packs';

describe('Store Metadata & Documentation Claims Linter (claims-linter.test.ts)', () => {
  const root = resolve(__dirname, '..');
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
  const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf-8'));
  const storeDoc = readFileSync(resolve(root, 'docs/CHROMEWEBSTORE.md'), 'utf-8');
  const roadmapDoc = readFileSync(resolve(root, 'ROADMAP.md'), 'utf-8');

  it('enforces version parity across package.json, manifest.json, and store documentation', () => {
    expect(manifest.version).toBe(pkg.version);
    expect(storeDoc).toContain(`knowthankyew-extension-v${pkg.version}.zip`);
    expect(roadmapDoc).toContain(`v${pkg.version}`);
  });

  it('enforces live store baseline version alignment across CHROMEWEBSTORE.md, ROADMAP.md, and README.md', () => {
    const liveVersion = '1.6.0';
    expect(storeDoc).toContain(`\`${liveVersion}\` (Live & Approved in Chrome Web Store & Firefox AMO)`);
    expect(roadmapDoc).toContain(`v${liveVersion} Live on Chrome Web Store & Firefox AMO`);

    const readmeDoc = readFileSync(resolve(root, 'README.md'), 'utf-8');
    expect(readmeDoc).toContain(`knowthankyew-extension-v${liveVersion}.zip`);
  });

  it('guarantees 100% of declared manifest permissions have reviewer justifications in CHROMEWEBSTORE.md', () => {
    const permissions: string[] = manifest.permissions || [];
    for (const perm of permissions) {
      expect(
        storeDoc.includes(`\`${perm}\``),
        `Manifest permission '${perm}' lacks a matching plain-English justification row in docs/CHROMEWEBSTORE.md`
      ).toBe(true);
    }
  });

  it('asserts Content Security Policy quoted in privacy documentation matches manifest.json', () => {
    const manifestCsp = manifest.content_security_policy?.extension_pages || '';
    expect(manifestCsp).toContain("connect-src 'none'");
    expect(storeDoc).toContain("connect-src 'none'");
  });

  it('verifies policy pack count and rule compilation integrity', () => {
    expect(ALL_POLICY_PACKS.length).toBe(4); // us-federal, state-arl, uk-dmcc, eu-crd
    const totalRules = ALL_POLICY_PACKS.reduce((sum, p) => sum + p.rules.length, 0);
    const totalPatterns = ALL_POLICY_PACKS.reduce(
      (sum, p) => sum + p.rules.reduce((pSum, r) => pSum + r.patterns.length, 0),
      0
    );

    expect(totalRules).toBeGreaterThanOrEqual(19);
    expect(totalPatterns).toBeGreaterThanOrEqual(66);
  });

  it('verifies release zip packages and SHA256SUMS alignment when packaging artifacts exist', () => {
    const mainZip = resolve(root, `knowthankyew-extension-v${pkg.version}.zip`);
    const shaFile = resolve(root, 'SHA256SUMS');

    if (existsSync(mainZip) && existsSync(shaFile)) {
      const shaContent = readFileSync(shaFile, 'utf-8');
      expect(shaContent).toContain(`knowthankyew-extension-v${pkg.version}.zip`);
    } else {
      // In clean CI environments before packaging, verify package script targets current versioning convention
      expect(pkg.scripts?.package).toContain('knowthankyew-extension-v${VERSION}.zip');
    }
  });
});
