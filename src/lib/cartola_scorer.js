import { supabase } from './supabase'

// ── Tabela de pontuação ─────────────────────────────────────
export const SCORING = {
  goal:         { GK: 15, DEF: 12, MID: 8, FWD: 8 },
  assist:       5,
  cleanSheet:   { GK: 5, DEF: 3 },
  yellowCard:  -2,
  redCard:     -5,
  penaltySaved: 7,
  ownGoal:     -4,
}

/**
 * Calcula a pontuação bruta de um jogador (sem capitão).
 * @param {object} p - { position, goals, assists, cleanSheet, yellowCard, redCard, penaltySaved, ownGoal }
 * @returns {number}
 */
export function calculateScore({ position, goals = 0, assists = 0, cleanSheet = false,
  yellowCard = false, redCard = false, penaltySaved = 0, ownGoal = 0 }) {
  let pts = 0
  pts += goals * (SCORING.goal[position] ?? 8)
  pts += assists * SCORING.assist
  if (cleanSheet && (position === 'GK' || position === 'DEF')) {
    pts += SCORING.cleanSheet[position] ?? 0
  }
  if (yellowCard) pts += SCORING.yellowCard
  if (redCard)    pts += SCORING.redCard
  pts += penaltySaved * SCORING.penaltySaved
  pts += ownGoal * SCORING.ownGoal
  return pts
}

/**
 * Aplica o dobro de pontos ao capitão.
 * @param {number} basePoints
 * @param {boolean} isCaptain
 */
export function applyCapitanBonus(basePoints, isCaptain) {
  return isCaptain ? basePoints * 2 : basePoints
}

// ── Mapeamento de posição da API para o padrão interno ──────
const POSITION_MAP = {
  G: 'GK', GK: 'GK', Goalkeeper: 'GK',
  D: 'DEF', DEF: 'DEF', Defender: 'DEF',
  M: 'MID', MID: 'MID', Midfielder: 'MID',
  F: 'FWD', FWD: 'FWD', Forward: 'FWD', Attacker: 'FWD',
}
export function normalizePosition(apiPos) {
  return POSITION_MAP[apiPos] ?? 'MID'
}

// ── Extrair eventos relevantes para o Cartola ───────────────
export function extractCartolaScorerEvents(events = []) {
  const goals      = []
  const assists    = []
  const yellows    = []
  const reds       = []
  const penSaved   = []
  const ownGoals   = []

  for (const e of events) {
    const type   = e.type ?? e.event_type ?? ''
    const detail = e.detail ?? ''
    const playerId   = e.player?.id   ?? e.player_id   ?? null
    const playerName = e.player?.name ?? e.player_name ?? ''
    const teamId     = e.team?.id     ?? e.team_id     ?? null

    if (type === 'Goal' || type === 'goal') {
      if (detail === 'Own Goal' || detail === 'own_goal') {
        ownGoals.push({ playerId, playerName, teamId })
      } else {
        goals.push({ playerId, playerName, teamId })
        if (e.assist?.id || e.assist?.name) {
          assists.push({
            playerId:   e.assist.id   ?? null,
            playerName: e.assist.name ?? '',
            teamId,
          })
        }
      }
    }

    if ((type === 'Card' && detail === 'Yellow Card') || type === 'yellowcard') {
      yellows.push({ playerId, playerName, teamId })
    }

    if ((type === 'Card' && (detail === 'Red Card' || detail === 'Second Yellow card')) || type === 'redcard') {
      reds.push({ playerId, playerName, teamId })
    }

    if (type === 'subst' || type === 'Miss' || type === 'Penalty') {
      // Pênalti defendido: evento do goleiro, não do cobrador
      if (detail === 'Penalty Saved' || detail === 'penalty_saved') {
        penSaved.push({ playerId, playerName, teamId })
      }
    }
  }

  return { goals, assists, yellows, reds, penSaved, ownGoals }
}

/**
 * Processa uma partida encerrada e salva as pontuações no banco.
 * Chamado pelo admin/cron após o FT de cada jogo.
 *
 * @param {object} opts
 * @param {string} opts.matchId      - UUID da partida (tabela matches)
 * @param {string} opts.roundId      - UUID da rodada do cartola
 * @param {number} opts.homeTeamId   - ID da API do time da casa
 * @param {number} opts.awayTeamId   - ID da API do time visitante
 * @param {number} opts.homeScore    - Gols do time da casa
 * @param {number} opts.awayScore    - Gols do time visitante
 * @param {Array}  opts.events       - Eventos da API-Football
 */
export async function processMatchScores({ matchId, roundId, homeTeamId, awayTeamId, homeScore, awayScore, events }) {
  const { goals, assists, yellows, reds, penSaved, ownGoals } = extractCartolaScorerEvents(events)

  // Busca todos os jogadores que participaram dos times da partida
  const { data: players, error } = await supabase
    .from('cartola_players')
    .select('id, api_player_id, position, team_id')
    .in('team_id', [homeTeamId, awayTeamId])

  if (error) throw error

  const rows = []

  for (const player of players) {
    const pid = player.api_player_id

    const playerGoals    = goals.filter(e => e.playerId === pid).length
    const playerAssists  = assists.filter(e => e.playerId === pid).length
    const playerYellow   = yellows.some(e => e.playerId === pid)
    const playerRed      = reds.some(e => e.playerId === pid)
    const playerPenSaved = penSaved.filter(e => e.playerId === pid).length
    const playerOwnGoal  = ownGoals.filter(e => e.playerId === pid).length

    // Clean sheet: time do jogador não tomou gol nos 90min
    const isHome       = player.team_id === homeTeamId
    const goalsConceded = isHome ? awayScore : homeScore
    const cleanSheet   = goalsConceded === 0

    const totalPoints = calculateScore({
      position:     player.position,
      goals:        playerGoals,
      assists:      playerAssists,
      cleanSheet:   cleanSheet && (player.position === 'GK' || player.position === 'DEF'),
      yellowCard:   playerYellow,
      redCard:      playerRed,
      penaltySaved: playerPenSaved,
      ownGoal:      playerOwnGoal,
    })

    // Só salva se houve algum evento relevante ou pontuação
    rows.push({
      player_id:     player.id,
      round_id:      roundId,
      match_id:      matchId,
      goals:         playerGoals,
      assists:       playerAssists,
      clean_sheet:   cleanSheet && (player.position === 'GK' || player.position === 'DEF'),
      yellow_card:   playerYellow,
      red_card:      playerRed,
      penalty_saved: playerPenSaved,
      own_goal:      playerOwnGoal,
      total_points:  totalPoints,
    })
  }

  if (rows.length > 0) {
    const { error: insertErr } = await supabase
      .from('cartola_player_scores')
      .upsert(rows, { onConflict: 'player_id,round_id,match_id' })
    if (insertErr) throw insertErr
  }

  // Atualiza total de pontos de cada cartola_team para esta rodada
  await updateTeamTotals(roundId)
}

/**
 * Recalcula e salva o total de pontos de cada time na rodada.
 */
export async function updateTeamTotals(roundId) {
  const { data: teams, error } = await supabase
    .from('cartola_teams')
    .select(`
      id,
      cartola_team_players (
        player_id,
        is_captain,
        cartola_players ( position )
      )
    `)
    .eq('round_id', roundId)

  if (error) throw error

  const { data: scores } = await supabase
    .from('cartola_player_scores')
    .select('player_id, total_points')
    .eq('round_id', roundId)

  const scoreMap = {}
  ;(scores ?? []).forEach(s => {
    scoreMap[s.player_id] = (scoreMap[s.player_id] ?? 0) + s.total_points
  })

  for (const team of teams) {
    let teamTotal = 0
    for (const tp of team.cartola_team_players ?? []) {
      const base   = scoreMap[tp.player_id] ?? 0
      teamTotal   += applyCapitanBonus(base, tp.is_captain)
    }
    await supabase
      .from('cartola_teams')
      .update({ total_points: teamTotal })
      .eq('id', team.id)
  }
}
