import type {
  CoverLetterDocument,
  CoverLetterSettings,
  CVDocument,
  CVSettings,
  LandingPageDocument,
  LandingTemplateId,
} from '../shared/types'
import { DEFAULT_CV_SETTINGS, DEFAULT_LETTER_SETTINGS } from '../shared/templates'

export function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string' || !value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function mapCv(row: Record<string, unknown>): CVDocument {
  const settings: CVSettings = {
    template: (row.template as CVSettings['template']) || DEFAULT_CV_SETTINGS.template,
    primaryColor: String(row.primary_color || DEFAULT_CV_SETTINGS.primaryColor),
    secondaryColor: String(row.secondary_color || DEFAULT_CV_SETTINGS.secondaryColor),
    accentColor: String(row.accent_color || DEFAULT_CV_SETTINGS.accentColor),
    font: row.font === 'serif' ? 'serif' : 'sans',
    density: row.density === 'compact' ? 'compact' : 'comfortable',
    showPhoto: Number(row.show_photo) === 1,
  }
  return {
    id: Number(row.id),
    title: String(row.title),
    settings,
    data: parseJson(row.data_json, {} as CVDocument['data']),
    shareEnabled: Number(row.share_enabled) === 1,
    shareId: row.share_id ? String(row.share_id) : null,
    shareExpiresAt: row.share_expires_at ? String(row.share_expires_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export function mapLetter(row: Record<string, unknown>): CoverLetterDocument {
  const settings: CoverLetterSettings = {
    template: (row.template as CoverLetterSettings['template']) || DEFAULT_LETTER_SETTINGS.template,
    primaryColor: String(row.primary_color || DEFAULT_LETTER_SETTINGS.primaryColor),
    secondaryColor: String(row.secondary_color || DEFAULT_LETTER_SETTINGS.secondaryColor),
    accentColor: String(row.accent_color || DEFAULT_LETTER_SETTINGS.accentColor),
    font: row.font === 'sans' ? 'sans' : 'serif',
  }
  return {
    id: Number(row.id),
    title: String(row.title),
    data: parseJson(row.data_json, {} as CoverLetterDocument['data']),
    settings,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export function mapLanding(row: Record<string, unknown>): LandingPageDocument {
  return {
    id: Number(row.id),
    title: String(row.title),
    slug: String(row.slug),
    template: (row.template as LandingTemplateId) || 'modern',
    primaryColor: String(row.primary_color || '#1677ff'),
    secondaryColor: String(row.secondary_color || '#0f3b66'),
    accentColor: String(row.accent_color || '#13c2c2'),
    font: row.font === 'serif' ? 'serif' : 'sans',
    published: Number(row.published) === 1,
    publishedAt: row.published_at ? String(row.published_at) : null,
    data: parseJson(row.data_json, {} as LandingPageDocument['data']),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export function shareIsLive(row: Record<string, unknown>): boolean {
  if (Number(row.share_enabled) !== 1 || !row.share_id) return false
  if (row.share_expires_at && new Date(String(row.share_expires_at)).getTime() < Date.now()) return false
  return true
}
