import { useGLTF } from '@react-three/drei'

function EnergySystem() {
  const { scene } = useGLTF('/models/energy/energy_rails.glb')

  scene.traverse((child) => {
    if (child.isMesh) {
      const material = child.material

      material.color.set('#00BFFF')

      material.emissive.set('#00BFFF')
      material.emissiveIntensity = 3

      material.metalness = 0.4
      material.roughness = 0.25

      material.needsUpdate = true
    }
  })

  return (
    <group
      position={[0, 0, 0]}
      rotation={[0, -Math.PI / 4, 0]}
    >
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload('/models/energy/energy_rails.glb')

export default EnergySystem