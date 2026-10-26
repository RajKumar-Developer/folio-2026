import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

const MODEL_URL = '/models/cyklo/cyklo.glb'
const { damp, clamp } = THREE.MathUtils

/**
 * Cyklo, the guide drone.
 *
 * controlled = true  -> you fly it: WASD / Arrows (camera-relative), Space up, Shift down.
 *                       The orbit camera follows it, and you can still drag to look around.
 * controlled = false -> it flies to `target` ([x,y,z]) or patrols around idleCenter.
 *
 * Blender names used (all optional except the GLB):
 *   materials "Neon" and "Eyes"; objects "EyeL", "EyeR", "Halo"
 */
function GuideDrone({
  // movement
  controlled = false,
  enabled = true, // false = ignore keys (e.g. while a card is open)
  speed = 12,
  acceleration = 5,
  bounds = 110,
  minY = 1.5,
  maxY = 15,
  followCamera = true,
  cameraOffset = [0, 8, 16],
  // auto mode
  target = null,
  idleCenter = [0, 3, 8],
  // look
  floorY = 0,
  scale = 1,
  neonColor = '#00d9ff',
  eyeColor = '#00d9ff',
  neonIntensity = 2.5,
  eyeIntensity = 3,
  attention = false,
  neonMatName = 'neon',
  eyeMatName = 'eye',
}) {
  const { scene } = useGLTF(MODEL_URL)
  const model = useMemo(() => scene.clone(true), [scene])
  const controls = useThree((s) => s.controls)

  const root = useRef()
  const bob = useRef()
  const ring = useRef()
  const light = useRef()
  const keys = useRef({})

  const parts = useRef({ neon: [], eyes: [], eyeMeshes: [], halo: null, haloY: 0 })
  const anim = useRef({
    attention: 0,
    nextBlink: 2,
    blinkStart: -1,
    camInit: false,
    prev: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    goal: new THREE.Vector3(),
    cf: new THREE.Vector3(),
    cr: new THREE.Vector3(),
    desired: new THREE.Vector3(),
    delta: new THREE.Vector3(),
    last: new THREE.Vector3(),
  })

  // Keyboard input
  useEffect(() => {
    if (!controlled) return
    const typing = (e) =>
      /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable
    const block = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']
    const down = (e) => {
      if (typing(e)) return
      keys.current[e.code] = true
      if (block.includes(e.code)) e.preventDefault()
    }
    const up = (e) => (keys.current[e.code] = false)
    const clear = () => (keys.current = {})
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
  }, [controlled])

  // Find materials and parts, make the neon glow
  useEffect(() => {
    const p = { neon: [], eyes: [], eyeMeshes: [], halo: null, haloY: 0 }
    const style = (m, color, intensity) => {
      m.color?.set('#000000')
      m.emissive = new THREE.Color(color)
      m.emissiveIntensity = intensity
      m.toneMapped = false
      m.needsUpdate = true
    }
    model.traverse((o) => {
      const name = (o.name || '').toLowerCase()
      if (name === 'halo') {
        p.halo = o
        p.haloY = o.position.y
      }
      if (name.startsWith('eyel') || name.startsWith('eyer')) p.eyeMeshes.push(o)
      if (o.isMesh) {
        const mats = Array.isArray(o.material) ? o.material : [o.material]
        mats.forEach((m) => {
          const mn = (m.name || '').toLowerCase()
          if (mn.includes(eyeMatName)) {
            if (!p.eyes.includes(m)) {
              style(m, eyeColor, eyeIntensity)
              p.eyes.push(m)
            }
          } else if (mn.includes(neonMatName) || name === 'halo') {
            if (!p.neon.includes(m)) {
              style(m, neonColor, neonIntensity)
              p.neon.push(m)
            }
          }
        })
      }
    })
    parts.current = p
  }, [model, neonColor, eyeColor, neonIntensity, eyeIntensity, neonMatName, eyeMatName])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    const r = root.current
    const b = bob.current
    if (!r || !b) return
    const a = anim.current
    const p = parts.current

    if (controlled) {
      // ---- Player flight (camera-relative) ----
      const k = keys.current
      const on = enabled
      const fwd = on ? (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) : 0
      const strafe = on ? (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0) : 0
      const lift = on ? (k.Space ? 1 : 0) - (k.ShiftLeft || k.ShiftRight ? 1 : 0) : 0

      state.camera.getWorldDirection(a.cf)
      a.cf.y = 0
      if (a.cf.lengthSq() < 1e-4) a.cf.set(0, 0, -1)
      a.cf.normalize()
      a.cr.set(-a.cf.z, 0, a.cf.x)

      a.desired.set(0, 0, 0).addScaledVector(a.cf, fwd).addScaledVector(a.cr, strafe)
      if (a.desired.lengthSq() > 1) a.desired.normalize()
      a.desired.multiplyScalar(speed)
      a.desired.y = lift * speed * 0.6

      a.vel.x = damp(a.vel.x, a.desired.x, acceleration, dt)
      a.vel.y = damp(a.vel.y, a.desired.y, acceleration, dt)
      a.vel.z = damp(a.vel.z, a.desired.z, acceleration, dt)

      r.position.addScaledVector(a.vel, dt)
      r.position.x = clamp(r.position.x, -bounds, bounds)
      r.position.z = clamp(r.position.z, -bounds, bounds)
      if (r.position.y < minY || r.position.y > maxY) {
        r.position.y = clamp(r.position.y, minY, maxY)
        a.vel.y = 0
      }

      // Face the direction of travel
      if (Math.hypot(a.vel.x, a.vel.z) > 0.5) {
        const desiredAngle = Math.atan2(a.vel.x, a.vel.z)
        const diff =
          ((((desiredAngle - r.rotation.y + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI
        r.rotation.y += diff * Math.min(1, 6 * dt)
      }

      // Orbit camera follows the drone but stays user-rotatable
      if (followCamera && controls) {
        if (!a.camInit) {
          controls.target.copy(r.position)
          state.camera.position.set(
            r.position.x + cameraOffset[0],
            r.position.y + cameraOffset[1],
            r.position.z + cameraOffset[2]
          )
          a.last.copy(r.position)
          a.camInit = true
        } else {
          a.delta.copy(r.position).sub(a.last)
          state.camera.position.add(a.delta)
          controls.target.add(a.delta)
          a.last.copy(r.position)
        }
        controls.update()
      }
    } else {
      // ---- Auto flight: glide to target or patrol ----
      if (target) a.goal.set(target[0], target[1], target[2])
      else
        a.goal.set(
          idleCenter[0] + Math.sin(t * 0.4) * 1.2,
          idleCenter[1],
          idleCenter[2] + Math.cos(t * 0.3) * 0.6
        )
      a.prev.copy(r.position)
      r.position.lerp(a.goal, 1 - Math.exp(-2.5 * dt))
      a.vel.copy(r.position).sub(a.prev).divideScalar(Math.max(dt, 1e-4))

      const fx = target ? target[0] : state.camera.position.x
      const fz = target ? target[2] : state.camera.position.z
      const dx = fx - r.position.x
      const dz = fz - r.position.z
      if (Math.hypot(dx, dz) > 0.5) {
        const desiredAngle = Math.atan2(dx, dz)
        const diff =
          ((((desiredAngle - r.rotation.y + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI
        r.rotation.y += diff * Math.min(1, 4 * dt)
      }
    }

    // Share position with stations
    // dronePos.copy(r.position)

    // ---- Hover bob + lean into travel direction ----
    b.position.y = Math.sin(t * 2) * 0.06
    const sin = Math.sin(r.rotation.y)
    const cos = Math.cos(r.rotation.y)
    const forward = a.vel.x * sin + a.vel.z * cos
    const side = a.vel.x * cos - a.vel.z * sin
    const leanGain = controlled ? 0.025 : 0.08
    b.rotation.x = damp(b.rotation.x, clamp(forward * leanGain, -0.35, 0.35), 6, dt)
    b.rotation.z = damp(b.rotation.z, clamp(-side * leanGain, -0.35, 0.35), 6, dt)

    // ---- Attention pulse ----
    a.attention = damp(a.attention, attention ? 1 : 0, 6, dt)
    const pulse = a.attention * (0.5 + 0.5 * Math.sin(t * 10))
    p.neon.forEach((m) => (m.emissiveIntensity = neonIntensity + pulse * 2.5))

    // ---- Halo ----
    if (p.halo) {
      p.halo.rotation.x = Math.sin(t * 1.5) * 0.08
      p.halo.rotation.z = Math.cos(t * 1.2) * 0.08
      p.halo.position.y = p.haloY + Math.sin(t * 2 + 1) * 0.02
      p.halo.scale.setScalar(1 + pulse * 0.12)
    }

    // ---- Blink ----
    if (a.blinkStart < 0 && t > a.nextBlink) a.blinkStart = t
    let open = 1
    if (a.blinkStart >= 0) {
      const kk = (t - a.blinkStart) / 0.14
      if (kk >= 1) {
        a.blinkStart = -1
        a.nextBlink = t + 2.5 + Math.random() * 3.5
      } else {
        open = 1 - Math.sin(Math.PI * kk) * 0.92
      }
    }
    if (p.eyeMeshes.length) p.eyeMeshes.forEach((e) => (e.scale.y = open))
    else p.eyes.forEach((m) => (m.emissiveIntensity = eyeIntensity * open))

    // ---- Floor underglow ----
    const h = Math.max(0, r.position.y - floorY)
    if (ring.current) {
      ring.current.position.set(r.position.x, floorY + 0.02, r.position.z)
      ring.current.scale.setScalar((1 + h * 0.12) * scale)
      ring.current.material.opacity = clamp(0.75 - h * 0.05, 0.15, 0.75)
    }
    if (light.current) light.current.position.set(r.position.x, floorY + 0.4, r.position.z)
  })

  return (
    <>
      <group ref={root} position={idleCenter} scale={scale}>
        <group ref={bob}>
          <primitive object={model} />
        </group>
      </group>

      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 0.42, 48]} />
        <meshBasicMaterial color={neonColor} transparent opacity={0.6} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <pointLight ref={light} color={neonColor} intensity={1.5} distance={6} />
    </>
  )
}

useGLTF.preload(MODEL_URL)

export default GuideDrone