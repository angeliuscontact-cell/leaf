/**
 * Mounts the page-wide 3D layer.
 *
 * This is the only module the home page loads for the animation: tier detection, a fixed
 * z-0 canvas, scroll choreography (which beat is being read), smooth scrolling, reveals,
 * input pulses and the 2D fallback all live here. The page itself keeps its content and
 * only marks its beats with `data-scene-section`.
 */
import { Component, useEffect, useRef, useState, type ReactNode } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { useTheme } from '../../context/ThemeContext'
import { detectTier, prefersReducedMotion, type QualityTier } from './tiers'
import { installPointer } from './pointer'
import { useScene } from './store'
import { isSceneSection } from './sections'
import { paletteFor } from './palette'
import { Fallback2D } from './Fallback2D'
import SceneCanvas from './SceneCanvas'

gsap.registerPlugin(ScrollTrigger)

let lenisInstance: Lenis | null = null

/** Scroll to a section with Lenis when it is running, otherwise natively. */
export function scrollToSection(id: string, offset = -80): void {
  const target = document.getElementById(id)
  if (!target) return
  if (lenisInstance) lenisInstance.scrollTo(target, { duration: 1.4, offset })
  else target.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

function SceneProbe() {
  const active = useScene((state) => state.active)
  const ready = useScene((state) => state.ready)
  const tier = useScene((state) => state.tier)
  return (
    <span
      data-scene-active={active}
      data-scene-ready={ready ? 'true' : 'false'}
      data-scene-tier={tier}
      className="pointer-events-none absolute left-0 top-0 h-px w-px overflow-hidden opacity-0"
      aria-hidden="true"
    />
  )
}

/** The beat whose box crosses the 60% line when the layer mounts (hash loads). */
function pickInitialSection(): void {
  const line = window.innerHeight * 0.6
  let current = useScene.getState().active
  for (const node of Array.from(document.querySelectorAll<HTMLElement>('[data-scene-section]'))) {
    const rect = node.getBoundingClientRect()
    if (rect.top <= line && rect.bottom >= line) {
      const id = node.dataset.sceneSection
      if (isSceneSection(id)) current = id
    }
  }
  useScene.getState().setActive(current)
}

export default function SceneLayer() {
  const { isDark } = useTheme()
  const [tier] = useState<QualityTier>(() => detectTier())
  const [failed, setFailed] = useState(false)
  const [reduced] = useState<boolean>(() => prefersReducedMotion())
  const previousDark = useRef(isDark)
  const palette = paletteFor(isDark)

  useEffect(() => {
    useScene.getState().setTier(tier)
    useScene.getState().setReduced(reduced)
    const removePointer = installPointer()
    return removePointer
  }, [tier, reduced])

  // A theme change is a variant change: the card turns over.
  useEffect(() => {
    if (previousDark.current === isDark) return
    previousDark.current = isDark
    useScene.getState().requestFlip()
  }, [isDark])

  // Scroll choreography, smooth scrolling, reveals and input feedback.
  useEffect(() => {
    pickInitialSection()

    const triggers: ScrollTrigger[] = []
    for (const node of Array.from(document.querySelectorAll<HTMLElement>('[data-scene-section]'))) {
      const id = node.dataset.sceneSection
      if (!isSceneSection(id)) continue
      triggers.push(
        ScrollTrigger.create({
          trigger: node,
          start: 'top 60%',
          end: 'bottom 60%',
          onToggle: (self) => {
            if (self.isActive) useScene.getState().setActive(id)
          },
        }),
      )
    }

    const reducedNow = prefersReducedMotion()
    let lenis: Lenis | null = null
    let raf: ((time: number) => void) | null = null
    if (!reducedNow) {
      // The stylesheet opts into native smooth scrolling; Lenis takes over instead.
      document.documentElement.style.scrollBehavior = 'auto'
      lenis = new Lenis({
        duration: 1.15,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      })
      lenis.on('scroll', ScrollTrigger.update)
      raf = (time: number) => lenis?.raf(time * 1000)
      gsap.ticker.add(raf)
      gsap.ticker.lagSmoothing(0)
      lenisInstance = lenis
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const anchor = target?.closest?.('a[href^="#"]') as HTMLAnchorElement | null
      if (!anchor) return
      const hash = anchor.getAttribute('href') || ''
      if (hash.length < 2 || anchor.target === '_blank') return
      const section = document.getElementById(hash.slice(1))
      if (!section) return
      event.preventDefault()
      if (lenis) lenis.scrollTo(section, { duration: 1.4, offset: -80 })
      else section.scrollIntoView({ block: 'start' })
    }
    document.addEventListener('click', onClick)

    const sectionOf = (node: HTMLElement | null): string => {
      const holder = node?.closest<HTMLElement>('[data-scene-section]')
      return holder?.dataset.sceneSection || 'intro'
    }
    const onFocusIn = (event: FocusEvent) => {
      const node = event.target as HTMLElement | null
      if (!node?.matches?.('button, a, input, textarea, select, [tabindex]')) return
      useScene.getState().firePulse(sectionOf(node), 1)
    }
    const onInput = (event: Event) => {
      const node = event.target as HTMLElement | null
      if (!node?.matches?.('input, textarea, select')) return
      useScene.getState().firePulse(sectionOf(node), 0.55)
    }
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('input', onInput)
    document.addEventListener('change', onInput)

    // Reveal groups: children stagger in from a blur, once.
    let context: gsap.Context | null = null
    let trackContext: gsap.Context | null = null
    if (!reducedNow) {
      context = gsap.context(() => {
        const grouped = new Set<HTMLElement>()
        document.querySelectorAll<HTMLElement>('[data-reveal-group]').forEach((group) => {
          const items = Array.from(group.querySelectorAll<HTMLElement>('[data-reveal]'))
          if (!items.length) return
          items.forEach((item) => grouped.add(item))
          gsap.fromTo(
            items,
            { autoAlpha: 0, y: 16, filter: 'blur(8px)' },
            {
              autoAlpha: 1,
              y: 0,
              filter: 'blur(0px)',
              duration: 0.42,
              ease: 'power2.out',
              stagger: 0.08,
              clearProps: 'filter,transform',
              scrollTrigger: { trigger: group, start: 'top 82%', once: true },
            },
          )
        })
        document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((item) => {
          if (grouped.has(item)) return
          gsap.fromTo(
            item,
            { autoAlpha: 0, y: 16, filter: 'blur(8px)' },
            {
              autoAlpha: 1,
              y: 0,
              filter: 'blur(0px)',
              duration: 0.42,
              ease: 'power2.out',
              clearProps: 'filter,transform',
              scrollTrigger: { trigger: item, start: 'top 88%', once: true },
            },
          )
        })
      })

      // The template rail drifts a little as it crosses the viewport.
      trackContext = gsap.context(() => {
        const track = document.querySelector<HTMLElement>('[data-template-track]')
        if (!track || window.innerWidth < 1024) return
        gsap.fromTo(
          track,
          { x: 0 },
          {
            x: -54,
            ease: 'none',
            scrollTrigger: { trigger: track, start: 'top bottom', end: 'bottom top', scrub: 1.2 },
          },
        )
      })
    }

    const safety = window.setTimeout(() => {
      document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((item) => {
        const rect = item.getBoundingClientRect()
        if (rect.top < window.innerHeight && rect.bottom > 0 && Number(getComputedStyle(item).opacity) < 0.05) {
          gsap.set(item, { autoAlpha: 1, y: 0, filter: 'blur(0px)' })
        }
      })
    }, 1600)

    let refreshTimer = 0
    const observer = new ResizeObserver(() => {
      window.clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 200)
    })
    observer.observe(document.body)

    const refreshOnFonts = () => ScrollTrigger.refresh()
    if ('fonts' in document) document.fonts.ready.then(refreshOnFonts).catch(() => undefined)

    return () => {
      window.clearTimeout(safety)
      window.clearTimeout(refreshTimer)
      observer.disconnect()
      document.removeEventListener('click', onClick)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('input', onInput)
      document.removeEventListener('change', onInput)
      context?.revert()
      trackContext?.revert()
      triggers.forEach((trigger) => trigger.kill())
      if (raf) gsap.ticker.remove(raf)
      gsap.ticker.lagSmoothing(500, 33)
      lenis?.destroy()
      if (lenisInstance === lenis) lenisInstance = null
      document.documentElement.style.scrollBehavior = ''
    }
  }, [])

  const mode: QualityTier = failed ? 'none' : tier

  return (
    <>
      {mode === 'none' ? (
        <Fallback2D dark={isDark} />
      ) : (
        <div
          data-scene-layer
          data-scene-tier={mode}
          className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
          aria-hidden="true"
        >
          <SceneBoundary onError={() => setFailed(true)}>
            <SceneCanvas
              tier={mode}
              palette={palette}
              reduced={reduced}
              onLost={() => setFailed(true)}
            />
          </SceneBoundary>
          {/* Keeps the page text readable where content crosses the paper. */}
          <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[64%] bg-gradient-to-r from-canvas/70 via-canvas/35 to-transparent lg:block" />
          <div className="pointer-events-none absolute inset-0 bg-canvas/70 lg:hidden" />
          <div className="pointer-events-none absolute inset-0 hidden bg-[#0b1220]/30 dark:lg:block" />
          <SceneProbe />
        </div>
      )}
      {mode === 'none' ? <SceneProbe /> : null}
    </>
  )
}
