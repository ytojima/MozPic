// Exports exactly one animation loop as a video, entirely in the browser.
// Preferred path: render each frame deterministically and encode H.264 into a regular
// (non-fragmented, fast-start) MP4 with WebCodecs, which plays everywhere including
// iPhone Photos / Files / AirDrop previews. Fallback: real-time MediaRecorder capture.
import { BufferTarget, CanvasSource, Mp4OutputFormat, Output, QUALITY_HIGH, canEncodeVideo } from 'mediabunny'
import { ANIM_LOOP } from './config'
import { renderMosaic } from './mosaic'

const FPS = 30

async function encodeMp4(src, opts, onProgress) {
  const { width, height } = src
  if (typeof VideoEncoder === 'undefined' || !(await canEncodeVideo('avc', { width, height, quality: QUALITY_HIGH }))) {
    return null
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target: new BufferTarget(),
  })
  const source = new CanvasSource(canvas, { codec: 'avc', quality: QUALITY_HIGH, keyFrameInterval: 1 })
  output.addVideoTrack(source, { frameRate: FPS })
  await output.start()

  // One loop of animation time, played back at the chosen speed
  const frames = Math.max(1, Math.round((ANIM_LOOP / opts.animSpeed) * FPS))
  for (let i = 0; i < frames; i++) {
    renderMosaic(canvas, src, opts, (i / frames) * ANIM_LOOP)
    await source.add(i / FPS, 1 / FPS)
    onProgress((i + 1) / frames)
  }
  await output.finalize()
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
  return (await encodeMp4(src, opts, onProgress)) ?? recordRealtime(liveCanvas, opts, onProgress)
}
