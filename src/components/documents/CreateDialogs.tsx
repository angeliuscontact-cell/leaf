import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Image, Sparkles } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { TextField, Checkbox } from '../ui/Form'
import { Spinner } from '../ui/Feedback'
import { useToast } from '../../context/ToastContext'
import { api } from '../../lib/api'
import { errorMessage, cn } from '../../lib/utils'
import {
  CV_TEMPLATES,
  LETTER_TEMPLATES,
  LANDING_TEMPLATES,
  DEFAULT_CV_SETTINGS,
  DEFAULT_LETTER_SETTINGS,
  COLOR_PRESETS,
} from '../../../shared/templates'
import { emptyCVData, emptyCoverLetterData, emptyLandingData } from '../../../shared/defaults'
import {
  cvDataFromProfile,
  coverLetterSenderFromProfile,
  landingDataFromProfile,
} from '../../../shared/profile'
import type {
  CoverLetterDocument,
  LetterTemplateId,
  CVDocument,
  CVTemplateId,
  LandingPageDocument,
  LandingTemplateId,
  Profile,
} from '../../../shared/types'

type Kind = 'cv' | 'letter' | 'landing'

function TemplatePicker<T extends string>({
  templates,
  value,
  onChange,
}: {
  templates: Array<{ id: T; name: string; description: string; accent: string; badge?: string; category: string }>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {templates.map((template) => {
        const selected = value === template.id
        return (
          <button
            key={template.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(template.id)}
            className={cn(
              'group relative overflow-hidden rounded-md border p-2 text-left transition',
              selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-line bg-surface hover:border-primary/40 hover:bg-raised',
            )}
          >
            <span className="relative block aspect-[3/4] overflow-hidden rounded border border-line bg-white p-2.5 shadow-sm">
              <span className="block h-1.5 w-7 rounded-full" style={{ backgroundColor: template.accent }} />
              <span className="mt-2 block h-2 w-3/4 rounded-sm bg-slate-800" />
              <span className="mt-1 block h-1 w-1/2 rounded-sm bg-slate-400" />
              <span className="mt-3 block h-px w-full bg-slate-200" />
              <span className="mt-2 space-y-1">
                <span className="block h-1 w-full rounded bg-slate-200" />
                <span className="block h-1 w-5/6 rounded bg-slate-200" />
                <span className="block h-1 w-11/12 rounded bg-slate-200" />
              </span>
              <span className="mt-3 block h-1.5 w-1/3 rounded bg-slate-700" />
              <span className="mt-1.5 space-y-1">
                <span className="block h-1 w-full rounded bg-slate-100" />
                <span className="block h-1 w-4/5 rounded bg-slate-100" />
              </span>
              <span
                className="absolute -bottom-4 -right-4 h-12 w-12 rounded-full opacity-20"
                style={{ backgroundColor: template.accent }}
              />
            </span>
            <span className="mt-2 flex items-start justify-between gap-1">
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-bold text-ink">{template.name}</span>
                <span className="block truncate text-[9px] text-muted">{template.category}</span>
              </span>
              {selected && (
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                  <Check size={10} strokeWidth={3} />
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function ImportNotice({ importing, onChange, photo }: { importing: boolean; onChange: (value: boolean) => void; photo: boolean }) {
  return (
    <div className="rounded-md border border-line bg-raised/65 p-3.5">
      <Checkbox
        label="Fill this document from my career profile"
        description="Your real details are copied in. Nothing is invented, and you can edit every field."
        checked={importing}
        onChange={(event) => onChange(event.target.checked)}
      />
      {importing && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-line pt-2.5 text-[10px] text-muted">
          <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-1 font-semibold">
            <Sparkles size={10} className="text-primary" /> Contact, summary, experience, education, skills
          </span>
          {photo && (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-1 font-semibold">
              <Image size={10} className="text-accent" /> Your profile photo
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function useProfileForCreate(open: boolean) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    api
      .get<{ profile: Profile }>('/profile')
      .then((result) => !cancelled && setProfile(result.profile))
      .catch(() => !cancelled && setProfile(null))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [open])
  return { profile, loading }
}

function CreateFooter({ onClose, onCreate, busy, label }: { onClose: () => void; onCreate: () => void; busy: boolean; label: string }) {
  return (
    <>
      <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
        Cancel
      </button>
      <button type="button" className="btn-primary" onClick={onCreate} disabled={busy} aria-busy={busy}>
        {busy ? <Spinner size={15} /> : <ArrowRight size={15} />}
        {label}
      </button>
    </>
  )
}

function Notice({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border border-danger/20 bg-danger/5 px-3 py-2.5 text-xs text-danger">{children}</div>
}

export function CreateCvDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (cv: CVDocument) => void }) {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { profile, loading } = useProfileForCreate(open)
  const [template, setTemplate] = useState<CVTemplateId>('classic')
  const [importing, setImporting] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setError('')
      setTemplate('classic')
      setImporting(true)
    }
  }, [open])

  const hasProfile = useMemo(() => {
    if (!profile) return false
    return Boolean(profile.fullName || profile.summary || profile.experiences.length || profile.education.length)
  }, [profile])

  const create = async () => {
    setBusy(true)
    setError('')
    try {
      const data = importing && profile && hasProfile ? cvDataFromProfile(profile) : emptyCVData()
      const settings = {
        ...DEFAULT_CV_SETTINGS,
        template,
        showPhoto: Boolean(importing && profile?.photoUrl && CV_TEMPLATES.find((t) => t.id === template)?.supportsPhoto),
      }
      const result = await api.post<{ cv: CVDocument }>('/cvs', { title: 'Untitled CV', template, data, settings })
      addToast({ type: 'success', title: 'CV created', message: 'Your live preview is ready to edit.' })
      onCreated?.(result.cv)
      onClose()
      navigate(`/app/cvs/${result.cv.id}`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title="Create a CV"
      description="Choose a starting layout. Your document is private until you explicitly share it."
      size="lg"
      footer={<CreateFooter onClose={onClose} onCreate={create} busy={busy} label="Create CV" />}
    >
      {loading ? (
        <div className="flex min-h-48 items-center justify-center"><Spinner className="text-primary" size={24} /></div>
      ) : (
        <div className="space-y-5">
          {error && <Notice>{error}</Notice>}
          <div>
            <p className="label">Template</p>
            <TemplatePicker templates={CV_TEMPLATES} value={template} onChange={setTemplate} />
            <p className="hint">{CV_TEMPLATES.find((item) => item.id === template)?.description}</p>
          </div>
          {hasProfile ? (
            <ImportNotice importing={importing} onChange={setImporting} photo={Boolean(profile?.photoUrl)} />
          ) : (
            <div className="rounded-md border border-dashed border-line bg-raised/50 px-4 py-3 text-xs leading-5 text-muted">
              Your career profile is still empty, so this CV will start with a blank canvas. You can fill your profile later and import it at any time.
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {COLOR_PRESETS.slice(0, 4).map((preset) => (
              <span key={preset.name} className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-1 text-[10px] text-muted">
                <span className="h-2 w-2 rounded-full" style={{ background: preset.primary }} /> {preset.name}
              </span>
            ))}
            <span className="inline-flex items-center rounded-full bg-raised px-2 py-1 text-[10px] text-muted">Customise colour and typography inside</span>
          </div>
        </div>
      )}
    </Modal>
  )
}

export function CreateLetterDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { profile, loading } = useProfileForCreate(open)
  const [template, setTemplate] = useState<LetterTemplateId>('classic')
  const [importing, setImporting] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setError('')
      setTemplate('classic')
      setImporting(true)
    }
  }, [open])

  const create = async () => {
    setBusy(true)
    setError('')
    try {
      const sender = importing && profile ? coverLetterSenderFromProfile(profile) : undefined
      const data = emptyCoverLetterData(sender)
      const settings = { ...DEFAULT_LETTER_SETTINGS, template }
      const result = await api.post<{ letter: CoverLetterDocument }>('/cover-letters', {
        title: 'Untitled cover letter',
        template,
        data,
        settings,
      })
      addToast({ type: 'success', title: 'Cover letter created', message: 'Add the role and company to make it specific.' })
      onClose()
      navigate(`/app/letters/${result.letter.id}`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title="Create a cover letter"
      description="Start from your profile, then tailor the letter to one role and company."
      size="lg"
      footer={<CreateFooter onClose={onClose} onCreate={create} busy={busy} label="Create letter" />}
    >
      {loading ? (
        <div className="flex min-h-48 items-center justify-center"><Spinner className="text-primary" size={24} /></div>
      ) : (
        <div className="space-y-5">
          {error && <Notice>{error}</Notice>}
          <div>
            <p className="label">Layout</p>
            <TemplatePicker templates={LETTER_TEMPLATES} value={template} onChange={setTemplate} />
          </div>
          <ImportNotice importing={importing} onChange={setImporting} photo={Boolean(profile?.photoUrl)} />
          <p className="text-xs leading-5 text-muted">
            A strong letter names the role, shows one or two pieces of real evidence, and ends with a clear invitation to talk.
          </p>
        </div>
      )}
    </Modal>
  )
}

export function CreateLandingDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { profile, loading } = useProfileForCreate(open)
  const [template, setTemplate] = useState<LandingTemplateId>('modern')
  const [importing, setImporting] = useState(true)
  const [title, setTitle] = useState('My professional page')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setError('')
      setTemplate('modern')
      setImporting(true)
      setTitle('My professional page')
    }
  }, [open])

  const create = async () => {
    setBusy(true)
    setError('')
    try {
      let data = emptyLandingData()
      if (importing && profile) {
        const fromProfile = landingDataFromProfile(profile)
        data = {
          ...data,
          ...fromProfile,
          hero: { ...data.hero, ...fromProfile.hero },
          contact: { ...data.contact, ...fromProfile.contact },
        }
      }
      const settings = {
        template,
        primaryColor: '#1677ff',
        secondaryColor: '#0f3b66',
        accentColor: '#13c2c2',
        font: template === 'executive' ? ('serif' as const) : ('sans' as const),
      }
      const result = await api.post<{ page: LandingPageDocument }>('/landing-pages', { title: title.trim() || 'My professional page', template, data, settings })
      addToast({
        type: 'success',
        title: 'Personal site draft created',
        message: 'Preview it now, then publish when you are happy with it.',
      })
      onClose()
      navigate(`/app/pages/${result.page.id}`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title="Create a personal site"
      description="A calm one-page portfolio. Nothing is public until you choose to publish it."
      size="lg"
      footer={<CreateFooter onClose={onClose} onCreate={create} busy={busy} label="Create draft" />}
    >
      {loading ? (
        <div className="flex min-h-48 items-center justify-center"><Spinner className="text-primary" size={24} /></div>
      ) : (
        <div className="space-y-5">
          {error && <Notice>{error}</Notice>}
          <TextField
            label="Internal page name"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            hint="Only you see this name; your public address is chosen later."
            maxLength={120}
          />
          <div>
            <p className="label">Template</p>
            <TemplatePicker templates={LANDING_TEMPLATES} value={template} onChange={setTemplate} />
          </div>
          {importing && profile && (
            <p className="text-xs leading-5 text-muted">
              We will bring in your profile summary, skills, experience and contact details. Every section can be reordered or hidden.
            </p>
          )}
          <ImportNotice importing={importing} onChange={setImporting} photo={Boolean(profile?.photoUrl)} />
        </div>
      )}
    </Modal>
  )
}
