import { Router } from 'express'
import { getDb } from '../db'
import { env } from '../env'
import { mapCv, mapLanding, shareIsLive } from '../mappers'
import { renderCVDocument } from '../../shared/renderDocument'
import { photoDataUri } from '../photo'
import { htmlToPdf, slugify } from '../pdf'

const router = Router()

function findPublicCv(shareId: string) {
  const row = getDb()
    .prepare('SELECT c.*, u.name AS owner_name FROM cvs c JOIN users u ON u.id=c.user_id WHERE c.share_id=?')
    .get(shareId) as (Record<string, unknown> & { owner_name: string }) | undefined
  if (!row || !shareIsLive(row)) return null
  return { row, doc: mapCv(row) }
}

router.get('/cvs/:shareId', (req, res) => {
  const shareId = req.params.shareId
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(shareId)) return res.status(404).json({ error: 'This shared CV is not available.', code: 'NOT_FOUND' })
  const found = findPublicCv(shareId)
  if (!found) return res.status(404).json({ error: 'This shared CV is not available. The owner may have revoked the link.', code: 'NOT_FOUND' })
  const html = renderCVDocument(found.doc, { baseUrl: '', preview: false, photoSrc: found.doc.data.personal.photoUrl })
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
  res.json({
    title: found.doc.title || found.doc.data.personal.fullName || 'Shared CV',
    ownerName: String(found.row.owner_name),
    html,
    shareId,
    expiresAt: found.doc.shareExpiresAt,
    pdfUrl: `/api/public/cvs/${shareId}/pdf`,
    updatedAt: found.doc.updatedAt,
  })
})

router.get('/cvs/:shareId/pdf', async (req, res, next) => {
  try {
    const shareId = req.params.shareId
    if (!/^[A-Za-z0-9_-]{10,40}$/.test(shareId)) return res.status(404).json({ error: 'This shared CV is not available.', code: 'NOT_FOUND' })
    const found = findPublicCv(shareId)
    if (!found) return res.status(404).json({ error: 'This shared CV is not available.', code: 'NOT_FOUND' })
    const photo = await photoDataUri(found.doc.data.personal.photoUrl)
    const html = renderCVDocument(found.doc, { baseUrl: env.publicUrl, preview: false, photoSrc: photo })
    const pdf = await htmlToPdf(html)
    const filename = `${slugify(found.doc.data.personal.fullName || found.doc.title, 'shared-cv')}-leaf-cv.pdf`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `${req.query.inline === '1' ? 'inline' : 'attachment'}; filename="${filename}"`)
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Robots-Tag', 'noindex, nofollow')
    res.send(pdf)
  } catch (error) {
    next(error)
  }
})

router.get('/pages/:slug', (req, res) => {
  const slug = req.params.slug
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return res.status(404).json({ error: 'Page not found.', code: 'NOT_FOUND' })
  const db = getDb()
  const row = db
    .prepare('SELECT l.*, u.name AS owner_name FROM landing_pages l JOIN users u ON u.id=l.user_id WHERE l.slug=? AND l.published=1')
    .get(slug) as (Record<string, unknown> & { owner_name: string }) | undefined
  if (!row) return res.status(404).json({ error: 'This page is not published.', code: 'NOT_FOUND' })
  const page = mapLanding(row)
  let cvShareId: string | null = null
  if (page.data.cvId) {
    const cv = db.prepare('SELECT share_id, share_enabled, share_expires_at FROM cvs WHERE id=? AND user_id=?').get(page.data.cvId, Number(row.user_id)) as Record<string, unknown> | undefined
    if (cv && shareIsLive(cv)) cvShareId = String(cv.share_id)
  }
  res.setHeader('Cache-Control', 'no-store')
  res.json({
    title: page.title,
    slug: page.slug,
    template: page.template,
    primaryColor: page.primaryColor,
    secondaryColor: page.secondaryColor,
    accentColor: page.accentColor,
    font: page.font,
    data: page.data,
    ownerName: String(row.owner_name),
    publishedAt: page.publishedAt,
    cvShareId,
    cvShareUrl: cvShareId ? `${env.publicUrl}/cv/${cvShareId}` : null,
    updatedAt: page.updatedAt,
  })
})

export default router
