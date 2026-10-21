/**
 * Where the camera looks for each beat of the home-page story.
 *
 * The keys match `data-scene-section` attributes in `Home.tsx`; `region` names a block
 * recorded by `drawStorySheet`. `side` is which side of the text the card sits on
 * (+1 right, -1 left). `dist` is the camera distance at a 16:9 stage, in world units;
 * `offset` is how far the card is pushed sideways, as a fraction of the viewport width.
 *
 * The marketing page reserves a right-hand column for the paper through the hero and the
 * five feature beats, so those keep `side: +1`. The later, full-width sections tuck the
 * paper behind their panels; `how` and `cta` move it to the left so the object still
 * changes sides as the story closes.
 */
import { PAGE_H, PAGE_W, type StoryLayoutInfo } from '../marketing/storySheet'
import type { SceneSectionId } from './store'

export type StoryRegionKey = 'intro' | 'profile' | 'preview' | 'assistant' | 'share' | 'themes' | 'epilogue'

export interface SceneSectionConfig {
  side: 1 | -1
  /** Camera distance for a landscape viewport. */
  dist: number
  /** Idle yaw amplitude, radians. */
  sway: number
  /** Alternate warm backdrop. */
  warm: boolean
  /** Sheet region the camera centres on; null frames the whole sheet. */
  region: StoryRegionKey | null
  /** Horizontal stage offset as a fraction of viewport width. */
  offset: number
}

export const CARD_W = 3
export const CARD_H = (CARD_W * PAGE_H) / PAGE_W

const DEFAULT_OFFSET = 0.23

export const SCENE_SECTIONS: Record<SceneSectionId, SceneSectionConfig> = {
  intro: { side: 1, dist: 11.8, sway: 0.4, warm: false, region: null, offset: 0.255 },
  profile: { side: 1, dist: 8.8, sway: 0.12, warm: true, region: 'profile', offset: 0.255 },
  preview: { side: 1, dist: 8.75, sway: 0.14, warm: false, region: 'preview', offset: 0.255 },
  assistant: { side: 1, dist: 8.85, sway: 0.12, warm: true, region: 'assistant', offset: 0.255 },
  share: { side: 1, dist: 8.8, sway: 0.13, warm: false, region: 'share', offset: 0.255 },
  themes: { side: 1, dist: 8.85, sway: 0.12, warm: true, region: 'themes', offset: 0.255 },
  templates: { side: 1, dist: 10.8, sway: 0.28, warm: false, region: 'epilogue', offset: 0.26 },
  sites: { side: 1, dist: 10.6, sway: 0.3, warm: true, region: 'epilogue', offset: 0.26 },
  how: { side: -1, dist: 11.0, sway: 0.24, warm: false, region: 'epilogue', offset: 0.24 },
  faq: { side: 1, dist: 11.2, sway: 0.32, warm: true, region: 'epilogue', offset: 0.26 },
  cta: { side: 1, dist: 11.6, sway: 0.42, warm: false, region: null, offset: DEFAULT_OFFSET },
}

const IDS = Object.keys(SCENE_SECTIONS) as SceneSectionId[]

export function isSceneSection(value: string | null | undefined): value is SceneSectionId {
  return !!value && (IDS as string[]).includes(value)
}

export function sectionConfig(id: SceneSectionId): SceneSectionConfig {
  return SCENE_SECTIONS[id] || SCENE_SECTIONS.intro
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** World-space point on the sheet that a region occupies (centre of the box). */
export function focusPoint(region: string | null, layout: StoryLayoutInfo | null): { x: number; y: number } {
  if (!region || !layout) return { x: 0, y: 0 }
  const box = layout.regions[region]
  if (!box) return { x: 0, y: 0 }
  return {
    x: (box.cx - 0.5) * CARD_W,
    y: (0.5 - clamp((box.y0 + box.y1) / 2, 0.03, 0.97)) * CARD_H,
  }
}
