import { useEffect, useState } from 'react'
import { Check, Loader2, Sparkles, WandSparkles } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { TextAreaField, SelectField } from '../ui/Form'
import { useToast } from '../../context/ToastContext'
import { api } from '../../lib/api'
import { errorMessage, cn } from '../../lib/utils'
import type { AIUsage } from '../../../shared/types'

type Action = 'improve' | 'grammar' | 'concise' | 'professional' | 'achievement' | 'summary'
type Tone = 'formal' | 'confident' | 'concise' | 'enthusiastic'

const actions: Array<{ value: Action; label: string; hint: string }> = [
  { value: 'improve', label: 'Improve', hint: 'Clearer, stronger, same facts.' },
  { value: 'grammar', label: 'Proofread', hint: 'Spelling and grammar only.' },
  { value: 'concise', label: 'Make concise', hint: 'Tighter, without losing evidence.' },
  { value: 'professional', label: 'Refine tone', hint: 'Professional and grounded.' },
  { value: 'achievement', label: 'Achievement bullets', hint: 'Turn a note into scannable bullets.' },
  { value: 'summary', label: 'Write a summary', hint: 'A short, factual professional summary.' },
]

export function AIRewriteButton({
  text,
  context,
  onApply,
  label = 'Rewrite with AI',
  className,
  compact = false,
  defaultAction = 'improve',
}: {
  text: string
  context?: string
  onApply: (value: string) => void
  label?: string
  className?: string
  compact?: boolean
  defaultAction?: Action
}) {
  const [open, setOpen] = useState(false)
  const [action, setAction] = useState<Action>(defaultAction)
  const [tone, setTone] = useState<Tone>('confident')
  const [result, setResult] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [usage, setUsage] = useState<AIUsage | null>(null)

  useEffect(() => {
    if (open) {
      setAction(defaultAction)
      setResult('')
      setError('')
    }
  }, [open, defaultAction])

  const suggest = async () => {
    setBusy(true)
    setError('')
    try {
      const response = await api.post<{ text: string; usage: AIUsage }>('/ai/rewrite', {
        action,
        text,
        context: context || '',
        tone,
      })
      setResult(response.text)
      setUsage(response.usage)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const selected = actions.find((item) => item.value === action)!

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!text.trim()}
        className={cn(
          compact
            ? 'icon-btn h-7 w-7 text-primary hover:bg-primary/10'
            : 'inline-flex min-h-7 items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold text-primary transition hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-40',
          className,
        )}
        title={label}
        aria-label={label}
      >
        <Sparkles size={compact ? 14 : 13} />
        {!compact && label}
      </button>

      <Modal
        open={open}
        onClose={busy ? () => undefined : () => setOpen(false)}
        title="A suggestion, not a rewrite you have to keep"
        description="LEAF uses only what you wrote. Read the result, edit it, then choose whether to apply it."
        size="lg"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
            <button type="button" className="btn-secondary" onClick={suggest} disabled={busy} aria-busy={busy}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <WandSparkles size={14} />} {result ? 'Try again' : 'Generate suggestion'}
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={!result || busy}
              onClick={() => {
                onApply(result)
                setOpen(false)
              }}
            >
              <Check size={14} /> Use this suggestion
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="rounded-md border border-danger/20 bg-danger/5 px-3.5 py-3 text-xs leading-5 text-danger">
              {error}
              <p className="mt-1 text-muted">Manual editing is unaffected. You can close this and keep writing.</p>
            </div>
          )}

          <div>
            <p className="label">What should LEAF do?</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {actions.map((item) => (
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
            <p className="hint">{selected.hint} The suggestion never adds facts that are not in your text or context.</p>
          </div>

          {(action === 'professional' || action === 'improve') && (
            <SelectField label="Tone" value={tone} onChange={(event) => setTone(event.target.value as Tone)}>
              <option value="formal">Formal</option>
              <option value="confident">Confident</option>
              <option value="concise">Concise</option>
              <option value="enthusiastic">Enthusiastic</option>
            </SelectField>
          )}

          <div className="grid gap-3 lg:grid-cols-2">
            <div>
              <p className="label">Your text</p>
              <div className="max-h-56 overflow-y-auto whitespace-pre-line rounded-md border border-line bg-raised/50 p-3 text-xs leading-5 text-muted">{text}</div>
            </div>
            <div>
              <p className="label flex items-center justify-between">Suggestion {result && <span className="font-normal text-muted">Edit before applying</span>}</p>
              {result ? (
                <TextAreaField
                  label="Suggested text"
                  aria-label="Suggested text"
                  value={result}
                  onChange={(event) => setResult(event.target.value)}
                  rows={9}
                  wrapClassName="[&>label]:sr-only"
                />
              ) : (
                <div className="flex h-40 flex-col items-center justify-center rounded-md border border-dashed border-line bg-raised/30 p-4 text-center">
                  <Sparkles size={20} className="text-primary/60" />
                  <p className="mt-2 max-w-[30ch] text-[11px] leading-5 text-muted">
                    Choose an action, then generate a suggestion. Nothing changes in your document until you apply it.
                  </p>
                </div>
              )}
            </div>
          </div>

          {usage && (
            <p className="text-[10px] text-muted">AI usage today: {usage.used} of {usage.limit}. Manual editing is always unlimited.</p>
          )}
        </div>
      </Modal>
    </>
  )
}
