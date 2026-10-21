import 'dotenv/config'

const num = (value: string | undefined, fallback: number) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}
const bool = (value: string | undefined, fallback = false) => {
  if (value === undefined) return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

const nodeEnv = process.env.NODE_ENV || 'development'
const port = num(process.env.PORT, 4000)
const appUrl = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '')
// In development the browser lives on Vite (5173), not the API port (4000).
// Production deployments should set PUBLIC_APP_URL (or APP_URL) explicitly.
const publicUrl = (
  process.env.PUBLIC_APP_URL ||
  process.env.APP_URL ||
  (nodeEnv === 'production' ? `http://localhost:${port}` : appUrl)
).replace(/\/$/, '')

export const env = {
  nodeEnv,
  isProd: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port,
  appUrl,
  publicUrl,
  dbPath: process.env.LEAF_DB_PATH || 'server/data/leaf.db',
  uploadsDir: process.env.LEAF_UPLOADS_DIR || 'server/uploads',
  sessionCookie: process.env.SESSION_COOKIE || 'leaf_session',
  sessionDays: num(process.env.SESSION_DAYS, 7),
  trustProxy: num(process.env.TRUST_PROXY, 0),
  ai: {
    apiKey: process.env.AI_API_KEY || '',
    baseUrl: (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    dailyLimit: num(process.env.AI_DAILY_LIMIT, 20),
    timeoutMs: num(process.env.AI_TIMEOUT_MS, 45000),
  },
  mail: {
    resendKey: process.env.RESEND_API_KEY || '',
    from: process.env.MAIL_FROM || 'LEAF <onboarding@resend.dev>',
  },
  chromePath: process.env.CHROME_PATH || '',
  uploadMaxBytes: num(process.env.UPLOAD_MAX_BYTES, 3 * 1024 * 1024),
  enableHsts: bool(process.env.ENABLE_HSTS, nodeEnv === 'production'),
}
