import { Html, useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

const IDLE_SECONDS = 10
const MENU_KEYS = ['Tab', 'KeyI', 'KeyM']

const CAM = {
  azimuth: Math.PI * 0.25,
  elevation: 0.62,
  distance: 24,      // default distance (the menu changes this)
  minDistance: 12,
  maxDistance: 60,
  zoomOut: 10,       // extra distance at full speed
  followEase: 6,
  lookHeight: 1,
  rotateSpeed: 1.5,
  rotateKeys: true,
}

const PRESETS = [
  { label: 'Close', value: 14 },
  { label: 'Medium', value: 24 },
  { label: 'Far', value: 42 },
]

function dampAngle(current, target, lambda, dt) {
  const diff =
    THREE.MathUtils.euclideanModulo(target - current + Math.PI, Math.PI * 2) -
    Math.PI
  return current + diff * (1 - Math.exp(-lambda * dt))
}

function CameraMenu({ open, distance, onChange, onClose }) {
  const panel = {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 260,
    padding: '16px 18px',
    borderRadius: 14,
    background: 'rgba(8, 16, 24, 0.82)',
    border: '1px solid rgba(0, 220, 255, 0.45)',
    boxShadow: '0 0 24px rgba(0, 220, 255, 0.18)',
    backdropFilter: 'blur(8px)',
    color: '#d8f6ff',
    fontFamily: 'system-ui, sans-serif',
    fontSize: 13,
    pointerEvents: 'auto',
    userSelect: 'none',
  }

  const presetBtn = (active) => ({
    flex: 1,
    padding: '6px 0',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 12,
    color: active ? '#06121a' : '#d8f6ff',
    background: active ? '#00dcff' : 'transparent',
    border: '1px solid rgba(0, 220, 255, 0.5)',
  })

  return (
    <>
      {open && (
        <div style={panel}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
            }}
          >
            <strong style={{ letterSpacing: 1.5, color: '#00dcff' }}>
              CAMERA
            </strong>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#d8f6ff',
                cursor: 'pointer',
                fontSize: 16,
              }}
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 6,
            }}
          >
            <span>Distance</span>
            <span style={{ color: '#00dcff' }}>{Math.round(distance)}</span>
          </div>

          <input
            type="range"
            min={CAM.minDistance}
            max={CAM.maxDistance}
            step={1}
            value={distance}
            onChange={(e) => onChange(Number(e.target.value))}
            onPointerUp={(e) => e.currentTarget.blur()}
            style={{ width: '100%', accentColor: '#00dcff' }}
          />

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => onChange(p.value)}
                style={presetBtn(Math.round(distance) === p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 14, opacity: 0.6, fontSize: 11 }}>
            Tab / I / M to toggle · Esc to close
          </div>
        </div>
      )}

      {!open && (
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            padding: '6px 10px',
            borderRadius: 8,
            background: 'rgba(8, 16, 24, 0.6)',
            border: '1px solid rgba(0, 220, 255, 0.3)',
            color: '#d8f6ff',
            fontFamily: 'system-ui, sans-serif',
            fontSize: 11,
            pointerEvents: 'none',
          }}
        >
          Tab / I / M · Camera menu
        </div>
      )}
    </>
  )
}

function GuideDrone({
  url = '/models/cyklo/cyklon_v5.glb',
  logNodes = false,
  scale = 3,
  speed = 28,
  idleCenter = [0, 4, 12],
  modelYaw = 0,
}) {
  const { scene } = useGLTF(url)
  const { camera } = useThree()

  const droneRef = useRef(null)
  const bobRef = useRef(null)
  const keys = useRef({})

  const [menuOpen, setMenuOpen] = useState(false)
  const [distanceUI, setDistanceUI] = useState(CAM.distance)
  const targetDistance = useRef(CAM.distance)
  const currentDistance = useRef(CAM.distance)

  const camAzimuth = useRef(CAM.azimuth)
  const smoothAzimuth = useRef(CAM.azimuth)
  const zoom = useRef(0)
  const target = useRef(new THREE.Vector3(...idleCenter))

  const faceAngle = useRef(Math.PI)
  const lastInputTime = useRef(0)
  const needsClockSync = useRef(true)
  const initialized = useRef(false)

  const velocity = useRef(new THREE.Vector3())
  const forwardV = useRef(new THREE.Vector3())
  const rightV = useRef(new THREE.Vector3())
  const movementV = useRef(new THREE.Vector3())

  const drone = useMemo(() => scene.clone(true), [scene])

  useEffect(() => {
    if (!logNodes) return
    drone.traverse((child) => {
      if (!child.isMesh) return
      console.log('Mesh:', child.name)
      console.log('Material:', child.material)
    })
  }, [drone, logNodes])

  const markActive = useCallback(() => {
    needsClockSync.current = true
  }, [])

  const setDistance = useCallback((value) => {
    const v = THREE.MathUtils.clamp(value, CAM.minDistance, CAM.maxDistance)
    targetDistance.current = v
    setDistanceUI(v)
  }, [])

  const resetDrone = useCallback(() => {
    const group = droneRef.current
    if (!group) return
    group.position.set(...idleCenter)
    target.current.set(...idleCenter)
    camAzimuth.current = CAM.azimuth
    smoothAzimuth.current = CAM.azimuth
    faceAngle.current = Math.PI
    velocity.current.set(0, 0, 0)
  }, [idleCenter])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(
          event.code
        )
      ) {
        event.preventDefault()
      }

      if (MENU_KEYS.includes(event.code)) {
        if (!event.repeat) setMenuOpen((open) => !open)
        markActive()
        return
      }

      if (event.code === 'Escape') {
        setMenuOpen(false)
        return
      }

      keys.current[event.code] = true
      markActive()
      if (event.code === 'KeyR' && !event.repeat) resetDrone()
    }

    const onKeyUp = (event) => {
      keys.current[event.code] = false
      markActive()
    }
    const onBlur = () => {
      keys.current = {}
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    window.addEventListener('pointerdown', markActive)
    window.addEventListener('pointermove', markActive)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('pointerdown', markActive)
      window.removeEventListener('pointermove', markActive)
    }
  }, [resetDrone, markActive])

  useFrame((state, delta) => {
    const group = droneRef.current
    if (!group) return

    const dt = Math.min(delta, 0.05)
    const now = state.clock.elapsedTime
    const input = keys.current

    if (needsClockSync.current) {
      lastInputTime.current = now
      needsClockSync.current = false
    }

    if (!initialized.current) {
      target.current.copy(group.position)
      lastInputTime.current = now
      initialized.current = true
    }

    // ---- Optional camera rotation (Q / E) ----
    if (CAM.rotateKeys) {
      const rot = Number(!!input.KeyE) - Number(!!input.KeyQ)
      camAzimuth.current += rot * CAM.rotateSpeed * dt
    }
    smoothAzimuth.current = dampAngle(
      smoothAzimuth.current,
      camAzimuth.current,
      8,
      dt
    )
    const az = smoothAzimuth.current

    // ---- Input (relative to the screen) ----
    const forwardInput =
      Number(!!input.KeyW || !!input.ArrowUp) -
      Number(!!input.KeyS || !!input.ArrowDown)
    const strafeInput =
      Number(!!input.KeyD || !!input.ArrowRight) -
      Number(!!input.KeyA || !!input.ArrowLeft)

    const forward = forwardV.current.set(-Math.sin(az), 0, -Math.cos(az))
    const right = rightV.current.set(Math.cos(az), 0, -Math.sin(az))

    const movement = movementV.current
      .set(0, 0, 0)
      .addScaledVector(forward, forwardInput)
      .addScaledVector(right, strafeInput)

    if (movement.lengthSq() > 1) movement.normalize()

    // Shift = speed boost (any direction)
    const boosting = !!input.ShiftLeft || !!input.ShiftRight
    const flySpeed = speed * (boosting ? 2 : 1)

    // ---- Move (horizontal only) ----
    velocity.current.set(movement.x * flySpeed, 0, movement.z * flySpeed)
    group.position.addScaledVector(velocity.current, dt)

    // Hover bob on the model only (camera ignores it)
    if (bobRef.current) {
      bobRef.current.position.y = Math.sin(now * 2) * 0.03
    }

    // ---- Facing ----
    const isMoving = movement.lengthSq() > 0.001
    const isIdle = now - lastInputTime.current > IDLE_SECONDS

    let targetAngle = faceAngle.current
    if (isMoving) {
      targetAngle = Math.atan2(movement.x, movement.z)
    } else if (isIdle) {
      targetAngle = Math.atan2(
        camera.position.x - group.position.x,
        camera.position.z - group.position.z
      )
    }
    faceAngle.current = dampAngle(
      faceAngle.current,
      targetAngle,
      isMoving ? 8 : 4,
      dt
    )
    group.rotation.set(0, faceAngle.current + modelYaw, 0)

    // ---- Chase camera ----
    const follow = 1 - Math.exp(-CAM.followEase * dt)
    target.current.lerp(group.position, follow)

    // Smoothly move toward the distance chosen in the menu.
    currentDistance.current = THREE.MathUtils.damp(
      currentDistance.current,
      targetDistance.current,
      6,
      dt
    )

    const speedRatio = Math.min(velocity.current.length() / (speed * 2), 1)
    zoom.current = THREE.MathUtils.damp(zoom.current, speedRatio, 3, dt)
    const distance = currentDistance.current + CAM.zoomOut * zoom.current

    const cp = Math.cos(CAM.elevation)
    const sp = Math.sin(CAM.elevation)

    camera.position.set(
      target.current.x + Math.sin(az) * cp * distance,
      target.current.y + CAM.lookHeight + sp * distance,
      target.current.z + Math.cos(az) * cp * distance
    )
    camera.lookAt(
      target.current.x,
      target.current.y + CAM.lookHeight,
      target.current.z
    )
  })

  return (
    <>
      <group ref={droneRef} position={idleCenter} scale={scale}>
        <group ref={bobRef}>
          <primitive object={drone} />
        </group>
      </group>

      <Html fullscreen pointerEvents="none" zIndexRange={[20, 0]}>
        <CameraMenu
          open={menuOpen}
          distance={distanceUI}
          onChange={setDistance}
          onClose={() => setMenuOpen(false)}
        />
      </Html>
    </>
  )
}

useGLTF.preload('/models/cyklo/cyklon_v5.glb')

export default GuideDrone