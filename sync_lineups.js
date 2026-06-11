/**
 * Busca escalações confirmadas do football-data.org e popula bet_options (goalscorer).
 * A API libera o lineup ~1h antes do kickoff.
 * Rodado pelo GitHub Actions junto ao sync principal.
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
const API_KEY  = process.env.VITE_FOOTBALL_DATA_KEY
const BASE_URL = 'https://api.football-data.org/v4'

// Mapeia posição da API → código curto usado no metadata
const POS_MAP = {
  Goalkeeper:          'G',
  Defence:             'D', 'Centre-Back':       'D', 'Left-Back':         'D',
  'Right-Back':        'D', Defender:            'D',
  Midfield:            'M', 'Central Midfield':  'M', 'Defensive Midfield':'M',
  'Attacking Midfield':'M', Midfielder:          'M',
  Offence:             'F', 'Centre-Forward':    'F', 'Left Winger':       'F',
  'Right Winger':      'F', Attacker:            'F', Forward:             'F',
}

// Odds base por posição (quanto maior, menos provável de marcar)
const BASE_ODD = { G: 35.0, D: 12.0, M: 6.5, F: 3.5 }

function calcOdd(pos, starter) {
  const base = BASE_ODD[pos] ?? 8.0
  // Reservas têm odd 60% maior (menos chance de marcar)
  const raw  = starter ? base : base * 1.6
  return Math.round(raw * 10) / 10
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function fetchMatchData(apiMatchId) {
  try {
    const res = await fetch(`${BASE_URL}/matches/${apiMatchId}`, {
      headers: { 'X-Auth-Token': API_KEY },
    })
    if (!res.ok) {
      console.log(`   ⚠️  API retornou ${res.status}`)
      return null
    }
    return await res.json()
  } catch (err) {
    console.log(`   ❌ Erro na requisição: ${err.message}`)
    return null
  }
}

async function main() {
  console.log(`📋 Sync Lineups — ${new Date().toISOString()}${DRY_RUN ? ' (DRY RUN)' : ''}\n`)

  if (!API_KEY) {
    console.error('❌ VITE_FOOTBALL_DATA_KEY não encontrado')
    process.exit(1)
  }

  // Partidas NS que começam nos próximos 100 minutos (janela de lineup)
  const now         = new Date()
  const windowStart = new Date(now.getTime() - 10 * 60 * 1000)  // 10 min atrás
  const windowEnd   = new Date(now.getTime() + 100 * 60 * 1000) // 100 min à frente

  const { data: matches, error } = await supabase
    .from('matches')
    .select('id, api_match_id, home_team, away_team, match_date')
    .eq('status', 'NS')
    .gte('match_date', windowStart.toISOString())
    .lte('match_date', windowEnd.toISOString())
    .order('match_date', { ascending: true })

  if (error) { console.error('❌ Erro ao buscar partidas:', error.message); return }

  if (!matches?.length) {
    console.log('ℹ️  Nenhuma partida próxima na janela de 100 minutos.')
    return
  }

  console.log(`🔍 ${matches.length} partida(s) na janela:\n`)

  for (const match of matches) {
    console.log(`⚽ ${match.home_team} × ${match.away_team} (${new Date(match.match_date).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })} BRT)`)

    // Pula se lineup já foi populado
    const { count } = await supabase
      .from('bet_options')
      .select('id', { count: 'exact', head: true })
      .eq('match_id', match.id)
      .eq('type', 'goalscorer')

    if (count > 0) {
      console.log(`   ✅ Lineup já cadastrado (${count} jogadores)\n`)
      continue
    }

    // Busca dados da partida na API
    const data = await fetchMatchData(match.api_match_id)
    await sleep(6500) // respeita limite de 10 req/min do plano gratuito

    if (!data) { console.log(''); continue }

    const homeLineup = data.homeTeam?.lineup ?? []
    const homeBench  = data.homeTeam?.bench  ?? []
    const awayLineup = data.awayTeam?.lineup ?? []
    const awayBench  = data.awayTeam?.bench  ?? []

    if (homeLineup.length === 0) {
      console.log('   ⏳ Lineup ainda não publicado pela API\n')
      continue
    }

    console.log(`   📋 ${homeLineup.length} titulares + ${homeBench.length} reservas (${match.home_team})`)
    console.log(`      ${awayLineup.length} titulares + ${awayBench.length} reservas (${match.away_team})`)

    const rows = []

    const groups = [
      { team: match.home_team, players: homeLineup, starter: true  },
      { team: match.home_team, players: homeBench,  starter: false },
      { team: match.away_team, players: awayLineup, starter: true  },
      { team: match.away_team, players: awayBench,  starter: false },
    ]

    for (const { team, players, starter } of groups) {
      for (const player of players) {
        const pos = POS_MAP[player.position] ?? 'M'
        const odd = calcOdd(pos, starter)
        rows.push({
          match_id:    match.id,
          type:        'goalscorer',
          description: `${player.name} marca gol`,
          odd,
          metadata: {
            player_id:   player.id,
            player_name: player.name,
            team,
            pos,
            starter,
          },
        })
      }
    }

    if (DRY_RUN) {
      console.log(`   🔬 DRY RUN — ${rows.length} entradas NÃO salvas\n`)
      continue
    }

    // Remove goalscorer antigas (caso existam) e insere as novas
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
