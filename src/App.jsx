import { useEffect, useRef, useState } from 'react'
import PuppetScene from './PuppetScene'
import SyringeLoader from './SyringeLoader'
import './App.css'

// Map each toggle key to its scene index (0=sakura, 1=beach, 2=night).
const SCENE_FOR_KEY = { LippenGroot: 0, BorstGroot: 1, Kont: 2 }
const SCENE_SRCS = ['/sakura-bg.svg', '/beach-bg.svg', '/city-background.svg']
const SCENE_LABELS = ['Sakura park', 'Strand', 'Nacht']

// Meshes whose toggle fires a sound effect (grow on, shrink on).
const SFX_KEYS = new Set(['BorstGroot', 'Kont'])

const TRANSITION_MS = 2500
const SWAP_MID_MS = 1100

export default function App() {
  const [lippen, setLippen] = useState(false)
  const [borst, setBorst] = useState(false)
  const [kont, setKont] = useState(false)

  const [currentScene, setCurrentScene] = useState(0)
  const busy = useRef(false)

  const petalsRef = useRef(null)
  const duskRef = useRef(null)
  const starsRef = useRef(null)

  const growSfx = useRef(null)
  const shrinkSfx = useRef(null)
  const hoverSfx = useRef(null)
  const clickSfx = useRef(null)
  const stepsSfx = useRef(null)
  const [flashing, setFlashing] = useState(null)

  useEffect(() => {
    growSfx.current = new Audio('/sfx/growInflates.mp3')
    shrinkSfx.current = new Audio('/sfx/shrinkPop.mp3')
    hoverSfx.current = new Audio('/sfx/ButtonHover.mp3')
    clickSfx.current = new Audio('/sfx/ButtonClick.mp3')
    growSfx.current.preload = 'auto'
    shrinkSfx.current.preload = 'auto'
    hoverSfx.current.preload = 'auto'
    clickSfx.current.preload = 'auto'
    hoverSfx.current.volume = 0.6
    clickSfx.current.volume = 0.8

    const steps = new Audio('/sfx/voetstappen.mp3')
    steps.loop = true
    steps.volume = 0.5
    steps.preload = 'auto'
    stepsSfx.current = steps

    const start = () => steps.play().catch(() => {})
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

  function playUiSfx(audioRef) {
    const src = audioRef.current
    if (!src) return
    const a = src.cloneNode()
    a.volume = src.volume
    a.play().catch(() => {})
  }

  const toggles = { LippenGroot: lippen, BorstGroot: borst, Kont: kont }
  const setters = { LippenGroot: setLippen, BorstGroot: setBorst, Kont: setKont }

  function spawnPetals() {
    const overlay = petalsRef.current
    if (!overlay) return
    overlay.innerHTML = ''
    overlay.classList.add('active')
    const colors = ['#ffb8d8', '#ffd4e5', '#ff9fc8', '#ff88b5']
    for (let i = 0; i < 60; i++) {
      const p = document.createElement('div')
      p.className = 'petal-swirl'
      p.style.background = colors[Math.floor(Math.random() * colors.length)]
      p.style.left = Math.random() * 100 + '%'
      p.style.top = Math.random() * 100 + '%'
      p.style.setProperty('--dx', (Math.random() - 0.5) * 400 - 100 + 'px')
      p.style.setProperty('--rot', Math.random() * 720 + 360 + 'deg')
      p.style.animation = `petalFall ${1.5 + Math.random() * 1.5}s ease-in forwards`
      p.style.animationDelay = Math.random() * 0.8 + 's'
      overlay.appendChild(p)
    }
  }

  function spawnStars() {
    const overlay = starsRef.current
    if (!overlay) return
    overlay.innerHTML = ''
    overlay.classList.add('active')
    for (let i = 0; i < 50; i++) {
      const s = document.createElement('div')
      s.className = 'star-bloom'
      s.style.left = Math.random() * 100 + '%'
      s.style.top = Math.random() * 70 + '%'
      s.style.setProperty('--dx', (Math.random() - 0.5) * 300 - 80 + 'px')
      s.style.animation = `starFall ${2 + Math.random()}s ease-in forwards`
      s.style.animationDelay = Math.random() * 0.8 + 's'
      overlay.appendChild(s)
    }
  }

  function clearOverlay(kind) {
    if (kind === 'petals' && petalsRef.current) {
      petalsRef.current.classList.remove('active')
      petalsRef.current.innerHTML = ''
    } else if (kind === 'dusk' && duskRef.current) {
      duskRef.current.classList.remove('active')
    } else if (kind === 'stars' && starsRef.current) {
      starsRef.current.classList.remove('active')
      starsRef.current.innerHTML = ''
    }
  }

  function flashButton(key) {
    setFlashing(key)
    setTimeout(() => setFlashing((f) => (f === key ? null : f)), 1800)
  }

  function triggerButton(key) {
    if (busy.current) return
    busy.current = true

    playUiSfx(clickSfx)
    flashButton(key)

    const setter = setters[key]
    const willBe = !toggles[key]
    const withSfx = SFX_KEYS.has(key)
    const targetScene = SCENE_FOR_KEY[key]
    const sceneChange = targetScene !== currentScene

    let kind = null
    if (sceneChange) {
      if (targetScene === 0) kind = 'stars'      // -> sakura
      else if (targetScene === 1) kind = 'petals' // -> beach
      else kind = 'dusk'                          // -> night
    }

    if (kind === 'petals') spawnPetals()
    else if (kind === 'stars') spawnStars()
    else if (kind === 'dusk' && duskRef.current) duskRef.current.classList.add('active')

    const midDelay = kind ? SWAP_MID_MS : 0
    setTimeout(() => {
      if (withSfx) playSfx(willBe)
      setter((v) => !v)
      if (sceneChange) setCurrentScene(targetScene)
    }, midDelay)

    const total = kind ? TRANSITION_MS + 1000 : 200
    setTimeout(() => {
      if (kind) clearOverlay(kind)
      busy.current = false
    }, total)
  }

  return (
    <div className="container">
      {SCENE_SRCS.map((src, i) => (
        <div
          key={i}
          className={`scene ${i === currentScene ? 'active' : ''}`}
          aria-hidden="true"
        >
          <img className="scene-img" src={src} alt="" draggable="false" />
        </div>
      ))}

      <div className="puppet-layer">
        <PuppetScene toggles={toggles} water={{ active: false, height: 0 }} />
      </div>

      <SyringeLoader />

      <div ref={petalsRef} className="transition-overlay" />
      <div ref={duskRef} className="transition-overlay dusk-fade" />
      <div ref={starsRef} className="transition-overlay" />

      <div className="scene-label" aria-hidden="true">
        {SCENE_LABELS[currentScene]}
      </div>

      <div className="scene-btn-panel">
        <button
          className={`scene-btn scene-btn-1 ${currentScene === 0 ? 'active' : ''} ${flashing === 'LippenGroot' ? 'is-flashing' : ''}`}
          type="button"
          aria-label="Lippen"
          title="Sakura park"
          onMouseEnter={() => playUiSfx(hoverSfx)}
          onClick={() => triggerButton('LippenGroot')}
        >
          <span
            className="btn-icon"
            style={{ '--icon-url': "url('/LipsIcon.svg')" }}
          />
        </button>
        <button
          className={`scene-btn scene-btn-2 ${currentScene === 1 ? 'active' : ''} ${flashing === 'BorstGroot' ? 'is-flashing' : ''}`}
          type="button"
          aria-label="Borst"
          title="Strand"
          onMouseEnter={() => playUiSfx(hoverSfx)}
          onClick={() => triggerButton('BorstGroot')}
        >
          <span
            className="btn-icon"
            style={{ '--icon-url': "url('/BreastIcon.svg')" }}
          />
        </button>
        <button
          className={`scene-btn scene-btn-3 ${currentScene === 2 ? 'active' : ''} ${flashing === 'Kont' ? 'is-flashing' : ''}`}
          type="button"
          aria-label="Kont"
          title="Nacht"
          onMouseEnter={() => playUiSfx(hoverSfx)}
          onClick={() => triggerButton('Kont')}
        >
          <span
            className="btn-icon"
            style={{ '--icon-url': "url('/ButtIcon.svg')" }}
          />
        </button>
      </div>
    </div>
  )
}
