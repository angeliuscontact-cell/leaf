import { Router } from 'express'
import { getDb } from '../db'
import { requireAuth } from '../auth'
import { mapCv, mapLanding, mapLetter } from '../mappers'
import { getProfile } from './profile'
import { profileCompletion } from '../../shared/profile'
import { recentActivities } from '../activity'
import { aiUsage } from '../ai'
import { env } from '../env'

const router = Router()

router.get('/', requireAuth, (req, res) => {
  const db = getDb()
  const userId = req.user!.id
  const cvRows = db.prepare('SELECT * FROM cvs WHERE user_id=? ORDER BY updated_at DESC LIMIT 6').all(userId) as Array<Record<string, unknown>>
  const letterRows = db.prepare('SELECT * FROM cover_letters WHERE user_id=? ORDER BY updated_at DESC LIMIT 4').all(userId) as Array<Record<string, unknown>>
  const landingRows = db.prepare('SELECT * FROM landing_pages WHERE user_id=? ORDER BY updated_at DESC').all(userId) as Array<Record<string, unknown>>
  const count = (table: string, extra = '') =>
    Number((db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE user_id=?${extra}`).get(userId) as { n: number }).n)
  const profile = getProfile(userId)
  res.json({
    cvs: cvRows.map(mapCv),
    letters: letterRows.map(mapLetter),
    landingPages: landingRows.map((row) => ({ ...mapLanding(row), publicUrl: `${env.publicUrl}/p/${String(row.slug)}` })),
    activities: recentActivities(userId),
    profileCompletion: profileCompletion(profile),
    counts: {
      cvs: count('cvs'),
      letters: count('cover_letters'),
      landings: count('landing_pages'),
      publishedLandings: count('landing_pages', ' AND published=1'),
    },
    ai: aiUsage(userId),
  })
})

export default router
