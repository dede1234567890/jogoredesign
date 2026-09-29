import {
  GameCard, Joker, HandType, HandLevel,
  BASE_HAND_LEVELS, HAND_LEVEL_STEP, BossDebuff, ProductLine,
} from './data'

export interface DetectedHand {
  type: HandType
  emoji: string
  scoringCards: GameCard[]
}

function countByLine(cards: GameCard[]) {
  const c = { organica: 0, mais: 0, premium: 0, classico: 0 }
  for (const card of cards) c[card.line]++
  return c
}

export function detectHand(cards: GameCard[]): DetectedHand {
  if (cards.length === 0) return { type: 'Pedido Simples', emoji: '📋', scoringCards: [] }
  const counts = countByLine(cards)
  const lines = (Object.keys(counts) as ProductLine[]).filter(l => counts[l] > 0)
  const maxSame = Math.max(...Object.values(counts))
  const organic = counts.organica
  const premium = counts.premium
  const pairs = lines.filter(l => counts[l] >= 2).length

  if (cards.length === 1)   return { type: 'Pedido Simples',  emoji: '📋', scoringCards: cards }
  if (maxSame >= 5 && lines.length === 1)
                            return { type: 'Full Combo',       emoji: '🎆', scoringCards: cards }
  if (maxSame === 4)        return { type: 'Quadra',           emoji: '🎯', scoringCards: cards }
  if (maxSame === 3 && lines.length === 1)
                            return { type: 'Trio',             emoji: '🔥', scoringCards: cards }
  if (maxSame === 2 && lines.length === 1)
                            return { type: 'Dupla',            emoji: '✌️', scoringCards: cards }
  if (premium >= 3)         return { type: 'Seleção Premium',  emoji: '👑', scoringCards: cards }
  if (organic >= 3)         return { type: 'Pedido Orgânico',  emoji: '🌿', scoringCards: cards }
  if (pairs >= 2 && lines.length >= 2)
                            return { type: 'Combo Família',    emoji: '👨‍👩‍👧', scoringCards: cards }
  if (lines.length >= 3)    return { type: 'Combo Variado',    emoji: '🛒', scoringCards: cards }
  if (cards.length >= 4)    return { type: 'Churrasco Pack',   emoji: '🥩', scoringCards: cards }
  return { type: 'Pedido Simples', emoji: '📋', scoringCards: [cards[0]] }
}

export interface ScoreResult {
  hand: DetectedHand
  baseChips: number
  baseMult: number
  cardChips: number
  jokerChipBonus: number
  jokerMultBonus: number
  jokerMultMult: number
  totalChips: number
  totalMult: number
  score: number
  breakdown: string[]
}

function getHandLevel(handLevels: Record<HandType, HandLevel>, type: HandType): HandLevel {
  return handLevels[type] ?? BASE_HAND_LEVELS[type]
}

export function scoreHand(
  playedCards: GameCard[],
  jokers: Joker[],
  handLevels: Record<HandType, HandLevel>,
  boss: BossDebuff | null,
  playsRemaining: number,
  isFirstPlay: boolean,
  // extra state for stateful jokers
  extra: {
    playsMadeThisBlind: number
    currentScore: number
    target: number
    money: number
    prevChips: number
    shopSpent: number
    boss2?: BossDebuff | null
    prevHandType?: HandType | null
    franqueadoBonus?: number
  } = { playsMadeThisBlind: 0, currentScore: 0, target: 1, money: 0, prevChips: 0, shopSpent: 0 },
): ScoreResult {
  const hand = detectHand(playedCards)
  const level = getHandLevel(handLevels, hand.type)
  const breakdown: string[] = []
  const boss2 = extra.boss2 ?? null

  function applyDebuff(b: BossDebuff | null, cards: typeof effectiveCards) {
    if (!b) return cards
    if (b === 'sem_organico') return cards.map(c => c.line === 'organica' ? { ...c, debuffed: true } : c)
    if (b === 'sem_premium')  return cards.map(c => c.line === 'premium'  ? { ...c, debuffed: true } : c)
    if (b === 'avaro')        return cards.map((c, i) => i === 0 ? { ...c, debuffed: true } : c)
    return cards
  }

  // Boss debuffs on cards
  let effectiveCards = playedCards.map(c => ({ ...c }))
  effectiveCards = applyDebuff(boss, effectiveCards)
  effectiveCards = applyDebuff(boss2, effectiveCards)

  if ((boss === 'misturado' || boss2 === 'misturado') && ['Dupla','Trio','Quadra'].includes(hand.type)) {
    return { hand, baseChips: level.chips, baseMult: 1, cardChips: 0, jokerChipBonus: 0, jokerMultBonus: 0, jokerMultMult: 1, totalChips: level.chips, totalMult: 1, score: level.chips, breakdown: ['Sem Combos: Mult anulado!'] }
  }
  if ((boss === 'exigente' || boss2 === 'exigente') && playedCards.length < 3) {
    return { hand, baseChips: 0, baseMult: 0, cardChips: 0, jokerChipBonus: 0, jokerMultBonus: 0, jokerMultMult: 1, totalChips: 0, totalMult: 0, score: 0, breakdown: ['Exigente: mínimo 3 cartas!'] }
  }

  const allIds = new Set(jokers.map(j => j.id))
  const hasBlindagem = allIds.has('blindagem')
  const jokersSuppressed = (boss === 'desconfiado' || boss2 === 'desconfiado') && !hasBlindagem
  const ids = jokersSuppressed ? new Set<string>() : allIds
  const baseChips = level.chips
  const baseMult  = level.mult
  breakdown.push(`${hand.type} Nv.${level.level}: ${baseChips}C × ${baseMult}M`)

  // Card chips
  let cardChips = 0
  for (const c of effectiveCards) {
    if (c.debuffed) continue
    let v = c.chips

    if (ids.has('freezer') && c.line === 'organica') v = Math.round(v * 1.8)
    if (ids.has('ficha_verde') && c.line === 'organica') v += 3
    if (ids.has('logistica') && c.line === 'mais') v += 18
    if (ids.has('estoquista') && c.line === 'classico') v += 12
    if (ids.has('fresquinho') && c.chips >= 12) v += 5
    if (ids.has('refrigerador') && c.chips >= 14) v += 7
    if (ids.has('bloco_mais') && c.line === 'mais') v = Math.round(v * 1.8)
    if (ids.has('classico_gold') && c.line === 'classico') v += 8
    if (ids.has('paleta') && c.line === 'mais') v += 8
    if (ids.has('rei_gado') && c.line === 'premium') v += 5
    cardChips += v
  }

  // Joker: corte_especial - max chip card ×2.5
  if (ids.has('corte_especial') && effectiveCards.length > 0) {
    const maxC = effectiveCards.filter(c => !c.debuffed).reduce((m, c) => c.chips > m ? c.chips : m, 0)
    const bonus = Math.round(maxC * 1.5)
    cardChips += bonus
    breakdown.push(`Corte Especial: +${bonus} extra`)
  }
  // Joker: cadeia_fria
  if (ids.has('cadeia_fria') && extra.prevChips > 0) {
    const bonus = Math.min(extra.prevChips, 80)
    cardChips += bonus
    breakdown.push(`Cadeia Fria: +${bonus}`)
  }
  if (cardChips > 0) breakdown.push(`+${cardChips} Chips das cartas`)

  let totalChips = baseChips + cardChips
  let addMult = 0
  let multMult = 1
  let jChipBonus = 0
  let jMultBonus = 0
  let jMultMult = 1

  // ── Chip-adding jokers ─────────────────────────────────────────────────────
  if (ids.has('promotora')) {
    const linesSet = new Set(effectiveCards.filter(c => !c.debuffed).map(c => c.line))
    if (linesSet.size >= 2) { totalChips += 25; jChipBonus += 25; breakdown.push('Carla: +25C') }
  }
  if (ids.has('checklist') && effectiveCards.length === 3) {
    totalChips += 25; jChipBonus += 25; breakdown.push('+25C (3 cartas)')
  }
  if (ids.has('novato') && isFirstPlay) {
    totalChips += 35; jChipBonus += 35; breakdown.push('Novato: +35C')
  }
  if (ids.has('simples') && hand.type === 'Combo Variado') {
    totalChips += 20; jChipBonus += 20; breakdown.push('+20C Variado')
  }
  if (ids.has('supervisor') && ['Trio','Quadra','Full Combo'].includes(hand.type)) {
    totalChips += 40; jChipBonus += 40; breakdown.push('Dra: +40C')
  }
  if (ids.has('sortimento') && hand.type === 'Combo Família') {
    totalChips += 35; jChipBonus += 35; breakdown.push('Sortimento: +35C')
  }
  if (ids.has('porcao') && effectiveCards.length === 5) {
    totalChips += 15; jChipBonus += 15; breakdown.push('+15C (5 cartas)')
  }
  if (ids.has('vendedor') && effectiveCards.length === 5) {
    totalChips += 90; jChipBonus += 90; breakdown.push('Vendedor: +90C')
  }
  if (ids.has('linha_producao') && hand.type === 'Full Combo') {
    totalChips += 220; jChipBonus += 220; breakdown.push('Linha: +220C')
  }
  if (ids.has('padrao') && !effectiveCards.some(c => c.debuffed)) {
    totalChips += 45; jChipBonus += 45; breakdown.push('Padrão: +45C')
  }
  if (ids.has('acougueiro_lend')) {
    totalChips += 60; jChipBonus += 60; breakdown.push('Lendário: +60C')
  }
  if (ids.has('swift_premium') && effectiveCards.length >= 3) {
    totalChips += 80; jChipBonus += 80; breakdown.push('Swift Premium: +80C')
  }
  if (ids.has('ceo_operacao')) {
    totalChips += 80; jChipBonus += 80; breakdown.push('CEO: +80C')
  }
  if (ids.has('entregador') && effectiveCards.length === 2) {
    totalChips += 15; jChipBonus += 15; breakdown.push('Entregador: +15C')
  }
  if (ids.has('reforco') && (playedCards.length + jokers.length) > 100) {
    totalChips += 30; jChipBonus += 30; breakdown.push('Reforço: +30C')
  }
  if (ids.has('fiscal_sif') && boss !== null && !effectiveCards.some(c => c.debuffed)) {
    totalChips += 80; jChipBonus += 80; breakdown.push('Fiscal SIF: +80C')
  }
  // novos comuns — chips
  if (ids.has('balconista') && new Set(effectiveCards.map(c => c.line)).size === 1) {
    totalChips += 10; jChipBonus += 10; breakdown.push('Balconista: +10C')
  }
  if (ids.has('turno_noite') && extra.playsMadeThisBlind >= 2) {
    totalChips += 12; jChipBonus += 12; breakdown.push('Turno Noite: +12C')
  }
  if (ids.has('frentista')) {
    const b = playedCards.length * 3; totalChips += b; jChipBonus += b; breakdown.push(`Frentista: +${b}C`)
  }
  // novos incomuns — chips
  if (ids.has('promotor_mais') && effectiveCards.filter(c => c.line === 'mais').length >= 3) {
    totalChips += 18; jChipBonus += 18; breakdown.push('Promotor Mais: +18C')
  }
  // novos raros — chips
  if (ids.has('maturador')) {
    const lvl = getHandLevel(handLevels, hand.type).level
    const b = lvl * 5; totalChips += b; jChipBonus += b; breakdown.push(`Maturador: +${b}C (nv${lvl})`)
  }
  if (ids.has('blindagem') && boss !== null) {
    totalChips += 25; jChipBonus += 25; breakdown.push('Blindagem: +25C (boss)')
  }
  if (ids.has('franqueado') && (extra.franqueadoBonus ?? 0) > 0) {
    const b = extra.franqueadoBonus!; totalChips += b; jChipBonus += b; breakdown.push(`Franqueado: +${b}C`)
  }
  // novos épicos — chips
  if (ids.has('calculista') && extra.shopSpent > 0) {
    const b = Math.min(Math.floor(extra.shopSpent / 5), 20)
    if (b > 0) { totalChips += b * 5; jChipBonus += b * 5; breakdown.push(`Calculista chips: +${b * 5}C`) }
  }
  // novos lendários — chips
  if (ids.has('onipresente')) {
    const b = jokers.length * 15; totalChips += b; jChipBonus += b; breakdown.push(`Onipresente: +${b}C`)
  }
  // novos 15 — chips
  if (ids.has('etiqueta') && jokers.length > 0) {
    const maxCost = Math.max(...jokers.map(j => j.cost))
    const b = maxCost * 2; totalChips += b; jChipBonus += b; breakdown.push(`Etiqueta: +${b}C`)
  }
  if (ids.has('planilha') && effectiveCards.length === 4) {
    totalChips += 8; jChipBonus += 8; breakdown.push('Planilha: +8C')
  }
  // ── Additive Mult jokers ───────────────────────────────────────────────────
  const counts = countByLine(effectiveCards.filter(c => !c.debuffed))

  // Clássico Gold chip bonus (needs counts)
  if (ids.has('classico_gold') && counts.classico > 0) {
    const cBonus = counts.classico * 5; totalChips += cBonus; jChipBonus += cBonus; breakdown.push(`Clássico Gold Chips: +${cBonus}C`)
  }
  if (ids.has('acougueiro') && Math.max(...Object.values(counts)) >= 3) {
    addMult += 6; jMultBonus += 6; breakdown.push('Zé: +6M')
  }
  if (ids.has('atendente')) {
    const linesN = new Set(effectiveCards.filter(c => !c.debuffed).map(c => c.line)).size
    if (linesN > 0) { addMult += linesN * 3; jMultBonus += linesN * 3; breakdown.push(`Atendente: +${linesN * 3}M`) }
  }
  if (ids.has('especialista')) {
    const org = effectiveCards.filter(c => c.line === 'organica' && !c.debuffed).length
    const b = Math.min(org * 4, 20)
    if (b > 0) { addMult += b; jMultBonus += b; breakdown.push(`Dr. Verde: +${b}M`) }
  }
  if (ids.has('folheto') && ['Pedido Simples','Dupla'].includes(hand.type)) {
    addMult += 5; jMultBonus += 5; breakdown.push('Folheto: +5M')
  }
  if (ids.has('tempero') && hand.type === 'Churrasco Pack') {
    addMult += 15; jMultBonus += 15; breakdown.push('Tempero: +15M')
  }
  if (ids.has('supervisor') && ['Trio','Quadra','Full Combo'].includes(hand.type)) {
    addMult += 3; jMultBonus += 3
  }
  if (ids.has('sortimento') && hand.type === 'Combo Família') {
    addMult += 3; jMultBonus += 3
  }
  if (ids.has('acelerador')) {
    const b = extra.playsMadeThisBlind * 2
    if (b > 0) { addMult += b; jMultBonus += b; breakdown.push(`Acelerador: +${b}M`) }
  }
  if (ids.has('rabo_balao') && extra.target > 0 && (extra.currentScore / extra.target) > 0.60) {
    addMult += 3; jMultBonus += 3; breakdown.push('Rabo: +3M')
  }
  if (ids.has('padrao') && !effectiveCards.some(c => c.debuffed)) {
    addMult += 2; jMultBonus += 2
  }
  if (ids.has('sommelier')) {
    // Raro: cada Premium agora vale +8 Mult
    const prem = effectiveCards.filter(c => c.line === 'premium' && !c.debuffed).length
    if (prem > 0) { addMult += prem * 8; jMultBonus += prem * 8; breakdown.push(`Sommelier: +${prem * 8}M`) }
  }
  if (ids.has('grade_a') && effectiveCards.length === 5) {
    // Raro: +10 Mult em mãos de 5 cartas
    addMult += 10; jMultBonus += 10; breakdown.push('Grau A: +10M')
  }
  if (ids.has('corte_jokers') && jokers.length >= 3) {
    // Raro: +5 por joker acima de 2
    const b = (jokers.length - 2) * 5 + 8
    addMult += b; jMultBonus += b; breakdown.push(`3 Jokers: +${b}M`)
  }
  if (ids.has('classico_gold')) {
    const b = counts.classico * 3; if (b > 0) { addMult += b; jMultBonus += b; breakdown.push(`Clássico Gold: +${b}M`) }
  }
  if (ids.has('bloco_mais') && counts.mais >= 3) {
    addMult += 35; jMultBonus += 35; breakdown.push('Bloco Mais Trio: +35M')
  }
  if (ids.has('swift_premium') && effectiveCards.length >= 3) {
    // Épico: +8 Mult por mão com 3+ cartas
    addMult += 8; jMultBonus += 8
  }
  if (ids.has('fornecedor') && jokers.length > 1) {
    // Lendário: +10 por joker extra
    const b = (jokers.length - 1) * 10; addMult += b; jMultBonus += b; breakdown.push(`Fornecedor: +${b}M`)
  }
  if (ids.has('complemento')) {
    const allLines = ['organica','mais','premium','classico'].every(l => counts[l as ProductLine] >= 1)
    if (allLines) { addMult += 6; jMultBonus += 6; breakdown.push('Prato: +6M') }
  }
  if (ids.has('economia')) {
    const b = Math.min(Math.floor(extra.money / 3), 16)
    if (b > 0) { addMult += b; jMultBonus += b; breakdown.push(`Economia: +${b}M`) }
  }
  if (ids.has('ceo_operacao')) {
    // Épico: +12 Mult fixo (representa crescimento acumulado)
    addMult += 12; jMultBonus += 12; breakdown.push('CEO: +12M')
  }
  if (ids.has('crachá') && extra.playsMadeThisBlind >= 2) {
    addMult += 3; jMultBonus += 3; breakdown.push('Crachá: +3M')
  }
  if (ids.has('analista') && extra.playsMadeThisBlind === 0 && playsRemaining < 4) {
    addMult += 8; jMultBonus += 8; breakdown.push('Ana Dados: +8M')
  }
  if (ids.has('combo_mestre') && jokers.length > 1) {
    const b = (jokers.length - 1) * 5; addMult += b; jMultBonus += b; breakdown.push(`Combo Mestre: +${b}M`)
  }
  if (ids.has('fiscal_sif') && boss !== null && !effectiveCards.some(c => c.debuffed)) {
    // Raro: +10 Mult sem debuff em boss
    addMult += 10; jMultBonus += 10; breakdown.push('Fiscal SIF: +10M')
  }
  if (ids.has('relogio')) {
    // Raro: +6 Mult por jogada restante
    const b = playsRemaining * 6; if (b > 0) { addMult += b; jMultBonus += b; breakdown.push(`Relógio: +${b}M`) }
  }
  if (ids.has('rei_gado') && hand.type === 'Quadra' && effectiveCards.every(c => c.line === 'premium')) {
    addMult += 18; jMultBonus += 18; breakdown.push('Rei do Gado: +18M')
  }
  if (ids.has('marca_propria')) {
    const linesN = new Set(effectiveCards.filter(c => !c.debuffed).map(c => c.line)).size
    if (linesN > 0) { addMult += linesN * 3; jMultBonus += linesN * 3; breakdown.push(`Marca Própria: +${linesN * 3}M`) }
  }
  // novos comuns — mult
  if (ids.has('degustador') && playedCards.length === 1) {
    addMult += 5; jMultBonus += 5; breakdown.push('Degustador: +5M')
  }
  if (ids.has('caixa_surpresa')) {
    const b = Math.ceil(Math.random() * 6)
    addMult += b; jMultBonus += b; breakdown.push(`Surpresa: +${b}M`)
  }
  // novos incomuns — mult
  if (ids.has('fiscal_linha')) {
    const b = Object.values(counts).filter(v => v >= 2).length * 4
    if (b > 0) { addMult += b; jMultBonus += b; breakdown.push(`Fiscal Linha: +${b}M`) }
  }
  if (ids.has('gerente_zona') && extra.target > 0 && extra.currentScore >= extra.target * 0.5) {
    addMult += 5; jMultBonus += 5; breakdown.push('Gerente Zona: +5M')
  }
  if (ids.has('controlador') && !effectiveCards.some(c => c.debuffed)) {
    addMult += 6; jMultBonus += 6; breakdown.push('Controlador: +6M')
  }
  if (ids.has('estagiario') && isFirstPlay) {
    const b = hand.type === 'Full Combo' ? 6 : 3
    addMult += b; jMultBonus += b; breakdown.push(`Estagiário: +${b}M`)
  }
  if (ids.has('treinador')) {
    const b = jokers.length * 2; if (b > 0) { addMult += b; jMultBonus += b; breakdown.push(`Treinador: +${b}M`) }
  }
  if (ids.has('planilha') && effectiveCards.length === 4) {
    addMult += 2; jMultBonus += 2; breakdown.push('Planilha: +2M')
  }
  // novos raros — mult
  if (ids.has('rastreador') && new Set(effectiveCards.filter(c => !c.debuffed).map(c => c.line)).size === 3) {
    addMult += 12; jMultBonus += 12; breakdown.push('Rastreador: +12M')
  }
  if (ids.has('impulso') && extra.prevChips > 0 && Math.round(totalChips * ((baseMult + addMult) || 1)) > extra.currentScore) {
    addMult += 15; jMultBonus += 15; breakdown.push('Impulso: +15M')
  }
  if (ids.has('catalisador')) {
    // +1.3 per consecutive blind won — we approximate using playsMadeThisBlind as proxy, capped at ×2
    const b = Math.min(extra.playsMadeThisBlind, 3)
    if (b > 0) { addMult += b * 2; jMultBonus += b * 2; breakdown.push(`Catalisador: +${b * 2}M`) }
  }
  // novos épicos — mult
  if (ids.has('calculista') && extra.shopSpent > 0) {
    const b = Math.min(Math.floor(extra.shopSpent / 5), 20)
    if (b > 0) { addMult += b; jMultBonus += b; breakdown.push(`Calculista: +${b}M`) }
  }
  if (ids.has('overdrive') && playsRemaining === 0) {
    totalChips += 50; jChipBonus += 50; addMult += 20; jMultBonus += 20; breakdown.push('Overdrive: +50C +20M')
  }
  // novos lendários — mult
  if (ids.has('onipresente')) {
    const b = jokers.length * 4; if (b > 0) { addMult += b; jMultBonus += b; breakdown.push(`Onipresente: +${b}M`) }
  }
  if (ids.has('oraculo') && extra.prevHandType && extra.prevHandType === hand.type) {
    addMult += 20; jMultBonus += 20; breakdown.push('Oráculo: +20M')
  }

  // ── Multiplicative Mult jokers ─────────────────────────────────────────────
  // ── Incomuns ──
  if (ids.has('mkt') && isFirstPlay) { jMultMult *= 2.5; breakdown.push('Beatriz: ×2.5M') }
  if (ids.has('gerente') && playsRemaining >= 2) { jMultMult *= 1.7; breakdown.push('Marcos: ×1.7M') }
  if (ids.has('blend') && new Set(effectiveCards.map(c => c.line)).size === 4) { jMultMult *= 2.8; breakdown.push('Blend: ×2.8M') }

  // ── Raros ──
  if (ids.has('chef') && ['Seleção Premium','Full Combo'].includes(hand.type)) { jMultMult *= 3; breakdown.push('Chef: ×3M') }
  if (ids.has('alta_costura') && hand.type === 'Seleção Premium') { jMultMult *= 4.5; breakdown.push('Alta Costura: ×4.5M') }
  if (ids.has('marmita') && hand.type === 'Trio') { jMultMult *= 2.2; breakdown.push('Marmita: ×2.2M') }
  if (ids.has('pit_master') && Math.max(...Object.values(counts)) >= 4) { jMultMult *= 2.5; breakdown.push('Pit Master: ×2.5M') }
  if (ids.has('classico_gold') && hand.type === 'Quadra' && effectiveCards.every(c => c.line === 'classico')) {
    jMultMult *= 3; breakdown.push('Clássico Gold Quadra: ×3M')
  }

  // ── Épicos ──
  if (ids.has('carne_nobre') && effectiveCards.every(c => c.line === 'premium')) {
    jMultMult *= 3.5; breakdown.push('Carne Nobre: ×3.5M')
  }
  if (ids.has('puro_organico') && effectiveCards.every(c => c.line === 'organica')) {
    jMultMult *= 4; breakdown.push('Puro Orgânico: ×4M')
  }
  if (ids.has('mestre_churrasco') && ['Churrasco Pack','Full Combo'].includes(hand.type)) {
    jMultMult *= 4.5; breakdown.push('Mestre: ×4.5M')
  }
  if (ids.has('dobrador') && playsRemaining === 0) { jMultMult *= 3; breakdown.push('Dobrador: ×3M') }

  // ── Lendários ──
  if (ids.has('acougueiro_lend')) { jMultMult *= 3; breakdown.push('Lendário: ×3M') }
  if (ids.has('linha_de_ouro')) {
    // Lendário: ×1.0 por linha (4 linhas = ×5)
    const linesN = new Set(effectiveCards.filter(c => !c.debuffed).map(c => c.line)).size
    if (linesN > 0) { jMultMult *= (1 + linesN * 1.0); breakdown.push(`Ouro: ×${(1 + linesN).toFixed(0)}M`) }
  }
  if (ids.has('chef_supremo') && effectiveCards.some(c => c.id.startsWith('pre1'))) {
    jMultMult *= 6; breakdown.push('Chef Supremo: ×6M')
  }
  // swift_supremo: aplica ×2 sobre todos os mult-mult acima de 1
  if (ids.has('swift_supremo') && jMultMult > 1) {
    jMultMult = 1 + (jMultMult - 1) * 2.2; breakdown.push('SWIFT SUPREMO: mult×2.2')
  }
  // novos raros — mult-mult
  if (ids.has('pit_boss') && hand.type === 'Churrasco Pack') { jMultMult *= 3; breakdown.push('Pit Boss: ×3M') }
  if (ids.has('corte_fino') && ['Dupla','Trio'].includes(hand.type) && Object.values(counts).filter(v=>v>0).length === 1) {
    jMultMult *= 2; breakdown.push('Corte Fino: ×2M')
  }
  if (ids.has('sommelier2') && hand.type === 'Seleção Premium') {
    const prem = effectiveCards.filter(c => c.line === 'premium' && !c.debuffed).length
    const cb = prem * 10; totalChips += cb; jChipBonus += cb
    jMultMult *= 2.5; breakdown.push(`Grand Sommelier: +${cb}C ×2.5M`)
  }
  // novos épicos — mult-mult
  if (ids.has('turno_duplo') && isFirstPlay) { jMultMult *= 2; breakdown.push('Turno Duplo: ×2M') }
  if (ids.has('rei_combo') && ['Quadra','Full Combo'].includes(hand.type)) { jMultMult *= 1.8; breakdown.push('Rei Combo: ×1.8M') }
  // novos lendários — mult-mult
  if (ids.has('processador') && effectiveCards.length === 5 && new Set(effectiveCards.map(c=>c.line)).size >= 4) {
    jMultMult *= 6; breakdown.push('Processador: ×6M')
  }
  if (ids.has('megafornecedor')) {
    const ln = new Set(effectiveCards.filter(c=>!c.debuffed).map(c=>c.line)).size
    if (ln > 0) { jMultMult *= Math.pow(1.5, ln); breakdown.push(`Mega Fornecedor: ×${Math.pow(1.5,ln).toFixed(2)}M`) }
  }
  // espiao: copy best chip-joker bonus already computed
  if (ids.has('espiao') && jChipBonus > 0) {
    totalChips += jChipBonus; breakdown.push(`Espião: +${jChipBonus}C copiado`)
  }
  // pré-pedido: promete muito, entrega nada (efeito apenas visual no breakdown)
  if (ids.has('pre_pedido')) {
    breakdown.push('Pré-Pedido: ×100 Mult... (processando... erro 404)')
  }

  multMult = jMultMult
  const totalMult = Math.round((baseMult + addMult) * multMult * 10) / 10
  const score = Math.round(totalChips * totalMult)

  return {
    hand, baseChips, baseMult,
    cardChips,
    jokerChipBonus: jChipBonus,
    jokerMultBonus: jMultBonus,
    jokerMultMult: jMultMult,
    totalChips, totalMult, score,
    breakdown,
  }
}

export function calcReward(reward: number, jokers: Joker[]): number {
  const ids = jokers.map(j => j.id)
  let r = reward
  if (ids.includes('executivo')) r += 4
  if (ids.includes('diretor')) r += 3
  return r
}
