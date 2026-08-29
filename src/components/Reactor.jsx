import { useGLTF } from '@react-three/drei'

import ReactorLight from './Reactor/ReactorLight'
import ReactorChamber from './Reactor/ReactorChamber'
import AddCharacter from './character/addCharacter'
function Reactor() {
  const { scene } = useGLTF('/models/reactor/reactor.glb')

  return (
    <group
      position={[0, 0, 0]}
    >
      <primitive object={scene}/>
      {/* <ReactorLight /> */}
      <ReactorChamber />
      <AddCharacter/>
    </group>
  )
}

useGLTF.preload('/models/reactor/reactor.glb')

export default Reactor