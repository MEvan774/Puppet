import { useRef, useState } from 'react'
import PuppetScene from './PuppetScene'
import SyringeLoader from './SyringeLoader'
import SyringeIcon from './SyringeIcon'
import './App.css'

// Flip to false to skip the water/rain transition — buttons will toggle immediately.
const TRANSITION_ENABLED = true

const FILL_MS = 700
const HOLD_MS = 120
const DRAIN_MS = 700

export default function App() {
  const [lippen, setLippen] = useState(false)
  const [borst, setBorst] = useState(false)
  const [kont, setKont] = useState(false)

  const [water, setWater] = useState({ active: false, height: 0 })
  const busy = useRef(false)

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

    if (!TRANSITION_ENABLED) {
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
          <SyringeIcon />
        </button>
        <button
          className={`puppet-btn btn-middle-right ${borst ? 'is-on' : ''}`}
          type="button"
          aria-label="Borst"
          title="Borst"
          onClick={() => triggerTransition('BorstGroot')}
        >
          <SyringeIcon />
        </button>
        <button
          className={`puppet-btn btn-left ${kont ? 'is-on' : ''}`}
          type="button"
          aria-label="Kont"
          title="Kont"
          onClick={() => triggerTransition('Kont')}
        >
          <SyringeIcon />
        </button>
      </div>
    </main>
  )
}
