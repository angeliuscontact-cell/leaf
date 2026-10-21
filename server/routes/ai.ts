import { Router } from 'express'
import { getDb } from '../db'
import { requireAuth } from '../auth'
import {
  AIUnavailableError,
  aiConfigured,
  aiUsage,
  cvPlainText,
  draftCoverLetter,
  landingPlainText,
  letterPlainText,
  localReview,
  reviewDocument,
  rewriteText,
  suggestSkills,
} from '../ai'
import { parseBody, aiReviewSchema, aiRewriteSchema, aiSkillsSchema, aiDraftSchema, parseId } from '../validation'
import { mapCv, mapLanding, mapLetter } from '../mappers'
import type { CoverLetterDocument, CVDocument, LandingPageDocument } from '../../shared/types'

const router = Router()

type LoadedDoc =
  | { docType: 'cv'; cv: CVDocument }
  | { docType: 'cover_letter'; letter: CoverLetterDocument }
  | { docType: 'landing'; landing: LandingPageDocument }

function loadDoc(userId: number, docType: 'cv' | 'cover_letter' | 'landing', docId: number): LoadedDoc | null {
  const db = getDb()
  if (docType === 'cv') {
    const row = db.prepare('SELECT * FROM cvs WHERE id=? AND user_id=?').get(docId, userId) as Record<string, unknown> | undefined
    return row ? { docType, cv: mapCv(row) } : null
  }
  if (docType === 'cover_letter') {
    const row = db.prepare('SELECT * FROM cover_letters WHERE id=? AND user_id=?').get(docId, userId) as Record<string, unknown> | undefined
    return row ? { docType, letter: mapLetter(row) } : null
  }
  const row = db.prepare('SELECT * FROM landing_pages WHERE id=? AND user_id=?').get(docId, userId) as Record<string, unknown> | undefined
  return row ? { docType, landing: mapLanding(row) } : null
}

router.get('/status', requireAuth, (req, res) => {
  res.json({ usage: aiUsage(req.user!.id), provider: aiConfigured() ? 'configured' : 'not-configured' })
})

router.post('/rewrite', requireAuth, async (req, res, next) => {
  try {
    const body = parseBody(aiRewriteSchema, req, res)
    if (!body) return
    const result = await rewriteText(req.user!.id, body.action, body.text, body.context, body.tone)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

router.post('/skills', requireAuth, async (req, res, next) => {
  try {
    const body = parseBody(aiSkillsSchema, req, res)
    if (!body) return
    const result = await suggestSkills(req.user!.id, body.role, body.existing, body.jobDescription)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

function docForReview(loaded: NonNullable<ReturnType<typeof loadDoc>>) {
  if ('cv' in loaded) return { data: loaded.cv.data, text: cvPlainText(loaded.cv.data) }
  if ('letter' in loaded) return { data: loaded.letter.data, text: letterPlainText(loaded.letter.data) }
  return { data: loaded.landing.data, text: landingPlainText(loaded.landing.data) }
}

router.post('/review', requireAuth, async (req, res, next) => {
  try {
    const body = parseBody(aiReviewSchema, req, res)
    if (!body) return
    const loaded = loadDoc(req.user!.id, body.docType, body.docId)
    if (!loaded) return res.status(404).json({ error: 'Document not found.', code: 'NOT_FOUND' })
    const { text } = docForReview(loaded)
    const result = await reviewDocument(req.user!.id, body.docType, body.docId, text, body.jobDescription)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

router.post('/local-review', requireAuth, (req, res) => {
  const body = parseBody(aiReviewSchema, req, res)
  if (!body) return
  const loaded = loadDoc(req.user!.id, body.docType, body.docId)
  if (!loaded) return res.status(404).json({ error: 'Document not found.', code: 'NOT_FOUND' })
  const { data } = docForReview(loaded)
  const review = localReview(body.docType, data as never, body.jobDescription)
  getDb()
    .prepare('INSERT INTO ai_reviews (user_id, doc_type, doc_id, job_description, result_json, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(req.user!.id, body.docType, body.docId, body.jobDescription, JSON.stringify(review), 'local', new Date().toISOString())
  res.json({ review, usage: aiUsage(req.user!.id) })
})

router.post('/cover-letter-draft', requireAuth, async (req, res, next) => {
  try {
    const body = parseBody(aiDraftSchema, req, res)
    if (!body) return
    const loaded = loadDoc(req.user!.id, 'cover_letter', body.docId)
    if (!loaded || !('letter' in loaded)) return res.status(404).json({ error: 'Cover letter not found.', code: 'NOT_FOUND' })
    const result = await draftCoverLetter(req.user!.id, loaded.letter, body.tone, body.instructions)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

router.get('/reviews', requireAuth, (req, res) => {
  const rows = getDb()
    .prepare('SELECT id, doc_type, doc_id, result_json, source, created_at FROM ai_reviews WHERE user_id=? ORDER BY created_at DESC LIMIT 10')
    .all(req.user!.id)
    .map((row) => {
      const r = row as Record<string, unknown>
      let review: unknown = null
      try {
        review = JSON.parse(String(r.result_json))
      } catch {
        review = null
      }
      return {
        id: Number(r.id),
        docType: String(r.doc_type),
        docId: r.doc_id ? Number(r.doc_id) : null,
        source: String(r.source),
        createdAt: String(r.created_at),
        review,
      }
    })
  res.json({ reviews: rows })
})

void AIUnavailableError
void parseId

export default router
