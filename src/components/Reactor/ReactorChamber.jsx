import { Cylinder } from '@react-three/drei'
import * as THREE from 'three'

// --------------------------------------------------
// Settings
// --------------------------------------------------
const CONFIG = {
  radius: 2.6,
  height: 6,
  centerY: 3.2,

  glowColor: '#00E5FF',
  deepColor: '#02202B',

  baseAlpha: 0.05,      // faint tint (raise for less clear)
  fresnelPower: 3.0,    // higher = thinner edge glow
  fresnelStrength: 0.8,
  ringThickness: 0.025, // thin frame rings
}

const vertexShader = /* glsl */ `
  varying vec3 vNormalV;
  varying vec3 vViewDir;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormalV = normalize(normalMatrix * normal);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`

const fragmentShader = /* glsl */ `
  uniform float uBaseAlpha, uFresnelPower, uFresnelStrength;
  uniform vec3 uGlow, uDeep;

  varying vec3 vNormalV;
  varying vec3 vViewDir;

  void main() {
    vec3 n = normalize(vNormalV);
    if (!gl_FrontFacing) n = -n;

    float fres = pow(1.0 - abs(dot(n, normalize(vViewDir))), uFresnelPower);
    float glow = fres * uFresnelStrength;

    vec3 color = mix(uDeep, uGlow * 1.6, clamp(glow, 0.0, 1.0));
    float alpha = clamp(uBaseAlpha + glow * 0.7, 0.0, 0.8);

    gl_FragColor = vec4(color, alpha);
  }
`

const uniforms = {
  uGlow: { value: new THREE.Color(CONFIG.glowColor) },
  uDeep: { value: new THREE.Color(CONFIG.deepColor) },
  uBaseAlpha: { value: CONFIG.baseAlpha },
  uFresnelPower: { value: CONFIG.fresnelPower },
  uFresnelStrength: { value: CONFIG.fresnelStrength },
}

// HDR-ish color so bloom picks up the rings
const RING_COLOR = new THREE.Color(CONFIG.glowColor).multiplyScalar(3)

function ReactorChamber() {
  const topY = CONFIG.centerY + CONFIG.height / 2
  const bottomY = CONFIG.centerY - CONFIG.height / 2

  return (
    <group>
      {/* Glass body */}
      <Cylinder
        args={[CONFIG.radius, CONFIG.radius, CONFIG.height, 64, 1, true]}
        position={[0, CONFIG.centerY, 0]}
        renderOrder={10}
      >
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </Cylinder>

      {/* Thin frame rings (top + bottom) */}
      {[bottomY, topY].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[CONFIG.radius, CONFIG.ringThickness, 8, 96]} />
          <meshBasicMaterial color={RING_COLOR} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

export default ReactorChamber