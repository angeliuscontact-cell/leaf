/**
 * Two instanced meshes (icosahedra + tori) with seeded homes, spring physics, cursor
 * repulsion, click scatter and input pulse scale. Two draw calls, no per-frame
 * allocations: every matrix is written into the instances in place.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { pulseAmount, useScene } from './store'
import { pointer } from './pointer'
import { TIER_CONFIG, type QualityTier } from './tiers'
import type { ScenePalette } from './palette'

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Shape {
  home: THREE.Vector3
  pos: THREE.Vector3
  vel: THREE.Vector3
  rx: number
  ry: number
  vx: number
  vy: number
  scale: number
  phase: number
}

function makeShapes(count: number, seed: number, reduced: boolean, kind: 'ico' | 'torus', mobile: boolean): Shape[] {
  const random = mulberry32(seed)
  const spread = reduced ? 0.6 : 1
  return Array.from({ length: count }, () => {
    // Keep the shapes behind the paper and out of the left-hand copy column on desktop;
    // the narrow mobile viewport gets a full spread behind a stronger scrim.
    const home = new THREE.Vector3(
      mobile ? (random() * 2 - 1) * 9 : -2.8 + random() * 8.8,
      (random() * 2 - 1) * 5.2,
      -4.5 + random() * 3.5,
    )
    home.multiplyScalar(spread)
    return {
      home,
      pos: home.clone(),
      vel: new THREE.Vector3(),
      rx: random() * Math.PI * 2,
      ry: random() * Math.PI * 2,
      vx: 0,
      vy: 0,
      scale: (kind === 'ico' ? 0.14 + random() * 0.3 : 0.2 + random() * 0.3) * (reduced ? 0.7 : 1),
      phase: random() * Math.PI * 2,
    }
  })
}

function InstancedCloud({
  shapes,
  colors,
  geometry,
}: {
  shapes: Shape[]
  colors: string[]
  geometry: 'ico' | 'torus'
}) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const { camera } = useThree()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const hoverOrigin = useMemo(() => new THREE.Vector3(), [])
  const hoverDir = useMemo(() => new THREE.Vector3(), [])
  const clickOrigin = useMemo(() => new THREE.Vector3(), [])
  const clickDir = useMemo(() => new THREE.Vector3(), [])
  const ndc = useMemo(() => new THREE.Vector2(), [])
  const impulseId = useRef(useScene.getState().impulse.id)

  // Colour every instance (and refresh when the theme palette changes).
  useEffect(() => {
    const node = mesh.current
    if (!node) return
    const tint = new THREE.Color()
    shapes.forEach((_, index) => {
      tint.set(colors[index % colors.length])
      node.setColorAt(index, tint)
    })
    if (node.instanceColor) node.instanceColor.needsUpdate = true
  }, [colors, shapes])

  useFrame((state, dtRaw) => {
    const node = mesh.current
    if (!node) return
    const dt = Math.min(dtRaw, 1 / 30)
    const t = state.clock.elapsedTime
    const pulse = pulseAmount()
    const raycaster = state.raycaster
    const ray = raycaster.ray

    // Hover ray, captured so shapes can test it on their own depth planes.
    ndc.set(pointer.x, pointer.y)
    raycaster.setFromCamera(ndc, camera)
    hoverOrigin.copy(ray.origin)
    hoverDir.copy(ray.direction)

    // A click seeds a second ray and scatters everything near it.
    const impulse = useScene.getState().impulse
    const fresh = impulse.id !== impulseId.current
    if (fresh) {
      impulseId.current = impulse.id
      ndc.set(impulse.x, impulse.y)
      raycaster.setFromCamera(ndc, camera)
      clickOrigin.copy(ray.origin)
      clickDir.copy(ray.direction)
    }
    // Leave the shared raycaster pointing at the cursor again.
    ray.origin.copy(hoverOrigin)
    ray.direction.copy(hoverDir)

    const hoverZ = hoverDir.z || 0.0001
    const clickZ = clickDir.z || 0.0001

    shapes.forEach((shape, index) => {
      const ax = (shape.home.x + Math.sin(t * 0.4 + shape.phase) * 0.28 - shape.pos.x) * 9 - shape.vel.x * 2.6
      const ay = (shape.home.y + Math.cos(t * 0.33 + shape.phase * 1.7) * 0.34 - shape.pos.y) * 9 - shape.vel.y * 2.6
      const az = (shape.home.z - shape.pos.z) * 9 - shape.vel.z * 2.6
      shape.vel.x += ax * dt
      shape.vel.y += ay * dt
      shape.vel.z += az * dt

      // Cursor repel on the shape's own depth plane.
      const hoverT = (shape.pos.z - hoverOrigin.z) / hoverZ
      if (hoverT > 0) {
        const hx = hoverOrigin.x + hoverDir.x * hoverT
        const hy = hoverOrigin.y + hoverDir.y * hoverT
        const dx = shape.pos.x - hx
        const dy = shape.pos.y - hy
        const distance = Math.hypot(dx, dy)
        if (distance < 2.1 && distance > 0.0001) {
          const force = (1 - distance / 2.1) * 36
          shape.vel.x += (dx / distance) * force * dt
          shape.vel.y += (dy / distance) * force * dt
        }
      }

      // Click scatter, once per click.
      if (fresh) {
        const clickT = (shape.pos.z - clickOrigin.z) / clickZ
        const clickX = clickOrigin.x + clickDir.x * clickT
        const clickY = clickOrigin.y + clickDir.y * clickT
        const dx = shape.pos.x - clickX
        const dy = shape.pos.y - clickY
        const distance = Math.hypot(dx, dy)
        if (distance < 5.5 && distance > 0.0001) {
          const force = (1 - distance / 5.5) * 11
          shape.vel.x += (dx / distance) * force
          shape.vel.y += (dy / distance) * force
          shape.vel.z += (Math.random() - 0.5) * force
          shape.vx += (Math.random() - 0.5) * 7
          shape.vy += (Math.random() - 0.5) * 7
        }
      }

      shape.pos.x += shape.vel.x * dt
      shape.pos.y += shape.vel.y * dt
      shape.pos.z += shape.vel.z * dt

      shape.vx *= Math.exp(-0.9 * dt)
      shape.vy *= Math.exp(-0.9 * dt)
      shape.rx += (0.25 + shape.vx) * dt
      shape.ry += (0.2 + shape.vy) * dt

      dummy.position.copy(shape.pos)
      dummy.rotation.set(shape.rx, shape.ry, 0)
      dummy.scale.setScalar(shape.scale * (1 + 0.22 * pulse))
      dummy.updateMatrix()
      node.setMatrixAt(index, dummy.matrix)
    })

    node.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, shapes.length]} frustumCulled={false}>
      {geometry === 'ico' ? <icosahedronGeometry args={[1, 0]} /> : <torusGeometry args={[1, 0.36, 6, 14]} />}
      <meshStandardMaterial roughness={0.55} metalness={0.05} flatShading />
    </instancedMesh>
  )
}

export function FloatingShapes({
  tier,
  palette,
  reduced,
}: {
  tier: QualityTier
  palette: ScenePalette
  reduced: boolean
}) {
  const config = TIER_CONFIG[tier === 'none' ? 'low' : tier]
  const mobile = useThree((state) => state.size.width < 768)
  const icos = useMemo(() => makeShapes(config.icos, 1337, reduced, 'ico', mobile), [config.icos, reduced, mobile])
  const tori = useMemo(() => makeShapes(config.tori, 7331, reduced, 'torus', mobile), [config.tori, reduced, mobile])

  return (
    <group>
      <InstancedCloud shapes={icos} colors={palette.shapeColors} geometry="ico" />
      <InstancedCloud shapes={tori} colors={palette.shapeColors} geometry="torus" />
    </group>
  )
}
