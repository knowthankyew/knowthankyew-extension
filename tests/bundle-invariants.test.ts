import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
import { execSync } from 'child_process';

describe('Production Bundle Egress & Manifest Invariants (bundle-invariants.test.ts)', () => {
  const distDir = resolve(__dirname, '../dist');

  beforeAll(() => {
    // Ensure fresh standard production build exists for testing
    execSync('npm run build', { cwd: resolve(__dirname, '..'), stdio: 'pipe' });
  });

  function getJsFilesRecursively(dir: string): string[] {
    const entries = readdirSync(dir);
    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      if (statSync(fullPath).isDirectory()) {
        files.push(...getJsFilesRecursively(fullPath));
      } else if (entry.endsWith('.js')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  it('verifies 100% absence of network egress primitives across all compiled JS files', () => {
    const jsFiles = getJsFilesRecursively(distDir);
    expect(jsFiles.length).toBeGreaterThan(0);

    const forbiddenPatterns = [
      /\bfetch\s*\(/,
      /\bWebSocket\b/,
      /\bsendBeacon\b/,
      /\bXMLHttpRequest\b/,
      /\bEventSource\b/,
      /\bimportScripts\s*\(/,
      /\/v1\/traces/,
    ];

    const violations: Array<{ file: string; pattern: string }> = [];

    for (const filePath of jsFiles) {
      const content = readFileSync(filePath, 'utf-8');
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(content)) {
          violations.push({
            file: filePath.replace(distDir, 'dist'),
            pattern: pattern.toString(),
          });
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('verifies manifest.json version matches package.json and enforces connect-src none', () => {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'));
    const manifest = JSON.parse(readFileSync(resolve(distDir, 'manifest.json'), 'utf-8'));

    expect(manifest.version).toBe(pkg.version);
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.content_security_policy.extension_pages).toContain("connect-src 'none'");
  });

  it('verifies loopback client is actively preserved when VITE_LOCAL_ML_ENABLED=true is set', () => {
    const rootDir = resolve(__dirname, '..');
    execSync('VITE_LOCAL_ML_ENABLED=true npx vite build', { cwd: rootDir, stdio: 'pipe' });
    const jsFiles = getJsFilesRecursively(distDir);
    const hasLoopbackClient = jsFiles.some(f => readFileSync(f, 'utf-8').includes('127.0.0.1:8420'));
    expect(hasLoopbackClient).toBe(true);

    // Rebuild standard production bundle to leave dist clean
    execSync('npm run build', { cwd: rootDir, stdio: 'pipe' });
  });
});
