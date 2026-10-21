/**
 * The 3D layer's tiny UI store.
 *
 * Pointer coordinates live in `pointer.ts` (mutable, read once a frame); the store only
 * holds the discrete events and the active section, so React re-renders are rare.
 */
import { create } from 'zustand'
import type { StoryLayoutInfo } from '../marketing/storySheet'

export type SceneSectionId =
  | 'intro'
  | 'profile'
  | 'preview'
  | 'assistant'
  | 'share'
  | 'themes'
  | 'templates'
  | 'sites'
  | 'how'
  | 'faq'
  | 'cta'

export interface Pulse {
  id: number
  section: string
  strength: number
  /** performance.now() at the moment the pulse fired. */
  t: number
}

export interface Impulse {
  id: number
  /** NDC pointer position at the click. */
  x: number
  y: number
  t: number
}

interface SceneState {
  active: SceneSectionId
  tier: 'high' | 'medium' | 'low' | 'none'
  ready: boolean
  /** prefers-reduced-motion, read once on mount. */
  reduced: boolean
  pulse: Pulse
  impulse: Impulse
  layout: StoryLayoutInfo | null
  /** Incremented when the card should do a full Y flip (theme / variant change). */
  flip: number
  setActive: (section: SceneSectionId) => void
  setTier: (tier: SceneState['tier']) => void
  setReady: (ready: boolean) => void
  setReduced: (reduced: boolean) => void
  firePulse: (section: string, strength?: number) => void
  fireImpulse: (x: number, y: number) => void
  setLayout: (layout: StoryLayoutInfo | null) => void
  requestFlip: () => void
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())
let sequence = 0

export const useScene = create<SceneState>((set) => ({
  active: 'intro',
  tier: 'none',
  ready: false,
  reduced: false,
  pulse: { id: 0, section: 'intro', strength: 0, t: -1e9 },
  impulse: { id: 0, x: 0, y: 0, t: -1e9 },
  layout: null,
  flip: 0,
  setActive: (active) => set((state) => (state.active === active ? state : { active })),
  setTier: (tier) => set({ tier }),
  setReady: (ready) => set({ ready }),
  setReduced: (reduced) => set({ reduced }),
  firePulse: (section, strength = 1) =>
    set({ pulse: { id: (sequence += 1), section, strength, t: now() } }),
  fireImpulse: (x, y) => set({ impulse: { id: (sequence += 1), x, y, t: now() } }),
  setLayout: (layout) => set({ layout }),
  requestFlip: () => set((state) => ({ flip: state.flip + 1 })),
}))

/** Current pulse envelope: strength * exp(-(age / 1000) * 2.5). */
export function pulseAmount(at = now()): number {
  const pulse = useScene.getState().pulse
  return pulse.strength * Math.exp((-(at - pulse.t) / 1000) * 2.5)
}
