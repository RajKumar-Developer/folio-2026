import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'

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
      <OrbitControls
        makeDefault
        enableDamping
        enablePan
        minDistance={5}
        maxDistance={100}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />
      <EffectComposer>
        <Bloom
          intensity={1}
          luminanceThreshold={0.3}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  )
}

export default App