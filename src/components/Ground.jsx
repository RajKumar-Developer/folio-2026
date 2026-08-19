import { useGLTF } from '@react-three/drei'

function Ground() {
  const { scene } = useGLTF('/models/environment/ground.glb')

  return <primitive object={scene} scale={2}/>
}

useGLTF.preload('/models/environment/ground.glb')

export default Ground