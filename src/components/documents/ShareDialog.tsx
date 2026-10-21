import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Download, ExternalLink, Link2, Loader2, QrCode, ShieldOff, Share2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Switch } from '../ui/Form'
import { useToast } from '../../context/ToastContext'
import { api, apiBase } from '../../lib/api'
import { copyText, errorMessage } from '../../lib/utils'
import type { CVDocument } from '../../../shared/types'

export function ShareDialog({
  open,
  onClose,
  cvId,
  title,
  shareEnabled,
  onChanged,
}: {
  open: boolean
  onClose: () => void
  cvId: number
  title: string
  shareEnabled: boolean
  onChanged: (cv: CVDocument) => void
}) {
  const { addToast } = useToast()
  const [enabled, setEnabled] = useState(shareEnabled)
  const [url, setUrl] = useState('')
  const [expires, setExpires] = useState<'never' | '7' | '30' | '90'>('never')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [qrUrl, setQrUrl] = useState('')
  const [qrBusy, setQrBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const qrObject = useRef('')
  const canShare = typeof navigator !== 'undefined' && Boolean(navigator.share)

  useEffect(() => {
    if (!open) return
    setEnabled(shareEnabled)
    setError('')
    setUrl('')
    setExpires('never')
    setLoading(true)
    api
      .get<{ cv: CVDocument; shareUrl: string | null }>(`/cvs/${cvId}`)
      .then((result) => {
        setEnabled(result.cv.shareEnabled)
        setUrl(result.shareUrl || '')
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [open, cvId, shareEnabled])

  useEffect(() => {
    if (!open || !enabled) {
      if (qrObject.current) {
        URL.revokeObjectURL(qrObject.current)
        qrObject.current = ''
      }
      setQrUrl('')
      return
    }
    let cancelled = false
    setQrBusy(true)
    fetch(`${apiBase()}/api/cvs/${cvId}/qr`, {
      credentials: 'include',
      headers: { 'x-requested-with': 'leaf' },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not create the QR code.')
        return response.blob()
      })
      .then((blob) => {
        if (cancelled) return
        if (qrObject.current) URL.revokeObjectURL(qrObject.current)
        const objectUrl = URL.createObjectURL(blob)
        qrObject.current = objectUrl
        setQrUrl(objectUrl)
      })
      .catch(() => !cancelled && setQrUrl(''))
      .finally(() => !cancelled && setQrBusy(false))
    return () => {
      cancelled = true
    }
  }, [open, enabled, cvId, url])

  useEffect(() => {
    return () => {
      if (qrObject.current) URL.revokeObjectURL(qrObject.current)
    }
  }, [])

  const updateShare = async (next: boolean) => {
    setBusy(true)
    setError('')
    try {
      const result = await api.post<{ cv: CVDocument; shareUrl: string | null }>(`/cvs/${cvId}/share`, {
        enabled: next,
        expiresInDays: next ? (expires === 'never' ? null : Number(expires)) : undefined,
      })
      setEnabled(next)
      setUrl(result.shareUrl || '')
      onChanged(result.cv)
      addToast({
        type: 'success',
        title: next ? 'Share link is live' : 'Sharing stopped',
        message: next ? 'Anyone with the link can now view this CV.' : 'The previous link no longer works.',
      })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!url) return
    const ok = await copyText(url)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else addToast({ type: 'error', title: 'Could not copy', message: 'Select the link and copy it manually.' })
  }

  const nativeShare = async () => {
    try {
      await navigator.share({ title, text: `View my CV: ${title}`, url })
    } catch {
      /* user dismissed */
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title="Share this CV"
      description="A private view for anyone you choose. Turn it off at any time and the link stops working immediately."
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            Done
          </button>
          {enabled && url && (
            <a className="btn-primary" href={url} target="_blank" rel="noreferrer">
              <ExternalLink size={15} /> Open shared CV
            </a>
          )}
        </>
      }
    >
      <div className="space-y-5">
        {error && <div className="rounded-md border border-danger/20 bg-danger/5 px-3 py-2.5 text-xs text-danger">{error}</div>}

        <div className="flex items-start justify-between gap-4 rounded-lg border border-line bg-raised/50 p-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-ink">
              <Link2 size={15} className="text-primary" /> Public link
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Shows a read-only CV page with a PDF download. It is marked no-index and never appears in search results.
            </p>
          </div>
          <Switch checked={enabled} onChange={(next) => void updateShare(next)} label="Enable link" disabled={busy} />
        </div>

        {enabled ? (
          <>
            <div>
              <label htmlFor="share-url" className="label">Share URL</label>
              <div className="flex gap-2">
                <input id="share-url" readOnly value={loading ? 'Preparing link…' : url} className="input font-mono text-xs" onFocus={(event) => event.currentTarget.select()} />
                <button type="button" className="btn-secondary shrink-0" onClick={copy} disabled={!url}>
                  {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[142px_1fr]">
              <div className="flex h-[142px] w-[142px] items-center justify-center rounded-lg border border-line bg-white p-2.5">
                {qrBusy || loading ? (
                  <Loader2 size={20} className="animate-spin text-slate-400" />
                ) : qrUrl ? (
                  <img src={qrUrl} alt="QR code linking to the shared CV" className="h-full w-full" />
                ) : (
                  <QrCode size={26} className="text-slate-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink">Share it anywhere</p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Print the QR code on a portfolio, add it to a presentation, or send the link in an application.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {qrUrl && (
                    <a href={qrUrl} download={`leaf-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}-qr.png`} className="btn-secondary btn-sm">
                      <Download size={13} /> QR code
                    </a>
                  )}
                  {canShare && (
                    <button type="button" className="btn-secondary btn-sm" onClick={nativeShare}>
                      <Share2 size={13} /> Share
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-md border border-line p-3.5">
              <p className="text-xs font-semibold text-ink">Link expiry</p>
              <p className="mt-0.5 text-[11px] leading-5 text-muted">Changing expiry creates a fresh link and revokes the old one.</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {(['never', '7', '30', '90'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setExpires(option)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                      expires === option ? 'border-primary bg-primary/10 text-primary' : 'border-line text-muted hover:text-ink'
                    }`}
                  >
                    {option === 'never' ? 'No expiry' : `${option} days`}
                  </button>
                ))}
                <button type="button" className="btn-secondary btn-sm ml-auto" disabled={busy || (expires === 'never' && !url)} onClick={() => void updateShare(true)}>
                  {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Apply
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-md bg-raised px-3.5 py-3 text-[11px] leading-5 text-muted">
              <ShieldOff size={15} className="mt-0.5 shrink-0 text-muted" />
              Revoking access deletes the old share identifier. A new link gets a different, unguessable address.
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-line bg-raised/30 px-5 py-9 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-surface text-muted shadow-sm">
              <Link2 size={18} />
            </div>
            <p className="mt-3 text-sm font-bold text-ink">This CV is private</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted">
              Enable the public link when you are ready to share. You can revoke it just as quickly.
            </p>
            <button type="button" className="btn-primary mt-4" onClick={() => void updateShare(true)} disabled={busy || loading}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />}
              Create share link
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
