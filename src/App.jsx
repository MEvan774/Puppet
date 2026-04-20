import { useState } from 'react'
import PuppetScene from './PuppetScene'
import './App.css'

function App() {
  const [lippen, setLippen] = useState(false)
  const [borst, setBorst] = useState(false)
  const [kont, setKont] = useState(false)

  const toggles = {
    LippenGroot: lippen,
    BorstGroot: borst,
    Kont: kont,
  }

  return (
    <main id="center">
      <div className="stage">
        <div className="canvas-wrap">
          <PuppetScene toggles={toggles} />
        </div>

        <button
          className={`puppet-btn btn-top-right ${lippen ? 'is-on' : ''}`}
          type="button"
          onClick={() => setLippen((v) => !v)}
        >
          Lippen
        </button>
        <button
          className={`puppet-btn btn-middle-right ${borst ? 'is-on' : ''}`}
          type="button"
          onClick={() => setBorst((v) => !v)}
        >
          Borst
        </button>
        <button
          className={`puppet-btn btn-left ${kont ? 'is-on' : ''}`}
          type="button"
          onClick={() => setKont((v) => !v)}
        >
          Kont
        </button>
      </div>
    </main>
  )
}

export default App
