// Geração e cálculo de odds para o bolão

// Margens da casa (house edge) por tipo de palpite
const MARGINS = {
  winner:       0.08,  // 8%
  exact_score:  0.15,
  goalscorer:   0.12,
  yellow_card:  0.12,
  red_card:     0.14,
  total_yellows: 0.10,
  total_goals:  0.10,
}

/** Converte probabilidade em odd com margem aplicada */
function probToOdd(prob, type = 'winner') {
  const margin = MARGINS[type] ?? 0.10
  const fairOdd = 1 / prob
  return Math.max(1.10, parseFloat((fairOdd * (1 - margin)).toFixed(2)))
}

/** Clipa a odd em um range razoável por tipo */
export function clipOdd(odd, type) {
  const ranges = {
    winner:        [1.20, 3.50],
    exact_score:   [4.00, 20.0],
    goalscorer:    [1.80, 9.00],
    yellow_card:   [2.50, 10.0],
    red_card:      [6.00, 20.0],
    total_yellows: [1.50, 4.00],
    total_goals:   [1.50, 3.50],
  }
  const [min, max] = ranges[type] ?? [1.10, 20.0]
  return Math.max(min, Math.min(max, odd))
}

/**
 * Calcula odds do vencedor da partida.
 * homeStrength / awayStrength: valores de 1–100 (pode usar ranking FIFA ou pontos)
 */
export function calcWinnerOdds(homeStrength = 50, awayStrength = 50) {
  const total = homeStrength + awayStrength
  const homeProb  = (homeStrength / total) * 0.75   // 75% do peso vai para H/A
  const awayProb  = (awayStrength / total) * 0.75
  const drawProb  = 0.25

  return {
    home: clipOdd(probToOdd(homeProb,  'winner'), 'winner'),
    draw: clipOdd(probToOdd(drawProb,  'winner'), 'winner'),
    away: clipOdd(probToOdd(awayProb,  'winner'), 'winner'),
  }
}

/**
 * Odds para placar exato baseadas em frequência histórica de placares.
 * Quanto mais "comum" o placar, menor a odd.
 */
const SCORE_BASE_PROBS = {
  '1-0': 0.122, '0-1': 0.105, '1-1': 0.145, '2-1': 0.088, '1-2': 0.076,
  '2-0': 0.090, '0-2': 0.075, '0-0': 0.095, '2-2': 0.060, '3-1': 0.040,
  '3-0': 0.042, '0-3': 0.030, '3-2': 0.025, '2-3': 0.020, '4-0': 0.015,
  '0-4': 0.010,
}

export function calcExactScoreOdd(score) {
  const prob = SCORE_BASE_PROBS[score] ?? 0.008
  return clipOdd(probToOdd(prob, 'exact_score'), 'exact_score')
}

/**
 * Odd para um jogador marcar gol.
 * goalsPerGame: média de gols por jogo (0 ~ 1)
 */
export function calcGoalscorerOdd(goalsPerGame = 0.25) {
  const prob = Math.max(0.05, Math.min(0.70, goalsPerGame))
  return clipOdd(probToOdd(prob, 'goalscorer'), 'goalscorer')
}

/**
 * Odd para jogador levar cartão amarelo.
 * cardsPerGame: frequência de cartões por jogo (0 ~ 0.5)
 */
export function calcYellowCardOdd(cardsPerGame = 0.15) {
  const prob = Math.max(0.05, Math.min(0.50, cardsPerGame))
  return clipOdd(probToOdd(prob, 'yellow_card'), 'yellow_card')
}

/**
 * Odd para total de cartões amarelos over/under.
 * avgYellows: média de cartões amarelos por jogo
 * threshold: número de cartões esperado
 * direction: 'over' | 'under'
 */
export function calcTotalYellowsOdd(threshold, avgYellows, direction) {
  let prob
  if (direction === 'over') {
    // Poisson aproximado
    prob = 1 - poissonCDF(threshold - 1, avgYellows)
  } else {
    prob = poissonCDF(threshold - 1, avgYellows)
  }
  prob = Math.max(0.10, Math.min(0.90, prob))
  return clipOdd(probToOdd(prob, 'total_yellows'), 'total_yellows')
}

/** Distribuição de Poisson CDF (aproximação) */
function poissonCDF(k, lambda) {
  let sum = 0
  for (let i = 0; i <= k; i++) {
    sum += (Math.pow(lambda, i) * Math.exp(-lambda)) / factorial(i)
  }
  return sum
}

function factorial(n) {
  if (n <= 1) return 1
  let r = 1
  for (let i = 2; i <= n; i++) r *= i
  return r
}

/** Formata odd para exibição */
export function formatOdd(odd) {
  return `${parseFloat(odd).toFixed(2)}x`
}

/** Calcula pontos ganhos */
export function calcPointsWon(pointsWagered, odd) {
  return parseFloat((pointsWagered * odd).toFixed(2))
}

/** Labels amigáveis por tipo de palpite */
export const BET_TYPE_LABELS = {
  winner:        'Vencedor',
  exact_score:   'Placar exato',
  goalscorer:    'Artilheiro',
  yellow_card:   'Cartão amarelo',
  red_card:      'Cartão vermelho',
  total_yellows: 'Total de amarelos',
  total_goals:   'Total de gols',
}

/** Ícones por tipo */
export const BET_TYPE_ICONS = {
  winner:        '🏆',
  exact_score:   '🎯',
  goalscorer:    '⚽',
  yellow_card:   '🟨',
  red_card:      '🟥',
  total_yellows: '📊',
  total_goals:   '📊',
}
