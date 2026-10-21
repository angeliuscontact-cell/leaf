import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  Globe2,
  Lightbulb,
  ListChecks,
  Loader2,
  PenLine,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  WandSparkles,
  Wrench,
} from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge, EmptyState, ProgressBar } from '../../components/ui/Feedback'
import { SelectField, TextAreaField, TextField } from '../../components/ui/Form'
import { useToast } from '../../context/ToastContext'
import { api } from '../../lib/api'
import { cn, copyText, errorMessage, formatDate, timeAgo } from '../../lib/utils'
import type {
  AIReviewIssue,
  AIReviewResult,
  AIUsage,
  CoverLetterDocument,
  CVDocument,
  LandingPageDocument,
} from '../../../shared/types'

type Tab = 'write' | 'skills' | 'review'
type RewriteAction = 'improve' | 'grammar' | 'concise' | 'professional' | 'achievement' | 'summary'
type Tone = 'formal' | 'confident' | 'concise' | 'enthusiastic'

interface ReviewHistoryItem {
  id: number
  docType: string
  docId: number | null
  source: string
  createdAt: string
  review: AIReviewResult | null
}

const TABS: Array<{ id: Tab; label: string; description: string; icon: typeof PenLine }> = [
  { id: 'write', label: 'Writing room', description: 'A scratchpad with focused suggestions', icon: PenLine },
  { id: 'skills', label: 'Skill ideas', description: 'Verify ideas for a target role', icon: ListChecks },
  { id: 'review', label: 'Review a document', description: 'AI or local structural feedback', icon: ShieldCheck },
]

const REWRITE_ACTIONS: Array<{ value: RewriteAction; label: string; hint: string }> = [
  { value: 'improve', label: 'Improve clarity', hint: 'Same facts, stronger flow.' },
  { value: 'grammar', label: 'Proofread', hint: 'Spelling and grammar only.' },
  { value: 'concise', label: 'Shorten', hint: 'Tighter without losing evidence.' },
  { value: 'professional', label: 'Refine tone', hint: 'Grounded and professional.' },
  { value: 'achievement', label: 'Achievement bullets', hint: 'Turn notes into scannable bullets.' },
  { value: 'summary', label: 'Write a summary', hint: 'A short, factual professional summary.' },
]

const DOC_LABELS: Record<string, string> = {
  cv: 'CV',
  cover_letter: 'Cover letter',
  landing: 'Personal site',
}

function docHref(docType: string, docId: number | null) {
  if (!docId) return null
  if (docType === 'cv') return `/app/cvs/${docId}`
  if (docType === 'cover_letter') return `/app/letters/${docId}`
  if (docType === 'landing') return `/app/pages/${docId}`
  return null
}

function ScoreRing({ score, danger }: { score: number | null; danger?: boolean }) {
  const circumference = 2 * Math.PI * 28
  return (
    <div className="relative h-[68px] w-[68px] shrink-0" aria-label={score === null ? 'No score' : `Score ${score} out of 100`}>
      <svg viewBox="0 0 68 68" className="h-full w-full -rotate-90">
        <circle cx="34" cy="34" r="28" fill="none" stroke="rgb(var(--line))" strokeWidth="5" />
        <circle
          cx="34"
          cy="34"
          r="28"
          fill="none"
          stroke={danger ? 'rgb(var(--danger))' : 'rgb(var(--primary))'}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - (score ?? 0) / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-bold leading-none text-ink">{score ?? '—'}</span>
        <span className="text-[7px] font-bold uppercase tracking-wide text-muted">of 100</span>
      </div>
    </div>
  )
}

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
    danger: 'text-danger bg-danger/10',
    primary: 'text-primary bg-primary/10',
    neutral: 'text-muted bg-raised',
  }[tone]
  return (
    <div>
      <h4 className="flex items-center gap-1.5 text-xs font-bold text-ink">
        <span className={cn('flex h-5 w-5 items-center justify-center rounded', color)}><Icon size={11} /></span>
        {title}
        <span className="text-[10px] font-normal text-muted">{items.length}</span>
      </h4>
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

function ReviewResultPanel({ review, title }: { review: AIReviewResult; title: string }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-lg border border-line bg-gradient-to-br from-primary/[0.055] to-transparent p-4 sm:flex-row sm:items-center">
        <ScoreRing score={review.score} danger={review.critical.length > 0} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={review.source === 'ai' ? 'primary' : 'neutral'}>
              {review.source === 'ai' ? <><Sparkles size={10} /> AI suggestions</> : <><Wrench size={10} /> Local structural check</>}
            </Badge>
            {review.source === 'local' && <span className="text-[10px] text-muted">No AI provider was used</span>}
          </div>
          <p className="mt-2 text-xs leading-5 text-ink">{review.summary}</p>
          <p className="mt-1 text-[10px] text-muted">{title}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <IssueGroup title="Fix before sending" items={review.critical} tone="danger" icon={AlertTriangle} />
        <IssueGroup title="Worth improving" items={review.improvements} tone="primary" icon={Target} />
        <IssueGroup title="Optional polish" items={review.optional} tone="neutral" icon={CheckCircle2} />
        {review.missing.length > 0 && (
          <div>
            <h4 className="flex items-center gap-1.5 text-xs font-bold text-ink">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-raised text-muted"><CheckCircle2 size={11} /></span>
              Not present yet
            </h4>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {review.missing.map((item) => <span key={item} className="badge">{item}</span>)}
            </div>
          </div>
        )}
      </div>
      {review.source === 'ai' && (
        <p className="flex items-start gap-2 rounded-md bg-raised px-3 py-2.5 text-[10px] leading-5 text-muted">
          <Sparkles size={12} className="mt-0.5 shrink-0 text-primary" />
          AI can misread context. Check every suggestion against your real experience before changing a document.
        </p>
      )}
    </div>
  )
}

export function AssistantPage() {
  const { addToast } = useToast()
  const [tab, setTab] = useState<Tab>('write')
  const [usage, setUsage] = useState<AIUsage | null>(null)
  const [provider, setProvider] = useState<string | null>(null)
  const [statusError, setStatusError] = useState('')
  const [cvs, setCvs] = useState<CVDocument[]>([])
  const [letters, setLetters] = useState<CoverLetterDocument[]>([])
  const [landings, setLandings] = useState<LandingPageDocument[]>([])
  const [history, setHistory] = useState<ReviewHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  const [scratch, setScratch] = useState('')
  const [action, setAction] = useState<RewriteAction>('improve')
  const [tone, setTone] = useState<Tone>('confident')
  const [suggestion, setSuggestion] = useState('')
  const [writeBusy, setWriteBusy] = useState(false)
  const [writeError, setWriteError] = useState('')

  const [role, setRole] = useState('')
  const [existingSkills, setExistingSkills] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [showJob, setShowJob] = useState(false)
  const [skillIdeas, setSkillIdeas] = useState<string[]>([])
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [skillsBusy, setSkillsBusy] = useState(false)
  const [skillsError, setSkillsError] = useState('')

  const [reviewDocKey, setReviewDocKey] = useState('')
  const [reviewJob, setReviewJob] = useState('')
  const [showReviewJob, setShowReviewJob] = useState(false)
  const [review, setReview] = useState<AIReviewResult | null>(null)
  const [reviewTitle, setReviewTitle] = useState('')
  const [reviewBusy, setReviewBusy] = useState<'ai' | 'local' | null>(null)
  const [reviewError, setReviewError] = useState('')

  const loadStatus = useCallback(() => {
    setStatusError('')
    api
      .get<{ usage: AIUsage; provider: string }>('/ai/status')
      .then((result) => {
        setUsage(result.usage)
        setProvider(result.provider)
      })
      .catch((error) => setStatusError(errorMessage(error)))
  }, [])

  const loadHistory = useCallback(() => {
    setHistoryLoading(true)
    api
      .get<{ reviews: ReviewHistoryItem[] }>('/ai/reviews')
      .then((result) => setHistory(result.reviews))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false))
  }, [])

  useEffect(() => {
    loadStatus()
    loadHistory()
    void Promise.allSettled([
      api.get<{ cvs: CVDocument[] }>('/cvs').then((result) => setCvs(result.cvs)),
      api.get<{ letters: CoverLetterDocument[] }>('/cover-letters').then((result) => setLetters(result.letters)),
      api.get<{ pages: LandingPageDocument[] }>('/landing-pages').then((result) => setLandings(result.pages)),
    ])
  }, [loadStatus, loadHistory])

  const configured = usage?.configured
  const aiReady = configured !== false && provider !== 'not-configured'

  const docOptions = useMemo(
    () => [
      ...cvs.map((doc) => ({ key: `cv:${doc.id}`, type: 'cv' as const, id: doc.id, title: doc.title })),
      ...letters.map((doc) => ({ key: `cover_letter:${doc.id}`, type: 'cover_letter' as const, id: doc.id, title: doc.title })),
      ...landings.map((doc) => ({ key: `landing:${doc.id}`, type: 'landing' as const, id: doc.id, title: doc.title })),
    ],
    [cvs, letters, landings],
  )

  useEffect(() => {
    if (!reviewDocKey && docOptions.length > 0) setReviewDocKey(docOptions[0].key)
  }, [docOptions, reviewDocKey])

  const selectedDoc = docOptions.find((doc) => doc.key === reviewDocKey)

  const selectedAction = REWRITE_ACTIONS.find((item) => item.value === action)!

  const refreshUsage = (next: AIUsage) => setUsage(next)

  const runRewrite = async () => {
    setWriteBusy(true)
    setWriteError('')
    try {
      const result = await api.post<{ text: string; usage: AIUsage }>('/ai/rewrite', {
        action,
        text: scratch,
        context: '',
        tone,
      })
      setSuggestion(result.text)
      refreshUsage(result.usage)
    } catch (error) {
      setWriteError(errorMessage(error))
    } finally {
      setWriteBusy(false)
    }
  }

  const runSkills = async () => {
    setSkillsBusy(true)
    setSkillsError('')
    try {
      const existing = existingSkills
        .split(/[,;\n]/)
        .map((value) => value.trim())
        .filter(Boolean)
      const result = await api.post<{ skills: string[]; usage: AIUsage }>('/ai/skills', {
        role,
        existing,
        jobDescription,
      })
      setSkillIdeas(result.skills)
      setSelectedSkills([])
      refreshUsage(result.usage)
      if (result.skills.length === 0) {
        addToast({ type: 'info', title: 'No new skill ideas', message: 'The model could not add anything beyond the skills you already listed. Try a more specific role.' })
      }
    } catch (error) {
      setSkillsError(errorMessage(error))
    } finally {
      setSkillsBusy(false)
    }
  }

  const runReview = async (local: boolean) => {
    if (!selectedDoc) return
    setReviewBusy(local ? 'local' : 'ai')
    setReviewError('')
    try {
      const result = await api.post<{ review: AIReviewResult; usage: AIUsage }>(local ? '/ai/local-review' : '/ai/review', {
        docType: selectedDoc.type,
        docId: selectedDoc.id,
        jobDescription: reviewJob,
      })
      setReview(result.review)
      setReviewTitle(selectedDoc.title)
      refreshUsage(result.usage)
      loadHistory()
    } catch (error) {
      setReviewError(errorMessage(error))
    } finally {
      setReviewBusy(null)
    }
  }

  const copySuggestion = async () => {
    const ok = await copyText(suggestion)
    addToast({ type: ok ? 'success' : 'error', title: ok ? 'Suggestion copied' : 'Could not copy' })
  }

  const copySelectedSkills = async () => {
    const text = selectedSkills.length ? selectedSkills.join('\n') : skillIdeas.join('\n')
    const ok = await copyText(text)
    addToast({ type: ok ? 'success' : 'error', title: ok ? 'Skills copied' : 'Could not copy', message: ok ? 'Add only the ones that truthfully describe your experience.' : undefined })
  }

  const latestReview = history[0]?.review
  const reviewCount = history.length

  return (
    <div className="mx-auto max-w-[1180px]">
      <PageHeader
        eyebrow="Assistant"
        title="A second pair of eyes, not a ghostwriter."
        description="Work on words without touching a document, verify skill ideas for a role, or run an honest review. AI is optional; every manual tool here still works without it."
        actions={
          <Link to="/app" className="btn-secondary">
            Back to workspace <ArrowUpRight size={15} />
          </Link>
        }
      />

      <div className={cn('mb-5 flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between', aiReady ? 'border-primary/20 bg-primary/[0.045]' : 'border-amber-500/25 bg-amber-500/[0.055]')}>
        <div className="flex items-start gap-3">
          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', aiReady ? 'bg-primary/10 text-primary' : 'bg-amber-500/10 text-amber-600')}>
            {aiReady ? <Sparkles size={17} /> : <Wrench size={17} />}
          </span>
          <div>
            <p className="text-sm font-bold text-ink">{aiReady ? 'AI assistance is available' : 'AI is not configured on this server'}</p>
            <p className="mt-0.5 max-w-[60ch] text-[11px] leading-5 text-muted">
              {aiReady
                ? 'Suggestions use only the text you provide and arrive as editable drafts. Manual editing is always unlimited.'
                : 'You can still use the local structural check, writing room and every document editor. Ask the administrator to add AI_API_KEY to enable AI suggestions.'}
            </p>
            {statusError && <p className="mt-1 text-[10px] text-danger">{statusError}</p>}
          </div>
        </div>
        {usage && (
          <div className="w-full shrink-0 sm:w-[210px]">
            <div className="flex items-center justify-between text-[10px] font-semibold text-muted">
              <span>Today’s AI actions</span>
              <span>{usage.used} / {usage.limit}</span>
            </div>
            <ProgressBar value={usage.limit ? (usage.used / usage.limit) * 100 : 0} className="mt-1.5" />
            <p className="mt-1 text-[10px] text-muted">{usage.remaining} remaining · resets daily</p>
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex w-fit max-w-full flex-wrap rounded-lg border border-line bg-surface p-1" role="tablist" aria-label="Assistant tools">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition',
                    tab === id ? 'bg-primary/10 text-primary' : 'text-muted hover:text-ink',
                  )}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted">{TABS.find((item) => item.id === tab)?.description}</p>
          </div>

          {tab === 'write' && (
            <div className="card p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-ink">Writing room</h2>
                  <p className="mt-0.5 text-[11px] leading-5 text-muted">Paste a paragraph, a bullet or a rough note. Nothing is saved or attached to a document.</p>
                </div>
                <Badge tone="neutral"><Lightbulb size={10} /> Scratchpad</Badge>
              </div>

              <div className="mt-4 grid gap-3">
                <div>
                  <p className="label">What should LEAF do?</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {REWRITE_ACTIONS.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setAction(item.value)}
                        className={cn(
                          'rounded-md border p-2.5 text-left transition',
                          action === item.value ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-line hover:bg-raised',
                        )}
                      >
                        <span className="block text-[11px] font-bold text-ink">{item.label}</span>
                        <span className="mt-0.5 block text-[10px] leading-4 text-muted">{item.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {(action === 'professional' || action === 'improve') && (
                  <SelectField label="Tone" value={tone} onChange={(event) => setTone(event.target.value as Tone)}>
                    <option value="formal">Formal</option>
                    <option value="confident">Confident</option>
                    <option value="concise">Concise</option>
                    <option value="enthusiastic">Enthusiastic</option>
                  </SelectField>
                )}

                <TextAreaField
                  label="Your text"
                  value={scratch}
                  onChange={(event) => setScratch(event.target.value)}
                  rows={10}
                  maxLength={8000}
                  placeholder="Paste your paragraph here. The suggestion will use only these words."
                  hint={`${scratch.trim() ? scratch.trim().split(/\s+/).length : 0} words · ${scratch.length}/8000 characters`}
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className="btn-primary" onClick={() => void runRewrite()} disabled={!scratch.trim() || writeBusy || !aiReady} aria-busy={writeBusy} title={!aiReady ? 'AI is not configured on this server' : undefined}>
                    {writeBusy ? <Loader2 size={15} className="animate-spin" /> : <WandSparkles size={15} />} {suggestion ? 'Try again' : 'Generate a suggestion'}
                  </button>
                  {suggestion && (
                    <button type="button" className="btn-secondary" onClick={() => void copySuggestion()}>
                      <Copy size={14} /> Copy
                    </button>
                  )}
                  {!aiReady && <span className="text-[10px] text-muted">AI is disabled. The writing room still accepts and stores nothing.</span>}
                </div>

                {writeError && (
                  <div className="rounded-md border border-danger/20 bg-danger/5 px-3.5 py-3 text-[11px] leading-5 text-danger">
                    {writeError}
                    <p className="mt-1 text-muted">Your text is untouched. You can keep editing manually or try again later.</p>
                  </div>
                )}

                {suggestion && (
                  <div className="rounded-lg border border-line bg-raised/25 p-3.5">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] font-bold text-ink">Editable suggestion</p>
                      <span className="text-[10px] text-muted">{selectedAction.hint} Read before using.</span>
                    </div>
                    <TextAreaField
                      label="Suggestion"
                      value={suggestion}
                      onChange={(event) => setSuggestion(event.target.value)}
                      rows={9}
                      wrapClassName="[&>label]:sr-only"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => {
                          setScratch(suggestion)
                          addToast({ type: 'success', title: 'Scratchpad replaced', message: 'Edit the text further, or generate another suggestion.' })
                        }}
                      >
                        <Check size={12} /> Replace my text
                      </button>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => {
                          setScratch((current) => (current.trim() ? `${current.trim()}\n\n${suggestion.trim()}` : suggestion))
                          addToast({ type: 'success', title: 'Appended to your text' })
                        }}
                      >
                        Append
                      </button>
                    </div>
                  </div>
                )}

                <div className="rounded-md border border-line bg-raised/40 p-3 text-[10px] leading-5 text-muted">
                  <strong className="text-ink">What leaves LEAF?</strong> Only the text in this box and the action you choose are sent to the configured AI provider. This scratchpad is not saved, and it is never attached to a document automatically.
                </div>
              </div>
            </div>
          )}

          {tab === 'skills' && (
            <div className="card p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-ink">Skill ideas for a role</h2>
                  <p className="mt-0.5 text-[11px] leading-5 text-muted">These are prompts to jog your memory, not claims. Add only what you can honestly demonstrate.</p>
                </div>
                <Badge tone="neutral"><ListChecks size={10} /> Ideas</Badge>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Target role"
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  placeholder="Product designer"
                  maxLength={200}
                  hint="A specific role gives more useful ideas."
                />
                <TextField
                  label="Skills you already list"
                  value={existingSkills}
                  onChange={(event) => setExistingSkills(event.target.value)}
                  placeholder="Figma, research, prototyping"
                  maxLength={600}
                  hint="Comma-separated. These are excluded from the result."
                />
              </div>

              <div className="mt-3 rounded-md border border-line">
                <button type="button" onClick={() => setShowJob((value) => !value)} className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left" aria-expanded={showJob}>
                  <span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-ink"><FileText size={13} className="text-primary" /> Job description</span>
                    <span className="mt-0.5 block text-[10px] text-muted">Optional. Paste only the employer’s published description.</span>
                  </span>
                  <span className="text-[10px] font-semibold text-primary">{showJob ? 'Hide' : 'Add'}</span>
                </button>
                {showJob && (
                  <div className="border-t border-line p-3">
                    <TextAreaField label="Job description" value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} rows={6} maxLength={8000} wrapClassName="[&>label]:sr-only" />
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" className="btn-primary" onClick={() => void runSkills()} disabled={role.trim().length < 2 || skillsBusy || !aiReady} aria-busy={skillsBusy}>
                  {skillsBusy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Suggest skills
                </button>
                {skillIdeas.length > 0 && (
                  <button type="button" className="btn-secondary" onClick={() => void copySelectedSkills()}>
                    <Copy size={14} /> Copy {selectedSkills.length ? `${selectedSkills.length} selected` : 'all'}
                  </button>
                )}
                {!aiReady && <span className="text-[10px] text-muted">AI is disabled on this server.</span>}
              </div>

              {skillsError && (
                <div className="mt-3 rounded-md border border-danger/20 bg-danger/5 px-3.5 py-3 text-[11px] leading-5 text-danger">
                  {skillsError}
                  <p className="mt-1 text-muted">Nothing was changed. You can still add skills manually in any CV or your career profile.</p>
                </div>
              )}

              {skillIdeas.length > 0 ? (
                <div className="mt-4">
                  <p className="label">Ideas to verify</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {skillIdeas.map((skill) => {
                      const selected = selectedSkills.includes(skill)
                      return (
                        <label key={skill} className={cn('flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-xs', selected ? 'border-primary bg-primary/5 text-ink' : 'border-line text-muted hover:bg-raised')}>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded accent-[rgb(var(--primary))]"
                            checked={selected}
                            onChange={() =>
                              setSelectedSkills((current) => (current.includes(skill) ? current.filter((item) => item !== skill) : [...current, skill]))
                            }
                          />
                          <span className="font-semibold">{skill}</span>
                        </label>
                      )
                    })}
                  </div>
                  <p className="mt-2 text-[10px] leading-5 text-muted">Ask yourself: could I show evidence of this in an interview? If not, leave it out.</p>
                </div>
              ) : (
                !skillsBusy && (
                  <div className="mt-4 rounded-lg border border-dashed border-line bg-raised/30 p-6 text-center">
                    <Lightbulb size={22} className="mx-auto text-primary/60" />
                    <p className="mt-2 text-xs font-semibold text-ink">Ideas will appear here</p>
                    <p className="mx-auto mt-1 max-w-[44ch] text-[11px] leading-5 text-muted">Enter a role and generate a short, relevant list. You choose which ideas are true for you.</p>
                  </div>
                )
              )}
            </div>
          )}

          {tab === 'review' && (
            <div className="card p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-ink">Review a document</h2>
                  <p className="mt-0.5 text-[11px] leading-5 text-muted">AI review is optional and uses one action. The local structural check is free, private and never calls a provider.</p>
                </div>
                <Badge tone="neutral"><ShieldCheck size={10} /> Review</Badge>
              </div>

              {docOptions.length === 0 ? (
                <EmptyState
                  className="mt-4"
                  title="No documents to review yet"
                  description="Create a CV, cover letter or personal site first. Then return here for a structural check or an AI second opinion."
                  icon={<FileText size={19} />}
                  action={
                    <>
                      <Link to="/app/cvs" className="btn-primary btn-sm">Create a CV</Link>
                      <Link to="/app/letters" className="btn-secondary btn-sm">Cover letter</Link>
                      <Link to="/app/pages" className="btn-secondary btn-sm">Personal site</Link>
                    </>
                  }
                />
              ) : (
                <>
                  <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                    <SelectField label="Document" value={reviewDocKey} onChange={(event) => setReviewDocKey(event.target.value)}>
                      {(['cv', 'cover_letter', 'landing'] as const).map((type) => {
                        const options = docOptions.filter((doc) => doc.type === type)
                        if (!options.length) return null
                        return (
                          <optgroup key={type} label={DOC_LABELS[type]}>
                            {options.map((doc) => (
                              <option key={doc.key} value={doc.key}>{doc.title}</option>
                            ))}
                          </optgroup>
                        )
                      })}
                    </SelectField>
                    <div className="flex items-end">
                      {selectedDoc && docHref(selectedDoc.type, selectedDoc.id) && (
                        <Link to={docHref(selectedDoc.type, selectedDoc.id)!} className="btn-secondary btn-sm">
                          Open <ExternalLink size={12} />
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 rounded-md border border-line">
                    <button type="button" onClick={() => setShowReviewJob((value) => !value)} className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left" aria-expanded={showReviewJob}>
                      <span>
                        <span className="flex items-center gap-1.5 text-xs font-bold text-ink"><Target size={13} className="text-primary" /> Match against a job description</span>
                        <span className="mt-0.5 block text-[10px] text-muted">Optional. LEAF flags terms you might be missing, never facts you should invent.</span>
                      </span>
                      <span className="text-[10px] font-semibold text-primary">{showReviewJob ? 'Hide' : 'Add'}</span>
                    </button>
                    {showReviewJob && (
                      <div className="border-t border-line p-3">
                        <TextAreaField label="Job description" value={reviewJob} onChange={(event) => setReviewJob(event.target.value)} rows={6} maxLength={12000} hint="Used only for this review and stored with its result." wrapClassName="[&>label]:sr-only" />
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button type="button" className="btn-primary" onClick={() => void runReview(false)} disabled={!selectedDoc || Boolean(reviewBusy) || !aiReady} aria-busy={reviewBusy === 'ai'}>
                      {reviewBusy === 'ai' ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Run AI review
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => void runReview(true)} disabled={!selectedDoc || Boolean(reviewBusy)} aria-busy={reviewBusy === 'local'}>
                      {reviewBusy === 'local' ? <Loader2 size={15} className="animate-spin" /> : <Wrench size={15} />} Local structural check
                    </button>
                    {!aiReady && <span className="text-[10px] text-muted">AI is disabled. Use the local check.</span>}
                  </div>

                  {reviewError && (
                    <div className="mt-3 rounded-md border border-amber-500/25 bg-amber-500/5 px-3.5 py-3 text-[11px] leading-5 text-amber-800 dark:text-amber-200">
                      {reviewError}
                      <p className="mt-1 text-muted">The AI review is unavailable. You can run the local structural check instead; it needs no provider.</p>
                      <button type="button" className="btn-secondary btn-sm mt-2" onClick={() => void runReview(true)} disabled={Boolean(reviewBusy)}>
                        <Wrench size={12} /> Run local check
                      </button>
                    </div>
                  )}

                  {review ? (
                    <div className="mt-4">
                      <ReviewResultPanel review={review} title={reviewTitle} />
                    </div>
                  ) : (
                    !reviewBusy && (
                      <div className="mt-4 rounded-lg border border-dashed border-line bg-raised/30 p-6 text-center">
                        <ShieldCheck size={22} className="mx-auto text-primary/60" />
                        <p className="mt-2 text-xs font-semibold text-ink">Nothing reviewed yet</p>
                        <p className="mx-auto mt-1 max-w-[48ch] text-[11px] leading-5 text-muted">A review suggests fixes; it never edits the document. Open the editor to make each change yourself.</p>
                      </div>
                    )
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center gap-2">
              <Clock3 size={14} className="text-primary" />
              <h2 className="text-xs font-bold text-ink">Recent reviews</h2>
              <span className="ml-auto text-[10px] text-muted">{reviewCount}</span>
            </div>
            {historyLoading ? (
              <div className="mt-3 space-y-2">
                <div className="skeleton h-16" />
                <div className="skeleton h-16" />
              </div>
            ) : history.length === 0 ? (
              <p className="mt-3 text-[11px] leading-5 text-muted">Reviews you run on a document appear here. Use the review tab to start.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {history.slice(0, 5).map((item) => {
                  const href = docHref(item.docType, item.docId)
                  return (
                    <div key={item.id} className="rounded-md border border-line bg-raised/25 p-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-surface text-muted">
                          {item.docType === 'cv' ? <FileText size={11} /> : item.docType === 'cover_letter' ? <BriefcaseBusiness size={11} /> : <Globe2 size={11} />}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[10px] font-bold text-ink">{DOC_LABELS[item.docType] || item.docType}</span>
                        <span className="text-[9px] text-muted">{timeAgo(item.createdAt)}</span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-[10px] leading-4 text-muted">{item.review?.summary || 'Review result unavailable.'}</p>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <span className={cn('badge !px-1.5 !py-0.5 !text-[9px]', item.source === 'ai' ? 'badge-primary' : '')}>
                          {item.source === 'ai' ? 'AI' : 'Local'} · {item.review?.score ?? '—'}
                        </span>
                        {href && (
                          <Link to={href} className="inline-flex items-center gap-0.5 text-[9px] font-bold text-primary hover:underline">
                            Open <ArrowUpRight size={9} />
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {history.length > 5 && <p className="mt-2 text-[10px] text-muted">Showing the 5 most recent of {history.length}.</p>}
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-accent" />
              <h2 className="text-xs font-bold text-ink">How this stays honest</h2>
            </div>
            <ul className="mt-3 space-y-2.5 text-[11px] leading-5 text-muted">
              {[
                'Suggestions use only the text you provide. LEAF does not add employers, dates, metrics or qualifications.',
                'Every AI result stays editable and is never applied to a document automatically.',
                'The local structural check runs on this server and does not contact an AI provider.',
                'Manual editing, saving, PDF export and sharing work without AI and without payment.',
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <Check size={12} className="mt-0.5 shrink-0 text-emerald-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-line bg-gradient-to-br from-primary/[0.06] via-surface to-accent/[0.05] p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold text-ink"><Sparkles size={13} className="text-primary" /> A note on AI</p>
            <p className="mt-1.5 text-[11px] leading-5 text-muted">
              AI can misread context and flatten a distinctive voice. Use it to get unstuck, then rewrite the suggestion until it sounds like you.
            </p>
          </div>

          {latestReview?.summary && (
            <div className="rounded-lg border border-line bg-surface p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Latest review</p>
              <p className="mt-1.5 line-clamp-4 text-[11px] leading-5 text-ink">{latestReview.summary}</p>
              <p className="mt-2 text-[10px] text-muted">{formatDate(history[0]?.createdAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-md border border-line bg-raised/40 p-3 text-[10px] leading-5 text-muted">
            <CircleAlert size={13} className="mt-0.5 shrink-0 text-muted" />
            <span>Review history is private to your account and never appears on shared pages.</span>
          </div>
        </aside>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-surface px-4 py-3 text-[10px] text-muted">
        <span className="inline-flex items-center gap-1.5"><RefreshCw size={11} /> AI usage is per account and resets daily.</span>
        <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={11} className="text-emerald-500" /> No payment step anywhere in LEAF.</span>
      </div>
    </div>
  )
}
