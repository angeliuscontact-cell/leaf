/**
 * Flat scene palette, derived from the app's CSS tokens so the 3D layer follows the
 * light / dark theme. Documents stay paper-white in both; only the room changes.
 */
export interface ScenePalette {
  base: string
  alternate: string
  ink: string
  accent: string
  glow: string
  paper: string
  paperEdge: string
  shapeColors: string[]
}

export const LIGHT_PALETTE: ScenePalette = {
  base: '#f5f5f5',
  alternate: '#f4efe6',
  ink: '#1f2937',
  accent: '#1677ff',
  glow: '#e8f2ff',
  paper: '#fffdf8',
  paperEdge: '#e7e2d6',
  shapeColors: ['#1677ff', '#13c2c2', '#0f3b66', '#d8dee9', '#efe9dd', '#8a94a6', '#5aa8ff'],
}

export const DARK_PALETTE: ScenePalette = {
  base: '#0b1220',
  alternate: '#131b2a',
  ink: '#9fb0c7',
  accent: '#4c9aff',
  glow: '#142644',
  paper: '#fffdf8',
  paperEdge: '#d9d2c4',
  shapeColors: ['#4c9aff', '#2dd4bf', '#7aa7ff', '#2a3b55', '#1c2b45', '#5f718a', '#8fd8d2'],
}

export function paletteFor(dark: boolean): ScenePalette {
  return dark ? DARK_PALETTE : LIGHT_PALETTE
}
