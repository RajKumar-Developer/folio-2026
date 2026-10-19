import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
 
/**
 * NeonBot: an original character with a glossy black body and glowing blue neon lines.
 * Same controls and props as ExplorerBot, so it is a drop-in replacement.
 * Controls: WASD / Arrow keys.
 */
function NeonBot({
  position = [0, 0, 4],
  speed = 3,
  turnSpeed = 10,
  bounds = 25,
  followCamera = true,
  cameraOffset = [0, 3, 6],
  neonColor = '#00b4ff', // match your site's neon
}) {
  const root = useRef()
  const body = useRef()
  const legL = useRef()
  const legR = useRef()
  const armL = useRef()
  const armR = useRef()
  const keys = useRef({})
  const state = useRef({ phase: 0, move: 0 })
 
  // Keyboard input
  useEffect(() => {
    const down = (e) => (keys.current[e.key.toLowerCase()] = true)
    const up = (e) => (keys.current[e.key.toLowerCase()] = false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])
 
  useFrame(({ camera, clock }, delta) => {
    const k = keys.current
    const g = root.current
    const s = state.current
 
    const x = (k['d'] || k['arrowright'] ? 1 : 0) - (k['a'] || k['arrowleft'] ? 1 : 0)
    const z = (k['s'] || k['arrowdown'] ? 1 : 0) - (k['w'] || k['arrowup'] ? 1 : 0)
    const moving = x !== 0 || z !== 0
 
    if (moving) {
      const len = Math.hypot(x, z)
      const dx = x / len
      const dz = z / len
 
      g.position.x = THREE.MathUtils.clamp(g.position.x + dx * speed * delta, -bounds, bounds)
      g.position.z = THREE.MathUtils.clamp(g.position.z + dz * speed * delta, -bounds, bounds)
 
      // Turn smoothly toward the movement direction (shortest angle)
      const target = Math.atan2(dx, dz)
      const diff =
        ((((target - g.rotation.y + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI
      g.rotation.y += diff * Math.min(1, turnSpeed * delta)
 
      s.phase += delta * 8
    }
 
    s.move = THREE.MathUtils.damp(s.move, moving ? 1 : 0, 8, delta)
    const t = clock.elapsedTime
    const swing = Math.sin(s.phase)
 
    // Body: idle float + walking bob, sway and forward lean
    body.current.position.y = 0.95 + Math.sin(t * 2) * 0.02 + Math.abs(swing) * 0.06 * s.move
    body.current.rotation.z = swing * 0.08 * s.move
    body.current.rotation.x = 0.1 * s.move
 
    // Limbs swing in opposite pairs
    legL.current.rotation.x = swing * 0.6 * s.move
    legR.current.rotation.x = -swing * 0.6 * s.move
    armL.current.rotation.x = -swing * 0.5 * s.move
    armR.current.rotation.x = swing * 0.5 * s.move
 
    // Follow camera
    if (followCamera) {
      const desired = new THREE.Vector3(
        g.position.x + cameraOffset[0],
        g.position.y + cameraOffset[1],
        g.position.z + cameraOffset[2]
      )
      camera.position.lerp(desired, 1 - Math.exp(-4 * delta))
      camera.lookAt(g.position.x, g.position.y + 1, g.position.z)
    }
  })
 
  const shell = { color: '#06080c', metalness: 0.85, roughness: 0.22 }
  const glow = {
    color: neonColor,
    emissive: neonColor,
    emissiveIntensity: 3,
    toneMapped: false, // lets bloom pick it up
  }
 
  // A glowing band wrapped around a vertical limb
  const Band = ({ y = 0, r = 0.13 }) => (
    <mesh position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[r, 0.014, 8, 32]} />
      <meshStandardMaterial {...glow} />
    </mesh>
  )
 
  return (
    <group ref={root} position={position}>
      {/* Underglow on the floor */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.45, 0.5, 48]} />
        <meshBasicMaterial color={neonColor} transparent opacity={0.6} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0.3, 0]} color={neonColor} intensity={1.5} distance={3} />
 
      <group ref={body} position={[0, 0.95, 0]}>
        {/* Torso with neon bands */}
        <group position={[0, 0.2, 0]} scale={[1, 1.05, 0.9]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.5, 0.45, 12, 24]} />
            <meshStandardMaterial {...shell} />
          </mesh>
          <mesh position={[0, 0.14, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.505, 0.014, 8, 48]} />
            <meshStandardMaterial {...glow} />
          </mesh>
          <mesh position={[0, -0.14, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.505, 0.014, 8, 48]} />
            <meshStandardMaterial {...glow} />
          </mesh>
        </group>
 
        {/* Front spine strip and hexagon chest light */}
        <mesh position={[0, 0.3, 0.455]}>
          <boxGeometry args={[0.035, 0.38, 0.02]} />
          <meshStandardMaterial {...glow} />
        </mesh>
        <mesh position={[0, 0.02, 0.455]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.02, 6]} />
          <meshStandardMaterial {...glow} />
        </mesh>
 
        {/* Head */}
        <group position={[0, 1.0, 0]}>
          <mesh castShadow scale={[1, 0.92, 1]}>
            <sphereGeometry args={[0.36, 32, 24]} />
            <meshStandardMaterial {...shell} />
          </mesh>
 
          {/* Visor slit and small status dot */}
          <mesh position={[0, 0.03, 0.32]} scale={[1, 0.13, 0.12]}>
            <sphereGeometry args={[0.26, 24, 16]} />
            <meshStandardMaterial {...glow} />
          </mesh>
          <mesh position={[0, -0.11, 0.34]}>
            <sphereGeometry args={[0.02, 12, 8]} />
            <meshStandardMaterial {...glow} />
          </mesh>
 
          {/* Neon crest running back to front over the head */}
          <mesh rotation={[0, Math.PI / 2, 0]} scale={[1.02, 0.95, 1.02]}>
            <torusGeometry args={[0.36, 0.011, 8, 48, Math.PI]} />
            <meshStandardMaterial {...glow} />
          </mesh>
        </group>
 
        {/* Arms (pivot at the shoulder) */}
        <group ref={armL} position={[0.62, 0.55, 0]}>
          <group position={[0.05, -0.3, 0]}>
            <mesh castShadow>
              <capsuleGeometry args={[0.12, 0.42, 8, 16]} />
              <meshStandardMaterial {...shell} />
            </mesh>
            <Band y={0.1} r={0.125} />
          </group>
        </group>
        <group ref={armR} position={[-0.62, 0.55, 0]}>
          <group position={[-0.05, -0.3, 0]}>
            <mesh castShadow>
              <capsuleGeometry args={[0.12, 0.42, 8, 16]} />
              <meshStandardMaterial {...shell} />
            </mesh>
            <Band y={0.1} r={0.125} />
          </group>
        </group>
 
        {/* Legs (pivot at the hip) */}
        <group ref={legL} position={[0.22, -0.3, 0]}>
          <group position={[0, -0.25, 0]}>
            <mesh castShadow>
              <capsuleGeometry args={[0.14, 0.25, 8, 16]} />
              <meshStandardMaterial {...shell} />
            </mesh>
            <Band y={0.05} r={0.145} />
          </group>
          <mesh position={[0, -0.5, 0.05]}>
            <boxGeometry args={[0.26, 0.06, 0.34]} />
            <meshStandardMaterial {...glow} />
          </mesh>
        </group>
        <group ref={legR} position={[-0.22, -0.3, 0]}>
          <group position={[0, -0.25, 0]}>
            <mesh castShadow>
              <capsuleGeometry args={[0.14, 0.25, 8, 16]} />
              <meshStandardMaterial {...shell} />
            </mesh>
            <Band y={0.05} r={0.145} />
          </group>
          <mesh position={[0, -0.5, 0.05]}>
            <boxGeometry args={[0.26, 0.06, 0.34]} />
            <meshStandardMaterial {...glow} />
          </mesh>
        </group>
      </group>
    </group>
  )
}
 
export default NeonBot