import {
  faSquareFull, faCircle, faDiceD20, faPlay, faDiamond, faHeart, faStar, faCubes, faChurch, faBraille,
  faXmark, faPaintbrush, faFont, faFaceSmile, faShapes, faPuzzlePiece, faGamepad, faNewspaper, faTape,
  faGift, faSun, faTerminal, faDroplet, faBurst, faVideo, faBan, faWater, faBullseye, faWandSparkles,
  faArrowsSpin, faRainbow, faTv,
} from '@fortawesome/free-solid-svg-icons'
import * as fas from '@fortawesome/free-solid-svg-icons'
import { PALETTES } from './palettes'

export const PATTERNS = [
  { id: 'square', icon: faSquareFull, name: 'スクエア' },
  { id: 'circle', icon: faCircle, name: 'ドット' },
  { id: 'hex', icon: faDiceD20, name: 'ハニカム' },
  { id: 'triangle', icon: faPlay, rotate: 270, name: 'さんかく' },
  { id: 'diamond', icon: faDiamond, name: 'ダイヤ' },
  { id: 'heart', icon: faHeart, name: 'ハート' },
  { id: 'star', icon: faStar, name: 'スター' },
  { id: 'lego', icon: faCubes, name: 'ブロック' },
  { id: 'voronoi', icon: faChurch, name: 'ステンド' },
  { id: 'halftone', icon: faBraille, name: '網点' },
  { id: 'crossstitch', icon: faXmark, name: '刺しゅう' },
  { id: 'strokes', icon: faPaintbrush, name: '筆タッチ' },
  { id: 'ascii', icon: faFont, name: '文字' },
  { id: 'emoji', icon: faFaceSmile, name: '絵文字' },
  { id: 'mix', icon: faShapes, name: 'ごちゃまぜ' },
]

// Every animation loops seamlessly over ANIM_LOOP seconds of animation time
export const ANIM_LOOP = 4

export const ANIMATIONS = [
  { id: 'none', icon: faBan, name: 'なし' },
  { id: 'pop', icon: faBurst, name: 'ぽこぽこ' },
  { id: 'wave', icon: faWater, name: 'ゆらゆら' },
  { id: 'ripple', icon: faBullseye, name: '波紋' },
  { id: 'twinkle', icon: faWandSparkles, name: 'キラキラ' },
  { id: 'spin', icon: faArrowsSpin, name: 'くるくる', tileOnly: true },
  { id: 'rainbow', icon: faRainbow, name: '虹色' },
  { id: 'glitch', icon: faTv, name: 'ノイズ' },
]

// Patterns drawn per-pixel: animated by effects over a cached still instead of per tile
export const STILL_PATTERNS = ['voronoi', 'strokes']

// Shapes that support the "ぷっくり" / shadow effects
export const SHAPE_PATTERNS = ['square', 'circle', 'hex', 'triangle', 'diamond', 'heart', 'star', 'mix']

// Applied when a pattern is picked so each one looks good out of the box
export const PATTERN_HINTS = {
  halftone: { bgColor: '#f4efe3' },
  crossstitch: { bgColor: '#f3ecdc' },
  emoji: { bgColor: '#ffffff' },
  ascii: { bgColor: '#0b0b0b' },
  lego: { bgColor: '#222222' },
  voronoi: { bgColor: '#1a1a1a' },
}

export const EMOJI_SETS = [
  { id: 'mix', name: 'ぜんぶ', icons: [fas.faHeart, fas.faStar, fas.faSun, fas.faMoon, fas.faCloud, fas.faLeaf, fas.faFish, fas.faCat, fas.faAppleWhole, fas.faCarrot, fas.faIceCream, fas.faMugHot, fas.faGhost, fas.faRocket, fas.faMusic, fas.faBolt, fas.faSnowflake, fas.faCrown, fas.faGem, fas.faFeather, fas.faPaw, fas.faFrog, fas.faCircle, fas.faSquare, fas.faDiamond, fas.faPlus, fas.faDroplet, fas.faBell, fas.faKey, fas.faAnchor] },
  { id: 'food', name: 'たべもの', icons: [fas.faAppleWhole, fas.faCarrot, fas.faLemon, fas.faPepperHot, fas.faIceCream, fas.faMugHot, fas.faCookie, fas.faCookieBite, fas.faPizzaSlice, fas.faBurger, fas.faFish, fas.faEgg, fas.faCheese, fas.faBreadSlice, fas.faDrumstickBite, fas.faCandyCane, fas.faStroopwafel, fas.faWineGlass, fas.faMartiniGlass, fas.faBacon, fas.faShrimp, fas.faBone] },
  { id: 'nature', name: 'しぜん', icons: [fas.faLeaf, fas.faSeedling, fas.faTree, fas.faSun, fas.faMoon, fas.faCloud, fas.faSnowflake, fas.faWater, fas.faFire, fas.faMountain, fas.faStar, fas.faFeather, fas.faSpa, fas.faClover, fas.faDroplet, fas.faUmbrella, fas.faMeteor, fas.faEarthAmericas] },
  { id: 'animals', name: 'どうぶつ', icons: [fas.faCat, fas.faDog, fas.faFish, fas.faFrog, fas.faHippo, fas.faHorse, fas.faDove, fas.faKiwiBird, fas.faCrow, fas.faSpider, fas.faOtter, fas.faDragon, fas.faPaw, fas.faWorm, fas.faCow, fas.faBug, fas.faShrimp] },
  { id: 'faces', name: 'かお', icons: [fas.faFaceSmile, fas.faFaceGrin, fas.faFaceLaugh, fas.faFaceSurprise, fas.faFaceKiss, fas.faFaceMeh, fas.faFaceSadTear, fas.faFaceAngry, fas.faFaceGrinStars, fas.faFaceGrinHearts, fas.faFaceDizzy, fas.faFaceRollingEyes, fas.faFaceGrinTongue, fas.faFaceTired, fas.faGhost, fas.faRobot, fas.faSkull] },
  { id: 'play', name: 'あそび', icons: [fas.faGamepad, fas.faDice, fas.faPuzzlePiece, fas.faChessKnight, fas.faChessPawn, fas.faGuitar, fas.faDrum, fas.faHeadphones, fas.faCamera, fas.faRocket, fas.faPlane, fas.faCar, fas.faBicycle, fas.faTrain, fas.faShip, fas.faCampground, fas.faIgloo, fas.faHouse, fas.faRing, fas.faMusic] },
]

export const BG_SWATCHES = ['#111111', '#1b1b2f', '#ffffff', '#f4efe3', '#fff0f6', '#e8f7ff', '#2b2d42', '#0b3d2e', '#5c2a4f', '#ffd166']

export const DEFAULTS = {
  pattern: 'hex',
  tileSize: 18,
  gap: 2,
  cornerRadius: 0.2,
  jitter: 0,
  sizeVar: 0,
  rotation: 0,
  colorNoise: 0,
  saturation: 1.1,
  brightness: 0,
  posterize: 0,
  palette: 'original',
  paletteMode: 'nearest',
  bgColor: '#1b1b2f',
  bevel: true,
  shadow: false,
  glitch: 0,
  seed: 20261027,
  asciiMode: 'ramp',
  asciiColor: true,
  text: 'モザイク',
  emojiSet: 'mix',
  halftoneInk: false,
  outSize: 1200,
  anim: 'none',
  animSpeed: 1,
}

export const PRESETS = [
  { name: 'ステンドグラス', icon: faChurch, opts: { pattern: 'voronoi', tileSize: 38, gap: 3, jitter: 0.9, saturation: 1.5, bevel: true, bgColor: '#1a1a1a' } },
  { name: 'ブロック玩具', icon: faPuzzlePiece, opts: { pattern: 'lego', tileSize: 22, palette: 'retro16', paletteMode: 'nearest', saturation: 1.2, bgColor: '#222222' } },
  { name: '携帯ゲーム機', icon: faGamepad, opts: { pattern: 'square', tileSize: 8, gap: 0, cornerRadius: 0, palette: 'handheld', paletteMode: 'luma', bevel: false } },
  { name: '新聞', icon: faNewspaper, opts: { pattern: 'halftone', tileSize: 9, halftoneInk: true, saturation: 1, bgColor: '#f4efe3' } },
  { name: '刺しゅう', icon: faTape, opts: { pattern: 'crossstitch', tileSize: 14, posterize: 5, bgColor: '#f3ecdc' } },
  { name: '絵文字パーティ', icon: faGift, opts: { pattern: 'emoji', tileSize: 18, emojiSet: 'mix', bgColor: '#ffffff' } },
  { name: '印象派', icon: faSun, opts: { pattern: 'strokes', tileSize: 12, saturation: 1.4, colorNoise: 0.15, rotation: 0.2 } },
  { name: 'ハッカー', icon: faTerminal, opts: { pattern: 'ascii', tileSize: 10, asciiMode: 'ramp', asciiColor: true, palette: 'matrix', paletteMode: 'luma', bgColor: '#000000' } },
  { name: 'バブル', icon: faDroplet, opts: { pattern: 'circle', tileSize: 22, gap: 1, jitter: 0.5, sizeVar: 0.7, bevel: true, palette: 'pastel', paletteMode: 'nearest', bgColor: '#fff0f6' } },
  { name: '紙吹雪', icon: faBurst, opts: { pattern: 'mix', tileSize: 16, gap: 2, jitter: 0.6, rotation: 0.5, sizeVar: 0.4, bevel: false, shadow: true, bgColor: '#ffffff' } },
  { name: 'VHS', icon: faVideo, opts: { pattern: 'square', tileSize: 6, gap: 0, cornerRadius: 0, palette: 'vapor', paletteMode: 'luma', glitch: 0.6, bevel: false } },
]

export function randomOpts(prev, locks = {}) {
  const r = Math.random
  const pick = (a) => a[Math.floor(r() * a.length)]
  const chance = (p) => r() < p
  const pattern = locks.pattern ? prev.pattern : pick(PATTERNS).id
  const [lo, hi] = { emoji: [12, 28], ascii: [8, 16], voronoi: [16, 60], lego: [14, 32], strokes: [6, 16], halftone: [6, 16] }[pattern] || [6, 36]
  const hintBg = PATTERN_HINTS[pattern]?.bgColor
  return {
    ...prev,
    pattern,
    tileSize: Math.round(lo + r() * (hi - lo)),
    gap: chance(0.35) ? 0 : Math.round(1 + r() * 3),
    cornerRadius: chance(0.5) ? 0 : +(r() * 0.8).toFixed(2),
    jitter: chance(0.55) ? 0 : +(r() * 0.7).toFixed(2),
    sizeVar: chance(0.6) ? 0 : +(r() * 0.7).toFixed(2),
    rotation: chance(0.6) ? 0 : +(r() * 0.5).toFixed(2),
    colorNoise: chance(0.65) ? 0 : +(r() * 0.35).toFixed(2),
    saturation: +(0.7 + r() * 0.9).toFixed(2),
    brightness: +((r() - 0.5) * 0.3).toFixed(2),
    posterize: chance(0.7) ? 0 : 2 + Math.floor(r() * 5),
    palette: locks.palette ? prev.palette : chance(0.35) ? 'original' : pick(PALETTES.slice(1)).id,
    paletteMode: locks.palette ? prev.paletteMode : pick(['nearest', 'luma']),
    bgColor: hintBg && chance(0.6) ? hintBg : pick(BG_SWATCHES),
    bevel: chance(0.35),
    shadow: chance(0.2),
    glitch: chance(0.1) ? +(0.2 + r() * 0.5).toFixed(2) : 0,
    seed: Math.floor(r() * 1e8),
    asciiMode: chance(0.6) ? 'ramp' : 'text',
    asciiColor: chance(0.75),
    emojiSet: pick(EMOJI_SETS).id,
    halftoneInk: chance(0.4),
  }
}
