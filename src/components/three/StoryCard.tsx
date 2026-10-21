/**
 * The hero object: a tall printed sheet with a frosted glass card behind it.
 *
 * Ported from the reference CV studio's `ResumeCard`: intro rise, idle sway, pointer
 * parallax, the "flop" spring on every beat, a noisy wipe when the drawn highlight
 * changes and a full Y flip when the visual variant changes (theme switch).
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { CARD_H, CARD_W, sectionConfig } from './sections'
import { pulseAmount, useScene } from './store'
import { damp, pointer } from './pointer'
import { SheetTextures, makeCardMaterial } from './sheet'
import { TIER_CONFIG, type QualityTier } from './tiers'
import type { ScenePalette } from './palette'
import type { StoryLayoutInfo } from '../marketing/storySheet'

const T = 0.025

function roundedShape(w: number, h: number, r: number) {
  const shape = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  shape.moveTo(x + r, y)
  shape.lineTo(x + w - r, y)
  shape.quadraticCurveTo(x + w, y, x + w, y + r)
  shape.lineTo(x + w, y + h - r)
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  shape.lineTo(x + r, y + h)
  shape.quadraticCurveTo(x, y + h, x, y + h - r)
  shape.lineTo(x, y + r)
  shape.quadraticCurveTo(x, y, x + r, y)
  return shape
}

/** Frosted glass sheet behind the paper. */
function GlassPanel() {
  const geometry = useMemo(() => {
    // A 0.03 corner radius on a 0.025-thick RoundedBox is not representable (edge radius
    // must be smaller than half the thickness), so the slab is extruded from a rounded
    // rectangle profile instead. The look matches: rounded corners, thin body.
    const extruded = new THREE.ExtrudeGeometry(roundedShape(CARD_W + 0.55, CARD_H + 0.55, 0.09), {
      depth: 0.05,
      bevelEnabled: false,
      curveSegments: 10,
    })
    extruded.translate(0, 0, -0.025)
    return extruded
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh geometry={geometry} position={[0.12, -0.1, -0.42]}>
      <meshPhysicalMaterial
        color="#ffffff"
        transparent
        opacity={0.28}
        roughness={0.14}
        metalness={0}
        clearcoat={1}
        clearcoatRoughness={0.12}
      />
    </mesh>
  )
}

/** Cheap vertical contact shadow; carries the scene when real shadows are off. */
function SoftShadow() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const gradient = ctx.createRadialGradient(128, 128, 6, 128, 128, 124)
      gradient.addColorStop(0, 'rgba(15, 23, 42, 0.34)')
      gradient.addColorStop(0.5, 'rgba(15, 23, 42, 0.13)')
      gradient.addColorStop(1, 'rgba(15, 23, 42, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 256, 256)
    }
    const result = new THREE.CanvasTexture(canvas)
    result.colorSpace = THREE.SRGBColorSpace
    return result
  }, [])
  useEffect(() => () => texture.dispose(), [texture])

  return (
    <mesh position={[0.1, -0.32, -0.7]} scale={[CARD_W * 1.2, CARD_H * 1.1, 1]}>
      <planeGeometry args={[2, 2]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} opacity={0.55} />
    </mesh>
  )
}

export function StoryCard({ tier, palette, reduced }: { tier: QualityTier; palette: ScenePalette; reduced: boolean }) {
  const group = useRef<THREE.Group>(null)
  const { size } = useThree()
  const textures = useMemo(
    () => new SheetTextures(TIER_CONFIG[tier === 'none' ? 'low' : tier].textureScale),
    [tier],
  )
  const material = useMemo(() => makeCardMaterial(palette.accent), [])
  const highlightRef = useRef<string | null>(null)
  const redrawTimer = useRef<number | null>(null)
  const introRef = useRef(reduced ? 1 : 0)
  const flipRef = useRef(-1)
  const anim = useRef({ wobble: 0, wobbleV: 0, mixStart: -1, pulseStart: -1e9, pulseStrength: 0 })
  const active = useScene((state) => state.active)
  const reduceMotion = useScene((state) => state.reduced)
  const flipId = useScene((state) => state.flip)

  const bodyGeometry = useMemo(() => {
    // No bevel: a bevel would sit in front of the printed face and hide the sheet.
    const extruded = new THREE.ExtrudeGeometry(roundedShape(CARD_W, CARD_H, 0.04), {
      depth: T,
      bevelEnabled: false,
      curveSegments: 12,
    })
    extruded.translate(0, 0, -T / 2)
    return extruded
  }, [])
  useEffect(() => () => bodyGeometry.dispose(), [bodyGeometry])
  useEffect(() => () => material.dispose(), [material])
  useEffect(() => () => textures.dispose(), [textures])
  useEffect(() => {
    if (import.meta.env.DEV) {
      ;(window as unknown as { __leafCard?: THREE.Group | null }).__leafCard = group.current
    }
  }, [])

  // Initial sheet: draw the region of whatever beat is active when the layer mounts
  // (the page may be loaded scrolled to #templates).
  useEffect(() => {
    const region = sectionConfig(useScene.getState().active).region
    const { texture, info } = textures.init(region)
    highlightRef.current = region
    material.uniforms.uMap.value = texture
    material.uniforms.uPrev.value = texture
    material.uniforms.uMix.value = 1
    material.uniforms.uAccent.value.set(palette.accent)
    useScene.getState().setLayout(info)
    useScene.getState().setReady(true)

    // Redraw once the web fonts arrive so the paper matches the page typography.
    let cancelled = false
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready
        .then(() => {
          if (cancelled) return
          const redrawn = textures.redrawBoth(highlightRef.current)
          material.uniforms.uMap.value = redrawn.texture
          material.uniforms.uPrev.value = redrawn.texture
          useScene.getState().setLayout(redrawn.info)
        })
        .catch(() => undefined)
    }

    return () => {
      cancelled = true
      if (redrawTimer.current) window.clearTimeout(redrawTimer.current)
    }
    // Mount-only by design: `active` and the palette are handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    material.uniforms.uAccent.value.set(palette.accent)
  }, [palette.accent, material])

  // A variant change (theme flip) turns the card through a full revolution.
  useEffect(() => {
    if (flipId > 0 && !reduceMotion) flipRef.current = performance.now()
  }, [flipId, reduceMotion])

  // Section change: redraw the highlight and wipe between the old and new sheet.
  useEffect(() => {
    const region = sectionConfig(active).region
    if (!material.uniforms.uMap.value) return
    if (region === highlightRef.current) return
    highlightRef.current = region

    if (redrawTimer.current) window.clearTimeout(redrawTimer.current)
    const delay = reduceMotion ? 0 : 180
    redrawTimer.current = window.setTimeout(() => {
      const { prev, next, info } = textures.draw(region)
      const uniforms = material.uniforms
      uniforms.uPrev.value = prev
      uniforms.uMap.value = next
      uniforms.uMix.value = 0
      anim.current.mixStart = performance.now()
      anim.current.wobbleV += reduceMotion ? 0.35 : 1.1
      anim.current.pulseStart = performance.now()
      anim.current.pulseStrength = 0.55
      useScene.getState().setLayout(info)
    }, delay)
    return () => {
      if (redrawTimer.current) window.clearTimeout(redrawTimer.current)
    }
  }, [active, reduceMotion, textures, material])

  // Intro tween, 1.5s power3.out after a beat.
  useEffect(() => {
    if (reduceMotion) {
      introRef.current = 1
      return
    }
    const state = { value: 0 }
    const tween = gsap.to(state, {
      value: 1,
      duration: 1.5,
      delay: 0.1,
      ease: 'power3.out',
      onUpdate: () => {
        introRef.current = state.value
      },
    })
    return () => {
      tween.kill()
    }
  }, [reduceMotion])

  useFrame((state, dtRaw) => {
    const node = group.current
    if (!node) return
    const dt = Math.min(dtRaw, 1 / 20)
    const now = performance.now()
    const a = anim.current
    const cfg = sectionConfig(active)
    const mobile = size.width < 768
    const t = state.clock.elapsedTime
    const intro = introRef.current
    const pulse = pulseAmount(now)

    let flipSpin = 0
    if (flipRef.current >= 0) {
      const p = Math.min(1, (now - flipRef.current) / 1150)
      flipSpin = (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2) * Math.PI * 2
      if (p >= 1) flipRef.current = -1
    }

    const baseY = mobile ? 0 : -cfg.side * 0.28
    const targetY = baseY + Math.sin(t * 0.5) * cfg.sway + pointer.x * 0.38 + (1 - intro) * Math.PI * 0.6
    const targetX = -pointer.y * 0.26 + Math.sin(t * 0.7) * 0.03 + a.wobble

    node.rotation.y = damp(node.rotation.y, targetY, 4, dt) + flipSpin
    node.rotation.x = damp(node.rotation.x, targetX, 6, dt)
    node.rotation.z = Math.sin(t * 0.4) * 0.012
    node.position.y = Math.sin(t * 0.9) * 0.06 - (1 - intro) * 1.2
    node.scale.setScalar(0.8 + 0.2 * intro)

    a.wobbleV += (-a.wobble * 60 - a.wobbleV * 7) * dt
    a.wobble += a.wobbleV * dt

    const uniforms = material.uniforms
    if (a.mixStart >= 0) {
      const k = Math.min(1, (now - a.mixStart) / (reduceMotion ? 260 : 800))
      uniforms.uMix.value = 1 - Math.pow(1 - k, 2)
      if (k >= 1) a.mixStart = -1
    }

    uniforms.uPulse.value = pulse * 0.9
    uniforms.uLight.value.set(pointer.x * 0.9, pointer.y * 0.9 + 0.4, 1)
  })

  return (
    <group ref={group}>
      <SoftShadow />
      <mesh geometry={bodyGeometry} castShadow>
        <meshStandardMaterial color={palette.paper} roughness={0.92} />
      </mesh>
      {/* The printed face sits just in front of the card body. */}
      <mesh position={[0, 0, T / 2 + 0.004]}>
        <planeGeometry args={[CARD_W - 0.02, CARD_H - 0.02]} />
        <primitive object={material} attach="material" />
      </mesh>
      <mesh position={[0, 0, -T / 2 - 0.004]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[CARD_W - 0.02, CARD_H - 0.02]} />
        <meshStandardMaterial color={palette.paperEdge} roughness={0.9} />
      </mesh>
      <GlassPanel />
    </group>
  )
}

export type { StoryLayoutInfo }
