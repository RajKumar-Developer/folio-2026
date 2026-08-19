import { HemisphereLight } from 'three'

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.35} />

      <directionalLight
        position={[10, 20, 10]}
        intensity={10}
        castShadow
      />

      <hemisphereLight
        args={['#63E6FF', '#080D13', 0.4]}
      />
    </>
  )
}

export default Lighting