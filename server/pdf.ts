import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { chromium, type Browser } from 'playwright-core'
import { env } from './env'

const WINDOWS_BROWSERS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
]
const UNIX_BROWSERS = [
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/microsoft-edge',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
]

export class PdfUnavailableError extends Error {
  constructor(message = 'PDF rendering is unavailable on this machine.') {
    super(message)
    this.name = 'PdfUnavailableError'
  }
}

let browserPromise: Promise<Browser> | null = null

function findBrowser(): string {
  if (env.chromePath && existsSync(env.chromePath)) return env.chromePath
  for (const path of process.platform === 'win32' ? WINDOWS_BROWSERS : UNIX_BROWSERS) {
    if (existsSync(path)) return path
  }
  throw new PdfUnavailableError(
    'No Chromium browser was found. Install Chrome or Edge, or set CHROME_PATH to a Chromium executable.',
  )
}

async function getBrowser(): Promise<Browser> {
  if (browserPromise) {
    const existing = await browserPromise
    if (existing.isConnected()) return existing
    browserPromise = null
  }
  browserPromise = chromium
    .launch({
      executablePath: findBrowser(),
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
    })
    .catch((error) => {
      browserPromise = null
      throw new PdfUnavailableError(`Could not start the PDF browser: ${error instanceof Error ? error.message : 'unknown error'}`)
    })
  return browserPromise
}

export async function closePdfBrowser() {
  if (browserPromise) {
    try {
      const browser = await browserPromise
      await browser.close()
    } catch {
      /* already closed */
    }
    browserPromise = null
  }
}

let active = 0
const waiters: Array<() => void> = []
const MAX_CONCURRENT = 2

async function acquire() {
  if (active < MAX_CONCURRENT) {
    active += 1
    return
  }
  await new Promise<void>((resolve) => waiters.push(resolve))
  active += 1
}
function release() {
  active = Math.max(0, active - 1)
  const next = waiters.shift()
  if (next) next()
}

export interface PdfOptions {
  /** Useful for debugging or a custom base URL. Fonts are intercepted and served from disk. */
  baseUrl?: string
}

/**
 * Renders the exact same HTML used by the live preview into an A4 PDF with
 * selectable text and live links. Chromium is located locally; nothing is
 * screenshotted and no headless browser download is required at runtime.
 */
export async function htmlToPdf(html: string, options: PdfOptions = {}): Promise<Buffer> {
  await acquire()
  let page: Awaited<ReturnType<Browser['newPage']>> | null = null
  try {
    const browser = await getBrowser()
    page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 1 })
    const fontDir = join(process.cwd(), 'public', 'fonts')
    await page.route('**/fonts/*.woff2', async (route) => {
      const name = basename(new URL(route.request().url()).pathname)
      const path = join(fontDir, name)
      if (existsSync(path)) {
        const body = await readFile(path)
        await route.fulfill({ status: 200, contentType: 'font/woff2', body })
      } else {
        await route.abort()
      }
    })
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 })
    await page.evaluate(async () => {
      await document.fonts.ready
      const images = Array.from(document.images)
      await Promise.all(
        images.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) return resolve()
              const done = () => resolve()
              img.addEventListener('load', done, { once: true })
              img.addEventListener('error', done, { once: true })
              setTimeout(done, 4000)
            }),
        ),
      )
    })
    await page.emulateMedia({ media: 'print' })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })
    return Buffer.from(pdf)
  } catch (error) {
    if (error instanceof PdfUnavailableError) throw error
    throw new PdfUnavailableError(`PDF generation failed: ${error instanceof Error ? error.message : 'unknown error'}`)
  } finally {
    if (page) await page.close().catch(() => undefined)
    release()
  }
}

export function slugify(value: string, fallback = 'document'): string {
  return (
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || fallback
  )
}
