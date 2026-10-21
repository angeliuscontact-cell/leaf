/**
 * Lighting for the paper: a warm ambient, a directional key with a soft shadow, a focus
 * point light that slides to the active region and flares on input, and a local
 * light-former environment (no network fetch).
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Environment, Lightformer } from '@react-three/drei'
import { useScene, pulseAmount } from './store'
import { focusPoint, sectionConfig } from './sections'
import { damp, pointer } from './pointer'
import type { QualityTier } from './tiers'

export function Lights({ tier, palette }: { tier: QualityTier; palette: ScenePaletteLike }) {
  const light = useRef<THREE.PointLight>(null)
  const active = useScene((state) => state.active)
  const layout = useScene((state) => state.layout)
  const focus = useMemo(() => new THREE.Vector3(), [])
  const high = tier === 'high'

  useEffect(() => {
    const cfg = sectionConfig(active)
    const point = focusPoint(cfg.region, layout)
    focus.set(point.x, point.y, 0)
  }, [active, layout, focus])

  useFrame((state, dtRaw) => {
    const node = light.current
    if (!node) return
    const dt = Math.min(dtRaw, 1 / 20)
    const pulse = pulseAmount()
    const follow = Math.min(1, pulse * 1.4)

    const targetX = pointer.x * 3.2 + (focus.x - pointer.x * 3.2) * follow
    const targetY = pointer.y * 2.4 + 0.6 + (focus.y - (pointer.y * 2.4 + 0.6)) * follow

    node.position.x = damp(node.position.x, targetX, 5, dt)
    node.position.y = damp(node.position.y, targetY, 5, dt)
    node.position.z = 3.2
    node.intensity = 18 + 55 * pulse
    node.color.set(palette.glow)
  })

  return (
    <>
      <ambientLight intensity={0.85} color="#fff8f0" />
      <directionalLight
        position={[-3, 5, 8]}
        intensity={1.5}
        color="#fffaf3"
        castShadow={high}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-bias={-0.0004}
      />
      <pointLight ref={light} color={palette.glow} distance={16} decay={2} position={[0, 0.6, 3.2]} intensity={18} />

      <Environment resolution={tier === 'low' ? 32 : 128} frames={1}>
        <Lightformer form="rect" intensity={2.2} color="#ffffff" scale={[8, 8, 1]} position={[0, 6, -2]} rotation={[-Math.PI / 2, 0, 0]} />
        <Lightformer form="rect" intensity={1.4} color="#ffe9d2" scale={[6, 6, 1]} position={[-6, 2, 1]} rotation={[0, Math.PI / 2, 0]} />
        <Lightformer form="rect" intensity={1.1} color="#d9ecff" scale={[6, 6, 1]} position={[6, 1, 1]} rotation={[0, -Math.PI / 2, 0]} />
      </Environment>

      {/* Only the high tier receives this; the soft blob on the card carries the rest. */}
      {high ? (
        <mesh position={[0, 0, -1.1]} receiveShadow>
          <planeGeometry args={[18, 12]} />
          <shadowMaterial color="#4a3f35" opacity={0.1} transparent />
        </mesh>
      ) : null}
    </>
  )
}

/** Structural palette type, kept local so the module stays independent of palette.ts. */
export interface ScenePaletteLike {
  glow: string
  accent: string
  ink: string
}
