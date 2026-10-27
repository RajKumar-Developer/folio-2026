import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'

import World from './scenes/World'
import GuideDrone from './components/GuideDrone/GuideDrone'

function App() {
  return (
    <Canvas camera={{ position: [10, 25, 50], fov: 50, near: 0.1, far: 500 }} shadows>
      <fog attach="fog" args={['#0B1118', 45, 110]} />
      <color attach="background" args={['#0B1118']} />

      {/* The white body needs light to show its shape */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
      <Environment preset="city" environmentIntensity={0.4} />

      <World />

      <GuideDrone
        url="/models/cyklo/cyklo.glb"
        logNodes // prints node and material names in the console. Remove once done.
        scale={3}
        speed={14}
        idleCenter={[0, 4, 12]}
        // modelYaw={Math.PI}  // uncomment if the drone flies backwards
      />

      <OrbitControls
        makeDefault
        enableDamping
        enablePan={false}
        minDistance={6}
        maxDistance={40}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />
      <EffectComposer>
        <Bloom intensity={0.2} luminanceThreshold={0.3} luminanceSmoothing={0.9} mipmapBlur />
      </EffectComposer>
    </Canvas>
  )
}

export default App