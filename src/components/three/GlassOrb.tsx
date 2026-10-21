/**
 * A slow glass bead that drifts around the paper. Real transmission on the high tier,
 * clearcoat glass on medium/low.
 */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MeshTransmissionMaterial } from '@react-three/drei'
import { pulseAmount } from './store'
import { pointer } from './pointer'
import type { QualityTier } from './tiers'

export function GlassOrb({ tier, reduced }: { tier: QualityTier; reduced: boolean }) {
  const mesh = useRef<THREE.Mesh>(null)
  const motion = reduced ? 0.35 : 1

  useFrame((state) => {
    const node = mesh.current
    if (!node) return
    const t = state.clock.elapsedTime
    const pulse = pulseAmount()
    const a = t * 0.35 * motion
    node.position.x = Math.cos(a) * 1.9 * motion + pointer.x * 0.5
    node.position.y = Math.sin(t * 0.5 * motion) * 1.0 * motion + 0.3 + pointer.y * 0.35
    node.position.z = Math.sin(a) * 0.9 * motion + 0.5
    node.scale.setScalar(0.24 * (1 + 0.35 * pulse))
  })

  return (
    <mesh ref={mesh} position={[1.9, 0.3, 0.5]} frustumCulled={false}>
      <sphereGeometry args={[1, 48, 48]} />
      {tier === 'high' ? (
        <MeshTransmissionMaterial
          samples={4}
          resolution={256}
          thickness={0.9}
          roughness={0.03}
          chromaticAberration={0.04}
          anisotropicBlur={0.06}
          ior={1.2}
          distortion={0.08}
          temporalDistortion={0.04}
          backside={false}
          color="#ffffff"
        />
      ) : (
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.34}
          roughness={0.08}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      )}
    </mesh>
  )
}
