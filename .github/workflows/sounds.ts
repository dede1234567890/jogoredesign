// Web Audio API procedural sound engine
let ctx: AudioContext | null = null
let muted = false

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function osc(
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType = 'sine',
  vol = 0.12,
  attack = 0.005,
  ctx2?: AudioContext,
) {
  const c = ctx2 ?? getCtx()
  if (!c || muted) return
  const o = c.createOscillator()
  const g = c.createGain()
  o.connect(g)
  g.connect(c.destination)
  o.type = type
  o.frequency.setValueAtTime(freq, startTime)
  g.gain.setValueAtTime(0, startTime)
  g.gain.linearRampToValueAtTime(vol, startTime + attack)
  g.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
  o.start(startTime)
  o.stop(startTime + duration + 0.02)
}

function noise(startTime: number, duration: number, vol = 0.04, ctx2?: AudioContext) {
  const c = ctx2 ?? getCtx()
  if (!c || muted) return
  const buf = c.createBuffer(1, c.sampleRate * duration, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const g = c.createGain()
  const filter = c.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.setValueAtTime(1200, startTime)
  src.connect(filter)
  filter.connect(g)
  g.connect(c.destination)
  g.gain.setValueAtTime(vol, startTime)
  g.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
  src.start(startTime)
  src.stop(startTime + duration)
}

export function setMuted(m: boolean) { muted = m }
export function getMuted() { return muted }

export function sfxCardSelect() {
  const c = getCtx()
  if (!c || muted) return
  const t = c.currentTime
  osc(880, t, 0.06, 'square', 0.07)
  osc(1320, t + 0.01, 0.05, 'sine', 0.04)
}

export function sfxCardDeselect() {
  const c = getCtx()
  if (!c || muted) return
  const t = c.currentTime
  osc(440, t, 0.06, 'square', 0.05)
}

export function sfxCardDeal() {
  const c = getCtx()
  if (!c || muted) return
  const t = c.currentTime
  osc(660, t, 0.04, 'triangle', 0.06)
  noise(t, 0.05, 0.03)
}

export function sfxChipTick() {
  const c = getCtx()
  if (!c || muted) return
  const t = c.currentTime
  osc(1046, t, 0.03, 'sine', 0.06)
}

export function sfxMultFlash() {
  const c = getCtx()
  if (!c || muted) return
  const t = c.currentTime
  osc(523, t, 0.08, 'square', 0.08)
  osc(784, t + 0.05, 0.1, 'square', 0.06)
}

export function sfxScoreReveal(score: number) {
  const c = getCtx()
  if (!c || muted) return
  const t = c.currentTime
  const scale = Math.log10(Math.max(score, 10)) / 4
  const base = 220 + scale * 400
  osc(base, t, 0.1, 'sawtooth', 0.08)
  osc(base * 1.5, t + 0.08, 0.12, 'sine', 0.06)
  osc(base * 2, t + 0.16, 0.15, 'sine', 0.05)
  if (score > 5000) {
    osc(base * 3, t + 0.22, 0.2, 'sine', 0.04)
  }
}

export function sfxDiscard() {
  const c = getCtx()
  if (!c || muted) return
  const t = c.currentTime
  osc(330, t, 0.05, 'sawtooth', 0.06)
  osc(220, t + 0.04, 0.08, 'sawtooth', 0.05)
  noise(t, 0.07, 0.02)
}

export function sfxBuy() {
  const c = getCtx()
  if (!c || muted) return
  const t = c.currentTime
  osc(523, t, 0.06, 'sine', 0.1)
  osc(659, t + 0.06, 0.06, 'sine', 0.1)
  osc(784, t + 0.12, 0.1, 'sine', 0.08)
}

export function sfxBlindWin() {
  const c = getCtx()
  if (!c || muted) return
  const t = c.currentTime
  const melody = [523, 659, 784, 1047]
  melody.forEach((f, i) => osc(f, t + i * 0.1, 0.15, 'sine', 0.1))
  osc(1047, t + 0.4, 0.4, 'sine', 0.07)
}

export function sfxGameOver() {
  const c = getCtx()
  if (!c || muted) return
  const t = c.currentTime
  const melody = [392, 349, 330, 294, 262]
  melody.forEach((f, i) => osc(f, t + i * 0.12, 0.14, 'sawtooth', 0.08))
}

export function sfxBossEntry() {
  const c = getCtx()
  if (!c || muted) return
  const t = c.currentTime
  osc(110, t, 0.3, 'sawtooth', 0.12)
  osc(138, t + 0.1, 0.3, 'sawtooth', 0.1)
  osc(98, t + 0.3, 0.5, 'square', 0.08)
  noise(t, 0.2, 0.05)
}

export function sfxLevelUp() {
  const c = getCtx()
  if (!c || muted) return
  const t = c.currentTime
  ;[523, 659, 784, 1047, 1319].forEach((f, i) => osc(f, t + i * 0.07, 0.12, 'sine', 0.09))
}

export function sfxJokerActivate() {
  const c = getCtx()
  if (!c || muted) return
  const t = c.currentTime
  osc(880, t, 0.06, 'sine', 0.07)
  osc(1109, t + 0.04, 0.08, 'sine', 0.06)
}
