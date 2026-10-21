/**
 * Sheet textures + the printed-face shader, ported from the reference CV studio.
 *
 * Two textures ping-pong: the old page stays on screen while the next highlight is
 * drawn, so the shader can wipe between them. The same drawn sheet is also used by
 * the 2D fallback.
 *
 * The pixels are copied out of the canvas into a DataTexture instead of uploading the
 * canvas directly. Canvas-backed uploads intermittently produced torn/garbage texels in
 * Chromium (and headless SwiftShader) after the sheet was redrawn on a section change;
 * reading the pixels back once per change is cheap and deterministic.
 */
import * as THREE from 'three'
import { drawStorySheet, type StoryLayoutInfo } from '../marketing/storySheet'

type SheetImage = { data: Uint8Array; width: number; height: number }

export class SheetTextures {
  private canvases: HTMLCanvasElement[]
  private textures: THREE.DataTexture[]
  private idx = 0
  readonly scale: number

  constructor(scale: number) {
    this.scale = scale
    this.canvases = [document.createElement('canvas'), document.createElement('canvas')]
    this.textures = [0, 1].map(() => {
      const texture = new THREE.DataTexture(new Uint8Array(4), 1, 1, THREE.RGBAFormat)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.generateMipmaps = false
      texture.flipY = false
      return texture
    })
    if (import.meta.env.DEV) {
      ;(window as unknown as { __leafSheetCanvases?: HTMLCanvasElement[] }).__leafSheetCanvases = this.canvases
    }
  }

  private upload(index: number): void {
    const canvas = this.canvases[index]
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    const { width, height } = canvas
    const source = ctx.getImageData(0, 0, width, height).data
    const texture = this.textures[index]
    let image = texture.image as SheetImage | undefined
    if (!image?.data || image.width !== width || image.height !== height || image.data.length !== source.length) {
      image = { data: new Uint8Array(source.length), width, height }
      texture.image = image as unknown as THREE.DataTexture['image']
    }
    const target = image.data
    const rowBytes = width * 4
    // DataTexture rows run bottom-to-top, so copy the canvas rows in reverse.
    for (let y = 0; y < height; y++) {
      const start = y * rowBytes
      target.set(source.subarray(start, start + rowBytes), (height - 1 - y) * rowBytes)
    }
    texture.needsUpdate = true
  }

  init(highlight: string | null): { texture: THREE.Texture; info: StoryLayoutInfo } {
    const info = drawStorySheet(this.canvases[0], this.scale, highlight)
    drawStorySheet(this.canvases[1], this.scale, highlight)
    this.upload(0)
    this.upload(1)
    this.idx = 0
    return { texture: this.textures[0], info }
  }

  draw(highlight: string | null): { prev: THREE.Texture; next: THREE.Texture; info: StoryLayoutInfo } {
    const prev = this.textures[this.idx]
    this.idx = 1 - this.idx
    const info = drawStorySheet(this.canvases[this.idx], this.scale, highlight)
    this.upload(this.idx)
    return { prev, next: this.textures[this.idx], info }
  }

  redraw(highlight: string | null): { texture: THREE.Texture; info: StoryLayoutInfo } {
    const info = drawStorySheet(this.canvases[this.idx], this.scale, highlight)
    this.upload(this.idx)
    return { texture: this.textures[this.idx], info }
  }

  /** Redraws both buffers (used when the stage changes the highlight drastically). */
  redrawBoth(highlight: string | null): { texture: THREE.Texture; info: StoryLayoutInfo } {
    const info = drawStorySheet(this.canvases[0], this.scale, highlight)
    drawStorySheet(this.canvases[1], this.scale, highlight)
    this.upload(0)
    this.upload(1)
    return { texture: this.textures[0], info }
  }

  dispose(): void {
    this.textures.forEach((texture) => texture.dispose())
  }
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vN;
  void main() {
    vUv = uv;
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

/**
 * front = uMix * 1.4 - 0.2; edge = (1 - uv.y) + noise(uv * (7, 11)) * 0.16
 * k = 1 - smoothstep(front - 0.035, front + 0.035, edge); color = mix(prev, next, k)
 * An accent band follows the wipe edge; the frame glows with an input pulse; a light
 * dependent sheen keeps the paper from looking flat.
 */
const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform sampler2D uPrev;
  uniform float uMix;
  uniform float uPulse;
  uniform vec3 uAccent;
  uniform vec3 uLight;
  varying vec2 vUv;
  varying vec3 vN;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  void main() {
    vec3 a = texture2D(uPrev, vUv).rgb;
    vec3 b = texture2D(uMap, vUv).rgb;

    float n = noise(vUv * vec2(7.0, 11.0)) * 0.16;
    float front = uMix * 1.4 - 0.2;
    float edge = (1.0 - vUv.y) + n;
    float k = 1.0 - smoothstep(front - 0.035, front + 0.035, edge);
    float running = step(0.001, uMix) * step(uMix, 0.999);
    float band = (1.0 - smoothstep(0.0, 0.05, abs(edge - front))) * running;

    vec3 col = mix(a, b, k);
    col = mix(col, uAccent, band * 0.4);

    float fe = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    col = mix(col, uAccent, (1.0 - smoothstep(0.0, 0.006, fe)) * uPulse);

    float l = dot(normalize(vN), normalize(uLight));
    col *= 0.965 + 0.035 * l;

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

export function makeCardMaterial(accent: string): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: null },
      uPrev: { value: null },
      uMix: { value: 1 },
      uPulse: { value: 0 },
      uAccent: { value: new THREE.Color(accent) },
      uLight: { value: new THREE.Vector3(0.3, 0.5, 1) },
    },
    vertexShader,
    fragmentShader,
    toneMapped: false,
  })
}
