import express, { type NextFunction, type Request, type Response } from 'express'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import multer from 'multer'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { env } from './env'
import { attachUser, requireRequestedWith } from './auth'
import { getDb } from './db'
import authRoutes from './routes/auth'
import profileRoutes from './routes/profile'
import cvRoutes from './routes/cvs'
import letterRoutes from './routes/letters'
import landingRoutes from './routes/landings'
import aiRoutes from './routes/ai'
import publicRoutes from './routes/public'
import dashboardRoutes from './routes/dashboard'
import { AIUnavailableError } from './ai'
import { PdfUnavailableError } from './pdf'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', env.trustProxy)

  app.use(
    helmet({
      contentSecurityPolicy: env.isProd
        ? {
            useDefaults: true,
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'blob:'],
              fontSrc: ["'self'", 'data:'],
              connectSrc: ["'self'"],
              frameSrc: ["'self'", 'blob:'],
              objectSrc: ["'none'"],
              baseUri: ["'self'"],
              formAction: ["'self'"],
              frameAncestors: ["'self'"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-origin' },
      hsts: env.enableHsts ? { maxAge: 15552000, includeSubDomains: true } : false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  )
  app.use(express.json({ limit: '2mb' }))
  app.use(express.urlencoded({ extended: false, limit: '100kb' }))
  app.use(cookieParser())
  app.use(attachUser)
  app.use('/api', requireRequestedWith)

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: env.isTest ? 5000 : 600,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests. Please wait a moment and try again.', code: 'RATE_LIMITED' },
  })
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: env.isTest ? 500 : 25,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    message: { error: 'Too many attempts. Please wait 15 minutes and try again.', code: 'AUTH_RATE_LIMITED' },
  })
  const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: env.isTest ? 500 : 15,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'The AI assistant is receiving requests too quickly. Wait a minute and try again.', code: 'AI_RATE_LIMITED' },
  })
  const publicPdfLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: env.isTest ? 500 : 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many downloads. Try again shortly.', code: 'RATE_LIMITED' },
  })

  app.use('/api', apiLimiter)
  app.use(['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/reset-password'], authLimiter)
  app.use('/api/ai', aiLimiter)
  app.use('/api/public/cvs/:shareId/pdf', publicPdfLimiter)

  app.get('/api/health', (_req, res) => {
    try {
      getDb().prepare('SELECT 1').get()
      res.json({ ok: true, service: 'leaf', storage: 'ok', ai: env.ai.apiKey ? 'configured' : 'not-configured' })
    } catch {
      res.status(503).json({ ok: false, service: 'leaf', storage: 'unavailable' })
    }
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/profile', profileRoutes)
  app.use('/api/cvs', cvRoutes)
  app.use('/api/cover-letters', letterRoutes)
  app.use('/api/landing-pages', landingRoutes)
  app.use('/api/ai', aiRoutes)
  app.use('/api/public', publicRoutes)
  app.use('/api/dashboard', dashboardRoutes)

  if (env.isProd || existsSync(join(process.cwd(), 'dist'))) {
    app.use('/uploads', express.static(join(process.cwd(), env.uploadsDir), { maxAge: '7d', fallthrough: true }))
    app.use('/fonts', express.static(join(process.cwd(), 'public', 'fonts'), { maxAge: '30d', immutable: true }))
    app.use(express.static(join(process.cwd(), 'dist'), { maxAge: '1h', index: false }))
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next()
      res.sendFile(join(process.cwd(), 'dist', 'index.html'))
    })
  } else {
    app.use('/uploads', express.static(join(process.cwd(), env.uploadsDir), { maxAge: '7d', fallthrough: true }))
    app.use('/fonts', express.static(join(process.cwd(), 'public', 'fonts'), { maxAge: '30d', immutable: true }))
  }

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found.', code: 'NOT_FOUND' })
  })

  app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof AIUnavailableError) {
      return res.status(error.status).json({ error: error.message, code: error.code })
    }
    if (error instanceof PdfUnavailableError) {
      console.error('[pdf]', error.message)
      return res.status(503).json({
        error: 'PDF rendering is unavailable right now. Your document is saved — try again later or contact the administrator.',
        code: 'PDF_UNAVAILABLE',
      })
    }
    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE' ? 'That image is too large. Use an image under 3 MB.' : 'The upload could not be completed.'
      return res.status(413).json({ error: message, code: error.code })
    }
    if (error instanceof SyntaxError && 'body' in error) {
      return res.status(400).json({ error: 'The request body is not valid JSON.', code: 'BAD_JSON' })
    }
    if (error instanceof Error && /Only PNG|PNG, JPEG|valid PNG|Use a PNG/.test(error.message)) {
      return res.status(400).json({ error: error.message, code: 'BAD_IMAGE' })
    }
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'That value is already in use.', code: 'CONFLICT' })
    }
    console.error(`[error] ${req.method} ${req.path}`, error)
    res.status(500).json({
      error: env.isProd ? 'Something went wrong on our side. Your saved documents are safe.' : `Server error: ${error instanceof Error ? error.message : 'unknown'}`,
      code: 'INTERNAL',
    })
  })

  return app
}
