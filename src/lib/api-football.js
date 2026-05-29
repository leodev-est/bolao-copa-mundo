// Integração com API-Football (RapidAPI)
// Docs: https://www.api-football.com/documentation-v3

const BASE_URL = 'https://v3.football.api-sports.io'
const WORLD_CUP_LEAGUE_ID = 1   // FIFA World Cup
const SEASON = 2026

function getHeaders() {
  return {
    'X-RapidAPI-Key': import.meta.env.VITE_API_FOOTBALL_KEY,
    'X-RapidAPI-Host': 'v3.football.api-sports.io',
  }
}

async function request(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}/${endpoint}`)
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.append(k, String(v))
  })

  const res = await fetch(url.toString(), { headers: getHeaders() })

  if (!res.ok) {
    throw new Error(`API-Football error ${res.status}: ${res.statusText}`)
  }

  const data = await res.json()

  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(`API-Football: ${JSON.stringify(data.errors)}`)
  }

  return data.response
}

/** Busca todas as partidas da Copa do Mundo 2026 */
export const getWorldCupFixtures = () =>
  request('fixtures', { league: WORLD_CUP_LEAGUE_ID, season: SEASON })

/** Busca uma partida específica pelo ID da API */
export const getFixtureById = (fixtureId) =>
  request('fixtures', { id: fixtureId })

/** Busca partidas ao vivo da Copa */
export const getLiveFixtures = () =>
  request('fixtures', { league: WORLD_CUP_LEAGUE_ID, live: 'all' })

/** Busca escalação de uma partida */
export const getFixtureLineups = (fixtureId) =>
  request('fixtures/lineups', { fixture: fixtureId })

/** Busca eventos de uma partida (gols, cartões, substituições) */
export const getFixtureEvents = (fixtureId) =>
  request('fixtures/events', { fixture: fixtureId })

/** Busca estatísticas de uma partida */
export const getFixtureStatistics = (fixtureId) =>
  request('fixtures/statistics', { fixture: fixtureId })

/** Busca estatísticas de um time na Copa */
export const getTeamStatistics = (teamId) =>
  request('teams/statistics', {
    team: teamId,
    league: WORLD_CUP_LEAGUE_ID,
    season: SEASON,
  })

/** Busca estatísticas de jogador na temporada */
export const getPlayerStatistics = (playerId) =>
  request('players', {
    id: playerId,
    season: SEASON,
    league: WORLD_CUP_LEAGUE_ID,
  })

/** Busca classificação/grupo da Copa */
export const getStandings = () =>
  request('standings', { league: WORLD_CUP_LEAGUE_ID, season: SEASON })

// Helpers para processar eventos
export function extractGoalScorers(events) {
  return events
    .filter(e => e.type === 'Goal' && e.detail !== 'Missed Penalty')
    .map(e => ({ playerId: e.player.id, playerName: e.player.name, team: e.team.name, minute: e.time.elapsed }))
}

export function extractYellowCards(events) {
  return events
    .filter(e => e.type === 'Card' && e.detail === 'Yellow Card')
    .map(e => ({ playerId: e.player.id, playerName: e.player.name, team: e.team.name, minute: e.time.elapsed }))
}

export function extractRedCards(events) {
  return events
    .filter(e => e.type === 'Card' && (e.detail === 'Red Card' || e.detail === 'Second Yellow card'))
    .map(e => ({ playerId: e.player.id, playerName: e.player.name, team: e.team.name, minute: e.time.elapsed }))
}

// Mapeamento de status da API para português
export const STATUS_LABELS = {
  NS:  { label: 'Não iniciado', color: 'gray' },
  '1H': { label: 'Ao vivo · 1º Tempo', color: 'red' },
  HT:  { label: 'Intervalo',           color: 'yellow' },
  '2H': { label: 'Ao vivo · 2º Tempo', color: 'red' },
  ET:  { label: 'Prorrogação',         color: 'red' },
  P:   { label: 'Pênaltis',            color: 'red' },
  FT:  { label: 'Encerrado',           color: 'green' },
  AET: { label: 'Encerrado (prorr.)',  color: 'green' },
  PEN: { label: 'Encerrado (pen.)',    color: 'green' },
  PST: { label: 'Adiado',             color: 'gray' },
  CANC: { label: 'Cancelado',          color: 'gray' },
}

export const LIVE_STATUSES = ['1H', 'HT', '2H', 'ET', 'P']
export const FINISHED_STATUSES = ['FT', 'AET', 'PEN']
