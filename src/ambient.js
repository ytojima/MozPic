// Flowing ambient background: a tiny canvas (blurred in-canvas, scaled up by CSS) where
// several copies of the current mosaic slowly orbit and rotate, and changes crossfade.
const W = 160
const H = 100
const MIX_MS = 1400
const FRAME_MS = 33 // ~30fps is plenty for slow drift
const SPEED = 1.8

// [rotation speed, orbit speed, scale, phase] per drifting copy
const BLOBS = [
  [0.05, 0.11, 1.6, 0],
  [-0.04, 0.07, 1.9, 2.1],
  [0.03, -0.09, 2.2, 4.2],
]

const ease = (x) => x * x * (3 - 2 * x)

function makeCanvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function snapshot(src, w = 64) {
  const c = makeCanvas(w, Math.max(1, Math.round((w * src.height) / src.width)))
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height)
  return c
}

function drawCover(ctx, img, cx, cy, scale, angle, alpha) {
  const k = Math.max(W / img.width, H / img.height) * scale
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(cx, cy)
  ctx.rotate(angle)
  ctx.drawImage(img, (-img.width * k) / 2, (-img.height * k) / 2, img.width * k, img.height * k)
  ctx.restore()
}

function compose(ctx, img, t) {
  ctx.clearRect(0, 0, W, H)
  drawCover(ctx, img, W / 2, H / 2, 1.25, 0, 1)
  for (const [rotSpeed, orbitSpeed, scale, phase] of BLOBS) {
    const x = W / 2 + Math.cos(t * orbitSpeed + phase) * W * 0.22
    const y = H / 2 + Math.sin(t * orbitSpeed * 1.3 + phase) * H * 0.22
    drawCover(ctx, img, x, y, scale + 0.15 * Math.sin(t * 0.13 + phase), t * rotSpeed + phase, 0.55)
  }
}

export function startAmbient(canvas, { reducedMotion = false } = {}) {
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const canFilter = 'filter' in ctx
  const prevLayer = makeCanvas(W, H), curLayer = makeCanvas(W, H)
  const pctx = prevLayer.getContext('2d'), cctx = curLayer.getContext('2d')
  let prev = null, cur = null, mixStart = 0, last = 0, settled = false, raf = 0

  const mixAt = (now) => Math.min(1, (now - mixStart) / MIX_MS)

  function frame(now) {
    if (!cur) return
    const m = prev ? ease(mixAt(now)) : 1
    // With reduced motion the field is still; only redraw while a crossfade is running
    if (reducedMotion && m >= 1 && settled) return
    const t = reducedMotion ? 0 : (now / 1000) * SPEED
    compose(cctx, cur, t)
    if (m < 1) compose(pctx, prev, t)
    ctx.filter = canFilter ? 'blur(7px)' : 'none'
    ctx.clearRect(0, 0, W, H)
    // Draw oversized so the blur doesn't fade out at the edges
    if (m < 1) ctx.drawImage(prevLayer, -10, -10, W + 20, H + 20)
    ctx.globalAlpha = m
    ctx.drawImage(curLayer, -10, -10, W + 20, H + 20)
    ctx.globalAlpha = 1
    settled = m >= 1
  }

  const loop = (now) => {
    raf = requestAnimationFrame(loop)
    if (now - last < FRAME_MS) return
    last = now
    frame(now)
  }
  raf = requestAnimationFrame(loop)

  return {
    canFilter,
    setSource(src) {
      if (!src || !src.width) return
      const now = performance.now()
      if (cur && prev && mixAt(now) < 1) {
        // Freeze the in-between blend so a new change continues smoothly from it
        const m = ease(mixAt(now))
        const mid = snapshot(prev)
        const mctx = mid.getContext('2d')
        mctx.globalAlpha = m
        mctx.drawImage(cur, 0, 0, mid.width, mid.height)
        prev = mid
      } else {
        prev = cur
      }
      cur = snapshot(src)
      mixStart = now
      settled = false
    },
    stop() {
      cancelAnimationFrame(raf)
    },
  }
}
