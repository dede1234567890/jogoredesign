export type ProductLine = 'organica' | 'mais' | 'premium' | 'classico'
export type BlindType = 'small' | 'big' | 'boss'
export type JokerRarity = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario'

export interface GameCard {
  id: string
  name: string
  line: ProductLine
  chips: number
  emoji: string
  debuffed?: boolean
}

export interface Joker {
  id: string
  name: string
  role: string
  description: string
  cost: number
  emoji: string
  rarity: JokerRarity
}

export interface PlanetCard {
  id: string
  handType: HandType
  name: string
  emoji: string
  cost: number
}

export type HandType =
  | 'Pedido Simples'
  | 'Dupla'
  | 'Trio'
  | 'Quadra'
  | 'Full Combo'
  | 'Combo Variado'
  | 'Pedido Orgânico'
  | 'Combo Família'
  | 'Seleção Premium'
  | 'Churrasco Pack'

export interface HandLevel {
  level: number
  chips: number
  mult: number
}

export const BASE_HAND_LEVELS: Record<HandType, HandLevel> = {
  'Pedido Simples':  { level: 1, chips: 5,   mult: 1 },
  'Dupla':           { level: 1, chips: 10,  mult: 2 },
  'Trio':            { level: 1, chips: 30,  mult: 3 },
  'Quadra':          { level: 1, chips: 60,  mult: 4 },
  'Full Combo':      { level: 1, chips: 100, mult: 6 },
  'Combo Variado':   { level: 1, chips: 20,  mult: 3 },
  'Pedido Orgânico': { level: 1, chips: 35,  mult: 4 },
  'Combo Família':   { level: 1, chips: 40,  mult: 4 },
  'Seleção Premium': { level: 1, chips: 50,  mult: 5 },
  'Churrasco Pack':  { level: 1, chips: 50,  mult: 4 },
}

export const HAND_LEVEL_STEP: Record<HandType, { chips: number; mult: number }> = {
  'Pedido Simples':  { chips: 10, mult: 1 },
  'Dupla':           { chips: 15, mult: 1 },
  'Trio':            { chips: 20, mult: 2 },
  'Quadra':          { chips: 30, mult: 2 },
  'Full Combo':      { chips: 35, mult: 3 },
  'Combo Variado':   { chips: 15, mult: 2 },
  'Pedido Orgânico': { chips: 20, mult: 2 },
  'Combo Família':   { chips: 20, mult: 2 },
  'Seleção Premium': { chips: 25, mult: 2 },
  'Churrasco Pack':  { chips: 20, mult: 2 },
}

export type BossDebuff =
  | 'sem_organico' | 'sem_premium' | 'avaro'
  | 'exigente' | 'sem_descarte' | 'apressado'
  | 'misturado' | 'austero' | 'desconfiado'

export const BOSS_DEBUFFS: Record<BossDebuff, { name: string; description: string; emoji: string }> = {
  sem_organico:  { name: 'Sem Orgânicos',  emoji: '🚫🌿', description: 'Cartas Orgânica não dão Chips este round' },
  sem_premium:   { name: 'Anti-Premium',   emoji: '🚫👑', description: 'Cartas Premium não dão Chips este round' },
  avaro:         { name: 'Avarento',       emoji: '💸',   description: 'A primeira carta de cada mão não contribui com Chips' },
  exigente:      { name: 'Exigente',       emoji: '😤',   description: 'Mínimo 3 cartas por mão, senão score = 0' },
  sem_descarte:  { name: 'Estoque Travado',emoji: '🔒📦', description: 'Sem descartes disponíveis neste round' },
  apressado:     { name: 'Apressado',      emoji: '⏱️',  description: 'Você só tem 2 jogadas neste round' },
  misturado:     { name: 'Sem Combos',     emoji: '🔀',   description: 'Dupla, Trio e Quadra não dão Mult bônus (tudo vira Pedido Simples)' },
  austero:       { name: 'Austero',        emoji: '🧊',   description: 'Mão máxima reduzida para 6 cartas neste round' },
  desconfiado:   { name: 'Desconfiado',    emoji: '🕵️',  description: 'Jokers não dão bônus neste round' },
}

export interface BlindConfig {
  type: BlindType
  name: string
  emoji: string
  targetMultiplier: number
  reward: number
  boss?: BossDebuff
  boss2?: BossDebuff  // second debuff active from ante 3+
}

export const ANTE_BASES = [300, 800, 2000, 5000, 11000, 20000, 35000, 60000]

// Boss blind name and emoji escalate with difficulty tier
const BOSS_TIERS = [
  { name: 'Chefe de Setor',    emoji: '👔' },  // ante 1
  { name: 'Gerente Regional',  emoji: '😠' },  // ante 2
  { name: 'Diretor Comercial', emoji: '🔥' },  // ante 3
  { name: 'VP de Operações',   emoji: '💀' },  // ante 4
  { name: 'CEO da Swift',      emoji: '👑' },  // ante 5+
]

export function getBlinds(ante: number): BlindConfig[] {
  const bossList: BossDebuff[] = ['sem_organico','sem_premium','avaro','exigente','sem_descarte','apressado','misturado','austero','desconfiado']

  // A partir do boss 5, a progressão fica mais equilibrada e evita travar
  // a estratégia principal baseada em Jokers multiplicadores.
  const lateBossConfigs: Partial<Record<number, { boss: BossDebuff; boss2?: BossDebuff; bossMult: number; reward: number }>> = {
    5: { boss: 'sem_descarte', boss2: 'avaro',        bossMult: 8.3, reward: 7 },
    6: { boss: 'apressado',    boss2: 'avaro',        bossMult: 8.6, reward: 7 },
    7: { boss: 'misturado',    boss2: 'sem_organico', bossMult: 9.1, reward: 8 },
    8: { boss: 'austero',      boss2: 'sem_premium',  bossMult: 9.6, reward: 8 },
  }

  const late = lateBossConfigs[ante]
  const boss = late?.boss ?? bossList[(ante - 1) % bossList.length]

  // Antes 3 e 4 ainda podem ter um segundo efeito. Depois disso usamos a configuração balanceada acima.
  const boss2 = late
    ? late.boss2
    : ante >= 3 && ante <= 4
      ? bossList[(ante + 3) % bossList.length]
      : undefined

  // Boss target multiplier and reward scale with ante.
  const bossMult = late?.bossMult ?? (
    ante === 1 ? 7
    : ante === 2 ? 7.5
    : ante === 3 ? 8
    : ante === 4 ? 9
    : ante === 5 ? 8.5
    : ante === 6 ? 9
    : ante === 7 ? 9.5
    : 10
  )
  const bossReward = late?.reward ?? (ante <= 2 ? 5 : ante <= 4 ? 6 : ante <= 6 ? 7 : 8)
  const tier = BOSS_TIERS[Math.min(ante - 1, BOSS_TIERS.length - 1)]

  // Big blind also scales slightly in later antes
  const bigMult = ante <= 3 ? 3 : ante <= 5 ? 3.5 : 4
  const bigReward = ante <= 2 ? 4 : ante <= 5 ? 5 : 6

  return [
    { type: 'small', name: 'Cliente Simples',  emoji: '👤', targetMultiplier: 1, reward: 3 },
    { type: 'big',   name: 'Cliente Exigente', emoji: '😤', targetMultiplier: bigMult, reward: bigReward },
    { type: 'boss',  name: tier.name, emoji: tier.emoji, targetMultiplier: bossMult, reward: bossReward, boss, boss2 },
  ]
}

export const LINE_META: Record<ProductLine, { name: string; emoji: string }> = {
  organica: { name: 'Orgânica',   emoji: '🌿' },
  mais:     { name: 'Swift Mais', emoji: '⭐' },
  premium:  { name: 'Premium',    emoji: '👑' },
  classico: { name: 'Clássico',   emoji: '🌾' },
}

function makeCards(
  line: ProductLine,
  items: Array<{ name: string; chips: number; emoji: string }>,
  prefix: string
): GameCard[] {
  return items.map((item, i) => ({ id: `${prefix}${i + 1}`, line, ...item }))
}

export const ALL_CARDS: GameCard[] = [
  ...makeCards('organica', [
    // originais
    { name: 'Frango Caipira',    chips: 10, emoji: '🐔' },
    { name: 'Ovo Orgânico',      chips: 8,  emoji: '🥚' },
    { name: 'Linguiça Bio',      chips: 12, emoji: '🌿' },
    { name: 'Carne Moída Bio',   chips: 13, emoji: '🥩' },
    { name: 'Costela Orgânica',  chips: 15, emoji: '🦴' },
    { name: 'Peito de Peru Bio', chips: 11, emoji: '🦃' },
    { name: 'Bacon Natural',     chips: 12, emoji: '🥓' },
    { name: 'Lombo Orgânico',    chips: 14, emoji: '🐷' },
    { name: 'Salsicha Bio',      chips: 9,  emoji: '🌭' },
    { name: 'Presunto Natural',  chips: 10, emoji: '🍖' },
    // novos
    { name: 'Picanha Bio',       chips: 17, emoji: '🌿' },
    { name: 'Patinho Orgânico',  chips: 11, emoji: '🐄' },
    { name: 'Coxa Caipira',      chips: 10, emoji: '🐔' },
    { name: 'Calabresa Bio',     chips: 12, emoji: '🌿' },
    { name: 'Paleta Orgânica',   chips: 13, emoji: '🐖' },
    { name: 'Peito Bio Defum.',  chips: 14, emoji: '💨' },
    { name: 'Alcatra Bio',       chips: 16, emoji: '🥩' },
    { name: 'Fraldinha Bio',     chips: 13, emoji: '🌱' },
    { name: 'Costelinha Bio',    chips: 14, emoji: '🦴' },
    { name: 'Mocotó Orgânico',   chips: 9,  emoji: '🫙' },
    { name: 'Língua Bovina Bio', chips: 11, emoji: '🐄' },
    { name: 'Coração Org.',      chips: 10, emoji: '❤️' },
    { name: 'Fígado Orgânico',   chips: 9,  emoji: '🫁' },
  ], 'org'),
  ...makeCards('mais', [
    // originais
    { name: 'Hamburguer Mais', chips: 9,  emoji: '🍔' },
    { name: 'Nuggets Mais',    chips: 8,  emoji: '🍗' },
    { name: 'Hot Dog Mais',    chips: 7,  emoji: '🌭' },
    { name: 'Asa Grelhada',    chips: 8,  emoji: '🍗' },
    { name: 'Bisteca Mais',    chips: 11, emoji: '🥩' },
    { name: 'Coxa Crocante',   chips: 9,  emoji: '🍗' },
    { name: 'Filé de Peito',   chips: 10, emoji: '💪' },
    { name: 'Almôndega Mais',  chips: 8,  emoji: '🥙' },
    { name: 'Espetinho Mais',  chips: 10, emoji: '🍢' },
    { name: 'Frango Inteiro',  chips: 11, emoji: '🐔' },
    // novos
    { name: 'Mini Burger Mais', chips: 7,  emoji: '🍔' },
    { name: 'Wrap Mais',        chips: 9,  emoji: '🌯' },
    { name: 'Tira-Gosto Mais',  chips: 8,  emoji: '🍖' },
    { name: 'Linguicinha Mais', chips: 9,  emoji: '🌭' },
    { name: 'Medalhão Mais',    chips: 11, emoji: '🥩' },
    { name: 'Coxinha Mais',     chips: 7,  emoji: '🍗' },
    { name: 'Patinho Mais',     chips: 10, emoji: '🐄' },
    { name: 'Pernil Mais',      chips: 11, emoji: '🐖' },
    { name: 'Bacon Mais',       chips: 9,  emoji: '🥓' },
    { name: 'Bife Mais',        chips: 10, emoji: '🥩' },
    { name: 'Costeleta Mais',   chips: 10, emoji: '🦴' },
    { name: 'Kibe Mais',        chips: 8,  emoji: '🧆' },
  ], 'mai'),
  ...makeCards('premium', [
    // originais
    { name: 'Picanha Premium',   chips: 20, emoji: '👑' },
    { name: 'Costela Angus',     chips: 18, emoji: '🦴' },
    { name: 'Filé Mignon',       chips: 19, emoji: '💎' },
    { name: 'Fraldinha Premium', chips: 15, emoji: '🥩' },
    { name: 'Maminha',           chips: 14, emoji: '🥩' },
    { name: 'Contrafilé',        chips: 16, emoji: '🥩' },
    { name: 'Alcatra Premium',   chips: 17, emoji: '🥩' },
    { name: 'Linguiça Gourmet',  chips: 13, emoji: '🌟' },
    { name: 'Paleta Suína',      chips: 14, emoji: '🐷' },
    { name: 'Cordeiro Premium',  chips: 18, emoji: '🐑' },
    // novos
    { name: 'Wagyu Premium',     chips: 22, emoji: '🐄' },
    { name: 'T-Bone Premium',    chips: 21, emoji: '🥩' },
    { name: 'Entrecôte',         chips: 19, emoji: '✨' },
    { name: 'Tomahawk',          chips: 22, emoji: '🪓' },
    { name: 'Brisket Angus',     chips: 17, emoji: '🔥' },
    { name: 'Short Rib',         chips: 16, emoji: '🍖' },
    { name: 'Flat Iron Premium', chips: 15, emoji: '⚔️' },
    { name: 'Rump Cap Prem.',    chips: 18, emoji: '👑' },
    { name: 'Chorizo Premium',   chips: 14, emoji: '🌟' },
    { name: 'Ancho Premium',     chips: 17, emoji: '💎' },
    { name: 'Denver Premium',    chips: 16, emoji: '🥩' },
    { name: 'Lombo Premium',     chips: 15, emoji: '🐷' },
    { name: 'Pernil Ouro',       chips: 14, emoji: '🏅' },
  ], 'pre'),
  ...makeCards('classico', [
    // originais
    { name: 'Frango Clássico',  chips: 8,  emoji: '🐔' },
    { name: 'Linguiça Toscana', chips: 9,  emoji: '🌭' },
    { name: 'Hamburguer Clás.', chips: 7,  emoji: '🍔' },
    { name: 'Salsicha Viena',   chips: 6,  emoji: '🌭' },
    { name: 'Carne de Sol',     chips: 10, emoji: '☀️' },
    { name: 'Charque',          chips: 8,  emoji: '🥩' },
    { name: 'Mortadela',        chips: 5,  emoji: '🍖' },
    { name: 'Presunto Fatiado', chips: 6,  emoji: '🍖' },
    { name: 'Peito de Frango',  chips: 9,  emoji: '🍗' },
    { name: 'Bisteca Suína',    chips: 8,  emoji: '🐷' },
    // novos
    { name: 'Apresuntado Clás.', chips: 6,  emoji: '🍖' },
    { name: 'Calabresa Clás.',   chips: 8,  emoji: '🌭' },
    { name: 'Paio Clássico',     chips: 7,  emoji: '🥩' },
    { name: 'Salame Clás.',      chips: 7,  emoji: '🍖' },
    { name: 'Bacon Defum.',      chips: 9,  emoji: '🥓' },
    { name: 'Coração Clás.',     chips: 6,  emoji: '🐔' },
    { name: 'Moela Clás.',       chips: 5,  emoji: '🍗' },
    { name: 'Rins Clás.',        chips: 5,  emoji: '🫘' },
    { name: 'Bucho Clás.',       chips: 6,  emoji: '🐖' },
    { name: 'Rabada Clás.',      chips: 9,  emoji: '🐄' },
    { name: 'Pé de Porco Clás.', chips: 7,  emoji: '🐷' },
    { name: 'Mondongo Clás.',    chips: 6,  emoji: '🫙' },
  ], 'cla'),
]

// ─── All Jokers (65 total) ────────────────────────────────────────────────────
export const ALL_JOKERS: Joker[] = [
  // ── COMUNS ──────────────────────────────────────────────────────────────────
  { id: 'acougueiro',   name: 'Zé Açougueiro',     role: 'Açougueiro',     rarity: 'comum',    cost: 3, emoji: '🔪', description: '+6 Mult se combo tiver 3+ cartas da mesma linha' },
  { id: 'promotora',    name: 'Carla Promotora',    role: 'Promotora',      rarity: 'comum',    cost: 2, emoji: '📣', description: '+25 Chips em combos com 2+ linhas diferentes' },
  { id: 'repositora',   name: 'Ana Repositora',     role: 'Repositora',     rarity: 'comum',    cost: 2, emoji: '📦', description: '+$1 no fim de cada round por descarte não usado' },
  { id: 'estoquista',   name: 'Paulo Estoque',      role: 'Estoquista',     rarity: 'comum',    cost: 2, emoji: '🏭', description: '+12 Chips para cada carta Clássico jogada' },
  { id: 'atendente',    name: 'Atendente Feliz',    role: 'Atendente',      rarity: 'comum',    cost: 3, emoji: '😊', description: '+3 Mult por cada linha diferente na mão jogada' },
  { id: 'checklist',    name: 'Checklist',          role: 'Analista',       rarity: 'comum',    cost: 2, emoji: '📋', description: 'Jogar exatamente 3 cartas dá +25 Chips' },
  { id: 'folheto',      name: 'Folheto',            role: 'Marketing',      rarity: 'comum',    cost: 2, emoji: '📄', description: 'Pedido Simples e Dupla ganham +5 Mult' },
  { id: 'novato',       name: 'O Novato',           role: 'Trainee',        rarity: 'comum',    cost: 2, emoji: '🧑‍💼', description: 'Primeira jogada de cada blind dá +35 Chips extras' },
  { id: 'complemento',  name: 'Prato Completo',     role: 'Nutricionista',  rarity: 'comum',    cost: 3, emoji: '🍽️', description: 'Mão com 1 carta de cada linha = +4 Mult extra' },
  { id: 'fresquinho',   name: 'Produto Fresquinho', role: 'Inspetor',       rarity: 'comum',    cost: 2, emoji: '❄️', description: 'Cartas com Chips ≥ 12 dão +5 Chips adicionais' },
  { id: 'simples',      name: 'Pedido do Dia',      role: 'Caixa',          rarity: 'comum',    cost: 2, emoji: '🗒️', description: 'Combo Variado dá +20 Chips extras' },
  { id: 'ficha_verde',  name: 'Ficha Verde',        role: 'Controlador',    rarity: 'comum',    cost: 2, emoji: '🟢', description: 'Cada carta Orgânica jogada dá +3 Chips além do normal' },
  { id: 'fidelidade',   name: 'Cartão Fidelidade',  role: 'CRM',            rarity: 'comum',    cost: 3, emoji: '💳', description: 'A cada 3 blinds vencidos, +15 Chips permanentes' },
  { id: 'desconto',     name: 'Desconto Relâmpago', role: 'Promotor',       rarity: 'comum',    cost: 2, emoji: '⚡', description: 'Primeira compra de cada loja custa $1 a menos' },
  { id: 'porcao',       name: 'Porção Extra',       role: 'Servente',       rarity: 'comum',    cost: 2, emoji: '🥘', description: 'Jogar 5 cartas dá +15 Chips extras sempre' },
  // novos comuns
  { id: 'entregador',   name: 'Entregador Rápido',  role: 'Delivery',       rarity: 'comum',    cost: 2, emoji: '🛵', description: '+10 Chips em toda jogada com exatamente 2 cartas' },
  { id: 'crachá',       name: 'Crachá de Ouro',     role: 'Funcionário',    rarity: 'comum',    cost: 3, emoji: '🏷️', description: '+2 Mult em toda jogada após a 2ª do blind' },
  { id: 'paleta',       name: 'Paleta de Produtos',  role: 'Visual',        rarity: 'comum',    cost: 2, emoji: '🎨', description: '+8 Chips por carta Mais jogada' },

  // ── INCOMUNS ────────────────────────────────────────────────────────────────
  { id: 'gerente',      name: 'Marcos Gerente',     role: 'Gerente',        rarity: 'incomum',  cost: 5, emoji: '💼', description: '×1.6 Mult se vencer o blind com 2+ jogadas sobrando' },
  { id: 'especialista', name: 'Dr. Verde',          role: 'Esp. Orgânico',  rarity: 'incomum',  cost: 4, emoji: '🌱', description: '+4 Mult por carta Orgânica jogada (máx +20)' },
  { id: 'supervisor',   name: 'Dra. Qualidade',     role: 'Supervisora',    rarity: 'incomum',  cost: 5, emoji: '🔍', description: '+40 Chips e +3 Mult em qualquer Trio ou melhor' },
  { id: 'logistica',    name: 'Rogério Logística',  role: 'Logística',      rarity: 'incomum',  cost: 4, emoji: '🚚', description: '+18 Chips para cada carta Swift Mais jogada' },
  { id: 'mkt',          name: 'Beatriz Mkt',        role: 'Marketing',      rarity: 'incomum',  cost: 6, emoji: '📊', description: 'Primeira jogada de cada round tem Mult ×2.5' },
  { id: 'acelerador',   name: 'Acelerador',         role: 'Dinamizador',    rarity: 'incomum',  cost: 4, emoji: '🚀', description: 'A cada jogada feita no blind, +2 Mult acumulativo' },
  { id: 'padrao',       name: 'Padrão de Qualidade',role: 'Auditor',        rarity: 'incomum',  cost: 5, emoji: '✅', description: 'Se nenhuma carta for debuffada, +30 Chips +2 Mult' },
  { id: 'tempero',      name: 'Mestre Tempero',     role: 'Pit Master',     rarity: 'incomum',  cost: 4, emoji: '🫚', description: 'Churrasco Pack dá +15 Mult extra' },
  { id: 'blend',        name: 'O Blend Perfeito',   role: 'Blendista',      rarity: 'incomum',  cost: 5, emoji: '🎨', description: 'Mão com 4 linhas diferentes = ×2.5 Mult' },
  { id: 'sortimento',   name: 'Sortimento Especial',role: 'Comprador',      rarity: 'incomum',  cost: 4, emoji: '🗂️', description: 'Combo Família dá +35 Chips +3 Mult' },
  { id: 'maturacao',    name: 'Maturação',          role: 'Curador',        rarity: 'incomum',  cost: 5, emoji: '⏳', description: 'Vencer um blind sem usar descartes dá +3 Mult permanente' },
  { id: 'rabo_balao',   name: 'Rabo de Balão',      role: 'Festeiro',       rarity: 'incomum',  cost: 4, emoji: '🎈', description: 'Se score > 60% da meta, +3 Mult nessa jogada' },
  { id: 'caixeiro',     name: 'Caixeiro Veloz',     role: 'Caixa Sr.',      rarity: 'incomum',  cost: 4, emoji: '💨', description: 'Vencer o blind na 1ª jogada dá +$4 bônus' },
  { id: 'varejista',    name: 'Espírito Varejista',  role: 'Buyer',         rarity: 'incomum',  cost: 5, emoji: '🏬', description: 'A cada $7 gastos na loja, +6 Chips permanentes' },
  { id: 'refrigerador', name: 'Refrigerador',       role: 'Conservador',    rarity: 'incomum',  cost: 4, emoji: '🧊', description: 'Cartas com Chips ≥ 14 ganham +7 Chips extras ao jogar' },
  // novos incomuns
  { id: 'analista',     name: 'Ana Dados',          role: 'Data Analyst',   rarity: 'incomum',  cost: 5, emoji: '📱', description: '+5 Mult se você jogar a mão sem descartar neste blind' },
  { id: 'combo_mestre', name: 'Mestre dos Combos',  role: 'Estrategista',   rarity: 'incomum',  cost: 5, emoji: '🧩', description: '+3 Mult por cada Joker que você possui além do primeiro' },
  { id: 'reforco',      name: 'Reforço de Estoque', role: 'Comprador',      rarity: 'incomum',  cost: 4, emoji: '📫', description: '+20 Chips se seu deck tiver mais de 100 cartas' },

  // ── RAROS ───────────────────────────────────────────────────────────────────
  { id: 'chef',         name: 'Chef Augusto',       role: 'Chef de Açougue',rarity: 'raro',     cost: 6, emoji: '👨‍🍳', description: '×3 Mult em Seleção Premium ou Full Combo' },
  { id: 'diretor',      name: 'Sra. Vendas',        role: 'Diretora',       rarity: 'raro',     cost: 7, emoji: '💰', description: '+$3 por blind vencido. Bônus de chips/80 em dinheiro' },
  { id: 'sommelier',    name: 'Sommelier da Carne', role: 'Sommelier',      rarity: 'raro',     cost: 6, emoji: '🍷', description: 'Cada carta Premium jogada dá +8 Mult' },
  { id: 'vendedor',     name: 'Vendedor Nato',       role: 'Vendedor',      rarity: 'raro',     cost: 5, emoji: '🤝', description: '+90 Chips ao jogar exatamente 5 cartas' },
  { id: 'freezer',      name: 'Câmara Fria',         role: 'Armazenista',   rarity: 'raro',     cost: 6, emoji: '🥶', description: 'Chips de cartas Orgânica são ×1.8' },
  { id: 'grade_a',      name: 'Grau A',              role: 'Inspector SIF', rarity: 'raro',     cost: 5, emoji: '🏅', description: 'Mão com 5 cartas dá +10 Mult' },
  { id: 'marmita',      name: 'Marmita',             role: 'Cozinheiro',    rarity: 'raro',     cost: 5, emoji: '🍱', description: 'Trio dá ×2.2 Mult' },
  { id: 'linha_producao',name: 'Linha de Produção',  role: 'Operador',      rarity: 'raro',     cost: 6, emoji: '🏗️', description: 'Full Combo dá +220 Chips extras' },
  { id: 'corte_especial',name: 'Corte Especial',     role: 'Carniceiro',    rarity: 'raro',     cost: 5, emoji: '🗡️', description: 'Carta de maior Chips: +150% bônus' },
  { id: 'corte_jokers',  name: 'Jokers Ativos',      role: 'Coordenador',   rarity: 'raro',     cost: 6, emoji: '🎰', description: '3 Jokers: +8M. Cada joker extra soma +5M a mais' },
  { id: 'alta_costura',  name: 'Alta Costura',        role: 'Designer',     rarity: 'raro',     cost: 7, emoji: '👗', description: 'Seleção Premium dá ×4.5 Mult' },
  { id: 'atacadao',      name: 'Atacadão',            role: 'Atacadista',   rarity: 'raro',     cost: 5, emoji: '🏪', description: 'Compras na loja custam $2 a menos (mínimo $1)' },
  { id: 'economia',      name: 'Economia de Escala',  role: 'CFO',          rarity: 'raro',     cost: 6, emoji: '📈', description: 'Cada $3 de saldo dá +1 Mult (máx 16)' },
  // novos raros
  { id: 'pit_master',   name: 'Pit Master Xis',     role: 'Churrasqueiro',  rarity: 'raro',     cost: 6, emoji: '🥩🔥', description: '4+ cartas da mesma linha: ×2.5 Mult' },
  { id: 'fiscal_sif',   name: 'Fiscal do SIF',      role: 'Inspetor Federal',rarity: 'raro',    cost: 6, emoji: '🔎', description: 'No boss sem debuffs: +80 Chips +10 Mult' },
  { id: 'relogio',      name: 'Relógio de Corte',   role: 'Mestre do Tempo',rarity: 'raro',    cost: 5, emoji: '⏰', description: '+6 Mult por jogada ainda disponível ao jogar' },

  // ── ÉPICOS ──────────────────────────────────────────────────────────────────
  { id: 'carne_nobre',   name: 'Carne Nobre',        role: 'Sommelier Chefe',rarity: 'epico',  cost: 9,  emoji: '🥩✨', description: '×3.5 Mult se TODAS as cartas forem Premium' },
  { id: 'puro_organico', name: 'Puro Orgânico',      role: 'Agrônomo',       rarity: 'epico',  cost: 9,  emoji: '🌿✨', description: '×4 Mult se TODAS as cartas forem Orgânicas' },
  { id: 'mestre_churrasco',name: 'Mestre do Churras',role: 'Pit Boss',       rarity: 'epico',  cost: 11, emoji: '🔥✨', description: 'Churrasco Pack e Full Combo dão ×4.5 Mult' },
  { id: 'executivo',     name: 'O Executivo',        role: 'VP',             rarity: 'epico',  cost: 10, emoji: '🎩✨', description: '+$4 extras ao vencer cada blind' },
  { id: 'cadeia_fria',   name: 'Cadeia Fria',        role: 'Logístico',      rarity: 'epico',  cost: 9,  emoji: '🧊✨', description: 'Chips da jogada anterior viram bônus (acumula até +80)' },
  { id: 'dobrador',      name: 'Dobrador de Lucros',  role: 'Investidor',    rarity: 'epico',  cost: 11, emoji: '💹',   description: '×3 Mult na última jogada de cada blind' },
  { id: 'bloco_mais',    name: 'Bloco Swift Mais',   role: 'Gerente de Linha',rarity: 'epico', cost: 9,  emoji: '⭐🔥', description: 'Mais dá ×1.8 Chips. Trio de Mais = +35 Mult' },
  { id: 'classico_gold', name: 'Clássico Gold',      role: 'Diretor Clássico',rarity: 'epico', cost: 8,  emoji: '🌾✨', description: 'Clássico: +8C +5 bônus cada. Quadra Clássico ×3 Mult' },
  { id: 'ceo_operacao',  name: 'CEO em Operação',    role: 'CEO',            rarity: 'epico',  cost: 12, emoji: '🧑‍💼⚡', description: '+12 Mult fixo + +80 Chips extra por mão' },
  { id: 'swift_premium', name: 'Swift Premium Pass', role: 'Conselheiro',   rarity: 'epico',  cost: 10, emoji: '💎🌟', description: '+80 Chips +8 Mult em qualquer mão com 3+ cartas' },
  // novos épicos
  { id: 'investidor',   name: 'Investidor Anjo',    role: 'Angel Investor', rarity: 'epico',   cost: 11, emoji: '💫',   description: '+$2 para cada $10 ao entrar na loja' },
  { id: 'rei_gado',     name: 'Rei do Gado',        role: 'Agropecuarista', rarity: 'epico',   cost: 10, emoji: '🐄👑', description: 'Premium: +5 Chips extras cada. Quadra Premium: +18 Mult' },

  // ── LENDÁRIOS ───────────────────────────────────────────────────────────────
  { id: 'acougueiro_lend',name: 'O Açougueiro Lendário',role: 'Lenda',     rarity: 'lendario', cost: 15, emoji: '🔱',   description: '×3 Mult SEMPRE. +60 Chips em toda jogada.' },
  { id: 'diretor_geral',  name: 'Diretor Geral Swift', role: 'Fundador',   rarity: 'lendario', cost: 16, emoji: '🌐',   description: 'Ao vencer cada blind, adiciona 1 carta Premium à mão' },
  { id: 'linha_de_ouro',  name: 'Linha de Ouro',      role: 'Alquimista',  rarity: 'lendario', cost: 14, emoji: '⚜️',  description: 'Cada linha diferente na mão = ×1 Mult extra (4 linhas = ×5)' },
  { id: 'chef_supremo',   name: 'Chef Supremo',        role: 'Lenda Culin.',rarity: 'lendario', cost: 18, emoji: '👑🍳', description: 'Mão com Picanha Premium: ×6 Mult' },
  { id: 'fornecedor',     name: 'Fornecedor Exclusivo',role: 'Monopolista', rarity: 'lendario', cost: 16, emoji: '🏭🌐', description: 'Cada Joker além do primeiro dá +10 Mult (empilha)' },
  { id: 'marca_propria',  name: 'Marca Própria',       role: 'Inovador',   rarity: 'lendario', cost: 14, emoji: '🎯✨', description: '+$2 por linha diferente + +3 Mult por linha em toda jogada' },
  { id: 'swift_supremo',  name: 'SWIFT SUPREMO',       role: 'Deus dos Combos',rarity: 'lendario',cost:20, emoji: '🌟🔱', description: 'Todos os Mult multiplicativos são ×2.2. É absurdo.' },
  { id: 'infinito',       name: 'Estoque Infinito',    role: 'Mago',       rarity: 'lendario', cost: 17, emoji: '♾️',   description: 'Cartas descartadas voltam ao fundo do deck' },

  // ── 20 NOVOS JOKERS ─────────────────────────────────────────────────────────
  // Comuns
  { id: 'balconista',    name: 'Balconista Bravo',    role: 'Atendente',   rarity: 'comum',    cost: 3,  emoji: '🪙',   description: '+10 Chips se a mão tiver só 1 tipo de linha' },
  { id: 'degustador',    name: 'Degustador',          role: 'Promotor',    rarity: 'comum',    cost: 3,  emoji: '😋',   description: '+5 Mult ao jogar exatamente 1 carta' },
  { id: 'turno_noite',   name: 'Turno da Noite',      role: 'Operador',    rarity: 'comum',    cost: 2,  emoji: '🌙',   description: '+12 Chips a partir da 3ª jogada de cada blind' },
  { id: 'frentista',     name: 'Frentista',           role: 'Frente de Loja',rarity: 'comum',  cost: 2,  emoji: '⛽',   description: '+3 Chips por cada carta jogada na mão' },
  // Incomuns
  { id: 'fiscal_linha',  name: 'Fiscal de Linha',     role: 'Inspetor',    rarity: 'incomum',  cost: 4,  emoji: '📋',   description: '+4 Mult por linha que aparece 2+ vezes na mão' },
  { id: 'promotor_mais', name: 'Promotor Mais',       role: 'Promotor',    rarity: 'incomum',  cost: 4,  emoji: '⭐📣', description: '+18 Chips se jogar 3+ cartas Swift Mais' },
  { id: 'gerente_zona',  name: 'Gerente de Zona',     role: 'Gerente',     rarity: 'incomum',  cost: 5,  emoji: '🗺️',  description: '×1.4 Mult se score atual já ≥50% da meta' },
  { id: 'controlador',   name: 'Controlador',         role: 'Supervisor',  rarity: 'incomum',  cost: 5,  emoji: '🏬',   description: '+6 Mult se nenhuma carta da mão for debuffada' },
  // Raros
  { id: 'rastreador',    name: 'Rastreador de Lote',  role: 'Técnico SIF', rarity: 'raro',     cost: 6,  emoji: '📡',   description: '+12 Mult se a mão tiver exatamente 3 linhas diferentes' },
  { id: 'pit_boss',      name: 'Pit Boss Supremo',    role: 'Churrasqueiro',rarity: 'raro',    cost: 6,  emoji: '🔥🏆', description: 'Churrasco Pack dá ×3 Mult extra' },
  { id: 'maturador',     name: 'Câmara de Maturação', role: 'Curador',     rarity: 'raro',     cost: 5,  emoji: '🧫',   description: '+5 Chips por nível atual da mão jogada' },
  { id: 'corte_fino',    name: 'Corte Fino',          role: 'Laminador',   rarity: 'raro',     cost: 6,  emoji: '🔪✨', description: 'Dupla ou Trio de uma só linha: ×2 Mult' },
  { id: 'sommelier2',    name: 'Grand Sommelier',     role: 'Expert Gourmet',rarity: 'raro',   cost: 7,  emoji: '🍾',   description: 'Seleção Premium: ×2.5 Mult e +10 Chips por carta Premium' },
  // Épicos
  { id: 'turno_duplo',   name: 'Turno Duplo',         role: 'Operador Sr.', rarity: 'epico',   cost: 10, emoji: '⏩✨', description: '1ª jogada de cada blind: ×2 Mult no score' },
  { id: 'rei_combo',     name: 'Rei dos Combos',      role: 'Campeão',     rarity: 'epico',    cost: 10, emoji: '👑🎰', description: 'Quadra ou Full Combo: ×1.8 Mult adicional' },
  { id: 'blindagem',     name: 'Blindagem Premium',   role: 'Segurança',   rarity: 'epico',    cost: 9,  emoji: '🛡️✨', description: 'Em boss blind: +25 Chips e Jokers nunca suprimidos' },
  { id: 'calculista',    name: 'Calculista',          role: 'Analista',    rarity: 'epico',    cost: 9,  emoji: '🧮',   description: '+1 Mult para cada $5 gastos na loja neste run (máx +20)' },
  // Lendários
  { id: 'processador',   name: 'Processador Swift',   role: 'Engenheiro',  rarity: 'lendario', cost: 18, emoji: '⚙️🌟', description: 'Mão com 5 cartas de 4+ linhas: ×6 Mult' },
  { id: 'onipresente',   name: 'Onipresente Swift',   role: 'Entidade',    rarity: 'lendario', cost: 18, emoji: '🌌',   description: '+15 Chips e +4 Mult por cada Joker que você possui' },
  { id: 'midas',         name: 'Toque de Midas',      role: 'Alquimista',  rarity: 'lendario', cost: 16, emoji: '✋🟡', description: 'Recompensa de dinheiro é dobrada ao vencer cada blind' },

  // ── 15 NOVOS JOKERS ─────────────────────────────────────────────────────────
  // Comuns
  { id: 'caixa_surpresa',name: 'Caixa Surpresa',      role: 'Brinde',      rarity: 'comum',    cost: 2,  emoji: '🎁',   description: '+1 Mult aleatório entre 1 e 6 em toda jogada' },
  { id: 'etiqueta',      name: 'Etiqueta de Preço',   role: 'Precificador',rarity: 'comum',    cost: 2,  emoji: '🏷️',  description: '+2 Chips por $1 de custo do joker mais caro que você tem' },
  // Incomuns
  { id: 'estagiario',    name: 'Estagiário Animado',  role: 'Estagiário',  rarity: 'incomum',  cost: 4,  emoji: '🧑‍🎓', description: '+3 Mult na 1ª jogada. Dobra para +6 se for Full Combo' },
  { id: 'treinador',     name: 'Treinador de Equipe',  role: 'Coach',      rarity: 'incomum',  cost: 5,  emoji: '🏋️',  description: '+2 Mult por cada joker diferente que você possui' },
  { id: 'planilha',      name: 'Planilha Mágica',     role: 'Analista',    rarity: 'incomum',  cost: 4,  emoji: '📊',   description: '+8 Chips e +2 Mult se jogar exatamente 4 cartas' },
  // Raros
  { id: 'coringa',       name: 'Coringa do Estoque',  role: 'Curinga',     rarity: 'raro',     cost: 6,  emoji: '🃏',   description: 'Trata qualquer linha como Clássico para fins de combo' },
  { id: 'espiao',        name: 'Espião Corporativo',  role: 'Espião',      rarity: 'raro',     cost: 7,  emoji: '🕵️‍♂️',description: 'Copia o bônus de Chips do joker com maior bônus na jogada' },
  { id: 'impulso',       name: 'Impulso de Vendas',   role: 'Promotor Sr.',rarity: 'raro',     cost: 6,  emoji: '📈🔥', description: '+15 Mult se o score desta jogada superar o da anterior' },
  // Épicos
  { id: 'overdrive',     name: 'Overdrive Comercial', role: 'Vendedor Turbo',rarity: 'epico',  cost: 11, emoji: '💥⚡', description: 'Última jogada do blind: +50 Chips e ×2 Mult' },
  { id: 'franqueado',    name: 'Franqueado Swift',    role: 'Franqueado',  rarity: 'epico',    cost: 10, emoji: '🏢✨', description: '+$1 por blind vencido que acumula como bônus de Chips (+5C cada)' },
  // Lendários
  { id: 'oraculo',       name: 'Oráculo do Mercado',  role: 'Visionário',  rarity: 'lendario', cost: 17, emoji: '🔮',   description: '+20 Mult se a mão detectada for igual à da jogada anterior' },
  { id: 'megafornecedor',name: 'Mega Fornecedor',     role: 'Oligopolista',rarity: 'lendario', cost: 19, emoji: '🏭💎', description: '×1.5 Mult por linha diferente na mão (4 linhas = ×6.25)' },
  // ── PRÉ-PEDIDO (carta piada) ──────────────────────────────────────────────
  { id: 'pre_pedido',    name: 'Pré-Pedido',          role: 'Promessa Vazia',rarity: 'lendario',cost: 1, emoji: '📜❌', description: '×100 Mult e +2763 Chips em TODAS as jogadas!! (ao equipar, perde 1 jogada por impraticidade. Nenhum benefício real.)' },
  // mais 2 para fechar 15
  { id: 'catalisador',   name: 'Catalisador de Lucro',role: 'Químico',     rarity: 'raro',     cost: 6,  emoji: '⚗️',   description: '×1.3 Mult a cada blind consecutivo vencido sem game over (acumula)' },
]

// Indicadores de negócio (modo normal) — antes eram planetas
export const ALL_PLANETS: PlanetCard[] = [
  { id: 'pl_simples',   handType: 'Pedido Simples',  name: 'IPCA',         emoji: '📊', cost: 3 },
  { id: 'pl_dupla',     handType: 'Dupla',            name: 'Positivação',  emoji: '📈', cost: 3 },
  { id: 'pl_trio',      handType: 'Trio',             name: 'MM',           emoji: '💹', cost: 3 },
  { id: 'pl_quadra',    handType: 'Quadra',           name: 'Ticket Médio', emoji: '🎫', cost: 3 },
  { id: 'pl_full',      handType: 'Full Combo',       name: 'NPS',          emoji: '⭐', cost: 3 },
  { id: 'pl_variado',   handType: 'Combo Variado',    name: 'Giro Estoque', emoji: '🔄', cost: 3 },
  { id: 'pl_organico',  handType: 'Pedido Orgânico',  name: 'ROI',          emoji: '💰', cost: 3 },
  { id: 'pl_familia',   handType: 'Combo Família',    name: 'EBITDA',       emoji: '📉', cost: 3 },
  { id: 'pl_premium',   handType: 'Seleção Premium',  name: 'Market Share', emoji: '🥧', cost: 3 },
  { id: 'pl_churrasco', handType: 'Churrasco Pack',   name: 'CAC',          emoji: '🎯', cost: 3 },
]

// Indicadores avançados (modo desafio) — custo maior, bônus maiores
export const ALL_PLANETS_CHALLENGE: PlanetCard[] = [
  { id: 'cpl_simples',   handType: 'Pedido Simples',  name: 'CAGR',         emoji: '📊', cost: 5 },
  { id: 'cpl_dupla',     handType: 'Dupla',            name: 'Churn Rate',   emoji: '🔻', cost: 5 },
  { id: 'cpl_trio',      handType: 'Trio',             name: 'ARPU',         emoji: '💹', cost: 5 },
  { id: 'cpl_quadra',    handType: 'Quadra',           name: 'LTV',          emoji: '♾️', cost: 5 },
  { id: 'cpl_full',      handType: 'Full Combo',       name: 'P&L',          emoji: '📋', cost: 5 },
  { id: 'cpl_variado',   handType: 'Combo Variado',    name: 'Break-even',   emoji: '⚖️', cost: 5 },
  { id: 'cpl_organico',  handType: 'Pedido Orgânico',  name: 'SLA',          emoji: '🤝', cost: 5 },
  { id: 'cpl_familia',   handType: 'Combo Família',    name: 'WACC',         emoji: '💲', cost: 5 },
  { id: 'cpl_premium',   handType: 'Seleção Premium',  name: 'FCF',          emoji: '🏦', cost: 5 },
  { id: 'cpl_churrasco', handType: 'Churrasco Pack',   name: 'ROE',          emoji: '🔑', cost: 5 },
]

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function makeDeck(): GameCard[] {
  return shuffle([...ALL_CARDS, ...ALL_CARDS, ...ALL_CARDS])
}
