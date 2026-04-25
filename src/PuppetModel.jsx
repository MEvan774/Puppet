import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations, useTexture } from '@react-three/drei'

const BLINK_TEXTURES = {
  Closed: '/textures/POPExportTorsoClosed.png',
  HalfOpen: '/textures/POPExportTorsoHalfOpen.png',
  Default: '/textures/POPExportTorsoDefault.png',
}

// Blink frame durations (ms) and pause between blinks (ms range).
const FRAME_CLOSED_MS = 60
const FRAME_HALF_MS = 70
const BLINK_GAP_MIN_MS = 2800
const BLINK_GAP_MAX_MS = 5200

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
// Kept high so the scale change completes while the water overlay holds at full.
const GROW_SPEED = 40

export default function PuppetModel({ toggles = {}, ...props }) {
  const group = useRef()
  const { scene, animations } = useGLTF('/PopRig.glb')
  const { actions, names } = useAnimations(animations, group)
  const blinkMaps = useTexture(BLINK_TEXTURES)

  const toggleRefs = useRef({})
  const baseScales = useRef({})
  const hoofdMesh = useRef(null)

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

      if (layerBase === 'Hoofd' && !hoofdMesh.current) {
        hoofdMesh.current = obj
        const original = obj.material?.map
        for (const key of Object.keys(blinkMaps)) {
          const tex = blinkMaps[key]
          if (original) {
            tex.flipY = original.flipY
            tex.colorSpace = original.colorSpace
            tex.wrapS = original.wrapS
            tex.wrapT = original.wrapT
          }
          tex.needsUpdate = true
        }
      }
    })
  }, [scene, blinkMaps])

  useEffect(() => {
    const mesh = hoofdMesh.current
    if (!mesh || !blinkMaps.Default) return

    let cancelled = false
    let timer

    const setMap = (tex) => {
      const m = mesh.material
      if (!m) return
      m.map = tex
      m.needsUpdate = true
    }

    const wait = (ms) =>
      new Promise((resolve) => {
        timer = setTimeout(resolve, ms)
      })

    async function loop() {
      while (!cancelled) {
        setMap(blinkMaps.Closed)
        await wait(FRAME_CLOSED_MS)
        if (cancelled) return
        setMap(blinkMaps.HalfOpen)
        await wait(FRAME_HALF_MS)
        if (cancelled) return
        setMap(blinkMaps.Default)
        const gap =
          BLINK_GAP_MIN_MS + Math.random() * (BLINK_GAP_MAX_MS - BLINK_GAP_MIN_MS)
        await wait(gap)
      }
    }

    loop()

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [blinkMaps])

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
