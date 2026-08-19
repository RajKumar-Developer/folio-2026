import { useGLTF } from '@react-three/drei'

function Reactor() {
  const { scene } = useGLTF('/models/reactor/reactor.glb')

  return (
    <group
      position={[0, 0, 0]}
      scale={1.2}
    >
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload('/models/reactor/reactor.glb')

export default Reactor