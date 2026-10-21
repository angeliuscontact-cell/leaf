import { Router } from 'express'
import { getDb, nowIso } from '../db'
import { env } from '../env'
import { requireAuth } from '../auth'
import { parseBody, parseId, renameSchema } from '../validation'
import { coverLetterDataSchema, coverLetterSettingsSchema, createLetterSchema, updateLetterSchema } from '../validation'
import { mapLetter } from '../mappers'
import { emptyCoverLetterData } from '../../shared/defaults'
import { photoDataUri } from '../photo'
import { htmlToPdf, slugify } from '../pdf'
import { renderCoverLetterDocument } from '../../shared/renderDocument'
import { logActivity } from '../activity'

const router = Router()

function findLetter(id: number, userId: number) {
  const row = getDb().prepare('SELECT * FROM cover_letters WHERE id=? AND user_id=?').get(id, userId) as Record<string, unknown> | undefined
  return row ? mapLetter(row) : null
}

function snapshotVersion(userId: number, id: number, letter: ReturnType<typeof mapLetter>) {
  const db = getDb()
  const last = db
    .prepare("SELECT created_at FROM document_versions WHERE user_id=? AND doc_type='cover_letter' AND doc_id=? ORDER BY created_at DESC LIMIT 1")
    .get(userId, id) as { created_at?: string } | undefined
  if (last?.created_at && Date.now() - new Date(last.created_at).getTime() < 20 * 60 * 1000) return
  db.prepare('INSERT INTO document_versions (user_id, doc_type, doc_id, data_json, title, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    userId,
    'cover_letter',
    id,
    JSON.stringify({ data: letter.data, settings: letter.settings }),
    letter.title,
    nowIso(),
  )
  const old = db
    .prepare("SELECT id FROM document_versions WHERE user_id=? AND doc_type='cover_letter' AND doc_id=? ORDER BY created_at DESC LIMIT 20 OFFSET 20")
    .all(userId, id) as Array<{ id: number }>
  for (const row of old) db.prepare('DELETE FROM document_versions WHERE id=?').run(row.id)
}

router.get('/', requireAuth, (req, res) => {
  const rows = getDb()
    .prepare('SELECT * FROM cover_letters WHERE user_id=? ORDER BY updated_at DESC')
    .all(req.user!.id) as Array<Record<string, unknown>>
  res.json({ letters: rows.map(mapLetter) })
})

router.post('/', requireAuth, (req, res) => {
  const body = parseBody(createLetterSchema, req, res)
  if (!body) return
  const db = getDb()
  const data = coverLetterDataSchema.parse(body.data ?? emptyCoverLetterData())
  const settings = coverLetterSettingsSchema.parse({ ...(body.settings || {}), template: body.template })
  const now = nowIso()
  const title = body.title === 'Untitled cover letter' && data.company ? `Cover letter — ${data.company}` : body.title
  const result = db.prepare(
    `INSERT INTO cover_letters (user_id, title, template, primary_color, secondary_color, accent_color, font, data_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(req.user!.id, title, settings.template, settings.primaryColor, settings.secondaryColor, settings.accentColor, settings.font, JSON.stringify(data), now, now)
  const id = Number(result.lastInsertRowid)
  const letter = findLetter(id, req.user!.id)!
  snapshotVersion(req.user!.id, id, letter)
  logActivity(req.user!.id, 'letter_created', `Created “${title}”`, 'letter', id)
  res.status(201).json({ letter })
})

router.get('/:id', requireAuth, (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Invalid cover letter id.', code: 'BAD_ID' })
  const letter = findLetter(id, req.user!.id)
  if (!letter) return res.status(404).json({ error: 'Cover letter not found.', code: 'NOT_FOUND' })
  res.json({ letter })
})

router.put('/:id', requireAuth, (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Invalid cover letter id.', code: 'BAD_ID' })
  const body = parseBody(updateLetterSchema, req, res)
  if (!body) return
  const current = findLetter(id, req.user!.id)
  if (!current) return res.status(404).json({ error: 'Cover letter not found.', code: 'NOT_FOUND' })
  const data = body.data ?? current.data
  const settings = body.settings ?? current.settings
  const title = body.title ?? current.title
  getDb().prepare(
    `UPDATE cover_letters SET title=?, template=?, primary_color=?, secondary_color=?, accent_color=?, font=?, data_json=?, updated_at=? WHERE id=? AND user_id=?`,
  ).run(title, settings.template, settings.primaryColor, settings.secondaryColor, settings.accentColor, settings.font, JSON.stringify(data), nowIso(), id, req.user!.id)
  const letter = findLetter(id, req.user!.id)!
  snapshotVersion(req.user!.id, id, letter)
  res.json({ letter })
})

router.patch('/:id', requireAuth, (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Invalid cover letter id.', code: 'BAD_ID' })
  const body = parseBody(renameSchema, req, res)
  if (!body) return
  if (!findLetter(id, req.user!.id)) return res.status(404).json({ error: 'Cover letter not found.', code: 'NOT_FOUND' })
  getDb().prepare('UPDATE cover_letters SET title=?, updated_at=? WHERE id=? AND user_id=?').run(body.title, nowIso(), id, req.user!.id)
  res.json({ letter: findLetter(id, req.user!.id) })
})

router.post('/:id/duplicate', requireAuth, (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Invalid cover letter id.', code: 'BAD_ID' })
  const current = findLetter(id, req.user!.id)
  if (!current) return res.status(404).json({ error: 'Cover letter not found.', code: 'NOT_FOUND' })
  const db = getDb()
  const now = nowIso()
  const result = db.prepare(
    `INSERT INTO cover_letters (user_id, title, template, primary_color, secondary_color, accent_color, font, data_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(req.user!.id, `${current.title} copy`.slice(0, 120), current.settings.template, current.settings.primaryColor, current.settings.secondaryColor, current.settings.accentColor, current.settings.font, JSON.stringify(current.data), now, now)
  res.status(201).json({ letter: findLetter(Number(result.lastInsertRowid), req.user!.id) })
})

router.delete('/:id', requireAuth, (req, res) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Invalid cover letter id.', code: 'BAD_ID' })
  if (!findLetter(id, req.user!.id)) return res.status(404).json({ error: 'Cover letter not found.', code: 'NOT_FOUND' })
  const db = getDb()
  db.prepare('DELETE FROM cover_letters WHERE id=? AND user_id=?').run(id, req.user!.id)
  db.prepare("DELETE FROM document_versions WHERE user_id=? AND doc_type='cover_letter' AND doc_id=?").run(req.user!.id, id)
  db.prepare("DELETE FROM ai_reviews WHERE user_id=? AND doc_type='cover_letter' AND doc_id=?").run(req.user!.id, id)
  res.status(204).end()
})

router.get('/:id/pdf', requireAuth, async (req, res, next) => {
  try {
    const id = parseId(req.params.id)
    if (!id) return res.status(400).json({ error: 'Invalid cover letter id.', code: 'BAD_ID' })
    const letter = findLetter(id, req.user!.id)
    if (!letter) return res.status(404).json({ error: 'Cover letter not found.', code: 'NOT_FOUND' })
    const photo = await photoDataUri(letter.data.sender.photoUrl)
    const html = renderCoverLetterDocument(letter, { baseUrl: env.publicUrl, preview: false, photoSrc: photo })
    const pdf = await htmlToPdf(html)
    const filename = `${slugify(letter.data.company || letter.title, 'cover-letter')}-leaf-letter.pdf`
    logActivity(req.user!.id, 'letter_downloaded', `Downloaded “${letter.title}” as PDF`, 'letter', id)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `${req.query.inline === '1' ? 'inline' : 'attachment'}; filename="${filename}"`)
    res.setHeader('Cache-Control', 'no-store')
    res.send(pdf)
  } catch (error) {
    next(error)
  }
})

export default router
