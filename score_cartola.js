/**
 * Calcula e salva a pontuação do Cartola para partidas encerradas E ao vivo.
 * API: football-data.org v4 (gols e cartões via GET /v4/matches/{id})
 * Rodado pelo GitHub Actions a cada 10 min durante a Copa.
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
const FORCE   = process.argv.includes('--force')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ESPN_BASE  = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world'
const ESPN_HDRS  = {
  'User-Agent':  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept':      'application/json',
  'Origin':      'https://www.espn.com',
  'Referer':     'https://www.espn.com/',
}

function norm(s) {
  return s.toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').trim()
}

function namesMatch(espnName, dbName) {
  if (!espnName || !dbName) return false
  const en = norm(espnName)
  const dn = norm(dbName)
  // Nome completo ou substring (ex: "Gyökeres" bate "Viktor Gyökeres")
  if (en === dn || en.includes(dn) || dn.includes(en)) return true
  // Sobrenome: último token deve ser igual e ter >=4 chars
  const enTokens = en.split(' ').filter(Boolean)
  const dnTokens = dn.split(' ').filter(Boolean)
  const enLast = enTokens.at(-1) ?? ''
  const dnLast = dnTokens.at(-1) ?? ''
  if (enLast.length < 4 || enLast !== dnLast) return false
  // Se ambos têm primeiro nome e são diferentes → não é o mesmo jogador
  // (ex: "Maxi Araújo" ≠ "Ronald Araújo" — mesmo sobrenome, primeiro diferente)
  // Se ambos têm primeiro nome, verificam compatibilidade:
  // nomes iguais OU um é prefixo do outro com >=3 chars (ex: "Maxi" ↔ "Maximiliano")
  if (enTokens.length > 1 && dnTokens.length > 1) {
    const ef = enTokens[0], df = dnTokens[0]
    const compatible = ef === df
      || (ef.length >= 3 && df.startsWith(ef))
      || (df.length >= 3 && ef.startsWith(df))
    if (!compatible) return false
  }
  return true
}

function teamsMatch(espnTeam, dbTeam) {
  if (!espnTeam || !dbTeam) return false
  const en = norm(espnTeam)
  const dn = norm(dbTeam)
  if (en === dn || en.includes(dn) || dn.includes(en)) return true
  const espnParts = en.split(' ').filter(w => w.length >= 4)
  const dbParts   = dn.split(' ').filter(w => w.length >= 4)
  // Word substring check OR 4-char prefix match (handles "Türkiye"↔"Turkey", "Korea Republic"↔"South Korea")
  return espnParts.some(ep =>
    dn.includes(ep) ||
    dbParts.some(dp => ep.slice(0, 4) === dp.slice(0, 4))
  )
}

function espnDateStr(date) {
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`
}

async function findEspnEventId(match) {
  const d = new Date(match.match_date)
  const candidates = [d, new Date(d.getTime() - 24 * 60 * 60 * 1000)]
  for (const candidate of candidates) {
    try {
      const res = await fetch(`${ESPN_BASE}/scoreboard?dates=${espnDateStr(candidate)}`, { headers: ESPN_HDRS })
      if (!res.ok) continue
      const data = await res.json()
      for (const event of (data.events ?? [])) {
        const comp     = event.competitions?.[0]
        const homeComp = comp?.competitors?.find(c => c.homeAway === 'home')
        const awayComp = comp?.competitors?.find(c => c.homeAway === 'away')
        if (!homeComp || !awayComp) continue
        if (teamsMatch(homeComp.team.displayName, match.home_team) &&
            teamsMatch(awayComp.team.displayName, match.away_team)) {
          return event.id
        }
      }
    } catch {}
  }
  return null
}

async function fetchEspnEvents(espnId) {
  try {
    const res = await fetch(`${ESPN_BASE}/summary?event=${espnId}`, { headers: ESPN_HDRS })
    if (!res.ok) return null
    const data = await res.json()
    const keyEvents = data.keyEvents ?? []

    const goals   = []
    const assists = []
    const yellows = []
    const reds    = []

    for (const ev of keyEvents) {
      const text = (ev.text ?? '').trim()
      if (!text) continue

      if (text.startsWith('Goal!')) {
        const afterDot = text.replace(/^Goal!.*?\.\s+/, '')
        const scorerMatch = afterDot.match(/^(.+?)\s+\(([^)]+)\)/)
        if (scorerMatch) {
          const isOwn    = text.toLowerCase().includes('own goal')
          const goalTeam = scorerMatch[2].trim()
          goals.push({ name: scorerMatch[1].trim(), team: goalTeam, isOwn })
          // Assistência vem do mesmo time que o gol
          const assistMatch = text.match(/[Aa]ssisted by ([^.,(]+)/i)
          if (assistMatch) assists.push({ name: assistMatch[1].trim(), team: goalTeam })
        }
      } else if (text.toLowerCase().includes('yellow card')) {
        // "Rani Khedira (Tunisia) is shown the yellow card..."
        const m = text.match(/^([^(]+)\s+\(([^)]+)\)/)
        if (m) yellows.push({ name: m[1].trim(), team: m[2].trim() })
      } else if (text.toLowerCase().includes('red card') || text.toLowerCase().includes('sent off')) {
        const m = text.match(/^([^(]+)\s+\(([^)]+)\)/)
        if (m) reds.push({ name: m[1].trim(), team: m[2].trim() })
      }
    }

    // Stats por jogador (chutes no gol, defesas do goleiro)
    const playerStats = []
    for (const roster of (data.rosters ?? [])) {
      const teamName = roster.team?.displayName ?? ''
      for (const p of (roster.roster ?? [])) {
        if (!p.athlete?.displayName) continue
        const statMap = {}
        for (const s of (p.stats ?? [])) statMap[s.name] = s.value ?? 0
        playerStats.push({
          name:          p.athlete.displayName,
          team:          teamName,
          shotsOnTarget: statMap.shotsOnTarget ?? 0,
          saves:         statMap.saves         ?? null,   // explícito em alguns GKs
          shotsFaced:    statMap.shotsFaced     ?? 0,
          goalsConceded: statMap.goalsConceded  ?? 0,
        })
      }
    }

    console.log(`    ↳ ESPN keyEvents: ${goals.length}G ${assists.length}A ${yellows.length}Y ${reds.length}R | ${playerStats.length} stats`)
    return { goals, assists, yellows, reds, playerStats }
  } catch (err) {
    console.warn(`    ↳ ESPN keyEvents falhou: ${err.message}`)
    return null
  }
}

// ── Pontuação ───────────────────────────────────────────────────────────────────
const SCORING = {
  goal:         { GK: 15, DEF: 12, MID: 8, FWD: 8 },
  assist:       5,
  cleanSheet:   { GK: 5, DEF: 3 },
  yellowCard:  -2,
  redCard:     -5,
  penaltySaved: 7,
  ownGoal:     -4,
  shotOnTarget: { GK: 3, DEF: 3, MID: 2, FWD: 2 },
  save:         2,
}

function calcScore({ position, goals = 0, assists = 0, cleanSheet = false,
  yellowCard = false, redCard = false, penaltySaved = 0, ownGoal = 0,
  shotsOnTarget = 0, saves = 0 }) {
  let pts = 0
  pts += goals * (SCORING.goal[position] ?? 8)
  pts += assists * SCORING.assist
  if (cleanSheet && (position === 'GK' || position === 'DEF')) pts += SCORING.cleanSheet[position] ?? 0
  if (yellowCard) pts += SCORING.yellowCard
  if (redCard)    pts += SCORING.redCard
  pts += penaltySaved * SCORING.penaltySaved
  pts += ownGoal * SCORING.ownGoal
  pts += shotsOnTarget * (SCORING.shotOnTarget[position] ?? 1)
  if (position === 'GK') pts += saves * SCORING.save
  return pts
}

function applyCapitan(base, isCaptain) { return isCaptain ? base * 2 : base }

const LIVE_STATUSES = ['1H', 'HT', '2H', 'ET', 'P']

// ── Processa uma partida (encerrada ou ao vivo) ─────────────────────────────────
async function processMatch(match, roundId) {
  const isLive = LIVE_STATUSES.includes(match.status)
  const prefix = isLive ? '🔴' : '✅'
  console.log(`  ${prefix} ${match.home_team} × ${match.away_team}${isLive ? ' (ao vivo)' : ''}`)

  // Partidas encerradas sem placar: aguarda o próximo sync popular os dados
  if (!isLive && (match.score_home === null || match.score_away === null)) {
    console.log('    ↳ placar nulo, aguardando próximo sync')
    return false
  }

  if (!isLive) {
    const { data: existing } = await supabase
      .from('cartola_player_scores')
      .select('id, goals, assists, yellow_card, red_card')
      .eq('match_id', match.id)
      .eq('round_id', roundId)

    if (existing?.length > 0) {
      const hoursAfterKickoff = (Date.now() - new Date(match.match_date).getTime()) / 3_600_000

      if (!FORCE) {
        // >7 dias: dados estáveis, nunca re-processa
        if (hoursAfterKickoff > 168) {
          console.log('    ↳ já pontuado (>7 dias), pulando')
          return false
        }

        const matchHasGoals   = (match.score_home ?? 0) + (match.score_away ?? 0) > 0
        const recordHasEvents = existing.some(r => r.goals > 0 || r.assists > 0 || r.yellow_card || r.red_card)

        // >48h E (tem eventos OU é 0×0): pontuação está correta, pula
        if (hoursAfterKickoff > 48 && (recordHasEvents || !matchHasGoals)) {
          console.log('    ↳ já pontuado (>48h), pulando')
          return false
        }
      }

      // Re-processa: match com gols sem eventos detectados, <48h ao vivo, ou --force
      console.log(`    ↳ re-processando${FORCE ? ' (--force)' : ' com placar final'}...`)
      if (!DRY_RUN) {
        await supabase.from('cartola_player_scores').delete().eq('match_id', match.id).eq('round_id', roundId)
      }
    }
  }

  let espnId = match.espn_event_id
  if (!espnId) {
    espnId = await findEspnEventId(match)
    if (espnId && !DRY_RUN) {
      await supabase.from('matches').update({ espn_event_id: espnId }).eq('id', match.id)
    }
  }

  let espnEvents = null
  if (espnId) {
    espnEvents = await fetchEspnEvents(espnId)
  }

  if (!espnEvents) {
    console.warn('    ↳ ESPN indisponível — pontuação parcial (só clean sheet)')
  }

  let effectiveHomeScore, effectiveAwayScore
  if (isLive) {
    if (espnEvents) {
      effectiveHomeScore = espnEvents.goals.filter(g => !g.isOwn && teamsMatch(g.team, match.home_team)).length
                         + espnEvents.goals.filter(g =>  g.isOwn && teamsMatch(g.team, match.away_team)).length
      effectiveAwayScore = espnEvents.goals.filter(g => !g.isOwn && teamsMatch(g.team, match.away_team)).length
                         + espnEvents.goals.filter(g =>  g.isOwn && teamsMatch(g.team, match.home_team)).length
    } else {
      effectiveHomeScore = match.score_home ?? 0
      effectiveAwayScore = match.score_away ?? 0
    }
    console.log(`    ↳ placar parcial: ${effectiveHomeScore} × ${effectiveAwayScore} (${match.status})`)
  } else {
    effectiveHomeScore = match.score_home ?? 0
    effectiveAwayScore = match.score_away ?? 0
  }

  // Busca por team_id (grupo) ou team_name exato (mata-mata sem IDs do FD.org)
  let players
  const teamIds = [match.home_team_id, match.away_team_id].filter(Boolean)
  if (teamIds.length > 0) {
    const { data } = await supabase
      .from('cartola_players')
      .select('id, name, team_name, api_player_id, position, team_id')
      .in('team_id', teamIds)
    players = data
  } else {
    // Mata-mata: sem team_id no banco — usa nome exato para evitar falsos positivos
    const { data: all } = await supabase
      .from('cartola_players')
      .select('id, name, team_name, api_player_id, position, team_id')
    players = (all ?? []).filter(p =>
      norm(p.team_name) === norm(match.home_team) || norm(p.team_name) === norm(match.away_team)
    )
  }

  if (!players?.length) {
    console.log('    ↳ nenhum jogador encontrado para esses times')
    return false
  }

  const rows = players.map(player => {
    const pid = player.api_player_id
    const isHome = match.home_team_id
      ? player.team_id === match.home_team_id
      : teamsMatch(player.team_name, match.home_team)
    const conceded = isHome ? effectiveAwayScore : effectiveHomeScore
    const cleanSheet = conceded === 0

    const byName = (g) => namesMatch(g.name, player.name) && teamsMatch(g.team, player.team_name)
    let playerGoals = 0, playerAssists = 0, playerYellow = false, playerRed = false
    let playerPenSaved = 0, playerOwnGoal = 0
    if (espnEvents) {
      playerGoals    = espnEvents.goals.filter(g => !g.isOwn && byName(g)).length
      playerAssists  = espnEvents.assists.filter(g => byName(g)).length
      playerYellow   = espnEvents.yellows.some(g => byName(g))
      playerRed      = espnEvents.reds.some(g => byName(g))
      playerOwnGoal  = espnEvents.goals.filter(g => g.isOwn && byName(g)).length
    }

    // Stats extras da ESPN: chutes no gol e defesas do goleiro
    let playerSOG = 0, playerSaves = 0
    if (espnEvents?.playerStats) {
      const pStat = espnEvents.playerStats.find(s => byName(s))
      if (pStat) {
        playerSOG = pStat.shotsOnTarget ?? 0
        if (player.position === 'GK') {
          // ESPN às vezes expõe 'saves' diretamente; se não, calcula shotsFaced - goalsConceded
          playerSaves = pStat.saves !== null
            ? pStat.saves
            : Math.max(0, (pStat.shotsFaced ?? 0) - (pStat.goalsConceded ?? 0))
        }
      }
    }

    const playerCS = cleanSheet && (player.position === 'GK' || player.position === 'DEF')

    const total = calcScore({
      position: player.position, goals: playerGoals, assists: playerAssists,
      cleanSheet: playerCS, yellowCard: playerYellow, redCard: playerRed,
      penaltySaved: playerPenSaved, ownGoal: playerOwnGoal,
      shotsOnTarget: playerSOG, saves: playerSaves,
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
  console.log(`    ↳ ${players.length} jogadores | ${pontuados.length} pontuaram${isLive ? ' (provisório)' : ''}`)

  if (!DRY_RUN && rows.length > 0) {
    // Live: upsert sempre (pontuação muda a cada gol)
    // Encerrada: upsert na primeira vez (condição acima garante que só roda 1x)
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
// Regras (sobre o preço-base do tier):
//   Não jogou ainda  →  sem alteração
//   pts < 0          →  -3.0  (perde mais)
//   pts = 0          →  -2.0  (sem contribuição)
//   1 ≤ pts < 5      →  -1.0  (abaixo do esperado)
//   5 ≤ pts < 10     →  +1.0  (contribuição razoável)
//   pts ≥ 10         →  +clamp((pts-9)*0.25, 1.5, 9)  (bom → ótimo)
//   Mínimo absoluto: C$2

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
    let adjustment = 0
    if (matches > 0) {
      if      (totalPts < 0)  adjustment = -3.0
      else if (totalPts === 0) adjustment = -2.0
      else if (totalPts < 5)  adjustment = -1.0
      else if (totalPts < 10) adjustment =  1.0
      else                     adjustment = clamp((totalPts - 9) * 0.25, 1.5, 12)
    }
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

// Calcula o custo mínimo para montar um time de 11 jogadores válido
async function computeMinTeamCost() {
  const { data: players } = await supabase
    .from('cartola_players')
    .select('position, price')
    .eq('available', true)
    .order('price', { ascending: true })

  const byPos = {}
  for (const p of players ?? []) {
    if (!byPos[p.position]) byPos[p.position] = []
    byPos[p.position].push(p.price)
  }

  // Todas as formações suportadas — pega o time mais barato entre elas
  const formations = [
    { GK: 1, DEF: 4, MID: 3, FWD: 3 },
    { GK: 1, DEF: 4, MID: 4, FWD: 2 },
    { GK: 1, DEF: 3, MID: 5, FWD: 2 },
    { GK: 1, DEF: 4, MID: 5, FWD: 1 },
  ]

  let minCost = Infinity
  for (const f of formations) {
    let cost = 0; let valid = true
    for (const [pos, count] of Object.entries(f)) {
      const prices = byPos[pos] ?? []
      if (prices.length < count) { valid = false; break }
      cost += prices.slice(0, count).reduce((a, b) => a + b, 0)
    }
    if (valid && cost < minCost) minCost = cost
  }

  return minCost === Infinity ? null : Math.ceil(minCost * 2) / 2 // arredonda pra cima no 0,5
}

// ── Verifica se a rodada encerrou ───────────────────────────────────────────────
async function checkRoundCompletion(round) {
  const endFilter = new Date(new Date(round.end_date).getTime() + 30 * 60 * 60 * 1000).toISOString()

  const { data: unfinished, error } = await supabase
    .from('matches')
    .select('id')
    .gte('match_date', round.start_date)
    .lte('match_date', endFilter)
    .not('status', 'in', '("FT","AET","PEN","CANC")')

  if (error) {
    console.warn(`  ↳ erro ao verificar conclusão da rodada: ${error.message}`)
    return
  }

  if (unfinished?.length === 0) {
    console.log(`\n🏁 Rodada "${round.name}" finalizada!`)
    if (!DRY_RUN) {
      await supabase.from('cartola_rounds').update({ status: 'finished' }).eq('id', round.id)
    }
  } else {
    console.log(`  ↳ ${unfinished.length} jogo(s) ainda não encerrado(s) na rodada`)
  }
}

// ── Main ────────────────────────────────────────────────────────────────────────
async function main() {
  const now = new Date().toISOString().split('T')[0]
  console.log(`🏆 Score Cartola — ${now}${DRY_RUN ? ' (DRY RUN)' : ''}${FORCE ? ' (FORCE)' : ''}\n`)

  const { data: rounds, error: roundErr } = await supabase
    .from('cartola_rounds')
    .select('*')
    .in('status', ['open', 'closed'])
    .lte('start_date', now)

  if (roundErr) { console.error(roundErr.message); process.exit(1) }
  if (!rounds?.length) { console.log('Nenhuma rodada ativa no momento.'); return }

  for (const round of rounds) {
    console.log(`📅 Rodada: ${round.name} (${round.status})`)

    // Não altera o status da rodada aqui — o fechamento é gerenciado pelo pg_cron.
    // Rodadas 'open' ainda podem ter pontuações ao vivo calculadas normalmente.

    // end_date is a BRT calendar date; Copa games at 21:00 ET = 01:00 UTC next day,
    // so add 30h buffer: end_date + 1 day at 06:00 UTC covers all BRT-day games.
    const endFilter = new Date(new Date(round.end_date).getTime() + 30 * 60 * 60 * 1000).toISOString()

    const { data: matches } = await supabase
      .from('matches')
      .select('id, api_match_id, home_team, away_team, home_team_id, away_team_id, score_home, score_away, status, espn_event_id, match_date')
      .gte('match_date', round.start_date)
      .lte('match_date', endFilter)
      .in('status', ['FT', 'AET', 'PEN', '1H', 'HT', '2H', 'ET', 'P'])

    if (!matches?.length) { console.log('  ↳ nenhuma partida encerrada ou ao vivo ainda\n'); continue }

    const liveCount     = matches.filter(m => LIVE_STATUSES.includes(m.status)).length
    const finishedCount = matches.length - liveCount
    const parts = [finishedCount > 0 && `${finishedCount} encerrada(s)`, liveCount > 0 && `${liveCount} ao vivo`].filter(Boolean)
    console.log(`  ${parts.join(' + ')}:\n`)

    let liveProcessed = 0, finishedProcessed = 0
    for (const match of matches) {
      const scored = await processMatch(match, round.id)
      if (scored) {
        if (LIVE_STATUSES.includes(match.status)) liveProcessed++
        else finishedProcessed++
      }
      await new Promise(r => setTimeout(r, 1000)) // pequena pausa entre jogos
    }

    if (liveProcessed + finishedProcessed > 0) {
      console.log(`\n📊 Recalculando pontuação dos times...`)
      await recalcTeamTotals(round.id)
    }

    // Só verifica conclusão da rodada quando não há mais jogos ao vivo
    if (liveCount === 0) {
      await checkRoundCompletion(round)
    }

    console.log()
  }

  // Ajusta preços apenas quando não há jogos ao vivo (evita distorção com pontuações parciais)
  const { data: liveNow } = await supabase
    .from('matches')
    .select('id')
    .in('status', LIVE_STATUSES)
    .limit(1)

  if (!liveNow?.length) {
    await updatePlayerPrices()

    // Atualiza o orçamento mínimo necessário pra montar um time nessa rodada
    const minCost = await computeMinTeamCost()
    if (minCost !== null) {
      console.log(`\n💼 Custo mínimo de time: C$${minCost}`)
      for (const round of rounds ?? []) {
        if (!DRY_RUN) {
          await supabase.from('cartola_rounds').update({ min_budget: minCost }).eq('id', round.id)
        }
      }
    }
  } else {
    console.log('\n⏸  Preços não ajustados: há jogos ao vivo no momento.')
  }

  console.log('✅ Concluído.')
}

main().catch(err => { console.error('❌', err.message); process.exit(1) })
