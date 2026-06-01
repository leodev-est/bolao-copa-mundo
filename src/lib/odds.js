// Geração e cálculo de odds para o bolão

const MARGINS = {
  exact_score:   0.15,
  goalscorer:    0.12,
  total_yellows: 0.10,
  total_goals:   0.10,
}

function probToOdd(prob, type = 'exact_score') {
  const margin = MARGINS[type] ?? 0.10
  return Math.max(1.10, parseFloat(((1 / prob) * (1 - margin)).toFixed(2)))
}

export function clipOdd(odd, type) {
  const ranges = {
    exact_score:   [4.00, 20.0],
    goalscorer:    [1.80, 9.00],
    total_yellows: [1.50, 4.00],
    total_goals:   [1.50, 3.50],
  }
  const [min, max] = ranges[type] ?? [1.10, 20.0]
  return Math.max(min, Math.min(max, odd))
}

// Probabilidades históricas de placares
const SCORE_BASE_PROBS = {
  '0-0': 0.095, '1-0': 0.122, '0-1': 0.105,
  '1-1': 0.145, '2-0': 0.090, '0-2': 0.075,
  '2-1': 0.088, '1-2': 0.076, '2-2': 0.060,
  '3-0': 0.042, '0-3': 0.030, '3-1': 0.040,
  '1-3': 0.028, '3-2': 0.025, '2-3': 0.020,
  '4-0': 0.015, '0-4': 0.010, '4-1': 0.010,
  '1-4': 0.008,
}

export function calcExactScoreOdd(scoreHome, scoreAway) {
  const key = `${scoreHome}-${scoreAway}`
  const prob = SCORE_BASE_PROBS[key] ?? 0.008
  return clipOdd(probToOdd(prob, 'exact_score'), 'exact_score')
}

export function calcGoalscorerOdd(goalsPerGame = 0.25) {
  const prob = Math.max(0.05, Math.min(0.70, goalsPerGame))
  return clipOdd(probToOdd(prob, 'goalscorer'), 'goalscorer')
}

export function calcTotalYellowsOdd(threshold, avgYellows, direction) {
  const prob = direction === 'over'
    ? 1 - poissonCDF(threshold - 1, avgYellows)
    : poissonCDF(threshold - 1, avgYellows)
  return clipOdd(probToOdd(Math.max(0.10, Math.min(0.90, prob)), 'total_yellows'), 'total_yellows')
}

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

// Deriva resultado do placar
export function deriveResult(scoreHome, scoreAway) {
  if (scoreHome > scoreAway) return 'home'
  if (scoreAway > scoreHome) return 'away'
  return 'draw'
}

export function formatOdd(odd) {
  return `${parseFloat(odd).toFixed(2)}x`
}

export function calcPointsWon(pointsWagered, odd) {
  return parseFloat((pointsWagered * odd).toFixed(2))
}

export const BET_TYPE_LABELS = {
  total_yellows: 'Total de amarelos',
  total_goals:   'Total de gols',
}

export const BET_TYPE_ICONS = {
  total_yellows: '📊',
  total_goals:   '⚽',
}
