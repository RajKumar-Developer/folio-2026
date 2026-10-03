uniform float uTime;

varying vec3 vPosition;
varying vec3 vNormal;

#include <common>
#include <skinning_pars_vertex>

float random2D(vec2 value)
{
    return fract(sin(dot(value.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main()
{
    // Skinning support (keeps animated characters posed correctly)
    #include <beginnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <begin_vertex>
    #include <skinning_vertex>

    // Position
    vec4 modelPosition = modelMatrix * vec4(transformed, 1.0);

    // Glitch
    float glitchTime = uTime - modelPosition.y;
    float glitchStrength = sin(glitchTime) + sin(glitchTime * 3.45) + sin(glitchTime * 8.76);
    glitchStrength /= 3.0;
    glitchStrength = smoothstep(0.3, 1.0, glitchStrength);
    glitchStrength *= 0.25;
    modelPosition.x += (random2D(modelPosition.xz + uTime) - 0.5) * glitchStrength;
    modelPosition.z += (random2D(modelPosition.zx + uTime) - 0.5) * glitchStrength;

    // Final position
    gl_Position = projectionMatrix * viewMatrix * modelPosition;

    // Model normal
    vec4 modelNormal = modelMatrix * vec4(objectNormal, 0.0);

    // Varyings
    vPosition = modelPosition.xyz;
    vNormal = modelNormal.xyz;
}
