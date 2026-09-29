import { useState, useEffect, useRef, useCallback } from 'react'
import { sfxChipTick, sfxMultFlash, sfxScoreReveal, sfxJokerActivate } from './sounds'

// ─── Floating score text ────────────────────────────────────────────────────
interface FloatMsg { id: number; text: string; color: string; x: number; y: number }

let floatId = 0

export function useFloatingTexts() {
  const [msgs, setMsgs] = useState<FloatMsg[]>([])

  const spawn = useCallback((text: string, color: string, x?: number, y?: number) => {
    const id = ++floatId
    const px = x ?? 50 + (Math.random() - 0.5) * 30
    const py = y ?? 40 + (Math.random() - 0.5) * 10
    setMsgs(prev => [...prev, { id, text, color, x: px, y: py }])
    setTimeout(() => setMsgs(prev => prev.filter(m => m.id !== id)), 1200)
  }, [])

  return { msgs, spawn }
}

export function FloatingTexts({ msgs }: { msgs: FloatMsg[] }) {
  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
      {msgs.map(m => (
        <div
          key={m.id}
          className="absolute font-black text-2xl float-up select-none"
          style={{
            left: `${m.x}%`,
            top: `${m.y}%`,
            color: m.color,
            fontFamily: 'JetBrains Mono, monospace',
            textShadow: `0 0 12px ${m.color}`,
            transform: 'translateX(-50%)',
          }}
        >
          {m.text}
        </div>
      ))}
    </div>
  )
}

// ─── Particle burst ──────────────────────────────────────────────────────────
interface Particle { id: number; x: number; y: number; vx: number; vy: number; color: string; size: number; life: number }

export function ParticleBurst({ active, x = 50, y = 50 }: { active: boolean; x?: number; y?: number }) {
  const [particles, setParticles] = useState<Particle[]>([])
  const frameRef = useRef<number>(0)
  const lastActive = useRef(false)

  useEffect(() => {
    if (active && !lastActive.current) {
      const colors = ['#fbbf24', '#22c55e', '#3b82f6', '#f87171', '#a78bfa', '#fb923c']
      const newParticles: Particle[] = Array.from({ length: 40 }, (_, i) => {
        const angle = (i / 40) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
        const speed = 1 + Math.random() * 3
        return {
          id: i,
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 4 + Math.random() * 8,
          life: 1,
        }
      })
      setParticles(newParticles)
    }
    lastActive.current = active
  }, [active, x, y])

  useEffect(() => {
    if (particles.length === 0) return
    const animate = () => {
      setParticles(prev => {
        const next = prev
          .map(p => ({ ...p, x: p.x + p.vx * 0.8, y: p.y + p.vy * 0.8, vy: p.vy + 0.08, life: p.life - 0.025 }))
          .filter(p => p.life > 0)
        return next
      })
      frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [particles.length > 0])

  if (particles.length === 0) return null
  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            opacity: p.life,
            transform: 'translate(-50%,-50%)',
            boxShadow: `0 0 ${p.size}px ${p.color}`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Animated score reveal ────────────────────────────────────────────────────
function useCountUp(target: number, duration = 600) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const start = performance.now()
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(target * ease))
      if (t < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return value
}

type RevealStep = 'chips' | 'mult' | 'score' | 'done'

export function AnimatedScoreReveal({
  chips,
  mult,
  score,
  handName,
  handEmoji,
  handLevel,
  breakdown,
  onDone,
}: {
  chips: number
  mult: number
  score: number
  handName: string
  handEmoji: string
  handLevel: number
  breakdown: string[]
  onDone: () => void
}) {
  const [step, setStep] = useState<RevealStep>('chips')
  const [multPulsing, setMultPulsing] = useState(false)
  const [scorePulsing, setScorePulsing] = useState(false)
  const chipDisplay = useCountUp(step !== 'chips' ? chips : 0, 500)
  const multDisplay = useCountUp(step === 'mult' || step === 'score' || step === 'done' ? Math.floor(mult) : 0, 300)

  useEffect(() => {
    // chips phase - tick sounds while counting
    let tickInterval: ReturnType<typeof setInterval> | null = null
    if (step === 'chips') {
      tickInterval = setInterval(sfxChipTick, 40)
    }
    return () => { if (tickInterval) clearInterval(tickInterval) }
  }, [step])

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    timers.push(setTimeout(() => {
      setStep('chips')
    }, 100))

    timers.push(setTimeout(() => {
      setStep('mult')
      setMultPulsing(true)
      sfxMultFlash()
      setTimeout(() => setMultPulsing(false), 300)
    }, 700))

    timers.push(setTimeout(() => {
      setStep('score')
      setScorePulsing(true)
      sfxScoreReveal(score)
      setTimeout(() => setScorePulsing(false), 400)
    }, 1100))

    timers.push(setTimeout(() => {
      setStep('done')
      onDone()
    }, 2000))

    return () => timers.forEach(clearTimeout)
  }, [])

  const displayMult = mult % 1 !== 0 ? mult.toFixed(1) : mult

  return (
    <div className="score-reveal-overlay flex flex-col items-center justify-center gap-3 p-4">
      {/* Hand name */}
      <div className="flex items-center gap-2 score-reveal-hand">
        <span className="text-3xl">{handEmoji}</span>
        <div>
          <div className="font-black text-xl text-amber-400 uppercase" style={{ fontFamily: 'Oswald, sans-serif' }}>
            {handName}
          </div>
          {handLevel > 1 && (
            <div className="text-xs text-green-400 font-bold">Nível {handLevel}</div>
          )}
        </div>
      </div>

      {/* Chips × Mult = Score */}
      <div className="flex items-center gap-3 flex-wrap justify-center">
        {/* Chips */}
        <div className={`score-pill score-pill-chips ${step !== 'chips' ? 'score-pill-active' : 'score-pill-counting'}`}>
          <span className="score-label">Chips</span>
          <span className="score-value" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {chipDisplay.toLocaleString()}
          </span>
        </div>

        <div className="text-2xl font-black text-slate-400">×</div>

        {/* Mult */}
        <div className={`score-pill score-pill-mult ${step === 'mult' || step === 'score' || step === 'done' ? 'score-pill-active' : 'score-pill-dim'} ${multPulsing ? 'score-pill-pulse' : ''}`}>
          <span className="score-label">Mult</span>
          <span className="score-value" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {step === 'chips' ? '?' : displayMult}
          </span>
        </div>

        <div className="text-2xl font-black text-slate-400">=</div>

        {/* Score */}
        <div className={`score-pill score-pill-score ${step === 'score' || step === 'done' ? 'score-pill-active' : 'score-pill-dim'} ${scorePulsing ? 'score-pill-pulse-gold' : ''}`}>
          <span className="score-label">Score</span>
          <span className="score-value" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {step === 'score' || step === 'done' ? score.toLocaleString() : '?'}
          </span>
        </div>
      </div>

      {/* Breakdown */}
      {breakdown.length > 1 && (
        <div className="text-[10px] text-slate-500 text-center max-w-xs">
          {breakdown.slice(1).join(' · ')}
        </div>
      )}
    </div>
  )
}

// ─── Joker activation flash ──────────────────────────────────────────────────
export function JokerGlow({ active }: { active: boolean }) {
  useEffect(() => {
    if (active) sfxJokerActivate()
  }, [active])

  if (!active) return null
  return <div className="joker-glow-ring" />
}

// ─── Ambient background particles ────────────────────────────────────────────
const AMBIENT_EMOJIS = ['🥩', '🍔', '🌿', '👑', '⭐', '🐔', '🦴', '🌭', '🍗', '🥓']

export function AmbientBackground() {
  return (
    <div className="ambient-bg absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      {AMBIENT_EMOJIS.map((emoji, i) => (
        <div
          key={i}
          className="ambient-particle"
          style={{
            left: `${(i * 11 + 5) % 100}%`,
            animationDelay: `${i * 1.3}s`,
            animationDuration: `${12 + i * 1.5}s`,
            fontSize: `${14 + (i % 3) * 6}px`,
          }}
        >
          {emoji}
        </div>
      ))}
    </div>
  )
}

// ─── Screen flash ─────────────────────────────────────────────────────────────
export function ScreenFlash({ color = '#ffffff', active }: { color?: string; active: boolean }) {
  if (!active) return null
  return (
    <div
      className="absolute inset-0 pointer-events-none z-40 screen-flash"
      style={{ background: color }}
    />
  )
}
