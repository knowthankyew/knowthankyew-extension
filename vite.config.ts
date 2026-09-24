import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

export default defineConfig(({ mode }) => {
  const isLocalMl = process.env.VITE_LOCAL_ML_ENABLED === 'true';
  const targetBrowser = process.env.TARGET_BROWSER || 'chrome';
  let outDir = targetBrowser === 'firefox' ? 'dist-firefox' : 'dist';

  return {
    plugins: [
      react(),
      {
        name: 'air-gap-zero-egress',
        configResolved(config) {
          outDir = config.build.outDir || (targetBrowser === 'firefox' ? 'dist-firefox' : 'dist');
        },
        transform(code, id) {
          if (id.includes('@knowthankyew/privacy-telemetry')) {
            // Physically excise any remote network egress function from bundle
            let modified = code;
            // Robust replacement: keep the original function identifier ($1) while emptying its body
            modified = modified.replace(
              /async\s+function\s+([a-zA-Z0-9_$]+)\s*\([^{]*\{[\s\S]*?fetch\([\s\S]*?catch\s*\{[^\}]*\}\s*\}/g,
              'async function $1() {}'
            );
            // Fallback matching minified 'r' function structure
            modified = modified.replace(
              /async\s+function\s+r\([^{]*\{[\s\S]*?catch\s*\{[^\}]*\}\s*\}/g,
              'async function r() {}'
            );
            // Secondary defense-in-depth: neutralize any remaining fetch(...) calls in the module
            modified = modified.replace(/\bfetch\s*\(/g, 'void /* air-gap stripped */ (');
            return {
              code: modified,
              map: null,
            };
          }
          if (mode !== 'test' && !isLocalMl && id.includes('local-ml-client')) {
            let modified = code.replace(/\bfetch\s*\(/g, 'void /* air-gap stripped */ (');
            return {
              code: modified,
              map: null,
            };
          }
        },
        closeBundle() {
          const manifestPath = resolve(outDir, 'manifest.json');
          if (existsSync(manifestPath)) {
            const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
            if (isLocalMl) {
              manifest.content_security_policy = {
                extension_pages: "default-src 'self'; connect-src 'self' http://127.0.0.1:8420 http://localhost:8420; style-src 'self' 'unsafe-inline'; script-src 'self';",
              };
              manifest.host_permissions = [
                'http://127.0.0.1:8420/*',
                'http://localhost:8420/*',
              ];
            } else {
              manifest.content_security_policy = {
                extension_pages: "default-src 'self'; connect-src 'none'; style-src 'self' 'unsafe-inline'; script-src 'self';",
              };
              delete manifest.host_permissions;
            }
            if (targetBrowser === 'firefox') {
              manifest.browser_specific_settings = {
                gecko: {
                  id: 'reality-engine@knowthankyew.org',
                  strict_min_version: '115.0',
                  data_collection_permissions: {
                    required: ['none'],
                  },
                },
                gecko_android: {
                  strict_min_version: '115.0',
                },
              };
              manifest.background = {
                scripts: ['background/service-worker.js'],
                type: 'module',
              };
            }
            writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
          }
        },
      },
    ],
  build: {
    outDir: targetBrowser === 'firefox' ? 'dist-firefox' : 'dist',
    emptyOutDir: true,
    modulePreload: {
      polyfill: false,
    },
    rollupOptions: {
      input: {
        popup: resolve('popup.html'),
        options: resolve('options.html'),
        'background/service-worker': resolve('src/background/service-worker.ts'),
        'content/scanner': resolve('src/content/scanner.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  define: {
    // Compile-time tree shaking for OTLP exporter (Pillar 2 invariant)
    __OTEL_EXPORTER_ENDPOINT__: JSON.stringify(process.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT || ''),
    // Compile-time dead-code elimination for Local ML Loopback client
    __LOCAL_ML_ENABLED__: JSON.stringify(process.env.VITE_LOCAL_ML_ENABLED === 'true'),
  },
};
});
