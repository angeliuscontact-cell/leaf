/**
 * Device capability tiers for the marketing 3D layer.
 *
 * Detected once, before the <Canvas> mounts. `?tier=high|medium|low|none` overrides the
 * probe so the fallbacks can be reviewed on any machine.
 */
export type QualityTier = 'high' | 'medium' | 'low' | 'none'

export interface TierConfig {
  /** Device-pixel-ratio ceiling. */
  dpr: number
  /** Instanced icosahedra / tori. */
  icos: number
  tori: number
  shadows: boolean
  postFx: boolean
  /** Glass orb uses a transmission material (expensive) instead of clearcoat. */
  transmission: boolean
  /** Multiplier for the drawn sheet texture. */
  textureScale: number
}

export const TIER_CONFIG: Record<Exclude<QualityTier, 'none'>, TierConfig> = {
  high: { dpr: 1.75, icos: 22, tori: 12, shadows: true, postFx: true, transmission: true, textureScale: 1 },
  medium: { dpr: 1.5, icos: 14, tori: 8, shadows: false, postFx: false, transmission: false, textureScale: 1 },
  low: { dpr: 1, icos: 8, tori: 4, shadows: false, postFx: false, transmission: false, textureScale: 0.75 },
}

const FORCED: QualityTier[] = ['high', 'medium', 'low', 'none']
const TIER_KEY = 'leaf-scene-tier'

export function readForcedTier(): QualityTier | null {
  if (typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get('tier')
  return value && (FORCED as string[]).includes(value) ? (value as QualityTier) : null
}

function readCachedTier(): QualityTier | null {
  try {
    const value = window.sessionStorage.getItem(TIER_KEY)
    return value && (FORCED as string[]).includes(value) ? (value as QualityTier) : null
  } catch {
    return null
  }
}

function cacheTier(tier: QualityTier): void {
  try {
    window.sessionStorage.setItem(TIER_KEY, tier)
  } catch {
    // Private mode can refuse storage; the probe simply runs again.
  }
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * - none: no WebGL2
 * - low: software renderer, small touch device, <=2 cores or <=2GB
 * - medium: touch device, <=4 cores or <=4GB
 * - high: everything else
 */
export function detectTier(): QualityTier {
  const forced = readForcedTier()
  if (forced) return forced
  if (typeof window === 'undefined') return 'none'

  // One probe per tab session: creating a throwaway WebGL context on every reload can
  // exhaust Chromium's per-process context budget and push later visits to the fallback.
  const cached = readCachedTier()
  if (cached) return cached

  let renderer = ''
  let hasWebGL2 = false
  try {
    const probe = document.createElement('canvas')
    const gl = probe.getContext('webgl2')
    if (gl) {
      hasWebGL2 = true
      const debug = gl.getExtension('WEBGL_debug_renderer_info')
      if (debug) renderer = String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) || '')
      // Never call WEBGL_lose_context here: Chromium treats repeated simulated losses as
      // abuse and can block WebGL for the origin, which would drop every visitor onto the
      // 2D fallback. Let the probe canvas be collected instead.
    }
  } catch {
    hasWebGL2 = false
  }
  if (!hasWebGL2) {
    cacheTier('none')
    return 'none'
  }

  const software = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i.test(renderer)
  if (software) {
    cacheTier('low')
    return 'low'
  }

  const navigatorWithMemory = navigator as Navigator & { deviceMemory?: number }
  const touch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0
  const width = window.innerWidth
  const cores = navigator.hardwareConcurrency || 4
  const memory = navigatorWithMemory.deviceMemory || 4

  let tier: QualityTier = 'high'
  if ((touch && width < 820) || cores <= 2 || memory <= 2) tier = 'low'
  else if (touch || cores <= 4 || memory <= 4) tier = 'medium'
  cacheTier(tier)
  return tier
}

export function tierConfig(tier: QualityTier): TierConfig {
  return TIER_CONFIG[tier === 'none' ? 'low' : tier]
}
