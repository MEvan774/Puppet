import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Water-fill (height 0..1, no ball/Fresnel) + rain shader overlay.
const fragmentShader = /* glsl */ `
  precision mediump float;

  uniform float uHeight;
  uniform float uTime;
  uniform vec3  uWaterColor;
  uniform vec4  uRainColor;
  uniform int   uRainCount;
  uniform float uSlant;
  uniform float uSpeed;
  uniform float uBlur;
  uniform vec2  uSize;

  varying vec2 vUv;

  float line_sdf(vec2 p, vec2 s) {
    vec2 d = abs(p) - s;
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
  }

  float Hash(float x)  { return fract(sin(x * 18.34) * 51.78); }
  float Hash2(float x) { return fract(sin(x * 25.42) * 21.24); }

  void main() {
    vec2 uv = vUv;

    float wave = sin(uv.x * 14.0 + uTime * 2.5) * 0.010
               + sin(uv.x * 36.0 - uTime * 3.7) * 0.005;
    float surface = clamp(uHeight + wave, 0.0, 1.1);
    float waterMask = smoothstep(surface + 0.006, surface - 0.006, uv.y);

    float depth = clamp(surface - uv.y, 0.0, 0.8);
    vec3 waterCol = mix(uWaterColor * 1.15, uWaterColor * 0.65, depth);

    vec2 s = uSize * 0.1;
    float t = uTime + 1000.0;
    vec2 ruv = vec2(uv.x, 1.0 - uv.y);
    ruv.x += ruv.y * uSlant;
    float rain = 0.0;

    for (int i = 1; i <= 200; i++) {
      if (i > uRainCount) break;
      float fi = float(i);
      float h1 = Hash(fi);
      float h2 = Hash2(fi);
      float sl = h1 * ruv.y * -uSlant;
      float px = h1 * 1.2;
      float py = max(h2 * uSpeed, px * uSpeed);
      vec2 pos = vec2(px + sl, -mod(-py * t * 0.1, -1.0));
      float sdf = line_sdf(ruv - pos, s);
      rain += clamp(-sdf / uBlur, 0.0, 1.0);
    }

    rain = clamp(rain, 0.0, 1.0) * (1.0 - waterMask);

    vec3 color = mix(uRainColor.rgb, waterCol, waterMask);
    float alpha = max(waterMask, rain * uRainColor.a);

    gl_FragColor = vec4(color, alpha);
  }
`

export default function WaterTransition({ height = 0, active = false }) {
  const { viewport } = useThree()
  const matRef = useRef()

  const uniforms = useMemo(
    () => ({
      uHeight:     { value: 0 },
      uTime:       { value: 0 },
      uWaterColor: { value: new THREE.Color(0.25, 0.55, 0.95) },
      uRainColor:  { value: new THREE.Vector4(0.85, 0.92, 1.0, 0.9) },
      uRainCount:  { value: 150 },
      uSlant:      { value: -0.01 },
      uSpeed:      { value: 50.0 },
      uBlur:       { value: 0.002 },
      uSize:       { value: new THREE.Vector2(0.005, 0.2) },
    }),
    []
  )

  useFrame((_, dt) => {
    const m = matRef.current
    if (!m) return
    m.uniforms.uTime.value += dt
    m.uniforms.uHeight.value = height
  })

  if (!active) return null

  return (
    <mesh renderOrder={999} position={[0, 0, 200]} frustumCulled={false}>
      <planeGeometry args={[viewport.width * 2, viewport.height * 2]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}
