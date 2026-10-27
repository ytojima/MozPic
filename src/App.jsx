import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faDice, faLock, faLockOpen, faRotateLeft, faPlay, faPause, faSeedling, faCloudArrowUp, faDownload,
  faWandMagicSparkles, faPalette, faSliders, faBookmark, faXmark, faShapes, faFillDrip, faCircleHalfStroke,
  faFilm, faCircleDot, faArrowsRotate, faClone, faChevronDown, faMoon, faSun, faShieldHalved,
} from '@fortawesome/free-solid-svg-icons'
import { renderMosaic } from './mosaic'
import { PALETTES, getPaletteColors } from './palettes'
import {
  ANIMATIONS, ANIM_LOOP, BG_SWATCHES, DEFAULTS, EMOJI_SETS, PATTERNS, PATTERN_HINTS, PRESETS, SHAPE_PATTERNS, STILL_PATTERNS, randomOpts,
} from './config'
import { makeSampleImage } from './sample'
import LiquidTabs from './LiquidTabs'
import { startAmbient } from './ambient'
import './App.css'

const FAV_KEY = 'mozpic:favs'
const loadFavs = () => {
  try { return JSON.parse(localStorage.getItem(FAV_KEY)) || [] } catch { return [] }
}
const saveFavs = (favs) => {
  try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)) } catch { /* storage unavailable */ }
}
const THEME_KEY = 'mozpic:theme'
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
// Explicit choice wins; otherwise follow the OS
const readTheme = () => {
  try { return localStorage.getItem(THEME_KEY) } catch { return null }
}

const pct = (v) => `${Math.round(v * 100)}%`
const rgbCss = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`

const TABS = [
  { id: 'pattern', icon: faShapes, name: 'パターン' },
  { id: 'anim', icon: faFilm, name: '動き' },
  { id: 'color', icon: faPalette, name: 'いろ' },
  { id: 'tune', icon: faSliders, name: '調整' },
  { id: 'preset', icon: faWandMagicSparkles, name: 'おすすめ' },
]

function Slider({ label, value, min, max, step = 1, onChange, fmt = (v) => v }) {
  return (
    <label className="slider">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <b>{fmt(value)}</b>
    </label>
  )
}

function Toggle({ label, icon, checked, onChange }) {
  return (
    <button className={`chip ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}>
      {icon && <FontAwesomeIcon icon={icon} />} {label}
    </button>
  )
}

// Advanced settings stay folded so each tab shows only the essentials first
function More({ children }) {
  return (
    <details className="more">
      <summary>もっと細かく <FontAwesomeIcon icon={faChevronDown} /></summary>
      {children}
    </details>
  )
}

export default function App() {
  const [image, setImage] = useState(null)
  const [opts, setOpts] = useState(DEFAULTS)
  const [history, setHistory] = useState([])
  const [locks, setLocks] = useState({ pattern: false, palette: false })
  const [rolling, setRolling] = useState(false)
  const [autoPlay, setAutoPlay] = useState(false)
  const [peek, setPeek] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [favs, setFavs] = useState(loadFavs)
  const [playing, setPlaying] = useState(true)
  const [recProgress, setRecProgress] = useState(null)
  const [notice, setNotice] = useState('')
  const [tab, setTab] = useState('pattern')
  const [themeChoice, setThemeChoice] = useState(readTheme)
  const [systemDark, setSystemDark] = useState(darkQuery.matches)
  const theme = themeChoice || (systemDark ? 'dark' : 'light')
  const animT = useRef(0)
  const canvasRef = useRef(null)
  const ambientRef = useRef(null)
  const ambientCtl = useRef(null)
  const fileRef = useRef(null)
  const rollTimer = useRef(null)
  const optsRef = useRef(opts)
  const locksRef = useRef(locks)
  optsRef.current = opts
  locksRef.current = locks

  useEffect(() => setImage(makeSampleImage()), [])

  useEffect(() => {
    const onChange = (e) => setSystemDark(e.matches)
    darkQuery.addEventListener('change', onChange)
    return () => darkQuery.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setThemeChoice(next)
    try { localStorage.setItem(THEME_KEY, next) } catch { /* storage unavailable */ }
  }

  // Flowing blurred copy of the mosaic behind the page, so the glass surfaces pick up its colors
  useEffect(() => {
    const ctl = startAmbient(ambientRef.current, {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    })
    if (!ctl.canFilter) document.documentElement.classList.add('ambient-css-blur')
    ambientCtl.current = ctl
    return () => ctl.stop()
  }, [])
  const updateAmbient = useCallback(() => ambientCtl.current?.setSource(canvasRef.current), [])

  useEffect(() => {
    // SVG refraction inside backdrop-filter only renders in Chromium; others keep plain frosted glass
    if (navigator.userAgentData?.brands?.some((b) => b.brand === 'Chromium')) document.documentElement.classList.add('refract')
    // Specular light follows the pointer across every glass surface
    let raf = 0
    const onMove = (e) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--mx', `${e.clientX}px`)
        document.documentElement.style.setProperty('--my', `${e.clientY}px`)
      })
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  const src = useMemo(() => {
    if (!image) return null
    const { el } = image
    const w0 = el.naturalWidth || el.width, h0 = el.naturalHeight || el.height
    const k = opts.outSize / Math.max(w0, h0)
    const cv = document.createElement('canvas')
    cv.width = Math.max(1, Math.round(w0 * k))
    cv.height = Math.max(1, Math.round(h0 * k))
    const ctx = cv.getContext('2d', { willReadFrequently: true })
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(el, 0, 0, cv.width, cv.height)
    return ctx.getImageData(0, 0, cv.width, cv.height)
  }, [image, opts.outSize])

  const animating = opts.anim !== 'none'

  useEffect(() => {
    if (!src || !canvasRef.current || animating) return
    const id = requestAnimationFrame(() => {
      renderMosaic(canvasRef.current, src, opts)
      updateAmbient()
    })
    return () => cancelAnimationFrame(id)
  }, [src, opts, animating, updateAmbient])

  // Animation loop: reads the latest opts from the ref so slider changes apply live
  useEffect(() => {
    if (!src || !canvasRef.current || !animating) return
    if (!playing) {
      renderMosaic(canvasRef.current, src, opts, animT.current)
      updateAmbient()
      return
    }
    let raf, last = performance.now(), lastAmbient = 0
    const loop = (now) => {
      animT.current += ((now - last) / 1000) * optsRef.current.animSpeed
      last = now
      renderMosaic(canvasRef.current, src, optsRef.current, animT.current)
      if (now - lastAmbient > 500) {
        updateAmbient()
        lastAmbient = now
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [src, animating, playing, playing ? null : opts]) // eslint-disable-line react-hooks/exhaustive-deps

  const pickAnim = (id) => {
    animT.current = 0
    setPlaying(true)
    set('anim', id)
  }

  // Records exactly one loop so the video repeats seamlessly
  const recordVideo = () => {
    if (recProgress !== null || !animating) return
    const mime = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'].find((m) => window.MediaRecorder?.isTypeSupported(m))
    if (!mime) {
      setNotice('このブラウザは動画の保存に対応していません')
      return
    }
    const rec = new MediaRecorder(canvasRef.current.captureStream(30), { mimeType: mime, videoBitsPerSecond: 8_000_000 })
    const chunks = []
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    rec.onstop = () => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob(chunks, { type: mime }))
      a.download = `mozpic-${optsRef.current.pattern}-${optsRef.current.anim}.${mime.includes('mp4') ? 'mp4' : 'webm'}`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
      setRecProgress(null)
    }
    animT.current = 0
    setPlaying(true)
    rec.start()
    const duration = (ANIM_LOOP / optsRef.current.animSpeed) * 1000
    const started = performance.now()
    setRecProgress(0)
    const timer = setInterval(() => {
      const p = (performance.now() - started) / duration
      if (p >= 1) {
        clearInterval(timer)
        rec.stop()
      } else setRecProgress(p)
    }, 100)
  }

  const set = (key, value) => setOpts((o) => ({ ...o, [key]: value }))

  // Changes that should be undoable go through commit()
  const commit = useCallback((fn) => {
    const cur = optsRef.current
    setHistory((h) => [...h.slice(-40), cur])
    const next = fn(cur)
    optsRef.current = next
    setOpts(next)
  }, [])

  const gacha = useCallback(() => {
    if (rollTimer.current) return
    setRolling(true)
    const start = optsRef.current
    setHistory((h) => [...h.slice(-40), start])
    let n = 0
    const tick = () => {
      const next = randomOpts(optsRef.current, locksRef.current)
      optsRef.current = next
      setOpts(next)
      if (++n < 7) rollTimer.current = setTimeout(tick, 60 + n * 25)
      else {
        rollTimer.current = null
        setRolling(false)
      }
    }
    tick()
  }, [])

  const historyRef = useRef(history)
  historyRef.current = history
  const undo = useCallback(() => {
    const h = historyRef.current
    if (!h.length) return
    optsRef.current = h[h.length - 1]
    setOpts(h[h.length - 1])
    setHistory(h.slice(0, -1))
  }, [])

  const reseed = () => commit((o) => ({ ...o, seed: Math.floor(Math.random() * 1e8) }))
  const reseedRef = useRef(reseed)
  reseedRef.current = reseed

  useEffect(() => {
    if (!autoPlay) return
    const id = setInterval(gacha, 2200)
    return () => clearInterval(id)
  }, [autoPlay, gacha])

  const loadFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => setImage({ el: img, url, name: file.name })
    img.src = url
  }, [])

  useEffect(() => {
    const onPaste = (e) => {
      const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'))
      if (item) loadFile(item.getAsFile())
    }
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === 'r') gacha()
      else if (k === 'z') undo()
      else if (k === 's') reseedRef.current()
      else if (k === 'p') setPlaying((v) => !v)
    }
    window.addEventListener('paste', onPaste)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('paste', onPaste)
      window.removeEventListener('keydown', onKey)
    }
  }, [gacha, undo, loadFile])

  const download = () => {
    canvasRef.current.toBlob((blob) => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `mozpic-${opts.pattern}-${opts.seed}.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    })
  }

  const addFav = () => {
    const main = canvasRef.current
    const tw = 112, th = Math.round((main.height / main.width) * tw)
    const cv = document.createElement('canvas')
    cv.width = tw
    cv.height = th
    cv.getContext('2d').drawImage(main, 0, 0, tw, th)
    const next = [{ id: Date.now(), opts, thumb: cv.toDataURL('image/jpeg', 0.7) }, ...favs].slice(0, 12)
    setFavs(next)
    saveFavs(next)
  }
  const removeFav = (id) => {
    const next = favs.filter((f) => f.id !== id)
    setFavs(next)
    saveFavs(next)
  }

  const p = opts.pattern
  const isShape = SHAPE_PATTERNS.includes(p)
  const randomPal = getPaletteColors('random', opts.seed)

  const applyPreset = (pr) =>
    commit((o) => ({ ...DEFAULTS, seed: o.seed, outSize: o.outSize, text: o.text, anim: o.anim, animSpeed: o.animSpeed, ...pr.opts }))

  return (
    <div
      className="app"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={(e) => { if (!e.relatedTarget) setDragOver(false) }}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); loadFile(e.dataTransfer.files[0]) }}
    >
      <canvas ref={ambientRef} className="ambient" aria-hidden="true" />
      <div className="ambient-veil" aria-hidden="true" />
      <svg className="svg-defs" aria-hidden="true">
        <filter id="lg-refract" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.006 0.01" numOctaves="2" seed="5" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="3" result="soft" />
          <feDisplacementMap in="SourceGraphic" in2="soft" scale="36" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <header className="topbar">
        <div className="logo">
          <span className="logo-tiles"><i /><i /><i /><i /></span>
          MozPic
        </div>
        <button
          className="btn ghost theme-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'ライトモードにする' : 'ダークモードにする'}
          title={theme === 'dark' ? 'ライトモード' : 'ダークモード'}
        >
          <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} />
        </button>
        <button className="btn ghost" onClick={() => fileRef.current.click()}>
          <FontAwesomeIcon icon={faCloudArrowUp} /> 画像
        </button>
        <button className="btn" onClick={download}>
          <FontAwesomeIcon icon={faDownload} /> 保存
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => loadFile(e.target.files[0])} />
      </header>

      <details className="privacy">
        <summary>
          <FontAwesomeIcon icon={faShieldHalved} className="shield" />
          <strong>画像はサーバに送信・保存されません</strong>
          <span className="privacy-more">しくみ <FontAwesomeIcon icon={faChevronDown} /></span>
        </summary>
        <ul>
          <li>画像の読み込み・モザイク処理・動画の書き出しは、すべてこの端末のブラウザの中で行います。</li>
          <li>画像や設定を外部へ送る通信は一切ありません。ブラウザのセキュリティ設定（CSP）で、外部への通信そのものを禁止しています。</li>
          <li>アクセス解析・広告・Cookie は使っていません。</li>
          <li>お気に入りとテーマの設定だけは、このブラウザの中（localStorage）に保存されます。外部には送られず、お気に入りは「おすすめ」タブからいつでも削除できます。</li>
          <li>ページを開いたときは、ホスティング先（GitHub Pages）に一般的なアクセスログが残る場合があります。画像の中身が送られることはありません。</li>
        </ul>
      </details>

      <main className="layout">
        <div className="stage-col">
          <div
            className={`stage ${rolling ? 'rolling' : ''}`}
            onPointerDown={() => setPeek(true)}
            onPointerUp={() => setPeek(false)}
            onPointerLeave={() => setPeek(false)}
            onContextMenu={(e) => e.preventDefault()}
          >
            <canvas ref={canvasRef} />
            {peek && image && <img className="original" src={image.url} alt="元画像" />}
          </div>
          <p className="caption">長押しで元の画像 ・ ドロップや貼り付けでも読み込めます</p>

          <div className="actions">
            <button className="icon-btn" onClick={undo} disabled={!history.length} aria-label="戻す" title="戻す (Z)">
              <FontAwesomeIcon icon={faRotateLeft} />
            </button>
            <button className={`gacha ${rolling ? 'spin' : ''}`} onClick={gacha} title="おまかせガチャ (R)">
              <FontAwesomeIcon icon={faDice} className="dice" /> おまかせガチャ
            </button>
            {animating && (
              <button className="icon-btn" onClick={() => setPlaying((v) => !v)} aria-label={playing ? '停止' : '再生'} title="再生/停止 (P)">
                <FontAwesomeIcon icon={playing ? faPause : faPlay} />
              </button>
            )}
          </div>
        </div>

        <div className="controls">
          <LiquidTabs tabs={TABS} value={tab} onChange={setTab} />

          <div className="panel">
            {tab === 'pattern' && (
              <>
                <div className="grid">
                  {PATTERNS.map((pt) => (
                    <button
                      key={pt.id}
                      className={`tile ${p === pt.id ? 'on' : ''}`}
                      onClick={() => commit((o) => ({ ...o, pattern: pt.id, ...(PATTERN_HINTS[pt.id] || {}) }))}
                    >
                      <FontAwesomeIcon icon={pt.icon} rotation={pt.rotate} />
                      <span>{pt.name}</span>
                    </button>
                  ))}
                </div>
                {p === 'ascii' && (
                  <div className="row">
                    <div className="seg">
                      <button className={opts.asciiMode === 'ramp' ? 'on' : ''} onClick={() => set('asciiMode', 'ramp')}>記号</button>
                      <button className={opts.asciiMode === 'text' ? 'on' : ''} onClick={() => set('asciiMode', 'text')}>好きな文字</button>
                    </div>
                    {opts.asciiMode === 'text' && (
                      <input className="text-input" value={opts.text} maxLength={40} onChange={(e) => set('text', e.target.value)} placeholder="例: すき" />
                    )}
                    <Toggle label="カラー" checked={opts.asciiColor} onChange={(v) => set('asciiColor', v)} />
                  </div>
                )}
                {p === 'emoji' && (
                  <div className="row">
                    <div className="seg wrap">
                      {EMOJI_SETS.map((es) => (
                        <button key={es.id} className={opts.emojiSet === es.id ? 'on' : ''} onClick={() => set('emojiSet', es.id)}>
                          <FontAwesomeIcon icon={es.icons[0]} /> {es.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {p === 'halftone' && (
                  <div className="row"><Toggle icon={faFillDrip} label="インク1色" checked={opts.halftoneInk} onChange={(v) => set('halftoneInk', v)} /></div>
                )}
              </>
            )}

            {tab === 'anim' && (
              <>
                <div className="grid">
                  {ANIMATIONS.map((an) => (
                    <button
                      key={an.id}
                      className={`tile ${opts.anim === an.id ? 'on' : ''}`}
                      disabled={an.tileOnly && STILL_PATTERNS.includes(p)}
                      onClick={() => pickAnim(an.id)}
                    >
                      <FontAwesomeIcon icon={an.icon} className={opts.anim === an.id && playing && an.id !== 'none' ? 'bounce' : ''} />
                      <span>{an.name}</span>
                    </button>
                  ))}
                </div>
                {animating && (
                  <>
                    <Slider label="スピード" value={opts.animSpeed} min={0.25} max={3} step={0.25} onChange={(v) => set('animSpeed', v)} fmt={(v) => `×${v}`} />
                    <button className={`rec ${recProgress !== null ? 'on' : ''}`} onClick={recordVideo} disabled={recProgress !== null}>
                      <FontAwesomeIcon icon={faCircleDot} />
                      {recProgress !== null ? ` 録画中… ${Math.round(recProgress * 100)}%` : ' 動画で保存'}
                      {recProgress !== null && <i style={{ width: `${recProgress * 100}%` }} />}
                    </button>
                  </>
                )}
                {notice && <p className="note">{notice}</p>}
              </>
            )}

            {tab === 'color' && (
              <>
                <div className="palettes">
                  {PALETTES.map((pl) => {
                    const cols = pl.id === 'random' ? randomPal.map(rgbCss) : pl.colors
                    return (
                      <button key={pl.id} className={`palette ${opts.palette === pl.id ? 'on' : ''}`} onClick={() => commit((o) => ({ ...o, palette: pl.id }))}>
                        <span className="strip">
                          {cols ? cols.map((c, i) => <i key={i} style={{ background: c }} />) : <i className="rainbow" />}
                        </span>
                        <span className="pname">{pl.name}</span>
                      </button>
                    )
                  })}
                </div>
                {opts.palette !== 'original' && (
                  <div className="seg">
                    <button className={opts.paletteMode === 'nearest' ? 'on' : ''} onClick={() => set('paletteMode', 'nearest')}>近い色</button>
                    <button className={opts.paletteMode === 'luma' ? 'on' : ''} onClick={() => set('paletteMode', 'luma')}>明るさ順</button>
                  </div>
                )}
                <div className="bg-row">
                  <span>背景</span>
                  {BG_SWATCHES.map((c) => (
                    <button key={c} className={`swatch ${opts.bgColor === c ? 'on' : ''}`} style={{ background: c }} onClick={() => set('bgColor', c)} aria-label={c} />
                  ))}
                  <input type="color" value={opts.bgColor} onChange={(e) => set('bgColor', e.target.value)} aria-label="背景色を選ぶ" />
                </div>
                <More>
                  <Slider label="彩度" value={opts.saturation} min={0} max={2.5} step={0.05} onChange={(v) => set('saturation', v)} fmt={pct} />
                  <Slider label="明るさ" value={opts.brightness} min={-0.5} max={0.5} step={0.02} onChange={(v) => set('brightness', v)} fmt={(v) => (v > 0 ? `+${pct(v)}` : pct(v))} />
                  <Slider label="色数" value={opts.posterize} min={0} max={8} onChange={(v) => set('posterize', v < 2 ? 0 : v)} fmt={(v) => (v < 2 ? 'なし' : `${v}段`)} />
                </More>
              </>
            )}

            {tab === 'tune' && (
              <>
                <Slider label="大きさ" value={opts.tileSize} min={4} max={80} onChange={(v) => set('tileSize', v)} fmt={(v) => `${v}px`} />
                {p !== 'strokes' && p !== 'halftone' && p !== 'emoji' && p !== 'ascii' && (
                  <Slider label={p === 'voronoi' ? '線の太さ' : 'すきま'} value={opts.gap} min={0} max={12} onChange={(v) => set('gap', v)} fmt={(v) => `${v}px`} />
                )}
                {(isShape || p === 'voronoi' || p === 'strokes') && (
                  <div className="row">
                    <Toggle icon={faCircleHalfStroke} label="ぷっくり" checked={opts.bevel} onChange={(v) => set('bevel', v)} />
                    {isShape && <Toggle icon={faClone} label="影" checked={opts.shadow} onChange={(v) => set('shadow', v)} />}
                  </div>
                )}
                <More>
                  {(p === 'square' || p === 'mix') && (
                    <Slider label="角の丸み" value={opts.cornerRadius} min={0} max={1} step={0.05} onChange={(v) => set('cornerRadius', v)} fmt={pct} />
                  )}
                  {p !== 'strokes' && <Slider label="ずれ" value={opts.jitter} min={0} max={1} step={0.05} onChange={(v) => set('jitter', v)} fmt={pct} />}
                  {p !== 'voronoi' && (
                    <>
                      <Slider label="大小" value={opts.sizeVar} min={0} max={1} step={0.05} onChange={(v) => set('sizeVar', v)} fmt={pct} />
                      <Slider label="回転" value={opts.rotation} min={0} max={1} step={0.05} onChange={(v) => set('rotation', v)} fmt={(v) => `±${Math.round(v * 180)}°`} />
                    </>
                  )}
                  <Slider label="色ゆらぎ" value={opts.colorNoise} min={0} max={1} step={0.05} onChange={(v) => set('colorNoise', v)} fmt={pct} />
                  <Slider label="グリッチ" value={opts.glitch} min={0} max={1} step={0.05} onChange={(v) => set('glitch', v)} fmt={(v) => (v ? pct(v) : 'オフ')} />
                  <label className="select">
                    <span>出力サイズ</span>
                    <select value={opts.outSize} onChange={(e) => set('outSize', Number(e.target.value))}>
                      {[800, 1200, 1600, 2400].map((s) => <option key={s} value={s}>{s}px</option>)}
                    </select>
                  </label>
                  <div className="row">
                    <button className="chip" onClick={reseed}><FontAwesomeIcon icon={faSeedling} /> ゆらぎを振り直す</button>
                  </div>
                  <p className="label">ガチャの設定</p>
                  <div className="row">
                    <Toggle icon={locks.pattern ? faLock : faLockOpen} label="パターン固定" checked={locks.pattern} onChange={(v) => setLocks((l) => ({ ...l, pattern: v }))} />
                    <Toggle icon={locks.palette ? faLock : faLockOpen} label="色固定" checked={locks.palette} onChange={(v) => setLocks((l) => ({ ...l, palette: v }))} />
                    <Toggle icon={faArrowsRotate} label="自動で回す" checked={autoPlay} onChange={setAutoPlay} />
                  </div>
                </More>
              </>
            )}

            {tab === 'preset' && (
              <>
                <div className="row">
                  {PRESETS.map((pr) => (
                    <button key={pr.name} className="chip" onClick={() => applyPreset(pr)}>
                      <FontAwesomeIcon icon={pr.icon} /> {pr.name}
                    </button>
                  ))}
                </div>
                <p className="label">
                  お気に入り
                  <button className="link" onClick={addFav}><FontAwesomeIcon icon={faBookmark} /> いまの設定を保存</button>
                </p>
                {favs.length === 0 ? (
                  <p className="note">気に入った組み合わせを保存しておけます</p>
                ) : (
                  <div className="favs">
                    {favs.map((f) => (
                      <div key={f.id} className="fav">
                        <button onClick={() => commit((o) => ({ ...DEFAULTS, ...f.opts, outSize: o.outSize }))}>
                          <img src={f.thumb} alt="" />
                        </button>
                        <button className="fav-x" onClick={() => removeFav(f.id)} aria-label="削除"><FontAwesomeIcon icon={faXmark} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {dragOver && (
        <div className="drop-overlay">
          <FontAwesomeIcon icon={faCloudArrowUp} />
          <p>ここにドロップ</p>
          <small><FontAwesomeIcon icon={faShieldHalved} /> 画像は端末の外に送信されません</small>
        </div>
      )}
    </div>
  )
}
