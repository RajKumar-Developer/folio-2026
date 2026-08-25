import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'

function Ground() {
  const { scene } = useGLTF('/models/environment/ground.glb')

  const texture = useTexture('/texture/ground/circuit.png')

  // --------------------------------------------------
  // Circuit texture
  // --------------------------------------------------

  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping

  texture.repeat.set(12, 12)

  texture.anisotropy = 16

  texture.colorSpace = THREE.SRGBColorSpace

  // --------------------------------------------------
  // Ground visual
  // --------------------------------------------------

  const groundVisual = scene.getObjectByName('GROUND_VISUAL')

  if (groundVisual && groundVisual.isMesh) {

    const material = groundVisual.material

    // Circuit texture
    material.map = texture

    // PBR
    material.metalness = 0.25
    material.roughness = 0.65

    // Subtle cyan emission
    material.emissive.set('#003B4D')
    material.emissiveMap = texture
    material.emissiveIntensity = 0.25

    material.needsUpdate = true
  }

  return (
    <primitive
      object={scene}
      scale={2}
    />
  )
}

useGLTF.preload('/models/environment/ground.glb')
useTexture.preload('/texture/ground/circuit.png')

export default Ground