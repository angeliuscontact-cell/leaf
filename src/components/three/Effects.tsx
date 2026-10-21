/**
 * High-tier depth of field. The focus distance tracks the camera so the sheet stays sharp
 * as the rig moves between sections.
 */
import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, DepthOfField } from '@react-three/postprocessing'
import type { DepthOfFieldEffect } from 'postprocessing'

export function Effects({ enabled }: { enabled: boolean }) {
  const ref = useRef<DepthOfFieldEffect>(null)
  const { camera } = useThree()

  useFrame(() => {
    const material = ref.current?.circleOfConfusionMaterial
    if (material) material.worldFocusDistance = camera.position.z
  })

  if (!enabled) return null

  return (
    <EffectComposer multisampling={4} enableNormalPass={false}>
      <DepthOfField ref={ref} worldFocusRange={3.2} bokehScale={2.6} height={540} />
    </EffectComposer>
  )
}
