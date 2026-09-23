import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'air-gap-zero-egress',
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
        if (!process.env.VITEST && process.env.VITE_LOCAL_ML_ENABLED !== 'true' && id.includes('local-ml-client')) {
          let modified = code.replace(/\bfetch\s*\(/g, 'void /* air-gap stripped */ (');
          return {
            code: modified,
            map: null,
          };
        }
      },
    },
  ],
  build: {
    outDir: 'dist',
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
});
