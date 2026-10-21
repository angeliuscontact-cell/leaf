import { z } from 'zod'
import type { Request, Response } from 'express'
import { CV_SECTION_KEYS } from '../shared/types'

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a six-digit hex colour.')
const text = (max = 500) => z.string().trim().max(max)
const optionalText = (max = 500) => z.string().trim().max(max).default('')
const id = z.string().trim().max(100).default('')
const fileUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => !v || v.startsWith('/uploads/') || /^https?:\/\//i.test(v), 'Photo must be an uploaded image or an https URL.')
  .default('')

export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(128, 'Password is too long.')
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Include at least one letter and one number.')

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(80),
  email: z.string().trim().email('Enter a valid email address.').max(254).transform((v) => v.toLowerCase()),
  password: passwordSchema,
})

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.').max(254).transform((v) => v.toLowerCase()),
  password: z.string().min(1, 'Enter your password.').max(128),
})

export const forgotSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.').max(254).transform((v) => v.toLowerCase()),
})

export const resetSchema = z.object({
  token: z.string().min(10).max(200),
  password: passwordSchema,
})

export const verifySchema = z.object({ token: z.string().min(10).max(200) })

export const accountSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().email().max(254).transform((v) => v.toLowerCase()).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
})

export const deleteAccountSchema = z.object({ password: z.string().min(1).max(128) })

export const profileSchema = z.object({
  fullName: text(120).default(''),
  title: text(140).default(''),
  email: z.string().trim().max(254).default(''),
  phone: text(60).default(''),
  city: text(100).default(''),
  country: text(100).default(''),
  website: text(300).default(''),
  linkedin: text(300).default(''),
  github: text(300).default(''),
  summary: text(3000).default(''),
  photoUrl: fileUrl,
})

export const experienceSchema = z.object({
  role: text(160).default(''),
  company: text(160).default(''),
  location: text(140).default(''),
  startDate: text(40).default(''),
  endDate: text(40).default(''),
  current: z.boolean().default(false),
  description: text(6000).default(''),
})

export const educationSchema = z.object({
  institution: text(180).default(''),
  degree: text(160).default(''),
  field: text(160).default(''),
  location: text(140).default(''),
  startDate: text(40).default(''),
  endDate: text(40).default(''),
  details: text(3000).default(''),
})

export const skillSchema = z.object({
  name: text(100).min(1, 'Enter a skill.').max(100),
  level: z.number().int().min(1).max(5).default(3),
})

export const otherEntrySchemas = {
  languages: z.object({
    name: text(100).default(''),
    level: text(80).default(''),
  }),
  certifications: z.object({
    name: text(180).default(''),
    issuer: text(180).default(''),
    date: text(60).default(''),
    url: text(500).default(''),
  }),
  projects: z.object({
    name: text(180).default(''),
    role: text(160).default(''),
    url: text(500).default(''),
    startDate: text(40).default(''),
    endDate: text(40).default(''),
    description: text(3000).default(''),
  }),
  achievements: z.object({
    title: text(180).default(''),
    description: text(2000).default(''),
  }),
  interests: z.object({
    name: text(120).default(''),
  }),
  references: z.object({
    name: text(160).default(''),
    role: text(160).default(''),
    company: text(160).default(''),
    email: text(254).default(''),
    phone: text(60).default(''),
  }),
} as const

export const moveSchema = z.object({ direction: z.union([z.literal(-1), z.literal(1)]) })

const cvPersonalSchema = z.object({
  fullName: text(120).default(''),
  title: text(140).default(''),
  email: z.string().trim().max(254).default(''),
  phone: text(60).default(''),
  location: text(140).default(''),
  website: text(300).default(''),
  linkedin: text(300).default(''),
  github: text(300).default(''),
  photoUrl: fileUrl,
  summary: text(4000).default(''),
})

const cvExperience = z.object({
  id,
  role: text(160).default(''),
  company: text(160).default(''),
  location: text(140).default(''),
  startDate: text(40).default(''),
  endDate: text(40).default(''),
  current: z.boolean().default(false),
  description: text(6000).default(''),
})
const cvEducation = z.object({
  id,
  institution: text(180).default(''),
  degree: text(160).default(''),
  field: text(160).default(''),
  location: text(140).default(''),
  startDate: text(40).default(''),
  endDate: text(40).default(''),
  details: text(3000).default(''),
})
const cvSkill = z.object({ id, name: text(100).default(''), level: z.number().int().min(1).max(5).default(3) })
const cvLanguage = z.object({ id, name: text(100).default(''), level: text(80).default('') })
const cvCertification = z.object({ id, name: text(180).default(''), issuer: text(180).default(''), date: text(60).default(''), url: text(500).default('') })
const cvProject = z.object({
  id,
  name: text(180).default(''),
  role: text(160).default(''),
  url: text(500).default(''),
  startDate: text(40).default(''),
  endDate: text(40).default(''),
  description: text(3000).default(''),
})
const cvAchievement = z.object({ id, title: text(180).default(''), description: text(2000).default('') })
const cvReference = z.object({
  id,
  name: text(160).default(''),
  role: text(160).default(''),
  company: text(160).default(''),
  email: text(254).default(''),
  phone: text(60).default(''),
})

export const cvDataSchema = z.object({
  personal: cvPersonalSchema,
  experiences: z.array(cvExperience).max(60).default([]),
  education: z.array(cvEducation).max(30).default([]),
  skills: z.array(cvSkill).max(120).default([]),
  languages: z.array(cvLanguage).max(30).default([]),
  certifications: z.array(cvCertification).max(40).default([]),
  projects: z.array(cvProject).max(40).default([]),
  achievements: z.array(cvAchievement).max(40).default([]),
  interests: z.array(text(120)).max(40).default([]),
  references: z.array(cvReference).max(20).default([]),
  sectionOrder: z.array(z.enum(CV_SECTION_KEYS)).max(CV_SECTION_KEYS.length).default([...CV_SECTION_KEYS]),
  hiddenSections: z.array(z.enum(CV_SECTION_KEYS)).max(CV_SECTION_KEYS.length).default([]),
})

export const cvSettingsSchema = z.object({
  template: z.enum(['classic', 'modern', 'minimal', 'creative', 'academic', 'student']).default('classic'),
  primaryColor: hex.default('#1677ff'),
  secondaryColor: hex.default('#0f3b66'),
  accentColor: hex.default('#13c2c2'),
  font: z.enum(['sans', 'serif']).default('sans'),
  density: z.enum(['comfortable', 'compact']).default('comfortable'),
  showPhoto: z.boolean().default(false),
})

export const createCvSchema = z.object({
  title: text(120).default('Untitled CV'),
  template: z.enum(['classic', 'modern', 'minimal', 'creative', 'academic', 'student']).default('classic'),
  data: cvDataSchema.optional(),
  settings: cvSettingsSchema.partial().optional(),
})

export const updateCvSchema = z.object({
  title: text(120).optional(),
  data: cvDataSchema.optional(),
  settings: cvSettingsSchema.optional(),
})

export const renameSchema = z.object({ title: z.string().trim().min(1, 'Give this document a name.').max(120) })

export const shareSchema = z.object({
  enabled: z.boolean(),
  expiresInDays: z.number().int().min(1).max(365).nullable().optional(),
})

const letterSenderSchema = z.object({
  fullName: text(120).default(''),
  title: text(140).default(''),
  email: text(254).default(''),
  phone: text(60).default(''),
  location: text(140).default(''),
  website: text(300).default(''),
  photoUrl: fileUrl,
})

export const coverLetterDataSchema = z.object({
  sender: letterSenderSchema,
  recipientName: text(160).default(''),
  recipientTitle: text(160).default(''),
  company: text(180).default(''),
  companyAddress: text(400).default(''),
  targetRole: text(180).default(''),
  date: text(60).default(''),
  salutation: text(200).default(''),
  body: text(12000).default(''),
  closing: text(100).default(''),
  signature: text(160).default(''),
  jobDescription: text(12000).default(''),
})

export const coverLetterSettingsSchema = z.object({
  template: z.enum(['classic', 'modern', 'minimal']).default('classic'),
  primaryColor: hex.default('#1677ff'),
  secondaryColor: hex.default('#0f3b66'),
  accentColor: hex.default('#13c2c2'),
  font: z.enum(['sans', 'serif']).default('serif'),
})

export const createLetterSchema = z.object({
  title: text(120).default('Untitled cover letter'),
  template: z.enum(['classic', 'modern', 'minimal']).default('classic'),
  data: coverLetterDataSchema.optional(),
  settings: coverLetterSettingsSchema.partial().optional(),
})

export const updateLetterSchema = z.object({
  title: text(120).optional(),
  data: coverLetterDataSchema.optional(),
  settings: coverLetterSettingsSchema.optional(),
})

const landingSectionSchema = z.object({
  id: text(80).min(1),
  type: z.enum(['about', 'skills', 'experience', 'education', 'projects', 'certifications', 'contact', 'custom']),
  title: text(120).default('Section'),
  visible: z.boolean().default(true),
  body: text(5000).optional(),
})

export const landingDataSchema = z.object({
  hero: z.object({
    eyebrow: text(80).default(''),
    headline: text(180).default(''),
    subheadline: text(500).default(''),
    availability: text(120).default(''),
    location: text(140).default(''),
    ctaLabel: text(60).default('Get in touch'),
  }),
  about: text(6000).default(''),
  skills: z.array(z.object({ id, name: text(100).default(''), level: z.number().int().min(1).max(5).default(3) })).max(60).default([]),
  experiences: z.array(cvExperience).max(40).default([]),
  education: z.array(cvEducation).max(20).default([]),
  projects: z.array(cvProject).max(30).default([]),
  certifications: z.array(cvCertification).max(30).default([]),
  contact: z.object({
    email: text(254).default(''),
    phone: text(60).default(''),
    location: text(140).default(''),
    website: text(300).default(''),
    linkedin: text(300).default(''),
    github: text(300).default(''),
  }),
  interestLine: text(300).default(''),
  photoUrl: fileUrl,
  cvId: z.number().int().positive().nullable().default(null),
  sections: z.array(landingSectionSchema).max(20).default([]),
})

export const landingSettingsSchema = z.object({
  template: z.enum(['minimal', 'modern', 'creative', 'developer', 'student', 'executive']).default('modern'),
  primaryColor: hex.default('#1677ff'),
  secondaryColor: hex.default('#0f3b66'),
  accentColor: hex.default('#13c2c2'),
  font: z.enum(['sans', 'serif']).default('sans'),
})

export const createLandingSchema = z.object({
  title: text(120).default('My professional page'),
  template: z.enum(['minimal', 'modern', 'creative', 'developer', 'student', 'executive']).default('modern'),
  data: landingDataSchema.optional(),
  settings: landingSettingsSchema.partial().optional(),
})

export const updateLandingSchema = z.object({
  title: text(120).optional(),
  slug: z.string().trim().min(3).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens.').optional(),
  data: landingDataSchema.optional(),
  settings: landingSettingsSchema.optional(),
})

export const publishSchema = z.object({ published: z.boolean() })

export const aiRewriteSchema = z.object({
  action: z.enum(['improve', 'grammar', 'concise', 'professional', 'achievement', 'summary']).default('improve'),
  text: z.string().trim().min(1, 'Add some text first.').max(8000),
  context: z.string().trim().max(3000).optional().default(''),
  tone: z.enum(['formal', 'confident', 'concise', 'enthusiastic']).optional().default('confident'),
})

export const aiReviewSchema = z.object({
  docType: z.enum(['cv', 'cover_letter', 'landing']),
  docId: z.number().int().positive(),
  jobDescription: z.string().trim().max(12000).optional().default(''),
})

export const aiDraftSchema = z.object({
  docId: z.number().int().positive(),
  tone: z.enum(['formal', 'confident', 'concise', 'enthusiastic']).default('confident'),
  instructions: z.string().trim().max(2000).optional().default(''),
})

export const aiSkillsSchema = z.object({
  role: z.string().trim().min(2).max(200),
  existing: z.array(z.string().max(100)).max(80).optional().default([]),
  jobDescription: z.string().trim().max(8000).optional().default(''),
})

export function parseBody<S extends z.ZodTypeAny>(schema: S, req: Request, res: Response): z.output<S> | null {
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    const path = first?.path?.join('.')
    res.status(400).json({
      error: first ? `${path ? `${path}: ` : ''}${first.message}` : 'Check the information you entered.',
      code: 'VALIDATION',
      details: parsed.error.issues.slice(0, 12).map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    })
    return null
  }
  return parsed.data
}

export function parseId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}
