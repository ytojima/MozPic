import { useLayoutEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

// Tab bar whose selection indicator flows like water: the leading edge rushes ahead,
// the trailing edge catches up, droplets trail behind and merge back (SVG goo filter),
// and the blob wobbles + ripples when it lands.
export default function LiquidTabs({ tabs, value, onChange }) {
  const navRef = useRef(null)
  const btnRefs = useRef({})
  const prevIdx = useRef(-1)
  const [pos, setPos] = useState(null)

  const measure = (animate) => {
    const nav = navRef.current
    const btn = btnRefs.current[value]
    if (!nav || !btn) return
    const idx = tabs.findIndex((t) => t.id === value)
    const dir = animate && prevIdx.current >= 0 ? Math.sign(idx - prevIdx.current) : 0
    prevIdx.current = idx
    setPos({ l: btn.offsetLeft, r: nav.clientWidth - btn.offsetLeft - btn.offsetWidth, w: btn.offsetWidth, dir })
  }

  useLayoutEffect(() => measure(true), [value]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-measure without animation when the bar changes width
  useLayoutEffect(() => {
    let lastW = navRef.current.clientWidth
    const ro = new ResizeObserver(() => {
      const w = navRef.current.clientWidth
      if (w !== lastW) {
        lastW = w
        measure(false)
      }
    })
    ro.observe(navRef.current)
    return () => ro.disconnect()
  }) // eslint-disable-line react-hooks/exhaustive-deps

  const lead = '0.32s cubic-bezier(0.3, 1.2, 0.5, 1)'
  const trail = '0.55s cubic-bezier(0.65, 0, 0.25, 1) 0.06s'
  const blobTransition =
    !pos || pos.dir === 0 ? 'none' : pos.dir > 0 ? `right ${lead}, left ${trail}` : `left ${lead}, right ${trail}`
  const center = pos ? pos.l + pos.w / 2 : 0

  return (
    <nav className="tabs" ref={navRef}>
      <svg className="goo-defs" aria-hidden="true">
        <filter id="goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="goo" />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </svg>

      {pos && (
        <div className="liquid" aria-hidden="true">
          <div className="blob" style={{ left: pos.l, right: pos.r, transition: blobTransition }}>
            <div className="blob-inner" key={value} />
          </div>
          {[
            { size: 20, dur: 0.72 },
            { size: 16, dur: 0.8 },
          ].map((d, i) => (
            <span
              key={i}
              className="drop"
              style={{
                width: d.size,
                height: d.size,
                left: center - d.size / 2,
                transition: pos.dir === 0 ? 'none' : `left ${d.dur}s cubic-bezier(0.7, 0, 0.3, 1) ${0.05 * i}s`,
              }}
            />
          ))}
        </div>
      )}

      {tabs.map((t) => (
        <button key={t.id} ref={(el) => (btnRefs.current[t.id] = el)} className={value === t.id ? 'on' : ''} onClick={() => onChange(t.id)}>
          <FontAwesomeIcon icon={t.icon} />
          <span>{t.name}</span>
        </button>
      ))}
    </nav>
  )
}
