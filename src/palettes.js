export const PALETTES = [
  { id: 'original', name: '元の色', colors: null },
  { id: 'random', name: 'ランダム', colors: null },
  { id: 'retro16', name: 'レトロ', colors: ['#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8', '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa'] },
  { id: 'handheld', name: 'ゲーム機', colors: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'] },
  { id: 'pastel', name: 'パステル', colors: ['#8e8aa8', '#ffd1dc', '#ffe5b4', '#fffacd', '#c1f0c1', '#b5e3ff', '#d7c4f2', '#fbfbfb'] },
  { id: 'neon', name: 'ネオン', colors: ['#0d0221', '#7700a6', '#ff2a6d', '#05d9e8', '#00ff9f', '#f5d300', '#d1f7ff'] },
  { id: 'vapor', name: 'ベイパー', colors: ['#2d1b69', '#b967ff', '#ff71ce', '#01cdfe', '#05ffa1', '#fffb96'] },
  { id: 'sakura', name: 'さくら', colors: ['#3b1f2b', '#8c3b5a', '#d46a8c', '#f2a7bb', '#fbd3df', '#fff4f7'] },
  { id: 'ocean', name: '深海', colors: ['#03045e', '#023e8a', '#0077b6', '#00b4d8', '#90e0ef', '#caf0f8'] },
  { id: 'matrix', name: 'ハッカー', colors: ['#000000', '#003b00', '#008f11', '#00ff41', '#b6ffb6'] },
  { id: 'autumn', name: '紅葉', colors: ['#3d1308', '#7b2d26', '#c0392b', '#e67e22', '#f1c40f', '#f5e6c8'] },
  { id: 'wa', name: '和色', colors: ['#1b1b1b', '#c9171e', '#e7b923', '#2e5c6e', '#5b8930', '#b28fce', '#f3ead7'] },
  { id: 'sepia', name: 'セピア', colors: ['#2b1d0e', '#5c4326', '#8e6c43', '#bf9b6b', '#e3cba1', '#f8ecd4'] },
  { id: 'mono', name: 'モノクロ', colors: ['#000000', '#444444', '#888888', '#bbbbbb', '#ffffff'] },
  { id: 'bw', name: '白黒', colors: ['#111111', '#f5f5f5'] },
]

export function hexToRgb(hex) {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function hslToRgb(h, s, l) {
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
  return [f(0) * 255, f(8) * 255, f(4) * 255]
}

// Seed-driven harmonious palette, so changing the seed also reshuffles colors
function randomPalette(seed) {
  let a = (seed ^ 0x9e3779b9) >>> 0
  const rnd = () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const base = rnd() * 360
  const schemes = [
    [0, 20, 40, 60, 80],
    [0, 15, 180, 195, 30],
    [0, 120, 240, 60, 300],
    [0, 150, 210, 30, 180],
  ]
  const offsets = schemes[Math.floor(rnd() * schemes.length)]
  const n = 4 + Math.floor(rnd() * 3)
  const out = []
  for (let i = 0; i < n; i++) {
    const hue = (base + offsets[i % offsets.length] + (rnd() - 0.5) * 20 + 360) % 360
    const light = 0.12 + (i / (n - 1)) * 0.78
    out.push(hslToRgb(hue, 0.45 + rnd() * 0.5, light))
  }
  return out
}

export function getPaletteColors(id, seed) {
  if (id === 'random') return randomPalette(seed)
  const p = PALETTES.find((x) => x.id === id)
  return p && p.colors ? p.colors.map(hexToRgb) : null
}
