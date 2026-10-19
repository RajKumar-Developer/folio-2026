import { useMemo, useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import vertexShader from './shaders/hologram.vert.glsl?raw'
import fragmentShader from './shaders/hologram.frag.glsl?raw'
 
const MODEL_URL = '/models/character/demoChar.glb'
 
function AddCharacter({
  color = '#00BFFF',
  position = [0, 0.38, 0],
  scale = 2,
  renderOrder = 10, // drawn after the glass/haze
  // Solid objects (the top block) hide the hologram only when depth testing is on
  depthTest = true,
  // Stops transparent objects (glass, haze) from writing depth and hiding the hologram.
  // Solid/opaque objects are untouched, so they still occlude it.
  fixTransparentDepth = true,
  // Optional world-space height limits (e.g. clipMaxY just under the tube lid)
  clipMinY = -1000,
  clipMaxY = 1000,
}) {
  const { scene } = useGLTF(MODEL_URL)
  const rootScene = useThree((state) => state.scene)
  const frame = useRef(0)
 
  // Clone so the cached GLTF scene is never mutated (SkeletonUtils keeps skinned meshes working)
  const model = useMemo(() => clone(scene), [scene])
 
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: new THREE.Uniform(0),
          uColor: new THREE.Uniform(new THREE.Color(color)),
          uClipMinY: new THREE.Uniform(clipMinY),
          uClipMaxY: new THREE.Uniform(clipMaxY),
        },
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest,
        blending: THREE.AdditiveBlending,
      }),
    [] // created once; props are synced below
  )
 
  // Keep props in sync
  useEffect(() => {
    material.uniforms.uColor.value.set(color)
    material.uniforms.uClipMinY.value = clipMinY
    material.uniforms.uClipMaxY.value = clipMaxY
    material.depthTest = depthTest
    material.needsUpdate = true
  }, [material, color, clipMinY, clipMaxY, depthTest])
 
  // Apply the material and render order to every mesh
  useEffect(() => {
    model.traverse((child) => {
      if (child.isMesh) {
        child.material = material
        child.frustumCulled = false // avoids skinned meshes disappearing
        child.renderOrder = renderOrder
      }
    })
  }, [model, material, renderOrder])
 
  // Make every transparent material in the scene stop writing depth
  const fixDepth = () => {
    rootScene.traverse((obj) => {
      if (!obj.isMesh || obj.material === material) return
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
      mats.forEach((m) => {
        if (m.transparent && m.depthWrite) {
          m.depthWrite = false
          m.needsUpdate = true
        }
      })
    })
  }
 
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.getElapsedTime()
 
    // Re-run about once a second so late-loading glass/haze meshes are caught too
    if (fixTransparentDepth && frame.current++ % 60 === 0) fixDepth()
  })
 
  // Cleanup
  useEffect(() => () => material.dispose(), [material])
 
  return <primitive object={model} position={position} scale={scale} />
}
 
useGLTF.preload(MODEL_URL)
 
export default AddCharacter