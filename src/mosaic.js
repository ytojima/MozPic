import { getPaletteColors, hexToRgb } from './palettes'
import { ANIM_LOOP, EMOJI_SETS, STILL_PATTERNS } from './config'

const TAU = Math.PI * 2
const SQRT3 = Math.sqrt(3)
const ASCII_RAMP = ' .:-=+*#%@'
const MIX_SHAPES = ['square', 'circle', 'hex', 'triangle', 'diamond', 'heart', 'star']

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const luma = (c) => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255
const css = (c, k = 1) =>
  `rgb(${Math.min(255, c[0] * k) | 0},${Math.min(255, c[1] * k) | 0},${Math.min(255, c[2] * k) | 0})`

export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Stable per-tile random value (independent of the seeded rng sequence)
function hash01(i) {
  let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b)
  x ^= x >>> 13
  x = Math.imul(x, 0xc2b2ae35)
  x ^= x >>> 16
  return (x >>> 0) / 4294967296
}

const easeOutBack = (p) => 1 + 2.7 * Math.pow(p - 1, 3) + 1.7 * Math.pow(p - 1, 2)
const easeIn = (p) => p * p

function hueRotate([r, g, b], deg) {
  const a = (deg * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a)
  return [
    clamp(r * (0.213 + cos * 0.787 - sin * 0.213) + g * (0.715 - cos * 0.715 - sin * 0.715) + b * (0.072 - cos * 0.072 + sin * 0.928), 0, 255),
    clamp(r * (0.213 - cos * 0.213 + sin * 0.143) + g * (0.715 + cos * 0.285 + sin * 0.14) + b * (0.072 - cos * 0.072 - sin * 0.283), 0, 255),
    clamp(r * (0.213 - cos * 0.213 - sin * 0.787) + g * (0.715 - cos * 0.715 + sin * 0.715) + b * (0.072 + cos * 0.928 + sin * 0.072), 0, 255),
  ]
}

// Shared "appear → hold → disappear" timeline used by the pop animation
function popScale(p, delay) {
  const appear = easeOutBack(clamp((p - 0.05 - delay * 0.35) / 0.12, 0, 1))
  const vanish = easeIn(clamp((p - 0.85 - delay * 0.07) / 0.06, 0, 1))
  return Math.max(0, appear * (1 - vanish))
}

// Per-tile motion for time t (seconds). nd = normalized distance from center.
function tileMotion(mode, t, tile, nd, W, s) {
  const m = { dx: 0, dy: 0, scale: 1, rot: 0, light: 1, hue: 0 }
  const ph = hash01(tile.i)
  switch (mode) {
    case 'pop':
      m.scale = popScale((t % ANIM_LOOP) / ANIM_LOOP, nd * 0.7 + ph * 0.3)
      break
    case 'wave': {
      const a = (tile.x / W) * TAU * 2 - t * Math.PI
      m.dy = Math.sin(a) * s * 0.35
      m.scale = 1 + 0.12 * Math.cos(a)
      break
    }
    case 'ripple': {
      const v = Math.sin(nd * TAU * 3 - t * Math.PI)
      m.scale = Math.max(0, 1 + 0.45 * v)
      m.light = 1 + 0.15 * v
      break
    }
    case 'twinkle': {
      const pulse = Math.pow(Math.max(0, Math.sin((t / ANIM_LOOP + ph) * TAU)), 12)
      m.light = 1 + 0.9 * pulse
      m.scale = 1 + 0.3 * pulse
      m.rot = pulse * 0.6
      break
    }
    case 'spin':
      m.rot = (t / ANIM_LOOP + nd) * TAU
      break
    case 'rainbow':
      m.hue = (t / ANIM_LOOP + nd) * 360
      break
  }
  return m
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Average color of a box centered at (cx, cy)
function makeSampler({ data, width, height }) {
  return (cx, cy, size) => {
    const half = size / 2
    const x0 = clamp(Math.floor(cx - half), 0, width - 1)
    const y0 = clamp(Math.floor(cy - half), 0, height - 1)
    const x1 = clamp(Math.ceil(cx + half), x0 + 1, width)
    const y1 = clamp(Math.ceil(cy + half), y0 + 1, height)
    const step = Math.max(1, Math.floor((x1 - x0) / 5))
    let r = 0, g = 0, b = 0, n = 0
    for (let y = y0; y < y1; y += step) {
      for (let x = x0; x < x1; x += step) {
        const i = (y * width + x) * 4
        r += data[i]; g += data[i + 1]; b += data[i + 2]; n++
      }
    }
    return [r / n, g / n, b / n]
  }
}

function makeColorizer(opts, rng) {
  const pal = getPaletteColors(opts.palette, opts.seed)
  const sorted = pal && [...pal].sort((a, b) => luma(a) - luma(b))
  const levels = opts.posterize > 1 ? opts.posterize - 1 : 0
  return ([r, g, b]) => {
    const L = 0.299 * r + 0.587 * g + 0.114 * b
    const br = opts.brightness * 160
    r = L + (r - L) * opts.saturation + br
    g = L + (g - L) * opts.saturation + br
    b = L + (b - L) * opts.saturation + br
    if (opts.colorNoise > 0) {
      const k = opts.colorNoise * 160
      r += (rng() - 0.5) * k
      g += (rng() - 0.5) * k
      b += (rng() - 0.5) * k
    }
    r = clamp(r, 0, 255); g = clamp(g, 0, 255); b = clamp(b, 0, 255)
    if (levels) {
      r = Math.round((r / 255) * levels) / levels * 255
      g = Math.round((g / 255) * levels) / levels * 255
      b = Math.round((b / 255) * levels) / levels * 255
    }
    if (!pal) return [r, g, b]
    if (opts.paletteMode === 'luma') {
      return sorted[Math.min(sorted.length - 1, Math.floor(luma([r, g, b]) * sorted.length))]
    }
    let best = pal[0], bd = Infinity
    for (const p of pal) {
      const dr = r - p[0], dg = g - p[1], db = b - p[2]
      const d = 0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db
      if (d < bd) { bd = d; best = p }
    }
    return best
  }
}

// Font Awesome icons as Path2D, sorted by how much of the cell they cover (like an ASCII ramp)
const iconCache = {}
function getIconRamp(setId) {
  if (iconCache[setId]) return iconCache[setId]
  const set = EMOJI_SETS.find((s) => s.id === setId) || EMOJI_SETS[0]
  const N = 32
  const cv = document.createElement('canvas')
  cv.width = cv.height = N
  const ctx = cv.getContext('2d', { willReadFrequently: true })
  const list = set.icons.map(({ icon: [w, h, , , d] }) => {
    const path = new Path2D(Array.isArray(d) ? d.join(' ') : d)
    const k = 1 / Math.max(w, h)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, N, N)
    ctx.setTransform(k * N, 0, 0, k * N, ((1 - w * k) * N) / 2, ((1 - h * k) * N) / 2)
    ctx.fill(path)
    const px = ctx.getImageData(0, 0, N, N).data
    let ink = 0
    for (let i = 3; i < px.length; i += 4) ink += px[i]
    return { path, w, h, k, cover: ink / (255 * N * N) }
  })
  list.sort((a, b) => a.cover - b.cover)
  iconCache[setId] = list
  return list
}

// ---------- Layouts: each tile has center (x,y), sample size, half-size r ----------

function layoutTiles(pattern, W, H, s, gap, rng) {
  const tiles = []
  let i = 0
  if (pattern === 'hex') {
    const rowH = (s * SQRT3) / 2
    for (let row = 0, y = 0; y < H + rowH; row++, y += rowH) {
      const off = row % 2 ? s / 2 : 0
      for (let x = off; x < W + s; x += s) tiles.push({ x, y, sz: s, r: (s - gap) / 2, shape: 'hex', i: i++ })
    }
  } else if (pattern === 'triangle') {
    const h = (s * SQRT3) / 2
    const scale = Math.max(0.1, (s - gap * 1.8) / s)
    for (let row = 0; row * h < H + h; row++) {
      for (let col = -1; col * (s / 2) < W + s; col++) {
        const down = (col + row) % 2 !== 0
        const x = col * (s / 2) + s / 2
        const y = row * h + (down ? h / 3 : (2 * h) / 3)
        tiles.push({ x, y, sz: s * 0.6, r: (s / 2) * scale, shape: 'triangle', down, i: i++ })
      }
    }
  } else if (pattern === 'diamond') {
    for (let row = 0, y = 0; y < H + s; row++, y += s / 2) {
      const off = row % 2 ? s / 2 : 0
      for (let x = off; x < W + s; x += s) tiles.push({ x, y, sz: s * 0.7, r: s / 2 - gap * 0.7, shape: 'diamond', i: i++ })
    }
  } else if (pattern === 'halftone') {
    for (let row = 0, y = s / 2; y < H + s; row++, y += s * 0.87) {
      const off = row % 2 ? s / 2 : 0
      for (let x = off; x < W + s; x += s) tiles.push({ x, y, sz: s, r: s / 2, i: i++ })
    }
  } else {
    for (let y = s / 2; y < H + s / 2; y += s) {
      for (let x = s / 2; x < W + s / 2; x += s) {
        const shape = pattern === 'mix' ? MIX_SHAPES[Math.floor(rng() * MIX_SHAPES.length)] : pattern
        tiles.push({ x, y, sz: s, r: (s - gap) / 2, shape, i: i++ })
      }
    }
  }
  return tiles
}

function pathShape(ctx, shape, r, opts, tile) {
  ctx.beginPath()
  switch (shape) {
    case 'circle':
      ctx.arc(0, 0, r, 0, TAU)
      break
    case 'hex': {
      const R = (r * 2) / SQRT3
      for (let k = 0; k < 6; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 3
        ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R)
      }
      break
    }
    case 'triangle': {
      const h = r * SQRT3
      const f = tile.down ? -1 : 1
      ctx.moveTo(-r, (f * h) / 3)
      ctx.lineTo(r, (f * h) / 3)
      ctx.lineTo(0, (-f * 2 * h) / 3)
      break
    }
    case 'diamond':
      ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0)
      break
    case 'heart':
      ctx.moveTo(0, r * 0.9)
      ctx.bezierCurveTo(-r * 1.25, r * 0.05, -r * 0.95, -r * 1.0, 0, -r * 0.42)
      ctx.bezierCurveTo(r * 0.95, -r * 1.0, r * 1.25, r * 0.05, 0, r * 0.9)
      break
    case 'star':
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5
        const rr = k % 2 ? r * 0.45 : r * 1.05
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
      }
      break
    default: {
      const rad = r * (opts.cornerRadius || 0)
      if (rad > 0.5 && ctx.roundRect) ctx.roundRect(-r, -r, r * 2, r * 2, rad)
      else ctx.rect(-r, -r, r * 2, r * 2)
    }
  }
  ctx.closePath()
}

// ---------- Tile drawers (called with ctx translated to tile center) ----------

// Gradients are in tile-local coords, so one per (half-pixel) radius can be reused across tiles and frames
const gradCache = new WeakMap()
function bevelGradient(ctx, r) {
  let byR = gradCache.get(ctx)
  if (!byR) gradCache.set(ctx, (byR = new Map()))
  const key = Math.round(r * 2)
  let g = byR.get(key)
  if (!g) {
    const rr = key / 2
    g = ctx.createRadialGradient(-rr * 0.35, -rr * 0.4, 0, 0, 0, rr * 1.2)
    g.addColorStop(0, 'rgba(255,255,255,0.55)')
    g.addColorStop(0.45, 'rgba(255,255,255,0)')
    g.addColorStop(1, 'rgba(0,0,0,0.3)')
    byR.set(key, g)
  }
  return g
}

function drawShapeTile(ctx, t, c, scale, opts) {
  const r = Math.max(0.5, t.r * scale)
  if (opts.shadow) {
    ctx.translate(r * 0.2, r * 0.2)
    pathShape(ctx, t.shape, r, opts, t)
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fill()
    ctx.translate(-r * 0.2, -r * 0.2)
  }
  pathShape(ctx, t.shape, r, opts, t)
  ctx.fillStyle = css(c)
  ctx.fill()
  if (opts.bevel) {
    ctx.fillStyle = bevelGradient(ctx, r)
    ctx.fill()
  }
}

function drawLego(ctx, t, c, scale) {
  const r = (t.sz / 2) * scale
  const lw = Math.max(1, t.sz * 0.07)
  ctx.fillStyle = css(c)
  ctx.fillRect(-r, -r, r * 2, r * 2)
  ctx.lineWidth = lw
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.beginPath(); ctx.moveTo(-r, r); ctx.lineTo(-r, -r); ctx.lineTo(r, -r); ctx.stroke()
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'
  ctx.beginPath(); ctx.moveTo(r, -r); ctx.lineTo(r, r); ctx.lineTo(-r, r); ctx.stroke()
  const sr = r * 0.6
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath(); ctx.arc(r * 0.1, r * 0.12, sr, 0, TAU); ctx.fill()
  ctx.fillStyle = css(c, 1.06)
  ctx.beginPath(); ctx.arc(0, 0, sr, 0, TAU); ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.lineWidth = Math.max(1, sr * 0.18)
  ctx.beginPath(); ctx.arc(0, 0, sr * 0.72, Math.PI * 1.05, Math.PI * 1.45); ctx.stroke()
}

function drawStitch(ctx, t, c, scale) {
  const s = t.sz * scale
  const d = s * 0.32
  ctx.lineCap = 'round'
  ctx.lineWidth = s * 0.26
  ctx.strokeStyle = css(c, 0.75)
  ctx.beginPath(); ctx.moveTo(-d, -d); ctx.lineTo(d, d); ctx.stroke()
  ctx.strokeStyle = css(c)
  ctx.beginPath(); ctx.moveTo(d, -d); ctx.lineTo(-d, d); ctx.stroke()
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'
  ctx.lineWidth = s * 0.07
  ctx.beginPath(); ctx.moveTo(d * 0.75, -d * 0.95); ctx.lineTo(-d * 0.95, d * 0.75); ctx.stroke()
}

// ---------- Whole-canvas patterns ----------

function drawTiles(ctx, src, opts, rng, colorize, sample, anim = 'none', time = 0) {
  const { width: W, height: H } = src
  const { pattern } = opts
  const s = Math.max(pattern === 'emoji' || pattern === 'ascii' ? 7 : 3, opts.tileSize)
  const tiles = layoutTiles(pattern, W, H, s, opts.gap, rng)
  if (opts.jitter > 0 || opts.sizeVar > 0 || pattern === 'mix') shuffle(tiles, rng)

  const bgDark = luma(hexToRgb(opts.bgColor)) < 0.5
  const fg = bgDark ? '#eeeeee' : '#151515'
  let icons, textChars
  if (pattern === 'emoji') icons = getIconRamp(opts.emojiSet)
  if (pattern === 'ascii') {
    textChars = [...(opts.text || 'モザイク')].filter((ch) => ch.trim())
    if (!textChars.length) textChars = ['■']
    ctx.font = `800 ${s * (opts.asciiMode === 'text' ? 0.95 : 1.2)}px "M PLUS Rounded 1c","Hiragino Sans",monospace`
  }
  if (pattern === 'crossstitch') {
    ctx.strokeStyle = 'rgba(0,0,0,0.07)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x < W; x += s) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H) }
    for (let y = 0; y < H; y += s) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5) }
    ctx.stroke()
  }
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const animated = anim !== 'none' && anim !== 'glitch'
  const maxD = Math.hypot(W / 2, H / 2)

  for (const t of tiles) {
    let c = colorize(sample(t.x, t.y, t.sz))
    let x = opts.jitter ? t.x + (rng() - 0.5) * opts.jitter * s : t.x
    let y = opts.jitter ? t.y + (rng() - 0.5) * opts.jitter * s : t.y
    let scale = opts.sizeVar ? Math.max(0.15, 1 + (rng() - 0.5) * opts.sizeVar * 1.4) : 1
    let rot = opts.rotation ? (rng() - 0.5) * TAU * opts.rotation : 0
    if (animated) {
      const m = tileMotion(anim, time, t, Math.hypot(t.x - W / 2, t.y - H / 2) / maxD, W, s)
      if (m.scale < 0.02) continue
      x += m.dx
      y += m.dy
      scale *= m.scale
      rot += m.rot
      if (m.hue) c = hueRotate(c, m.hue)
      if (m.light !== 1) c = [Math.min(255, c[0] * m.light), Math.min(255, c[1] * m.light), Math.min(255, c[2] * m.light)]
    }

    ctx.save()
    ctx.translate(x, y)
    if (rot) ctx.rotate(rot)
    switch (pattern) {
      case 'lego':
        drawLego(ctx, t, c, scale)
        break
      case 'crossstitch':
        drawStitch(ctx, t, c, scale)
        break
      case 'halftone': {
        const l = luma(c)
        const amount = bgDark ? l : 1 - l
        const r = t.r * 1.25 * Math.sqrt(amount) * scale
        if (r > 0.3) {
          ctx.fillStyle = opts.halftoneInk ? fg : css(c)
          ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill()
        }
        break
      }
      case 'emoji': {
        // Brighter cells (on a dark bg) get chunkier icons; a little per-tile wobble keeps it varied
        const v = bgDark ? luma(c) : 1 - luma(c)
        const idx = clamp(Math.round(v * (icons.length - 1) + (hash01(t.i) - 0.5) * 3), 0, icons.length - 1)
        const ic = icons[idx]
        const k = ic.k * s * 0.9 * scale
        ctx.scale(k, k)
        ctx.translate(-ic.w / 2, -ic.h / 2)
        ctx.fillStyle = css(c)
        ctx.fill(ic.path)
        break
      }
      case 'ascii': {
        let ch
        if (opts.asciiMode === 'text') ch = textChars[t.i % textChars.length]
        else {
          const v = bgDark ? luma(c) : 1 - luma(c)
          ch = ASCII_RAMP[Math.round(v * (ASCII_RAMP.length - 1))]
        }
        if (ch !== ' ') {
          if (scale !== 1) ctx.scale(scale, scale)
          ctx.fillStyle = opts.asciiColor ? css(c) : fg
          ctx.fillText(ch, 0, s * 0.05)
        }
        break
      }
      default:
        drawShapeTile(ctx, t, c, scale, opts)
    }
    ctx.restore()
  }
}

function drawVoronoi(ctx, src, opts, rng, colorize) {
  const { width: W, height: H, data } = src
  const s = Math.max(5, opts.tileSize)
  const cols = Math.ceil(W / s), rows = Math.ceil(H / s)
  const n = cols * rows
  const px = new Float32Array(n), py = new Float32Array(n)
  const amt = 0.35 + 0.65 * opts.jitter
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i
      px[k] = (i + 0.5 + (rng() - 0.5) * amt) * s
      py[k] = (j + 0.5 + (rng() - 0.5) * amt) * s
    }
  }
  const owner = new Int32Array(W * H)
  const edge = new Float32Array(W * H)
  const sums = new Float64Array(n * 4)
  for (let y = 0; y < H; y++) {
    const cy = Math.floor(y / s)
    for (let x = 0; x < W; x++) {
      const cx = Math.floor(x / s)
      let best = Infinity, second = Infinity, bi = 0
      for (let dj = -1; dj <= 1; dj++) {
        const jj = cy + dj
        if (jj < 0 || jj >= rows) continue
        for (let di = -1; di <= 1; di++) {
          const ii = cx + di
          if (ii < 0 || ii >= cols) continue
          const k = jj * cols + ii
          const dx = px[k] - x, dy = py[k] - y
          const d = dx * dx + dy * dy
          if (d < best) { second = best; best = d; bi = k } else if (d < second) second = d
        }
      }
      const p = y * W + x
      owner[p] = bi
      edge[p] = Math.sqrt(second) - Math.sqrt(best)
      const si = bi * 4, di4 = p * 4
      sums[si] += data[di4]; sums[si + 1] += data[di4 + 1]; sums[si + 2] += data[di4 + 2]; sums[si + 3]++
    }
  }
  const colors = new Array(n)
  for (let k = 0; k < n; k++) {
    const cnt = sums[k * 4 + 3] || 1
    colors[k] = colorize([sums[k * 4] / cnt, sums[k * 4 + 1] / cnt, sums[k * 4 + 2] / cnt])
  }
  const lead = hexToRgb(opts.bgColor)
  const gap = opts.gap
  const out = ctx.createImageData(W, H)
  const od = out.data
  for (let p = 0; p < W * H; p++) {
    const e = edge[p]
    const c = colors[owner[p]]
    let k = 1
    if (opts.bevel) k = 0.8 + 0.4 * Math.min(1, Math.max(0, e - gap) / (s * 0.6))
    let r = c[0] * k, g = c[1] * k, b = c[2] * k
    if (gap > 0 && e < gap + 1) {
      const a = clamp(e - gap, 0, 1) // 1px anti-aliased lead line
      r = lead[0] + (r - lead[0]) * a
      g = lead[1] + (g - lead[1]) * a
      b = lead[2] + (b - lead[2]) * a
    }
    const o = p * 4
    od[o] = r; od[o + 1] = g; od[o + 2] = b; od[o + 3] = 255
  }
  ctx.putImageData(out, 0, 0)
}

function drawStrokes(ctx, src, opts, rng, colorize, sample) {
  const { width: W, height: H } = src
  const s = Math.max(3, opts.tileSize)
  // Underpainting so no background shows through
  for (let y = 0; y < H; y += s) {
    for (let x = 0; x < W; x += s) {
      ctx.fillStyle = css(colorize(sample(x + s / 2, y + s / 2, s)))
      ctx.fillRect(x, y, s + 1, s + 1)
    }
  }
  const lumAt = (x, y) => luma(sample(x, y, 3))
  const baseAngle = rng() * Math.PI
  const count = Math.floor((W / s) * (H / s) * 1.8)
  ctx.lineCap = 'round'
  for (let n = 0; n < count; n++) {
    const x = rng() * W, y = rng() * H
    const c = colorize(sample(x, y, s * 0.6))
    const gx = lumAt(x + s / 2, y) - lumAt(x - s / 2, y)
    const gy = lumAt(x, y + s / 2) - lumAt(x, y - s / 2)
    let angle = Math.hypot(gx, gy) > 0.04 ? Math.atan2(gy, gx) + Math.PI / 2 : baseAngle
    angle += (rng() - 0.5) * Math.PI * (0.25 + opts.rotation)
    const len = s * (1 + rng() * 1.2) * Math.max(0.3, 1 + (rng() - 0.5) * opts.sizeVar * 1.5)
    const dx = (Math.cos(angle) * len) / 2, dy = (Math.sin(angle) * len) / 2
    ctx.lineWidth = s * 0.5
    ctx.strokeStyle = css(c)
    ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); ctx.stroke()
    if (opts.bevel) {
      ctx.lineWidth = s * 0.12
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'
      ctx.beginPath(); ctx.moveTo(x - dx * 0.8 - 1, y - dy * 0.8 - 1); ctx.lineTo(x + dx * 0.8 - 1, y + dy * 0.8 - 1); ctx.stroke()
    }
  }
}

// Band shifts via canvas self-copy (stays on the GPU, fast enough to run every frame)
function applyGlitch(ctx, W, H, amt, rng) {
  const bands = Math.floor(3 + amt * 25)
  for (let n = 0; n < bands; n++) {
    const h = Math.max(2, Math.floor(rng() * H * 0.07 * amt) + 2)
    const y = Math.floor(rng() * (H - h))
    const dx = Math.round((rng() - 0.5) * W * 0.25 * amt)
    ctx.drawImage(ctx.canvas, 0, y, W, h, dx, y, W, h)
    if (rng() < 0.4) {
      // RGB split: knock out one channel in this band
      ctx.save()
      ctx.globalCompositeOperation = 'multiply'
      ctx.fillStyle = ['#00ffff', '#ff00ff', '#ffff00'][Math.floor(rng() * 3)]
      ctx.fillRect(0, y, W, h)
      ctx.restore()
    }
  }
}

function drawGlint(ctx, x, y, r) {
  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.quadraticCurveTo(x, y, x, y + r)
  ctx.quadraticCurveTo(x, y, x - r, y)
  ctx.quadraticCurveTo(x, y, x, y - r)
  ctx.fill()
}

// Frame effects over a pre-rendered still (for per-pixel patterns that are too slow to redraw)
function drawStillFrame(ctx, still, opts, anim, t) {
  const { width: W, height: H } = still
  const s = opts.tileSize
  const p = (t % ANIM_LOOP) / ANIM_LOOP
  ctx.fillStyle = opts.bgColor
  ctx.fillRect(0, 0, W, H)
  switch (anim) {
    case 'pop': {
      const maxD = Math.hypot(W / 2, H / 2)
      const r = maxD * 1.05 * popScale(p, 0) * (p < 0.5 ? clamp((p - 0.05) / 0.4, 0, 1) : 1)
      if (r > 0) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(W / 2, H / 2, r, 0, TAU)
        ctx.clip()
        ctx.drawImage(still, 0, 0)
        ctx.restore()
      }
      break
    }
    case 'wave':
      for (let y = 0; y < H; y += 4) {
        const dx = Math.sin((y / H) * TAU * 2 - t * Math.PI) * s * 0.35
        ctx.drawImage(still, 0, y, W, 4, dx, y, W, 4)
      }
      break
    case 'ripple': {
      // Concentric rings, each zoomed slightly in or out about the center → lens-like ripple
      const cx = W / 2, cy = H / 2, maxD = Math.hypot(cx, cy), rings = 32
      ctx.drawImage(still, 0, 0)
      for (let k = 0; k < rings; k++) {
        const r0 = (k / rings) * maxD, r1 = ((k + 1) / rings) * maxD
        const z = 1 + (0.06 * Math.sin((k / rings) * TAU * 3 - t * Math.PI)) * (s / 20)
        ctx.save()
        ctx.beginPath()
        ctx.arc(cx, cy, r1 + 0.5, 0, TAU)
        ctx.arc(cx, cy, r0, 0, TAU, true)
        ctx.clip()
        ctx.translate(cx, cy)
        ctx.scale(z, z)
        ctx.drawImage(still, -cx, -cy)
        ctx.restore()
      }
      break
    }
    case 'rainbow':
      ctx.filter = `hue-rotate(${(t / ANIM_LOOP) * 360}deg)`
      ctx.drawImage(still, 0, 0)
      ctx.filter = 'none'
      break
    default:
      ctx.drawImage(still, 0, 0)
  }
  if (anim === 'twinkle') {
    const count = Math.max(12, Math.floor(((W * H) / (s * s)) * 0.04))
    ctx.fillStyle = '#ffffff'
    for (let i = 0; i < count; i++) {
      const pulse = Math.pow(Math.max(0, Math.sin((t / ANIM_LOOP + hash01(i * 3 + 3)) * TAU)), 10)
      if (pulse < 0.05) continue
      ctx.globalAlpha = pulse
      drawGlint(ctx, hash01(i * 3 + 1) * W, hash01(i * 3 + 2) * H, s * 0.7 * pulse)
    }
    ctx.globalAlpha = 1
  }
}

let stillCache = { src: null, key: '', canvas: null }
function getStill(src, opts) {
  const key = JSON.stringify({ ...opts, anim: 0, animSpeed: 0 })
  if (stillCache.src !== src || stillCache.key !== key) {
    const cv = document.createElement('canvas')
    renderStatic(cv, src, opts)
    stillCache = { src, key, canvas: cv }
  }
  return stillCache.canvas
}

function prepareCanvas(canvas, W, H) {
  if (canvas.width !== W) canvas.width = W
  if (canvas.height !== H) canvas.height = H
  return canvas.getContext('2d')
}

function renderStatic(canvas, src, opts, anim = 'none', t = 0) {
  const { width: W, height: H } = src
  const ctx = prepareCanvas(canvas, W, H)
  const rng = mulberry32(opts.seed)
  const colorize = makeColorizer(opts, rng)
  const sample = makeSampler(src)
  ctx.fillStyle = opts.bgColor
  ctx.fillRect(0, 0, W, H)
  if (opts.pattern === 'voronoi') drawVoronoi(ctx, src, opts, rng, colorize)
  else if (opts.pattern === 'strokes') drawStrokes(ctx, src, opts, rng, colorize, sample)
  else drawTiles(ctx, src, opts, rng, colorize, sample, anim, t)
  if (opts.glitch > 0) applyGlitch(ctx, W, H, opts.glitch, rng)
}

// t === null renders a still image; otherwise renders the animation frame at t seconds
export function renderMosaic(canvas, src, opts, t = null) {
  const anim = t === null ? 'none' : opts.anim
  if (anim === 'none') return renderStatic(canvas, src, opts)
  const { width: W, height: H } = src
  if (STILL_PATTERNS.includes(opts.pattern)) {
    drawStillFrame(prepareCanvas(canvas, W, H), getStill(src, opts), opts, anim, t)
  } else {
    renderStatic(canvas, src, opts, anim, t)
  }
  if (anim === 'glitch') {
    // New glitch bands ~10x per second, repeating every loop
    const frame = Math.floor(t * 10) % (ANIM_LOOP * 10)
    if (hash01(frame + 7) < 0.6) {
      applyGlitch(canvas.getContext('2d'), W, H, Math.max(0.35, opts.glitch), mulberry32(opts.seed + frame))
    }
  }
}
