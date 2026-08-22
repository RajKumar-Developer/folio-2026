import { Cylinder } from '@react-three/drei'

function ReactorChamber() {
  return (
    <Cylinder
      args={[2.6, 2.6, 4.5, 64, 1, true]}
      position={[0, 3.2, 0]}
      scale={1.2}
    >
      <meshPhysicalMaterial
        color="#BFEFFF"
        transparent
        opacity={0.12}
        roughness={0.05}
        metalness={0}
        transmission={0.85}
        thickness={0.08}
        side={2}
      />
    </Cylinder>
  )
}

export default ReactorChamber