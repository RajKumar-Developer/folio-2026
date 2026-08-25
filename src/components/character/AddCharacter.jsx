import { useGLTF } from '@react-three/drei'
// import { useEffect } from 'react'

function AddCharacter() {
  const { scene } = useGLTF('/models/character/demoChar.glb')

  // useEffect(() => {
  //   scene.traverse((child) => {
  //     if (child.isMesh) {
  //       child.material.wireframe = true
  //       child.material.color = '#1100f8'
  //     }
  //   })
  // }, [scene])

  return <primitive object={scene} position={[0, 1.5, 0]} scale={1.9} />
}

useGLTF.preload('/models/character/demoChar.glb')

export default AddCharacter
