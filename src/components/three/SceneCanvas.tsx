/**
 * The single WebGL canvas: flat shading, a soft-shadow high tier, a local environment,
 * and a performance monitor that lowers DPR and drops post-processing before failing.
 */
import { useEffect, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { Backdrop } from './Backdrop'
import { Lights } from './Lights'
import { StoryCard } from './StoryCard'
import { GlassOrb } from './GlassOrb'
import { FloatingShapes } from './FloatingShapes'
import { CameraRig } from './CameraRig'
import { Effects } from './Effects'
import { dampPointer } from './pointer'
import { TIER_CONFIG, type QualityTier } from './tiers'
import type { ScenePalette } from './palette'

function PointerDriver() {
  useFrame((_, dt) => dampPointer(Math.min(dt, 1 / 20)))
  return null
}

export default function SceneCanvas({
  tier,
  palette,
  reduced,
  onLost,
}: {
  tier: QualityTier
  palette: ScenePalette
  reduced: boolean
  onLost: () => void
}) {
  const config = useMemo(() => TIER_CONFIG[tier === 'none' ? 'low' : tier], [tier])
  const [factor, setFactor] = useState(1)
  const [degraded, setDegraded] = useState(false)
  const [dpr, setDpr] = useState(() =>
    Math.min(
      typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1,
      THREE.MathUtils.lerp(1, config.dpr, 1),
    ),
  )

  useEffect(() => {
    setDpr(Math.min(window.devicePixelRatio || 1, THREE.MathUtils.lerp(1, config.dpr, factor)))
  }, [factor, config.dpr, degraded])

  useEffect(() => {
    if (!degraded) return
    // A failing monitor is a strong signal: stop the-frame effects and lower the ceiling.
    setFactor(0.5)
  }, [degraded])

  return (
    <Canvas
      flat
      dpr={dpr}
      shadows={tier === 'high' ? 'soft' : false}
      camera={{ fov: 35, position: [0, 0, 9.5], near: 0.1, far: 60 }}
      gl={{
        antialias: tier === 'medium',
        powerPreference: 'high-performance',
        alpha: false,
        stencil: false,
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color(palette.base), 1)
        gl.domElement.addEventListener(
          'webglcontextlost',
          (event) => {
            event.preventDefault()
            onLost()
          },
          { once: true },
        )
      }}
    >
      <color attach="background" args={[palette.base]} />
      <PointerDriver />
      <Backdrop palette={palette} />
      <Lights tier={tier} palette={palette} />
      <StoryCard tier={tier} palette={palette} reduced={reduced} />
      <GlassOrb tier={tier} reduced={reduced} />
      <FloatingShapes tier={tier} palette={palette} reduced={reduced} />
      <CameraRig />
      <Effects enabled={tier === 'high' && !degraded && config.postFx} />
      <PerformanceMonitor
        onIncline={({ factor: next }) => setFactor(next)}
        onChange={({ factor: next }) => setFactor(next)}
        onDecline={({ factor: next }) => setFactor(Math.max(0.5, next))}
        onFallback={({ factor: next }) => {
          setDegraded(true)
          setFactor(Math.min(0.5, next))
        }}
      />
    </Canvas>
  )
}
