import { defineConfig } from 'vitest/config'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      /* No web app manifest. `RULES.md` says static web only, same URL on
         laptop and phone — a manifest exists to invite installation, which is
         the one thing the app is not. The service worker is here to make the
         shell survive a lost signal, nothing else. */
      manifest: false,
      workbox: {
        /* The fonts are cross-origin, so they are cached on first use rather
           than precached at build time. Everything else in `dist/` is. */
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'CacheFirst',
            options: { cacheName: 'fonts' },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    /* Only this checkout's tests. A phase run in a git worktree puts a whole
       second copy of `src/` under `.claude/worktrees/`, and vitest's default
       include walks into it — the suite then reports several hundred tests
       from branches that are not checked out, and a stale copy can fail a
       run of code that is fine. */
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
