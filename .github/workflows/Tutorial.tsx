import { useState } from 'react'

interface Step {
  title: string
  emoji: string
  content: string
  visual: React.ReactNode
}

const STEPS: Step[] = [
  {
    title: 'As Linhas de Produto',
    emoji: '🃏',
    content: 'Você tem 4 linhas de produto Swift. Cada uma tem cartas com valores de Chips diferentes. Combinar cartas da mesma linha cria mãos mais fortes!',
    visual: (
      <div className="flex gap-2 justify-center flex-wrap">
        {[
          { line: 'Orgânica', emoji: '🌿', color: '#16a34a', bg: '#052e16', chips: 12 },
          { line: 'Swift Mais', emoji: '⭐', color: '#2563eb', bg: '#1e1b4b', chips: 9 },
          { line: 'Premium', emoji: '👑', color: '#dc2626', bg: '#450a0a', chips: 19 },
          { line: 'Clássico', emoji: '🌾', color: '#d97706', bg: '#451a03', chips: 8 },
        ].map(l => (
          <div key={l.line} className="rounded-xl p-3 text-center border-2 flex flex-col items-center"
            style={{ borderColor: l.color, background: l.bg, width: 80 }}>
            <div className="text-2xl mb-1">{l.emoji}</div>
            <div className="text-[9px] font-bold uppercase" style={{ color: l.color, fontFamily: 'Oswald, sans-serif' }}>{l.line}</div>
            <div className="text-xs font-bold mt-1" style={{ color: '#60a5fa', fontFamily: 'JetBrains Mono, monospace' }}>{l.chips} chips</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Chips × Multiplicador',
    emoji: '🧮',
    content: 'Selecione 1 a 5 cartas e clique em "Jogar". O tipo de mão determina os Chips e Mult base. Cada carta adiciona seus Chips. O score final é Chips × Mult!',
    visual: (
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <div className="rounded-lg px-3 py-1.5 font-black" style={{ background: '#1e3a5f', border: '2px solid #3b82f6', color: '#93c5fd', fontFamily: 'JetBrains Mono, monospace' }}>
            150 Chips
          </div>
          <span className="text-slate-400 font-bold text-lg">×</span>
          <div className="rounded-lg px-3 py-1.5 font-black" style={{ background: '#4a1515', border: '2px solid #dc2626', color: '#fca5a5', fontFamily: 'JetBrains Mono, monospace' }}>
            4 Mult
          </div>
          <span className="text-slate-400 font-bold text-lg">=</span>
          <div className="rounded-lg px-4 py-1.5 font-black text-lg" style={{ background: '#3d2800', border: '2px solid #fbbf24', color: '#fbbf24', fontFamily: 'JetBrains Mono, monospace' }}>
            600
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-center max-w-xs">
          {[
            { hand: 'Pedido Simples', chips: 5, mult: 1 },
            { hand: 'Dupla', chips: 10, mult: 2 },
            { hand: 'Trio', chips: 30, mult: 3 },
            { hand: 'Full Combo (5x)', chips: 100, mult: 6 },
          ].map(h => (
            <div key={h.hand} className="rounded-lg px-2 py-1.5" style={{ background: '#1a1733', border: '1px solid #2d2850' }}>
              <div className="font-bold text-white" style={{ fontFamily: 'Oswald, sans-serif' }}>{h.hand}</div>
              <div className="text-[10px] mt-0.5" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                <span style={{ color: '#60a5fa' }}>+{h.chips}C</span>
                {' '}<span style={{ color: '#f87171' }}>×{h.mult}M</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Jogadas e Descartes',
    emoji: '🎯',
    content: 'Você tem 4 Jogadas e 3 Descartes por Blind. Jogar = conta pontos e consome uma jogada. Descartar = troca as cartas sem pontuar. Use bem os descartes para montar mãos melhores!',
    visual: (
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-6">
          <div className="text-center">
            <div className="text-xs text-slate-400 uppercase mb-2" style={{ fontFamily: 'Oswald, sans-serif' }}>Jogadas</div>
            <div className="flex gap-1">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`w-4 h-4 rounded-full ${i < 4 ? 'bg-blue-500' : 'bg-slate-700'}`} />
              ))}
            </div>
            <div className="text-[10px] text-blue-400 mt-1">Pontuam</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400 uppercase mb-2" style={{ fontFamily: 'Oswald, sans-serif' }}>Descartes</div>
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={`w-4 h-4 rounded-full ${i < 3 ? 'bg-amber-500' : 'bg-slate-700'}`} />
              ))}
            </div>
            <div className="text-[10px] text-amber-400 mt-1">Só trocam</div>
          </div>
        </div>
        <div className="rounded-xl px-4 py-3 text-center text-xs" style={{ background: '#1a1733', border: '1px solid #2d2850', maxWidth: 260 }}>
          <div className="text-amber-400 font-bold mb-1">💡 Dica Pro</div>
          <div className="text-slate-300">Se não tiver cartas boas, use um descarte para renovar a mão antes de jogar uma mão fraca!</div>
        </div>
      </div>
    ),
  },
  {
    title: 'Blinds e Antes',
    emoji: '🎲',
    content: 'Cada Ante tem 3 blinds: Small → Big → Boss. A meta de score sobe a cada blind. Boss Blinds têm um debuff especial! Você pode pular Small e Big blinds por $2 cada.',
    visual: (
      <div className="flex flex-col gap-2 max-w-xs">
        {[
          { type: 'Small Blind', mult: '×1', reward: '+$3', color: '#22c55e', desc: 'Meta base' },
          { type: 'Big Blind', mult: '×3', reward: '+$4', color: '#eab308', desc: 'Meta ×3' },
          { type: 'Boss Blind', mult: '×9', reward: '+$5', color: '#ef4444', desc: 'Meta ×9 + debuff' },
        ].map(b => (
          <div key={b.type} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: '#1a1733', border: `1px solid ${b.color}44` }}>
            <div className="font-bold text-xs w-20" style={{ color: b.color, fontFamily: 'Oswald, sans-serif' }}>{b.type}</div>
            <div className="flex-1 text-[10px] text-slate-400">{b.desc}</div>
            <div className="text-[10px] font-bold text-amber-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{b.mult}</div>
            <div className="text-[10px] font-bold text-green-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{b.reward}</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Jokers e a Loja',
    emoji: '🎩',
    content: 'Após cada Blind, você vai à Loja! Compre Jokers (efeitos permanentes) e Planetas (sobem o nível de mãos). Jokers são como funcionários — ficam com você até o fim!',
    visual: (
      <div className="flex flex-col gap-2 items-center">
        <div className="grid grid-cols-2 gap-2">
          {[
            { emoji: '🔪', name: 'Zé Açougueiro', desc: '+4 Mult em Trios+', rarity: 'incomum', cost: 4 },
            { emoji: '👨‍🍳', name: 'Chef Augusto', desc: '×2 Mult em Premium', rarity: 'raro', cost: 8 },
          ].map(j => (
            <div key={j.name} className="rounded-xl p-2 text-center" style={{ background: '#1a1733', border: '1px solid #2d2850', width: 110 }}>
              <div className="text-2xl">{j.emoji}</div>
              <div className="font-bold text-[9px] text-white mt-0.5" style={{ fontFamily: 'Oswald, sans-serif' }}>{j.name}</div>
              <div className={`text-[8px] uppercase mt-0.5 ${j.rarity === 'raro' ? 'text-amber-400' : 'text-blue-400'}`}>{j.rarity}</div>
              <div className="text-[8px] text-slate-300 mt-0.5">{j.desc}</div>
              <div className="text-xs font-bold text-amber-400 mt-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>${j.cost}</div>
            </div>
          ))}
        </div>
        <div className="text-[10px] text-slate-400 text-center max-w-48">
          🌍 Planetas sobem Chips e Mult dos tipos de mão. Máximo de 5 Jokers simultâneos.
        </div>
      </div>
    ),
  },
]

export default function Tutorial({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="rounded-2xl overflow-hidden max-w-md w-full mx-4 tutorial-enter"
        style={{ background: '#110f22', border: '2px solid #2d2850' }}>

        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-center gap-3"
          style={{ borderBottom: '1px solid #1a1733' }}>
          <div className="text-3xl">{current.emoji}</div>
          <div className="flex-1">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest" style={{ fontFamily: 'Oswald, sans-serif' }}>
              Tutorial — Passo {step + 1}/{STEPS.length}
            </div>
            <div className="font-black text-lg text-white" style={{ fontFamily: 'Oswald, sans-serif' }}>
              {current.title}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors text-xl">✕</button>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          <p className="text-sm text-slate-300 leading-relaxed mb-4">{current.content}</p>
          <div className="flex justify-center">
            {current.visual}
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 py-2">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`rounded-full transition-all ${i === step ? 'w-5 h-2 bg-amber-400' : 'w-2 h-2 bg-slate-600 hover:bg-slate-400'}`}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-3 justify-between">
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="btn-secondary px-5 py-2 rounded-xl text-sm"
          >
            ← Voltar
          </button>
          {isLast ? (
            <button onClick={onClose} className="btn-primary px-6 py-2 rounded-xl text-sm flex-1">
              Jogar! 🥩
            </button>
          ) : (
            <button onClick={() => setStep(s => s + 1)} className="btn-primary px-6 py-2 rounded-xl text-sm flex-1">
              Próximo →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
