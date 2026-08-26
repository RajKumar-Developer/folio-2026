import { useGLTF } from '@react-three/drei'

import ReactorLight from './Reactor/ReactorLight'
import ReactorChamber from './Reactor/ReactorChamber'
import AddCharacter from './character/addCharacter'
function Reactor() {
  const { scene } = useGLTF('/models/reactor/reactor.glb')

  return (
    <group
      position={[0, 0, 0]}
      scale={[1.2, 1.0, 1.2]}
    >
      <primitive object={scene} scale={0.4}/>
      {/* <ReactorLight /> */}
      <ReactorChamber />
      <AddCharacter/>
    </group>
  )
}

useGLTF.preload('/models/reactor/reactor.glb')

export default Reactor