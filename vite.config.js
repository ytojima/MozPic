import { createHash } from 'node:crypto'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The app never sends anything anywhere. This CSP makes the browser enforce that in production:
// no fetch/XHR/WebSocket/beacon (connect-src 'none'), no form posts, no third-party
// scripts/images/fonts. Build-only, because the dev server needs a WebSocket for HMR.
function contentSecurityPolicy() {
  return {
    name: 'mozpic-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const inlineHashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
          ([, code]) => `'sha256-${createHash('sha256').update(code).digest('base64')}'`,
        )
        const policy = [
          "default-src 'none'",
          `script-src 'self' ${inlineHashes.join(' ')}`,
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "font-src 'self'",
          "connect-src 'none'",
          "form-action 'none'",
          "base-uri 'none'",
        ].join('; ')
        return html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`)
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), contentSecurityPolicy()],
  // GitHub Pages project sites live under /<repo>/; the deploy workflow sets VITE_BASE
  base: process.env.VITE_BASE || '/',
})
