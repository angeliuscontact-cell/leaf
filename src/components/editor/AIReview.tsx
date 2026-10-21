import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Sparkles, Target, Wrench } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { TextAreaField } from '../ui/Form'
import { Badge } from '../ui/Feedback'
import { api } from '../../lib/api'
import { cn, errorMessage } from '../../lib/utils'
import type { AIReviewIssue, AIReviewResult, AIUsage } from '../../../shared/types'

function IssueGroup({
  title,
  items,
  tone,
  icon: Icon,
}: {
  title: string
  items: AIReviewIssue[]
  tone: 'danger' | 'primary' | 'neutral'
  icon: typeof AlertTriangle
}) {
  if (!items.length) return null
  const color = {
    danger: 'text-danger bg-danger/8',
    primary: 'text-primary bg-primary/8',
    neutral: 'text-muted bg-raised',
  }[tone]
  return (
    <div>
      <h3 className="flex items-center gap-1.5 text-xs font-bold text-ink">
        <span className={cn('flex h-5 w-5 items-center justify-center rounded', color)}><Icon size={11} /></span>
        {title}
        <span className="text-[10px] font-normal text-muted">{items.length}</span>
      </h3>
      <ul className="mt-2 space-y-2">
        {items.map((item, index) => (
          <li key={`${item.section}-${index}`} className="rounded-md border border-line bg-raised/30 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{item.section}</p>
            <p className="mt-0.5 text-[11px] leading-5 text-ink">{item.message}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function AIReviewDialog({
  open,
  onClose,
  docType,
  docId,
  title,
  onBeforeReview,
}: {
  open: boolean
  onClose: () => void
  docType: 'cv' | 'cover_letter' | 'landing'
  docId: number
  title: string
  onBeforeReview?: () => Promise<void>
}) {
  const [jobDescription, setJobDescription] = useState('')
  const [showJob, setShowJob] = useState(false)
  const [review, setReview] = useState<AIReviewResult | null>(null)
  const [usage, setUsage] = useState<AIUsage | null>(null)
  const [busy, setBusy] = useState(false)
  const [localBusy, setLocalBusy] = useState(false)
  const [error, setError] = useState('')
  const [localError, setLocalError] = useState('')

  const run = useCallback(
    async (local = false) => {
      if (local) {
        setLocalBusy(true)
        setLocalError('')
      } else {
        setBusy(true)
        setError('')
      }
      try {
        await onBeforeReview?.()
        const result = await api.post<{ review: AIReviewResult; usage: AIUsage }>(local ? '/ai/local-review' : '/ai/review', {
          docType,
          docId,
          jobDescription,
        })
        setReview(result.review)
        setUsage(result.usage)
      } catch (err) {
        if (local) setLocalError(errorMessage(err))
        else setError(errorMessage(err))
      } finally {
        if (local) setLocalBusy(false)
        else setBusy(false)
      }
    },
    [docType, docId, jobDescription, onBeforeReview],
  )

  useEffect(() => {
    if (!open) return
    setReview(null)
    setError('')
    setLocalError('')
    setJobDescription('')
    setShowJob(false)
    void run(false)
    // Only run when the dialog opens; subsequent runs are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const score = review?.score
  const circumference = 2 * Math.PI * 30

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Review this document"
      description="A second pair of eyes on clarity, completeness and evidence. Suggestions never edit your document automatically."
      size="lg"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
          <button type="button" className="btn-primary" onClick={() => void run(false)} disabled={busy || localBusy}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Review again
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-md border border-line bg-raised/35 p-3.5">
          <button
            type="button"
            onClick={() => setShowJob((value) => !value)}
            className="flex w-full items-center justify-between gap-3 text-left"
            aria-expanded={showJob}
          >
            <span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-ink"><Target size={13} className="text-primary" /> Match against a job description</span>
              <span className="mt-0.5 block text-[10px] text-muted">Optional. Paste only what the employer published.</span>
            </span>
            <span className="text-[10px] font-semibold text-primary">{showJob ? 'Hide' : 'Add'}</span>
          </button>
          {showJob && (
            <TextAreaField
              label="Job description"
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              rows={5}
              hint="LEAF will flag terms you might be missing, but never tells you to claim experience you do not have."
              wrapClassName="mt-3"
            />
          )}
        </div>

        {busy && !review ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles size={20} className={busy ? 'animate-pulse' : ''} />
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-ink">Reading your document carefully</p>
              <p className="mt-1 text-xs text-muted">Checking structure, evidence and clarity. This may take a few seconds.</p>
            </div>
          </div>
        ) : error && !review ? (
          <div className="rounded-lg border border-line bg-surface p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
              <AlertTriangle size={17} />
            </div>
            <h3 className="mt-3 text-sm font-bold text-ink">The AI review is unavailable</h3>
            <p className="mt-1 text-xs leading-5 text-muted">{error}</p>
            <p className="mt-2 text-[11px] leading-5 text-muted">
              You can still run a local structural check. It looks at missing essentials and plain-language issues without sending your document to an AI provider.
            </p>
            {localError && <p className="mt-2 text-xs text-danger">{localError}</p>}
            <button type="button" className="btn-secondary btn-sm mt-3" onClick={() => void run(true)} disabled={localBusy}>
              {localBusy ? <Loader2 size={13} className="animate-spin" /> : <Wrench size={13} />} Run local structural check
            </button>
          </div>
        ) : review ? (
          <>
            <div className="flex flex-col gap-4 rounded-lg border border-line bg-gradient-to-br from-primary/[0.055] to-transparent p-4 sm:flex-row sm:items-center">
              <div className="relative h-[74px] w-[74px] shrink-0" aria-label={score === null ? 'No score' : `Score ${score} out of 100`}>
                <svg viewBox="0 0 74 74" className="h-full w-full -rotate-90">
                  <circle cx="37" cy="37" r="30" fill="none" stroke="rgb(var(--line))" strokeWidth="6" />
                  <circle
                    cx="37"
                    cy="37"
                    r="30"
                    fill="none"
                    stroke={review.critical.length ? 'rgb(var(--danger))' : 'rgb(var(--primary))'}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - (score ?? 0) / 100)}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold leading-none text-ink">{score ?? '—'}</span>
                  <span className="text-[8px] font-bold uppercase tracking-wide text-muted">of 100</span>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={review.source === 'ai' ? 'primary' : 'neutral'}>
                    {review.source === 'ai' ? <><Sparkles size={10} /> AI suggestions</> : <><Wrench size={10} /> Local structural check</>}
                  </Badge>
                  {review.source === 'local' && <span className="text-[10px] text-muted">No AI provider was used</span>}
                </div>
                <p className="mt-2 text-xs leading-5 text-ink">{review.summary}</p>
                <p className="mt-1 text-[10px] leading-4 text-muted">{title}</p>
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-[11px] leading-5 text-amber-800 dark:text-amber-200">
                {error} The result below is the previous review.
                <button type="button" className="ml-1 font-bold underline" onClick={() => void run(true)}>Run a local check instead</button>
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <IssueGroup title="Fix before sending" items={review.critical} tone="danger" icon={AlertTriangle} />
              <IssueGroup title="Worth improving" items={review.improvements} tone="primary" icon={Target} />
              <IssueGroup title="Optional polish" items={review.optional} tone="neutral" icon={CheckCircle2} />
              {review.missing.length > 0 && (
                <div>
                  <h3 className="flex items-center gap-1.5 text-xs font-bold text-ink">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-raised text-muted"><CheckCircle2 size={11} /></span>
                    Not present yet
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {review.missing.map((item) => <span key={item} className="badge">{item}</span>)}
                  </div>
                </div>
              )}
            </div>

            {review.source === 'ai' && (
              <p className="flex items-start gap-2 rounded-md bg-raised px-3 py-2.5 text-[10px] leading-5 text-muted">
                <Sparkles size={12} className="mt-0.5 shrink-0 text-primary" />
                AI can misread context. Check every suggestion against your own experience before changing a document.
              </p>
            )}
            {usage && <p className="text-[10px] text-muted">AI usage today: {usage.used} of {usage.limit} actions.</p>}
          </>
        ) : null}
      </div>
    </Modal>
  )
}
