/**
 * Draws the home page's product story onto a tall sheet of paper.
 *
 * Ported from the reference CV studio's `drawResume.ts`: an offscreen canvas is the
 * single source for the paper texture on the 3D card, and it records a `regions` map
 * (fractions of the page, not pixels) so the camera rig can zoom to the part of the
 * paper that matches the section being read.
 */
import { SHEET_CHAPTERS, SHEET_EPILOGUE, STORY_INTRO, type StoryPoint } from './story'

/** Paper proportions. All coordinates below are in these units. */
export const PAGE_W = 1024
export const PAGE_H = 1960

export interface Region {
  y0: number
  y1: number
  cx: number
}

export interface StoryLayoutInfo {
  regions: Record<string, Region>
  /** Where the written content ends, as a fraction of the page. */
  contentBottom: number
  overflow: boolean
}

const FONT = `"Inter Variable", Inter, system-ui, -apple-system, "Segoe UI", sans-serif`
const SERIF = `"Source Serif 4 Variable", Georgia, "Times New Roman", serif`
const PAPER = '#fffdf8'
const INK = 'rgba(15, 23, 42, 0.95)'
const BODY = 'rgba(30, 41, 59, 0.8)'
const MUTED = 'rgba(71, 85, 105, 0.75)'
const LINE = 'rgba(15, 23, 42, 0.1)'
const PRIMARY = '#1677ff'
const ACCENT = '#13c2c2'
const NAVY = '#0f3b66'

const MARGIN = 96
const WIDTH = PAGE_W - MARGIN * 2

type Ctx = CanvasRenderingContext2D

interface State {
  overflow: boolean
  bottom: number
}

function font(ctx: Ctx, weight: number, size: number, color: string, family = FONT) {
  ctx.font = `${weight} ${size}px ${family}`
  ctx.fillStyle = color
}

function spacing(ctx: Ctx, px: number) {
  if ('letterSpacing' in ctx) (ctx as Ctx & { letterSpacing: string }).letterSpacing = `${px}px`
}

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wrap(ctx: Ctx, text: string, maxW: number): string[] {
  const out: string[] = []
  for (const para of text.split('\n')) {
    const words = para.split(/\s+/).filter(Boolean)
    if (!words.length) continue
    let line = ''
    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (ctx.measureText(test).width > maxW && line) {
        out.push(line)
        line = word
      } else line = test
    }
    if (line) out.push(line)
  }
  return out
}

function paragraph(ctx: Ctx, text: string, x: number, y: number, w: number, lineHeight: number, color: string, size: number) {
  font(ctx, 400, size, color)
  const lines = wrap(ctx, text, w)
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight))
  return y + (lines.length - 1) * lineHeight
}

function eyebrow(ctx: Ctx, label: string, x: number, y: number, color: string) {
  font(ctx, 700, 13, color)
  spacing(ctx, 3)
  ctx.fillText(label.toUpperCase(), x, y)
  spacing(ctx, 0)
}

interface BulletRow {
  label: string
  detail?: string
  top: number
}

const BULLET_ROW = 24

function layoutBullets(points: StoryPoint[]): { rows: BulletRow[]; height: number } {
  const rows: BulletRow[] = []
  let cursor = 0
  for (const point of points) {
    rows.push({ label: point.label, detail: point.detail, top: cursor })
    cursor += BULLET_ROW
  }
  return { rows, height: cursor }
}

function bulletsCard(ctx: Ctx, points: StoryPoint[], x: number, y: number, w: number, accent: string) {
  const { rows, height } = layoutBullets(points)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.032)'
  rr(ctx, x - 22, y - 6, w + 44, height + 14, 12)
  ctx.fill()

  for (const row of rows) {
    const baseline = y + row.top + 19
    ctx.fillStyle = accent
    ctx.beginPath()
    ctx.arc(x + 4, baseline - 5, 3.2, 0, Math.PI * 2)
    ctx.fill()
    font(ctx, 600, 15.5, INK)
    ctx.fillText(row.label, x + 20, baseline)
    if (row.detail) {
      const labelWidth = ctx.measureText(row.label).width
      font(ctx, 400, 13.5, MUTED)
      ctx.fillText(`· ${row.detail}`, x + 30 + labelWidth, baseline)
    }
  }
  return height + 14
}

/** The masthead doubles as the "home" the camera pulls back to for the hero. */
function masthead(ctx: Ctx, st: State): number {
  // Monogram: a quiet leaf on a navy disc.
  ctx.fillStyle = NAVY
  ctx.beginPath()
  ctx.arc(MARGIN + 30, 122, 30, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.moveTo(MARGIN + 30, 102)
  ctx.bezierCurveTo(MARGIN + 50, 113, MARGIN + 48, 136, MARGIN + 30, 145)
  ctx.bezierCurveTo(MARGIN + 12, 136, MARGIN + 10, 113, MARGIN + 30, 102)
  ctx.fill()
  ctx.strokeStyle = NAVY
  ctx.lineWidth = 2.6
  ctx.beginPath()
  ctx.moveTo(MARGIN + 30, 110)
  ctx.lineTo(MARGIN + 30, 142)
  ctx.stroke()

  font(ctx, 700, 28, INK)
  ctx.fillText('LEAF', MARGIN + 78, 118)
  font(ctx, 500, 14, MUTED)
  ctx.fillText('One career profile · every document', MARGIN + 78, 142)

  font(ctx, 700, 12.5, PRIMARY)
  spacing(ctx, 2.8)
  ctx.fillText('CV · COVER LETTER · PERSONAL SITE', MARGIN, 200)
  spacing(ctx, 0)

  font(ctx, 700, 36, INK, SERIF)
  const headline = wrap(ctx, STORY_INTRO.title, WIDTH * 0.92)
  let y = 254
  headline.forEach((line) => {
    ctx.fillText(line, MARGIN, y)
    y += 44
  })

  y = paragraph(ctx, STORY_INTRO.body, MARGIN, y + 8, WIDTH * 0.8, 26, BODY, 19) + 8

  // The product truths sit as pills under the introduction.
  let pillX = MARGIN
  y += 14
  for (const point of STORY_INTRO.points) {
    font(ctx, 600, 14, NAVY)
    const label = point.label
    const pillW = ctx.measureText(label).width + 40
    ctx.fillStyle = 'rgba(22, 119, 255, 0.08)'
    rr(ctx, pillX, y, pillW, 32, 16)
    ctx.fill()
    ctx.fillStyle = ACCENT
    ctx.beginPath()
    ctx.arc(pillX + 17, y + 16, 3.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = NAVY
    ctx.fillText(label, pillX + 28, y + 21)
    pillX += pillW + 14
  }
  y += 32 + 24

  ctx.fillStyle = LINE
  ctx.fillRect(MARGIN, y, WIDTH, 1)
  st.bottom = y
  return y + 42
}

interface BlockInput {
  eyebrow: string
  title: string
  body: string
  points: StoryPoint[]
}

function storyBlock(ctx: Ctx, block: BlockInput, y: number, accent: string, highlighted: boolean, st: State): number {
  const top = y - 32
  eyebrow(ctx, block.eyebrow, MARGIN, y, accent)

  font(ctx, 700, 32, INK, SERIF)
  ctx.fillText(block.title, MARGIN, y + 40)

  let cursor = paragraph(ctx, block.body, MARGIN, y + 40 + 30, WIDTH * 0.86, 26, BODY, 19.5) + 16
  cursor += bulletsCard(ctx, block.points, MARGIN, cursor, WIDTH * 0.9, accent)

  if (highlighted) {
    // The beat being read is tinted on the paper; the shader wipes the change in.
    const height = cursor - top + 8
    ctx.fillStyle = 'rgba(22, 119, 255, 0.055)'
    rr(ctx, MARGIN - 30, top, WIDTH + 60, height, 16)
    ctx.fill()
    ctx.strokeStyle = 'rgba(22, 119, 255, 0.4)'
    ctx.lineWidth = 2
    rr(ctx, MARGIN - 29, top + 1, WIDTH + 58, height - 2, 15)
    ctx.stroke()
  }

  ctx.fillStyle = LINE
  ctx.fillRect(MARGIN, cursor + 16, WIDTH, 1)
  st.bottom = Math.max(st.bottom, cursor + 16)
  st.overflow = st.overflow || cursor + 16 > PAGE_H - 150
  return cursor + 16 + 30
}

function footer(ctx: Ctx) {
  ctx.fillStyle = LINE
  ctx.fillRect(MARGIN, PAGE_H - 96, WIDTH, 1)
  font(ctx, 600, 13, MUTED)
  spacing(ctx, 1.8)
  ctx.fillText('leaf.app  ·  NO PAYMENT STEP  ·  PRIVATE UNTIL YOU SHARE', MARGIN, PAGE_H - 62)
  spacing(ctx, 0)
  font(ctx, 400, 13, MUTED)
  ctx.textAlign = 'right'
  ctx.fillText('Rendered by the same engine as your PDF', PAGE_W - MARGIN, PAGE_H - 62)
  ctx.textAlign = 'left'
}

/**
 * Draws the story and returns the region map the camera rig uses.
 * `scale` multiplies the pixel size (low-power devices pass 0.75);
 * `highlight` is the region the visitor is currently reading.
 */
export function drawStorySheet(canvas: HTMLCanvasElement, scale = 1, highlight: string | null = null): StoryLayoutInfo {
  canvas.width = Math.round(PAGE_W * scale)
  canvas.height = Math.round(PAGE_H * scale)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const regions: Record<string, Region> = {}
  const st: State = { overflow: false, bottom: 0 }
  if (!ctx) return { regions, contentBottom: 0, overflow: false }

  ctx.save()
  ctx.scale(scale, scale)
  ctx.clearRect(0, 0, PAGE_W, PAGE_H)
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, PAGE_W, PAGE_H)

  // A quiet paper grain, matching the marketing paper.
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = `rgba(40, 48, 42, ${Math.random() * 0.02})`
    ctx.fillRect(Math.random() * PAGE_W, Math.random() * PAGE_H, 1.4, 1.4)
  }

  const introTop = 76
  let y = masthead(ctx, st)
  regions.intro = { y0: introTop / PAGE_H, y1: y / PAGE_H, cx: 0.5 }

  SHEET_CHAPTERS.forEach((section, index) => {
    const top = y
    y = storyBlock(
      ctx,
      { eyebrow: section.eyebrow, title: section.title, body: section.sheetBody, points: section.points.slice(0, 2) },
      y,
      index % 2 === 0 ? PRIMARY : ACCENT,
      section.region === highlight,
      st,
    )
    if (section.region) regions[section.region] = { y0: top / PAGE_H, y1: y / PAGE_H, cx: 0.5 }
  })

  const epilogueTop = y
  y = storyBlock(
    ctx,
    { eyebrow: SHEET_EPILOGUE.eyebrow, title: SHEET_EPILOGUE.title, body: SHEET_EPILOGUE.body, points: SHEET_EPILOGUE.steps },
    y,
    NAVY,
    highlight === 'epilogue',
    st,
  )
  // The later beats (layouts, personal site, how it works) all close on this block.
  regions.epilogue = { y0: epilogueTop / PAGE_H, y1: Math.min(0.985, y / PAGE_H), cx: 0.5 }

  footer(ctx)
  ctx.restore()
  return { regions, contentBottom: st.bottom / PAGE_H, overflow: st.overflow }
}
