import { useGLTF } from '@react-three/drei'

function Reactor() {
  const { scene } = useGLTF('/models/reactor/reactor.glb')

  return <primitive object={scene} />
}

useGLTF.preload('/models/reactor/reactor.glb')

export default Reactor