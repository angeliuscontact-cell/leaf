import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface FieldShellProps {
  label: string
  htmlFor: string
  hint?: string
  error?: string
  optional?: boolean
  children: ReactNode
  className?: string
}

function FieldShell({ label, htmlFor, hint, error, optional, children, className }: FieldShellProps) {
  const hintId = `${htmlFor}-hint`
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[0.8125rem] font-semibold text-ink">
          {label}
          {optional && <span className="ml-1 font-normal text-muted">(optional)</span>}
        </label>
      </div>
      {children}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs leading-5 text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} className="error-text">
          {error}
        </p>
      )}
    </div>
  )
}

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string
  hint?: string
  error?: string
  optional?: boolean
  wrapClassName?: string
}

export function TextField({ label, hint, error, optional, wrapClassName, className, id, ...props }: TextFieldProps) {
  const generated = useId()
  const inputId = id || generated
  return (
    <FieldShell label={label} htmlFor={inputId} hint={hint} error={error} optional={optional} className={wrapClassName}>
      <input
        id={inputId}
        className={cn('input', error && 'input-error', className)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...props}
      />
    </FieldShell>
  )
}

export interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
  error?: string
  optional?: boolean
  wrapClassName?: string
}

export function TextAreaField({ label, hint, error, optional, wrapClassName, className, id, ...props }: TextAreaFieldProps) {
  const generated = useId()
  const inputId = id || generated
  return (
    <FieldShell label={label} htmlFor={inputId} hint={hint} error={error} optional={optional} className={wrapClassName}>
      <textarea
        id={inputId}
        className={cn('input min-h-[96px] resize-y leading-relaxed', error && 'input-error', className)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...props}
      />
    </FieldShell>
  )
}

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  hint?: string
  error?: string
  children: ReactNode
  wrapClassName?: string
}

export function SelectField({ label, hint, error, wrapClassName, className, id, children, ...props }: SelectFieldProps) {
  const generated = useId()
  const inputId = id || generated
  return (
    <FieldShell label={label} htmlFor={inputId} hint={hint} error={error} className={wrapClassName}>
      <select
        id={inputId}
        className={cn('input cursor-pointer pr-9', error && 'input-error', className)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  )
}

export function Checkbox({
  label,
  description,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; description?: string }) {
  const id = useId()
  return (
    <label htmlFor={id} className={cn('flex cursor-pointer items-start gap-2.5 text-sm text-ink', className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-primary accent-[rgb(var(--primary))] focus:ring-2 focus:ring-primary/30"
        {...props}
      />
      <span>
        <span className="font-medium">{label}</span>
        {description && <span className="mt-0.5 block text-xs leading-5 text-muted">{description}</span>}
      </span>
    </label>
  )
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="cursor-pointer text-sm font-semibold text-ink">
          {label}
        </label>
        {description && <p className="mt-0.5 text-xs leading-5 text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition focus-visible:outline-offset-4 disabled:opacity-50',
          checked ? 'border-primary bg-primary' : 'border-line bg-raised',
        )}
      >
        <span
          className={cn(
            'absolute top-[3px] h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-[25px]' : 'translate-x-[3px]',
          )}
        />
      </button>
    </div>
  )
}

export function ColorField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
}) {
  const id = useId()
  return (
    <div>
      <label htmlFor={`${id}-text`} className="label">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#1677ff'}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-11 shrink-0 rounded-md border border-line bg-surface"
          aria-label={`${label} colour picker`}
        />
        <input
          id={`${id}-text`}
          value={value}
          onChange={(event) => {
            const next = event.target.value
            onChange(next.startsWith('#') ? next : `#${next}`)
          }}
          maxLength={7}
          className="input font-mono text-xs uppercase"
          aria-label={`${label} hex value`}
          spellCheck={false}
        />
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  )
}
