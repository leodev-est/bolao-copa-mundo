// Integração com Free API Live Football Data (RapidAPI)
// Host: free-api-live-football-data.p.rapidapi.com

const BASE_URL = 'https://free-api-live-football-data.p.rapidapi.com'
const API_HOST = 'free-api-live-football-data.p.rapidapi.com'

export const WORLD_CUP_LEAGUE_ID = 914609  // Copa do Mundo 2026
export const COPA_START = new Date('2026-06-11')
export const COPA_END   = new Date('2026-07-19')

function getHeaders() {
  return {
    'x-rapidapi-key':  import.meta.env.VITE_API_FOOTBALL_KEY,
    'x-rapidapi-host': API_HOST,
    'Content-Type':    'application/json',
  }
}

async function request(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}/${endpoint}`)
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.append(k, String(v))
  })
  const res = await fetch(url.toString(), { headers: getHeaders() })
  if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`)
  const data = await res.json()
  return data.response ?? data
}

/** Formata data como YYYYMMDD */
function formatDate(date) {
  const d = new Date(date)
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

/** Busca jogos de um dia específico */
export const getMatchesByDate = (date) =>
  request('football-get-matches-by-date', { date: formatDate(date) })

/** Busca todos os jogos da Copa do Mundo 2026 (itera por data) */
export async function getWorldCupFixtures() {
  const allMatches = []
  const current = new Date(COPA_START)

  while (current <= COPA_END) {
    try {
      const data = await getMatchesByDate(current)
      const matches = (data.matches ?? []).filter(m => m.leagueId === WORLD_CUP_LEAGUE_ID)
      allMatches.push(...matches)
    } catch {
      // ignora erro em datas sem jogos
    }
    current.setDate(current.getDate() + 1)
    // Pequena pausa pra não exceder rate limit
    await new Promise(r => setTimeout(r, 200))
  }

  return allMatches
}

/** Busca jogos da Copa de hoje */
export async function getTodayWorldCupMatches() {
  const data = await getMatchesByDate(new Date())
  return (data.matches ?? []).filter(m => m.leagueId === WORLD_CUP_LEAGUE_ID)
}

/** Busca escalação de uma partida */
export const getFixtureLineups = (fixtureId) =>
  request('football-get-fixture-lineups-by-fixture-id', { fixture_id: fixtureId })

/** Busca eventos de uma partida (gols, cartões) */
export const getFixtureEvents = (fixtureId) =>
  request('football-get-fixture-events', { fixture_id: fixtureId })

/** Busca detalhes de uma partida */
export const getFixtureById = (fixtureId) =>
  request('football-get-fixture-by-id', { fixture_id: fixtureId })

/** Busca placares ao vivo (filtra Copa) */
export async function getLiveWorldCupMatches() {
  const data = await request('football-get-livescores-by-league', {
    leagueId: WORLD_CUP_LEAGUE_ID,
  }).catch(() => request('football-get-livescores'))
  return (data.matches ?? data ?? []).filter(m => m.leagueId === WORLD_CUP_LEAGUE_ID)
}

// Converte o status da API para o padrão interno
export function parseStatus(match) {
  const s = match.status ?? {}
  if (s.cancelled)        return 'CANC'
  if (s.finished)         return 'FT'
  if (!s.started)         return 'NS'
  // Em andamento — tenta descobrir pelo halftime
  const elapsed = s.liveTime?.short ?? ''
  if (elapsed === 'HT')   return 'HT'
  if (elapsed.includes("'")) {
    const min = parseInt(elapsed)
    return min <= 45 ? '1H' : '2H'
  }
  return '1H'
}

// Converte partida da API para o formato do banco
export function normalizeMatch(m) {
  return {
    api_match_id:   m.id,
    home_team:      m.home?.longName ?? m.home?.name,
    away_team:      m.away?.longName ?? m.away?.name,
    home_team_logo: `https://images.fotmob.com/image_resources/logo/teamlogo/${m.home?.id}.png`,
    away_team_logo: `https://images.fotmob.com/image_resources/logo/teamlogo/${m.away?.id}.png`,
    home_team_id:   m.home?.id,
    away_team_id:   m.away?.id,
    match_date:     m.status?.utcTime ?? m.time,
    status:         parseStatus(m),
    score_home:     m.home?.score ?? null,
    score_away:     m.away?.score ?? null,
    round:          `Fase ${m.tournamentStage ?? ''}`.trim(),
  }
}

// Helpers pra eventos
export function extractGoalScorers(events = []) {
  return (Array.isArray(events) ? events : [])
    .filter(e => e.type === 'Goal' || e.event_type === 'goal')
    .map(e => ({
      playerId:   e.player?.id   ?? e.player_id,
      playerName: e.player?.name ?? e.player_name,
      team:       e.team?.name   ?? e.team_name,
      minute:     e.time?.elapsed ?? e.minute,
    }))
}

export function extractYellowCards(events = []) {
  return (Array.isArray(events) ? events : [])
    .filter(e => (e.type === 'Card' && e.detail === 'Yellow Card') || e.event_type === 'yellowcard')
    .map(e => ({
      playerId:   e.player?.id   ?? e.player_id,
      playerName: e.player?.name ?? e.player_name,
      team:       e.team?.name   ?? e.team_name,
      minute:     e.time?.elapsed ?? e.minute,
    }))
}

export function extractRedCards(events = []) {
  return (Array.isArray(events) ? events : [])
    .filter(e =>
      (e.type === 'Card' && (e.detail === 'Red Card' || e.detail === 'Second Yellow card')) ||
      e.event_type === 'redcard'
    )
    .map(e => ({
      playerId:   e.player?.id   ?? e.player_id,
      playerName: e.player?.name ?? e.player_name,
      team:       e.team?.name   ?? e.team_name,
      minute:     e.time?.elapsed ?? e.minute,
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
