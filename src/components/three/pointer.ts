/**
 * Global pointer state, shared by the WebGL scene and the 2D fallback.
 *
 * Listeners live on window (the canvas is pointer-events: none), copied from the
 * reference CV studio. `tx/ty` are the raw NDC targets; `x/y` are damped once per frame
 * by whichever consumer owns the frame loop.
 */
import { useScene } from './store'

export const pointer = { x: 0, y: 0, tx: 0, ty: 0 }

export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt))
}

export function dampPointer(dt: number, lambda = 6): void {
  pointer.x = damp(pointer.x, pointer.tx, lambda, dt)
  pointer.y = damp(pointer.y, pointer.ty, lambda, dt)
}

export function pointerToNdc(clientX: number, clientY: number): { x: number; y: number } {
  return {
    x: (clientX / Math.max(1, window.innerWidth)) * 2 - 1,
    y: -(clientY / Math.max(1, window.innerHeight)) * 2 + 1,
  }
}

export function installPointer(): () => void {
  const onMove = (event: PointerEvent) => {
    const next = pointerToNdc(event.clientX, event.clientY)
    pointer.tx = next.x
    pointer.ty = next.y
  }
  const onDown = (event: PointerEvent) => {
    const next = pointerToNdc(event.clientX, event.clientY)
    pointer.tx = next.x
    pointer.ty = next.y
    // The click's ripple / scatter, even when the canvas did not receive the event.
    useScene.getState().fireImpulse(next.x, next.y)
  }
  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerdown', onDown, { passive: true })
  return () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerdown', onDown)
  }
}
