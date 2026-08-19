import { useGLTF } from '@react-three/drei'

function Ground() {
  const { scene } = useGLTF('/models/environment/ground.glb')

  return <primitive object={scene} />
}

useGLTF.preload('/models/environment/ground.glb')

export default Ground