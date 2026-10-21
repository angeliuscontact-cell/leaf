import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../lib/utils'

const DOC_WIDTH = 794 // A4 at 96dpi
const PAGE_HEIGHT = 1123

export interface DocumentPreviewProps {
  html: string
  title?: string
  className?: string
  /** Show exactly the first A4 page (dashboard cards/template thumbnails). */
  firstPage?: boolean
  highlightSection?: string | null
  highlightNonce?: number
  onLoad?: () => void
}

/**
 * Renders the same HTML used by the server PDF inside a script-free,
 * same-origin iframe. The parent reads the document height directly, so there
 * are no injected scripts and the preview scales to any panel width.
 */
export function DocumentPreview({
  html,
  title = 'Document preview',
  className,
  firstPage = false,
  highlightSection,
  highlightNonce = 0,
  onLoad,
}: DocumentPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const highlightRef = useRef<string | null>(highlightSection ?? null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const [scale, setScale] = useState(0.7)
  const [docHeight, setDocHeight] = useState(PAGE_HEIGHT)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    highlightRef.current = highlightSection ?? null
  }, [highlightSection])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const measure = () => {
      const width = element.clientWidth
      if (width > 0) setScale(Math.min(1, width / DOC_WIDTH))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const measureDocument = useCallback(() => {
    const iframe = iframeRef.current
    const doc = iframe?.contentDocument
    if (!iframe || !doc) return
    const height = Math.max(PAGE_HEIGHT, doc.documentElement.scrollHeight, doc.body?.scrollHeight || 0)
    setDocHeight(height)
    setReady(true)
    onLoad?.()
  }, [onLoad])

  const scrollToHighlight = useCallback(
    (section: string) => {
      const iframe = iframeRef.current
      const container = containerRef.current
      const doc = iframe?.contentDocument
      if (!iframe || !container || !doc) return
      const element = doc.querySelector<HTMLElement>(`[data-section="${section}"]`)
      if (!element) return
      element.classList.remove('leaf-preview-highlight')
      // Restart the CSS animation.
      void element.offsetWidth
      element.classList.add('leaf-preview-highlight')
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => element.classList.remove('leaf-preview-highlight'), 1700)

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      let pane: HTMLElement | null = container.parentElement
      while (pane) {
        const style = getComputedStyle(pane)
        if (/(auto|scroll)/.test(style.overflowY)) break
        pane = pane.parentElement
      }
      const iframeRect = iframe.getBoundingClientRect()
      const targetRect = element.getBoundingClientRect()
      if (pane) {
        const paneRect = pane.getBoundingClientRect()
        const top = pane.scrollTop + (iframeRect.top - paneRect.top) + targetRect.top * scale
        pane.scrollTo({ top: Math.max(0, top - pane.clientHeight * 0.25), behavior: reduceMotion ? 'auto' : 'smooth' })
      }
    },
    [scale],
  )

  useEffect(() => {
    if (!ready || !highlightSection) return
    scrollToHighlight(highlightSection)
    // Nonce intentionally retriggers the same section on repeated edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightNonce, ready, scrollToHighlight])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return (
    <div ref={containerRef} className={cn('relative w-full overflow-hidden', className)} style={{ height: firstPage ? PAGE_HEIGHT * scale : docHeight * scale }}>
      {!ready && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-raised/80" aria-hidden="true">
          <Loader2 size={22} className="animate-spin text-primary" />
        </div>
      )}
      <iframe
        ref={iframeRef}
        title={title}
        srcDoc={html}
        tabIndex={-1}
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        onLoad={() => {
          const doc = iframeRef.current?.contentDocument
          if (!doc) return
          const finish = () => {
            measureDocument()
            const section = highlightRef.current
            if (section) {
              window.setTimeout(() => {
                const element = doc.querySelector<HTMLElement>(`[data-section="${section}"]`)
                if (!element) return
                element.classList.remove('leaf-preview-highlight')
                void element.offsetWidth
                element.classList.add('leaf-preview-highlight')
                setTimeout(() => element.classList.remove('leaf-preview-highlight'), 1700)
              }, 60)
            }
          }
          if (doc.fonts?.ready) void doc.fonts.ready.then(finish)
          else finish()
          window.setTimeout(finish, 350)
        }}
        style={{
          width: DOC_WIDTH,
          height: docHeight,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          border: 0,
          background: 'transparent',
          display: 'block',
        }}
      />
    </div>
  )
}
