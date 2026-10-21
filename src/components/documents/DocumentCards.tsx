import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  Copy,
  Download,
  Eye,
  FileText,
  Globe2,
  Link2,
  Loader2,
  MoreHorizontal,
  Pencil,
  Share2,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { DocumentPreview } from '../DocumentPreview'
import { ActionMenu } from '../ui/ActionMenu'
import { Badge } from '../ui/Feedback'
import { useToast } from '../../context/ToastContext'
import { api, downloadPdf } from '../../lib/api'
import { cn, copyText, errorMessage, formatDate, timeAgo } from '../../lib/utils'
import { renderCVDocument, renderCoverLetterDocument } from '../../../shared/renderDocument'
import type {
  CoverLetterDocument,
  CVDocument,
  CVDocumentSummary,
  LandingPageDocument,
} from '../../../shared/types'

function PreviewFrame({
  to,
  html,
  label,
  badge,
}: {
  to: string
  html: string
  label: string
  badge?: React.ReactNode
}) {
  return (
    <div className="group/preview relative overflow-hidden rounded-t-lg border-b border-line bg-[#e9edf2] dark:bg-[#0f1725]">
      <Link to={to} aria-label={label} className="pointer-events-auto block p-2.5 transition duration-500 group-hover/preview:bg-white/30 sm:p-3.5">
        <div className="pointer-events-none relative overflow-hidden rounded-sm shadow-[0_8px_25px_-10px_rgba(15,23,42,.35)]">
          <DocumentPreview html={html} title={`${label} preview`} firstPage />
        </div>
      </Link>
      <div className="pointer-events-none absolute inset-x-2.5 bottom-2.5 flex translate-y-1 items-center justify-center rounded-md bg-[#0d1b2e]/85 px-3 py-2 text-[11px] font-semibold text-white opacity-0 shadow-lg backdrop-blur transition duration-200 group-hover/preview:translate-y-0 group-hover/preview:opacity-100 sm:inset-x-3.5">
        <Pencil size={12} className="mr-1.5" /> Open in editor
      </div>
      {badge && <div className="pointer-events-none absolute left-4 top-4 z-10">{badge}</div>}
    </div>
  )
}

function CardShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <article className={cn('card card-hover group relative flex min-w-0 flex-col overflow-hidden', className)}>{children}</article>
}

function CardFooter({ title, meta, menu }: { title: React.ReactNode; meta: React.ReactNode; menu: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 p-3.5 pt-3">
      <div className="min-w-0 flex-1">{title}<div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">{meta}</div></div>
      <div className="relative z-10 shrink-0">{menu}</div>
    </div>
  )
}

function MenuButton({ items }: { items: Parameters<typeof ActionMenu>[0]['items'] }) {
  return (
    <ActionMenu
      items={items}
      label="Document actions"
      trigger={
        <span className="icon-btn h-8 w-8 border border-transparent hover:border-line">
          <MoreHorizontal size={17} />
        </span>
      }
    />
  )
}

function downloadWithToast(
  path: string,
  filename: string,
  addToast: ReturnType<typeof useToast>['addToast'],
  setBusy: (busy: boolean) => void,
) {
  setBusy(true)
  downloadPdf(path, filename)
    .then(() => addToast({ type: 'success', title: 'PDF downloaded', message: 'Your document was rendered with selectable text.' }))
    .catch((error) => addToast({ type: 'error', title: 'Could not create PDF', message: errorMessage(error) }))
    .finally(() => setBusy(false))
}

export function CVDocumentCard({
  cv,
  onDelete,
  onShare,
  onDuplicated,
  className,
}: {
  cv: CVDocumentSummary | CVDocument
  onDelete: (cv: CVDocumentSummary | CVDocument) => void
  onShare: (cv: CVDocumentSummary | CVDocument) => void
  onDuplicated?: (cv: CVDocument) => void
  className?: string
}) {
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const html = useMemo(() => renderCVDocument(cv, { preview: true }), [cv])
  const live = cv.shareEnabled && cv.shareId

  const duplicate = async () => {
    setBusy(true)
    try {
      const result = await api.post<{ cv: CVDocument }>(`/cvs/${cv.id}/duplicate`)
      addToast({ type: 'success', title: 'CV duplicated', message: 'A separate copy is ready to edit.' })
      if (onDuplicated) onDuplicated(result.cv)
      else navigate(`/app/cvs/${result.cv.id}`)
    } catch (error) {
      addToast({ type: 'error', title: 'Could not duplicate', message: errorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <CardShell className={className}>
      <PreviewFrame
        to={`/app/cvs/${cv.id}`}
        html={html}
        label={`Open ${cv.title}`}
        badge={live ? <Badge tone="success"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Shared</Badge> : undefined}
      />
      <CardFooter
        title={
          <Link to={`/app/cvs/${cv.id}`} className="block truncate text-[13px] font-bold text-ink hover:text-primary">
            {cv.title}
          </Link>
        }
        meta={
          <>
            <span className="capitalize">{cv.settings.template}</span>
            <span className="text-line">·</span>
            <span>Edited {timeAgo(cv.updatedAt)}</span>
          </>
        }
        menu={
          <MenuButton
            items={[
              { label: 'Open editor', icon: <Pencil size={15} />, onClick: () => navigate(`/app/cvs/${cv.id}`) },
              { label: 'Share & QR', icon: <Share2 size={15} />, onClick: () => onShare(cv) },
              {
                label: live ? 'Copy share link' : 'Share this CV',
                icon: <Link2 size={15} />,
                onClick: () => {
                  if (live) void copyText(`${window.location.origin}/cv/${cv.shareId}`).then((ok) => addToast({ type: ok ? 'success' : 'error', title: ok ? 'Link copied' : 'Could not copy' }))
                  else onShare(cv)
                },
              },
              {
                label: busy ? 'Preparing PDF…' : 'Download PDF',
                icon: busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />,
                disabled: busy,
                onClick: () => downloadWithToast(`/cvs/${cv.id}/pdf`, `${cv.title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'cv'}.pdf`, addToast, setBusy),
              },
              { label: 'Duplicate', icon: <Copy size={15} />, onClick: () => void duplicate(), disabled: busy },
              { label: '', separator: true },
              { label: 'Delete CV', icon: <Trash2 size={15} />, danger: true, onClick: () => onDelete(cv) },
            ]}
          />
        }
      />
    </CardShell>
  )
}

export function LetterDocumentCard({
  letter,
  onDelete,
  onDuplicated,
  className,
}: {
  letter: CoverLetterDocument
  onDelete: (letter: CoverLetterDocument) => void
  onDuplicated?: (letter: CoverLetterDocument) => void
  className?: string
}) {
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const html = useMemo(() => renderCoverLetterDocument(letter, { preview: true }), [letter])

  const duplicate = async () => {
    setBusy(true)
    try {
      const result = await api.post<{ letter: CoverLetterDocument }>(`/cover-letters/${letter.id}/duplicate`)
      addToast({ type: 'success', title: 'Letter duplicated' })
      if (onDuplicated) onDuplicated(result.letter)
      else navigate(`/app/letters/${result.letter.id}`)
    } catch (error) {
      addToast({ type: 'error', title: 'Could not duplicate', message: errorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  const target = letter.data?.company || letter.data?.targetRole || 'General application'

  return (
    <CardShell className={className}>
      <PreviewFrame to={`/app/letters/${letter.id}`} html={html} label={`Open ${letter.title}`} />
      <CardFooter
        title={
          <Link to={`/app/letters/${letter.id}`} className="block truncate text-[13px] font-bold text-ink hover:text-primary">
            {letter.title}
          </Link>
        }
        meta={
          <>
            <span className="truncate">{target}</span>
            <span className="text-line">·</span>
            <span>Edited {timeAgo(letter.updatedAt)}</span>
          </>
        }
        menu={
          <MenuButton
            items={[
              { label: 'Open editor', icon: <Pencil size={15} />, onClick: () => navigate(`/app/letters/${letter.id}`) },
              {
                label: busy ? 'Preparing PDF…' : 'Download PDF',
                icon: busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />,
                disabled: busy,
                onClick: () =>
                  downloadWithToast(
                    `/cover-letters/${letter.id}/pdf`,
                    `${letter.title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'cover-letter'}.pdf`,
                    addToast,
                    setBusy,
                  ),
              },
              { label: 'Duplicate', icon: <Copy size={15} />, onClick: () => void duplicate(), disabled: busy },
              { label: '', separator: true },
              { label: 'Delete letter', icon: <Trash2 size={15} />, danger: true, onClick: () => onDelete(letter) },
            ]}
          />
        }
      />
    </CardShell>
  )
}

function LandingThumbnail({ page }: { page: LandingPageDocument }) {
  const hero = page.data?.hero || { headline: '', eyebrow: '', subheadline: '', availability: '', location: '', ctaLabel: '' }
  const initials = (hero.headline || page.title)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('')
  return (
    <div
      className="relative h-full min-h-[280px] overflow-hidden bg-white p-5"
      style={{
        background: `linear-gradient(145deg, #ffffff 0%, #ffffff 48%, color-mix(in srgb, ${page.primaryColor} 7%, white) 100%)`,
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black tracking-[0.16em]" style={{ color: page.primaryColor }}>
          {hero.headline?.split(' ')[0]?.toUpperCase() || 'LEAF'}
          <span style={{ color: page.accentColor }}>.</span>
        </span>
        <span className="rounded-full px-2 py-1 text-[7px] font-bold uppercase tracking-wider" style={{ background: `${page.primaryColor}12`, color: page.primaryColor }}>
          {hero.availability || 'Available'}
        </span>
      </div>
      <div className="mt-9 grid grid-cols-[1fr_62px] items-end gap-3">
        <div className="min-w-0">
          <p className="text-[7px] font-bold uppercase tracking-[0.2em]" style={{ color: page.accentColor }}>
            {page.template} portfolio
          </p>
          <h3 className="mt-2 font-serif text-[22px] font-semibold leading-[1.04] tracking-tight text-slate-900">
            {hero.headline || page.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-[8px] leading-[1.55] text-slate-500">{hero.subheadline || 'A personal professional page built with LEAF.'}</p>
        </div>
        <div className="flex h-[62px] w-[62px] items-center justify-center overflow-hidden rounded-full" style={{ background: `${page.primaryColor}14`, color: page.primaryColor }}>
          {page.data?.photoUrl ? <img src={page.data.photoUrl} alt="" className="h-full w-full object-cover" /> : <span className="text-lg font-bold">{initials || 'L'}</span>}
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <span className="rounded px-2.5 py-1.5 text-[7px] font-bold text-white" style={{ background: page.primaryColor }}>
          {hero.ctaLabel || 'Get in touch'}
        </span>
        <span className="rounded border border-slate-200 px-2.5 py-1.5 text-[7px] font-bold text-slate-600">View work</span>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
        {['About', 'Experience', 'Projects'].map((label, i) => (
          <div key={label}>
            <p className="text-[7px] font-bold text-slate-800">{label}</p>
            <span className="mt-1.5 block h-1 rounded" style={{ background: i === 0 ? `${page.primaryColor}33` : '#eef1f4', width: `${90 - i * 14}%` }} />
            <span className="mt-1 block h-1 rounded bg-slate-100" style={{ width: `${76 - i * 10}%` }} />
          </div>
        ))}
      </div>
      {page.template === 'creative' && <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-15" style={{ background: page.accentColor }} />}
      {page.template === 'developer' && (
        <div className="absolute bottom-3 left-5 font-mono text-[7px]" style={{ color: page.primaryColor }}>
          &lt;build&gt; · &lt;ship&gt; · &lt;share&gt;
        </div>
      )}
    </div>
  )
}

export function LandingDocumentCard({
  page,
  onDelete,
  onPublish,
  onDuplicated,
  className,
}: {
  page: LandingPageDocument & { publicUrl?: string }
  onDelete: (page: LandingPageDocument) => void
  onPublish?: (page: LandingPageDocument) => void
  onDuplicated?: (page: LandingPageDocument) => void
  className?: string
}) {
  const { addToast } = useToast()
  const navigate = useNavigate()
  const url = `${window.location.origin}/p/${page.slug}`

  return (
    <CardShell className={className}>
      <div className="relative overflow-hidden rounded-t-lg border-b border-line bg-[#e9edf2] p-2.5 dark:bg-[#0f1725] sm:p-3.5">
        <Link to={`/app/pages/${page.id}`} aria-label={`Open ${page.title}`} className="block overflow-hidden rounded-sm shadow-[0_8px_25px_-10px_rgba(15,23,42,.35)] transition duration-500 hover:-translate-y-0.5">
          <div className="aspect-[16/11] overflow-hidden"><LandingThumbnail page={page} /></div>
        </Link>
        <div className="absolute left-4 top-4">
          {page.published ? (
            <Badge tone="success"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Published</Badge>
          ) : (
            <Badge><span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Draft</Badge>
          )}
        </div>
      </div>
      <CardFooter
        title={
          <Link to={`/app/pages/${page.id}`} className="block truncate text-[13px] font-bold text-ink hover:text-primary">
            {page.title}
          </Link>
        }
        meta={
          <>
            <span className="truncate">/p/{page.slug}</span>
            <span className="text-line">·</span>
            <span>Edited {timeAgo(page.updatedAt)}</span>
          </>
        }
        menu={
          <MenuButton
            items={[
              { label: 'Open editor', icon: <Pencil size={15} />, onClick: () => navigate(`/app/pages/${page.id}`) },
              ...(page.published
                ? [
                    { label: 'View live page', icon: <ArrowUpRight size={15} />, href: url },
                    {
                      label: 'Copy public link',
                      icon: <Link2 size={15} />,
                      onClick: () =>
                        void copyText(url).then((ok) => addToast({ type: ok ? 'success' : 'error', title: ok ? 'Public link copied' : 'Could not copy the link' })),
                    },
                  ]
                : []),
              ...(onPublish ? [{ label: page.published ? 'Unpublish' : 'Publish live', icon: <Globe2 size={15} />, onClick: () => onPublish(page) }] : []),
              { label: '', separator: true },
              { label: 'Delete page', icon: <Trash2 size={15} />, danger: true, onClick: () => onDelete(page) },
            ]}
          />
        }
      />
    </CardShell>
  )
}

export function EmptyDocumentGrid({ kind, onCreate }: { kind: 'cv' | 'letter' | 'landing'; onCreate: () => void }) {
  const copy = {
    cv: {
      title: 'Your first CV starts here',
      body: 'Choose a template, bring in your profile and shape a clean, ATS-readable document with a live preview.',
      cta: 'Create your first CV',
      icon: FileText,
    },
    letter: {
      title: 'Write a letter that sounds like you',
      body: 'Start with your real experience, tailor it to the role, and download a one-page PDF when it feels right.',
      cta: 'Write a cover letter',
      icon: Sparkles,
    },
    landing: {
      title: 'A home for your work',
      body: 'Turn your profile into a shareable personal site with one link, a downloadable CV and a calm, modern design.',
      cta: 'Create a personal site',
      icon: Globe2,
    },
  }[kind]
  const Icon = copy.icon
  return (
    <div className="card relative overflow-hidden px-6 py-12 text-center sm:py-16">
      <div className="pointer-events-none absolute inset-0 surface-grid opacity-40" aria-hidden="true" />
      <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon size={24} />
      </div>
      <h2 className="relative mt-4 text-lg font-bold text-ink">{copy.title}</h2>
      <p className="relative mx-auto mt-1.5 max-w-md text-sm leading-6 text-muted">{copy.body}</p>
      <button type="button" className="btn-primary relative mt-5" onClick={onCreate}>
        <Sparkles size={15} /> {copy.cta}
      </button>
      <div className="relative mx-auto mt-8 flex max-w-md flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] text-muted">
        {['No payment required', 'Private by default', 'Real PDF downloads'].map((item) => (
          <span key={item} className="inline-flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-accent" /> {item}</span>
        ))}
      </div>
    </div>
  )
}
