/**
 * Demonstration data for LEAF.
 *
 * Usage:
 *   npm run seed
 *
 * The script is idempotent: it removes and recreates the demo account only.
 * Configure SEED_EMAIL / SEED_PASSWORD to change the sign-in details.
 */
import { randomBytes } from 'node:crypto'
import { closeDb, getDb, nowIso } from './db'
import { hashPassword } from './auth'
import { env } from './env'
import { logActivity } from './activity'
import { localReview } from './ai'
import { sampleCVData, emptyCoverLetterData, emptyLandingData } from '../shared/defaults'
import { DEFAULT_CV_SETTINGS, DEFAULT_LETTER_SETTINGS } from '../shared/templates'
import type { CoverLetterData, CVData, LandingData } from '../shared/types'

const EMAIL = (process.env.SEED_EMAIL || 'demo@leaf.app').trim().toLowerCase()
const PASSWORD = process.env.SEED_PASSWORD || 'LeafDemo123'
const NAME = 'Maya Laurent'

function shareId() {
  return randomBytes(12).toString('base64url')
}

async function main() {
  if (PASSWORD.length < 8 || !/[A-Za-z]/.test(PASSWORD) || !/\d/.test(PASSWORD)) {
    throw new Error('SEED_PASSWORD must contain at least eight characters, including a letter and a number.')
  }

  const db = getDb()
  const existing = db.prepare('SELECT id FROM users WHERE email=?').get(EMAIL) as { id: number } | undefined
  if (existing) {
    db.prepare('DELETE FROM users WHERE id=?').run(existing.id)
    console.log(`[seed] removed previous demo account ${EMAIL}`)
  }

  const now = nowIso()
  const passwordHash = await hashPassword(PASSWORD)
  const userId = Number(
    db
      .prepare(
        `INSERT INTO users (email, password_hash, name, email_verified, theme, created_at, updated_at)
         VALUES (?, ?, ?, 1, 'system', ?, ?)`,
      )
      .run(EMAIL, passwordHash, NAME, now, now).lastInsertRowid,
  )

  const data = sampleCVData()
  const { personal } = data
  db.prepare(
    `INSERT INTO profiles (user_id, full_name, title, email, phone, city, country, website, linkedin, github, summary, photo_url, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?)`,
  ).run(
    userId,
    personal.fullName,
    personal.title,
    personal.email,
    personal.phone,
    'Port Louis',
    'Mauritius',
    personal.website,
    personal.linkedin,
    personal.github,
    personal.summary,
    now,
  )

  const insertExperience = db.prepare(
    `INSERT INTO profile_experiences (user_id, role, company, location, start_date, end_date, current, description, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  data.experiences.forEach((item, index) => {
    insertExperience.run(
      userId,
      item.role,
      item.company,
      item.location,
      item.startDate,
      item.endDate,
      item.current ? 1 : 0,
      item.description,
      index,
      now,
      now,
    )
  })

  const insertEducation = db.prepare(
    `INSERT INTO profile_education (user_id, institution, degree, field, location, start_date, end_date, details, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  data.education.forEach((item, index) => {
    insertEducation.run(
      userId,
      item.institution,
      item.degree,
      item.field,
      item.location,
      item.startDate,
      item.endDate,
      item.details,
      index,
      now,
      now,
    )
  })

  const insertSkill = db.prepare(
    `INSERT INTO profile_skills (user_id, name, level, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
  )
  data.skills.forEach((skill, index) => insertSkill.run(userId, skill.name, skill.level, index, now, now))

  const insertOther = db.prepare(
    `INSERT INTO profile_other_entries (user_id, kind, data_json, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
  )
  data.languages.forEach((entry, index) => insertOther.run(userId, 'languages', JSON.stringify(entry), index, now, now))
  data.projects.forEach((entry, index) => insertOther.run(userId, 'projects', JSON.stringify(entry), index, now, now))
  data.interests.forEach((entry, index) =>
    insertOther.run(userId, 'interests', JSON.stringify({ id: `interest_${index}`, name: entry }), index, now, now),
  )

  const sharedShare = shareId()
  const insertCv = db.prepare(
    `INSERT INTO cvs (user_id, title, template, primary_color, secondary_color, accent_color, font, density, show_photo, data_json, share_id, share_enabled, share_expires_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'comfortable', ?, ?, ?, ?, ?, ?, ?)`,
  )

  const primaryCvId = Number(
    insertCv.run(
      userId,
      'Product Designer — 2026',
      'modern',
      '#0f3b66',
      '#0f172a',
      '#13c2c2',
      'sans',
      0,
      JSON.stringify(data),
      sharedShare,
      1,
      null,
      now,
      now,
    ).lastInsertRowid,
  )

  const creativeData: CVData = {
    ...JSON.parse(JSON.stringify(data)),
    personal: { ...data.personal, title: 'Design Lead · Systems & Research' },
    hiddenSections: ['languages', 'achievements', 'references'],
  }
  insertCv.run(
    userId,
    'Creative portfolio CV',
    'creative',
    '#9d174d',
    '#3b0a1f',
    '#f59e0b',
    'serif',
    0,
    JSON.stringify(creativeData),
    null,
    0,
    null,
    now,
    now,
  )

  const academicData: CVData = {
    ...JSON.parse(JSON.stringify(data)),
    personal: {
      ...data.personal,
      title: 'Design Researcher & Lecturer',
      summary:
        'Design researcher working at the intersection of service design and civic technology. I teach prototyping, publish practical case studies, and build tools that small teams can maintain.',
    },
    certifications: [
      {
        id: 'cert_seed_1',
        name: 'Accessibility for Inclusive Design',
        issuer: 'Interaction Design Foundation',
        date: '2023',
        url: '',
      },
    ],
    hiddenSections: ['references'],
  }
  insertCv.run(
    userId,
    'Research & teaching CV',
    'academic',
    '#7c2d12',
    '#3f2d20',
    '#0f766e',
    'serif',
    0,
    JSON.stringify(academicData),
    null,
    0,
    null,
    now,
    now,
  )

  const letterBase: CoverLetterData = {
    ...emptyCoverLetterData({
      fullName: personal.fullName,
      title: personal.title,
      email: personal.email,
      phone: personal.phone,
      location: personal.location,
      website: personal.website,
    }),
    recipientName: 'Amelia Cheng',
    recipientTitle: 'Head of Design',
    company: 'Northstar Logistics',
    companyAddress: '12 Market Street, London',
    targetRole: 'Principal Product Designer',
    salutation: 'Dear Amelia,',
    body:
      'I am writing about the Principal Product Designer role at Northstar Logistics. Your work on driver-facing tools caught my attention because it treats operations software as something people use under pressure, not a dashboard to be admired.\n\nAt Tidewater Labs I led the redesign of onboarding for a 30-person logistics team. Activation rose from 41% to 63% over two quarters, largely by removing steps that made dispatchers repeat information they had already entered. I also built the component system four squads now use to ship consistent screens without starting from scratch.\n\nWhat draws me to Northstar is the chance to make those improvements at a larger scale, with research close to the people doing the work. I would welcome a conversation about where the team is headed and how I could help.',
    closing: 'Sincerely,',
    signature: personal.fullName,
    date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
  }

  const insertLetter = db.prepare(
    `INSERT INTO cover_letters (user_id, title, template, primary_color, secondary_color, accent_color, font, data_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  insertLetter.run(
    userId,
    'Northstar — Principal Product Designer',
    'classic',
    DEFAULT_LETTER_SETTINGS.primaryColor,
    DEFAULT_LETTER_SETTINGS.secondaryColor,
    DEFAULT_LETTER_SETTINGS.accentColor,
    'serif',
    JSON.stringify(letterBase),
    now,
    now,
  )
  insertLetter.run(
    userId,
    'Tidewater — Design systems lead',
    'modern',
    '#0f3b66',
    '#0f172a',
    '#13c2c2',
    'sans',
    JSON.stringify({
      ...letterBase,
      recipientName: 'Jon Bell',
      recipientTitle: 'VP Product',
      company: 'Tidewater Labs',
      targetRole: 'Design Systems Lead',
      salutation: 'Hello Jon,',
      body:
        'Thank you for taking the time to discuss the Design Systems Lead role.\n\nOver the past three years I have built Canopy, a 60-component library used by four product squads. The work was as much editorial as technical: naming, documentation and a writing guide that made the system useful without a meeting.\n\nI would like to continue that work at Tidewater, with a clear mandate to make quality the default rather than an exception.',
    }),
    now,
    now,
  )

  const landingData: LandingData = {
    ...emptyLandingData(),
    hero: {
      eyebrow: 'Product designer · Port Louis',
      headline: 'Maya Laurent',
      subheadline:
        'Product designer making quiet tools for small teams. I care about clear language, tested prototypes and systems people can keep using after launch.',
      availability: 'Open to senior product roles',
      location: 'Port Louis, Mauritius',
      ctaLabel: 'Start a conversation',
    },
    about:
      'I have spent nine years designing software for logistics, operations and small professional teams. My work tends to start with a conversation and a rough prototype, not a moodboard.\n\nAt Tidewater Labs I lead design for onboarding and internal tooling. Before that I designed the first mobile app for a 30-person logistics startup, from sketch to store release.',
    skills: data.skills,
    experiences: data.experiences,
    education: data.education,
    projects: data.projects,
    certifications: [],
    contact: {
      email: personal.email,
      phone: personal.phone,
      location: personal.location,
      website: personal.website,
      linkedin: personal.linkedin,
      github: personal.github,
    },
    interestLine: 'Currently reading about service design for public transport.',
    cvId: primaryCvId,
    sections: [
      { id: 'about', type: 'about', title: 'A little context', visible: true },
      { id: 'skills', type: 'skills', title: 'What I work with', visible: true },
      { id: 'experience', type: 'experience', title: 'Where I’ve worked', visible: true },
      { id: 'education', type: 'education', title: 'Learning', visible: true },
      { id: 'projects', type: 'projects', title: 'Selected work', visible: true },
      { id: 'certifications', type: 'certifications', title: 'Credentials', visible: false },
      { id: 'contact', type: 'contact', title: 'Let’s talk', visible: true },
    ],
  }

  const insertLanding = db.prepare(
    `INSERT INTO landing_pages (user_id, title, slug, template, primary_color, secondary_color, accent_color, font, published, published_at, data_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  insertLanding.run(
    userId,
    'Maya Laurent — Product designer',
    'maya-laurent',
    'modern',
    '#1677ff',
    '#0f3b66',
    '#13c2c2',
    'sans',
    1,
    now,
    JSON.stringify(landingData),
    now,
    now,
  )
  insertLanding.run(
    userId,
    'Maya — studio notes (draft)',
    'maya-studio-notes',
    'minimal',
    '#334155',
    '#0f172a',
    '#0ea5e9',
    'serif',
    0,
    null,
    JSON.stringify({
      ...landingData,
      hero: {
        ...landingData.hero,
        eyebrow: 'Studio notes',
        headline: 'Work in progress, on purpose.',
        subheadline: 'A draft page that stays private until it is ready.',
        availability: 'Draft',
      },
    }),
    now,
    now,
  )

  db.prepare(
    `INSERT INTO document_versions (user_id, doc_type, doc_id, data_json, title, created_at) VALUES (?, 'cv', ?, ?, ?, ?)`,
  ).run(
    userId,
    primaryCvId,
    JSON.stringify({ data, settings: { ...DEFAULT_CV_SETTINGS, template: 'modern', primaryColor: '#0f3b66', accentColor: '#13c2c2' } }),
    'Product Designer — 2026',
    now,
  )

  const review = localReview('cv', data, '')
  db.prepare(
    `INSERT INTO ai_reviews (user_id, doc_type, doc_id, job_description, result_json, source, created_at)
     VALUES (?, 'cv', ?, '', ?, 'local', ?)`,
  ).run(userId, primaryCvId, JSON.stringify(review), now)

  logActivity(userId, 'account', 'Demo workspace created', 'user', userId)
  logActivity(userId, 'cv_created', 'Created “Product Designer — 2026”', 'cv', primaryCvId)
  logActivity(userId, 'cv_shared', 'Shared “Product Designer — 2026” with a link', 'cv', primaryCvId)
  logActivity(userId, 'landing_published', 'Published “Maya Laurent — Product designer”', 'landing', 1)

  console.log('')
  console.log('  LEAF demo data is ready')
  console.log(`  Sign in:   ${env.publicUrl}/login`)
  console.log(`  Email:     ${EMAIL}`)
  console.log(`  Password:  ${PASSWORD}`)
  console.log(`  Shared CV: ${env.publicUrl}/cv/${sharedShare}`)
  console.log(`  Site:      ${env.publicUrl}/p/maya-laurent`)
  console.log('')
}

main()
  .catch((error) => {
    console.error('[seed] failed:', error)
    process.exitCode = 1
  })
  .finally(() => closeDb())
