import { Router } from 'express'
import { unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { getDb, nowIso, addDaysIso } from '../db'
import { env } from '../env'
import {
  clearSessionCookie,
  createEmailVerification,
  createToken,
  hashPassword,
  hashToken,
  issueSession,
  publicUser,
  requireAuth,
  revokeAllSessions,
  revokeSession,
  verifyPassword,
} from '../auth'
import { sendMail, resetEmail, verificationEmail } from '../mailer'
import {
  accountSchema,
  changePasswordSchema,
  deleteAccountSchema,
  forgotSchema,
  loginSchema,
  parseBody,
  registerSchema,
  resetSchema,
  verifySchema,
} from '../validation'
import { logActivity } from '../activity'

const router = Router()

const DUMMY_HASH =
  'scrypt$16384$8$1$0123456789abcdef0123456789abcdef$' +
  '0'.repeat(128)

function verificationUrl(token: string) {
  return `${env.publicUrl}/verify-email?token=${encodeURIComponent(token)}`
}
function resetUrl(token: string) {
  return `${env.publicUrl}/reset-password?token=${encodeURIComponent(token)}`
}

async function sendVerification(user: { id: number; email: string; name: string }) {
  const token = createEmailVerification(user.id)
  const url = verificationUrl(token.raw)
  const message = verificationEmail(user.name, url)
  await sendMail({ ...message, to: user.email })
  return url
}

router.post('/register', async (req, res, next) => {
  try {
    const body = parseBody(registerSchema, req, res)
    if (!body) return
    const db = getDb()
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(body.email)
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists. Try signing in.', code: 'EMAIL_EXISTS' })
    }
    const passwordHash = await hashPassword(body.password)
    const now = nowIso()
    const result = db
      .prepare(
        'INSERT INTO users (email, password_hash, name, email_verified, theme, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?, ?)',
      )
      .run(body.email, passwordHash, body.name, 'system', now, now)
    const userId = Number(result.lastInsertRowid)
    db.prepare(
      'INSERT INTO profiles (user_id, full_name, email, updated_at) VALUES (?, ?, ?, ?)',
    ).run(userId, body.name, body.email, now)
    issueSession(res, userId)
    const devVerificationUrl = await sendVerification({ id: userId, email: body.email, name: body.name })
    logActivity(userId, 'account', 'Created your LEAF account', 'user', userId)
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown>
    res.status(201).json({
      user: publicUser(user),
      ...(env.isProd ? {} : { devVerificationUrl }),
    })
  } catch (error) {
    next(error)
  }
})

router.post('/login', async (req, res, next) => {
  try {
    const body = parseBody(loginSchema, req, res)
    if (!body) return
    const db = getDb()
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(body.email) as Record<string, unknown> | undefined
    const valid = await verifyPassword(body.password, row ? String(row.password_hash) : DUMMY_HASH)
    if (!row || !valid) {
      return res.status(401).json({ error: 'Email or password is incorrect.', code: 'INVALID_CREDENTIALS' })
    }
    issueSession(res, Number(row.id))
    res.json({ user: publicUser(row) })
  } catch (error) {
    next(error)
  }
})

router.post('/logout', (req, res) => {
  revokeSession(req)
  clearSessionCookie(res)
  res.status(204).end()
})

router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not signed in.', code: 'UNAUTHENTICATED' })
  res.json({ user: req.user })
})

router.post('/verify-email', async (req, res, next) => {
  try {
    const body = parseBody(verifySchema, req, res)
    if (!body) return
    const db = getDb()
    const hash = hashToken(body.token)
    const row = db
      .prepare('SELECT id, email_verified, verification_expires_at FROM users WHERE verification_token_hash = ?')
      .get(hash) as Record<string, unknown> | undefined
    if (!row) return res.status(400).json({ error: 'This verification link is invalid or has already been used.', code: 'TOKEN_INVALID' })
    if (new Date(String(row.verification_expires_at)).getTime() < Date.now()) {
      return res.status(400).json({ error: 'This verification link has expired. Request a new one from Settings.', code: 'TOKEN_EXPIRED' })
    }
    db.prepare(
      'UPDATE users SET email_verified = 1, verification_token_hash = NULL, verification_expires_at = NULL, updated_at = ? WHERE id = ?',
    ).run(nowIso(), Number(row.id))
    res.json({ verified: true })
  } catch (error) {
    next(error)
  }
})

router.post('/resend-verification', requireAuth, async (req, res, next) => {
  try {
    const db = getDb()
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as Record<string, unknown>
    if (Number(row.email_verified) === 1) {
      return res.status(400).json({ error: 'Your email is already verified.', code: 'ALREADY_VERIFIED' })
    }
    const url = await sendVerification({ id: req.user!.id, email: req.user!.email, name: req.user!.name })
    res.json({ message: 'Verification email sent.', ...(env.isProd ? {} : { devVerificationUrl: url }) })
  } catch (error) {
    next(error)
  }
})

router.post('/forgot-password', async (req, res, next) => {
  try {
    const body = parseBody(forgotSchema, req, res)
    if (!body) return
    const db = getDb()
    const user = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(body.email) as
      | Record<string, unknown>
      | undefined
    let devResetUrl: string | undefined
    if (user) {
      // Invalidate earlier unused reset tokens for this account.
      db.prepare('UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL').run(nowIso(), Number(user.id))
      const token = createToken()
      db.prepare(
        'INSERT INTO password_resets (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)',
      ).run(Number(user.id), token.hash, addDaysIso(1 / 24), nowIso())
      const url = resetUrl(token.raw)
      const message = resetEmail(String(user.name), url)
      await sendMail({ ...message, to: String(user.email) })
      if (!env.isProd) devResetUrl = url
    }
    res.json({
      message: 'If an account exists for that email, a reset link is on its way.',
      ...(devResetUrl ? { devResetUrl } : {}),
    })
  } catch (error) {
    next(error)
  }
})

router.post('/reset-password', async (req, res, next) => {
  try {
    const body = parseBody(resetSchema, req, res)
    if (!body) return
    const db = getDb()
    const row = db
      .prepare(
        `SELECT pr.id AS reset_id, pr.user_id, pr.expires_at FROM password_resets pr
         WHERE pr.token_hash = ? AND pr.used_at IS NULL`,
      )
      .get(hashToken(body.token)) as Record<string, unknown> | undefined
    if (!row) return res.status(400).json({ error: 'This reset link is invalid or has already been used.', code: 'TOKEN_INVALID' })
    if (new Date(String(row.expires_at)).getTime() < Date.now()) {
      return res.status(400).json({ error: 'This reset link has expired. Request a new one.', code: 'TOKEN_EXPIRED' })
    }
    const passwordHash = await hashPassword(body.password)
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(passwordHash, nowIso(), Number(row.user_id))
    db.prepare('UPDATE password_resets SET used_at = ? WHERE id = ?').run(nowIso(), Number(row.reset_id))
    revokeAllSessions(Number(row.user_id))
    res.json({ message: 'Your password has been updated. Sign in with your new password.' })
  } catch (error) {
    next(error)
  }
})

router.patch('/account', requireAuth, async (req, res, next) => {
  try {
    const body = parseBody(accountSchema, req, res)
    if (!body) return
    const db = getDb()
    const current = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as Record<string, unknown>
    let emailVerification: string | undefined
    let changedEmail = false
    if (body.email && body.email !== String(current.email)) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(body.email, req.user!.id)
      if (existing) return res.status(409).json({ error: 'That email is already in use.', code: 'EMAIL_EXISTS' })
      changedEmail = true
    }
    db.prepare('UPDATE users SET name = ?, email = ?, email_verified = ?, theme = ?, updated_at = ? WHERE id = ?').run(
      body.name ?? String(current.name),
      body.email ?? String(current.email),
      changedEmail ? 0 : Number(current.email_verified),
      body.theme ?? String(current.theme),
      nowIso(),
      req.user!.id,
    )
    if (changedEmail) {
      emailVerification = await sendVerification({ id: req.user!.id, email: body.email!, name: body.name ?? String(current.name) })
    }
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as Record<string, unknown>
    res.json({
      user: publicUser(row),
      ...(emailVerification && !env.isProd ? { devVerificationUrl: emailVerification } : {}),
      ...(changedEmail ? { message: 'Email updated. Verify the new address to finish.' } : {}),
    })
  } catch (error) {
    next(error)
  }
})

router.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const body = parseBody(changePasswordSchema, req, res)
    if (!body) return
    const db = getDb()
    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.id) as Record<string, unknown>
    if (!(await verifyPassword(body.currentPassword, String(row.password_hash)))) {
      return res.status(400).json({ error: 'Your current password is incorrect.', code: 'INVALID_PASSWORD' })
    }
    const hash = await hashPassword(body.newPassword)
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(hash, nowIso(), req.user!.id)
    revokeAllSessions(req.user!.id, req.sessionId)
    res.json({ message: 'Password updated. Other sessions have been signed out.' })
  } catch (error) {
    next(error)
  }
})

router.delete('/account', requireAuth, async (req, res, next) => {
  try {
    const body = parseBody(deleteAccountSchema, req, res)
    if (!body) return
    const db = getDb()
    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.id) as Record<string, unknown>
    if (!(await verifyPassword(body.password, String(row.password_hash)))) {
      return res.status(400).json({ error: 'Password is incorrect.', code: 'INVALID_PASSWORD' })
    }
    const profile = db.prepare('SELECT photo_url FROM profiles WHERE user_id = ?').get(req.user!.id) as
      | { photo_url?: string }
      | undefined
    db.prepare('DELETE FROM users WHERE id = ?').run(req.user!.id)
    // Cascade removes database rows; the one profile upload is a real file.
    const photo = profile?.photo_url || ''
    if (photo.startsWith('/uploads/')) {
      const name = photo.slice('/uploads/'.length)
      if (/^[a-f0-9]{24}\.(png|jpg|jpeg|webp)$/i.test(name)) {
        await unlink(join(process.cwd(), env.uploadsDir, name)).catch(() => undefined)
      }
    }
    clearSessionCookie(res)
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})

export default router
