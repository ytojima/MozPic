// Exports exactly one animation loop as a video, entirely in the browser.
// Preferred path: render each frame deterministically and encode H.264 into a regular
// (non-fragmented, fast-start) MP4 with WebCodecs, which plays everywhere including
// iPhone Photos / Files / AirDrop previews. Fallback: real-time MediaRecorder capture.
import { BufferTarget, CanvasSource, Mp4OutputFormat, Output, QUALITY_HIGH, canEncodeVideo } from 'mediabunny'
import { ANIM_LOOP } from './config'
import { renderMosaic } from './mosaic'

const FPS = 30

const STALL_MS = 6000
// A working encoder emits its first packet almost immediately; a stalled one never does
const FIRST_PACKET_MS = 2500
const FIRST_PACKET_AFTER = 5

// Constrained Baseline with a level large enough for the frame size: the most widely
// encodable/decodable H.264 variant (some WebKit encoders stall on High/Main)
function baselineCodec(width, height) {
  const mbs = Math.ceil(width / 16) * Math.ceil(height / 16)
  const level = mbs <= 3600 ? 0x1f : mbs <= 5120 ? 0x20 : mbs <= 8192 ? 0x28 : mbs <= 22080 ? 0x32 : 0x33
  return `avc1.42E0${level.toString(16).padStart(2, '0')}`
}

function withTimeout(promise, label, ms = STALL_MS) {
  let timer
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} stalled`)), ms)
    }),
  ]).finally(() => clearTimeout(timer))
}

async function encodeMp4(src, opts, onProgress, fullCodecString) {
  const { width, height } = src
  const encodeOpts = { codec: 'avc', quality: QUALITY_HIGH, ...(fullCodecString && { fullCodecString }) }
  if (typeof VideoEncoder === 'undefined' || !(await canEncodeVideo('avc', { width, height, ...encodeOpts }))) {
    return null
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target: new BufferTarget(),
  })
  let firstPacket
  const gotPacket = new Promise((resolve) => (firstPacket = resolve))
  const source = new CanvasSource(canvas, { ...encodeOpts, keyFrameInterval: 1, onEncodedPacket: () => firstPacket() })
  output.addVideoTrack(source, { frameRate: FPS })
  try {
    await withTimeout(output.start(), 'start')
    // One loop of animation time, played back at the chosen speed
    const frames = Math.max(1, Math.round((ANIM_LOOP / opts.animSpeed) * FPS))
    for (let i = 0; i < frames; i++) {
      renderMosaic(canvas, src, opts, (i / frames) * ANIM_LOOP)
      await withTimeout(source.add(i / FPS, 1 / FPS), 'encode')
      if (i === FIRST_PACKET_AFTER) await withTimeout(gotPacket, 'first packet', FIRST_PACKET_MS)
      onProgress((i + 1) / frames)
    }
    await withTimeout(output.finalize(), 'finalize')
  } catch (e) {
    output.cancel().catch(() => {})
    throw e
  }
  return { blob: new Blob([output.target.buffer], { type: 'video/mp4' }), ext: 'mp4' }
}

function recordRealtime(canvas, opts, onProgress) {
  const mime = [
    'video/mp4;codecs=avc1.640028',
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm',
  ].find((m) => window.MediaRecorder?.isTypeSupported(m))
  if (!mime) return Promise.resolve(null)
  return new Promise((resolve, reject) => {
    const rec = new MediaRecorder(canvas.captureStream(FPS), { mimeType: mime, videoBitsPerSecond: 8_000_000 })
    const chunks = []
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    rec.onerror = (e) => reject(e.error)
    rec.onstop = () => resolve({ blob: new Blob(chunks, { type: mime }), ext: mime.startsWith('video/mp4') ? 'mp4' : 'webm' })
    rec.start()
    const duration = (ANIM_LOOP / opts.animSpeed) * 1000
    const started = performance.now()
    const timer = setInterval(() => {
      const p = (performance.now() - started) / duration
      if (p >= 1) {
        clearInterval(timer)
        rec.stop()
      } else onProgress(p)
    }, 100)
  })
}

// Returns { blob, ext } or null when the browser cannot produce any video
export async function exportLoopVideo({ src, opts, liveCanvas, onProgress }) {
  // Default H.264 profile first (best quality per byte), then Baseline if the encoder stalls or refuses
  for (const codec of [undefined, baselineCodec(src.width, src.height)]) {
    try {
      const result = await encodeMp4(src, opts, onProgress, codec)
      if (result) return result
    } catch {
      onProgress(0)
    }
  }
  return recordRealtime(liveCanvas, opts, onProgress)
}
