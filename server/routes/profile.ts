import { Router } from 'express'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import multer from 'multer'
import { z } from 'zod'
import { getDb, nowIso } from '../db'
import { env } from '../env'
import { requireAuth } from '../auth'
import type { Profile, ProfileOtherEntry } from '../../shared/types'
import { parseBody, moveSchema, profileSchema, experienceSchema, educationSchema, skillSchema, otherEntrySchemas, parseId } from '../validation'
import { logActivity } from '../activity'

const router = Router()

const OTHER_KINDS = ['languages', 'certifications', 'projects', 'achievements', 'interests', 'references'] as const
type OtherKind = (typeof OTHER_KINDS)[number]

function isOtherKind(value: string): value is OtherKind {
  return (OTHER_KINDS as readonly string[]).includes(value)
}

function ensureProfileRow(userId: number) {
  const db = getDb()
  const existing = db.prepare('SELECT user_id FROM profiles WHERE user_id = ?').get(userId)
  if (!existing) {
    const user = db.prepare('SELECT name, email FROM users WHERE id = ?').get(userId) as Record<string, unknown> | undefined
    db.prepare('INSERT INTO profiles (user_id, full_name, email, updated_at) VALUES (?, ?, ?, ?)').run(
      userId,
      String(user?.name || ''),
      String(user?.email || ''),
      nowIso(),
    )
  }
}

export function getProfile(userId: number): Profile {
  ensureProfileRow(userId)
  const db = getDb()
  const p = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId) as Record<string, unknown>
  const experiences = db
    .prepare('SELECT * FROM profile_experiences WHERE user_id = ? ORDER BY sort_order, id')
    .all(userId)
    .map((row) => {
      const r = row as Record<string, unknown>
      return {
        id: Number(r.id),
        role: String(r.role),
        company: String(r.company),
        location: String(r.location),
        startDate: String(r.start_date),
        endDate: String(r.end_date),
        current: Number(r.current) === 1,
        description: String(r.description),
        sortOrder: Number(r.sort_order),
      }
    })
  const education = db
    .prepare('SELECT * FROM profile_education WHERE user_id = ? ORDER BY sort_order, id')
    .all(userId)
    .map((row) => {
      const r = row as Record<string, unknown>
      return {
        id: Number(r.id),
        institution: String(r.institution),
        degree: String(r.degree),
        field: String(r.field),
        location: String(r.location),
        startDate: String(r.start_date),
        endDate: String(r.end_date),
        details: String(r.details),
        sortOrder: Number(r.sort_order),
      }
    })
  const skills = db
    .prepare('SELECT * FROM profile_skills WHERE user_id = ? ORDER BY sort_order, id')
    .all(userId)
    .map((row) => {
      const r = row as Record<string, unknown>
      return { id: Number(r.id), name: String(r.name), level: Number(r.level) as 1 | 2 | 3 | 4 | 5, sortOrder: Number(r.sort_order) }
    })
  const other = db
    .prepare('SELECT * FROM profile_other_entries WHERE user_id = ? ORDER BY kind, sort_order, id')
    .all(userId)
    .map((row): ProfileOtherEntry => {
      const r = row as Record<string, unknown>
      let data: Record<string, string> = {}
      try {
        data = JSON.parse(String(r.data_json))
      } catch {
        data = {}
      }
      return {
        id: Number(r.id),
        kind: String(r.kind) as ProfileOtherEntry['kind'],
        data,
        sortOrder: Number(r.sort_order),
      }
    })

  return {
    fullName: String(p.full_name),
    title: String(p.title),
    email: String(p.email),
    phone: String(p.phone),
    city: String(p.city),
    country: String(p.country),
    website: String(p.website),
    linkedin: String(p.linkedin),
    github: String(p.github),
    summary: String(p.summary),
    photoUrl: String(p.photo_url),
    experiences,
    education,
    skills,
    other,
  }
}

router.get('/', requireAuth, (req, res) => {
  res.json({ profile: getProfile(req.user!.id) })
})

router.put('/', requireAuth, (req, res) => {
  const body = parseBody(profileSchema, req, res)
  if (!body) return
  const db = getDb()
  ensureProfileRow(req.user!.id)
  db.prepare(
    `UPDATE profiles SET full_name=?, title=?, email=?, phone=?, city=?, country=?, website=?, linkedin=?, github=?, summary=?, photo_url=?, updated_at=? WHERE user_id=?`,
  ).run(
    body.fullName,
    body.title,
    body.email,
    body.phone,
    body.city,
    body.country,
    body.website,
    body.linkedin,
    body.github,
    body.summary,
    body.photoUrl,
    nowIso(),
    req.user!.id,
  )
  if (body.fullName.trim()) {
    db.prepare('UPDATE users SET name = ?, updated_at = ? WHERE id = ?').run(body.fullName.trim(), nowIso(), req.user!.id)
  }
  logActivity(req.user!.id, 'profile', 'Updated professional profile', 'profile', req.user!.id)
  res.json({ profile: getProfile(req.user!.id) })
})

/* --------------------------------- items ---------------------------------- */

router.post('/items/:kind', requireAuth, (req, res) => {
  const kind = req.params.kind
  const db = getDb()
  ensureProfileRow(req.user!.id)
  const now = nowIso()
  const maxRow = (() => {
    if (kind === 'experience') return db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM profile_experiences WHERE user_id=?').get(req.user!.id)
    if (kind === 'education') return db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM profile_education WHERE user_id=?').get(req.user!.id)
    if (kind === 'skills') return db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM profile_skills WHERE user_id=?').get(req.user!.id)
    return db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM profile_other_entries WHERE user_id=? AND kind=?').get(req.user!.id, kind)
  })()
  const order = Number((maxRow as { m: number }).m) + 1

  if (kind === 'experience') {
    const body = parseBody(experienceSchema, req, res)
    if (!body) return
    const result = db.prepare(
      `INSERT INTO profile_experiences (user_id, role, company, location, start_date, end_date, current, description, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(req.user!.id, body.role, body.company, body.location, body.startDate, body.endDate, body.current ? 1 : 0, body.description, order, now, now)
    return res.status(201).json({ profile: getProfile(req.user!.id), itemId: Number(result.lastInsertRowid) })
  }
  if (kind === 'education') {
    const body = parseBody(educationSchema, req, res)
    if (!body) return
    const result = db.prepare(
      `INSERT INTO profile_education (user_id, institution, degree, field, location, start_date, end_date, details, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(req.user!.id, body.institution, body.degree, body.field, body.location, body.startDate, body.endDate, body.details, order, now, now)
    return res.status(201).json({ profile: getProfile(req.user!.id), itemId: Number(result.lastInsertRowid) })
  }
  if (kind === 'skills') {
    const body = parseBody(skillSchema, req, res)
    if (!body) return
    const result = db.prepare(
      'INSERT INTO profile_skills (user_id, name, level, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(req.user!.id, body.name, body.level, order, now, now)
    return res.status(201).json({ profile: getProfile(req.user!.id), itemId: Number(result.lastInsertRowid) })
  }
  if (!isOtherKind(kind)) return res.status(400).json({ error: 'Unknown profile section.', code: 'BAD_KIND' })
  const body = parseBody(otherEntrySchemas[kind] as z.ZodType<Record<string, unknown>>, req, res)
  if (!body) return
  const result = db.prepare(
    'INSERT INTO profile_other_entries (user_id, kind, data_json, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(req.user!.id, kind, JSON.stringify(body), order, now, now)
  res.status(201).json({ profile: getProfile(req.user!.id), itemId: Number(result.lastInsertRowid) })
})

router.patch('/items/:kind/:id', requireAuth, (req, res) => {
  const kind = req.params.kind
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Invalid entry id.', code: 'BAD_ID' })
  const db = getDb()
  const now = nowIso()

  if (kind === 'experience') {
    const current = db.prepare('SELECT * FROM profile_experiences WHERE id=? AND user_id=?').get(id, req.user!.id) as Record<string, unknown> | undefined
    if (!current) return res.status(404).json({ error: 'Entry not found.', code: 'NOT_FOUND' })
    const body = parseBody(
      experienceSchema,
      {
        ...req,
        body: {
          role: current.role,
          company: current.company,
          location: current.location,
          startDate: current.start_date,
          endDate: current.end_date,
          current: Number(current.current) === 1,
          description: current.description,
          ...req.body,
        },
      } as typeof req,
      res,
    )
    if (!body) return
    db.prepare('UPDATE profile_experiences SET role=?, company=?, location=?, start_date=?, end_date=?, current=?, description=?, updated_at=? WHERE id=? AND user_id=?').run(
      body.role, body.company, body.location, body.startDate, body.endDate, body.current ? 1 : 0, body.description, now, id, req.user!.id,
    )
    return res.json({ profile: getProfile(req.user!.id) })
  }
  if (kind === 'education') {
    const current = db.prepare('SELECT * FROM profile_education WHERE id=? AND user_id=?').get(id, req.user!.id) as Record<string, unknown> | undefined
    if (!current) return res.status(404).json({ error: 'Entry not found.', code: 'NOT_FOUND' })
    const body = parseBody(
      educationSchema,
      {
        ...req,
        body: {
          institution: current.institution,
          degree: current.degree,
          field: current.field,
          location: current.location,
          startDate: current.start_date,
          endDate: current.end_date,
          details: current.details,
          ...req.body,
        },
      } as typeof req,
      res,
    )
    if (!body) return
    db.prepare('UPDATE profile_education SET institution=?, degree=?, field=?, location=?, start_date=?, end_date=?, details=?, updated_at=? WHERE id=? AND user_id=?').run(
      body.institution, body.degree, body.field, body.location, body.startDate, body.endDate, body.details, now, id, req.user!.id,
    )
    return res.json({ profile: getProfile(req.user!.id) })
  }
  if (kind === 'skills') {
    const current = db.prepare('SELECT * FROM profile_skills WHERE id=? AND user_id=?').get(id, req.user!.id) as Record<string, unknown> | undefined
    if (!current) return res.status(404).json({ error: 'Skill not found.', code: 'NOT_FOUND' })
    const body = parseBody(skillSchema, { ...req, body: { name: current.name, level: current.level, ...req.body } } as typeof req, res)
    if (!body) return
    db.prepare('UPDATE profile_skills SET name=?, level=?, updated_at=? WHERE id=? AND user_id=?').run(body.name, body.level, now, id, req.user!.id)
    return res.json({ profile: getProfile(req.user!.id) })
  }
  if (!isOtherKind(kind)) return res.status(400).json({ error: 'Unknown profile section.', code: 'BAD_KIND' })
  const current = db.prepare('SELECT * FROM profile_other_entries WHERE id=? AND user_id=? AND kind=?').get(id, req.user!.id, kind) as Record<string, unknown> | undefined
  if (!current) return res.status(404).json({ error: 'Entry not found.', code: 'NOT_FOUND' })
  let existing: Record<string, unknown> = {}
  try {
    existing = JSON.parse(String(current.data_json))
  } catch {
    existing = {}
  }
  const body = parseBody(otherEntrySchemas[kind] as z.ZodType<Record<string, unknown>>, { ...req, body: { ...existing, ...req.body } } as typeof req, res)
  if (!body) return
  db.prepare('UPDATE profile_other_entries SET data_json=?, updated_at=? WHERE id=? AND user_id=?').run(JSON.stringify(body), now, id, req.user!.id)
  res.json({ profile: getProfile(req.user!.id) })
})

router.delete('/items/:kind/:id', requireAuth, (req, res) => {
  const kind = req.params.kind
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Invalid entry id.', code: 'BAD_ID' })
  const db = getDb()
  if (kind === 'experience') db.prepare('DELETE FROM profile_experiences WHERE id=? AND user_id=?').run(id, req.user!.id)
  else if (kind === 'education') db.prepare('DELETE FROM profile_education WHERE id=? AND user_id=?').run(id, req.user!.id)
  else if (kind === 'skills') db.prepare('DELETE FROM profile_skills WHERE id=? AND user_id=?').run(id, req.user!.id)
  else if (isOtherKind(kind)) db.prepare('DELETE FROM profile_other_entries WHERE id=? AND user_id=? AND kind=?').run(id, req.user!.id, kind)
  else return res.status(400).json({ error: 'Unknown profile section.', code: 'BAD_KIND' })
  res.json({ profile: getProfile(req.user!.id) })
})

router.post('/items/:kind/:id/move', requireAuth, (req, res) => {
  const kind = req.params.kind
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Invalid entry id.', code: 'BAD_ID' })
  const body = parseBody(moveSchema, req, res)
  if (!body) return
  const db = getDb()

  let rows: Array<{ id: number }> = []
  if (kind === 'experience') rows = db.prepare('SELECT id FROM profile_experiences WHERE user_id=? ORDER BY sort_order, id').all(req.user!.id) as Array<{ id: number }>
  else if (kind === 'education') rows = db.prepare('SELECT id FROM profile_education WHERE user_id=? ORDER BY sort_order, id').all(req.user!.id) as Array<{ id: number }>
  else if (kind === 'skills') rows = db.prepare('SELECT id FROM profile_skills WHERE user_id=? ORDER BY sort_order, id').all(req.user!.id) as Array<{ id: number }>
  else if (isOtherKind(kind)) rows = db.prepare('SELECT id FROM profile_other_entries WHERE user_id=? AND kind=? ORDER BY sort_order, id').all(req.user!.id, kind) as Array<{ id: number }>
  else return res.status(400).json({ error: 'Unknown profile section.', code: 'BAD_KIND' })

  const index = rows.findIndex((row) => Number(row.id) === id)
  const target = index + body.direction
  if (index < 0) return res.status(404).json({ error: 'Entry not found.', code: 'NOT_FOUND' })
  if (target < 0 || target >= rows.length) return res.json({ profile: getProfile(req.user!.id) })
  const reordered = [...rows]
  ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]

  db.exec('BEGIN')
  try {
    reordered.forEach((row, i) => {
      if (kind === 'experience') db.prepare('UPDATE profile_experiences SET sort_order=? WHERE id=? AND user_id=?').run(i, row.id, req.user!.id)
      else if (kind === 'education') db.prepare('UPDATE profile_education SET sort_order=? WHERE id=? AND user_id=?').run(i, row.id, req.user!.id)
      else if (kind === 'skills') db.prepare('UPDATE profile_skills SET sort_order=? WHERE id=? AND user_id=?').run(i, row.id, req.user!.id)
      else db.prepare('UPDATE profile_other_entries SET sort_order=? WHERE id=? AND user_id=?').run(i, row.id, req.user!.id)
    })
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
  res.json({ profile: getProfile(req.user!.id) })
})

/* ---------------------------------- photo --------------------------------- */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.uploadMaxBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype)) {
      return cb(new Error('Use a PNG, JPEG or WebP image.'))
    }
    cb(null, true)
  },
})

function detectImage(buffer: Buffer): { ext: string; mime: string } | null {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { ext: 'png', mime: 'image/png' }
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' }
  }
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') {
    return { ext: 'webp', mime: 'image/webp' }
  }
  return null
}

router.post('/photo', requireAuth, upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Choose an image to upload.', code: 'NO_FILE' })
    const detected = detectImage(req.file.buffer)
    if (!detected) return res.status(400).json({ error: 'That file is not a valid PNG, JPEG or WebP image.', code: 'BAD_IMAGE' })
    const filename = `${randomBytes(12).toString('hex')}.${detected.ext}`
    const dir = join(process.cwd(), env.uploadsDir)
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, filename), req.file.buffer)
    const url = `/uploads/${filename}`
    const db = getDb()
    const previous = db.prepare('SELECT photo_url FROM profiles WHERE user_id=?').get(req.user!.id) as { photo_url?: string } | undefined
    if (previous?.photo_url?.startsWith('/uploads/')) {
      const oldName = previous.photo_url.slice('/uploads/'.length)
      if (/^[a-f0-9]{24}\.(png|jpg|webp)$/.test(oldName)) await unlink(join(dir, oldName)).catch(() => undefined)
    }
    ensureProfileRow(req.user!.id)
    db.prepare('UPDATE profiles SET photo_url=?, updated_at=? WHERE user_id=?').run(url, nowIso(), req.user!.id)
    res.status(201).json({ url, profile: getProfile(req.user!.id) })
  } catch (error) {
    next(error)
  }
})

export default router
