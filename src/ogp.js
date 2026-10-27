// Draws the OGP background with the real mosaic engine: diagonal bands, one pattern each.
import '@fontsource/m-plus-rounded-1c/700.css'
import '@fontsource/m-plus-rounded-1c/800.css'
import { icon } from '@fortawesome/fontawesome-svg-core'
import { DEFAULTS, PATTERNS } from './config'
import { renderMosaic } from './mosaic'
import { makeSampleImage } from './sample'

const W = 1200
const H = 630

// Left band sits under the glass card; the rest fan out across the visible right side
const BANDS = [
  { pattern: 'hex', tileSize: 22, gap: 2, bevel: true, bgColor: '#1b1b2f' },
  { pattern: 'emoji', tileSize: 20, emojiSet: 'mix', bgColor: '#1b1b2f' },
  { pattern: 'voronoi', tileSize: 30, gap: 3, jitter: 0.9, saturation: 1.5, bevel: true, bgColor: '#1a1a1a' },
  { pattern: 'lego', tileSize: 24, palette: 'retro16', paletteMode: 'nearest', saturation: 1.2, bgColor: '#222222' },
  { pattern: 'circle', tileSize: 22, gap: 1, jitter: 0.5, sizeVar: 0.7, bevel: true, palette: 'vapor', paletteMode: 'luma', bgColor: '#2b2d42' },
]
// x of each band edge along the top; the bottom edge is shifted left by SLANT
const EDGES = [-400, 860, 1000, 1130, 1250, 1700]
const SLANT = 240

function coverSource(el) {
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const ctx = cv.getContext('2d')
  const k = Math.max(W / el.width, H / el.height)
  ctx.drawImage(el, (W - el.width * k) / 2, (H - el.height * k) / 2, el.width * k, el.height * k)
  return ctx.getImageData(0, 0, W, H)
}

await document.fonts.ready

const src = coverSource(makeSampleImage().el)
const out = document.getElementById('bg').getContext('2d')
BANDS.forEach((band, i) => {
  const layer = document.createElement('canvas')
  renderMosaic(layer, src, { ...DEFAULTS, seed: 7 + i, ...band })
  const a = EDGES[i], b = EDGES[i + 1] + 1
  out.save()
  out.beginPath()
  out.moveTo(a, 0)
  out.lineTo(b, 0)
  out.lineTo(b - SLANT, H)
  out.lineTo(a - SLANT, H)
  out.closePath()
  out.clip()
  out.drawImage(layer, 0, 0)
  out.restore()
})

// A row of pattern icons on the card
const picks = ['hex', 'heart', 'lego', 'voronoi', 'emoji', 'strokes', 'mix']
document.getElementById('icons').innerHTML = picks
  .map((id) => {
    const p = PATTERNS.find((x) => x.id === id)
    return `<span>${icon(p.icon, { transform: { rotate: p.rotate || 0 } }).html.join('')}</span>`
  })
  .join('')

document.body.dataset.ready = '1'
