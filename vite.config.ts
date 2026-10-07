import { defineConfig, build, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

export default defineConfig(({ mode }) => {
  const isLocalMl = process.env.VITE_LOCAL_ML_ENABLED === 'true';
  const targetBrowser = process.env.TARGET_BROWSER || 'chrome';
  let outDir = targetBrowser === 'firefox' ? 'dist-firefox' : targetBrowser === 'safari' ? 'dist-safari' : 'dist';

  const airGapTransformPlugin: Plugin = {
    name: 'air-gap-transform',
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
  };

  return {
    plugins: [
      react(),
      airGapTransformPlugin,
      {
        name: 'air-gap-zero-egress-post',
        configResolved(config) {
          outDir = config.build.outDir || (targetBrowser === 'firefox' ? 'dist-firefox' : targetBrowser === 'safari' ? 'dist-safari' : 'dist');
        },
        async closeBundle() {
          // 1. Compile content/scanner.ts as an isolated, self-contained IIFE classic script.
          // Manifest V3 content scripts run as classic scripts, not ES modules.
          // Embedding scanner in the multi-entry ES build causes code-splitting of shared modules (e.g. engine.ts),
          // producing invalid ES 'import' statements in content scripts.
          await build({
            configFile: false,
            publicDir: false,
            plugins: [airGapTransformPlugin],
            build: {
              outDir,
              emptyOutDir: false,
              lib: {
                entry: resolve('src/content/scanner.ts'),
                name: 'KtyContentScanner',
                formats: ['iife'],
                fileName: () => 'content/scanner.js',
              },
            },
            define: {
              __OTEL_EXPORTER_ENDPOINT__: JSON.stringify(process.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT || ''),
              __LOCAL_ML_ENABLED__: JSON.stringify(process.env.VITE_LOCAL_ML_ENABLED === 'true'),
            },
          });

          // 2. Adjust manifest.json per target browser / features
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
            if (targetBrowser === 'safari') {
              manifest.version_name = manifest.version;
              delete manifest.browser_specific_settings;
              if (!isLocalMl) {
                delete manifest.host_permissions;
                manifest.content_security_policy = {
                  extension_pages: "default-src 'self'; connect-src 'none'; style-src 'self' 'unsafe-inline'; script-src 'self';",
                };
              }
            }
            writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
          }
        },
      },
    ],
    build: {
      outDir: targetBrowser === 'firefox' ? 'dist-firefox' : targetBrowser === 'safari' ? 'dist-safari' : 'dist',
      emptyOutDir: true,
      modulePreload: {
        polyfill: false,
      },
      rollupOptions: {
        input: {
          popup: resolve('popup.html'),
          options: resolve('options.html'),
          'background/service-worker': resolve('src/background/service-worker.ts'),
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
