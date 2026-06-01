// Integração com football-data.org API v4
// Documentação: https://www.football-data.org/documentation/quickstart
// Chave gratuita: https://www.football-data.org/client/register

const BASE_URL   = 'https://api.football-data.org/v4'
const COMPETITION = 'WC'
const SEASON      = '2026'

export const COPA_START = new Date('2026-06-11')
export const COPA_END   = new Date('2026-07-19')

function getHeaders() {
  return { 'X-Auth-Token': import.meta.env.VITE_FOOTBALL_DATA_KEY }
}

async function request(path, params = {}) {
  const url = new URL(`${BASE_URL}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, String(v)))
  const res = await fetch(url.toString(), { headers: getHeaders() })
  if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`)
  return res.json()
}

export function parseStatus(match) {
  const s = match.status
  if (s === 'FINISHED' || s === 'AWARDED') return 'FT'
  if (s === 'IN_PLAY')                     return '1H'
  if (s === 'PAUSED')                      return 'HT'
  if (s === 'CANCELLED' || s === 'SUSPENDED') return 'CANC'
  return 'NS' // SCHEDULED, TIMED, POSTPONED
}

function stageLabel(match) {
  const stage = match.stage ?? ''
  const group = match.group?.replace('GROUP_', '') ?? ''
  if (stage === 'GROUP_STAGE') return group ? `Grupo ${group}` : 'Fase de Grupos'
  const labels = {
    ROUND_OF_32:    'Oitavas (32)',
    ROUND_OF_16:    'Oitavas de Final',
    QUARTER_FINALS: 'Quartas de Final',
    SEMI_FINALS:    'Semifinal',
    THIRD_PLACE:    'Terceiro Lugar',
    FINAL:          'Final',
  }
  return labels[stage] ?? stage
}

export function normalizeMatch(m) {
  return {
    api_match_id:   m.id,
    home_team:      m.homeTeam.name,
    away_team:      m.awayTeam.name,
    home_team_logo: m.homeTeam.crest ?? null,
    away_team_logo: m.awayTeam.crest ?? null,
    home_team_id:   m.homeTeam.id,
    away_team_id:   m.awayTeam.id,
    match_date:     m.utcDate,
    status:         parseStatus(m),
    score_home:     m.score?.fullTime?.home ?? null,
    score_away:     m.score?.fullTime?.away ?? null,
    round:          stageLabel(m),
  }
}

export async function getWorldCupFixtures() {
  const data = await request(`/competitions/${COMPETITION}/matches`, { season: SEASON })
  return data.matches ?? []
}

export async function getTodayWorldCupMatches() {
  const today = new Date().toISOString().slice(0, 10)
  const data = await request(`/competitions/${COMPETITION}/matches`, {
    season: SEASON, dateFrom: today, dateTo: today,
  })
  return data.matches ?? []
}

export async function getLiveWorldCupMatches() {
  try {
    const data = await request('/matches', { competitions: COMPETITION, status: 'IN_PLAY,PAUSED' })
    return data.matches ?? []
  } catch {
    return []
  }
}

/** Retorna detalhes da partida incluindo gols e cartões */
export async function getFixtureById(fixtureId) {
  return request(`/matches/${fixtureId}`)
}

/** Extrai artilheiros de um match detail */
export function extractGoalScorers(matchDetail) {
  return (matchDetail.goals ?? [])
    .filter(g => g.type !== 'OWN')
    .map(g => ({
      playerId:   g.scorer?.id,
      playerName: g.scorer?.name,
      team:       g.team?.name,
      minute:     g.minute,
    }))
}

export function extractYellowCards(matchDetail) {
  return (matchDetail.bookings ?? [])
    .filter(b => b.card === 'YELLOW')
    .map(b => ({
      playerId:   b.player?.id,
      playerName: b.player?.name,
      team:       b.team?.name,
      minute:     b.minute,
    }))
}

export function extractRedCards(matchDetail) {
  return (matchDetail.bookings ?? [])
    .filter(b => b.card === 'RED')
    .map(b => ({
      playerId:   b.player?.id,
      playerName: b.player?.name,
      team:       b.team?.name,
      minute:     b.minute,
    }))
}

export const STATUS_LABELS = {
  NS:   { label: 'Não iniciado',        color: 'gray'   },
  '1H': { label: 'Ao vivo · 1º Tempo', color: 'red'    },
  HT:   { label: 'Intervalo',           color: 'yellow' },
  '2H': { label: 'Ao vivo · 2º Tempo', color: 'red'    },
  ET:   { label: 'Prorrogação',         color: 'red'    },
  P:    { label: 'Pênaltis',            color: 'red'    },
  FT:   { label: 'Encerrado',           color: 'green'  },
  AET:  { label: 'Encerrado (prorr.)', color: 'green'  },
  PEN:  { label: 'Encerrado (pen.)',   color: 'green'  },
  CANC: { label: 'Cancelado',           color: 'gray'   },
}

export const LIVE_STATUSES     = ['1H', 'HT', '2H', 'ET', 'P']
export const FINISHED_STATUSES = ['FT', 'AET', 'PEN']
