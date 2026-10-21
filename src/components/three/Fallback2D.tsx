/**
 * The no-WebGL fallback: the same drawn sheet on a CSS 3D card over a 28px dot grid.
 * Pointer tilt and the section side-shift are spring-driven (framer-motion).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useSpring } from 'framer-motion'
import { drawStorySheet } from '../marketing/storySheet'
import { useScene } from './store'
import { sectionConfig } from './sections'
import { dampPointer, pointer } from './pointer'
import { paletteFor } from './palette'

export function Fallback2D({ dark }: { dark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const active = useScene((state) => state.active)
  const cfg = sectionConfig(active)
  const palette = useMemo(() => paletteFor(dark), [dark])
  const [width, setWidth] = useState(0)

  const rotateX = useSpring(0, { stiffness: 120, damping: 18 })
  const rotateY = useSpring(0, { stiffness: 120, damping: 18 })
  const shift = useSpring(0, { stiffness: 80, damping: 18 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    drawStorySheet(canvas, 0.6, null)
  }, [])

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    shift.set(cfg.side * Math.min(Math.max(width, 320), 1440) * cfg.offset)
  }, [cfg.side, cfg.offset, shift, width])

  useEffect(() => {
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30)
      last = now
      dampPointer(dt)
      rotateX.set(-pointer.y * 10)
      rotateY.set(pointer.x * 14)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [rotateX, rotateY])

  return (
    <div
      data-scene-fallback
      data-scene-fallback-active={active}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ backgroundColor: palette.base }}
    >
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <pattern id="leaf-scene-grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill={palette.ink} fillOpacity="0.16" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#leaf-scene-grid)" />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center" style={{ perspective: '1200px' }}>
        <motion.div
          style={{ x: shift, rotateX, rotateY, transformStyle: 'preserve-3d' }}
          className="relative w-[min(62vw,320px)] opacity-50 sm:w-[min(44vw,360px)] sm:opacity-90 dark:opacity-40 dark:sm:opacity-70"
        >
          {/* frosted layer behind the sheet */}
          <div className="absolute -inset-3 -z-10 rounded-xl border border-white/50 bg-white/25 shadow-[0_30px_90px_-30px_rgba(15,45,90,.45)] backdrop-blur-sm dark:border-white/10 dark:bg-white/5" />
          <canvas
            ref={canvasRef}
            className="block h-auto w-full rounded-md border border-black/5 shadow-[0_40px_90px_-28px_rgba(15,45,90,.55)] dark:border-white/10"
          />
        </motion.div>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-canvas/70 lg:hidden" />
      <div className="pointer-events-none absolute inset-0 hidden bg-[#0b1220]/45 dark:lg:block" />
    </div>
  )
}
