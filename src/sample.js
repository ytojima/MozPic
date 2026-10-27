// Procedural sunset scene so the app has something to play with before any upload
export function makeSampleImage() {
  const W = 960, H = 640
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const ctx = cv.getContext('2d')

  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.72)
  sky.addColorStop(0, '#1e0f4a')
  sky.addColorStop(0.45, '#c2569b')
  sky.addColorStop(0.8, '#ff9e6d')
  sky.addColorStop(1, '#ffd29a')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  for (let i = 0; i < 70; i++) {
    const x = (i * 137.5) % W, y = ((i * 89.3) % (H * 0.35))
    ctx.beginPath(); ctx.arc(x, y, (i % 3) * 0.6 + 0.8, 0, Math.PI * 2); ctx.fill()
  }

  const sx = W * 0.66, sy = H * 0.55
  const glow = ctx.createRadialGradient(sx, sy, 20, sx, sy, 260)
  glow.addColorStop(0, 'rgba(255,240,170,0.9)')
  glow.addColorStop(1, 'rgba(255,200,120,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#fff1b8'
  ctx.beginPath(); ctx.arc(sx, sy, 95, 0, Math.PI * 2); ctx.fill()

  const ridge = (base, amp, freq, phase, color) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(0, H)
    for (let x = 0; x <= W; x += 6) {
      const y = base - amp * (Math.sin(x * freq + phase) * 0.6 + Math.sin(x * freq * 2.7 + phase * 1.7) * 0.3 + Math.sin(x * freq * 6.1) * 0.1)
      ctx.lineTo(x, y)
    }
    ctx.lineTo(W, H)
    ctx.fill()
  }
  ridge(H * 0.6, 70, 0.006, 1.2, '#7a3b8f')
  ridge(H * 0.66, 55, 0.009, 3.4, '#4e2a7a')
  ridge(H * 0.71, 35, 0.013, 0.4, '#2c1a55')

  const sea = ctx.createLinearGradient(0, H * 0.72, 0, H)
  sea.addColorStop(0, '#3a2a78')
  sea.addColorStop(1, '#0d0b2e')
  ctx.fillStyle = sea
  ctx.fillRect(0, H * 0.72, W, H * 0.28)
  for (let i = 0; i < 14; i++) {
    const y = H * 0.74 + i * 11
    const w = 180 - i * 9 + (i % 2) * 30
    ctx.fillStyle = `rgba(255,225,150,${0.75 - i * 0.045})`
    ctx.fillRect(sx - w / 2, y, w, 4)
  }

  return { el: cv, url: cv.toDataURL(), name: 'sample' }
}
