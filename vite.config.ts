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
          return {
            code: code.replace(/async function r\([^{]*\{[\s\S]*?catch\s*\{[^\}]*\}\s*\}/g, 'async function r() {}'),
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
  },
});
