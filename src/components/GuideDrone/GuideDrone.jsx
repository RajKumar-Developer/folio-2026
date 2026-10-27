import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'
// import { dronePos } from './shared'

const { damp, clamp } = THREE.MathUtils

/**
 * Guide drone: body, reactor, shields, weapons and head cam.
 * Same controls as before: WASD / Arrows (camera-relative), Space up, Shift down.
 *
 * `parts` tells the component which node is which. Each value is a space-separated
 * list of words that must ALL appear in the node's name (case-insensitive); prefix a
 * word with ! to exclude it.   e.g. 'left weapon !shield'
 * Set logNodes once to print every node and material name in the browser console,
 * then copy the real names into `parts`.
 */
const DEFAULT_PARTS = {
  headCam: 'cam',
  headShield: 'head shield',
  weaponL: 'left weapon !shield',
  weaponR: 'right weapon !shield',
  shieldL: 'left shield',
  shieldR: 'right shield',
}

const norm = (s) => (s || '').toLowerCase().replace(/[_.\-]+/g, ' ')
const matches = (name, query) => {
  const n = norm(name)
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => (w.startsWith('!') ? !n.includes(w.slice(1)) : n.includes(w)))
}

function GuideDrone({
  url = '/models/cyklo/cyklo.glb',
  parts = DEFAULT_PARTS,
  logNodes = false, // print node + material names once
  reactorMat = 'reactor', // material name (substring) that should glow
  glowColor = '#00d9ff',
  glowIntensity = 2.5,
  size = 1, // model is auto-fitted to this diameter, then multiplied by `scale`
  modelYaw = 0, // rotate the model if it faces the wrong way (e.g. Math.PI)

  // keyframe animation from Blender
  playAnimation = true,
  animationName = null, // clip to play; null = the first clip
  skipTracks = null, // regex string of tracks to drop, e.g. 'Root|Empty' (keeps keyframes from moving the whole drone)
  procedural: proceduralProp = 'auto', // code-driven part motion; 'auto' = off when the GLB has its own animation

  // movement
  controlled = true,
  enabled = true,
  speed = 12,
  acceleration = 5,
  bounds = 80,
  minY = 1.5,
  maxY = 15,
  followCamera = true,
  cameraOffset = [0, 8, 16],
  idleCenter = [0, 4, 12],
  floorY = 0,
  scale = 3,
  attention = false,
}) {
  const { scene, animations } = useGLTF(url)
  const controls = useThree((s) => s.controls)

  // Clone, then work out how to centre and size the model
  const fit = useMemo(() => {
    const model = scene.clone(true)
    model.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(model)
    const dims = box.getSize(new THREE.Vector3())
    const max = Math.max(dims.x, dims.y, dims.z) || 1
    return { model, s: size / max, center: box.getCenter(new THREE.Vector3()), max }
  }, [scene, size])
  const { model } = fit

  // Blender keyframes: optionally strip tracks that would move the whole drone
  const clips = useMemo(() => {
    const re = skipTracks ? new RegExp(skipTracks, 'i') : null
    return animations.map((c) => {
      const clip = c.clone()
      if (re) clip.tracks = clip.tracks.filter((t) => !re.test(t.name))
      return clip
    })
  }, [animations, skipTracks])
  const modelGroup = useRef()
  const { actions, names } = useAnimations(clips, modelGroup)
  const procedural = proceduralProp === 'auto' ? clips.length === 0 : proceduralProp

  useEffect(() => {
    if (logNodes)
      console.log('[GuideDrone] Animations:', clips.map((c) => `${c.name} (${c.duration.toFixed(2)}s)`))
    if (!playAnimation || !names.length) return
    const action = actions[animationName ?? names[0]]
    if (!action) {
      console.warn(`[GuideDrone] Animation "${animationName}" not found. Available:`, names)
      return
    }
    action.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.3).play()
    return () => action.fadeOut(0.3)
  }, [actions, names, clips, animationName, playAnimation, logNodes])

  const root = useRef()
  const bob = useRef()
  const ring = useRef()
  const light = useRef()
  const keys = useRef({})
  const found = useRef({ glow: [], list: [] })
  const anim = useRef({
    camInit: false,
    attention: 0,
    thrust: 0,
    vel: new THREE.Vector3(),
    cf: new THREE.Vector3(),
    cr: new THREE.Vector3(),
    desired: new THREE.Vector3(),
    delta: new THREE.Vector3(),
    last: new THREE.Vector3(),
  })

  // Keyboard
  useEffect(() => {
    if (!controlled) return
    const typing = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable
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

  // Find parts, set up the reactor glow
  useEffect(() => {
    const list = []
    const glow = []
    const nodeNames = []
    const matNames = new Set()

    model.traverse((o) => {
      nodeNames.push(o.name)
      if (o.isMesh) {
        o.castShadow = true
        const mats = Array.isArray(o.material) ? o.material : [o.material]
        mats.forEach((m) => {
          matNames.add(m.name)
          if (norm(m.name).includes(reactorMat.toLowerCase()) && !glow.includes(m)) {
            m.emissive = new THREE.Color(glowColor)
            m.emissiveMap = null
            m.emissiveIntensity = glowIntensity
            m.toneMapped = false // lets Bloom pick it up
            m.needsUpdate = true
            glow.push(m)
          }
        })
      }
    })

    const grab = (key, query, side = 0, phase = 0) => {
      const node = model.children.length
        ? (() => {
            let hit = null
            model.traverse((o) => {
              if (!hit && o.name && matches(o.name, query)) hit = o
            })
            return hit
          })()
        : null
      if (node)
        list.push({
          key,
          node,
          side,
          phase,
          rot: node.rotation.clone(),
          pos: node.position.clone(),
        })
      else console.warn(`[GuideDrone] No node matched "${query}" for ${key}. Set logNodes to see names.`)
    }

    grab('headCam', parts.headCam)
    grab('headShield', parts.headShield, 0, 1)
    grab('weaponL', parts.weaponL, 1, 0)
    grab('weaponR', parts.weaponR, -1, 1.7)
    grab('shieldL', parts.shieldL, 1, 0.8)
    grab('shieldR', parts.shieldR, -1, 2.5)

    found.current = { glow, list }

    if (logNodes) {
      console.log('[GuideDrone] Nodes:', nodeNames.filter(Boolean))
      console.log('[GuideDrone] Materials:', [...matNames])
      console.log('[GuideDrone] Matched:', list.map((p) => `${p.key} -> ${p.node.name}`))
    }
  }, [model, parts, reactorMat, glowColor, glowIntensity, logNodes])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    const r = root.current
    const b = bob.current
    if (!r || !b) return
    const a = anim.current
    const { glow, list } = found.current

    // ---- Flight ----
    const k = keys.current
    const on = controlled && enabled
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

    const horiz = Math.hypot(a.vel.x, a.vel.z)
    if (horiz > 0.5) {
      const want = Math.atan2(a.vel.x, a.vel.z)
      const diff = ((((want - r.rotation.y + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI
      r.rotation.y += diff * Math.min(1, 6 * dt)
    }

    // ---- Follow camera (still rotatable with the mouse) ----
    if (controlled && followCamera && controls) {
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

    // dronePos.copy(r.position)

    // ---- Hover bob + lean ----
    b.position.y = Math.sin(t * 2) * 0.06
    const sin = Math.sin(r.rotation.y)
    const cos = Math.cos(r.rotation.y)
    const forward = a.vel.x * sin + a.vel.z * cos
    const side = a.vel.x * cos - a.vel.z * sin
    b.rotation.x = damp(b.rotation.x, clamp(forward * 0.025, -0.35, 0.35), 6, dt)
    b.rotation.z = damp(b.rotation.z, clamp(-side * 0.025, -0.35, 0.35), 6, dt)

    // ---- Thrust and attention drive the reactor glow ----
    a.thrust = damp(a.thrust, clamp(a.vel.length() / speed, 0, 1), 5, dt)
    a.attention = damp(a.attention, attention ? 1 : 0, 6, dt)
    const pulse = a.attention * (0.5 + 0.5 * Math.sin(t * 10))
    // keyframe animation runs a little faster when flying
    if (playAnimation) Object.values(actions).forEach((ac) => ac && (ac.timeScale = 1 + a.thrust * 0.5))
    const breathe = 0.5 + 0.5 * Math.sin(t * 2.5)
    glow.forEach((m) => (m.emissiveIntensity = glowIntensity * (0.8 + breathe * 0.3) + a.thrust * 2 + pulse * 2.5))

    // ---- Part animation (rotations use each node's own origin as the pivot) ----
    const u = fit.max * 0.012 // small movement, in the model's own units
    if (procedural) list.forEach((p) => {
      const n = p.node
      if (p.key === 'headCam') {
        n.rotation.y = p.rot.y + Math.sin(t * 0.8) * 0.5 // scanning left and right
      } else if (p.key === 'headShield') {
        n.position.y = p.pos.y + Math.sin(t * 2 + p.phase) * u * 0.5
      } else {
        // weapons and shields float gently and tuck back a little when moving fast
        n.position.y = p.pos.y + Math.sin(t * 1.8 + p.phase) * u
        n.rotation.x = p.rot.x - a.thrust * 0.2
      }
    })

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
          <group ref={modelGroup} rotation={[0, modelYaw, 0]} scale={fit.s}>
            <primitive object={model} position={[-fit.center.x, -fit.center.y, -fit.center.z]} />
          </group>
        </group>
      </group>

      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        {/* <ringGeometry args={[0.35, 0.42, 48]} /> */}
        <meshBasicMaterial color={glowColor} transparent opacity={0.6} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <pointLight ref={light} color={glowColor} intensity={1.5} distance={6} />
    </>
  )
}

export default GuideDrone