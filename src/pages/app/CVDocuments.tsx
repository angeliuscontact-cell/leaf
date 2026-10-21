import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, SlidersHorizontal, FileText, Share2 } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { ConfirmDialog } from '../../components/ui/Modal'
import { CVDocumentCard, EmptyDocumentGrid } from '../../components/documents/DocumentCards'
import { CreateCvDialog } from '../../components/documents/CreateDialogs'
import { ShareDialog } from '../../components/documents/ShareDialog'
import { useToast } from '../../context/ToastContext'
import { api } from '../../lib/api'
import { cn, errorMessage } from '../../lib/utils'
import type { CVDocument, CVDocumentSummary } from '../../../shared/types'

type Filter = 'all' | 'shared' | 'private'

export function CVDocuments() {
  const { addToast } = useToast()
  const [docs, setDocs] = useState<CVDocument[] | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<'updated' | 'created' | 'name'>('updated')
  const [createOpen, setCreateOpen] = useState(false)
  const [shareTarget, setShareTarget] = useState<CVDocument | CVDocumentSummary | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CVDocument | CVDocumentSummary | null>(null)

  const load = () => {
    setError('')
    api
      .get<{ cvs: CVDocument[] }>('/cvs')
      .then((result) => setDocs(result.cvs))
      .catch((err) => setError(errorMessage(err)))
  }

  useEffect(load, [])

  const filtered = useMemo(() => {
    const list = (docs || []).filter((cv) => {
      if (filter === 'shared' && !(cv.shareEnabled && cv.shareId)) return false
      if (filter === 'private' && cv.shareEnabled && cv.shareId) return false
      const haystack = `${cv.title} ${cv.data?.personal?.fullName || ''} ${cv.data?.personal?.title || ''}`.toLowerCase()
      return !query.trim() || haystack.includes(query.trim().toLowerCase())
    })
    return [...list].sort((a, b) => {
      if (sort === 'name') return a.title.localeCompare(b.title)
      if (sort === 'created') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  }, [docs, filter, query, sort])

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`/cvs/${deleteTarget.id}`)
      setDocs((current) => (current || []).filter((cv) => cv.id !== deleteTarget.id))
      setDeleteTarget(null)
      addToast({ type: 'success', title: 'CV deleted', message: 'The document and its saved versions were removed.' })
    } catch (err) {
      addToast({ type: 'error', title: 'Could not delete', message: errorMessage(err) })
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Documents"
        title="Your CVs"
        description="Every CV uses the same live A4 renderer as its PDF, so what you see is what you export."
        actions={
          <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> New CV
          </button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex w-fit rounded-lg border border-line bg-surface p-1" role="tablist" aria-label="Filter CVs">
          {([
            ['all', 'All'],
            ['shared', 'Shared'],
            ['private', 'Private'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold transition',
                filter === value ? 'bg-primary/10 text-primary' : 'text-muted hover:text-ink',
              )}
            >
              {label}
              <span className="ml-1.5 opacity-60">
                {value === 'all'
                  ? docs?.length || 0
                  : value === 'shared'
                    ? docs?.filter((cv) => cv.shareEnabled).length || 0
                    : docs?.filter((cv) => !cv.shareEnabled).length || 0}
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative block">
            <span className="sr-only">Search CVs</span>
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search CVs…" className="input w-full pl-9 sm:w-[220px]" />
          </label>
          <div className="relative">
            <SlidersHorizontal size={14} className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-muted" />
            <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} aria-label="Sort CVs" className="input appearance-none pl-8 pr-8 text-xs">
              <option value="updated">Last edited</option>
              <option value="created">Newest</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-danger/20 bg-danger/5 px-4 py-3 text-xs text-danger">
          <span>{error}</span>
          <button type="button" className="font-bold underline" onClick={load}>Try again</button>
        </div>
      )}

      {!docs && !error ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-[430px]" />)}
        </div>
      ) : (docs?.length || 0) === 0 ? (
        <EmptyDocumentGrid kind="cv" onCreate={() => setCreateOpen(true)} />
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center px-6 py-14 text-center">
          <Search size={22} className="text-muted" />
          <h2 className="mt-3 text-sm font-bold text-ink">No matching CVs</h2>
          <p className="mt-1 text-xs text-muted">Try a different search or filter.</p>
          <button type="button" className="btn-secondary btn-sm mt-4" onClick={() => { setQuery(''); setFilter('all') }}>Clear filters</button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((cv) => (
            <CVDocumentCard
              key={cv.id}
              cv={cv}
              onDelete={setDeleteTarget}
              onShare={setShareTarget}
              onDuplicated={() => load()}
            />
          ))}
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="group flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line bg-raised/30 p-6 text-center transition hover:border-primary/40 hover:bg-primary/[0.03]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-muted transition group-hover:border-primary/30 group-hover:text-primary">
              <Plus size={19} />
            </span>
            <span>
              <span className="block text-sm font-bold text-ink">Add another CV</span>
              <span className="mt-1 block text-[11px] text-muted">Start a fresh version for a different role.</span>
            </span>
          </button>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5"><FileText size={13} className="text-primary" /> Each PDF keeps selectable text and working links.</span>
        <span className="inline-flex items-center gap-1.5"><Share2 size={13} className="text-accent" /> Sharing is per CV and can be revoked instantly.</span>
      </div>

      <CreateCvDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <ShareDialog
        open={Boolean(shareTarget)}
        onClose={() => setShareTarget(null)}
        cvId={shareTarget?.id || 0}
        title={shareTarget?.title || 'My CV'}
        shareEnabled={shareTarget?.shareEnabled || false}
        onChanged={(updated) => {
          setDocs((current) => (current || []).map((cv) => (cv.id === updated.id ? updated : cv)))
          setShareTarget(updated)
        }}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete this CV?"
        body={
          <>
            <strong className="text-ink">“{deleteTarget?.title}”</strong> and its saved versions will be permanently deleted. If you shared it, the link will stop working immediately.
          </>
        }
        confirmLabel="Delete permanently"
        danger
      />
    </div>
  )
}
