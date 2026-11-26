import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

const base = process.env.VITE_BASE_PATH || '/';

export default defineConfig({
  base,
  server: {
    host: true,
    allowedHosts: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'sql-wasm.wasm'],
      manifest: {
        name: 'Fieldnotes — Return Visit & Bible Study Journal',
        short_name: 'Fieldnotes',
        description:
          'Local-first, private Return Visit and Bible Study notebook with in-browser SQLite and encrypted backups.',
        theme_color: '#FAF8F5',
        background_color: '#FAF8F5',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,wasm,ico,png,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
