import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useCallback, useEffect } from 'react';
import { ALL_CARDS, ALL_JOKERS, ALL_PLANETS, ALL_PLANETS_CHALLENGE, BASE_HAND_LEVELS, HAND_LEVEL_STEP, LINE_META, ANTE_BASES, BOSS_DEBUFFS, getBlinds, shuffle, makeDeck, } from './data.js';
import { scoreHand, calcReward } from './logic.js';
import { FloatingTexts, ParticleBurst, AnimatedScoreReveal, AmbientBackground, ScreenFlash, useFloatingTexts, } from './effects.js';
import Tutorial from './Tutorial.js';
import { sfxCardSelect, sfxCardDeselect, sfxCardDeal, sfxDiscard, sfxBuy, sfxBlindWin, sfxGameOver, sfxBossEntry, sfxLevelUp, setMuted, } from './sounds.js';
// ─── Constants ───────────────────────────────────────────────────────────────
const HAND_SIZE = 8;
const MAX_PLAYS = 4;
const MAX_DISCARDS = 3;
const MAX_JOKERS = 5;
const LB_KEY = 'swiftcards_lb';
const LB_CHALLENGE_KEY = 'swiftcards_lb_challenge';
const CHALLENGE_UNLOCKED_KEY = 'swiftcards_unlocked';
function loadLeader(key = LB_KEY) {
    try {
        return JSON.parse(localStorage.getItem(key) ?? '[]');
    }
    catch {
        return [];
    }
}
function saveLeader(e, key = LB_KEY) {
    const lb = loadLeader(key);
    lb.push(e);
    lb.sort((a, b) => b.score - a.score);
    localStorage.setItem(key, JSON.stringify(lb.slice(0, 10)));
}
function isChallengeUnlocked() {
    return localStorage.getItem(CHALLENGE_UNLOCKED_KEY) === '1';
}
function unlockChallenge() {
    localStorage.setItem(CHALLENGE_UNLOCKED_KEY, '1');
}
// Bases do modo desafio — ~2.5× mais difícil
const ANTE_BASES_CHALLENGE = [750, 2000, 5000, 12000, 28000, 55000, 90000, 160000];
// ─── Helpers ─────────────────────────────────────────────────────────────────
function buildHandLevels() {
    return Object.fromEntries(Object.entries(BASE_HAND_LEVELS).map(([k, v]) => [k, { ...v }]));
}
function getTarget(ante, blindIndex, blinds, isChallenge = false) {
    const bases = isChallenge ? ANTE_BASES_CHALLENGE : ANTE_BASES;
    const base = bases[Math.min(ante - 1, bases.length - 1)];
    return Math.round(base * (blinds[blindIndex]?.targetMultiplier ?? 1));
}
function makeBossDebuff(blinds, blindIndex) {
    const b = blinds[blindIndex];
    return b?.type === 'boss' ? (b.boss ?? null) : null;
}
function makeBossDebuff2(blinds, blindIndex) {
    const b = blinds[blindIndex];
    return b?.type === 'boss' ? (b.boss2 ?? null) : null;
}
const RARITY_ORDER = ['comum', 'incomum', 'raro', 'epico', 'lendario'];
function getJokerWeights(ante) {
    // ante 1: quase só comum/incomum
    // ante 3+ (após 2º boss): raro começa a aparecer bem
    // ante 5+: épico e lendário com chance real
    if (ante <= 2)
        return { comum: 0.58, incomum: 0.30, raro: 0.09, epico: 0.02, lendario: 0.01 };
    if (ante === 3)
        return { comum: 0.35, incomum: 0.30, raro: 0.25, epico: 0.07, lendario: 0.03 };
    if (ante === 4)
        return { comum: 0.20, incomum: 0.25, raro: 0.32, epico: 0.16, lendario: 0.07 };
    if (ante === 5)
        return { comum: 0.10, incomum: 0.18, raro: 0.35, epico: 0.25, lendario: 0.12 };
    if (ante === 6)
        return { comum: 0.05, incomum: 0.12, raro: 0.30, epico: 0.32, lendario: 0.21 };
    if (ante === 7)
        return { comum: 0.03, incomum: 0.08, raro: 0.24, epico: 0.35, lendario: 0.30 };
    /* ante 8 */ return { comum: 0.01, incomum: 0.05, raro: 0.18, epico: 0.36, lendario: 0.40 };
}
function weightedPickJoker(pool, weights) {
    if (pool.length === 0)
        return null;
    const totalWeight = pool.reduce((sum, j) => sum + (weights[j.rarity] ?? 0), 0);
    if (totalWeight === 0)
        return pool[Math.floor(Math.random() * pool.length)];
    let rand = Math.random() * totalWeight;
    for (const j of pool) {
        rand -= weights[j.rarity] ?? 0;
        if (rand <= 0)
            return j;
    }
    return pool[pool.length - 1];
}
function freshShop(owned, ante = 1, isChallenge = false) {
    const available = ALL_JOKERS.filter(j => !owned.some(o => o.id === j.id));
    const weights = getJokerWeights(ante);
    const picked = [];
    const pool = [...available];
    for (let i = 0; i < 2 && pool.length > 0; i++) {
        const chosen = weightedPickJoker(pool, weights);
        if (!chosen)
            break;
        picked.push(chosen);
        pool.splice(pool.indexOf(chosen), 1);
    }
    const planetPool = isChallenge ? ALL_PLANETS_CHALLENGE : ALL_PLANETS;
    return {
        shopJokers: picked,
        shopPlanets: shuffle([...planetPool]).slice(0, 2),
    };
}
function createInitial(isChallenge = false) {
    const blinds = getBlinds(1);
    const deck = makeDeck();
    return {
        phase: 'menu', ante: 1, blindIndex: 0, blinds,
        hand: [], deck, discardPile: [], selectedIds: new Set(),
        runningScore: 0, playsLeft: MAX_PLAYS, discardsLeft: MAX_DISCARDS,
        jokers: [], handLevels: buildHandLevels(), money: 4,
        lastScore: null, showReveal: false, revealDone: false,
        isFirstPlay: true, playsMadeThisBlind: 0,
        dealAnimCards: new Set(), playHistory: [],
        shopSpent: 0, prevChips: 0, historyId: 0, rerollCost: 3, totalScore: 0,
        isChallenge, prevHandType: null, franqueadoBonus: 0,
        ...freshShop([], 1, isChallenge),
    };
}
// ─── Style maps ───────────────────────────────────────────────────────────────
const LINE_CLASS = {
    organica: 'card-organica', mais: 'card-mais',
    premium: 'card-premium', classico: 'card-classico',
};
const LINE_BADGE = {
    organica: 'bg-green-900/80 text-green-300 border-green-700',
    mais: 'bg-blue-900/80 text-blue-300 border-blue-700',
    premium: 'bg-red-900/80 text-red-300 border-red-700',
    classico: 'bg-amber-900/80 text-amber-300 border-amber-700',
};
const RARITY_STYLE = {
    comum: { label: 'Comum', border: '#4b5563', glow: 'rgba(75,85,99,0.3)', badge: 'text-slate-400 bg-slate-800/60 border-slate-600' },
    incomum: { label: 'Incomum', border: '#3b82f6', glow: 'rgba(59,130,246,0.3)', badge: 'text-blue-300 bg-blue-900/60 border-blue-600' },
    raro: { label: 'Raro', border: '#ef4444', glow: 'rgba(239,68,68,0.35)', badge: 'text-red-300 bg-red-900/60 border-red-600' },
    epico: { label: 'Épico', border: '#a855f7', glow: 'rgba(168,85,247,0.4)', badge: 'text-purple-300 bg-purple-900/60 border-purple-600' },
    lendario: { label: 'Lendário', border: '#fbbf24', glow: 'rgba(251,191,36,0.5)', badge: 'text-amber-300 bg-amber-900/60 border-amber-500' },
};
// ─── Sub-components ───────────────────────────────────────────────────────────
function CardUI({ card, selected, onClick, small, debuffed, dealing }) {
    return (_jsxs("div", { onClick: onClick, className: `card-base relative border-2 rounded-xl overflow-hidden select-none flex-shrink-0
        ${LINE_CLASS[card.line]} ${selected ? 'card-selected' : ''}
        ${debuffed ? 'opacity-40 grayscale' : ''} ${dealing ? 'card-deal' : ''}`, style: { width: small ? 56 : 72, minWidth: small ? 56 : 72, height: small ? 76 : 100 }, children: [_jsx("div", { className: "card-shine" }), _jsxs("div", { className: "flex flex-col h-full p-1 gap-0.5", children: [_jsx("div", { className: `text-center rounded border text-[7px] font-bold uppercase tracking-wide ${LINE_BADGE[card.line]}`, style: { fontFamily: 'Oswald, sans-serif', padding: '1px 2px' }, children: LINE_META[card.line].emoji }), _jsx("div", { className: `flex-1 flex items-center justify-center ${small ? 'text-xl' : 'text-2xl'}`, children: card.emoji }), _jsx("div", { className: "text-center font-bold leading-tight text-white text-[7px]", style: { fontFamily: 'Oswald, sans-serif' }, children: card.name }), _jsx("div", { className: "text-center font-bold text-[10px]", style: { fontFamily: 'JetBrains Mono, monospace', color: debuffed ? '#6b7280' : '#60a5fa' }, children: debuffed ? '✕' : card.chips })] })] }));
}
function JokerCard({ joker, owned, canAfford, onBuy, onSell, compact }) {
    const rs = RARITY_STYLE[joker.rarity];
    const sellPrice = Math.floor(joker.cost / 2);
    return (_jsxs("div", { className: "employee-card rounded-xl flex flex-col items-center text-center relative overflow-hidden", style: { border: `1px solid ${rs.border}`, boxShadow: `0 0 8px ${rs.glow}`, minWidth: compact ? 80 : 100, padding: compact ? '0.5rem' : '0.75rem' }, children: [_jsx("div", { className: compact ? 'text-2xl mb-0.5' : 'text-3xl mb-1', children: joker.emoji }), _jsx("div", { className: `font-bold text-white ${compact ? 'text-[9px]' : 'text-xs'} mb-0.5 leading-tight`, style: { fontFamily: 'Oswald, sans-serif' }, children: joker.name }), _jsx("div", { className: `text-[8px] uppercase tracking-wider mb-1 font-bold border rounded-full px-1.5 py-px ${rs.badge}`, children: rs.label }), !compact && (_jsx("div", { className: "text-[9px] text-slate-300 leading-tight mb-2 flex-1", children: joker.description })), !owned && onBuy && (_jsxs("button", { onClick: onBuy, disabled: !canAfford, className: "btn-primary rounded-lg px-2 py-1 text-[10px] w-full", children: ["$", joker.cost] })), owned && onSell && (_jsxs("button", { onClick: onSell, className: "btn-danger rounded-lg px-2 py-1 text-[9px] w-full mt-1", children: ["Vender $", sellPrice] })), owned && !onSell && (_jsx("div", { className: "text-[9px] text-green-400 font-bold", children: "\u2713 Ativo" }))] }));
}
function HistoryEntry({ entry }) {
    return (_jsxs("div", { className: "flex items-center justify-between px-2 py-1 rounded-lg", style: { background: '#0d0b1e', border: '1px solid #1a1733' }, children: [_jsx("span", { className: "text-sm", children: entry.handEmoji }), _jsxs("div", { className: "flex-1 mx-2", children: [_jsx("div", { className: "text-[9px] text-slate-400 leading-none", style: { fontFamily: 'Oswald, sans-serif' }, children: entry.handType }), _jsxs("div", { className: "text-[8px] text-slate-600", style: { fontFamily: 'JetBrains Mono, monospace' }, children: [_jsx("span", { className: "text-blue-400", children: entry.chips }), _jsx("span", { className: "text-slate-600", children: "\u00D7" }), _jsx("span", { className: "text-red-400", children: entry.mult % 1 === 0 ? entry.mult : entry.mult.toFixed(1) })] })] }), _jsx("div", { className: "text-[10px] font-bold text-amber-400", style: { fontFamily: 'JetBrains Mono, monospace' }, children: entry.score.toLocaleString() })] }));
}
// ─── Menu Screen ──────────────────────────────────────────────────────────────
function MenuScreen({ onStart, onChallenge, onTutorial }) {
    const hasChallenge = isChallengeUnlocked();
    return (_jsxs("div", { className: "size-full flex flex-col items-center justify-center relative overflow-hidden", style: { background: 'radial-gradient(ellipse at 50% 30%, #1a0a2e 0%, #080612 65%)' }, children: [_jsx("div", { className: "absolute inset-0 overflow-hidden pointer-events-none", children: ['🥩', '🍔', '🌿', '👑', '⭐', '🐔', '🦴', '🌭', '🍗', '🥓', '🍖', '💎', '🔪'].map((e, i) => (_jsx("div", { className: "absolute text-2xl opacity-10", style: {
                        left: `${(i * 7.7) % 100}%`,
                        animation: `ambientFloat ${14 + i * 1.2}s linear ${i * 1.1}s infinite`,
                        bottom: '-60px',
                        fontSize: `${16 + (i % 4) * 8}px`,
                    }, children: e }, i))) }), _jsx("div", { className: "absolute top-1/4 left-1/4 w-64 h-64 rounded-full pointer-events-none", style: { background: 'radial-gradient(circle, rgba(251,191,36,0.06) 0%, transparent 70%)' } }), _jsx("div", { className: "absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full pointer-events-none", style: { background: 'radial-gradient(circle, rgba(239,68,68,0.06) 0%, transparent 70%)' } }), _jsxs("div", { className: "relative z-10 text-center mb-6", children: [_jsxs("div", { className: "mb-1 relative inline-block", children: [_jsx("div", { className: "font-black uppercase text-white leading-none", style: {
                                    fontFamily: 'Oswald, sans-serif',
                                    fontSize: 'clamp(2.5rem, 8vw, 4rem)',
                                    letterSpacing: '0.08em',
                                    textShadow: '0 0 40px rgba(251,191,36,0.5), 0 0 80px rgba(251,191,36,0.2)',
                                }, children: "SWIFT" }), _jsx("div", { className: "font-black uppercase leading-none", style: {
                                    fontFamily: 'Oswald, sans-serif',
                                    fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
                                    letterSpacing: '0.2em',
                                    color: '#fbbf24',
                                    textShadow: '0 0 20px rgba(251,191,36,0.8)',
                                }, children: "CARDS" })] }), _jsx("div", { className: "text-slate-400 text-sm tracking-wider uppercase", style: { fontFamily: 'Nunito, sans-serif' }, children: "Roguelike de Pr\u00E9-Pedido" })] }), _jsx("div", { className: "relative z-10 flex gap-2 mb-6 opacity-80", children: [
                    ALL_CARDS.find(c => c.id === 'pre1'),
                    ALL_CARDS.find(c => c.id === 'pre2'),
                    ALL_CARDS.find(c => c.id === 'pre3'),
                    ALL_CARDS.find(c => c.id === 'org5'),
                    ALL_CARDS.find(c => c.id === 'mai5'),
                ].filter(Boolean).map((card, i) => (_jsx("div", { style: { transform: `rotate(${(i - 2) * 5}deg) translateY(${Math.abs(i - 2) * 3}px)` }, children: _jsx(CardUI, { card: card }) }, card.id))) }), _jsxs("div", { className: "relative z-10 flex flex-col gap-3 w-56", children: [_jsx("button", { onClick: onStart, className: "btn-primary rounded-2xl py-4 text-xl tracking-widest w-full", style: { boxShadow: '0 0 30px rgba(251,191,36,0.3)' }, children: "\u25B6 JOGAR" }), hasChallenge && (_jsx("button", { onClick: onChallenge, className: "rounded-2xl py-3 text-base tracking-widest w-full font-black", style: { background: '#1c0a00', border: '2px solid #f97316', color: '#f97316', boxShadow: '0 0 20px rgba(249,115,22,0.25)' }, children: "\uD83D\uDC80 DESAFIO" })), _jsx("button", { onClick: onTutorial, className: "btn-secondary rounded-2xl py-3 text-base tracking-widest w-full", children: "? TUTORIAL" })] }), _jsx("div", { className: "absolute bottom-4 z-10 flex gap-4 text-center", children: [['75+', 'Jokers'], ['5', 'Raridades'], ['8', 'Antes'], ...(hasChallenge ? [['💀', 'Desafio']] : [])].map(([n, l]) => (_jsxs("div", { children: [_jsx("div", { className: "font-black text-amber-400 text-base", style: { fontFamily: 'JetBrains Mono, monospace' }, children: n }), _jsx("div", { className: "text-slate-500 text-[10px] uppercase tracking-wider", children: l })] }, l))) })] }));
}
// ─── Main App ─────────────────────────────────────────────────────────────────
// ─── Victory Screen ───────────────────────────────────────────────────────────
function LeaderboardPanel({ lbKey, title, accent, nick, submitted }) {
    const lb = loadLeader(lbKey);
    return (_jsxs("div", { className: "rounded-2xl overflow-hidden flex-1 min-w-0", style: { background: '#0d0b1e', border: `1px solid ${accent}44` }, children: [_jsx("div", { className: "px-3 py-2 text-center text-[10px] uppercase tracking-widest font-bold", style: { background: '#1a1430', fontFamily: 'Oswald, sans-serif', borderBottom: `1px solid ${accent}44`, color: accent }, children: title }), lb.length === 0 ? (_jsx("div", { className: "px-3 py-3 text-center text-slate-500 text-[10px]", children: "Nenhum registro ainda" })) : lb.slice(0, 8).map((e, i) => (_jsxs("div", { className: "flex items-center gap-2 px-3 py-1.5", style: { borderBottom: i < lb.length - 1 ? '1px solid #1a1733' : undefined,
                    background: e.nick === nick && submitted ? '#1a1200' : undefined }, children: [_jsx("div", { className: "font-black text-[11px] w-4 text-center shrink-0", style: { color: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : '#4b5563', fontFamily: 'JetBrains Mono, monospace' }, children: i + 1 }), _jsx("div", { className: "flex-1 text-[11px] font-bold text-white truncate", style: { fontFamily: 'Oswald, sans-serif' }, children: e.nick }), _jsx("div", { className: "text-[9px] text-slate-500 shrink-0", children: e.date }), _jsx("div", { className: "font-black text-[11px] shrink-0", style: { color: accent, fontFamily: 'JetBrains Mono, monospace' }, children: e.score.toLocaleString() })] }, i)))] }));
}
function VictoryScreen({ totalScore, money, isChallenge, onRestart, onRestartChallenge, onMenu }) {
    const [nick, setNick] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const firstWin = !isChallenge && isChallengeUnlocked();
    const lbKey = isChallenge ? LB_CHALLENGE_KEY : LB_KEY;
    const handleSubmit = () => {
        if (!nick.trim() || submitted)
            return;
        const entry = { nick: nick.trim().slice(0, 12), score: totalScore, date: new Date().toLocaleDateString('pt-BR') };
        saveLeader(entry, lbKey);
        setSubmitted(true);
    };
    const challengeColor = '#f97316';
    const normalColor = '#fbbf24';
    const accentColor = isChallenge ? challengeColor : normalColor;
    return (_jsxs("div", { className: "size-full flex flex-col items-center justify-start pt-4 gap-0 relative overflow-auto", style: { background: isChallenge
                ? 'radial-gradient(ellipse at center, #2c0a0a 0%, #080612 70%)'
                : 'radial-gradient(ellipse at center, #0a2c0a 0%, #080612 70%)' }, children: [_jsx(ParticleBurst, { active: true, x: 50, y: 30 }), _jsxs("div", { className: "z-10 text-center mb-3", children: [_jsx("div", { className: "text-6xl mb-1", children: isChallenge ? '💀🏆' : '🏆' }), _jsx("div", { className: "font-black text-3xl uppercase tracking-wide", style: { fontFamily: 'Oswald, sans-serif', color: accentColor }, children: isChallenge ? 'MODO DESAFIO ZERADO!' : 'VITÓRIA!' }), _jsx("div", { className: "text-sm mt-0.5", style: { color: isChallenge ? '#fb923c' : '#4ade80' }, children: isChallenge ? '8 Antes do Desafio conquistados — Lenda absoluta!' : '8 Antes conquistados — Swift domada!' })] }), !isChallenge && firstWin && (_jsxs("div", { className: "z-10 rounded-xl px-4 py-2 mb-3 text-center", style: { background: '#1c0a00', border: '2px solid #f97316' }, children: [_jsx("div", { className: "text-orange-400 font-black text-sm", style: { fontFamily: 'Oswald, sans-serif' }, children: "\uD83D\uDD13 MODO DESAFIO DESBLOQUEADO!" }), _jsx("div", { className: "text-orange-300/80 text-[10px] mt-0.5", children: "Indicadores avan\u00E7ados \u00B7 Metas 2.5\u00D7 maiores \u00B7 Ranking separado" })] })), _jsxs("div", { className: "z-10 flex gap-3 mb-3", children: [_jsxs("div", { className: "rounded-xl px-4 py-2 text-center", style: { background: '#1a1200', border: `2px solid ${accentColor}` }, children: [_jsx("div", { className: "text-[9px] uppercase tracking-widest mb-0.5", style: { color: accentColor, fontFamily: 'Oswald, sans-serif' }, children: "Score Total" }), _jsx("div", { className: "font-black text-xl", style: { color: accentColor, fontFamily: 'JetBrains Mono, monospace' }, children: totalScore.toLocaleString() })] }), _jsxs("div", { className: "rounded-xl px-4 py-2 text-center", style: { background: '#0a1a0a', border: '2px solid #22c55e' }, children: [_jsx("div", { className: "text-[9px] text-green-400 uppercase tracking-widest mb-0.5", style: { fontFamily: 'Oswald, sans-serif' }, children: "Dinheiro Final" }), _jsxs("div", { className: "font-black text-xl text-green-400", style: { fontFamily: 'JetBrains Mono, monospace' }, children: ["$", money] })] })] }), _jsx("div", { className: "z-10 flex flex-col items-center gap-1.5 mb-3", children: !submitted ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "text-[10px] text-slate-400 uppercase tracking-widest", style: { fontFamily: 'Oswald, sans-serif' }, children: "Entre para o Ranking" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "text", maxLength: 12, value: nick, onChange: e => setNick(e.target.value), onKeyDown: e => e.key === 'Enter' && handleSubmit(), placeholder: "Nick (m\u00E1x 12)", className: "rounded-xl px-3 py-2 text-sm font-bold text-white outline-none", style: { background: '#1a1733', border: `2px solid ${accentColor}66`, fontFamily: 'JetBrains Mono, monospace', width: 150 } }), _jsx("button", { onClick: handleSubmit, disabled: !nick.trim(), className: "btn-primary px-4 py-2 rounded-xl text-sm disabled:opacity-40", children: "\u2713" })] })] })) : (_jsxs("div", { className: "text-green-400 text-sm font-bold", children: ["\uD83C\uDF96\uFE0F Registrado, ", nick.trim().slice(0, 12), "!"] })) }), _jsxs("div", { className: "z-10 flex gap-3 mb-4 px-4 w-full max-w-xl", children: [_jsx(LeaderboardPanel, { lbKey: LB_KEY, title: "\uD83C\uDF0D Ranking Normal", accent: normalColor, nick: nick.trim(), submitted: submitted }), isChallengeUnlocked() && (_jsx(LeaderboardPanel, { lbKey: LB_CHALLENGE_KEY, title: "\uD83D\uDC80 Ranking Desafio", accent: challengeColor, nick: nick.trim(), submitted: submitted }))] }), _jsxs("div", { className: "z-10 flex flex-wrap gap-2 justify-center pb-4", children: [_jsx("button", { className: "btn-primary px-5 py-2.5 rounded-xl text-sm", onClick: onRestart, children: "\u25B6 Jogar Novamente" }), isChallengeUnlocked() && (_jsx("button", { className: "rounded-xl px-5 py-2.5 text-sm font-black", style: { background: '#1c0a00', border: '2px solid #f97316', color: '#f97316' }, onClick: onRestartChallenge, children: "\uD83D\uDC80 Modo Desafio" })), _jsx("button", { className: "btn-secondary px-5 py-2.5 rounded-xl text-sm", onClick: onMenu, children: "Menu" })] })] }));
}
export default function App() {
    const [gs, setGs] = useState(createInitial);
    const [showTutorial, setShowTutorial] = useState(false);
    const [muteOn, setMuteOn] = useState(false);
    const [flashColor, setFlashColor] = useState(null);
    const [particleBurst, setParticleBurst] = useState(false);
    const [bossShaking, setBossShaking] = useState(false);
    const [scoreJustAdded, setScoreJustAdded] = useState(false);
    const { msgs: floatMsgs, spawn: spawnFloat } = useFloatingTexts();
    const blind = gs.blinds[gs.blindIndex];
    const boss = makeBossDebuff(gs.blinds, gs.blindIndex);
    const boss2 = makeBossDebuff2(gs.blinds, gs.blindIndex);
    const target = getTarget(gs.ante, gs.blindIndex, gs.blinds, gs.isChallenge);
    const selected = gs.hand.filter(c => gs.selectedIds.has(c.id));
    const progressPct = Math.min(100, (gs.runningScore / target) * 100);
    const won = gs.runningScore >= target;
    const effectiveHandSize = (boss === 'austero' || boss2 === 'austero') ? 6 : HAND_SIZE;
    const previewScore = selected.length > 0
        ? scoreHand(selected, gs.jokers, gs.handLevels, boss, gs.playsLeft - 1, gs.isFirstPlay, { playsMadeThisBlind: gs.playsMadeThisBlind, currentScore: gs.runningScore, target, money: gs.money, prevChips: gs.prevChips, shopSpent: gs.shopSpent, boss2, prevHandType: gs.prevHandType, franqueadoBonus: gs.franqueadoBonus })
        : null;
    function isDebuffed(card) {
        return (boss === 'sem_organico' && card.line === 'organica') ||
            (boss === 'sem_premium' && card.line === 'premium') ||
            (boss2 === 'sem_organico' && card.line === 'organica') ||
            (boss2 === 'sem_premium' && card.line === 'premium');
    }
    const flash = (color) => {
        setFlashColor(color);
        setTimeout(() => setFlashColor(null), 500);
    };
    const drawCards = useCallback((count, prev) => {
        let deck = [...prev.deck];
        let discard = [...prev.discardPile];
        if (deck.length < count) {
            deck = [...deck, ...shuffle(discard)];
            discard = [];
        }
        const drawn = deck.splice(0, count);
        return { newCards: drawn, hand: [...prev.hand, ...drawn], deck, discardPile: discard };
    }, []);
    // ── Play hand ──
    const playHand = useCallback(() => {
        if (selected.length === 0 || selected.length > 5 || gs.playsLeft === 0 || won || gs.showReveal)
            return;
        const extra = { playsMadeThisBlind: gs.playsMadeThisBlind, currentScore: gs.runningScore, target, money: gs.money, prevChips: gs.prevChips, shopSpent: gs.shopSpent, boss2, prevHandType: gs.prevHandType, franqueadoBonus: gs.franqueadoBonus };
        const result = scoreHand(selected, gs.jokers, gs.handLevels, boss, gs.playsLeft - 1, gs.isFirstPlay, extra);
        if (result.score === 0 && (boss === 'exigente' || boss2 === 'exigente') && selected.length < 3) {
            flash('#ef4444');
            spawnFloat('Mínimo 3!', '#ef4444');
            return;
        }
        const histEntry = {
            id: gs.historyId + 1,
            handType: result.hand.type, handEmoji: result.hand.emoji,
            score: result.score, chips: result.totalChips, mult: result.totalMult,
        };
        if (result.score > 5000)
            flash('#fbbf24');
        else if (result.score > 1000)
            flash('#22c55e');
        setGs(prev => {
            const played = prev.selectedIds;
            const remaining = prev.hand.filter(c => !played.has(c.id));
            const gone = prev.hand.filter(c => played.has(c.id));
            const newDiscard = [...prev.discardPile, ...gone];
            const needed = effectiveHandSize - remaining.length;
            const { newCards, hand, deck, discardPile } = drawCards(needed, { ...prev, hand: remaining, discardPile: newDiscard });
            return {
                ...prev, hand, deck, discardPile,
                selectedIds: new Set(),
                runningScore: prev.runningScore + result.score,
                totalScore: prev.totalScore + result.score,
                playsLeft: prev.playsLeft - 1,
                isFirstPlay: false,
                playsMadeThisBlind: prev.playsMadeThisBlind + 1,
                lastScore: result,
                showReveal: true, revealDone: false,
                dealAnimCards: new Set(newCards.map(c => c.id)),
                prevChips: result.totalChips,
                prevHandType: result.hand.type,
                historyId: prev.historyId + 1,
                playHistory: [histEntry, ...prev.playHistory].slice(0, 20),
            };
        });
    }, [selected, gs, boss, won, drawCards, spawnFloat, target, effectiveHandSize]);
    const onRevealDone = useCallback(() => {
        setGs(prev => {
            const didWin = prev.runningScore >= target;
            if (didWin) {
                sfxBlindWin();
                setParticleBurst(true);
                setTimeout(() => setParticleBurst(false), 2000);
            }
            else if (prev.playsLeft === 0) {
                sfxGameOver();
                flash('#ef4444');
            }
            setScoreJustAdded(true);
            setTimeout(() => setScoreJustAdded(false), 600);
            return { ...prev, showReveal: false, revealDone: true };
        });
    }, [target]);
    useEffect(() => {
        if (gs.phase !== 'playing')
            return;
        if (!gs.revealDone || gs.runningScore >= target)
            return;
        if (gs.playsLeft === 0) {
            const t = setTimeout(() => setGs(prev => ({ ...prev, phase: 'gameover' })), 900);
            return () => clearTimeout(t);
        }
    }, [gs.phase, gs.revealDone, gs.runningScore, gs.playsLeft, target]);
    // ── Discard ──
    const discardHand = useCallback(() => {
        if (selected.length === 0 || gs.discardsLeft === 0 || won || gs.showReveal)
            return;
        sfxDiscard();
        spawnFloat(`Descartou ${selected.length}`, '#64748b');
        setGs(prev => {
            const played = prev.selectedIds;
            const remaining = prev.hand.filter(c => !played.has(c.id));
            const gone = prev.hand.filter(c => played.has(c.id));
            const newDiscard = [...prev.discardPile, ...gone];
            // Joker: infinito — cards go back to deck bottom
            if (prev.jokers.some(j => j.id === 'infinito')) {
                const { newCards, hand, deck, discardPile } = drawCards(effectiveHandSize - remaining.length, { ...prev, hand: remaining, discardPile: [...newDiscard, ...shuffle(gone)] });
                return { ...prev, hand, deck, discardPile, selectedIds: new Set(), discardsLeft: prev.discardsLeft - 1, dealAnimCards: new Set(newCards.map(c => c.id)) };
            }
            const { newCards, hand, deck, discardPile } = drawCards(effectiveHandSize - remaining.length, { ...prev, hand: remaining, discardPile: newDiscard });
            return { ...prev, hand, deck, discardPile, selectedIds: new Set(), discardsLeft: prev.discardsLeft - 1, dealAnimCards: new Set(newCards.map(c => c.id)) };
        });
    }, [selected, gs, won, drawCards, spawnFloat, effectiveHandSize]);
    // ── Toggle card ──
    const toggleCard = useCallback((card) => {
        if (gs.phase !== 'playing' || gs.showReveal)
            return;
        setGs(prev => {
            const next = new Set(prev.selectedIds);
            if (next.has(card.id)) {
                next.delete(card.id);
                sfxCardDeselect();
            }
            else if (next.size < 5) {
                next.add(card.id);
                sfxCardSelect();
            }
            return { ...prev, selectedIds: next };
        });
    }, [gs.phase, gs.showReveal]);
    // ── Start round ──
    const startRound = useCallback(() => {
        if (blind?.type === 'boss') {
            sfxBossEntry();
            setBossShaking(true);
            setTimeout(() => setBossShaking(false), 600);
        }
        else
            sfxCardDeal();
        setGs(prev => {
            const deck = makeDeck();
            const hs = (blind?.boss === 'austero' || blind?.boss2 === 'austero') ? 6 : HAND_SIZE;
            const hand = deck.slice(0, hs);
            const playsLeft = (blind?.boss === 'apressado' || blind?.boss2 === 'apressado') ? 2 : MAX_PLAYS;
            const hasBlindagem = prev.jokers.some(j => j.id === 'blindagem');
            const discardsLeft = (blind?.type === 'boss' && (blind?.boss === 'sem_descarte' || blind?.boss2 === 'sem_descarte') && !hasBlindagem) ? 0 : MAX_DISCARDS;
            return {
                ...prev, phase: 'playing', hand, deck: deck.slice(hs), discardPile: [],
                selectedIds: new Set(), runningScore: 0, playsLeft, discardsLeft,
                isFirstPlay: true, playsMadeThisBlind: 0,
                lastScore: null, showReveal: false, revealDone: false,
                dealAnimCards: new Set(hand.map(c => c.id)),
                playHistory: [], prevChips: 0,
            };
        });
    }, [blind]);
    // ── Buy joker ──
    const buyJoker = (joker) => {
        if (gs.money < joker.cost || gs.jokers.length >= MAX_JOKERS)
            return;
        sfxBuy();
        spawnFloat(`${joker.emoji} Contratado!`, '#fbbf24');
        setGs(prev => {
            const isPrePedido = joker.id === 'pre_pedido';
            return {
                ...prev, money: prev.money - joker.cost,
                jokers: [...prev.jokers, joker],
                shopJokers: prev.shopJokers.filter(j => j.id !== joker.id),
                shopSpent: prev.shopSpent + joker.cost,
                // Pré-Pedido: impraticidade custa 1 jogada (mínimo 1 restante)
                playsLeft: isPrePedido ? Math.max(1, prev.playsLeft - 1) : prev.playsLeft,
            };
        });
    };
    // ── Sell joker ──
    const sellJoker = (joker) => {
        const sellPrice = Math.floor(joker.cost / 2);
        spawnFloat(`+$${sellPrice} vendido`, '#22c55e');
        setGs(prev => {
            const isPrePedido = joker.id === 'pre_pedido';
            return {
                ...prev, money: prev.money + sellPrice,
                jokers: prev.jokers.filter(j => j.id !== joker.id),
                // Pré-Pedido: devolver a jogada perdida ao vender
                playsLeft: isPrePedido && prev.phase === 'playing' ? Math.min(prev.playsLeft + 1, MAX_PLAYS) : prev.playsLeft,
            };
        });
    };
    // ── Buy planet ──
    const buyPlanet = (planet) => {
        if (gs.money < planet.cost)
            return;
        sfxLevelUp();
        spawnFloat(`${planet.emoji} Nível Up!`, '#22c55e');
        setGs(prev => {
            const current = prev.handLevels[planet.handType];
            const step = HAND_LEVEL_STEP[planet.handType];
            return {
                ...prev, money: prev.money - planet.cost,
                handLevels: { ...prev.handLevels, [planet.handType]: { level: current.level + 1, chips: current.chips + step.chips, mult: current.mult + step.mult } },
                shopPlanets: prev.shopPlanets.filter(p => p.id !== planet.id),
                shopSpent: prev.shopSpent + planet.cost,
            };
        });
    };
    const rerollShop = () => {
        if (gs.money < gs.rerollCost)
            return;
        sfxDiscard();
        spawnFloat(`-$${gs.rerollCost} rerolar`, '#94a3b8');
        setGs(prev => ({
            ...prev,
            money: prev.money - prev.rerollCost,
            rerollCost: prev.rerollCost + 1,
            ...freshShop(prev.jokers, prev.ante, prev.isChallenge),
        }));
    };
    const skipBlind = () => {
        if (gs.blindIndex === 2)
            return;
        setGs(prev => ({ ...prev, blindIndex: prev.blindIndex + 1, phase: 'blind', money: prev.money + 2 }));
        spawnFloat('+$2 pulou', '#22c55e');
    };
    const goToShop = () => {
        const baseReward = calcReward(blind.reward, gs.jokers);
        const hasMidas = gs.jokers.some(j => j.id === 'midas');
        const reward = hasMidas ? baseReward * 2 : baseReward;
        const interest = Math.min(Math.floor(gs.money / 5), 5);
        const repositora = gs.jokers.find(j => j.id === 'repositora') ? gs.discardsLeft : 0;
        const franqueadoNewBonus = gs.jokers.some(j => j.id === 'franqueado') ? gs.franqueadoBonus + 5 : gs.franqueadoBonus;
        setGs(prev => ({
            ...prev, phase: 'shop', money: prev.money + reward + interest + repositora,
            franqueadoBonus: gs.jokers.some(j => j.id === 'franqueado') ? prev.franqueadoBonus + 5 : prev.franqueadoBonus,
            rerollCost: 3,
            ...freshShop(prev.jokers, prev.ante, prev.isChallenge),
        }));
    };
    const nextBlind = () => {
        setGs(prev => {
            const nextIdx = prev.blindIndex + 1;
            if (nextIdx >= 3) {
                const nextAnte = prev.ante + 1;
                if (nextAnte > 8) {
                    if (!prev.isChallenge)
                        unlockChallenge();
                    return { ...prev, phase: 'win' };
                }
                return { ...prev, phase: 'blind', ante: nextAnte, blindIndex: 0, blinds: getBlinds(nextAnte) };
            }
            return { ...prev, phase: 'blind', blindIndex: nextIdx };
        });
    };
    const toggleMute = () => { const n = !muteOn; setMuteOn(n); setMuted(n); };
    // ── MENU ──────────────────────────────────────────────────────────────────
    if (gs.phase === 'menu') {
        return (_jsxs(_Fragment, { children: [_jsx(MenuScreen, { onStart: () => setGs({ ...createInitial(false), phase: 'blind' }), onChallenge: () => setGs({ ...createInitial(true), phase: 'blind' }), onTutorial: () => setShowTutorial(true) }), showTutorial && _jsx(Tutorial, { onClose: () => setShowTutorial(false) }), _jsx("button", { onClick: toggleMute, className: "fixed top-3 right-3 z-50 text-xl opacity-50 hover:opacity-100 transition-opacity", children: muteOn ? '🔇' : '🔊' })] }));
    }
    // ── GAMEOVER ──────────────────────────────────────────────────────────────
    if (gs.phase === 'gameover') {
        return (_jsxs("div", { className: "size-full flex flex-col items-center justify-center gap-4 relative overflow-hidden", style: { background: 'radial-gradient(ellipse at center, #2d0808 0%, #080612 70%)' }, children: [_jsx(AmbientBackground, {}), _jsxs("div", { className: "z-10 text-center", children: [_jsx("div", { className: "text-6xl mb-2", children: "\uD83D\uDCB8" }), _jsx("div", { className: "font-black text-3xl text-red-400 uppercase mb-1", style: { fontFamily: 'Oswald, sans-serif' }, children: "Jogo Encerrado" }), _jsxs("div", { className: "text-slate-300 text-sm mb-3", children: ["Ante ", gs.ante, " \u00B7 ", blind?.name] }), _jsxs("div", { className: "mb-4", style: { fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: '#64748b' }, children: [gs.runningScore.toLocaleString(), " / ", target.toLocaleString(), " pts"] }), _jsx("div", { className: "flex gap-2 justify-center mb-4", children: gs.jokers.map(j => _jsx("span", { title: j.name, className: "text-2xl", children: j.emoji }, j.id)) }), _jsxs("div", { className: "flex gap-3 justify-center", children: [_jsx("button", { className: "btn-primary px-6 py-2.5 rounded-xl", onClick: () => setGs({ ...createInitial(), phase: 'blind' }), children: "Nova Jogatina" }), _jsx("button", { className: "btn-secondary px-5 py-2.5 rounded-xl", onClick: () => setGs({ ...createInitial(), phase: 'menu' }), children: "Menu" })] })] })] }));
    }
    // ── WIN ──────────────────────────────────────────────────────────────────
    if (gs.phase === 'win') {
        return _jsx(VictoryScreen, { totalScore: gs.totalScore, money: gs.money, isChallenge: gs.isChallenge, onRestart: () => setGs({ ...createInitial(gs.isChallenge), phase: 'blind' }), onRestartChallenge: () => setGs({ ...createInitial(true), phase: 'blind' }), onMenu: () => setGs({ ...createInitial(), phase: 'menu' }) });
    }
    // ── BLIND SELECTION ──────────────────────────────────────────────────────
    if (gs.phase === 'blind') {
        const isBoss = blind?.type === 'boss';
        const nextTarget = getTarget(gs.ante, gs.blindIndex, gs.blinds, gs.isChallenge);
        return (_jsxs("div", { className: `size-full flex flex-col items-center justify-center gap-4 p-4 relative overflow-hidden ${bossShaking ? 'boss-shake' : ''}`, style: { background: 'radial-gradient(ellipse at center, #1a120a 0%, #080612 70%)' }, children: [_jsx(AmbientBackground, {}), _jsxs("div", { className: "z-10 text-center", children: [_jsxs("div", { className: "text-[10px] text-slate-500 uppercase tracking-widest mb-2", style: { fontFamily: 'Oswald, sans-serif' }, children: ["Ante ", gs.ante, " / 8"] }), _jsx("div", { className: "flex gap-1.5 justify-center mb-4", children: gs.blinds.map((b, i) => (_jsx("div", { className: `rounded-full px-3 py-1 text-xs font-bold uppercase transition-all ${i === gs.blindIndex ? 'bg-amber-500 text-black scale-110' : i < gs.blindIndex ? 'bg-green-800 text-green-400' : 'bg-slate-800 text-slate-500'}`, style: { fontFamily: 'Oswald, sans-serif' }, children: b.type === 'small' ? 'Small' : b.type === 'big' ? 'Big' : 'Boss' }, i))) })] }), _jsxs("div", { className: `z-10 rounded-2xl p-5 text-center max-w-xs w-full ${isBoss ? 'border-2 border-red-600 shadow-[0_0_40px_rgba(220,38,38,0.25)]' : 'border border-[#2d2850]'}`, style: { background: isBoss ? '#1a0505' : '#110f22' }, children: [_jsx("div", { className: `text-5xl mb-2 ${isBoss ? 'animate-pulse' : ''}`, children: blind?.emoji }), _jsx("div", { className: "font-black text-xl text-white uppercase mb-2", style: { fontFamily: 'Oswald, sans-serif' }, children: blind?.name }), isBoss && blind?.boss && (_jsxs("div", { className: "rounded-xl px-3 py-2 mb-3 flex flex-col gap-1.5", style: { background: '#2d0505' }, children: [_jsxs("div", { children: [_jsxs("div", { className: "text-red-400 font-bold text-sm mb-0.5", children: [BOSS_DEBUFFS[blind.boss].emoji, " ", BOSS_DEBUFFS[blind.boss].name] }), _jsx("div", { className: "text-red-300/70 text-[10px]", children: BOSS_DEBUFFS[blind.boss].description })] }), blind.boss2 && (_jsxs("div", { style: { borderTop: '1px solid rgba(220,38,38,0.3)', paddingTop: 6 }, children: [_jsxs("div", { className: "text-orange-400 font-bold text-sm mb-0.5", children: [BOSS_DEBUFFS[blind.boss2].emoji, " ", BOSS_DEBUFFS[blind.boss2].name] }), _jsx("div", { className: "text-orange-300/70 text-[10px]", children: BOSS_DEBUFFS[blind.boss2].description })] }))] })), _jsxs("div", { className: "rounded-xl py-3 mb-3", style: { background: '#1a1733' }, children: [_jsx("div", { className: "text-[10px] text-slate-400 uppercase tracking-wider mb-1", style: { fontFamily: 'Oswald, sans-serif' }, children: "Meta" }), _jsx("div", { className: "font-black text-3xl text-amber-400", style: { fontFamily: 'JetBrains Mono, monospace' }, children: nextTarget.toLocaleString() })] }), _jsxs("div", { className: "text-xs text-green-400 font-bold", children: ["+$", blind?.reward, " ao vencer"] })] }), _jsxs("div", { className: "z-10 flex flex-col items-center gap-2", children: [_jsx("button", { className: "btn-primary px-10 py-3 rounded-xl text-base", onClick: startRound, children: isBoss ? '⚔️ Enfrentar Boss' : '▶ Entrar' }), !isBoss && (_jsx("button", { className: "btn-secondary px-6 py-2 rounded-xl text-sm", onClick: skipBlind, children: "Pular (+$2)" })), _jsxs("div", { className: "text-amber-400 text-sm", style: { fontFamily: 'JetBrains Mono, monospace' }, children: ["Saldo: $", gs.money] })] }), _jsxs("div", { className: "absolute top-3 right-3 z-10 flex gap-2", children: [_jsx("button", { onClick: () => setShowTutorial(true), className: "text-slate-500 hover:text-slate-300 text-sm transition-colors", style: { fontFamily: 'Oswald, sans-serif' }, children: "?" }), _jsx("button", { onClick: toggleMute, className: "text-xl opacity-50 hover:opacity-100 transition-opacity", children: muteOn ? '🔇' : '🔊' }), _jsx("button", { onClick: () => setGs({ ...createInitial(), phase: 'menu' }), className: "text-slate-500 hover:text-slate-300 text-xs transition-colors", style: { fontFamily: 'Oswald, sans-serif' }, children: "MENU" })] }), showTutorial && _jsx(Tutorial, { onClose: () => setShowTutorial(false) })] }));
    }
    // ── SHOP ──────────────────────────────────────────────────────────────────
    if (gs.phase === 'shop') {
        const interest = Math.min(Math.floor(gs.money / 5), 5);
        const attackDisc = gs.jokers.find(j => j.id === 'atacadao') ? 1 : 0;
        const discPrice = (cost) => Math.max(1, cost - attackDisc);
        return (_jsxs("div", { className: "size-full overflow-auto relative", style: { background: 'radial-gradient(ellipse at top, #150f08 0%, #080612 60%)' }, children: [_jsx(FloatingTexts, { msgs: floatMsgs }), _jsxs("div", { className: "max-w-xl mx-auto p-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("div", { children: [_jsx("div", { className: "font-black text-xl text-amber-400 uppercase", style: { fontFamily: 'Oswald, sans-serif' }, children: "\uD83D\uDED2 Loja Swift" }), _jsxs("div", { className: "text-[10px] mt-0.5", style: { fontFamily: 'JetBrains Mono, monospace' }, children: [_jsxs("span", { className: "text-amber-400", children: ["$", gs.money] }), interest > 0 && _jsxs("span", { className: "text-green-400 ml-2", children: ["+$", interest, " juros"] })] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: toggleMute, className: "text-xl opacity-50 hover:opacity-100", children: muteOn ? '🔇' : '🔊' }), _jsx("button", { onClick: () => setGs(prev => ({ ...createInitial(), phase: 'menu' })), className: "btn-secondary px-3 py-1.5 rounded-lg text-xs", children: "Menu" })] })] }), gs.shopJokers.length > 0 && (_jsxs("div", { className: "mb-4", children: [_jsxs("div", { className: "text-xs font-bold uppercase tracking-widest text-amber-400 mb-2", style: { fontFamily: 'Oswald, sans-serif' }, children: ["Jokers (", gs.jokers.length, "/", MAX_JOKERS, ")"] }), _jsx("div", { className: "flex gap-3 flex-wrap", children: gs.shopJokers.map(j => (_jsx(JokerCard, { joker: { ...j, cost: discPrice(j.cost) }, canAfford: gs.money >= discPrice(j.cost) && gs.jokers.length < MAX_JOKERS, onBuy: () => buyJoker({ ...j, cost: discPrice(j.cost) }) }, j.id))) })] })), gs.shopPlanets.length > 0 && (_jsxs("div", { className: "mb-4", children: [_jsx("div", { className: "text-xs font-bold uppercase tracking-widest text-blue-400 mb-2", style: { fontFamily: 'Oswald, sans-serif' }, children: gs.isChallenge ? '📊 Indicadores Avançados' : '📊 Indicadores' }), _jsx("div", { className: "flex gap-3 flex-wrap", children: gs.shopPlanets.map(p => {
                                        const lvl = gs.handLevels[p.handType];
                                        const step = HAND_LEVEL_STEP[p.handType];
                                        return (_jsxs("div", { className: "employee-card rounded-xl p-3 text-center", style: { minWidth: 110 }, children: [_jsx("div", { className: "text-3xl mb-1", children: p.emoji }), _jsx("div", { className: "font-bold text-xs text-white mb-0.5", style: { fontFamily: 'Oswald, sans-serif' }, children: p.name }), _jsx("div", { className: "text-[9px] text-slate-400 mb-1", children: p.handType }), _jsxs("div", { className: "text-[9px] text-green-400 mb-2", children: ["Nv", lvl.level, "\u2192", lvl.level + 1, ": +", step.chips, "C +", step.mult, "M"] }), _jsxs("button", { onClick: () => buyPlanet(p), disabled: gs.money < p.cost, className: "btn-primary rounded-lg px-2 py-1 text-[10px] w-full", children: ["$", p.cost] })] }, p.id));
                                    }) })] })), gs.jokers.length > 0 && (_jsxs("div", { className: "mb-4", children: [_jsx("div", { className: "text-xs font-bold uppercase tracking-widest text-green-400 mb-2", style: { fontFamily: 'Oswald, sans-serif' }, children: "Jokers Ativos" }), _jsx("div", { className: "flex gap-3 flex-wrap", children: gs.jokers.map(j => (_jsx(JokerCard, { joker: j, owned: true, onSell: () => sellJoker(j) }, j.id))) })] })), _jsxs("div", { className: "mb-4", children: [_jsx("div", { className: "text-xs font-bold uppercase tracking-widest text-slate-400 mb-2", style: { fontFamily: 'Oswald, sans-serif' }, children: "N\u00EDveis de M\u00E3o" }), _jsx("div", { className: "grid grid-cols-2 gap-1", children: Object.entries(gs.handLevels).map(([type, lvl]) => (_jsxs("div", { className: "rounded-lg px-2 py-1.5 flex justify-between items-center", style: { background: '#110f22', border: '1px solid #1a1733' }, children: [_jsx("span", { className: "text-[9px] text-slate-300", style: { fontFamily: 'Oswald, sans-serif' }, children: type }), _jsxs("div", { className: "flex gap-1 text-[9px]", style: { fontFamily: 'JetBrains Mono, monospace' }, children: [_jsxs("span", { className: "text-blue-400", children: ["C:", lvl.chips] }), _jsxs("span", { className: "text-red-400", children: ["M:", lvl.mult] }), lvl.level > 1 && _jsxs("span", { className: "text-green-400", children: ["Nv", lvl.level] })] })] }, type))) })] }), _jsxs("div", { className: "flex gap-3 items-center", children: [_jsxs("button", { onClick: rerollShop, disabled: gs.money < gs.rerollCost, className: "btn-secondary rounded-xl py-3 flex-shrink-0 flex items-center gap-2 px-4", title: "Trocar as ofertas da loja por novas", children: [_jsx("span", { className: "text-base", children: "\uD83C\uDFB2" }), _jsxs("div", { className: "text-left", children: [_jsx("div", { className: "text-[10px] uppercase tracking-wider leading-none", children: "Rerolar" }), _jsxs("div", { className: "font-black text-sm leading-none", style: { fontFamily: 'JetBrains Mono, monospace', color: gs.money >= gs.rerollCost ? '#fbbf24' : '#6b7280' }, children: ["$", gs.rerollCost] })] })] }), _jsx("button", { className: "btn-primary flex-1 py-3 rounded-xl text-base", onClick: nextBlind, children: "Pr\u00F3ximo Blind \u2192" })] })] })] }));
    }
    // ── PLAYING ────────────────────────────────────────────────────────────────
    const canPlay = selected.length >= 1 && selected.length <= 5 && gs.playsLeft > 0 && !won && !gs.showReveal;
    const canDiscard = selected.length >= 1 && selected.length <= 5 && gs.discardsLeft > 0 && !won && !gs.showReveal;
    const blindLabels = { small: 'Small Blind', big: 'Big Blind', boss: 'Boss Blind' };
    return (_jsxs("div", { className: "size-full flex overflow-hidden", style: { background: '#080612' }, children: [_jsx(FloatingTexts, { msgs: floatMsgs }), _jsx(ParticleBurst, { active: particleBurst, x: 50, y: 30 }), flashColor && _jsx(ScreenFlash, { color: flashColor, active: true }), _jsxs("div", { className: "flex-shrink-0 flex flex-col overflow-hidden", style: { width: 168, background: '#0a0818', borderRight: '1px solid #1a1733' }, children: [_jsxs("div", { className: "px-3 pt-3 pb-2", style: { borderBottom: '1px solid #1a1733' }, children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsxs("div", { className: "text-[8px] text-slate-500 uppercase tracking-wider", style: { fontFamily: 'Oswald, sans-serif' }, children: [gs.isChallenge && _jsx("span", { style: { color: '#f97316' }, children: "\uD83D\uDC80 " }), "Ante ", gs.ante, "/8"] }), _jsx("div", { className: `text-[9px] font-bold uppercase ${blind?.type === 'boss' ? 'text-red-400' : 'text-amber-400'}`, style: { fontFamily: 'Oswald, sans-serif' }, children: blindLabels[blind?.type ?? 'small'] })] }), _jsx("div", { className: `font-black text-xl transition-colors ${scoreJustAdded ? 'score-added text-amber-400' : 'text-white'}`, style: { fontFamily: 'JetBrains Mono, monospace' }, children: gs.runningScore.toLocaleString() }), _jsxs("div", { className: "text-[9px] text-slate-500 mb-1.5", style: { fontFamily: 'JetBrains Mono, monospace' }, children: ["/ ", target.toLocaleString()] }), _jsx("div", { className: "w-full h-2.5 rounded-full overflow-hidden", style: { background: '#1a1733' }, children: _jsx("div", { className: "h-full rounded-full transition-all duration-700", style: { width: `${progressPct}%`, background: won ? '#22c55e' : progressPct > 65 ? '#eab308' : '#3b82f6' } }) }), _jsxs("div", { className: "flex justify-between mt-2", children: [_jsxs("div", { children: [_jsx("div", { className: "text-[7px] text-slate-600 uppercase mb-0.5", style: { fontFamily: 'Oswald, sans-serif' }, children: "Jogadas" }), _jsx("div", { className: "flex gap-0.5", children: Array.from({ length: Math.min(MAX_PLAYS, 4) }).map((_, i) => (_jsx("div", { className: `w-2.5 h-2.5 rounded-full ${i < gs.playsLeft ? 'bg-blue-500' : 'bg-slate-700'}` }, i))) })] }), _jsxs("div", { className: "text-right", children: [_jsx("div", { className: "text-[7px] text-slate-600 uppercase mb-0.5", style: { fontFamily: 'Oswald, sans-serif' }, children: "Descartes" }), _jsx("div", { className: "flex gap-0.5 justify-end", children: Array.from({ length: MAX_DISCARDS }).map((_, i) => (_jsx("div", { className: `w-2.5 h-2.5 rounded-full ${i < gs.discardsLeft ? 'bg-amber-500' : 'bg-slate-700'}` }, i))) })] })] }), _jsxs("div", { className: "text-amber-400 font-bold text-sm mt-1.5", style: { fontFamily: 'JetBrains Mono, monospace' }, children: ["$", gs.money] })] }), gs.jokers.length > 0 && (_jsxs("div", { className: "px-2 py-2", style: { borderBottom: '1px solid #1a1733' }, children: [_jsx("div", { className: "text-[7px] text-slate-500 uppercase tracking-wider mb-1.5", style: { fontFamily: 'Oswald, sans-serif' }, children: "Jokers" }), _jsx("div", { className: "flex flex-col gap-1", children: gs.jokers.map(j => {
                                    const rs = RARITY_STYLE[j.rarity];
                                    return (_jsxs("div", { className: "flex items-center gap-1.5 rounded-lg px-2 py-1", style: { background: '#0d0b1e', border: `1px solid ${rs.border}44` }, children: [_jsx("span", { className: "text-base", children: j.emoji }), _jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "text-[8px] font-bold text-white truncate", style: { fontFamily: 'Oswald, sans-serif' }, children: j.name }), _jsx("div", { className: `text-[7px] font-bold ${RARITY_STYLE[j.rarity].badge.split(' ')[0]}`, children: RARITY_STYLE[j.rarity].label })] })] }, j.id));
                                }) })] })), _jsxs("div", { className: "px-2 py-2 flex-1 overflow-y-auto min-h-0", children: [_jsx("div", { className: "text-[7px] text-slate-500 uppercase tracking-wider mb-1.5", style: { fontFamily: 'Oswald, sans-serif' }, children: "Hist\u00F3rico" }), _jsx("div", { className: "flex flex-col gap-1", children: gs.playHistory.length === 0 ? (_jsx("div", { className: "text-[9px] text-slate-700 italic", children: "Sem jogadas ainda..." })) : (gs.playHistory.map(e => _jsx(HistoryEntry, { entry: e }, e.id))) })] }), _jsxs("div", { className: "px-2 pb-2 pt-1 flex gap-1", style: { borderTop: '1px solid #1a1733' }, children: [_jsx("button", { onClick: toggleMute, className: "text-base opacity-50 hover:opacity-100 transition-opacity", children: muteOn ? '🔇' : '🔊' }), _jsx("button", { onClick: () => setShowTutorial(true), className: "btn-secondary rounded-lg px-2 py-1 text-[9px] flex-1", children: "?" }), _jsx("button", { onClick: () => setGs({ ...createInitial(), phase: 'menu' }), className: "btn-secondary rounded-lg px-2 py-1 text-[9px] flex-1", children: "Menu" })] })] }), _jsxs("div", { className: "flex-1 flex flex-col min-w-0 overflow-hidden", children: [boss && (_jsxs("div", { className: "flex-shrink-0 px-3 py-1 flex flex-col gap-0.5", style: { background: '#1a0505', borderBottom: '1px solid #7f1d1d' }, children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm", children: BOSS_DEBUFFS[boss].emoji }), _jsxs("span", { className: "text-[10px] text-red-300", children: [_jsxs("b", { className: "text-red-400", children: [BOSS_DEBUFFS[boss].name, ":"] }), " ", BOSS_DEBUFFS[boss].description] })] }), boss2 && (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm", children: BOSS_DEBUFFS[boss2].emoji }), _jsxs("span", { className: "text-[10px] text-orange-300", children: [_jsxs("b", { className: "text-orange-400", children: [BOSS_DEBUFFS[boss2].name, ":"] }), " ", BOSS_DEBUFFS[boss2].description] })] }))] })), _jsx("div", { className: "flex-shrink-0 px-3 py-2", children: _jsx("div", { className: "rounded-2xl overflow-hidden", style: { border: '1px solid #1a1733', minHeight: 90 }, children: gs.showReveal && gs.lastScore ? (_jsx(AnimatedScoreReveal, { chips: gs.lastScore.totalChips, mult: gs.lastScore.totalMult, score: gs.lastScore.score, handName: gs.lastScore.hand.type, handEmoji: gs.lastScore.hand.emoji, handLevel: gs.handLevels[gs.lastScore.hand.type]?.level ?? 1, breakdown: gs.lastScore.breakdown, onDone: onRevealDone })) : (_jsxs("div", { className: "flex items-center gap-3 p-3", style: { background: '#110f22', minHeight: 90 }, children: [_jsx("div", { className: "flex gap-1 flex-1 overflow-x-auto min-w-0", children: selected.length === 0
                                            ? _jsx("div", { className: "text-sm text-slate-600 italic self-center", children: "Selecione 1\u20135 cartas..." })
                                            : selected.map(c => _jsx(CardUI, { card: c, small: true, debuffed: isDebuffed(c) }, c.id)) }), previewScore && selected.length > 0 && (_jsxs("div", { className: "flex-shrink-0 text-center rounded-xl px-2 py-1.5", style: { background: '#0d0b1e', minWidth: 80 }, children: [_jsx("div", { className: "text-sm", children: previewScore.hand.emoji }), _jsx("div", { className: "font-bold text-[8px] text-amber-400 uppercase", style: { fontFamily: 'Oswald, sans-serif' }, children: previewScore.hand.type }), _jsxs("div", { className: "flex gap-1 justify-center text-[8px] mt-0.5", style: { fontFamily: 'JetBrains Mono, monospace' }, children: [_jsx("span", { className: "text-blue-400", children: previewScore.totalChips }), _jsx("span", { className: "text-slate-600", children: "\u00D7" }), _jsx("span", { className: "text-red-400", children: previewScore.totalMult % 1 === 0 ? previewScore.totalMult : previewScore.totalMult.toFixed(1) })] }), _jsxs("div", { className: "text-amber-400 font-bold text-[10px]", style: { fontFamily: 'JetBrains Mono, monospace' }, children: ["\u2248", previewScore.score.toLocaleString()] })] })), _jsxs("div", { className: "flex-shrink-0 flex flex-col gap-1.5", children: [_jsx("button", { onClick: playHand, disabled: !canPlay, className: "btn-primary rounded-xl px-4 py-2 text-sm whitespace-nowrap", children: "Jogar \uD83C\uDF7D\uFE0F" }), _jsxs("button", { onClick: discardHand, disabled: !canDiscard, className: "btn-secondary rounded-xl px-3 py-1.5 text-xs whitespace-nowrap", children: ["Descartar (", gs.discardsLeft, ")"] })] })] })) }) }), _jsxs("div", { className: "flex-1 min-h-0 overflow-hidden px-3 pb-2", children: [_jsx("div", { className: "flex items-end justify-center h-full gap-1 overflow-x-auto pb-1", children: gs.hand.map((card, i) => (_jsx(CardUI, { card: card, selected: gs.selectedIds.has(card.id), debuffed: isDebuffed(card), dealing: gs.dealAnimCards.has(card.id), onClick: () => toggleCard(card) }, card.id + i))) }), _jsx("div", { className: "text-center mt-0.5", children: _jsxs("span", { className: "text-[8px] text-slate-700", style: { fontFamily: 'JetBrains Mono, monospace' }, children: [gs.hand.length, "/", effectiveHandSize, " \u00B7 ", gs.deck.length, " no deck"] }) })] }), won && !gs.showReveal && (_jsx("div", { className: "absolute inset-0 z-50 flex items-center justify-center", style: { background: 'rgba(0,0,0,0.8)' }, children: _jsxs("div", { className: "text-center rounded-2xl p-8 win-ring", style: { background: '#0a1f0a', border: '2px solid #22c55e' }, children: [_jsx("div", { className: "text-6xl mb-3", children: "\uD83C\uDF89" }), _jsx("div", { className: "font-black text-3xl text-green-400 uppercase mb-2", style: { fontFamily: 'Oswald, sans-serif' }, children: "Blind Vencido!" }), _jsxs("div", { className: "text-slate-300 text-sm mb-1", children: [gs.runningScore.toLocaleString(), " pts"] }), _jsxs("div", { className: "text-green-400 text-sm mb-4", children: ["+$", calcReward(blind?.reward ?? 0, gs.jokers), " \u00B7 +$", Math.min(Math.floor(gs.money / 5), 5), " juros"] }), _jsx("button", { className: "btn-primary px-8 py-3 rounded-xl text-base", onClick: goToShop, children: "Ir para a Loja \u2192" })] }) }))] }), showTutorial && _jsx(Tutorial, { onClose: () => setShowTutorial(false) })] }));
}
