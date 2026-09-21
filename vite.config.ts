import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
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
