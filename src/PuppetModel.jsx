import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'

const LAYER_ORDER = [
  'Haar',
  'Kont',
  'BeenR',
  'BeenL',
  'RArm',
  'Romp',
  'Borst',
  'Hoofd',
  'LippenGroot',
  'BorstGroot',
]

// Meshes that should start invisible and grow when toggled on.
const TOGGLEABLE = ['LippenGroot', 'BorstGroot', 'Kont']

// Bigger = snappier transition. Time constant in ~seconds.
const GROW_SPEED = 6

export default function PuppetModel({ toggles = {}, ...props }) {
  const group = useRef()
  const { scene, animations } = useGLTF('/PopRig.glb')
  const { actions, names } = useAnimations(animations, group)

  const toggleRefs = useRef({})
  const baseScales = useRef({})

  const matchName = (name, list) =>
    list.find((n) => name === n || name.startsWith(n))

  // 2D-cutout rig: fix layering + capture toggleable meshes' original scale
  // and shrink them to ~0 so they grow in on first toggle.
  useEffect(() => {
    scene.traverse((obj) => {
      if (!obj.isMesh) return

      const layerBase = matchName(obj.name, LAYER_ORDER)
      obj.renderOrder = layerBase ? LAYER_ORDER.indexOf(layerBase) : -1

      const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
      for (const m of mats) {
        if (!m) continue
        m.depthTest = false
        m.depthWrite = false
        m.transparent = true
      }

      const toggleBase = matchName(obj.name, TOGGLEABLE)
      if (toggleBase && !toggleRefs.current[toggleBase]) {
        toggleRefs.current[toggleBase] = obj
        baseScales.current[toggleBase] = obj.scale.clone()
        obj.scale.set(0.0001, 0.0001, 0.0001)
      }
    })
  }, [scene])

  useFrame((_, delta) => {
    const t = 1 - Math.exp(-GROW_SPEED * delta)
    for (const name of TOGGLEABLE) {
      const mesh = toggleRefs.current[name]
      const base = baseScales.current[name]
      if (!mesh || !base) continue
      const on = !!toggles[name]
      const targetX = on ? base.x : 0.0001
      const targetY = on ? base.y : 0.0001
      const targetZ = on ? base.z : 0.0001
      mesh.scale.x += (targetX - mesh.scale.x) * t
      mesh.scale.y += (targetY - mesh.scale.y) * t
      mesh.scale.z += (targetZ - mesh.scale.z) * t
    }
  })

  useEffect(() => {
    const action = actions[names[0]]
    if (action) {
      action.reset().fadeIn(0.3).play()
      return () => {
        action.fadeOut(0.3)
      }
    }
  }, [actions, names])

  return (
    <group ref={group} {...props}>
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload('/PopRig.glb')
