/**
 * Calcula e salva a pontuação do Cartola para partidas encerradas.
 * API: football-data.org v4 (gols e cartões via GET /v4/matches/{id})
 * Rodado pelo GitHub Actions a cada hora durante a Copa.
 *
 * Uso local: node score_cartola.js
 * Uso dry-run: node score_cartola.js --dry-run
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Carrega .env localmente (em produção/CI as vars já estão no ambiente)
try {
  const raw = readFileSync('.env', 'utf-8')
  raw.split('\n').filter(l => l.includes('=') && !l.startsWith('#')).forEach(l => {
    const i = l.indexOf('=')
    const k = l.slice(0, i).trim()
    const v = l.slice(i + 1).trim()
    if (!process.env[k]) process.env[k] = v
  })
} catch { /* .env não encontrado — usando vars do ambiente */ }

const DRY_RUN = process.argv.includes('--dry-run')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const BASE_URL = 'https://api.football-data.org/v4'
const API_KEY  = process.env.VITE_FOOTBALL_DATA_KEY

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
async function fetchMatchDetail(matchId) {
  const res = await fetch(`${BASE_URL}/matches/${matchId}`, {
    headers: { 'X-Auth-Token': API_KEY },
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`)
  return res.json()
}

// ── Extrai eventos relevantes do match detail ───────────────────────────────────
function parseMatchDetail(detail) {
  const goals     = []
  const assists   = []
  const yellows   = []
  const reds      = []
  const penSaved  = []
  const ownGoals  = []

  for (const g of detail.goals ?? []) {
    const pid    = g.scorer?.id ?? null
    const teamId = g.team?.id ?? null
    if (g.type === 'OWN') {
      ownGoals.push({ pid, teamId })
    } else {
      goals.push({ pid, teamId })
      if (g.assist?.id) assists.push({ pid: g.assist.id, teamId })
    }
  }

  for (const b of detail.bookings ?? []) {
    const pid = b.player?.id ?? null
    if (b.card === 'YELLOW') yellows.push({ pid })
    if (b.card === 'RED')    reds.push({ pid })
  }

  // Pênalti defendido: inferable se goleiro tem penaltySaved no summary
  // football-data.org não expõe isso explicitamente — deixamos zerado por ora

  return { goals, assists, yellows, reds, penSaved, ownGoals }
}

// ── Processa uma partida ────────────────────────────────────────────────────────
async function processMatch(match, roundId) {
  console.log(`  ⚽ ${match.home_team} ${match.score_home ?? '?'} × ${match.score_away ?? '?'} ${match.away_team}`)

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

  let parsed = { goals: [], assists: [], yellows: [], reds: [], penSaved: [], ownGoals: [] }
  try {
    const detail = await fetchMatchDetail(match.api_match_id)
    parsed = parseMatchDetail(detail)
  } catch (err) {
    console.warn(`    ↳ sem eventos: ${err.message}`)
  }

  const { goals, assists, yellows, reds, penSaved, ownGoals } = parsed

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
    // Só considera clean sheet se o placar está confirmado (não null)
    const conceded = isHome ? match.score_away : match.score_home
    const cleanSheet = conceded !== null && conceded !== undefined && conceded === 0

    const playerGoals    = goals.filter(e => e.pid === pid).length
    const playerAssists  = assists.filter(e => e.pid === pid).length
    const playerYellow   = yellows.some(e => e.pid === pid)
    const playerRed      = reds.some(e => e.pid === pid)
    const playerPenSaved = penSaved.filter(e => e.pid === pid).length
    const playerOwnGoal  = ownGoals.filter(e => e.pid === pid).length
    const playerCS       = cleanSheet && (player.position === 'GK' || player.position === 'DEF')

    const total = calcScore({
      position: player.position, goals: playerGoals, assists: playerAssists,
      cleanSheet: playerCS, yellowCard: playerYellow, redCard: playerRed,
      penaltySaved: playerPenSaved, ownGoal: playerOwnGoal,
    })

    return {
      player_id: player.id, round_id: roundId, match_id: match.id,
      goals: playerGoals, assists: playerAssists, clean_sheet: playerCS,
      yellow_card: playerYellow, red_card: playerRed,
      penalty_saved: playerPenSaved, own_goal: playerOwnGoal,
      total_points: total,
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

// ── Recalcula totais dos times ──────────────────────────────────────────────────
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

// ── Ajuste dinâmico de preços pós-rodada ────────────────────────────────────────
// Cada ponto conquistado na Copa = +0.15 no preço (acumulado)
// Bônus máximo: +5  |  Penalidade máxima: -3  |  Mínimo absoluto: C$2

const TEAM_TIERS_PRICE = {
  elite: new Set(['Argentina','Brazil','England','France','Germany','Netherlands','Portugal','Spain']),
  forte: new Set(['Austria','Belgium','Colombia','Croatia','Ecuador','Japan','Mexico','Morocco','Norway','Scotland','Senegal','South Korea','Switzerland','United States','Uruguay']),
  medio: new Set(['Algeria','Australia','Bosnia-Herzegovina','Canada','Czechia','Egypt','Ghana','Iran','Ivory Coast','Paraguay','South Africa','Sweden','Tunisia','Turkey']),
}
const BASE_PRICES_TIER = {
  elite: { GK:11, DEF:9,   MID:10, FWD:13  },
  forte: { GK:8,  DEF:7,   MID:8,  FWD:10  },
  medio: { GK:6,  DEF:5,   MID:6,  FWD:8   },
  fraco: { GK:4,  DEF:3.5, MID:4,  FWD:5.5 },
}

function tierOf(team)      { return TEAM_TIERS_PRICE.elite.has(team) ? 'elite' : TEAM_TIERS_PRICE.forte.has(team) ? 'forte' : TEAM_TIERS_PRICE.medio.has(team) ? 'medio' : 'fraco' }
function basePriceOf(team, pos) { const t = tierOf(team); return BASE_PRICES_TIER[t]?.[pos] ?? BASE_PRICES_TIER[t]?.MID ?? 6 }
function clamp(v,mn,mx)    { return Math.max(mn, Math.min(mx, v)) }
function roundHalf(v)      { return Math.round(v * 2) / 2 }

async function updatePlayerPrices() {
  console.log('\n💰 Ajustando preços por performance na Copa...')

  // Pontuação total acumulada de cada jogador em todas as rodadas
  const { data: scores } = await supabase
    .from('cartola_player_scores')
    .select('player_id, total_points')

  const ptsByPlayer = {}
  const matchesByPlayer = {}
  for (const s of scores ?? []) {
    ptsByPlayer[s.player_id]     = (ptsByPlayer[s.player_id]     ?? 0) + s.total_points
    matchesByPlayer[s.player_id] = (matchesByPlayer[s.player_id] ?? 0) + 1
  }

  const { data: players } = await supabase
    .from('cartola_players')
    .select('id, team_name, position, price')

  let changed = 0
  for (const p of players ?? []) {
    const totalPts  = ptsByPlayer[p.id]     ?? 0
    const matches   = matchesByPlayer[p.id] ?? 0
    const avgPts    = matches > 0 ? totalPts / matches : 0
    const base      = basePriceOf(p.team_name, p.position)
    const adjustment = clamp(totalPts * 0.15, -3, 5)
    const newPrice  = roundHalf(Math.max(2, base + adjustment))
    const newAvg    = roundHalf(avgPts)

    // Só atualiza se o valor realmente mudou
    if (newPrice === p.price) continue

    if (!DRY_RUN) {
      await supabase
        .from('cartola_players')
        .update({ price: newPrice, avg_points: newAvg })
        .eq('id', p.id)
    }
    changed++
  }

  console.log(`  ↳ ${changed} jogadores com preço atualizado${DRY_RUN ? ' (dry run)' : ''}`)
}

// ── Verifica se a rodada encerrou ───────────────────────────────────────────────
async function checkRoundCompletion(round) {
  const { data: unfinished } = await supabase
    .from('matches')
    .select('id')
    .gte('match_date', round.start_date)
    .lte('match_date', round.end_date + 'T23:59:59Z')
    .not('status', 'in', '("FT","AET","PEN","CANC")')

  if (unfinished?.length === 0) {
    console.log(`\n🏁 Rodada "${round.name}" finalizada!`)
    if (!DRY_RUN) {
      await supabase.from('cartola_rounds').update({ status: 'finished' }).eq('id', round.id)
    }
  }
}

// ── Main ────────────────────────────────────────────────────────────────────────
async function main() {
  const now = new Date().toISOString().split('T')[0]
  console.log(`🏆 Score Cartola — ${now}${DRY_RUN ? ' (DRY RUN)' : ''}\n`)

  const { data: rounds, error: roundErr } = await supabase
    .from('cartola_rounds')
    .select('*')
    .in('status', ['open', 'closed'])
    .lte('start_date', now)

  if (roundErr) { console.error(roundErr.message); process.exit(1) }
  if (!rounds?.length) { console.log('Nenhuma rodada ativa no momento.'); return }

  for (const round of rounds) {
    console.log(`📅 Rodada: ${round.name} (${round.status})`)

    if (round.status === 'open' && !DRY_RUN) {
      await supabase.from('cartola_rounds').update({ status: 'closed' }).eq('id', round.id)
      console.log('  ↳ status → closed')
    }

    const { data: matches } = await supabase
      .from('matches')
      .select('id, api_match_id, home_team, away_team, home_team_id, away_team_id, score_home, score_away')
      .gte('match_date', round.start_date)
      .lte('match_date', round.end_date + 'T23:59:59Z')
      .in('status', ['FT', 'AET', 'PEN'])

    if (!matches?.length) { console.log('  ↳ nenhuma partida encerrada ainda\n'); continue }

    console.log(`  ${matches.length} partidas encerradas:\n`)

    let processed = 0
    for (const match of matches) {
      const scored = await processMatch(match, round.id)
      if (scored) processed++
      await new Promise(r => setTimeout(r, 6500)) // respeita 10 req/min do plano gratuito
    }

    if (processed > 0) {
      console.log(`\n📊 Recalculando pontuação dos times...`)
      await recalcTeamTotals(round.id)
    }

    await checkRoundCompletion(round)
    console.log()
  }

  // Ajusta preços de todos os jogadores com base na performance acumulada na Copa
  await updatePlayerPrices()

  console.log('✅ Concluído.')
}

main().catch(err => { console.error('❌', err.message); process.exit(1) })
