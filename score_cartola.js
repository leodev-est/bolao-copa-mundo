/**
 * Calcula e salva a pontuação do Cartola para partidas encerradas.
 * Rodado pelo GitHub Actions a cada hora durante a Copa.
 *
 * Uso local: node score_cartola.js
 * Uso dry-run: node score_cartola.js --dry-run
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const DRY_RUN = process.argv.includes('--dry-run')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const API_HOST = 'free-api-live-football-data.p.rapidapi.com'

// ── Pontuação ───────────────────────────────────────────────────────────────────
const SCORING = {
  goal:         { GK: 15, DEF: 12, MID: 8, FWD: 8 },
  assist:       5,
  cleanSheet:   { GK: 5, DEF: 3 },
  yellowCard:  -2,
  redCard:     -5,
  penaltySaved: 7,
  ownGoal:     -4,
}

function calcScore({ position, goals = 0, assists = 0, cleanSheet = false,
  yellowCard = false, redCard = false, penaltySaved = 0, ownGoal = 0 }) {
  let pts = 0
  pts += goals * (SCORING.goal[position] ?? 8)
  pts += assists * SCORING.assist
  if (cleanSheet && (position === 'GK' || position === 'DEF')) pts += SCORING.cleanSheet[position] ?? 0
  if (yellowCard) pts += SCORING.yellowCard
  if (redCard)    pts += SCORING.redCard
  pts += penaltySaved * SCORING.penaltySaved
  pts += ownGoal * SCORING.ownGoal
  return pts
}

function applyCapitan(base, isCaptain) { return isCaptain ? base * 2 : base }

// ── API ─────────────────────────────────────────────────────────────────────────
async function apiGet(endpoint, params = {}) {
  const url = new URL(`https://${API_HOST}/${endpoint}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, String(v)))
  const res = await fetch(url.toString(), {
    headers: { 'x-rapidapi-key': process.env.VITE_API_FOOTBALL_KEY, 'x-rapidapi-host': API_HOST },
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`)
  const data = await res.json()
  return data.response ?? data
}

// ── Extrai eventos relevantes ───────────────────────────────────────────────────
function parseEvents(events = []) {
  const goals = [], assists = [], yellows = [], reds = [], penSaved = [], ownGoals = []

  for (const e of Array.isArray(events) ? events : []) {
    const type    = e.type   ?? e.event_type ?? ''
    const detail  = e.detail ?? ''
    const pid     = e.player?.id   ?? e.player_id   ?? null
    const assist  = e.assist?.id   ?? null
    const assistN = e.assist?.name ?? null
    const teamId  = e.team?.id     ?? e.team_id     ?? null

    if (type === 'Goal' || type === 'goal') {
      if (detail === 'Own Goal' || detail === 'own_goal') {
        ownGoals.push({ pid, teamId })
      } else {
        goals.push({ pid, teamId })
        if (assist) assists.push({ pid: assist, name: assistN, teamId })
      }
    }
    if ((type === 'Card' && detail === 'Yellow Card') || type === 'yellowcard') yellows.push({ pid })
    if ((type === 'Card' && (detail === 'Red Card' || detail === 'Second Yellow card')) || type === 'redcard') reds.push({ pid })
    if (detail === 'Penalty Saved' || detail === 'penalty_saved') penSaved.push({ pid })
  }

  return { goals, assists, yellows, reds, penSaved, ownGoals }
}

// ── Processa uma partida ────────────────────────────────────────────────────────
async function processMatch(match, roundId) {
  console.log(`  ⚽ ${match.home_team} ${match.score_home ?? '?'} × ${match.score_away ?? '?'} ${match.away_team}`)

  // Verifica se já foi pontuado
  const { data: existing } = await supabase
    .from('cartola_player_scores')
    .select('id')
    .eq('match_id', match.id)
    .eq('round_id', roundId)
    .limit(1)

  if (existing?.length > 0) {
    console.log('    ↳ já pontuado, pulando')
    return false
  }

  // Busca eventos na API
  let events = []
  try {
    const data = await apiGet('football-get-fixture-events', { fixture_id: match.api_match_id })
    events = Array.isArray(data) ? data : (data.events ?? data.data ?? [])
  } catch (err) {
    console.warn(`    ↳ sem eventos: ${err.message}`)
  }

  const { goals, assists, yellows, reds, penSaved, ownGoals } = parseEvents(events)

  // Busca jogadores dos dois times
  const { data: players } = await supabase
    .from('cartola_players')
    .select('id, api_player_id, position, team_id')
    .in('team_id', [match.home_team_id, match.away_team_id].filter(Boolean))

  if (!players?.length) {
    console.log('    ↳ nenhum jogador encontrado para esses times')
    return false
  }

  const rows = players.map(player => {
    const pid = player.api_player_id
    const isHome = player.team_id === match.home_team_id
    const goalsConceded = isHome ? (match.score_away ?? 1) : (match.score_home ?? 1)
    const cleanSheet = goalsConceded === 0

    const playerGoals    = goals.filter(e => e.pid === pid).length
    const playerAssists  = assists.filter(e => e.pid === pid).length
    const playerYellow   = yellows.some(e => e.pid === pid)
    const playerRed      = reds.some(e => e.pid === pid)
    const playerPenSaved = penSaved.filter(e => e.pid === pid).length
    const playerOwnGoal  = ownGoals.filter(e => e.pid === pid).length
    const playerCS       = cleanSheet && (player.position === 'GK' || player.position === 'DEF')

    const total = calcScore({
      position:     player.position,
      goals:        playerGoals,
      assists:      playerAssists,
      cleanSheet:   playerCS,
      yellowCard:   playerYellow,
      redCard:      playerRed,
      penaltySaved: playerPenSaved,
      ownGoal:      playerOwnGoal,
    })

    return {
      player_id:     player.id,
      round_id:      roundId,
      match_id:      match.id,
      goals:         playerGoals,
      assists:       playerAssists,
      clean_sheet:   playerCS,
      yellow_card:   playerYellow,
      red_card:      playerRed,
      penalty_saved: playerPenSaved,
      own_goal:      playerOwnGoal,
      total_points:  total,
    }
  })

  const pontuados = rows.filter(r => r.total_points !== 0)
  console.log(`    ↳ ${players.length} jogadores | ${pontuados.length} pontuaram`)

  if (!DRY_RUN && rows.length > 0) {
    const { error } = await supabase
      .from('cartola_player_scores')
      .upsert(rows, { onConflict: 'player_id,round_id,match_id' })
    if (error) throw error
  }

  return true
}

// ── Recalcula total dos times de uma rodada ─────────────────────────────────────
async function recalcTeamTotals(roundId) {
  const { data: teams } = await supabase
    .from('cartola_teams')
    .select('id, cartola_team_players ( player_id, is_captain )')
    .eq('round_id', roundId)

  const { data: scores } = await supabase
    .from('cartola_player_scores')
    .select('player_id, total_points')
    .eq('round_id', roundId)

  const scoreMap = {}
  ;(scores ?? []).forEach(s => { scoreMap[s.player_id] = (scoreMap[s.player_id] ?? 0) + s.total_points })

  for (const team of teams ?? []) {
    const total = (team.cartola_team_players ?? []).reduce((acc, tp) => {
      const base = scoreMap[tp.player_id] ?? 0
      return acc + applyCapitan(base, tp.is_captain)
    }, 0)

    if (!DRY_RUN) {
      await supabase.from('cartola_teams').update({ total_points: total }).eq('id', team.id)
    }
  }

  console.log(`  ↳ totais de ${teams?.length ?? 0} times atualizados`)
}

// ── Verifica se todas as partidas da rodada terminaram ──────────────────────────
async function checkRoundCompletion(round) {
  const { data: unfinished } = await supabase
    .from('matches')
    .select('id')
    .gte('match_date', round.start_date)
    .lte('match_date', round.end_date + 'T23:59:59Z')
    .not('status', 'in', '("FT","AET","PEN","CANC")')

  if (unfinished?.length === 0) {
    console.log(`\n🏁 Rodada "${round.name}" finalizada! Encerrando...`)
    if (!DRY_RUN) {
      await supabase.from('cartola_rounds').update({ status: 'finished' }).eq('id', round.id)
    }
    console.log('  ↳ status → finished')
  }
}

// ── Main ────────────────────────────────────────────────────────────────────────
async function main() {
  const now = new Date().toISOString().split('T')[0]
  console.log(`🏆 Score Cartola — ${now}${DRY_RUN ? ' (DRY RUN)' : ''}\n`)

  // Busca rodadas ativas (open ou closed) cujo período já começou
  const { data: rounds, error: roundErr } = await supabase
    .from('cartola_rounds')
    .select('*')
    .in('status', ['open', 'closed'])
    .lte('start_date', now)

  if (roundErr) { console.error(roundErr.message); process.exit(1) }
  if (!rounds?.length) { console.log('Nenhuma rodada ativa no momento.'); return }

  for (const round of rounds) {
    console.log(`📅 Rodada: ${round.name} (${round.status})`)

    // Fecha rodada para novas escalações
    if (round.status === 'open' && !DRY_RUN) {
      await supabase.from('cartola_rounds').update({ status: 'closed' }).eq('id', round.id)
      console.log('  ↳ status → closed (rodada em andamento)')
    }

    // Busca partidas encerradas dentro do período da rodada
    const { data: matches } = await supabase
      .from('matches')
      .select('id, api_match_id, home_team, away_team, home_team_id, away_team_id, score_home, score_away')
      .gte('match_date', round.start_date)
      .lte('match_date', round.end_date + 'T23:59:59Z')
      .in('status', ['FT', 'AET', 'PEN'])

    if (!matches?.length) {
      console.log('  ↳ nenhuma partida encerrada ainda\n')
      continue
    }

    console.log(`  ${matches.length} partidas encerradas:\n`)

    let processed = 0
    for (const match of matches) {
      const scored = await processMatch(match, round.id)
      if (scored) processed++
      await new Promise(r => setTimeout(r, 300))
    }

    if (processed > 0) {
      console.log(`\n📊 Recalculando pontuação dos times...`)
      await recalcTeamTotals(round.id)
    }

    await checkRoundCompletion(round)
    console.log()
  }

  console.log('✅ Concluído.')
}

main().catch(err => { console.error('❌', err.message); process.exit(1) })
