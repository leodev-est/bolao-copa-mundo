/**
 * Busca escalações confirmadas e popula bet_options (goalscorer).
 * Fonte: ESPN API não-oficial (sem auth, sem chave).
 *
 * Além das partidas próximas, faz sync retroativo para jogos nas
 * últimas 72h que ainda não têm lineup salvo.
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

const ESPN_BASE    = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world'
const ESPN_HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept':          'application/json, text/plain, */*',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Origin':          'https://www.espn.com',
  'Referer':         'https://www.espn.com/',
  'sec-fetch-dest':  'empty',
  'sec-fetch-mode':  'cors',
  'sec-fetch-site':  'same-site',
}

// Posições ESPN → código curto (G/D/M/F)
const ESPN_POS_MAP = {
  'Goalkeeper': 'G',
  'Left Back': 'D', 'Right Back': 'D',
  'Center Back': 'D', 'Centre Back': 'D',
  'Left Center Back': 'D', 'Right Center Back': 'D',
  'Center Right Back': 'D', 'Center Left Back': 'D',
  'Sweeper': 'D', 'Defender': 'D',
  'Central Midfielder': 'M', 'Centre Midfielder': 'M',
  'Defensive Midfielder': 'M', 'Attacking Midfielder': 'M',
  'Left Midfielder': 'M', 'Right Midfielder': 'M',
  'Left Center Midfielder': 'M', 'Right Center Midfielder': 'M',
  'Left Attacking Midfielder': 'M', 'Right Attacking Midfielder': 'M',
  'Midfielder': 'M',
  'Forward': 'F', 'Centre Forward': 'F', 'Center Forward': 'F',
  'Left Wing': 'F', 'Right Wing': 'F',
  'Left Winger': 'F', 'Right Winger': 'F',
  'Striker': 'F', 'Second Striker': 'F', 'Attacker': 'F',
}

const BASE_ODD = { G: 35.0, D: 12.0, M: 6.5, F: 3.5 }

function calcOdd(pos, starter) {
  const base = BASE_ODD[pos] ?? 8.0
  return Math.round((starter ? base : base * 1.6) * 10) / 10
}

function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '') }

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ESPN usa nomes diferentes: "Korea Republic" vs "South Korea", "Bosnia-Herzegovina" vs nosso DB.
// Verifica se alguma palavra ≥4 chars do nome ESPN aparece no nome do DB.
function teamsMatch(espnName, dbName) {
  const en = norm(espnName)
  const dn = norm(dbName)
  if (en === dn || en.includes(dn) || dn.includes(en)) return true
  const parts = espnName.toLowerCase().split(/[\s\-\/&]+/)
  return parts.some(p => p.length >= 4 && dn.includes(norm(p)))
}

// ─── ESPN: descoberta de event ID ─────────────────────────────────────────────

function espnDateStr(date) {
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`
}

async function findEspnEventId(match) {
  const d = new Date(match.match_date)

  // ESPN organiza os jogos pelo fuso ET (UTC-4). Um jogo às 02:00 UTC Jun 12
  // aparece no scoreboard de Jun 11 (22:00 ET). Tentamos a data UTC e o dia anterior.
  const candidates = [d, new Date(d.getTime() - 24 * 60 * 60 * 1000)]

  for (const candidate of candidates) {
    const dateStr = espnDateStr(candidate)
    try {
      const res = await fetch(`${ESPN_BASE}/scoreboard?dates=${dateStr}`, { headers: ESPN_HEADERS })
      if (!res.ok) continue
      const data = await res.json()

      for (const event of (data.events ?? [])) {
        const comp     = event.competitions?.[0]
        const homeComp = comp?.competitors?.find(c => c.homeAway === 'home')
        const awayComp = comp?.competitors?.find(c => c.homeAway === 'away')
        if (!homeComp || !awayComp) continue

        if (
          teamsMatch(homeComp.team.displayName, match.home_team) &&
          teamsMatch(awayComp.team.displayName, match.away_team)
        ) {
          return event.id
        }
      }
    } catch (err) {
      console.log(`   ❌ ESPN scoreboard ${dateStr}: ${err.message}`)
    }
  }

  console.log(`   ⚠️  Jogo não encontrado no ESPN (tentou ${candidates.map(espnDateStr).join(' e ')})`)
  return null
}

// ─── ESPN: busca e parse do lineup ────────────────────────────────────────────

async function fetchEspnLineup(espnId, match) {
  const MAX_ATTEMPTS = 3
  let rosters = []
  let totalPlayers = 0

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${ESPN_BASE}/summary?event=${espnId}`, { headers: ESPN_HEADERS })
      if (!res.ok) { console.log(`   ⚠️  ESPN summary ${res.status} (tentativa ${attempt})`); break }
      const data = await res.json()
      rosters = data.rosters ?? []
      totalPlayers = rosters.reduce((s, r) => s + (r.roster?.length ?? 0), 0)
      console.log(`   📊 ESPN: ${rosters.length} times, ${totalPlayers} jogadores totais (tentativa ${attempt})`)
      if (totalPlayers > 0) break
      if (attempt < MAX_ATTEMPTS) {
        console.log(`   ⏳ ESPN: escalação vazia, tentando novamente em 5s...`)
        await sleep(5000)
      }
    } catch (err) {
      console.log(`   ❌ ESPN summary tentativa ${attempt}: ${err.message}`)
      if (attempt < MAX_ATTEMPTS) await sleep(5000)
    }
  }

  try {
    if (rosters.length === 0 || totalPlayers === 0) {
      console.log('   ⏳ ESPN: escalação ainda não disponível')
      return null
    }

    const rows = []
    for (const roster of rosters) {
      const espnTeam = roster.team?.displayName ?? ''
      const isHome   = teamsMatch(espnTeam, match.home_team)
      const team     = isHome ? match.home_team : match.away_team

      for (const p of (roster.roster ?? [])) {
        const posLabel = p.position?.displayName ?? ''
        const pos      = ESPN_POS_MAP[posLabel] ?? 'M'
        const starter  = p.starter ?? false
        rows.push({
          match_id:    match.id,
          type:        'goalscorer',
          description: `${p.athlete.displayName} marca gol`,
          odd:         calcOdd(pos, starter),
          metadata: {
            player_id:   parseInt(p.athlete.id),
            player_name: p.athlete.displayName,
            team,
            pos,
            starter,
          },
        })
      }
    }

    return rows.length > 0 ? rows : null
  } catch (err) {
    console.log(`   ❌ ESPN summary: ${err.message}`)
    return null
  }
}

// ─── Processa um jogo ──────────────────────────────────────────────────────────

async function processMatch(match, label) {
  const kickoffStr = new Date(match.match_date).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const tag = label ? ` (${label})` : ''
  console.log(`⚽ ${match.home_team} × ${match.away_team} — ${kickoffStr} BRT${tag}`)

  const { count } = await supabase
    .from('bet_options')
    .select('id', { count: 'exact', head: true })
    .eq('match_id', match.id)
    .eq('type', 'goalscorer')

  if (count > 0) {
    console.log(`   ✅ Lineup já cadastrado (${count} jogadores)\n`)
    return
  }

  // Garante ESPN event ID
  let espnId = match.espn_event_id
  if (!espnId) {
    console.log('   🔍 Buscando ESPN event ID...')
    espnId = await findEspnEventId(match)
    if (espnId) {
      console.log(`   🔗 ESPN event ID encontrado: ${espnId}`)
      if (!DRY_RUN) {
        await supabase.from('matches').update({ espn_event_id: espnId }).eq('id', match.id)
      }
    } else {
      console.log('   ❌ ESPN event ID não encontrado\n')
      return
    }
  } else {
    console.log(`   🔗 ESPN event ID: ${espnId}`)
  }

  const rows = await fetchEspnLineup(espnId, match)
  if (!rows) { console.log(''); return }

  const starters = rows.filter(r => r.metadata.starter).length
  const subs     = rows.filter(r => !r.metadata.starter).length
  console.log(`   📋 ${starters} titulares + ${subs} reservas`)

  if (DRY_RUN) {
    console.log(`   🔬 DRY RUN — ${rows.length} entradas NÃO salvas\n`)
    return
  }

  await supabase.from('bet_options').delete().eq('match_id', match.id).eq('type', 'goalscorer')

  const { error } = await supabase.from('bet_options').insert(rows)
  if (error) {
    console.error(`   ❌ Erro ao salvar: ${error.message}\n`)
  } else {
    await supabase.from('matches').update({ has_lineup: true }).eq('id', match.id)
    console.log(`   💾 ${rows.length} jogadores salvos em bet_options\n`)
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`📋 Sync Lineups (ESPN) — ${new Date().toISOString()}${DRY_RUN ? ' (DRY RUN)' : ''}\n`)

  const now = new Date()

  // Busca jogos NS nas próximas 90 min — sem check windows, tenta a cada run.
  // processMatch() já pula se lineup existir (count > 0).
  const queryEnd = new Date(now.getTime() + 90 * 60 * 1000)

  // ── 1. Partidas próximas (NS) ─────────────────────────────────────────────
  const { data: upcoming = [], error: e1 } = await supabase
    .from('matches')
    .select('id, home_team, away_team, match_date, espn_event_id')
    .eq('status', 'NS')
    .gt('match_date', now.toISOString())
    .lte('match_date', queryEnd.toISOString())
    .order('match_date')

  if (e1) console.error('Erro ao buscar próximas:', e1.message)

  // ── 2. Partidas recentes sem lineup (retroativo: últimas 72h) ─────────────
  const since72h = new Date(now.getTime() - 72 * 60 * 60 * 1000)

  const { data: withLineup = [] } = await supabase
    .from('bet_options')
    .select('match_id')
    .eq('type', 'goalscorer')

  const matchIdsWithLineup = new Set(withLineup.map(r => r.match_id))

  // Inclui NS cujo kickoff já passou (status ainda não atualizado pelo sync.js)
  const { data: recentMatches = [], error: e2 } = await supabase
    .from('matches')
    .select('id, home_team, away_team, match_date, espn_event_id')
    .or('status.in.(FT,AET,PEN,1H,HT,2H,ET,BT),and(status.eq.NS,match_date.lte.' + now.toISOString() + ')')
    .gte('match_date', since72h.toISOString())
    .order('match_date', { ascending: false })

  if (e2) console.error('Erro ao buscar recentes:', e2.message)

  const retroMatches = recentMatches.filter(m => !matchIdsWithLineup.has(m.id))

  // ── Processa próximas ─────────────────────────────────────────────────────
  if (upcoming.length > 0) {
    console.log(`🔍 ${upcoming.length} partida(s) nas próximas 90 min:\n`)
    for (const match of upcoming) {
      const minsUntil = Math.round((new Date(match.match_date) - now) / 60000)
      await processMatch(match, `${minsUntil} min`)
      await sleep(300)
    }
  } else {
    console.log('ℹ️  Nenhuma partida nas próximas 90 minutos.\n')
  }

  // ── Processa retroativos ──────────────────────────────────────────────────
  if (retroMatches.length > 0) {
    console.log(`🔄 ${retroMatches.length} jogo(s) recente(s) sem lineup (retroativo):\n`)
    for (const match of retroMatches) {
      await processMatch(match, 'retroativo')
      await sleep(300)
    }
  } else {
    console.log('ℹ️  Nenhum jogo recente sem lineup.')
  }

  console.log('\n✅ Sync de lineups concluído.')
}

main().catch(err => { console.error('❌', err.message); process.exit(1) })
