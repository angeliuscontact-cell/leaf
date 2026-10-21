import { Router } from 'express'
import { randomBytes } from 'node:crypto'
import { getDb, nowIso } from '../db'
import { env } from '../env'
import { requireAuth } from '../auth'
import { parseBody, parseId, createLandingSchema, landingDataSchema, landingSettingsSchema, publishSchema, updateLandingSchema } from '../validation'
import { mapLanding } from '../mappers'
import { emptyLandingData } from '../../shared/defaults'
import { logActivity } from '../activity'

const router = Router()

function baseSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'profile'
  )
}

function uniqueSlug(value: string, excludeId?: number): string {
  const db = getDb()
  const base = baseSlug(value)
  let candidate = base
  let suffix = 2
  while (true) {
    const row = db.prepare('SELECT id FROM landing_pages WHERE slug=?').get(candidate) as { id: number } | undefined
    if (!row || Number(row.id) === excludeId) return candidate
    candidate = `${base}-${suffix++}`
    if (suffix > 500) return `${base}-${randomBytes(3).toString('hex')}`
  }
}

function findLanding(id: number, userId: number) {
  const row = getDb().prepare('SELECT * FROM landing_pages WHERE id=? AND user_id=?').get(id, userId) as Record<string, unknown> | undefined
  return row ? mapLanding(row) : null
}

function publicUrl(slug: string) {
  return `${env.publicUrl}/p/${slug}`
}

router.get('/', requireAuth, (req, res) => {
  const rows = getDb()
    .prepare('SELECT * FROM landing_pages WHERE user_id=? ORDER BY updated_at DESC')
    .all(req.user!.id) as Array<Record<string, unknown>>
  res.json({ pages: rows.map((row) => ({ ...mapLanding(row), publicUrl: publicUrl(String(row.slug)) })) })
})

router.post('/', requireAuth, (req, res) => {
  const body = parseBody(createLandingSchema, req, res)
  if (!body) return
  const db = getDb()
  const data = landingDataSchema.parse(body.data ?? emptyLandingData())
  const settings = landingSettingsSchema.parse({ ...(body.settings || {}), template: body.template })
  const now = nowIso()
  const slug = uniqueSlug(body.title)
  const title = body.title === 'My professional page' && data.hero.headline ? `${data.hero.headline} — profile` : body.title
  const result = db.prepare(
    `INSERT INTO landing_pages (user_id, title, slug, template, primary_color, secondary_color, accent_color, font, published, data_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
  ).run(req.user!.id, title, slug, settings.template, settings.primaryColor, settings.secondaryColor, settings.accentColor, settings.font, JSON.stringify(data), now, now)
  const id = Number(result.lastInsertRowid)
  logActivity(req.user!.id, 'landing_created', `Created “${title}”`, 'landing', id)
  res.status(201).json({ page: findLanding(id, req.user!.id), publicUrl: publicUrl(slug) })
})

router.get('/:id', requireAuth, (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Invalid page id.', code: 'BAD_ID' })
  const page = findLanding(id, req.user!.id)
  if (!page) return res.status(404).json({ error: 'Landing page not found.', code: 'NOT_FOUND' })
  res.json({ page, publicUrl: publicUrl(page.slug) })
})

router.put('/:id', requireAuth, (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Invalid page id.', code: 'BAD_ID' })
  const body = parseBody(updateLandingSchema, req, res)
  if (!body) return
  const current = findLanding(id, req.user!.id)
  if (!current) return res.status(404).json({ error: 'Landing page not found.', code: 'NOT_FOUND' })
  const db = getDb()
  let slug = current.slug
  if (body.slug && body.slug !== current.slug) {
    const existing = db.prepare('SELECT id FROM landing_pages WHERE slug=? AND id!=?').get(body.slug, id)
    if (existing) return res.status(409).json({ error: 'That web address is already in use. Choose another.', code: 'SLUG_TAKEN' })
    slug = body.slug
  }
  const data = body.data ?? current.data
  const settings = body.settings ?? { template: current.template, primaryColor: current.primaryColor, secondaryColor: current.secondaryColor, accentColor: current.accentColor, font: current.font }
  const title = body.title ?? current.title
  db.prepare(
    `UPDATE landing_pages SET title=?, slug=?, template=?, primary_color=?, secondary_color=?, accent_color=?, font=?, data_json=?, updated_at=? WHERE id=? AND user_id=?`,
  ).run(title, slug, settings.template, settings.primaryColor, settings.secondaryColor, settings.accentColor, settings.font, JSON.stringify(data), nowIso(), id, req.user!.id)
  res.json({ page: findLanding(id, req.user!.id), publicUrl: publicUrl(slug) })
})

router.post('/:id/publish', requireAuth, (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Invalid page id.', code: 'BAD_ID' })
  const body = parseBody(publishSchema, req, res)
  if (!body) return
  const current = findLanding(id, req.user!.id)
  if (!current) return res.status(404).json({ error: 'Landing page not found.', code: 'NOT_FOUND' })
  const db = getDb()
  const publishedAt = body.published ? nowIso() : current.publishedAt
  db.prepare('UPDATE landing_pages SET published=?, published_at=?, updated_at=? WHERE id=? AND user_id=?').run(
    body.published ? 1 : 0,
    publishedAt,
    nowIso(),
    id,
    req.user!.id,
  )
  logActivity(
    req.user!.id,
    body.published ? 'landing_published' : 'landing_unpublished',
    body.published ? `Published “${current.title}”` : `Unpublished “${current.title}”`,
    'landing',
    id,
  )
  res.json({ page: findLanding(id, req.user!.id), publicUrl: publicUrl(current.slug) })
})

router.delete('/:id', requireAuth, (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Invalid page id.', code: 'BAD_ID' })
  if (!findLanding(id, req.user!.id)) return res.status(404).json({ error: 'Landing page not found.', code: 'NOT_FOUND' })
  const db = getDb()
  db.prepare('DELETE FROM landing_pages WHERE id=? AND user_id=?').run(id, req.user!.id)
  db.prepare("DELETE FROM document_versions WHERE user_id=? AND doc_type='landing' AND doc_id=?").run(req.user!.id, id)
  db.prepare("DELETE FROM ai_reviews WHERE user_id=? AND doc_type='landing' AND doc_id=?").run(req.user!.id, id)
  res.status(204).end()
})

export default router
