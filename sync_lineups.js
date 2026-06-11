/**
 * Busca escalações confirmadas e popula bet_options (goalscorer).
 * Fonte principal: API-Football (api-sports.io) via api_football_id.
 * Fallback: football-data.org via api_match_id.
 * A API libera o lineup ~1h antes do kickoff.
 *
 * Uso: node sync_lineups.js
 * Uso dry-run: node sync_lineups.js --dry-run
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

try {
  const raw = readFileSync('.env', 'utf-8')
  raw.split('\n').filter(l => l.includes('=') && !l.startsWith('#')).forEach(l => {
    const i = l.indexOf('=')
    const k = l.slice(0, i).trim()
    const v = l.slice(i + 1).trim()
    if (!process.env[k]) process.env[k] = v
  })
} catch {}

const DRY_RUN  = process.argv.includes('--dry-run')
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const AF_KEY  = process.env.VITE_API_FOOTBALL_KEY ?? process.env.API_FOOTBALL_KEY
const AF_BASE = 'https://v3.football.api-sports.io'

const FD_KEY  = process.env.VITE_FOOTBALL_DATA_KEY
const FD_BASE = 'https://api.football-data.org/v4'

// Posições da football-data.org → código curto (fallback)
const FD_POS_MAP = {
  Goalkeeper: 'G',
  Defence: 'D', 'Centre-Back': 'D', 'Left-Back': 'D', 'Right-Back': 'D', Defender: 'D',
  Midfield: 'M', 'Central Midfield': 'M', 'Defensive Midfield': 'M',
  'Attacking Midfield': 'M', Midfielder: 'M',
  Offence: 'F', 'Centre-Forward': 'F', 'Left Winger': 'F',
  'Right Winger': 'F', Attacker: 'F', Forward: 'F',
}

const BASE_ODD = { G: 35.0, D: 12.0, M: 6.5, F: 3.5 }

function calcOdd(pos, starter) {
  const base = BASE_ODD[pos] ?? 8.0
  return Math.round((starter ? base : base * 1.6) * 10) / 10
}

function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '') }

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ─── API-Football ──────────────────────────────────────────────────────────────

async function fetchApiFootballLineup(fixtureId) {
  try {
    const res = await fetch(`${AF_BASE}/fixtures/lineups?fixture=${fixtureId}`, {
      headers: { 'x-apisports-key': AF_KEY },
    })
    if (!res.ok) { console.log(`   ⚠️  API-Football retornou ${res.status}`); return null }
    const json = await res.json()
    return json.response ?? []
  } catch (err) {
    console.log(`   ❌ Erro API-Football: ${err.message}`)
    return null
  }
}

function parseApiFootballLineup(lineupResponse, match) {
  const rows = []

  for (const teamEntry of lineupResponse) {
    const apiName = teamEntry.team?.name ?? ''
    const apiNorm = norm(apiName)

    // Identifica se é home ou away pelo nome do time
    let team
    if (apiNorm.includes(norm(match.home_team)) || norm(match.home_team).includes(apiNorm)) {
      team = match.home_team
    } else if (apiNorm.includes(norm(match.away_team)) || norm(match.away_team).includes(apiNorm)) {
      team = match.away_team
    } else {
      console.log(`   ⚠️  Time não reconhecido: "${apiName}" (esperado: ${match.home_team} / ${match.away_team})`)
      // Tenta pelo índice: primeiro = home, segundo = away
      const idx = lineupResponse.indexOf(teamEntry)
      team = idx === 0 ? match.home_team : match.away_team
      console.log(`   ↳ Assumindo: ${team} (posição ${idx})`)
    }

    const groups = [
      { players: teamEntry.startXI    ?? [], starter: true  },
      { players: teamEntry.substitutes ?? [], starter: false },
    ]

    for (const { players, starter } of groups) {
      for (const entry of players) {
        const p   = entry.player
        const pos = p.pos ?? 'M'  // API-Football já retorna G/D/M/F
        rows.push({
          match_id:    match.id,
          type:        'goalscorer',
          description: `${p.name} marca gol`,
          odd:         calcOdd(pos, starter),
          metadata: { player_id: p.id, player_name: p.name, team, pos, starter },
        })
      }
    }
  }

  return rows
}

// ─── Football-data.org (fallback) ─────────────────────────────────────────────

async function fetchFootballDataLineup(apiMatchId) {
  try {
    const res = await fetch(`${FD_BASE}/matches/${apiMatchId}`, {
      headers: { 'X-Auth-Token': FD_KEY },
    })
    if (!res.ok) { console.log(`   ⚠️  football-data.org retornou ${res.status}`); return null }
    return await res.json()
  } catch (err) {
    console.log(`   ❌ Erro football-data.org: ${err.message}`)
    return null
  }
}

function parseFootballDataLineup(data, match) {
  const homeLineup = data.homeTeam?.lineup ?? []
  const homeBench  = data.homeTeam?.bench  ?? []
  const awayLineup = data.awayTeam?.lineup ?? []
  const awayBench  = data.awayTeam?.bench  ?? []

  if (homeLineup.length === 0) return null

  const rows = []
  const groups = [
    { team: match.home_team, players: homeLineup, starter: true  },
    { team: match.home_team, players: homeBench,  starter: false },
    { team: match.away_team, players: awayLineup, starter: true  },
    { team: match.away_team, players: awayBench,  starter: false },
  ]

  for (const { team, players, starter } of groups) {
    for (const player of players) {
      const pos = FD_POS_MAP[player.position] ?? 'M'
      rows.push({
        match_id:    match.id,
        type:        'goalscorer',
        description: `${player.name} marca gol`,
        odd:         calcOdd(pos, starter),
        metadata: { player_id: player.id, player_name: player.name, team, pos, starter },
      })
    }
  }

  return rows
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`📋 Sync Lineups — ${new Date().toISOString()}${DRY_RUN ? ' (DRY RUN)' : ''}\n`)

  const now       = new Date()
  // Busca partidas que começam entre 10 min e 75 min a partir de agora
  // (cobre as 3 janelas de verificação: ~60, ~30, ~15 min antes)
  const queryStart = new Date(now.getTime() +  10 * 60 * 1000)
  const queryEnd   = new Date(now.getTime() +  75 * 60 * 1000)

  // Janelas em que realmente chamamos a API (minutos até o kickoff)
  const CHECK_WINDOWS = [
    { label: '~60 min', min: 50, max: 70 },
    { label: '~30 min', min: 20, max: 50 },
    { label: '~15 min', min:  5, max: 20 },
  ]

  const { data: matches, error } = await supabase
    .from('matches')
    .select('id, api_match_id, api_football_id, home_team, away_team, match_date')
    .eq('status', 'NS')
    .gte('match_date', queryStart.toISOString())
    .lte('match_date', queryEnd.toISOString())
    .order('match_date')

  if (error) { console.error('❌ Erro ao buscar partidas:', error.message); return }
  if (!matches?.length) { console.log('ℹ️  Nenhuma partida nas próximas 75 minutos.'); return }

  console.log(`🔍 ${matches.length} partida(s) próxima(s):\n`)

  for (const match of matches) {
    const minsUntil = Math.round((new Date(match.match_date) - now) / 60000)
    const kickoffStr = new Date(match.match_date).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    console.log(`⚽ ${match.home_team} × ${match.away_team} — ${kickoffStr} BRT (em ${minsUntil} min)`)

    const { count } = await supabase
      .from('bet_options')
      .select('id', { count: 'exact', head: true })
      .eq('match_id', match.id)
      .eq('type', 'goalscorer')

    if (count > 0) {
      console.log(`   ✅ Lineup já cadastrado (${count} jogadores)\n`)
      continue
    }

    // Só chama a API nas 3 janelas específicas — evita chamadas desnecessárias
    const window = CHECK_WINDOWS.find(w => minsUntil >= w.min && minsUntil < w.max)
    if (!window) {
      console.log(`   ⏩ Aguardando janela de verificação (${minsUntil} min restantes)\n`)
      continue
    }
    console.log(`   🕐 Janela ${window.label} — buscando lineup...`)

    let rows = null

    // ── Fonte principal: API-Football ──────────────────────────────────────────
    if (match.api_football_id && AF_KEY) {
      console.log(`   🔗 API-Football (fixture #${match.api_football_id})...`)
      const response = await fetchApiFootballLineup(match.api_football_id)
      await sleep(1200)  // limite: ~50 req/min no plano free

      if (response && response.length > 0) {
        const parsed = parseApiFootballLineup(response, match)
        if (parsed.length > 0) {
          rows = parsed
          const starters = rows.filter(r => r.metadata.starter).length
          const subs     = rows.filter(r => !r.metadata.starter).length
          console.log(`   📋 ${starters} titulares + ${subs} reservas (API-Football)`)
        } else {
          console.log('   ⏳ Lineup ainda não publicado pela API-Football')
        }
      }
    }

    // ── Fallback: football-data.org ─────────────────────────────────────────────
    if (!rows && match.api_match_id && FD_KEY) {
      console.log(`   🔗 Fallback football-data.org (match #${match.api_match_id})...`)
      const data = await fetchFootballDataLineup(match.api_match_id)
      await sleep(6500)  // limite: 10 req/min no plano free

      if (data) {
        const parsed = parseFootballDataLineup(data, match)
        if (parsed) {
          rows = parsed
          console.log(`   📋 ${rows.filter(r => r.metadata.starter).length} titulares (football-data.org)`)
        } else {
          console.log('   ⏳ Lineup ainda não publicado pela football-data.org')
        }
      }
    }

    if (!rows || rows.length === 0) { console.log(''); continue }

    if (DRY_RUN) {
      console.log(`   🔬 DRY RUN — ${rows.length} entradas NÃO salvas\n`)
      continue
    }

    await supabase.from('bet_options').delete().eq('match_id', match.id).eq('type', 'goalscorer')

    const { error: insertErr } = await supabase.from('bet_options').insert(rows)
    if (insertErr) {
      console.error(`   ❌ Erro ao salvar: ${insertErr.message}\n`)
    } else {
      console.log(`   💾 ${rows.length} jogadores salvos em bet_options\n`)
    }
  }

  console.log('✅ Sync de lineups concluído.')
}

main().catch(err => { console.error('❌', err.message); process.exit(1) })
