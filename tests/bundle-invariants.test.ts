import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync, statSync, rmSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { execSync } from 'child_process';

describe('Production Bundle Egress & Manifest Invariants (bundle-invariants.test.ts)', () => {
  const distDir = resolve(__dirname, '../dist');

  beforeAll(() => {
    // Ensure standard production build exists for testing
    if (
      !existsSync(resolve(distDir, 'background/service-worker.js')) ||
      !existsSync(resolve(distDir, 'content/scanner.js'))
    ) {
      execSync('npm run build', { cwd: resolve(__dirname, '..'), stdio: 'pipe' });
    }
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
    const hasScanner = jsFiles.some(f => f.endsWith('scanner.js'));
    expect(hasScanner, 'Expected dist/content/scanner.js to be compiled and verified').toBe(true);

    const forbiddenPatterns = [
      /\bfetch\s*\(/,
      /\bWebSocket\b/,
      /\bsendBeacon\b/,
      /\bXMLHttpRequest\b/,
      /\bEventSource\b/,
      /\bimportScripts\s*\(/,
      /\/v1\/traces/,
      /__KTY_TEST_HOOK_/,
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

  it('verifies content/scanner.js is an isolated classic script (IIFE) with 0 ES module import/export statements', () => {
    const scannerPath = resolve(distDir, 'content/scanner.js');
    expect(existsSync(scannerPath), 'dist/content/scanner.js must exist').toBe(true);

    const content = readFileSync(scannerPath, 'utf-8');

    // Content scripts injected into host tabs execute as classic scripts.
    // If Vite/Rollup code-splits or treats the content script as an ES module,
    // browsers throw: "Uncaught SyntaxError: Cannot use import statement outside a module"
    const hasImport = /^\s*import\b/m.test(content);
    expect(hasImport, 'dist/content/scanner.js must NOT contain any ES module import statements').toBe(false);

    const hasExport = /^\s*export\b/m.test(content);
    expect(hasExport, 'dist/content/scanner.js must NOT contain any ES module export statements').toBe(false);

    // Must be compiled as an executable self-contained script
    expect(content.length).toBeGreaterThan(20000);
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
    const testDistMl = resolve(__dirname, '../dist-test-ml');
    try {
      execSync('VITE_LOCAL_ML_ENABLED=true npx vite build --outDir dist-test-ml', { cwd: rootDir, stdio: 'pipe' });
      const jsFiles = getJsFilesRecursively(testDistMl);
      const hasLoopbackClient = jsFiles.some(f => readFileSync(f, 'utf-8').includes('127.0.0.1:8420'));
      expect(hasLoopbackClient).toBe(true);

      const manifest = JSON.parse(readFileSync(resolve(testDistMl, 'manifest.json'), 'utf-8'));
      expect(manifest.content_security_policy.extension_pages).toContain('127.0.0.1:8420');
      expect(manifest.host_permissions).toContain('http://127.0.0.1:8420/*');
    } finally {
      rmSync(testDistMl, { recursive: true, force: true });
    }
  }, 30000);

  it('verifies Firefox build target generates valid Gecko settings and background.scripts', () => {
    const rootDir = resolve(__dirname, '..');
    const testDistFfx = resolve(__dirname, '../dist-test-firefox');
    try {
      execSync('TARGET_BROWSER=firefox npx vite build --outDir dist-test-firefox', { cwd: rootDir, stdio: 'pipe' });
      const manifest = JSON.parse(readFileSync(resolve(testDistFfx, 'manifest.json'), 'utf-8'));
      expect(manifest.browser_specific_settings?.gecko?.id).toBe('reality-engine@knowthankyew.org');
      expect(manifest.browser_specific_settings?.gecko?.data_collection_permissions?.required).toEqual(['none']);
      expect(manifest.browser_specific_settings?.gecko_android?.strict_min_version).toBe('115.0');
      expect(manifest.background?.scripts).toEqual(['background/service-worker.js']);
      expect(manifest.background?.type).toBe('module');
      expect(manifest.content_security_policy.extension_pages).toContain("connect-src 'none'");

      const jsFiles = getJsFilesRecursively(testDistFfx);
      expect(jsFiles.length).toBeGreaterThan(0);
      const scannerFfx = resolve(testDistFfx, 'content/scanner.js');
      expect(existsSync(scannerFfx)).toBe(true);
      const scannerContent = readFileSync(scannerFfx, 'utf-8');
      expect(/^\s*import\b/m.test(scannerContent)).toBe(false);
      expect(/^\s*export\b/m.test(scannerContent)).toBe(false);

      const forbiddenPatterns = [
        /\bfetch\s*\(/,
        /\bWebSocket\b/,
        /\bsendBeacon\b/,
        /\bXMLHttpRequest\b/,
        /\bEventSource\b/,
        /\bimportScripts\s*\(/,
        /\/v1\/traces/,
        /__KTY_TEST_HOOK_/,
      ];
      for (const filePath of jsFiles) {
        const content = readFileSync(filePath, 'utf-8');
        for (const pattern of forbiddenPatterns) {
          expect(pattern.test(content)).toBe(false);
        }
      }
    } finally {
      rmSync(testDistFfx, { recursive: true, force: true });
    }
  }, 30000);

  it('verifies Safari build target generates valid MV3 manifest and zero-egress JS', () => {
    const rootDir = resolve(__dirname, '..');
    const testDistSafari = resolve(__dirname, '../dist-test-safari');
    try {
      execSync('TARGET_BROWSER=safari npx vite build --outDir dist-test-safari', { cwd: rootDir, stdio: 'pipe' });
      const manifest = JSON.parse(readFileSync(resolve(testDistSafari, 'manifest.json'), 'utf-8'));
      expect(manifest.browser_specific_settings).toBeUndefined();
      expect(manifest.background?.service_worker).toBe('background/service-worker.js');
      expect(manifest.content_security_policy.extension_pages).toContain("connect-src 'none'");

      const jsFiles = getJsFilesRecursively(testDistSafari);
      expect(jsFiles.length).toBeGreaterThan(0);
      const scannerSafari = resolve(testDistSafari, 'content/scanner.js');
      expect(existsSync(scannerSafari)).toBe(true);
      const scannerContent = readFileSync(scannerSafari, 'utf-8');
      expect(/^\s*import\b/m.test(scannerContent)).toBe(false);
      expect(/^\s*export\b/m.test(scannerContent)).toBe(false);

      const forbiddenPatterns = [
        /\bfetch\s*\(/,
        /\bWebSocket\b/,
        /\bsendBeacon\b/,
        /\bXMLHttpRequest\b/,
        /\bEventSource\b/,
        /\bimportScripts\s*\(/,
        /\/v1\/traces/,
        /__KTY_TEST_HOOK_/,
      ];
      for (const filePath of jsFiles) {
        const content = readFileSync(filePath, 'utf-8');
        for (const pattern of forbiddenPatterns) {
          expect(pattern.test(content)).toBe(false);
        }
      }
    } finally {
      rmSync(testDistSafari, { recursive: true, force: true });
    }
  }, 30000);
});
