/**
 * The dot-grid backdrop.
 *
 * One large plane at z = -7 with a flat base colour, a 0.7-unit dot grid, a dot swell
 * around the cursor, and four round-robin ripple slots that warp the grid and tint dots
 * toward the accent. The base colour eases between the section's base / alternate tone.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useScene } from './store'
import { focusPoint, sectionConfig } from './sections'
import { pointer } from './pointer'
import type { ScenePalette } from './palette'

const vertexShader = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uInk;
  uniform vec3 uAccent;
  uniform vec2 uCursor;
  uniform float uTime;
  uniform vec4 uR[4];
  varying vec3 vWorld;

  void main() {
    vec2 p = vWorld.xy;
    float near = smoothstep(3.2, 0.0, distance(p, uCursor));

    vec2 samplePos = p;
    float ring = 0.0;
    float tint = 0.0;

    for (int i = 0; i < 4; i++) {
      vec4 r = uR[i];
      float age = uTime - r.z;
      if (age > 0.0 && age < 4.0 && r.w > 0.001) {
        float radius = age * 7.0;
        float d = distance(p, r.xy);
        float w = exp(-pow((d - radius) * 0.9, 2.0)) * exp(-age * 1.3) * r.w;
        ring += w;
        vec2 dir = normalize(p - r.xy + vec2(0.0001, 0.0001));
        samplePos -= dir * w * 0.35;
        tint += w * 0.55;
      }
    }

    vec2 cell = floor(samplePos / 0.7);
    vec2 centre = (cell + 0.5) * 0.7;
    float d = length(samplePos - centre);
    float radius = 0.028 + near * 0.03 + clamp(ring, 0.0, 1.0) * 0.03;
    float mask = 1.0 - smoothstep(radius * 0.5, radius, d);

    vec3 dotColor = mix(uInk, uAccent, clamp(tint, 0.0, 0.55));
    vec3 col = mix(uBase, dotColor, mask * 0.16);

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

const RIPPLE_COUNT = 4

export function Backdrop({ palette }: { palette: ScenePalette }) {
  const { camera } = useThree()
  const active = useScene((state) => state.active)
  const layout = useScene((state) => state.layout)

  const rings = useMemo(
    () => Array.from({ length: RIPPLE_COUNT }, () => new THREE.Vector4(0, 0, -999, 0)),
    [],
  )
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uBase: { value: new THREE.Color(palette.base) },
          uInk: { value: new THREE.Color(palette.ink) },
          uAccent: { value: new THREE.Color(palette.accent) },
          uCursor: { value: new THREE.Vector2() },
          uTime: { value: 0 },
          uR: { value: rings },
        },
        vertexShader,
        fragmentShader,
        depthWrite: true,
        toneMapped: false,
      }),
    // Palette changes are applied by the effect below; the material itself is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const slot = useRef(0)
  const elapsed = useRef(0)
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 7), [])
  const hit = useMemo(() => new THREE.Vector3(), [])
  const ndc = useMemo(() => new THREE.Vector2(), [])
  const focus = useRef(new THREE.Vector3())
  const baseTarget = useMemo(() => new THREE.Color(palette.base), [])

  const addRing = (x: number, y: number, strength: number) => {
    const ring = rings[slot.current % RIPPLE_COUNT]
    slot.current += 1
    ring.set(x, y, elapsed.current, Math.max(0.05, strength))
  }

  // Theme / section tone target.
  useEffect(() => {
    material.uniforms.uInk.value.set(palette.ink)
    material.uniforms.uAccent.value.set(palette.accent)
    const cfg = sectionConfig(active)
    baseTarget.set(cfg.warm ? palette.alternate : palette.base)
  }, [active, palette, material, baseTarget])

  useEffect(() => {
    const cfg = sectionConfig(active)
    const point = focusPoint(cfg.region, layout)
    focus.current.set(point.x, point.y, 0)
  }, [active, layout])

  useEffect(() => {
    return useScene.subscribe((state, previous) => {
      if (state.pulse.id !== previous.pulse.id) {
        const cfg = sectionConfig(state.active)
        const point = focusPoint(cfg.region, state.layout)
        addRing(point.x, point.y, 0.5 + 0.5 * state.pulse.strength)
      }
      if (state.impulse.id !== previous.impulse.id) {
        ndc.set(state.impulse.x, state.impulse.y)
        raycaster.setFromCamera(ndc, camera)
        if (raycaster.ray.intersectPlane(plane, hit)) addRing(hit.x, hit.y, 1.2)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera])

  useEffect(() => () => material.dispose(), [material])

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 20)
    elapsed.current = state.clock.elapsedTime
    const uniforms = material.uniforms
    uniforms.uTime.value = state.clock.elapsedTime

    if (!useScene.getState().reduced) {
      uniforms.uBase.value.lerp(baseTarget, 1 - Math.exp(-4 * dt))
    } else {
      uniforms.uBase.value.copy(baseTarget)
    }

    // Unproject the pointer onto the backdrop plane.
    ndc.set(pointer.x, pointer.y)
    raycaster.setFromCamera(ndc, camera)
    if (raycaster.ray.intersectPlane(plane, hit)) {
      uniforms.uCursor.value.set(hit.x, hit.y)
    }
  })

  return (
    <mesh position={[0, 0, -7]} frustumCulled={false}>
      <planeGeometry args={[70, 46]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}
