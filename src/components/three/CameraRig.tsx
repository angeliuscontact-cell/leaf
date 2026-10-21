/**
 * Scroll choreography: zoom to the active region of the sheet, park the card on the
 * side belonging to that beat, and lean with the pointer.
 */
import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useScene } from './store'
import { focusPoint, sectionConfig } from './sections'
import { damp, pointer } from './pointer'

export function CameraRig() {
  const { camera, size } = useThree()
  const active = useScene((state) => state.active)
  const layout = useScene((state) => state.layout)
  const look = useMemo(() => new THREE.Vector2(0, 0), [])
  const frames = useRef(0)
  if (import.meta.env.DEV) {
    ;(window as unknown as { __leafCamera?: THREE.Camera }).__leafCamera = camera
  }

  useFrame((_, dtRaw) => {
    frames.current += 1
    const dt = Math.min(dtRaw, 1 / 20)
    const cfg = sectionConfig(active)
    const perspective = camera as THREE.PerspectiveCamera
    const tan = Math.tan(THREE.MathUtils.degToRad(perspective.fov / 2))
    const mobile = size.width < 768
    const mobileFactor = 1.4
    const dist = cfg.dist * (mobile ? mobileFactor : 1)
    const vh = 2 * tan * dist
    const vw = vh * Math.max(0.25, perspective.aspect)

    const focus = focusPoint(cfg.region, layout)
    const portableX = mobile ? 0 : cfg.side * vw * cfg.offset
    const portableY = mobile ? vh * 0.2 : 0

    look.x = damp(look.x, focus.x - portableX, 2.6, dt)
    look.y = damp(look.y, focus.y - portableY, 2.6, dt)

    camera.position.x = look.x + pointer.x * 0.22
    camera.position.y = look.y + pointer.y * 0.16
    camera.position.z = damp(camera.position.z, dist, 2.4, dt)
    camera.lookAt(look.x, look.y, 0)
    camera.updateMatrixWorld()
    if (import.meta.env.DEV) {
      ;(window as unknown as { __leafCameraDebug?: object }).__leafCameraDebug = {
        active,
        cfgDist: cfg.dist,
        dist,
        lookX: look.x,
        lookY: look.y,
        z: camera.position.z,
        frames: frames.current,
        dtRaw,
      }
    }
  })

  return null
}
