import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'

// Minimum time the syringe is visible, so a cached load still gets a nice fill animation.
const MIN_SHOW_MS = 900
// ms between "fill complete" and the loader fading out.
const HOLD_AFTER_FULL_MS = 250
// ms to fade out.
const FADE_MS = 600
// ms grace period before assuming no loaders will register.
const WAIT_FOR_LOADER_MS = 400

export default function SyringeLoader() {
  const { progress, active } = useProgress()
  const [everActive, setEverActive] = useState(false)
  const [shown, setShown] = useState(0)
  const [fadingOut, setFadingOut] = useState(false)
  const [visible, setVisible] = useState(true)
  const mountedAt = useRef(performance.now())

  // Mark that at least one loader kicked in.
  useEffect(() => {
    if (active) setEverActive(true)
  }, [active])

  // If nothing ever reports loading (e.g. cached assets), allow completion after a short grace period.
  useEffect(() => {
    const t = setTimeout(() => setEverActive(true), WAIT_FOR_LOADER_MS)
    return () => clearTimeout(t)
  }, [])

  // Target fill %:
  //   - before any loader registers: follow raw progress (usually 0)
  //   - during loading: follow raw progress
  //   - after loading: always complete to 100
  const target = !everActive ? progress : active ? progress : 100

  // Smoothly animate shown toward target.
  useEffect(() => {
    let raf = 0
    function step() {
      setShown((s) => {
        const delta = target - s
        if (Math.abs(delta) < 0.05) {
          raf = 0
          return target
        }
        raf = requestAnimationFrame(step)
        return s + delta * 0.15
      })
    }
    raf = requestAnimationFrame(step)
    return () => {
      if (raf) cancelAnimationFrame(raf)
    }
  }, [target])

  // When full (and min-show time elapsed), start fading out.
  useEffect(() => {
    if (!fadingOut && shown >= 99.5) {
      const elapsed = performance.now() - mountedAt.current
      const delay = Math.max(HOLD_AFTER_FULL_MS, MIN_SHOW_MS - elapsed)
      const t = setTimeout(() => setFadingOut(true), delay)
      return () => clearTimeout(t)
    }
  }, [shown, fadingOut])

  // After fade completes, unmount.
  useEffect(() => {
    if (!fadingOut) return
    const t = setTimeout(() => setVisible(false), FADE_MS + 50)
    return () => clearTimeout(t)
  }, [fadingOut])

  if (!visible) return null

  const pct = Math.max(0, Math.min(100, shown)) / 100

  // Syringe geometry (viewBox units).
  const barrelTop = 54
  const barrelBottom = 194
  const barrelH = barrelBottom - barrelTop
  const sealY = barrelBottom - barrelH * pct
  const fluidH = Math.max(0, barrelH * pct - 6)
  const rodLen = 72
  const handleY = sealY - rodLen - 6

  return (
    <div className={`syringe-loader ${fadingOut ? 'is-out' : ''}`} aria-hidden="true">
      <div className="syringe-inner">
        <svg className="syringe-svg" viewBox="0 -30 100 310" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <clipPath id="syringe-barrel-clip">
              <rect x="27" y={barrelTop} width="46" height={barrelH} />
            </clipPath>
          </defs>

          {/* Plunger handle */}
          <rect x="25" y={handleY} width="50" height="6" rx="1.5" fill="#ffffff" />
          {/* Plunger rod */}
          <rect x="46" y={handleY + 6} width="8" height={sealY - handleY - 6} fill="#ffffff" />
          {/* Plunger seal */}
          <rect x="27" y={sealY} width="46" height="6" fill="#ffffff" />

          {/* Fluid */}
          <g clipPath="url(#syringe-barrel-clip)">
            <rect x="27" y={sealY + 6} width="46" height={fluidH} fill="#ffffff" />
          </g>

          {/* Barrel outline */}
          <rect
            x="27"
            y={barrelTop}
            width="46"
            height={barrelH}
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
          />

          {/* Flange */}
          <rect x="18" y="50" width="64" height="5" rx="1" fill="#ffffff" />

          {/* Graduations */}
          <g stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round">
            <line x1="27" y1="82" x2="34" y2="82" />
            <line x1="27" y1="110" x2="34" y2="110" />
            <line x1="27" y1="138" x2="34" y2="138" />
            <line x1="27" y1="166" x2="34" y2="166" />
          </g>

          {/* Taper to hub */}
          <polygon points="27,194 73,194 56,214 44,214" fill="#ffffff" />
          {/* Needle hub */}
          <rect x="43" y="214" width="14" height="10" rx="1" fill="#ffffff" />
          {/* Needle */}
          <line
            x1="50"
            y1="224"
            x2="50"
            y2="262"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <div className="syringe-label">Loading...</div>
        <div className="syringe-pct">{Math.round(shown)}%</div>
      </div>
    </div>
  )
}
