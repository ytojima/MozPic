// Renders ogp.html to public/ogp.png (1200x630) with headless Chrome.
// Usage: npm run ogp   (set CHROME_PATH if Chrome is installed somewhere unusual)
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = fileURLToPath(new URL('..', import.meta.url))
const out = fileURLToPath(new URL('../public/ogp.png', import.meta.url))
const TIMEOUT_MS = 60000

const chrome = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].find((p) => p && existsSync(p))
if (!chrome) throw new Error('Chrome not found. Set CHROME_PATH to your Chrome/Chromium binary.')

mkdirSync(fileURLToPath(new URL('../public', import.meta.url)), { recursive: true })
rmSync(out, { force: true })

const server = await createServer({ root, logLevel: 'error', server: { port: 0 } })
await server.listen()
// Separate throwaway profile so it never attaches to an already-running Chrome
const profile = mkdtempSync(join(tmpdir(), 'mozpic-ogp-'))

const proc = spawn(chrome, [
  '--headless=new',
  `--user-data-dir=${profile}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=1200,630',
  `--screenshot=${out}`,
  `${server.resolvedUrls.local[0]}ogp.html`,
], { stdio: 'ignore' })

try {
  // Headless Chrome may linger after writing the screenshot, so wait for the file to settle instead of the exit
  const started = Date.now()
  let lastSize = -1
  for (;;) {
    if (Date.now() - started > TIMEOUT_MS) throw new Error('Timed out waiting for the OGP screenshot')
    await sleep(300)
    if (!existsSync(out)) continue
    const size = statSync(out).size
    if (size > 0 && size === lastSize) break
    lastSize = size
  }
  console.log(`OGP image written to ${out}`)
} finally {
  proc.kill()
  await server.close()
  rmSync(profile, { recursive: true, force: true })
}
