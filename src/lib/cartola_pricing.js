/**
 * Módulo de precificação do Cartola baseado em stats da temporada 2025/26.
 *
 * Estratégia: normalização relativa dentro do pool da Copa.
 * O pior jogador de cada posição recebe o preço base.
 * O melhor recebe o preço máximo.
 * Todos os outros são interpolados — garantindo sempre um range completo
 * independente de quão elite seja o elenco da Copa.
 */

// ── Configuração ────────────────────────────────────────────────────────────────
export const PRICE_CONFIG = {
  BASE:      { GK: 8,  DEF: 7,  MID: 9,  FWD: 10 },
  MAX_BONUS: { GK: 7,  DEF: 7,  MID: 8,  FWD: 10 },
  //           GK máx = C$15, DEF = C$14, MID = C$17, FWD = C$20

  // Pesos por posição (o que conta mais para cada função)
  WEIGHTS: {
    GK:  { goals: 0.2, assists: 0.1, cleanSheets: 1.0, saves:       0.05 },
    DEF: { goals: 0.5, assists: 0.4, cleanSheets: 0.8, saves:       0    },
    MID: { goals: 0.8, assists: 0.7, cleanSheets: 0,   saves:       0    },
    FWD: { goals: 1.0, assists: 0.5, cleanSheets: 0,   saves:       0    },
  },
}

// ── Funções auxiliares ──────────────────────────────────────────────────────────
export function roundToHalf(n) {
  return Math.round(n * 2) / 2
}

/**
 * Calcula o score bruto de um jogador com base nos seus stats da temporada.
 * Retorna um número "cru" — quanto maior, melhor.
 *
 * @param {string} position - 'GK' | 'DEF' | 'MID' | 'FWD'
 * @param {object} stats
 *   @param {number} stats.goals
 *   @param {number} stats.assists
 *   @param {number} stats.cleanSheets    - jogos sem sofrer gol
 *   @param {number} stats.saves          - defesas do goleiro
 *   @param {number} stats.appearances    - jogos disputados
 *   @param {number} stats.minutesPlayed
 */
export function calculateRawScore(position, {
  goals         = 0,
  assists       = 0,
  cleanSheets   = 0,
  saves         = 0,
  appearances   = 1,
  minutesPlayed = 90,
}) {
  const w = PRICE_CONFIG.WEIGHTS[position] ?? PRICE_CONFIG.WEIGHTS.MID

  // Normaliza por 90 minutos jogados (evita vantagem de quem jogou mais)
  const mins = Math.max(minutesPlayed, 90)
  const g90  = (goals       / mins) * 90
  const a90  = (assists     / mins) * 90
  const cs90 = (cleanSheets / mins) * 90
  const sv   = saves / Math.max(appearances, 1)   // saves por jogo

  return (g90 * w.goals) + (a90 * w.assists) + (cs90 * w.cleanSheets) + (sv * w.saves)
}

/**
 * Normaliza uma lista de jogadores por posição, atribuindo preços
 * relativos dentro do pool da Copa.
 *
 * @param {Array} players - Array de { id, position, rawScore }
 * @returns {Array} - Mesma lista com campo `price` calculado
 */
export function normalizeScoresToPrices(players) {
  const byPosition = {}

  for (const p of players) {
    if (!byPosition[p.position]) byPosition[p.position] = []
    byPosition[p.position].push(p)
  }

  const result = []

  for (const [position, group] of Object.entries(byPosition)) {
    const scores   = group.map(p => p.rawScore)
    const minScore = Math.min(...scores)
    const maxScore = Math.max(...scores)
    const base     = PRICE_CONFIG.BASE[position]      ?? 8
    const maxBonus = PRICE_CONFIG.MAX_BONUS[position] ?? 7

    for (const player of group) {
      let price

      if (maxScore <= minScore) {
        // Todos com mesmo score → preço base
        price = base
      } else {
        const ratio = (player.rawScore - minScore) / (maxScore - minScore)
        price = base + ratio * maxBonus
      }

      result.push({
        ...player,
        price: roundToHalf(price),
      })
    }
  }

  return result
}

/**
 * Interpreta stats retornados pela API (normaliza nomes de campos).
 * A shape exata depende da API — ajuste conforme necessário.
 */
export function parseApiStats(raw = {}) {
  // Tenta campos comuns de diferentes APIs
  return {
    goals:         raw.goals?.total         ?? raw.goals         ?? raw.statistics?.goals?.scored        ?? 0,
    assists:       raw.goals?.assists        ?? raw.assists        ?? raw.statistics?.goals?.assists       ?? 0,
    cleanSheets:   raw.cleanSheets          ?? raw.clean_sheets   ?? raw.statistics?.goals?.conceded === 0 ? 1 : 0,
    saves:         raw.goalkeeper?.saves    ?? raw.saves          ?? raw.statistics?.goalkeeper?.saves    ?? 0,
    appearances:   raw.games?.appearences   ?? raw.appearances    ?? raw.statistics?.games?.appearences   ?? 1,
    minutesPlayed: raw.games?.minutes       ?? raw.minutesPlayed  ?? raw.statistics?.games?.minutes       ?? 90,
  }
}

/**
 * Pipeline completo: recebe lista de players com stats brutos da API
 * e retorna a lista com preços calculados.
 *
 * @param {Array} rawPlayers - [{ id, position, apiStats }]
 * @returns {Array} - [{ id, position, rawScore, price }]
 */
export function computePricesFromSeasonStats(rawPlayers) {
  const withScores = rawPlayers.map(player => ({
    ...player,
    rawScore: calculateRawScore(player.position, parseApiStats(player.apiStats ?? {})),
  }))

  return normalizeScoresToPrices(withScores)
}
