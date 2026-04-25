import { useEffect, useRef, useState } from 'react'
import PuppetScene from './PuppetScene'
import SyringeLoader from './SyringeLoader'
import './App.css'

// Flip to false to skip the water/rain transition — buttons will toggle immediately.
const TRANSITION_ENABLED = true

const FILL_MS = 700
const HOLD_MS = 120
const DRAIN_MS = 700

// Meshes whose toggle fires a sound effect (grow on, shrink on).
const SFX_KEYS = new Set(['BorstGroot', 'Kont'])

export default function App() {
  const [lippen, setLippen] = useState(false)
  const [borst, setBorst] = useState(false)
  const [kont, setKont] = useState(false)

  const [water, setWater] = useState({ active: false, height: 0 })
  const busy = useRef(false)

  const growSfx = useRef(null)
  const shrinkSfx = useRef(null)
  const stepsSfx = useRef(null)

  useEffect(() => {
    growSfx.current = new Audio('/sfx/growInflates.mp3')
    shrinkSfx.current = new Audio('/sfx/shrinkPop.mp3')
    growSfx.current.preload = 'auto'
    shrinkSfx.current.preload = 'auto'

    const steps = new Audio('/sfx/voetstappen.mp3')
    steps.loop = true
    steps.volume = 0.5
    steps.preload = 'auto'
    stepsSfx.current = steps

    // Browsers block autoplay until the user interacts; try now, then fall
    // back to the first gesture.
    const start = () => {
      steps.play().catch(() => {})
    }
    start()
    const onGesture = () => {
      start()
      window.removeEventListener('pointerdown', onGesture)
      window.removeEventListener('keydown', onGesture)
    }
    window.addEventListener('pointerdown', onGesture)
    window.addEventListener('keydown', onGesture)

    return () => {
      steps.pause()
      window.removeEventListener('pointerdown', onGesture)
      window.removeEventListener('keydown', onGesture)
    }
  }, [])

  function playSfx(willGrow) {
    const audio = willGrow ? growSfx.current : shrinkSfx.current
    if (!audio) return
    audio.currentTime = 0
    audio.play().catch(() => {})
  }

  const toggles = {
    LippenGroot: lippen,
    BorstGroot: borst,
    Kont: kont,
  }

  const setters = {
    LippenGroot: setLippen,
    BorstGroot: setBorst,
    Kont: setKont,
  }

  function triggerTransition(key) {
    const setter = setters[key]
    const willBe = !toggles[key]
    const withSfx = SFX_KEYS.has(key)

    if (!TRANSITION_ENABLED) {
      if (withSfx) playSfx(willBe)
      setter((v) => !v)
      return
    }

    if (busy.current) return
    busy.current = true

    const start = performance.now()
    const total = FILL_MS + HOLD_MS + DRAIN_MS
    let flipped = false

    setWater({ active: true, height: 0 })

    function step(now) {
      const t = now - start
      let h
      if (t < FILL_MS) {
        h = t / FILL_MS
      } else if (t < FILL_MS + HOLD_MS) {
        h = 1
        if (!flipped) {
          flipped = true
          if (withSfx) playSfx(willBe)
          setter((v) => !v)
        }
      } else if (t < total) {
        h = 1 - (t - FILL_MS - HOLD_MS) / DRAIN_MS
      } else {
        setWater({ active: false, height: 0 })
        busy.current = false
        return
      }
      setWater({ active: true, height: h })
      requestAnimationFrame(step)
    }

    requestAnimationFrame(step)
  }

  return (
    <main id="center">
      <div className="stage">
        <div className="canvas-wrap">
          <img
            className="city-background"
            src={kont ? '/beach-bg.svg' : lippen ? '/sakura-bg.svg' : '/city-background.svg'}
            alt=""
            aria-hidden="true"
            draggable="false"
          />
          <PuppetScene toggles={toggles} water={water} />
        </div>

        <SyringeLoader />

        <button
          className={`puppet-btn btn-top-right ${lippen ? 'is-on' : ''}`}
          type="button"
          aria-label="Lippen"
          title="Lippen"
          onClick={() => triggerTransition('LippenGroot')}
        >
          <span
            className="btn-icon"
            style={{ '--icon-url': "url('/LipsIcon.svg')" }}
          />
        </button>
        <button
          className={`puppet-btn btn-middle-right ${borst ? 'is-on' : ''}`}
          type="button"
          aria-label="Borst"
          title="Borst"
          onClick={() => triggerTransition('BorstGroot')}
        >
          <span
            className="btn-icon"
            style={{ '--icon-url': "url('/BreastIcon.svg')" }}
          />
        </button>
        <button
          className={`puppet-btn btn-left ${kont ? 'is-on' : ''}`}
          type="button"
          aria-label="Kont"
          title="Kont"
          onClick={() => triggerTransition('Kont')}
        >
          <span
            className="btn-icon"
            style={{ '--icon-url': "url('/ButtIcon.svg')" }}
          />
        </button>
      </div>
    </main>
  )
}
