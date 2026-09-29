import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
const STEPS = [
    {
        title: 'As Linhas de Produto',
        emoji: '🃏',
        content: 'Você tem 4 linhas de produto Swift. Cada uma tem cartas com valores de Chips diferentes. Combinar cartas da mesma linha cria mãos mais fortes!',
        visual: (_jsx("div", { className: "flex gap-2 justify-center flex-wrap", children: [
                { line: 'Orgânica', emoji: '🌿', color: '#16a34a', bg: '#052e16', chips: 12 },
                { line: 'Swift Mais', emoji: '⭐', color: '#2563eb', bg: '#1e1b4b', chips: 9 },
                { line: 'Premium', emoji: '👑', color: '#dc2626', bg: '#450a0a', chips: 19 },
                { line: 'Clássico', emoji: '🌾', color: '#d97706', bg: '#451a03', chips: 8 },
            ].map(l => (_jsxs("div", { className: "rounded-xl p-3 text-center border-2 flex flex-col items-center", style: { borderColor: l.color, background: l.bg, width: 80 }, children: [_jsx("div", { className: "text-2xl mb-1", children: l.emoji }), _jsx("div", { className: "text-[9px] font-bold uppercase", style: { color: l.color, fontFamily: 'Oswald, sans-serif' }, children: l.line }), _jsxs("div", { className: "text-xs font-bold mt-1", style: { color: '#60a5fa', fontFamily: 'JetBrains Mono, monospace' }, children: [l.chips, " chips"] })] }, l.line))) })),
    },
    {
        title: 'Chips × Multiplicador',
        emoji: '🧮',
        content: 'Selecione 1 a 5 cartas e clique em "Jogar". O tipo de mão determina os Chips e Mult base. Cada carta adiciona seus Chips. O score final é Chips × Mult!',
        visual: (_jsxs("div", { className: "flex flex-col items-center gap-3", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm", children: [_jsx("div", { className: "rounded-lg px-3 py-1.5 font-black", style: { background: '#1e3a5f', border: '2px solid #3b82f6', color: '#93c5fd', fontFamily: 'JetBrains Mono, monospace' }, children: "150 Chips" }), _jsx("span", { className: "text-slate-400 font-bold text-lg", children: "\u00D7" }), _jsx("div", { className: "rounded-lg px-3 py-1.5 font-black", style: { background: '#4a1515', border: '2px solid #dc2626', color: '#fca5a5', fontFamily: 'JetBrains Mono, monospace' }, children: "4 Mult" }), _jsx("span", { className: "text-slate-400 font-bold text-lg", children: "=" }), _jsx("div", { className: "rounded-lg px-4 py-1.5 font-black text-lg", style: { background: '#3d2800', border: '2px solid #fbbf24', color: '#fbbf24', fontFamily: 'JetBrains Mono, monospace' }, children: "600" })] }), _jsx("div", { className: "grid grid-cols-2 gap-2 text-xs text-center max-w-xs", children: [
                        { hand: 'Pedido Simples', chips: 5, mult: 1 },
                        { hand: 'Dupla', chips: 10, mult: 2 },
                        { hand: 'Trio', chips: 30, mult: 3 },
                        { hand: 'Full Combo (5x)', chips: 100, mult: 6 },
                    ].map(h => (_jsxs("div", { className: "rounded-lg px-2 py-1.5", style: { background: '#1a1733', border: '1px solid #2d2850' }, children: [_jsx("div", { className: "font-bold text-white", style: { fontFamily: 'Oswald, sans-serif' }, children: h.hand }), _jsxs("div", { className: "text-[10px] mt-0.5", style: { fontFamily: 'JetBrains Mono, monospace' }, children: [_jsxs("span", { style: { color: '#60a5fa' }, children: ["+", h.chips, "C"] }), ' ', _jsxs("span", { style: { color: '#f87171' }, children: ["\u00D7", h.mult, "M"] })] })] }, h.hand))) })] })),
    },
    {
        title: 'Jogadas e Descartes',
        emoji: '🎯',
        content: 'Você tem 4 Jogadas e 3 Descartes por Blind. Jogar = conta pontos e consome uma jogada. Descartar = troca as cartas sem pontuar. Use bem os descartes para montar mãos melhores!',
        visual: (_jsxs("div", { className: "flex flex-col items-center gap-3", children: [_jsxs("div", { className: "flex gap-6", children: [_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-xs text-slate-400 uppercase mb-2", style: { fontFamily: 'Oswald, sans-serif' }, children: "Jogadas" }), _jsx("div", { className: "flex gap-1", children: [...Array(4)].map((_, i) => (_jsx("div", { className: `w-4 h-4 rounded-full ${i < 4 ? 'bg-blue-500' : 'bg-slate-700'}` }, i))) }), _jsx("div", { className: "text-[10px] text-blue-400 mt-1", children: "Pontuam" })] }), _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-xs text-slate-400 uppercase mb-2", style: { fontFamily: 'Oswald, sans-serif' }, children: "Descartes" }), _jsx("div", { className: "flex gap-1", children: [...Array(3)].map((_, i) => (_jsx("div", { className: `w-4 h-4 rounded-full ${i < 3 ? 'bg-amber-500' : 'bg-slate-700'}` }, i))) }), _jsx("div", { className: "text-[10px] text-amber-400 mt-1", children: "S\u00F3 trocam" })] })] }), _jsxs("div", { className: "rounded-xl px-4 py-3 text-center text-xs", style: { background: '#1a1733', border: '1px solid #2d2850', maxWidth: 260 }, children: [_jsx("div", { className: "text-amber-400 font-bold mb-1", children: "\uD83D\uDCA1 Dica Pro" }), _jsx("div", { className: "text-slate-300", children: "Se n\u00E3o tiver cartas boas, use um descarte para renovar a m\u00E3o antes de jogar uma m\u00E3o fraca!" })] })] })),
    },
    {
        title: 'Blinds e Antes',
        emoji: '🎲',
        content: 'Cada Ante tem 3 blinds: Small → Big → Boss. A meta de score sobe a cada blind. Boss Blinds têm um debuff especial! Você pode pular Small e Big blinds por $2 cada.',
        visual: (_jsx("div", { className: "flex flex-col gap-2 max-w-xs", children: [
                { type: 'Small Blind', mult: '×1', reward: '+$3', color: '#22c55e', desc: 'Meta base' },
                { type: 'Big Blind', mult: '×3', reward: '+$4', color: '#eab308', desc: 'Meta ×3' },
                { type: 'Boss Blind', mult: '×9', reward: '+$5', color: '#ef4444', desc: 'Meta ×9 + debuff' },
            ].map(b => (_jsxs("div", { className: "flex items-center gap-3 rounded-lg px-3 py-2", style: { background: '#1a1733', border: `1px solid ${b.color}44` }, children: [_jsx("div", { className: "font-bold text-xs w-20", style: { color: b.color, fontFamily: 'Oswald, sans-serif' }, children: b.type }), _jsx("div", { className: "flex-1 text-[10px] text-slate-400", children: b.desc }), _jsx("div", { className: "text-[10px] font-bold text-amber-400", style: { fontFamily: 'JetBrains Mono, monospace' }, children: b.mult }), _jsx("div", { className: "text-[10px] font-bold text-green-400", style: { fontFamily: 'JetBrains Mono, monospace' }, children: b.reward })] }, b.type))) })),
    },
    {
        title: 'Jokers e a Loja',
        emoji: '🎩',
        content: 'Após cada Blind, você vai à Loja! Compre Jokers (efeitos permanentes) e Planetas (sobem o nível de mãos). Jokers são como funcionários — ficam com você até o fim!',
        visual: (_jsxs("div", { className: "flex flex-col gap-2 items-center", children: [_jsx("div", { className: "grid grid-cols-2 gap-2", children: [
                        { emoji: '🔪', name: 'Zé Açougueiro', desc: '+4 Mult em Trios+', rarity: 'incomum', cost: 4 },
                        { emoji: '👨‍🍳', name: 'Chef Augusto', desc: '×2 Mult em Premium', rarity: 'raro', cost: 8 },
                    ].map(j => (_jsxs("div", { className: "rounded-xl p-2 text-center", style: { background: '#1a1733', border: '1px solid #2d2850', width: 110 }, children: [_jsx("div", { className: "text-2xl", children: j.emoji }), _jsx("div", { className: "font-bold text-[9px] text-white mt-0.5", style: { fontFamily: 'Oswald, sans-serif' }, children: j.name }), _jsx("div", { className: `text-[8px] uppercase mt-0.5 ${j.rarity === 'raro' ? 'text-amber-400' : 'text-blue-400'}`, children: j.rarity }), _jsx("div", { className: "text-[8px] text-slate-300 mt-0.5", children: j.desc }), _jsxs("div", { className: "text-xs font-bold text-amber-400 mt-1", style: { fontFamily: 'JetBrains Mono, monospace' }, children: ["$", j.cost] })] }, j.name))) }), _jsx("div", { className: "text-[10px] text-slate-400 text-center max-w-48", children: "\uD83C\uDF0D Planetas sobem Chips e Mult dos tipos de m\u00E3o. M\u00E1ximo de 5 Jokers simult\u00E2neos." })] })),
    },
];
export default function Tutorial({ onClose }) {
    const [step, setStep] = useState(0);
    const current = STEPS[step];
    const isLast = step === STEPS.length - 1;
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center", style: { background: 'rgba(0,0,0,0.85)' }, children: _jsxs("div", { className: "rounded-2xl overflow-hidden max-w-md w-full mx-4 tutorial-enter", style: { background: '#110f22', border: '2px solid #2d2850' }, children: [_jsxs("div", { className: "px-5 pt-5 pb-3 flex items-center gap-3", style: { borderBottom: '1px solid #1a1733' }, children: [_jsx("div", { className: "text-3xl", children: current.emoji }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "text-[10px] text-slate-500 uppercase tracking-widest", style: { fontFamily: 'Oswald, sans-serif' }, children: ["Tutorial \u2014 Passo ", step + 1, "/", STEPS.length] }), _jsx("div", { className: "font-black text-lg text-white", style: { fontFamily: 'Oswald, sans-serif' }, children: current.title })] }), _jsx("button", { onClick: onClose, className: "text-slate-600 hover:text-slate-300 transition-colors text-xl", children: "\u2715" })] }), _jsxs("div", { className: "px-5 py-4", children: [_jsx("p", { className: "text-sm text-slate-300 leading-relaxed mb-4", children: current.content }), _jsx("div", { className: "flex justify-center", children: current.visual })] }), _jsx("div", { className: "flex justify-center gap-1.5 py-2", children: STEPS.map((_, i) => (_jsx("button", { onClick: () => setStep(i), className: `rounded-full transition-all ${i === step ? 'w-5 h-2 bg-amber-400' : 'w-2 h-2 bg-slate-600 hover:bg-slate-400'}` }, i))) }), _jsxs("div", { className: "px-5 pb-5 flex gap-3 justify-between", children: [_jsx("button", { onClick: () => setStep(s => Math.max(0, s - 1)), disabled: step === 0, className: "btn-secondary px-5 py-2 rounded-xl text-sm", children: "\u2190 Voltar" }), isLast ? (_jsx("button", { onClick: onClose, className: "btn-primary px-6 py-2 rounded-xl text-sm flex-1", children: "Jogar! \uD83E\uDD69" })) : (_jsx("button", { onClick: () => setStep(s => s + 1), className: "btn-primary px-6 py-2 rounded-xl text-sm flex-1", children: "Pr\u00F3ximo \u2192" }))] })] }) }));
}
