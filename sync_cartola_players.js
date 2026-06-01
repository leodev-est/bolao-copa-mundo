/**
 * Seed de jogadores do Cartola com preços baseados em stats da temporada 2025/26.
 *
 * Fluxo:
 *   1. Busca escalações dos jogos da Copa (já no banco após sync.js)
 *   2. Para cada jogador, busca stats da temporada na API
 *   3. Calcula score por posição e normaliza preços dentro do pool da Copa
 *   4. Upsert em cartola_players
 *
 * Uso:
 *   node sync_cartola_players.js
 *   node sync_cartola_players.js --dry-run     # mostra preços sem salvar
 *   node sync_cartola_players.js --season 2024 # outra temporada
 *
 * Requer .env: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_API_FOOTBALL_KEY
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import {
  calculateRawScore,
  normalizeScoresToPrices,
  parseApiStats,
  PRICE_CONFIG,
} from './src/lib/cartola_pricing.js'

// ── Config ─────────────────────────────────────────────────────────────────────
const SUPABASE_URL     = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const API_KEY          = process.env.VITE_API_FOOTBALL_KEY
const API_HOST         = 'free-api-live-football-data.p.rapidapi.com'

const DRY_RUN  = process.argv.includes('--dry-run')
const SEASON   = process.argv.includes('--season')
  ? process.argv[process.argv.indexOf('--season') + 1]
  : '2025'

if (!SUPABASE_URL || !SUPABASE_SERVICE || !API_KEY) {
  console.error('❌ Variáveis de ambiente faltando. Verifique VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e VITE_API_FOOTBALL_KEY no .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE)

// Mapeamento de posições da API para o padrão interno
const POSITION_MAP = {
  G: 'GK', GK: 'GK', Goalkeeper: 'GK', 'Goal Keeper': 'GK', Goleiro: 'GK',
  D: 'DEF', DEF: 'DEF', Defender: 'DEF', Defensor: 'DEF', Lateral: 'DEF',
  M: 'MID', MID: 'MID', Midfielder: 'MID', Meia: 'MID',
  F: 'FWD', FWD: 'FWD', Forward: 'FWD', Attacker: 'FWD', Atacante: 'FWD',
}

function normalizePosition(raw) {
  return POSITION_MAP[raw] ?? 'MID'
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// ── API helpers ─────────────────────────────────────────────────────────────────
async function apiGet(endpoint, params = {}) {
  const url = new URL(`https://${API_HOST}/${endpoint}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, String(v)))

  const res = await fetch(url.toString(), {
    headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': API_HOST },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 120)}`)
  }

  const data = await res.json()
  return data.response ?? data
}

/**
 * Busca stats da temporada para um jogador.
 * Tenta múltiplos endpoints comuns do FotMob API.
 * Retorna null se nenhum funcionar.
 */
async function fetchPlayerStats(playerId) {
  const endpoints = [
    { path: 'football-get-player-statistics-by-player-id-and-season', params: { player_id: playerId, season: SEASON } },
    { path: 'football-get-player-stats-by-player-id',                 params: { player_id: playerId, season: SEASON } },
    { path: 'football-get-player-profile-by-player-id',               params: { player_id: playerId } },
  ]

  for (const { path, params } of endpoints) {
    try {
      const data = await apiGet(path, params)
      if (data && (data.goals !== undefined || data.statistics || data.stats || data.seasonStats)) {
        return data
      }
    } catch {
      // tenta próximo endpoint
    }
    await sleep(150)
  }

  return null
}

/** Extrai jogadores da lineup de uma partida */
function extractLineupPlayers(lineupData, homeTeamId, homeTeamName, awayTeamId, awayTeamName) {
  const players = []
  const sides   = Array.isArray(lineupData) ? lineupData : [lineupData]

  for (const side of sides) {
    const teamId   = side.team?.id   ?? side.teamId   ?? null
    const teamName = side.team?.name ?? side.teamName ?? (teamId === homeTeamId ? homeTeamName : awayTeamName)
    const teamFlag = side.team?.flag ?? side.team?.logo ?? null

    const lineup = side.lineup ?? side.startXI ?? []
    const bench  = side.bench  ?? side.substitutes ?? []

    for (const entry of [...lineup, ...bench]) {
      const p = entry.player ?? entry
      if (!p?.name) continue

      players.push({
        api_player_id: p.id ?? null,
        name:          p.name,
        position:      normalizePosition(p.pos ?? p.position ?? ''),
        team_id:       teamId,
        team_name:     teamName,
        team_flag:     teamFlag,
        photo_url:     p.id ? `https://images.fotmob.com/image_resources/playerimages/${p.id}.png` : null,
      })
    }
  }

  return players
}

// ── Main ────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`🏆 Cartola Player Sync — temporada ${SEASON}${DRY_RUN ? ' (DRY RUN)' : ''}\n`)

  // 1. Busca partidas da Copa com api_match_id
  console.log('🔍 Buscando partidas no banco...')
  const { data: matches, error: matchErr } = await supabase
    .from('matches')
    .select('id, api_match_id, home_team, away_team, home_team_id, away_team_id')
    .not('api_match_id', 'is', null)
    .order('match_date', { ascending: true })

  if (matchErr) { console.error('Erro:', matchErr.message); process.exit(1) }
  console.log(`✅ ${matches.length} partidas encontradas\n`)

  // 2. Coleta jogadores únicos via lineups
  const playerMap = new Map()  // api_player_id (ou name+team) → player

  for (const match of matches) {
    process.stdout.write(`⚽ ${match.home_team} × ${match.away_team}... `)

    let lineupData = null
    try {
      lineupData = await apiGet('football-get-fixture-lineups-by-fixture-id', { fixture_id: match.api_match_id })
    } catch (err) {
      console.log(`❌ lineup indisponível (${err.message.slice(0, 60)})`)
      await sleep(300)
      continue
    }

    if (!lineupData) {
      console.log('sem dados')
      await sleep(300)
      continue
    }

    const players = extractLineupPlayers(
      lineupData,
      match.home_team_id, match.home_team,
      match.away_team_id, match.away_team
    )

    let added = 0
    for (const p of players) {
      const key = p.api_player_id ?? `${p.name}::${p.team_id}`
      if (!playerMap.has(key)) {
        playerMap.set(key, p)
        added++
      }
    }

    console.log(`${players.length} jogadores (${added} novos)`)
    await sleep(300)
  }

  if (playerMap.size === 0) {
    console.log('\n⚠ Nenhum jogador encontrado. As lineups já estão disponíveis na API?')
    console.log('  Dica: lineups normalmente ficam disponíveis 1-2h antes do jogo.')
    process.exit(0)
  }

  console.log(`\n📊 ${playerMap.size} jogadores únicos coletados`)

  // 3. Busca stats da temporada para calcular preços
  console.log('\n🔢 Buscando stats da temporada para cálculo de preços...')

  const playersWithStats = []
  let statsFound = 0
  let statsFailed = 0

  for (const [, player] of playerMap) {
    if (!player.api_player_id) {
      playersWithStats.push({ ...player, apiStats: null })
      statsFailed++
      continue
    }

    process.stdout.write(`  ${player.name} (${player.position})... `)

    const stats = await fetchPlayerStats(player.api_player_id)
    await sleep(200)

    if (stats) {
      statsFound++
      console.log(`✅ gols:${stats.goals?.total ?? stats.goals ?? '?'} assists:${stats.goals?.assists ?? stats.assists ?? '?'}`)
      playersWithStats.push({ ...player, apiStats: stats })
    } else {
      statsFailed++
      console.log('⚠ sem stats (usará preço base)')
      playersWithStats.push({ ...player, apiStats: null })
    }
  }

  console.log(`\n  ✅ Stats encontrados: ${statsFound} / ${playerMap.size} (${statsFailed} usarão preço base)`)

  // 4. Calcula scores e normaliza preços
  console.log('\n💰 Calculando preços...\n')

  const withScores = playersWithStats.map(player => ({
    ...player,
    rawScore: player.apiStats
      ? calculateRawScore(player.position, parseApiStats(player.apiStats))
      : 0,
  }))

  const priced = normalizeScoresToPrices(withScores)

  // 5. Log dos preços calculados por posição
  for (const pos of ['GK', 'DEF', 'MID', 'FWD']) {
    const group = priced.filter(p => p.position === pos).sort((a, b) => b.price - a.price)
    if (group.length === 0) continue

    const base = PRICE_CONFIG.BASE[pos]
    const max  = base + PRICE_CONFIG.MAX_BONUS[pos]
    console.log(`  ${pos} (C$${base}-${max}):`)

    for (const p of group.slice(0, 5)) {
      console.log(`    ${p.name.padEnd(24)} C$ ${p.price.toFixed(1).padStart(4)}  score: ${p.rawScore.toFixed(3)}`)
    }
    if (group.length > 5) console.log(`    ... e mais ${group.length - 5} jogadores`)
    console.log()
  }

  if (DRY_RUN) {
    console.log('🔬 DRY RUN — nenhum dado foi salvo.')
    return
  }

  // 6. Upsert no banco
  console.log('💾 Salvando no banco...')

  const rows = priced.map(p => ({
    api_player_id: p.api_player_id,
    name:          p.name,
    position:      p.position,
    team_id:       p.team_id,
    team_name:     p.team_name,
    team_flag:     p.team_flag ?? null,
    photo_url:     p.photo_url ?? null,
    price:         p.price,
    avg_points:    0,
    available:     true,
  }))

  const BATCH = 50
  let saved = 0

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await supabase
      .from('cartola_players')
      .upsert(batch, { onConflict: 'api_player_id', ignoreDuplicates: false })

    if (error) {
      console.error(`  ❌ Erro lote ${i}-${i + BATCH}: ${error.message}`)
    } else {
      saved += batch.length
    }
  }

  console.log(`\n✅ ${saved} jogadores salvos com sucesso!`)
  console.log('\nPróximo passo: rode "node sync_cartola_players.js --dry-run" para revisar os preços.')
}

main().catch(err => {
  console.error('❌ Erro fatal:', err)
  process.exit(1)
})
