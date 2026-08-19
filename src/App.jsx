import { Canvas } from '@react-three/fiber'

import World from './scenes/World'
import Lighting from './scenes/Lighting'

function App() {
  return (
    <Canvas
      camera={{
        position: [10, 25, 50],
        fov: 50,
        near: 0.1,
        far: 500,
      }}
      shadows
    >
      <fog
        attach="fog"
        args={['#0B1118', 45, 110]}
      />
      <color attach="background" args={['#0B1118']} />

      <Lighting />

      <World />
    </Canvas>
  )
}

export default App