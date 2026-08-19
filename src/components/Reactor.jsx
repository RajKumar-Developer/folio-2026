import { useGLTF } from '@react-three/drei'

function Reactor() {
  const { scene } = useGLTF('/models/reactor/reactor.glb')

  return <primitive object={scene} scale={1.2}/>
}

useGLTF.preload('/models/reactor/reactor.glb')

export default Reactor