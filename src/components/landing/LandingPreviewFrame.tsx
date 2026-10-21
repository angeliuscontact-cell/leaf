import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

/**
 * Renders a full landing page at a real desktop viewport width and scales it
 * down to the available panel. Using one shared renderer (rather than a
 * separate "preview look") means what the editor shows is what visitors see.
 */
export function LandingPreviewFrame({
  children,
  width = 1280,
  className,
  innerClassName,
  ariaLabel = 'Personal site preview',
}: {
  children: ReactNode
  width?: number
  className?: string
  innerClassName?: string
  ariaLabel?: string
}) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.4)
  const [height, setHeight] = useState(900)

  useLayoutEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return
    let frame = 0

    const measure = () => {
      frame = 0
      const available = outer.clientWidth
      const nextScale = available > 0 ? Math.min(1, available / width) : 0.4
      setScale(nextScale)
      setHeight(Math.max(320, inner.offsetHeight * nextScale))
    }
    const schedule = () => {
      if (frame) return
      frame = window.requestAnimationFrame(measure)
    }

    measure()
    const observer = new ResizeObserver(schedule)
    observer.observe(outer)
    observer.observe(inner)
    // We bundle local fonts, but a late font swap can still change heights.
    if (document.fonts?.ready) void document.fonts.ready.then(schedule)
    const late = window.setTimeout(schedule, 650)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.clearTimeout(late)
      observer.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width])

  return (
    <div
      ref={outerRef}
      className={cn('relative w-full overflow-hidden', className)}
      style={{ height }}
      role="img"
      aria-label={ariaLabel}
    >
      <div
        ref={innerRef}
        className={cn('pointer-events-none absolute left-0 top-0 origin-top-left select-none', innerClassName)}
        style={{ width, transform: `scale(${scale})` }}
        aria-hidden="true"
      >
        {children}
      </div>
    </div>
  )
}
