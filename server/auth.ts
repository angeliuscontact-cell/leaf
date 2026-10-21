import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import type { NextFunction, Request, Response } from 'express'
import { addDaysIso, getDb, nowIso } from './db'
import { env } from './env'
import type { User } from '../shared/types'

const scrypt = promisify(scryptCb) as (password: string, salt: string, keylen: number, options?: unknown) => Promise<Buffer>

export interface AuthUser {
  id: number
  email: string
  name: string
  emailVerified: boolean
  theme: 'light' | 'dark' | 'system'
  createdAt: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
      sessionId?: number
    }
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const key = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })
  return `scrypt$16384$8$1$${salt}$${key.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [algorithm, n, r, p, salt, hash] = stored.split('$')
    if (algorithm !== 'scrypt' || !salt || !hash) return false
    const key = await scrypt(password, salt, hash.length / 2, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 64 * 1024 * 1024,
    })
    const expected = Buffer.from(hash, 'hex')
    if (key.length !== expected.length) return false
    return timingSafeEqual(key, expected)
  } catch {
    return false
  }
}

export function createToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('base64url')
  const hash = createHash('sha256').update(raw).digest('hex')
  return { raw, hash }
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export function publicUser(row: Record<string, unknown>): User {
  return {
    id: Number(row.id),
    email: String(row.email),
    name: String(row.name),
    emailVerified: Number(row.email_verified) === 1,
    theme: (row.theme as User['theme']) || 'system',
    createdAt: String(row.created_at),
  }
}

export function issueSession(res: Response, userId: number): { raw: string; id: number } {
  const database = getDb()
  const token = createToken()
  const createdAt = nowIso()
  const expiresAt = addDaysIso(env.sessionDays)
  const result = database
    .prepare('INSERT INTO sessions (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .run(userId, token.hash, expiresAt, createdAt)
  database.prepare('DELETE FROM sessions WHERE expires_at < ?').run(createdAt)
  const id = Number(result.lastInsertRowid)
  res.cookie(env.sessionCookie, token.raw, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: env.sessionDays * 24 * 60 * 60 * 1000,
  })
  return { raw: token.raw, id }
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(env.sessionCookie, { httpOnly: true, secure: env.isProd, sameSite: 'lax', path: '/' })
}

export function attachUser(req: Request, _res: Response, next: NextFunction) {
  const raw = req.cookies?.[env.sessionCookie]
  if (!raw || typeof raw !== 'string') return next()
  const database = getDb()
  const session = database
    .prepare(
      `SELECT s.id AS session_id, s.expires_at, u.* FROM sessions s
       JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`,
    )
    .get(hashToken(raw)) as (Record<string, unknown> & { session_id: number; expires_at: string }) | undefined
  if (!session) {
    clearSessionCookie(_res)
    return next()
  }
  if (new Date(String(session.expires_at)).getTime() < Date.now()) {
    database.prepare('DELETE FROM sessions WHERE id = ?').run(Number(session.session_id))
    clearSessionCookie(_res)
    return next()
  }
  req.user = publicUser(session)
  req.sessionId = Number(session.session_id)
  next()
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Please sign in to continue.', code: 'UNAUTHENTICATED' })
  next()
}

/** Reject cross-site form posts. Cookie is SameSite=Lax; this header is impossible for a plain HTML form to send. */
export function requireRequestedWith(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  if (req.get('x-requested-with') !== 'leaf') {
    return res.status(403).json({ error: 'Request verification failed. Refresh the page and try again.', code: 'CSRF' })
  }
  next()
}

export function revokeSession(req: Request) {
  if (req.sessionId) getDb().prepare('DELETE FROM sessions WHERE id = ?').run(req.sessionId)
}

export function revokeAllSessions(userId: number, exceptId?: number) {
  if (exceptId) getDb().prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?').run(userId, exceptId)
  else getDb().prepare('DELETE FROM sessions WHERE user_id = ?').run(userId)
}

export function createEmailVerification(userId: number): { raw: string; expiresAt: string } {
  const token = createToken()
  const expiresAt = addDaysIso(2)
  getDb()
    .prepare('UPDATE users SET verification_token_hash = ?, verification_expires_at = ?, updated_at = ? WHERE id = ?')
    .run(token.hash, expiresAt, nowIso(), userId)
  return { raw: token.raw, expiresAt }
}
