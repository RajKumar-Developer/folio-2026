import { useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
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
  renderOrder = 10, // drawn after the glass/haze, inside the transparent pass
  depthTest = false, // false = never clipped by depth-writing planes (fixes the cut-off)
}) {
  const { scene } = useGLTF(MODEL_URL)
 
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
        },
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest,
        blending: THREE.AdditiveBlending,
      }),
    [] // created once; props are synced below
  )
 
  // Keep color in sync with props
  useEffect(() => {
    material.uniforms.uColor.value.set(color)
  }, [material, color])
 
  // Keep depthTest in sync with props
  useEffect(() => {
    material.depthTest = depthTest
    material.needsUpdate = true
  }, [material, depthTest])
 
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
 
  // Animate
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.getElapsedTime()
  })
 
  // Cleanup
  useEffect(() => () => material.dispose(), [material])
 
  return <primitive object={model} position={position} scale={scale} />
}
 
useGLTF.preload(MODEL_URL)
 
export default AddCharacter