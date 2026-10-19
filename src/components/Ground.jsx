import { useLayoutEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";

// --------------------------------------------------
// Settings
// --------------------------------------------------
const CONFIG = {
  glowColor: "#00BFFF",

  // Mask (white = glow, dark = no glow)
  maskLow: 0.6,
  maskHigh: 0.9,

  // Emission
  baseGlow: 0.35, // constant faint glow in the white areas
  pulseGlow: 4.0, // extra brightness of the traveling wave

  // Energy wave from the orb
  waveFrequency: 0.6, // higher = tighter rings
  waveSpeed: 3.0,
  waveSharpness: 6.0, // higher = thinner rings
  falloff: 0.08, // how fast the pulse fades with distance

  // Base surface color tint (multiplies the texture).
  // Darkens the white areas so they don't look like white paint when unlit.
  baseTint: "#1b2a33",
};

function Ground({ orbPosition = [0, 0, 0] }) {
  const { scene } = useGLTF("/models/environment/ground.glb");
  const texture = useTexture("/texture/ground/emitMap.png");

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOrigin: { value: new THREE.Vector3(...orbPosition) },
      uColor: { value: new THREE.Color(CONFIG.glowColor) },
      uLo: { value: CONFIG.maskLow },
      uHi: { value: CONFIG.maskHigh },
      uBase: { value: CONFIG.baseGlow },
      uPulse: { value: CONFIG.pulseGlow },
      uFreq: { value: CONFIG.waveFrequency },
      uSpeed: { value: CONFIG.waveSpeed },
      uSharp: { value: CONFIG.waveSharpness },
      uFalloff: { value: CONFIG.falloff },
    }),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Keep the wave origin in sync if the orb moves
  useLayoutEffect(() => {
    uniforms.uOrigin.value.set(...orbPosition);
  }, [orbPosition, uniforms]);

  useLayoutEffect(() => {
    // --------------------------------------------------
    // Circuit texture
    // --------------------------------------------------
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(12, 12);
    texture.anisotropy = 16;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    // --------------------------------------------------
    // Ground visual
    // --------------------------------------------------
    const groundVisual = scene.getObjectByName("GROUND_VISUAL");
    if (!groundVisual || !groundVisual.isMesh) return;

    const material = groundVisual.material;

    // Circuit texture
    material.map = texture;
    material.color.set(CONFIG.baseTint);

    // PBR
    material.metalness = 0.25;
    material.roughness = 0.65;

    // Emission is built in the shader (masked + animated),
    // so the built-in emissive map is disabled.
    material.emissiveMap = null;
    material.emissive.set("#000000");
    material.toneMapped = false;

    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);

      // ---------- vertex: pass world position ----------
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
           varying vec3 vWPos;`
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
           vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
        );

      // ---------- fragment: masked emission + radial wave ----------
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
           varying vec3 vWPos;
           uniform float uTime, uLo, uHi, uBase, uPulse;
           uniform float uFreq, uSpeed, uSharp, uFalloff;
           uniform vec3 uOrigin, uColor;`
        )
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>

           // 1) Mask from the texture: white = glow, dark = no glow
           vec4 circuit = texture2D(map, vMapUv);
           float lum = dot(circuit.rgb, vec3(0.299, 0.587, 0.114));
           float mask = smoothstep(uLo, uHi, lum);

           // 2) Radial energy wave from the orb
           float d = distance(vWPos.xz, uOrigin.xz);
           float ring = pow(max(0.0, sin(d * uFreq - uTime * uSpeed)), uSharp);
           float fade = exp(-d * uFalloff);

           // 3) Emission only where the mask allows it
           totalEmissiveRadiance = uColor * mask * (uBase + ring * fade * uPulse);`
        );
    };

    material.needsUpdate = true;
  }, [scene, texture, uniforms]);

  useFrame((_, delta) => {
    uniforms.uTime.value += delta;
  });

  return <primitive object={scene} />;
}

useGLTF.preload("/models/environment/ground.glb");
useTexture.preload("/texture/ground/emitMap.png");

export default Ground;