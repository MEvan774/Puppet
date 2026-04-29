import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'

const MIN_SHOW_MS = 2200
const HOLD_AFTER_FULL_MS = 900
const FADE_MS = 1200
const WAIT_FOR_LOADER_MS = 400
const FILL_DURATION_MS = 4500
const TOTAL_DROPS = 25
const NUM_POINTS = 30

export default function SyringeLoader() {
  const { progress, active } = useProgress()
  const [everActive, setEverActive] = useState(false)
  const [shown, setShown] = useState(0)
  const [phase, setPhase] = useState('loading') // loading -> pouring -> draining -> done
  const mountedAt = useRef(performance.now())

  const overlayRef = useRef(null)
  const poolRef = useRef(null)
  const poolPathRef = useRef(null)
  const poolHighlightRef = useRef(null)
  const stageRef = useRef(null)

  useEffect(() => {
    if (active) setEverActive(true)
  }, [active])

  useEffect(() => {
    const t = setTimeout(() => setEverActive(true), WAIT_FOR_LOADER_MS)
    return () => clearTimeout(t)
  }, [])

  const target = !everActive ? progress : active ? progress : 100

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

  // When fill completes, run the pour-into-pool transition.
  useEffect(() => {
    if (phase !== 'loading') return
    if (shown < 99.5) return
    const elapsed = performance.now() - mountedAt.current
    const delay = Math.max(HOLD_AFTER_FULL_MS, MIN_SHOW_MS - elapsed)
    const t = setTimeout(() => setPhase('pouring'), delay)
    return () => clearTimeout(t)
  }, [shown, phase])

  // Run droplet pool simulation while in pouring/draining phase.
  useEffect(() => {
    if (phase !== 'pouring') return

    const poolPoints = new Array(NUM_POINTS).fill(100)
    const poolEquilibrium = new Array(NUM_POINTS).fill(100)
    let waveTime = 0
    let animating = true

    const SVG_W = 1000
    const SVG_H = 1000

    function getPoolPathData() {
      const stepX = SVG_W / (NUM_POINTS - 1)
      let d = `M 0,${SVG_H} L 0,${(poolPoints[0] / 100) * SVG_H} `
      for (let i = 1; i < NUM_POINTS; i++) {
        const x = i * stepX
        const y = (poolPoints[i] / 100) * SVG_H
        const prevX = (i - 1) * stepX
        const prevY = (poolPoints[i - 1] / 100) * SVG_H
        const cpX = (prevX + x) / 2
        d += `Q ${cpX},${prevY} ${x},${y} `
      }
      d += `L ${SVG_W},${SVG_H} Z`
      return d
    }

    function getHighlightPathData() {
      const stepX = SVG_W / (NUM_POINTS - 1)
      let d = `M 0,${(poolPoints[0] / 100) * SVG_H} `
      for (let i = 1; i < NUM_POINTS; i++) {
        const x = i * stepX
        const y = (poolPoints[i] / 100) * SVG_H
        const prevX = (i - 1) * stepX
        const prevY = (poolPoints[i - 1] / 100) * SVG_H
        const cpX = (prevX + x) / 2
        d += `Q ${cpX},${prevY} ${x},${y} `
      }
      return d
    }

    function renderPool() {
      if (poolPathRef.current) poolPathRef.current.setAttribute('d', getPoolPathData())
      if (poolHighlightRef.current) poolHighlightRef.current.setAttribute('d', getHighlightPathData())
    }

    function animatePool() {
      if (!animating) return
      waveTime += 0.05
      for (let i = 0; i < NUM_POINTS; i++) {
        const wave = Math.sin(waveTime + i * 0.4) * 0.6 + Math.sin(waveTime * 0.7 + i * 0.25) * 0.4
        const target = poolEquilibrium[i] + wave
        poolPoints[i] += (target - poolPoints[i]) * 0.18
      }
      const smoothed = poolPoints.slice()
      for (let i = 1; i < NUM_POINTS - 1; i++) {
        smoothed[i] = poolPoints[i] * 0.6 + (poolPoints[i - 1] + poolPoints[i + 1]) * 0.2
      }
      for (let i = 0; i < NUM_POINTS; i++) poolPoints[i] = smoothed[i]
      renderPool()
      requestAnimationFrame(animatePool)
    }

    function poolDropImpact(xVw) {
      const idx = Math.round((xVw / 100) * (NUM_POINTS - 1))
      const localBump = 4
      const globalRaise = 100 / TOTAL_DROPS
      for (let i = 0; i < NUM_POINTS; i++) {
        poolEquilibrium[i] = Math.max(0, poolEquilibrium[i] - globalRaise)
      }
      for (let i = -3; i <= 3; i++) {
        const j = idx + i
        if (j >= 0 && j < NUM_POINTS) {
          const falloff = (4 - Math.abs(i)) / 4
          poolPoints[j] = Math.max(0, poolPoints[j] - localBump * falloff * 1.5)
        }
      }
    }

    function getSyringeTipPosition() {
      const stage = stageRef.current
      if (!stage) return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
      const rect = stage.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const localTipX = 240
      const angle = (-15 * Math.PI) / 180
      return {
        x: cx + localTipX * Math.cos(angle),
        y: cy + localTipX * Math.sin(angle),
      }
    }

    function spawnSplash(xVw, yVh) {
      const splash = document.createElement('div')
      splash.className = 'splash-ring'
      splash.style.left = xVw + 'vw'
      splash.style.top = (yVh - 0.5) + 'vh'
      splash.style.animation = 'splashFade 0.7s ease-out forwards'
      document.body.appendChild(splash)
      setTimeout(() => splash.remove(), 800)
    }

    function spawnRipple(x, y) {
      const ripple = document.createElement('div')
      ripple.className = 'ripple'
      ripple.style.left = x + 'px'
      ripple.style.top = y + 'px'
      ripple.style.animation = 'rippleExpand 0.9s ease-out forwards'
      document.body.appendChild(ripple)
      setTimeout(() => ripple.remove(), 1000)
    }

    function spawnDrop() {
      const tip = getSyringeTipPosition()
      const tipXvw = (tip.x / window.innerWidth) * 100
      const drift = (Math.random() - 0.5) * 40
      const landXvw = Math.max(2, Math.min(98, tipXvw + drift))
      const idx = Math.round((landXvw / 100) * (NUM_POINTS - 1))
      const landYvh = poolPoints[idx]

      const drop = document.createElement('div')
      drop.className = 'big-drop'
      const size = 22 + Math.random() * 18
      drop.style.width = size + 'px'
      drop.style.height = size * 1.35 + 'px'
      drop.style.left = tip.x - size / 2 + 'px'
      drop.style.top = tip.y + 'px'
      document.body.appendChild(drop)

      const startX = tip.x - size / 2
      const startY = tip.y
      const endX = (landXvw / 100) * window.innerWidth - size / 2
      const endY = (landYvh / 100) * window.innerHeight - size * 0.6
      const duration = 700 + Math.random() * 300
      const t0 = performance.now()

      function animateDrop(now) {
        const t = Math.min((now - t0) / duration, 1)
        const x = startX + (endX - startX) * t
        const y = startY + (endY - startY) * t * t
        drop.style.left = x + 'px'
        drop.style.top = y + 'px'
        drop.style.opacity = t < 0.1 ? t * 10 : 1
        if (t < 1) requestAnimationFrame(animateDrop)
        else {
          spawnSplash(landXvw, landYvh)
          spawnRipple(endX + size / 2, (landYvh / 100) * window.innerHeight)
          poolDropImpact(landXvw)
          drop.remove()
        }
      }
      requestAnimationFrame(animateDrop)
    }

    // Show pool
    if (poolRef.current) poolRef.current.style.transform = 'translateY(0)'
    requestAnimationFrame(animatePool)

    const interval = FILL_DURATION_MS / TOTAL_DROPS
    const timeouts = []
    for (let i = 0; i < TOTAL_DROPS; i++) {
      timeouts.push(setTimeout(spawnDrop, i * interval))
    }

    const drainTimer = setTimeout(() => setPhase('draining'), FILL_DURATION_MS + 1400)

    return () => {
      animating = false
      timeouts.forEach(clearTimeout)
      clearTimeout(drainTimer)
    }
  }, [phase])

  // Drain phase: fade overlay, slide pool up, then unmount.
  useEffect(() => {
    if (phase !== 'draining') return
    if (overlayRef.current) overlayRef.current.classList.add('fade-out')
    const t1 = setTimeout(() => {
      if (poolRef.current) poolRef.current.classList.add('draining')
    }, 800)
    const t2 = setTimeout(() => setPhase('done'), 3000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [phase])

  if (phase === 'done') return null

  return (
    <>
      <div ref={overlayRef} className="loader-overlay" aria-hidden="true">
        <div className="loader-wrap">
          <div className="percentage-box">
            <div className="percentage">
              <span>{Math.round(shown)}</span>
              <span className="percentage-symbol">%</span>
            </div>
          </div>

          <div className="syringe-stage" ref={stageRef}>
            <div className="syringe">
              <div className="plunger-rod"></div>
              <div className="plunger-thumb"></div>
              <div className="flange"></div>
              <div className="barrel">
                <div className="liquid"></div>
                <div className="liquid-shine"></div>
                <div className="gasket"></div>
                <div className="bubble b1"></div>
                <div className="bubble b2"></div>
                <div className="bubble b3"></div>
                <div className="liquid-sparkle ls1">&#10022;</div>
                <div className="liquid-sparkle ls2">&#10022;</div>
                <div className="liquid-sparkle ls3">&#10022;</div>
                <div className="liquid-sparkle ls4">&#10022;</div>
                <div className="liquid-sparkle ls5">&#10022;</div>
                <div className="mark mark-long" style={{ left: '20px' }}></div>
                <div className="mark" style={{ left: '40px' }}></div>
                <div className="mark mark-long" style={{ left: '60px' }}></div>
                <div className="mark" style={{ left: '80px' }}></div>
                <div className="mark mark-long" style={{ left: '100px' }}></div>
                <div className="mark" style={{ left: '120px' }}></div>
                <div className="mark mark-long" style={{ left: '140px' }}></div>
                <div className="mark" style={{ left: '160px' }}></div>
                <div className="mark mark-long" style={{ left: '180px' }}></div>
                <div className="mark" style={{ left: '200px' }}></div>
              </div>
              <div className="hub"></div>
              <div className="hub-cone"></div>
              <div className="needle"></div>
              <div className="droplet-field">
                <div className="tip-drop"></div>
                <div className="droplet d1"></div>
                <div className="droplet d2"></div>
                <div className="droplet d3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div ref={poolRef} className="droplet-pool" aria-hidden="true">
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="poolGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffd4e5" />
              <stop offset="25%" stopColor="#ffb8d8" />
              <stop offset="60%" stopColor="#ff88b5" />
              <stop offset="100%" stopColor="#d85a8c" />
            </linearGradient>
          </defs>
          <path ref={poolPathRef} d="M 0,1000 L 0,1000 L 1000,1000 L 1000,1000 Z" fill="url(#poolGradient)" />
          <path ref={poolHighlightRef} d="M 0,1000 L 1000,1000" fill="none" stroke="rgba(255, 240, 248, 0.6)" strokeWidth="3" />
        </svg>
      </div>
    </>
  )
}
