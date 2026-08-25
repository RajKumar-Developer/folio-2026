import { useGLTF } from '@react-three/drei'

function EnergySystem() {
  const { scene } = useGLTF('/models/energy/energy_rails.glb')

  return (
    <group
      position={[0, 0, 0]}
      scale={2}
      //rotation={[Math.PI / 0, 0, 0]}
    >
      <primitive object={scene}/>
    </group>
  )
}

useGLTF.preload('/models/energy/energy_rails.glb')

export default EnergySystem