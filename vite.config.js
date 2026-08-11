import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import svgr from '@svgr/rollup'

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@components': path.resolve(__dirname, './src/components'),
    },
  },
  // react-fast-marquee is legacy CJS (`exports.default =`, no `__esModule` flag);
  // Rolldown's stricter interop otherwise imports it as the whole exports object.
  legacy: {
    inconsistentCjsInterop: true,
  },
  plugins: [
    svgr({
      svgrOptions: {
        icon: true,
        svgo: true,
        svgoConfig: {
          plugins: [
            { name: 'removeTitle', active: false },
            { name: 'removeDesc', active: false },
            { name: 'prefixIds', params: { prefix: 'svg-' } },
          ],
        },
      },
    }),
    react(),
  ],
  // route based code splitting
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'react-vendor'
          }
          if (id.includes('node_modules/three')) {
            return 'three-vendor'
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  assetsInclude: ['**/*.JPG', '**/*.jpg', '**/*.jpeg', '**/*.png', '**/*.webp'],
  // Absolute, NOT './'. With a relative base, index.html references
  // `./assets/index-<hash>.js`, which the browser resolves against the current
  // route. On a deep link such as /previous-events/2025 that becomes
  // /previous-events/assets/index-<hash>.js — a path that does not exist, so the
  // SPA fallback (vercel.json's rewrite, or try_files in docker/nginx.conf)
  // returns index.html with Content-Type text/html. The browser refuses to
  // execute HTML as a module script and the page renders blank.
  // Client-side navigation hides this, because the bundle is already loaded;
  // it only breaks on a direct visit or a refresh. Keep this '/'.
  base: '/',
})
