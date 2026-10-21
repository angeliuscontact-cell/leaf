import { Router } from 'express'
import { randomBytes } from 'node:crypto'
import QRCode from 'qrcode'
import { addDaysIso, getDb, nowIso } from '../db'
import { env } from '../env'
import { requireAuth } from '../auth'
import { createCvSchema, parseBody, parseId, renameSchema, shareSchema, updateCvSchema } from '../validation'
import { mapCv, shareIsLive } from '../mappers'
import { emptyCVData } from '../../shared/defaults'
import { cvTitle } from '../../shared/defaults'
import { photoDataUri } from '../photo'
import { htmlToPdf, slugify } from '../pdf'
import { renderCVDocument } from '../../shared/renderDocument'
import { logActivity } from '../activity'
import type { CVData } from '../../shared/types'

const router = Router()

function findCv(id: number, userId: number) {
  const row = getDb().prepare('SELECT * FROM cvs WHERE id = ? AND user_id = ?').get(id, userId) as Record<string, unknown> | undefined
  return row ? mapCv(row) : null
}

function shareUrl(shareId: string) {
  return `${env.publicUrl}/cv/${shareId}`
}

function newShareId(): string {
  const db = getDb()
  for (let i = 0; i < 8; i++) {
    const candidate = randomBytes(12).toString('base64url')
    if (!db.prepare('SELECT id FROM cvs WHERE share_id = ?').get(candidate)) return candidate
  }
  throw new Error('Could not allocate a share identifier')
}

function snapshotVersion(userId: number, docId: number, doc: ReturnType<typeof mapCv>, force = false) {
  const db = getDb()
  const last = db
    .prepare("SELECT created_at FROM document_versions WHERE user_id=? AND doc_type='cv' AND doc_id=? ORDER BY created_at DESC LIMIT 1")
    .get(userId, docId) as { created_at?: string } | undefined
  if (!force && last?.created_at && Date.now() - new Date(last.created_at).getTime() < 20 * 60 * 1000) return
  db.prepare('INSERT INTO document_versions (user_id, doc_type, doc_id, data_json, title, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    userId,
    'cv',
    docId,
    JSON.stringify({ data: doc.data, settings: doc.settings }),
    doc.title,
    nowIso(),
  )
  const keep = db
    .prepare("SELECT id FROM document_versions WHERE user_id=? AND doc_type='cv' AND doc_id=? ORDER BY created_at DESC LIMIT 20 OFFSET 20")
    .all(userId, docId) as Array<{ id: number }>
  for (const row of keep) db.prepare('DELETE FROM document_versions WHERE id=?').run(row.id)
}

router.get('/', requireAuth, (req, res) => {
  const rows = getDb()
    .prepare('SELECT * FROM cvs WHERE user_id = ? ORDER BY updated_at DESC')
    .all(req.user!.id) as Array<Record<string, unknown>>
  res.json({ cvs: rows.map(mapCv) })
})

router.post('/', requireAuth, (req, res) => {
  const body = parseBody(createCvSchema, req, res)
  if (!body) return
  const db = getDb()
  const now = nowIso()
  // Zod has already validated and clamped every field; the output type widens
  // skill levels to `number`, so narrow once at the persistence boundary.
  const data = (body.data ?? emptyCVData()) as CVData
  const settings = {
    template: body.template,
    primaryColor: '#1677ff',
    secondaryColor: '#0f3b66',
    accentColor: '#13c2c2',
    font: 'sans' as const,
    density: 'comfortable' as const,
    showPhoto: false,
    ...(body.settings || {}),
  }
  const title = body.title === 'Untitled CV' ? cvTitle(data) : body.title
  const result = db.prepare(
    `INSERT INTO cvs (user_id, title, template, primary_color, secondary_color, accent_color, font, density, show_photo, data_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    req.user!.id,
    title,
    settings.template,
    settings.primaryColor,
    settings.secondaryColor,
    settings.accentColor,
    settings.font,
    settings.density,
    settings.showPhoto ? 1 : 0,
    JSON.stringify(data),
    now,
    now,
  )
  const id = Number(result.lastInsertRowid)
  const doc = findCv(id, req.user!.id)!
  snapshotVersion(req.user!.id, id, doc, true)
  logActivity(req.user!.id, 'cv_created', `Created “${title}”`, 'cv', id)
  res.status(201).json({ cv: doc, shareUrl: null })
})

router.get('/:id', requireAuth, (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Invalid CV id.', code: 'BAD_ID' })
  const doc = findCv(id, req.user!.id)
  if (!doc) return res.status(404).json({ error: 'CV not found.', code: 'NOT_FOUND' })
  res.json({ cv: doc, shareUrl: doc.shareId && doc.shareEnabled ? shareUrl(doc.shareId) : null })
})

router.put('/:id', requireAuth, (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Invalid CV id.', code: 'BAD_ID' })
  const body = parseBody(updateCvSchema, req, res)
  if (!body) return
  const db = getDb()
  const current = findCv(id, req.user!.id)
  if (!current) return res.status(404).json({ error: 'CV not found.', code: 'NOT_FOUND' })
  const data = body.data ?? current.data
  const settings = body.settings ?? current.settings
  const title = body.title ?? current.title
  db.prepare(
    `UPDATE cvs SET title=?, template=?, primary_color=?, secondary_color=?, accent_color=?, font=?, density=?, show_photo=?, data_json=?, updated_at=? WHERE id=? AND user_id=?`,
  ).run(
    title,
    settings.template,
    settings.primaryColor,
    settings.secondaryColor,
    settings.accentColor,
    settings.font,
    settings.density,
    settings.showPhoto ? 1 : 0,
    JSON.stringify(data),
    nowIso(),
    id,
    req.user!.id,
  )
  const doc = findCv(id, req.user!.id)!
  snapshotVersion(req.user!.id, id, doc)
  res.json({ cv: doc, shareUrl: doc.shareId && doc.shareEnabled ? shareUrl(doc.shareId) : null })
})

router.patch('/:id', requireAuth, (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Invalid CV id.', code: 'BAD_ID' })
  const body = parseBody(renameSchema, req, res)
  if (!body) return
  const current = findCv(id, req.user!.id)
  if (!current) return res.status(404).json({ error: 'CV not found.', code: 'NOT_FOUND' })
  getDb().prepare('UPDATE cvs SET title=?, updated_at=? WHERE id=? AND user_id=?').run(body.title, nowIso(), id, req.user!.id)
  res.json({ cv: findCv(id, req.user!.id) })
})

router.post('/:id/duplicate', requireAuth, (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Invalid CV id.', code: 'BAD_ID' })
  const current = findCv(id, req.user!.id)
  if (!current) return res.status(404).json({ error: 'CV not found.', code: 'NOT_FOUND' })
  const db = getDb()
  const now = nowIso()
  const title = `${current.title} copy`.slice(0, 120)
  const result = db.prepare(
    `INSERT INTO cvs (user_id, title, template, primary_color, secondary_color, accent_color, font, density, show_photo, data_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    req.user!.id,
    title,
    current.settings.template,
    current.settings.primaryColor,
    current.settings.secondaryColor,
    current.settings.accentColor,
    current.settings.font,
    current.settings.density,
    current.settings.showPhoto ? 1 : 0,
    JSON.stringify(current.data),
    now,
    now,
  )
  const newId = Number(result.lastInsertRowid)
  logActivity(req.user!.id, 'cv_created', `Duplicated “${current.title}”`, 'cv', newId)
  res.status(201).json({ cv: findCv(newId, req.user!.id) })
})

router.delete('/:id', requireAuth, (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Invalid CV id.', code: 'BAD_ID' })
  const current = findCv(id, req.user!.id)
  if (!current) return res.status(404).json({ error: 'CV not found.', code: 'NOT_FOUND' })
  const db = getDb()
  db.prepare('DELETE FROM cvs WHERE id=? AND user_id=?').run(id, req.user!.id)
  db.prepare("DELETE FROM document_versions WHERE user_id=? AND doc_type='cv' AND doc_id=?").run(req.user!.id, id)
  db.prepare("DELETE FROM ai_reviews WHERE user_id=? AND doc_type='cv' AND doc_id=?").run(req.user!.id, id)
  res.status(204).end()
})

router.post('/:id/share', requireAuth, (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Invalid CV id.', code: 'BAD_ID' })
  const body = parseBody(shareSchema, req, res)
  if (!body) return
  const current = findCv(id, req.user!.id)
  if (!current) return res.status(404).json({ error: 'CV not found.', code: 'NOT_FOUND' })
  const db = getDb()
  let shareId: string | null = null
  if (body.enabled) {
    shareId = current.shareId && current.shareEnabled ? current.shareId : newShareId()
    const expires =
      body.expiresInDays === null ? null : body.expiresInDays ? addDaysIso(body.expiresInDays) : current.shareExpiresAt
    db.prepare('UPDATE cvs SET share_id=?, share_enabled=1, share_expires_at=?, updated_at=? WHERE id=? AND user_id=?').run(
      shareId,
      expires,
      nowIso(),
      id,
      req.user!.id,
    )
    logActivity(req.user!.id, 'cv_shared', `Shared “${current.title}” with a link`, 'cv', id)
  } else {
    db.prepare('UPDATE cvs SET share_enabled=0, share_id=NULL, share_expires_at=NULL, updated_at=? WHERE id=? AND user_id=?').run(
      nowIso(),
      id,
      req.user!.id,
    )
    logActivity(req.user!.id, 'cv_unshared', `Revoked the share link for “${current.title}”`, 'cv', id)
  }
  res.json({
    cv: findCv(id, req.user!.id),
    shareUrl: shareId ? shareUrl(shareId) : null,
  })
})

router.get('/:id/qr', requireAuth, async (req, res, next) => {
  try {
    const id = parseId(req.params.id)
    if (!id) return res.status(400).json({ error: 'Invalid CV id.', code: 'BAD_ID' })
    const db = getDb()
    const row = db.prepare('SELECT * FROM cvs WHERE id=? AND user_id=?').get(id, req.user!.id) as Record<string, unknown> | undefined
    if (!row) return res.status(404).json({ error: 'CV not found.', code: 'NOT_FOUND' })
    if (!shareIsLive(row)) return res.status(400).json({ error: 'Enable sharing to generate a QR code.', code: 'NOT_SHARED' })
    const url = shareUrl(String(row.share_id))
    const png = await QRCode.toBuffer(url, {
      type: 'png',
      width: 600,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f1b2dff', light: '#ffffffff' },
    })
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'no-store')
    res.send(png)
  } catch (error) {
    next(error)
  }
})

router.get('/:id/pdf', requireAuth, async (req, res, next) => {
  try {
    const id = parseId(req.params.id)
    if (!id) return res.status(400).json({ error: 'Invalid CV id.', code: 'BAD_ID' })
    const doc = findCv(id, req.user!.id)
    if (!doc) return res.status(404).json({ error: 'CV not found.', code: 'NOT_FOUND' })
    const photo = await photoDataUri(doc.data.personal.photoUrl)
    const html = renderCVDocument(doc, { baseUrl: env.publicUrl, preview: false, photoSrc: photo })
    const pdf = await htmlToPdf(html)
    const filename = `${slugify(doc.data.personal.fullName || doc.title, 'cv')}-leaf-cv.pdf`
    logActivity(req.user!.id, 'cv_downloaded', `Downloaded “${doc.title}” as PDF`, 'cv', id)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `${req.query.inline === '1' ? 'inline' : 'attachment'}; filename="${filename}"`)
    res.setHeader('Cache-Control', 'no-store')
    res.send(pdf)
  } catch (error) {
    next(error)
  }
})

router.get('/:id/versions', requireAuth, (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Invalid CV id.', code: 'BAD_ID' })
  const current = findCv(id, req.user!.id)
  if (!current) return res.status(404).json({ error: 'CV not found.', code: 'NOT_FOUND' })
  const rows = getDb()
    .prepare("SELECT id, title, created_at FROM document_versions WHERE user_id=? AND doc_type='cv' AND doc_id=? ORDER BY created_at DESC LIMIT 20")
    .all(req.user!.id, id)
    .map((row) => {
      const r = row as Record<string, unknown>
      return { id: Number(r.id), title: String(r.title), createdAt: String(r.created_at) }
    })
  res.json({ versions: rows })
})

router.post('/:id/versions/:versionId/restore', requireAuth, (req, res) => {
  const id = parseId(req.params.id)
  const versionId = parseId(req.params.versionId)
  if (!id || !versionId) return res.status(400).json({ error: 'Invalid version.', code: 'BAD_ID' })
  const db = getDb()
  const current = findCv(id, req.user!.id)
  if (!current) return res.status(404).json({ error: 'CV not found.', code: 'NOT_FOUND' })
  const version = db
    .prepare("SELECT * FROM document_versions WHERE id=? AND user_id=? AND doc_type='cv' AND doc_id=?")
    .get(versionId, req.user!.id, id) as Record<string, unknown> | undefined
  if (!version) return res.status(404).json({ error: 'Version not found.', code: 'NOT_FOUND' })
  let payload: { data?: typeof current.data; settings?: typeof current.settings } = {}
  try {
    payload = JSON.parse(String(version.data_json))
  } catch {
    return res.status(400).json({ error: 'This version cannot be restored.', code: 'BAD_VERSION' })
  }
  const data = payload.data ?? current.data
  const settings = payload.settings ?? current.settings
  snapshotVersion(req.user!.id, id, current, true)
  db.prepare('UPDATE cvs SET data_json=?, template=?, primary_color=?, secondary_color=?, accent_color=?, font=?, density=?, show_photo=?, updated_at=? WHERE id=? AND user_id=?').run(
    JSON.stringify(data),
    settings.template,
    settings.primaryColor,
    settings.secondaryColor,
    settings.accentColor,
    settings.font,
    settings.density,
    settings.showPhoto ? 1 : 0,
    nowIso(),
    id,
    req.user!.id,
  )
  logActivity(req.user!.id, 'cv_restored', `Restored an earlier version of “${current.title}”`, 'cv', id)
  res.json({ cv: findCv(id, req.user!.id) })
})

export default router
