import { Suspense } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import PuppetModel from './PuppetModel'
import WaterTransition from './WaterTransition'

// Tweak these world-unit offsets to fine-tune the model position.
// x: left(-) / right(+)   y: down(-) / up(+)   z: back(-) / forward(+)
const MODEL_POSITION = [0, 0, 0]

// How high the model sits in the viewport (0 = bottom, 0.5 = center, 1 = top)
const MODEL_VERTICAL_ANCHOR = 0.15

// Orthographic camera zoom — increase to zoom in, decrease to zoom out.
const CAMERA_ZOOM = 130

function PositionedModel({ toggles }) {
  const { viewport } = useThree()
  const [x, y, z] = MODEL_POSITION
  const anchorY = viewport.height * (MODEL_VERTICAL_ANCHOR - 0.5)
  return <PuppetModel position={[x, anchorY + y, z]} toggles={toggles} />
}

export default function PuppetScene({ toggles, water = { active: false, height: 0 } }) {
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 400], zoom: CAMERA_ZOOM, near: 0.1, far: 2000 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 7]} intensity={1.2} />
      <Suspense fallback={null}>
        <Environment preset="city" />
        <PositionedModel toggles={toggles} />
      </Suspense>
      <WaterTransition active={water.active} height={water.height} />
    </Canvas>
  )
}
