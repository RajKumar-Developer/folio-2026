import { useGLTF } from '@react-three/drei'

function EnergySystem() {
  const { scene } = useGLTF('/models/energy/energy_rails.glb')

  return <primitive object={scene} />
}

useGLTF.preload('/models/energy/energy_rails.glb')

export default EnergySystem